from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserInDB(UserBase):
    id: Optional[str] = Field(default=None, alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    streak: int = 0
    longest_streak: int = 0
    last_active: Optional[datetime] = None
    achievements: List[str] = []

    class Config:
        populate_by_name = True


class UserResponse(UserBase):
    id: str
    created_at: datetime
    streak: int
    longest_streak: int
    achievements: List[str]

    class Config:
        populate_by_name = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse