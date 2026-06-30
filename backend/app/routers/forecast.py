from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction
from app.schemas import ForecastResponse
from app.services.forecaster import forecast_spending

router = APIRouter(prefix="/api/forecast", tags=["forecast"])

@router.get("/", response_model=ForecastResponse)
async def get_forecast(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id))
    transactions = result.scalars().all()
    
    forecast_data = forecast_spending(transactions)
    
    return ForecastResponse(**forecast_data)
