from datetime import datetime, timezone, timedelta
from typing import List, Dict
from collections import Counter
import re


def grade_quiz(questions: List[dict], user_answers: List[str]) -> dict:
    correct_count = 0
    correct_answers = []
    explanations = []
    wrong_topics = []

    for i, question in enumerate(questions):
        correct_answer = str(question.get("correct_answer", ""))
        correct_answers.append(correct_answer)
        explanations.append(question.get("explanation", ""))

        user_answer = str(user_answers[i]) if i < len(user_answers) else ""

        if question.get("type") == "mcq":
            letter_match = re.match(r'^([A-Da-d])[\.\)]\s*', user_answer.strip())
            normalized_user = letter_match.group(1).upper() if letter_match else user_answer.strip().upper()
            is_correct = normalized_user == correct_answer.strip().upper()
        else:
            is_correct = re.sub(r'\s+', '', user_answer).lower() == re.sub(r'\s+', '', correct_answer).lower()

        if is_correct:
            correct_count += 1
        else:
            wrong_topics.append(question.get("topic", "General"))

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


def _utc_today():
    """Return today's date in UTC."""
    return datetime.now(timezone.utc).date()


def get_current_streak(user: dict) -> int:
    """
    Returns the live streak value for display purposes.
    If the user hasn't been active today or yesterday, streak is 0.
    """
    last_active = user.get("last_active")
    if not last_active:
        return 0

    today = _utc_today()
    if isinstance(last_active, datetime):
        last_date = last_active.replace(tzinfo=timezone.utc).date() if last_active.tzinfo is None else last_active.astimezone(timezone.utc).date()
    else:
        last_date = last_active

    # Streak is still alive if active today or yesterday
    if last_date >= today - timedelta(days=1):
        return user.get("streak", 0)
    # Missed a day — streak is dead
    return 0


def update_streak(user: dict) -> dict:
    """
    Update streak based on UTC dates.
    - Same UTC day  → no change (already counted today)
    - Previous UTC day → consecutive, increment
    - Older → streak broken, reset to 1
    - No prior activity → start at 1
    """
    today = _utc_today()
    last_active = user.get("last_active")

    streak = user.get("streak", 0)
    longest_streak = user.get("longest_streak", 0)

    if last_active:
        # Normalize to UTC date regardless of how it was stored
        if isinstance(last_active, datetime):
            last_date = last_active.replace(tzinfo=timezone.utc).date() if last_active.tzinfo is None else last_active.astimezone(timezone.utc).date()
        else:
            last_date = last_active  # already a date

        if last_date == today:
            # Already took a quiz today — no streak change
            pass
        elif last_date == today - timedelta(days=1):
            # Consecutive day
            streak += 1
        else:
            # Gap of 2+ days — streak broken
            streak = 1
    else:
        streak = 1

    longest_streak = max(longest_streak, streak)

    return {
        "streak": streak,
        "longest_streak": longest_streak,
        "last_active": datetime.now(timezone.utc),
    }


def check_achievements(
    user: dict,
    total_quizzes: int,
    score: int,
    total: int,
) -> List[str]:
    current = set(user.get("achievements", []))
    new_achievements = []
    streak = user.get("streak", 0)
    percentage = round((score / total) * 100) if total > 0 else 0

    # ── Quiz count milestones ──
    if "First Quiz" not in current and total_quizzes >= 1:
        new_achievements.append("First Quiz")
    if "Quiz Enthusiast" not in current and total_quizzes >= 10:
        new_achievements.append("Quiz Enthusiast")
    if "Quiz Veteran" not in current and total_quizzes >= 25:
        new_achievements.append("Quiz Veteran")
    if "Quiz Master" not in current and total_quizzes >= 50:
        new_achievements.append("Quiz Master")
    if "Quiz Legend" not in current and total_quizzes >= 100:
        new_achievements.append("Quiz Legend")

    # ── Score achievements ──
    if "Perfect Score" not in current and total > 0 and score == total:
        new_achievements.append("Perfect Score")
    if "High Achiever" not in current and percentage >= 90:
        new_achievements.append("High Achiever")
    if "Solid Performance" not in current and percentage >= 75:
        new_achievements.append("Solid Performance")

    # ── Streak achievements ──
    if "3-Day Streak" not in current and streak >= 3:
        new_achievements.append("3-Day Streak")
    if "7-Day Streak" not in current and streak >= 7:
        new_achievements.append("7-Day Streak")
    if "14-Day Streak" not in current and streak >= 14:
        new_achievements.append("14-Day Streak")
    if "30-Day Streak" not in current and streak >= 30:
        new_achievements.append("30-Day Streak")

    # ── Special ──
    if "Night Owl" not in current:
        hour = datetime.now(timezone.utc).hour
        if hour >= 22 or hour < 4:
            new_achievements.append("Night Owl")

    if "Speed Runner" not in current and total >= 10 and score == total:
        # Perfect score on a 10+ question quiz
        new_achievements.append("Speed Runner")

    return new_achievements
