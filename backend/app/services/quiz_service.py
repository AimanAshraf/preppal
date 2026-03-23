from datetime import datetime, date, timedelta
from typing import List, Dict
from collections import Counter


def grade_quiz(questions: List[dict], user_answers: List[str]) -> dict:
    """Grade quiz answers and return results."""
    correct_count = 0
    correct_answers = []
    explanations = []
    wrong_topics = []

    for i, question in enumerate(questions):
        correct_answer = question["correct_answer"]
        correct_answers.append(correct_answer)
        explanations.append(question.get("explanation", ""))

        user_answer = user_answers[i] if i < len(user_answers) else ""

        # Case-insensitive comparison for fill-in-the-blank
        if question["type"] == "fillblank":
            is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
        else:
            is_correct = user_answer.strip() == correct_answer.strip()

        if is_correct:
            correct_count += 1
        else:
            wrong_topics.append(question.get("topic", "General"))

    # Find most common weak topics
    topic_counts = Counter(wrong_topics)
    weak_topics = [topic for topic, _ in topic_counts.most_common(5)]

    total = len(questions)
    percentage = round((correct_count / total) * 100, 1) if total > 0 else 0

    return {
        "score": correct_count,
        "total": total,
        "percentage": percentage,
        "correct_answers": correct_answers,
        "explanations": explanations,
        "weak_topics": weak_topics,
    }


def update_streak(user: dict) -> dict:
    """Update user streak based on last_active date."""
    today = date.today()
    last_active = user.get("last_active")

    streak = user.get("streak", 0)
    longest_streak = user.get("longest_streak", 0)

    if last_active:
        last_date = last_active.date() if isinstance(last_active, datetime) else last_active
        if last_date == today:
            pass  # Already active today, no change
        elif last_date == today - timedelta(days=1):
            streak += 1  # Consecutive day
        else:
            streak = 1  # Streak broken
    else:
        streak = 1  # First activity

    longest_streak = max(longest_streak, streak)

    return {
        "streak": streak,
        "longest_streak": longest_streak,
        "last_active": datetime.utcnow(),
    }


def check_achievements(
    user: dict,
    total_quizzes: int,
    score: int,
    total: int,
) -> List[str]:
    """Check and return any newly unlocked achievements."""
    current = set(user.get("achievements", []))
    new_achievements = []

    if "First Quiz" not in current and total_quizzes >= 1:
        new_achievements.append("First Quiz")

    if "Perfect Score" not in current and total > 0 and score == total:
        new_achievements.append("Perfect Score")

    streak = user.get("streak", 0)
    if "7-Day Streak" not in current and streak >= 7:
        new_achievements.append("7-Day Streak")

    if "30-Day Streak" not in current and streak >= 30:
        new_achievements.append("30-Day Streak")

    if "Quiz Master" not in current and total_quizzes >= 50:
        new_achievements.append("Quiz Master")

    return new_achievements
