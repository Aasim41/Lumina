from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, SplitBill, SplitMember
from app.schemas import SplitBillCreate, SplitBillResponse
from typing import List

router = APIRouter(prefix="/api/splits", tags=["splits"])

@router.get("/", response_model=List[SplitBillResponse])
async def get_splits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(SplitBill)
        .where(SplitBill.user_id == current_user.id)
        .options(selectinload(SplitBill.members))
        .order_by(SplitBill.created_at.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=SplitBillResponse)
async def create_split(
    data: SplitBillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bill = SplitBill(
        user_id=current_user.id,
        title=data.title,
        total_amount=data.total_amount,
        date=data.date,
        category=data.category,
    )
    db.add(bill)
    await db.flush()
    
    for m in data.members:
        member = SplitMember(
            bill_id=bill.id,
            name=m.name,
            share_amount=m.share_amount,
        )
        db.add(member)
    
    await db.commit()
    
    # Reload with members
    result = await db.execute(
        select(SplitBill)
        .where(SplitBill.id == bill.id)
        .options(selectinload(SplitBill.members))
    )
    return result.scalars().first()

@router.patch("/{bill_id}/members/{member_id}")
async def mark_member_paid(
    bill_id: str, member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from uuid import UUID
    result = await db.execute(
        select(SplitBill)
        .where(SplitBill.id == UUID(bill_id))
        .where(SplitBill.user_id == current_user.id)
    )
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404)
    
    member_result = await db.execute(
        select(SplitMember)
        .where(SplitMember.id == UUID(member_id))
        .where(SplitMember.bill_id == bill.id)
    )
    member = member_result.scalars().first()
    if not member:
        raise HTTPException(status_code=404)
    
    member.is_paid = "true" if member.is_paid == "false" else "false"
    await db.commit()
    return {"status": "ok", "is_paid": member.is_paid}

@router.delete("/{bill_id}")
async def delete_split(
    bill_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from uuid import UUID
    result = await db.execute(
        select(SplitBill)
        .where(SplitBill.id == UUID(bill_id))
        .where(SplitBill.user_id == current_user.id)
    )
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404)
    await db.delete(bill)
    await db.commit()
    return {"status": "deleted"}
