from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import UserResponse, UserUpdate, FCMTokenRequest

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/fcm-token", response_model=UserResponse)
async def update_fcm_token(
    req: FCMTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.fcm_token = req.fcm_token
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.patch("/me", response_model=UserResponse)
async def update_me(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.age is not None:
        current_user.age = user_update.age
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    if user_update.monthly_budget is not None:
        current_user.monthly_budget = user_update.monthly_budget
        import datetime
        current_user.last_budget_update = datetime.date.today()
        
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    return current_user
