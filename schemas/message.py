from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MessageCreate(BaseModel):
    conversation_id: int
    user_id: Optional[str] = None
    question: str
    answer: str

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    user_id: Optional[str]
    question: str
    answer: str
    created_at: datetime

    class Config:
        orm_mode = True
