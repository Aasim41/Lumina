from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
import datetime
import calendar
import uuid

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction, Subscription, CategoryBudget, FinancialGoal
from app.schemas import AlertItem

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("", response_model=List[AlertItem])
async def get_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alerts = []
    today = datetime.date.today()
    first_of_month = today.replace(day=1)
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    
    # 1. Budget threshold
    if current_user.monthly_budget and current_user.monthly_budget > 0:
        result = await db.execute(
            select(func.sum(Transaction.amount)).where(
                Transaction.user_id == current_user.id,
                Transaction.date >= first_of_month
            )
        )
        total_spent = result.scalar() or 0.0
        pct_used = (total_spent / current_user.monthly_budget) * 100
        
        if pct_used >= 80:
            alerts.append(AlertItem(
                id=str(uuid.uuid4()),
                type="danger" if pct_used >= 100 else "warning",
                title="Budget Alert",
                message=f"You've used {pct_used:.0f}% of your monthly budget!",
                icon="⚠️"
            ))
            
        # 3. Daily overspend
        daily_limit = current_user.monthly_budget / days_in_month
        result_today = await db.execute(
            select(func.sum(Transaction.amount)).where(
                Transaction.user_id == current_user.id,
                Transaction.date == today
            )
        )
        spent_today = result_today.scalar() or 0.0
        if spent_today > daily_limit * 1.5:
            over = spent_today - daily_limit
            alerts.append(AlertItem(
                id=str(uuid.uuid4()),
                type="danger",
                title="Daily Limit Exceeded",
                message=f"You spent {current_user.preferred_currency} {over:.0f} more than your daily limit today!",
                icon="🚨"
            ))

    # 2. Category budget alerts
    cat_budgets_result = await db.execute(
        select(CategoryBudget).where(CategoryBudget.user_id == current_user.id)
    )
    for cb in cat_budgets_result.scalars().all():
        spent_res = await db.execute(
            select(func.sum(Transaction.amount)).where(
                Transaction.user_id == current_user.id,
                Transaction.category == cb.category,
                Transaction.date >= first_of_month
            )
        )
        spent_cat = spent_res.scalar() or 0.0
        if cb.amount > 0 and spent_cat >= (0.8 * cb.amount):
            alerts.append(AlertItem(
                id=str(uuid.uuid4()),
                type="warning",
                title="Category Budget",
                message=f"You've spent {spent_cat:.0f} on {cb.category}, nearing your {cb.amount:.0f} limit.",
                icon="📊"
            ))
            
    # 4. Subscription reminders
    subs_res = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    for sub in subs_res.scalars().all():
        # calculate next billing date
        billing_date = today.replace(day=min(sub.billing_day, days_in_month))
        if billing_date < today:
            # next month
            next_month = today.month + 1 if today.month < 12 else 1
            next_year = today.year if today.month < 12 else today.year + 1
            next_days_in_month = calendar.monthrange(next_year, next_month)[1]
            billing_date = datetime.date(next_year, next_month, min(sub.billing_day, next_days_in_month))
            
        days_until = (billing_date - today).days
        if 0 <= days_until <= 3:
            day_str = "today" if days_until == 0 else f"in {days_until} days"
            alerts.append(AlertItem(
                id=str(uuid.uuid4()),
                type="reminder",
                title="Upcoming Bill",
                message=f"{sub.merchant} bill for {sub.amount:.0f} is due {day_str}.",
                icon="📅"
            ))
            
    # 5. Savings milestone
    goals_res = await db.execute(
        select(FinancialGoal).where(FinancialGoal.user_id == current_user.id)
    )
    for goal in goals_res.scalars().all():
        if goal.target_amount > 0:
            prog = (goal.saved_amount / goal.target_amount) * 100
            if prog >= 50 and prog < 100:
                alerts.append(AlertItem(
                    id=str(uuid.uuid4()),
                    type="info",
                    title="Savings Milestone!",
                    message=f"You're halfway there! {prog:.0f}% reached for '{goal.name}'.",
                    icon="🎉"
                ))
            elif prog >= 100:
                alerts.append(AlertItem(
                    id=str(uuid.uuid4()),
                    type="info",
                    title="Goal Achieved!",
                    message=f"Congratulations! You've reached your goal for '{goal.name}'.",
                    icon="🏆"
                ))

    return alerts
