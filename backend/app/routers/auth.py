from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User
from app.schemas import GoogleAuthRequest, AuthResponse, UserResponse
from app.auth import verify_google_token, create_jwt

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/google", response_model=AuthResponse)
async def auth_google(request: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    idinfo = verify_google_token(request.id_token)
    if not idinfo:
        raise HTTPException(status_code=400, detail="Invalid Google token")
        
    google_id = idinfo.get("sub")
    email = idinfo.get("email")
    name = idinfo.get("name")
    avatar_url = idinfo.get("picture")
    
    # Upsert user
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            avatar_url=avatar_url
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    access_token = create_jwt(str(user.id), user.email)
    
    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )
