from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Question(BaseModel):
    id: str
    type: str  # "mcq" | "truefalse" | "fillblank"
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str
    topic: str


class QuizCreate(BaseModel):
    material_id: str
    difficulty: str  # "easy" | "medium" | "hard"
    num_questions: int = 10
    question_types: List[str] = ["mcq", "truefalse", "fillblank"]


class QuizInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    material_id: str
    difficulty: str
    questions: List[Question]
    user_answers: Optional[List[str]] = None
    score: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_gap_fill: bool = False

    class Config:
        populate_by_name = True


class QuizSubmit(BaseModel):
    answers: List[str]


class QuizResult(BaseModel):
    quiz_id: str
    score: int
    total: int
    percentage: float
    correct_answers: List[str]
    explanations: List[str]
    weak_topics: List[str]


class GapFillRequest(BaseModel):
    material_id: str
    difficulty: str = "medium"
    num_questions: int = 10
