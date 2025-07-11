from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ConversationCreate(BaseModel):
    user_id: Optional[str] = None
    title: Optional[str] = None
    context_id: Optional[str] = None

class ConversationOut(BaseModel):
    id: int
    user_id: Optional[str]
    title: Optional[str]
    context_id: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True
