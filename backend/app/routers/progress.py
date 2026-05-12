from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.models.progress import ProgressSummary
from app.services.quiz_service import get_current_streak

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/notifications")
async def get_notifications(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])
    progress = await db.progress.find_one({"user_id": user_id})
    notifications = []

    streak = get_current_streak(current_user)
    longest_streak = current_user.get("longest_streak", 0)
    achievements = current_user.get("achievements", [])
    today = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

    if progress:
        total_quizzes = progress.get("total_quizzes", 0)
        total_score = progress.get("total_score", 0)
        avg_score = round(total_score / total_quizzes, 1) if total_quizzes > 0 else 0
        daily_activity = progress.get("daily_activity", [])
        activity_dates = {a["date"] for a in daily_activity}
        took_quiz_today = today in activity_dates
        took_quiz_yesterday = yesterday in activity_dates

        # Streak reminders
        if streak >= 7:
            notifications.append({
                "type": "achievement",
                "icon": "🔥",
                "title": f"{streak} days in a row",
                "message": f"Solid. Don't stop now.",
                "priority": 1,
            })
        elif streak > 0 and not took_quiz_today:
            notifications.append({
                "type": "reminder",
                "icon": "⚡",
                "title": "Quiz today?",
                "message": f"{streak}-day streak on the line. Takes 5 minutes.",
                "priority": 1,
            })
        elif streak == 0 and took_quiz_yesterday and not took_quiz_today:
            notifications.append({
                "type": "reminder",
                "icon": "📅",
                "title": "You were here yesterday",
                "message": "Come back today and start a streak.",
                "priority": 2,
            })

        # Performance notifications
        if total_quizzes >= 1 and avg_score >= 90:
            notifications.append({
                "type": "achievement",
                "icon": "⭐",
                "title": f"{avg_score}% average",
                "message": "That's genuinely good. Keep the standard up.",
                "priority": 2,
            })
        elif total_quizzes >= 3 and avg_score < 50:
            notifications.append({
                "type": "tip",
                "icon": "💡",
                "title": f"Averaging {avg_score}%",
                "message": "Try Gap Fill — it targets the stuff you keep getting wrong.",
                "priority": 2,
            })

        # Weak topic reminders
        topic_scores = progress.get("topic_scores", {})
        weak_topics = [
            t for t, v in topic_scores.items()
            if v.get("total", 0) >= 2 and (v.get("correct", 0) / v["total"]) * 100 < 50
        ]
        for topic in weak_topics[:2]:
            acc = round((topic_scores[topic]["correct"] / topic_scores[topic]["total"]) * 100)
            notifications.append({
                "type": "tip",
                "icon": "📚",
                "title": topic,
                "message": f"{acc}% accuracy. Worth another look.",
                "priority": 3,
            })

        # Milestone notifications
        milestones = [1, 5, 10, 25, 50, 100]
        for m in milestones:
            if total_quizzes == m:
                notifications.append({
                    "type": "achievement",
                    "icon": "🎉",
                    "title": f"{m} quizzes done",
                    "message": "Nice milestone." if m < 10 else "That's a lot of quizzes.",
                    "priority": 1,
                })

        # No activity in 3+ days
        recent_dates = sorted(activity_dates, reverse=True)
        if recent_dates:
            last_active = recent_dates[0]
            days_inactive = (datetime.utcnow().date() - datetime.strptime(last_active, "%Y-%m-%d").date()).days
            if days_inactive >= 3:
                notifications.append({
                    "type": "reminder",
                    "icon": "👋",
                    "title": f"{days_inactive} days away",
                    "message": "No pressure, but your materials are waiting.",
                    "priority": 2,
                })

        # Perfect score celebration
        if "Perfect Score" in achievements:
            notifications.append({
                "type": "achievement",
                "icon": "🏆",
                "title": "Perfect score",
                "message": "100%. That one counts.",
                "priority": 3,
            })

        # Encourage first quiz
        if total_quizzes == 0:
            notifications.append({
                "type": "tip",
                "icon": "🚀",
                "title": "Nothing here yet",
                "message": "Upload a PDF and take your first quiz to get started.",
                "priority": 1,
            })

    else:
        # Brand new user
        notifications.append({
            "type": "tip",
            "icon": "👋",
            "title": f"Hey {current_user.get('name', '').split()[0] or 'there'}",
            "message": "Upload a PDF in Resources and generate your first quiz.",
            "priority": 1,
        })

    # Sort by priority
    notifications.sort(key=lambda x: x["priority"])
    return notifications

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
            streak=get_current_streak(current_user),
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
        streak=get_current_streak(current_user),
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
