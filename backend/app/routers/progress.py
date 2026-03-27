from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.models.progress import ProgressSummary

router = APIRouter(prefix="/progress", tags=["progress"])

@router.get("/summary", response_model=ProgressSummary)
async def get_summary(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])
    progress = await db.progress.find_one({"user_id": user_id})

    if not progress:
        return ProgressSummary(
            total_quizzes=0,
            avg_score=0.0,
            best_score=0.0,
            streak=current_user.get("streak", 0),
            longest_streak=current_user.get("longest_streak", 0),
            topic_performance={},
            weekly_activity=[],
            achievements=current_user.get("achievements", [])
        )

    total_quizzes = progress.get("total_quizzes", 0)
    total_score = progress.get("total_score", 0)
    avg_score = round(total_score / total_quizzes, 1) if total_quizzes > 0 else 0.0
    best_score = float(progress.get("best_score", 0))

    today = datetime.utcnow().date()
    week_dates = {(today - timedelta(days=i)).isoformat(): 0 for i in range(6, -1, -1)}
    for activity in progress.get("daily_activity", []):
        if activity["date"] in week_dates:
            week_dates[activity["date"]] = activity["quizzes_taken"]
    weekly_activity = [{"date": d, "quizzes_taken": c} for d, c in week_dates.items()]

    # Compute accuracy % per topic from topic_scores
    topic_perf = {}
    for topic, counts in progress.get("topic_scores", {}).items():
        correct = counts.get("correct", 0)
        total = counts.get("total", 0)
        if total > 0:
            topic_perf[topic] = round((correct / total) * 100, 1)

    # Fallback: support old topic_performance field if topic_scores not yet populated
    if not topic_perf and "topic_performance" in progress:
        for t, count in progress["topic_performance"].items():
            topic_perf[t] = float(count)

    return ProgressSummary(
        total_quizzes=total_quizzes,
        avg_score=avg_score,
        best_score=best_score,
        streak=current_user.get("streak", 0),
        longest_streak=current_user.get("longest_streak", 0),
        topic_performance=topic_perf,
        weekly_activity=weekly_activity,
        achievements=current_user.get("achievements", [])
    )

@router.get("/heatmap")
async def get_heatmap(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])
    progress = await db.progress.find_one({"user_id": user_id})

    if not progress:
        return []

    daily_activity = progress.get("daily_activity", [])
    cutoff = (datetime.utcnow() - timedelta(days=365)).date().isoformat()
    heatmap = [act for act in daily_activity if act["date"] >= cutoff]
    return sorted(heatmap, key=lambda x: x["date"])


@router.get("/material/{material_id}")
async def get_material_stats(
    material_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])

    # All completed quizzes for this material
    cursor = db.quizzes.find({
        "user_id": user_id,
        "material_id": material_id,
        "completed_at": {"$ne": None}
    }).sort("created_at", -1)

    quizzes = []
    async for q in cursor:
        quizzes.append(q)

    if not quizzes:
        return {
            "material_id": material_id,
            "total_quizzes": 0,
            "avg_score": 0.0,
            "best_score": 0.0,
            "topic_scores": {},
        }

    total = len(quizzes)
    scores = [round((q["score"] / len(q["questions"])) * 100) for q in quizzes if q.get("score") is not None and q.get("questions")]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    best_score = max(scores) if scores else 0.0

    # Per-topic accuracy across all quizzes for this material
    topic_scores = {}
    for quiz in quizzes:
        answers = quiz.get("user_answers") or []
        for i, question in enumerate(quiz.get("questions", [])):
            topic = question.get("topic", "General")
            user_ans = str(answers[i]) if i < len(answers) else ""
            correct_ans = str(question.get("correct_answer", ""))
            if question.get("type") == "mcq":
                import re as _re
                m = _re.match(r'^([A-Da-d])[\.\)]\s*', user_ans.strip())
                is_correct = (m.group(1).upper() if m else user_ans.strip().upper()) == correct_ans.strip().upper()
            else:
                import re as _re
                is_correct = _re.sub(r'\s+', '', user_ans).lower() == _re.sub(r'\s+', '', correct_ans).lower()

            if topic not in topic_scores:
                topic_scores[topic] = {"correct": 0, "total": 0}
            topic_scores[topic]["total"] += 1
            if is_correct:
                topic_scores[topic]["correct"] += 1

    topic_accuracy = {
        t: round((v["correct"] / v["total"]) * 100, 1)
        for t, v in topic_scores.items() if v["total"] > 0
    }

    return {
        "material_id": material_id,
        "total_quizzes": total,
        "avg_score": avg_score,
        "best_score": best_score,
        "topic_scores": topic_accuracy,
    }
