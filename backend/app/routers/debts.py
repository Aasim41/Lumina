from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Debt
from app.schemas import DebtCreate, DebtUpdate, DebtResponse
from typing import List
from uuid import UUID

router = APIRouter(prefix="/api/debts", tags=["debts"])

@router.get("/", response_model=List[DebtResponse])
async def get_debts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Debt)
        .where(Debt.user_id == current_user.id)
        .order_by(Debt.created_at.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=DebtResponse)
async def create_debt(
    data: DebtCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    debt = Debt(
        user_id=current_user.id,
        name=data.name,
        total_amount=data.total_amount,
        paid_amount=data.paid_amount,
        interest_rate=data.interest_rate,
        next_emi_date=data.next_emi_date,
    )
    db.add(debt)
    await db.commit()
    await db.refresh(debt)
    return debt

@router.patch("/{debt_id}", response_model=DebtResponse)
async def update_debt(
    debt_id: str,
    data: DebtUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Debt).where(Debt.id == UUID(debt_id)).where(Debt.user_id == current_user.id)
    )
    debt = result.scalars().first()
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    if data.name is not None:
        debt.name = data.name
    if data.total_amount is not None:
        debt.total_amount = data.total_amount
    if data.paid_amount is not None:
        debt.paid_amount = data.paid_amount
    if data.interest_rate is not None:
        debt.interest_rate = data.interest_rate
    if data.next_emi_date is not None:
        debt.next_emi_date = data.next_emi_date

    await db.commit()
    await db.refresh(debt)
    return debt

@router.delete("/{debt_id}")
async def delete_debt(
    debt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Debt).where(Debt.id == UUID(debt_id)).where(Debt.user_id == current_user.id)
    )
    debt = result.scalars().first()
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    await db.delete(debt)
    await db.commit()
    return {"status": "ok"}
