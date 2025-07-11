from sqlalchemy import Column, String, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)  # Now defined as UUID to match database
    title = Column(String, nullable=True)
    context_id = Column(String, nullable=True)  # Identifiant du contexte vectorisé
    created_at = Column(DateTime(timezone=True), server_default=func.now())
