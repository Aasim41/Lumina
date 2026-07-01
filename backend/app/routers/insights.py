from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction
from app.schemas import InsightItem
from typing import List

router = APIRouter(prefix="/api/insights", tags=["insights"])

@router.get("/", response_model=List[InsightItem])
async def get_insights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.today().date()
    # This week = last 7 days, last week = 7-14 days ago
    this_week_start = today - timedelta(days=7)
    last_week_start = today - timedelta(days=14)
    start_this_month = today.replace(day=1)
    
    result = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id))
    all_txns = result.scalars().all()
    
    this_week = [t for t in all_txns if t.date >= this_week_start and t.category not in ["Savings", "SecretVault", "SecretVault_Processed"]]
    last_week = [t for t in all_txns if last_week_start <= t.date < this_week_start and t.category not in ["Savings", "SecretVault", "SecretVault_Processed"]]
    this_month = [t for t in all_txns if t.date >= start_this_month and t.category not in ["Savings", "SecretVault", "SecretVault_Processed"]]
    
    insights = []
    
    # Week-over-week category comparison
    tw_cats = {}
    for t in this_week:
        tw_cats[t.category] = tw_cats.get(t.category, 0) + t.amount
    lw_cats = {}
    for t in last_week:
        lw_cats[t.category] = lw_cats.get(t.category, 0) + t.amount
    
    for cat, tw_amt in tw_cats.items():
        lw_amt = lw_cats.get(cat, 0)
        if lw_amt > 0:
            change = ((tw_amt - lw_amt) / lw_amt) * 100
            if change > 30:
                insights.append(InsightItem(
                    message=f"You spent {change:.0f}% more on {cat} this week vs last week",
                    type="warning",
                    icon="📈"
                ))
            elif change < -20:
                insights.append(InsightItem(
                    message=f"Great job! Your {cat} spending is down {abs(change):.0f}% this week",
                    type="positive",
                    icon="🎉"
                ))
    
    # Daily pace check
    budget = current_user.monthly_budget or 0
    if budget > 0 and len(this_month) > 0:
        days_elapsed = today.day
        total_spent = sum(t.amount for t in this_month)
        daily_avg = total_spent / max(days_elapsed, 1)
        import calendar
        days_in_month = calendar.monthrange(today.year, today.month)[1]
        projected = daily_avg * days_in_month
        
        if projected > budget * 1.1:
            over_by = projected - budget
            insights.append(InsightItem(
                message=f"At this rate, you'll exceed your budget by ₹{over_by:,.0f}",
                type="warning",
                icon="⚠️"
            ))
        elif projected < budget * 0.8:
            savings = budget - projected
            insights.append(InsightItem(
                message=f"You're on track to save ₹{savings:,.0f} this month!",
                type="positive",
                icon="💰"
            ))
    
    # Top merchant this month
    merchant_totals = {}
    for t in this_month:
        m = t.merchant_clean or t.merchant_raw
        merchant_totals[m] = merchant_totals.get(m, 0) + t.amount
    if merchant_totals:
        top_merchant = max(merchant_totals, key=merchant_totals.get)
        top_amount = merchant_totals[top_merchant]
        if top_amount > 500:
            insights.append(InsightItem(
                message=f"{top_merchant} is your #1 merchant — ₹{top_amount:,.0f} this month",
                type="info",
                icon="🏪"
            ))
    
    # Total this week vs last week
    tw_total = sum(t.amount for t in this_week)
    lw_total = sum(t.amount for t in last_week)
    if lw_total > 0:
        weekly_change = ((tw_total - lw_total) / lw_total) * 100
        if weekly_change > 20:
            insights.append(InsightItem(
                message=f"Overall spending is up {weekly_change:.0f}% compared to last week",
                type="warning",
                icon="📊"
            ))
        elif weekly_change < -15:
            insights.append(InsightItem(
                message=f"You spent {abs(weekly_change):.0f}% less this week — keep it up!",
                type="positive",
                icon="⬇️"
            ))
    
    if not insights:
        insights.append(InsightItem(
            message="Keep adding expenses to get personalized insights!",
            type="info",
            icon="💡"
        ))
    
    return insights
