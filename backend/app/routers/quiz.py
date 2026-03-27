from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.models.quiz import QuizGenerateRequest, QuizSubmitRequest, QuizResult
from app.services.gemini_service import generate_quiz
from app.services.quiz_service import grade_quiz, update_streak, check_achievements
from datetime import datetime
from pydantic import BaseModel
import re

router = APIRouter(prefix="/quiz", tags=["quiz"])

class GapFillRequest(BaseModel):
    material_id: str
    difficulty: str = "medium"
    num_questions: int = 10
    question_types: list = ["mcq", "truefalse", "fillblank"]

@router.post("/generate")
async def generate_quiz_endpoint(
    request: QuizGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])
    
    try:
        obj_id = ObjectId(request.material_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    material = await db.materials.find_one({"_id": obj_id})
    if not material or material["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Material not found")

    result = await generate_quiz(
        text=material["extracted_text"],
        difficulty=request.difficulty,
        num_questions=request.num_questions,
        question_types=request.question_types,
        selected_topics=request.selected_topics,
    )

    now = datetime.utcnow()
    questions = result.get("questions", [])
    quiz_doc = {
        "user_id": user_id,
        "material_id": request.material_id,
        "difficulty": request.difficulty,
        "selected_topics": request.selected_topics or [],
        "questions": questions,
        "user_answers": None,
        "score": None,
        "completed_at": None,
        "created_at": now,
        "is_gap_fill": False
    }

    inserted = await db.quizzes.insert_one(quiz_doc)
    quiz_id = str(inserted.inserted_id)

    # Return a copy without correct answers exposed to the client
    safe_questions = [
        {k: v for k, v in q.items() if k not in ("correct_answer", "explanation")}
        for q in questions
    ]

    return {
        "id": quiz_id,
        "user_id": user_id,
        "material_id": request.material_id,
        "difficulty": request.difficulty,
        "questions": safe_questions,
        "created_at": now,
        "is_gap_fill": False,
    }

@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    request: QuizSubmitRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])
    
    try:
        obj_id = ObjectId(quiz_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = await db.quizzes.find_one({"_id": obj_id})
    if not quiz or quiz["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if quiz.get("completed_at"):
        raise HTTPException(status_code=400, detail="Quiz already completed")

    grade_result = grade_quiz(quiz["questions"], request.answers)
    
    now = datetime.utcnow()
    await db.quizzes.update_one(
        {"_id": obj_id},
        {"$set": {
            "user_answers": request.answers,
            "score": grade_result["score"],
            "completed_at": now,
            "grade_result": {
                "score": grade_result["score"],
                "total": grade_result["total"],
                "percentage": grade_result["percentage"],
                "correct_answers": grade_result["correct_answers"],
                "explanations": grade_result["explanations"],
                "weak_topics": grade_result["weak_topics"],
            }
        }}
    )
    
    streak_update = update_streak(current_user)
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": streak_update}
    )
    current_user.update(streak_update)
    
    total_quizzes = await db.quizzes.count_documents({"user_id": user_id, "completed_at": {"$ne": None}})
    
    new_achievements = check_achievements(current_user, total_quizzes, grade_result["score"], grade_result["total"])
    if new_achievements:
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$addToSet": {"achievements": {"$each": new_achievements}}}
        )
        
    percentage = round((grade_result["score"] / grade_result["total"]) * 100) if grade_result["total"] > 0 else 0
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Update topic accuracy: track per-topic score sum and attempt count, compute accuracy %
    for i, question in enumerate(quiz["questions"]):
        topic = question.get("topic", "General")
        user_ans = str(request.answers[i]) if i < len(request.answers) else ""
        correct_ans = str(question.get("correct_answer", ""))
        if question.get("type") == "mcq":
            letter_match = re.match(r'^([A-Da-d])[\.\)]\s*', user_ans.strip())
            normalized_user = letter_match.group(1).upper() if letter_match else user_ans.strip().upper()
            is_correct = normalized_user == correct_ans.strip().upper()
        else:
            is_correct = re.sub(r'\s+', '', user_ans).lower() == re.sub(r'\s+', '', correct_ans).lower()
        await db.progress.update_one(
            {"user_id": user_id},
            {
                "$inc": {
                    f"topic_scores.{topic}.correct": 1 if is_correct else 0,
                    f"topic_scores.{topic}.total": 1,
                }
            },
            upsert=True
        )

    # Update summary stats and best score
    await db.progress.update_one(
        {"user_id": user_id},
        {
            "$inc": {"total_quizzes": 1, "total_score": percentage},
            "$max": {"best_score": percentage},
            "$set": {"updated_at": datetime.utcnow()}
        },
        upsert=True
    )

    # Update daily activity
    existing_act = await db.progress.find_one({"user_id": user_id, "daily_activity.date": today})
    if existing_act:
        await db.progress.update_one(
            {"user_id": user_id, "daily_activity.date": today},
            {"$inc": {"daily_activity.$.quizzes_taken": 1}}
        )
    else:
        await db.progress.update_one(
            {"user_id": user_id},
            {"$push": {"daily_activity": {"date": today, "quizzes_taken": 1}}},
            upsert=True
        )

    return {**grade_result, "new_achievements": new_achievements, "streak": streak_update.get("streak", 0)}

