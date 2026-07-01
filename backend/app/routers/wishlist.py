from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
from dateutil.relativedelta import relativedelta
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction, WishlistItem
from app.schemas import WishlistCreate, WishlistResponse
from typing import List

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])

@router.get("/", response_model=List[WishlistResponse])
async def get_wishlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.user_id == current_user.id)
        .order_by(WishlistItem.created_at.desc())
    )
    items = result.scalars().all()
    
    # Calculate daily savings rate for days_to_save
    budget = current_user.monthly_budget or 0
    today = datetime.today()
    start_this_month = today.replace(day=1).date()
    
    txn_result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.date >= start_this_month)
    )
    this_month_txns = txn_result.scalars().all()
    total_spent = sum(t.amount for t in this_month_txns if t.category not in ["Savings", "SecretVault", "SecretVault_Processed"])
    
    days_elapsed = max(today.day, 1)
    daily_avg_spend = total_spent / days_elapsed
    daily_savings = max((budget / 30) - daily_avg_spend, 1)  # min 1 to avoid division by zero
    
    responses = []
    for item in items:
        days = int(item.price / daily_savings) if daily_savings > 0 else 999
        progress = min((daily_savings * days_elapsed / item.price) * 100, 100) if item.price > 0 else 0
        responses.append(WishlistResponse(
            id=item.id,
            name=item.name,
            price=item.price,
            priority=item.priority,
            is_purchased=item.is_purchased,
            days_to_save=days,
            progress_percent=round(progress, 1),
            created_at=item.created_at,
        ))
    
    return responses

@router.post("/", response_model=WishlistResponse)
async def create_wishlist_item(
    data: WishlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = WishlistItem(
        user_id=current_user.id,
        name=data.name,
        price=data.price,
        priority=data.priority,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return WishlistResponse(
        id=item.id, name=item.name, price=item.price,
        priority=item.priority, is_purchased=item.is_purchased,
        days_to_save=0, progress_percent=0,
        created_at=item.created_at,
    )

@router.patch("/{item_id}")
async def update_wishlist_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from uuid import UUID
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == UUID(item_id))
        .where(WishlistItem.user_id == current_user.id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404)
    item.is_purchased = "true"
    await db.commit()
    return {"status": "ok"}

@router.delete("/{item_id}")
async def delete_wishlist_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from uuid import UUID
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == UUID(item_id))
        .where(WishlistItem.user_id == current_user.id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404)
    await db.delete(item)
    await db.commit()
    return {"status": "deleted"}
