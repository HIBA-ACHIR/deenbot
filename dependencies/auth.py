# microservices/city-service/app/dependencies/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

# Configuration (replace with your actual secret and algorithm)
SECRET_KEY = "ZnW7WvTZj/LBN/p9PCSrEWNEdqok62Zr7W39BH2Z03pFo/FAdOIYBYlYSYJOizeH"  # Same as used to sign the token
ALGORITHM = "HS256"

# OAuth2 scheme to extract token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")  # Token URL is placeholder


# Pydantic model for token payload (adjust based on your JWT structure)
class TokenData(BaseModel):
    sub: str  # Subject (e.g., user ID)
    roles: list[str] = []  # Optional roles or scopes


# Dependency to validate token
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"Authorization": "Bearer "},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
        roles = payload.get("roles", [])
        return TokenData(sub=sub, roles=roles)
    except JWTError:
        raise credentials_exception


# Optional: Role-based access control
def require_role(role: str):
    async def role_checker(current_user: TokenData = Depends(get_current_user)):
        if role not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
            )
        return current_user

    return role_checker
