from pydantic import BaseModel
from typing import List, Optional

class Question(BaseModel):
    id: str
    type: str           # "mcq" | "truefalse" | "fillblank"
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str
    topic: str

class QuizGenerateRequest(BaseModel):
    material_id: str
    difficulty: str     # "easy" | "medium" | "hard"
    num_questions: int = 10
    question_types: List[str] = ["mcq", "truefalse", "fillblank"]
    selected_topics: Optional[List[str]] = None  # None = all topics

class QuizSubmitRequest(BaseModel):
    answers: List[str]

class QuizResult(BaseModel):
    score: int
    total: int
    percentage: float
    correct_answers: List[str]
    explanations: List[str]
    weak_topics: List[str]