@router.get("/{quiz_id}/result")
async def get_quiz_result(
    quiz_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])
    try:
        obj_id = ObjectId(quiz_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = await db.quizzes.find_one({"_id": obj_id})
    if not quiz or quiz["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not quiz.get("completed_at"):
        raise HTTPException(status_code=400, detail="Quiz not yet completed")

    grade = quiz.get("grade_result", {})

    # Return safe questions (with correct_answer for result review)
    questions = [
        {k: v for k, v in q.items() if k != "explanation"}
        for q in quiz.get("questions", [])
    ]

    return {
        **grade,
        "questions": questions,
        "user_answers": quiz.get("user_answers", []),
        "new_achievements": [],  # achievements already awarded at submit time
        "streak": 0,
    }


@router.get("/{quiz_id}")
async def get_quiz(
    quiz_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])
    try:
        obj_id = ObjectId(quiz_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = await db.quizzes.find_one({"_id": obj_id})
    if not quiz or quiz["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.get("completed_at"):
        raise HTTPException(status_code=400, detail="Quiz already completed")

    # Strip correct answers before returning to client
    safe_questions = [
        {k: v for k, v in q.items() if k not in ("correct_answer", "explanation")}
        for q in quiz.get("questions", [])
    ]

    return {
        "id": str(quiz["_id"]),
        "user_id": quiz["user_id"],
        "material_id": quiz["material_id"],
        "difficulty": quiz["difficulty"],
        "questions": safe_questions,
        "created_at": quiz["created_at"],
        "is_gap_fill": quiz.get("is_gap_fill", False),
    }

@router.get("/history")
async def quiz_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
    page: int = 1,
    limit: int = 20,
):
    user_id = str(current_user["_id"])
    skip = (page - 1) * limit
    limit = min(limit, 50)  # cap at 50

    cursor = db.quizzes.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit)
    total = await db.quizzes.count_documents({"user_id": user_id})

    # Build a material_id -> filename map for all quizzes in this page
    quizzes = []
    material_ids = set()
    raw = []
    async for quiz in cursor:
        quiz["id"] = str(quiz["_id"])
        del quiz["_id"]
        if "questions" in quiz:
            del quiz["questions"]
        raw.append(quiz)
        if quiz.get("material_id"):
            material_ids.add(quiz["material_id"])

    # Fetch material filenames in one query
    filename_map = {}
    if material_ids:
        from bson import ObjectId as ObjId
        valid_ids = []
        for mid in material_ids:
            try:
                valid_ids.append(ObjId(mid))
            except Exception:
                pass
        async for mat in db.materials.find({"_id": {"$in": valid_ids}}, {"filename": 1}):
            filename_map[str(mat["_id"])] = mat["filename"]

    for quiz in raw:
        quiz["material_filename"] = filename_map.get(quiz.get("material_id"), "Unknown")
        quizzes.append(quiz)

    return {
        "quizzes": quizzes,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }

@router.post("/gap-fill")
async def generate_gap_fill_quiz(
    request: GapFillRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])
    
    try:
        obj_id = ObjectId(request.material_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    material = await db.materials.find_one({"_id": obj_id})
    if not material or material["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Material not found")
        
    progress = await db.progress.find_one({"user_id": user_id})
    weak_topics = []
    if progress:
        # Use topic_scores (accuracy-based): lowest accuracy = weakest topics
        topic_scores = progress.get("topic_scores", {})
        if topic_scores:
            topic_accuracy = {
                t: round((v.get("correct", 0) / v.get("total", 1)) * 100, 1)
                for t, v in topic_scores.items() if v.get("total", 0) > 0
            }
            sorted_topics = sorted(topic_accuracy.items(), key=lambda x: x[1])
            weak_topics = [t for t, _ in sorted_topics[:3]]
        
    result = await generate_quiz(
        text=material["extracted_text"],
        difficulty=request.difficulty,
        num_questions=request.num_questions,
        question_types=request.question_types,
        weak_topics=weak_topics
    )
    
    now = datetime.utcnow()
    questions = result.get("questions", [])
    quiz_doc = {
        "user_id": user_id,
        "material_id": request.material_id,
        "difficulty": request.difficulty,
        "questions": questions,
        "user_answers": None,
        "score": None,
        "completed_at": None,
        "created_at": now,
        "is_gap_fill": True
    }

    inserted = await db.quizzes.insert_one(quiz_doc)
    quiz_id = str(inserted.inserted_id)

    safe_questions = [
        {k: v for k, v in q.items() if k not in ("correct_answer", "explanation")}
        for q in questions
    ]

    return {
        "id": quiz_id,
        "user_id": user_id,
        "material_id": request.material_id,
        "difficulty": request.difficulty,
        "questions": safe_questions,
        "created_at": now,
        "is_gap_fill": True,
    }
