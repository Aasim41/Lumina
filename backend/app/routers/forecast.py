from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
from dateutil.relativedelta import relativedelta
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction, ForecastSnapshot
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
    
    # Save snapshot for this month
    today = datetime.today()
    this_month_first = today.replace(day=1).date()
    
    snap_result = await db.execute(
        select(ForecastSnapshot)
        .where(ForecastSnapshot.user_id == current_user.id)
        .where(ForecastSnapshot.month == this_month_first)
    )
    existing_snap = snap_result.scalars().first()
    
    if existing_snap:
        existing_snap.predicted_amount = forecast_data["predicted_next_month"]
    else:
        snap = ForecastSnapshot(
            user_id=current_user.id,
            month=this_month_first,
            predicted_amount=forecast_data["predicted_next_month"],
        )
        db.add(snap)
    
    # Check last month's accuracy
    last_month_first = (today.replace(day=1) - relativedelta(months=1)).date()
    last_snap_result = await db.execute(
        select(ForecastSnapshot)
        .where(ForecastSnapshot.user_id == current_user.id)
        .where(ForecastSnapshot.month == last_month_first)
    )
    last_snap = last_snap_result.scalars().first()
    
    last_month_predicted = None
    last_month_actual = None
    accuracy_percent = None
    
    if last_snap:
        # Calculate actual spending last month
        end_last_month = this_month_first
        actual_txns = [t for t in transactions 
                       if last_month_first <= t.date < end_last_month 
                       and t.category not in ["Savings", "SecretVault", "SecretVault_Processed"]]
        actual_total = sum(t.amount for t in actual_txns)
        
        last_snap.actual_amount = actual_total
        last_month_predicted = last_snap.predicted_amount
        last_month_actual = actual_total
        
        if actual_total > 0:
            accuracy_percent = round(100 - abs((last_snap.predicted_amount - actual_total) / actual_total * 100), 1)
            accuracy_percent = max(accuracy_percent, 0)
    
    await db.commit()
    
    return ForecastResponse(
        **forecast_data,
        last_month_predicted=last_month_predicted,
        last_month_actual=last_month_actual,
        accuracy_percent=accuracy_percent,
    )
