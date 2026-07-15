from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction, Subscription
from app.schemas import UserResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

class CurrencyUpdateRequest(BaseModel):
    new_currency: str

# Static mocked rates against INR for simplicity
FX_RATES = {
    "INR": 1.0,
    "USD": 0.012,
    "EUR": 0.011,
    "GBP": 0.0094
}

@router.put("/currency", response_model=UserResponse)
async def update_currency(
    request: CurrencyUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if request.new_currency not in FX_RATES:
        raise HTTPException(status_code=400, detail="Unsupported currency")

    old_currency = current_user.preferred_currency or "INR"
    new_currency = request.new_currency

    if old_currency == new_currency:
        return current_user

    # Convert amount multiplier
    multiplier = (1.0 / FX_RATES[old_currency]) * FX_RATES[new_currency]

    # Convert User Budget and Vault
    if current_user.monthly_budget:
        current_user.monthly_budget *= multiplier
    if current_user.vault_balance:
        current_user.vault_balance *= multiplier
    
    current_user.preferred_currency = new_currency

    # Convert Transactions
    result = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id))
    transactions = result.scalars().all()
    for tx in transactions:
        tx.amount *= multiplier
        tx.currency = new_currency

    # Convert Subscriptions
    result = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    subscriptions = result.scalars().all()
    for sub in subscriptions:
        sub.amount *= multiplier

    await db.commit()
    await db.refresh(current_user)
    return current_user
