from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.models.quiz import QuizCreate, QuizSubmit, GapFillRequest
from app.services.gemini_service import generate_quiz
from app.services.quiz_service import grade_quiz, update_streak, check_achievements

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_quiz_endpoint(
    quiz_data: QuizCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]

    # Get material
    try:
        material = await db.materials.find_one(
            {"_id": ObjectId(quiz_data.material_id), "user_id": user_id}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    # Generate questions via Gemini
    result = await generate_quiz(
        text=material["extracted_text"],
        difficulty=quiz_data.difficulty,
        num_questions=quiz_data.num_questions,
        question_types=quiz_data.question_types,
    )

    quiz_doc = {
        "user_id": user_id,
        "material_id": quiz_data.material_id,
        "difficulty": quiz_data.difficulty,
        "questions": result["questions"],
        "user_answers": None,
        "score": None,
        "completed_at": None,
        "created_at": datetime.utcnow(),
        "is_gap_fill": False,
    }

    inserted = await db.quizzes.insert_one(quiz_doc)
    quiz_doc["id"] = str(inserted.inserted_id)
    quiz_doc.pop("_id", None)
    return quiz_doc


@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    submit_data: QuizSubmit,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]

    try:
        quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id), "user_id": user_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.get("completed_at"):
        raise HTTPException(status_code=400, detail="Quiz already submitted")

    # Grade
    grading = grade_quiz(quiz["questions"], submit_data.answers)

    # Update quiz
    now = datetime.utcnow()
    await db.quizzes.update_one(
        {"_id": ObjectId(quiz_id)},
        {
            "$set": {
                "user_answers": submit_data.answers,
                "score": grading["score"],
                "completed_at": now,
            }
        },
    )

    # Update streak
    streak_update = update_streak(current_user)
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": streak_update})
    current_user.update(streak_update)

    # Count total quizzes
    total_quizzes = await db.quizzes.count_documents(
        {"user_id": user_id, "completed_at": {"$ne": None}}
    )

    # Check achievements
    new_achievements = check_achievements(
        current_user, total_quizzes, grading["score"], grading["total"]
    )
    if new_achievements:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$addToSet": {"achievements": {"$each": new_achievements}}},
        )

    # Update progress
    await _update_progress(
        db, user_id, quiz["questions"], submit_data.answers, grading["score"], grading["total"]
    )

    return {
        "quiz_id": quiz_id,
        "score": grading["score"],
        "total": grading["total"],
        "percentage": grading["percentage"],
        "correct_answers": grading["correct_answers"],
        "explanations": grading["explanations"],
        "weak_topics": grading["weak_topics"],
        "new_achievements": new_achievements,
    }


async def _update_progress(db, user_id: str, questions: list, answers: list, score: int, total: int):
    """Update user progress stats after quiz submission."""
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Build topic scores from this quiz
    for i, q in enumerate(questions):
        topic = q.get("topic", "General")
        correct_answer = q["correct_answer"]
        user_answer = answers[i] if i < len(answers) else ""

        if q["type"] == "fillblank":
            is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
        else:
            is_correct = user_answer.strip() == correct_answer.strip()

        point = 100 if is_correct else 0
        await db.progress.update_one(
            {"user_id": user_id},
            {
                "$inc": {"total_quizzes": 0},
                "$push": {f"topic_scores.{topic}": point},
            },
            upsert=True,
        )

    # Update totals and daily activity
    percentage = round((score / total) * 100) if total > 0 else 0
    await db.progress.update_one(
        {"user_id": user_id},
        {
            "$inc": {"total_quizzes": 1, "total_score": percentage},
            "$set": {"updated_at": datetime.utcnow()},
        },
        upsert=True,
    )

    # Daily activity
    existing = await db.progress.find_one(
        {"user_id": user_id, "daily_activity.date": today}
    )
    if existing:
        await db.progress.update_one(
            {"user_id": user_id, "daily_activity.date": today},
            {"$inc": {"daily_activity.$.quizzes_taken": 1}},
        )
    else:
        await db.progress.update_one(
            {"user_id": user_id},
            {"$push": {"daily_activity": {"date": today, "quizzes_taken": 1}}},
            upsert=True,
        )


@router.get("/history")
async def quiz_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]
    cursor = db.quizzes.find(
        {"user_id": user_id},
        {"questions": 0},  # Exclude full question data for list view
    ).sort("created_at", -1).limit(50)

    quizzes = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        quizzes.append(doc)
    return quizzes


@router.post("/gap-fill", status_code=status.HTTP_201_CREATED)
async def gap_fill_quiz(
    req: GapFillRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]

    # Get progress to find weak topics
    progress = await db.progress.find_one({"user_id": user_id})
    weak_topics = []
    if progress and progress.get("topic_scores"):
        for topic, scores in progress["topic_scores"].items():
            avg = sum(scores) / len(scores) if scores else 0
            if avg < 70:
                weak_topics.append(topic)

    # Get material
    try:
        material = await db.materials.find_one(
            {"_id": ObjectId(req.material_id), "user_id": user_id}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    result = await generate_quiz(
        text=material["extracted_text"],
        difficulty=req.difficulty,
        num_questions=req.num_questions,
        question_types=["mcq", "truefalse", "fillblank"],
        weak_topics=weak_topics or None,
    )

    quiz_doc = {
        "user_id": user_id,
        "material_id": req.material_id,
        "difficulty": req.difficulty,
        "questions": result["questions"],
        "user_answers": None,
        "score": None,
        "completed_at": None,
        "created_at": datetime.utcnow(),
        "is_gap_fill": True,
    }

    inserted = await db.quizzes.insert_one(quiz_doc)
    quiz_doc["id"] = str(inserted.inserted_id)
    quiz_doc.pop("_id", None)
    return quiz_doc
