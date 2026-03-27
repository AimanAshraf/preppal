from pydantic import BaseModel
from typing import List
from datetime import datetime

class MaterialResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    uploaded_at: datetime
    topics: List[str] = []
