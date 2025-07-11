from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Body
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
from jose import jwt, JWTError
from passlib.context import CryptContext
import logging
from app.models.user import User
from app.database import SessionLocal
from pydantic import BaseModel, EmailStr

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# JWT settings
SECRET_KEY = "YOUR_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION"  # In production, store this in environment variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(tags=["auth"])

# Pydantic models for request and response validation
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

async def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        await db.close()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    """Dependency to get the current user from the JWT token in cookie"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Get token from the cookie
    token = request.cookies.get("access_token")
    if not token:
        raise credentials_exception
    
    try:
        # Decode the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get the user from the database
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user

@router.post("/signup", response_model=UserResponse)
async def signup(user_data: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    """Create a new user and return a token"""
    # Check if username already exists
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User.create_user(
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(new_user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Set token in HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # Set to True in production with HTTPS
        samesite="strict",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    # Return user data (without password)
    return {
        "id": str(new_user.id),
        "username": new_user.username,
        "email": new_user.email,
        "full_name": new_user.full_name
    }

@router.post("/login")
async def login(user_data: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    """Login a user and return a token"""
    try:
        logger.info(f"Attempting login for email: {user_data.email}")

        # Find the user by email
        result = await db.execute(select(User).where(User.email == user_data.email))
        user = result.scalar_one_or_none()
        
        # Check if user exists
        if not user:
            logger.warning(f"Login failed: Email '{user_data.email}' not found.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password", 
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify password
        if not user.verify_password(user_data.password):
            logger.warning(f"Login failed: Incorrect password for email '{user_data.email}'.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Password verified for email: {user_data.email}")

        # Create access token
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        # Set token in HttpOnly cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,  # Set to False for localhost development if not using HTTPS
            samesite="lax", # Consider 'lax' or 'none' (if secure=True and cross-site) for development
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        logger.info(f"Login successful, token created for email: {user_data.email}")
        return {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name
        }
    except HTTPException as e:
        # Re-raise HTTPExceptions to let FastAPI handle them
        raise e
    except Exception as e:
        # Log the unexpected error
        logger.error(f"Unexpected error during login for email '{user_data.email}': {str(e)}", exc_info=True)
        # Return a generic 500 error, but this time it's a controlled FastAPI response
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during login. Please try again later.",
        )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current user from the JWT token"""
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name
    }

@router.post("/logout")
async def logout(response: Response):
    """Logout by clearing the JWT cookie"""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True,
        samesite="strict"
    )
    return {"message": "Successfully logged out"}
