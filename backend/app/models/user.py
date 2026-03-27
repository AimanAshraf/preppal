from pydantic import BaseModel, EmailStr
from typing import List
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    streak: int
    longest_streak: int
    achievements: List[str]
    created_at: datetime