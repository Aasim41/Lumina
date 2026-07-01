from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from typing import List, Optional
from datetime import date
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction
from app.schemas import TransactionResponse, TransactionCreate, TransactionUpdate
from app.services.cleaner import clean_merchant_name
from app.services.categorizer import predict

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.get("/", response_model=List[TransactionResponse])
async def list_transactions(
    skip: int = 0,
    limit: int = 50,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Transaction).where(
        Transaction.user_id == current_user.id,
        Transaction.category != "SecretVault"
    )
    
    if start_date:
        query = query.where(Transaction.date >= start_date)
    if end_date:
        query = query.where(Transaction.date <= end_date)
    if category:
        query = query.where(Transaction.category == category)
        
    query = query.order_by(desc(Transaction.date)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return [TransactionResponse.model_validate(t) for t in transactions]

@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    txn: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_merchant = clean_merchant_name(txn.merchant)
    category = txn.category or predict(clean_merchant)
    
    # Duplicate check: same user, date, amount, and merchant
    from sqlalchemy import and_, func
    dup_check = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.user_id == current_user.id,
                Transaction.date == txn.date,
                Transaction.amount == txn.amount,
                Transaction.merchant_raw == txn.merchant,
            )
        )
    )
    existing = dup_check.scalar_one_or_none()
    if existing:
        # Return the existing transaction instead of creating a duplicate
        return TransactionResponse.model_validate(existing)
    
    new_txn = Transaction(
        user_id=current_user.id,
        date=txn.date,
        merchant_raw=txn.merchant,
        merchant_clean=clean_merchant,
        amount=txn.amount,
        category=category,
        source="manual_entry"
    )
    
    db.add(new_txn)
    await db.commit()
    await db.refresh(new_txn)
    
    return TransactionResponse.model_validate(new_txn)

@router.patch("/{txn_id}", response_model=TransactionResponse)
async def update_transaction(
    txn_id: UUID,
    txn_update: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Transaction).where(Transaction.id == txn_id, Transaction.user_id == current_user.id)
    )
    txn = result.scalar_one_or_none()
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if txn_update.category is not None:
        txn.category = txn_update.category
    if txn_update.merchant_clean is not None:
        txn.merchant_clean = txn_update.merchant_clean
        
    await db.commit()
    await db.refresh(txn)
    
    return TransactionResponse.model_validate(txn)

@router.delete("/{txn_id}", status_code=204)
async def delete_transaction(
    txn_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Transaction).where(Transaction.id == txn_id, Transaction.user_id == current_user.id)
    )
    txn = result.scalar_one_or_none()
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    await db.delete(txn)
    await db.commit()
