from pydantic import BaseModel
from typing import List, Dict

class ProgressSummary(BaseModel):
    total_quizzes: int
    avg_score: float
    best_score: float
    streak: int
    longest_streak: int
    topic_performance: Dict[str, float]  # topic -> accuracy %
    weekly_activity: List[dict]
    achievements: List[str]
