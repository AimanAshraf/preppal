from pydantic import BaseModel, EmailStr
from typing import List, Optional
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
    bio: Optional[str] = ""
    interests: Optional[List[str]] = []
    avatar_url: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    name: str
    bio: Optional[str] = ""
    interests: Optional[List[str]] = []

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
