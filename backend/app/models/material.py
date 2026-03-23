from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MaterialInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    filename: str
    file_path: str
    extracted_text: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    file_size: int  # in bytes

    class Config:
        populate_by_name = True


class MaterialResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    file_path: str
    uploaded_at: datetime
    file_size: int

    class Config:
        populate_by_name = True
