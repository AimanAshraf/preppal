from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime


class DailyActivity(BaseModel):
    date: str  # ISO date string
    quizzes_taken: int


class ProgressInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    total_quizzes: int = 0
    total_score: int = 0
    topic_scores: Dict[str, List[int]] = {}  # topic -> list of scores
    daily_activity: List[DailyActivity] = []
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class ProgressSummary(BaseModel):
    total_quizzes: int
    avg_score: float
    streak: int
    longest_streak: int
    topic_performance: Dict[str, float]
    weekly_activity: List[DailyActivity]
    achievements: List[str]
