from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.database import get_database
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/summary")
async def get_summary(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]
    progress = await db.progress.find_one({"user_id": user_id})

    if not progress:
        return {
            "total_quizzes": 0,
            "avg_score": 0.0,
            "streak": current_user.get("streak", 0),
            "longest_streak": current_user.get("longest_streak", 0),
            "topic_performance": {},
            "weekly_activity": [],
            "achievements": current_user.get("achievements", []),
        }

    total_quizzes = progress.get("total_quizzes", 0)
    total_score = progress.get("total_score", 0)
    avg_score = round(total_score / total_quizzes, 1) if total_quizzes > 0 else 0.0

    # Topic performance: average score per topic
    topic_performance = {}
    for topic, scores in progress.get("topic_scores", {}).items():
        if scores:
            topic_performance[topic] = round(sum(scores) / len(scores), 1)

    # Weekly activity (last 7 days)
    today = datetime.utcnow().date()
    week_dates = {(today - timedelta(days=i)).isoformat(): 0 for i in range(6, -1, -1)}
    for activity in progress.get("daily_activity", []):
        if activity["date"] in week_dates:
            week_dates[activity["date"]] = activity["quizzes_taken"]

    weekly_activity = [{"date": d, "quizzes_taken": c} for d, c in week_dates.items()]

    return {
        "total_quizzes": total_quizzes,
        "avg_score": avg_score,
        "streak": current_user.get("streak", 0),
        "longest_streak": current_user.get("longest_streak", 0),
        "topic_performance": topic_performance,
        "weekly_activity": weekly_activity,
        "achievements": current_user.get("achievements", []),
    }


@router.get("/heatmap")
async def get_heatmap(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Return daily quiz activity for the past 12 months."""
    user_id = current_user["_id"]
    progress = await db.progress.find_one({"user_id": user_id})

    if not progress:
        return []

    # Filter to last 12 months
    cutoff = (datetime.utcnow() - timedelta(days=365)).date().isoformat()
    heatmap = [
        activity
        for activity in progress.get("daily_activity", [])
        if activity["date"] >= cutoff
    ]

    return sorted(heatmap, key=lambda x: x["date"])
