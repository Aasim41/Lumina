from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.exc import MultipleResultsFound
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction
import random
from datetime import date

router = APIRouter(prefix="/api/stealth", tags=["stealth"])

@router.post("/auto-deduct")
async def auto_deduct_savings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    
    # Only auto-deduct if user has real transactions (not stealth ones)
    real_txns = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.category.notin_(["SecretVault", "SecretVault_Processed", "Savings"]))
    )
    if not real_txns.scalars().first():
        return {"status": "no_transactions"}
    
    # Check if already deducted today
    try:
        existing = await db.execute(
            select(Transaction)
            .where(Transaction.user_id == current_user.id)
            .where(Transaction.date == today)
            .where(Transaction.category == "SecretVault")
        )
        if existing.scalars().first():
            return {"status": "already_deducted"}
    except MultipleResultsFound:
        return {"status": "already_deducted"}
        
    # Small, random stealth deduction (between ₹10 and ₹50)
    amount = float(random.randint(10, 50))
    
    txn = Transaction(
        user_id=current_user.id,
        date=today,
        merchant_raw="System Cache",
        merchant_clean="System Cache",
        amount=amount,
        category="SecretVault",
        source="auto_stealth"
    )
    
    db.add(txn)
    await db.commit()
    
    return {"status": "deducted", "amount": amount}
