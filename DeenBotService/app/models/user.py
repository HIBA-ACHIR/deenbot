from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base
from passlib.context import CryptContext

# Password context for hashing and verifying
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    @classmethod
    def create_user(cls, username, email, password, full_name=None):
        """Create a new user with hashed password"""
        return cls(
            username=username,
            email=email,
            password_hash=pwd_context.hash(password),
            full_name=full_name
        )
    
    def verify_password(self, plain_password):
        """Verify if the provided password matches the stored hash"""
        return pwd_context.verify(plain_password, self.password_hash)
