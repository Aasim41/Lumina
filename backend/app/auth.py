import uuid
from jose import jwt, JWTError
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import datetime, timedelta
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def verify_google_token(token: str) -> dict:
    if settings.GOOGLE_CLIENT_ID == "dev-mode":
        # Bypass for development/testing
        logger.warning("Using dev-mode auth bypass")
        return {
            "sub": "dev-user-123",
            "email": "dev@example.com",
            "name": "Dev User",
            "picture": "https://example.com/avatar.jpg"
        }
    
    try:
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), settings.GOOGLE_CLIENT_ID, clock_skew_in_seconds=30
        )
        return idinfo
    except ValueError as e:
        logger.error(f"Token verification failed: {str(e)}")
        print(f"DEBUG TOKEN ERROR: {str(e)}")
        return {}

def create_jwt(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    to_encode = {"sub": str(user_id), "email": email, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_jwt(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        return {}
