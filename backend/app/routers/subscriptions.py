from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Subscription
from app.schemas import SubscriptionCreate, SubscriptionResponse

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

@router.get("/", response_model=List[SubscriptionResponse])
async def get_subscriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == current_user.id)
        .order_by(Subscription.billing_day.asc())
    )
    return result.scalars().all()

@router.post("/", response_model=SubscriptionResponse)
async def create_subscription(
    sub_in: SubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_sub = Subscription(
        user_id=current_user.id,
        merchant=sub_in.merchant,
        amount=sub_in.amount,
        billing_day=sub_in.billing_day
    )
    db.add(new_sub)
    await db.commit()
    await db.refresh(new_sub)
    return new_sub

@router.delete("/{sub_id}")
async def delete_subscription(
    sub_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Subscription)
        .where(Subscription.id == sub_id)
        .where(Subscription.user_id == current_user.id)
    )
    sub = result.scalars().first()
    
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    await db.delete(sub)
    await db.commit()
    return {"detail": "Successfully deleted subscription"}
