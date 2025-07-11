from fastapi import Request, Depends, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Configuration from your auth_routes.py
SECRET_KEY = "YOUR_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_COOKIE_NAME = "access_token"

class TokenData(BaseModel):
    sub: str

async def get_current_user(request: Request):
    """
    Dependency to get the current user from the JWT token in an HttpOnly cookie.
    This is the centralized and correct method for authentication in this app.
    """
    token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"}, # Although we use cookies, this header is standard.
    )

    if not token:
        logger.warning("Authentication failed: No access token found in cookies.")
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Authentication failed: Token payload is missing 'sub' (user ID).")
            raise credentials_exception
        
        # Return the validated token data
        return TokenData(sub=user_id)
    
    except JWTError as e:
        logger.error(f"Authentication failed: JWT could not be decoded. Error: {e}")
        raise credentials_exception
