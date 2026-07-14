from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
from datetime import datetime, date

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, CategoryBudget, Transaction
from app.schemas import CategoryBudgetCreate, CategoryBudgetUpdate, CategoryBudgetResponse

router = APIRouter(prefix="/api/budgets", tags=["budgets"])

async def calculate_spent_this_month(db: AsyncSession, user_id, category: str) -> float:
    today = datetime.utcnow().date()
    start_of_month = today.replace(day=1)
    
    result = await db.execute(
        select(func.sum(Transaction.amount))
        .where(Transaction.user_id == user_id)
        .where(Transaction.category == category)
        .where(Transaction.date >= start_of_month)
    )
    spent = result.scalar()
    return float(spent or 0.0)

async def sync_rollover(budget: CategoryBudget, db: AsyncSession):
    today = datetime.utcnow().date()
    current_month_start = today.replace(day=1)
    
    if budget.month_updated is None:
        budget.month_updated = current_month_start
        return budget
        
    budget_month_start = budget.month_updated.replace(day=1)
    
    if budget_month_start < current_month_start:
        # Calculate how many months passed. For simplicity, just check if it's a previous month.
        # Calculate what was spent in the LAST tracked month
        # Start of last tracked month
        start_date = budget_month_start
        # End of last tracked month
        if start_date.month == 12:
            end_date = start_date.replace(year=start_date.year + 1, month=1, day=1)
        else:
            end_date = start_date.replace(month=start_date.month + 1, day=1)
            
        result = await db.execute(
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == budget.user_id)
            .where(Transaction.category == budget.category)
            .where(Transaction.date >= start_date)
            .where(Transaction.date < end_date)
        )
        spent_last_month = result.scalar() or 0.0
        
        # Savings = Total limit (amount + previous rollover) - spent
        total_available = budget.amount + budget.rollover_balance
        savings = total_available - spent_last_month
        
        # Roll over the savings
        budget.rollover_balance = savings
        budget.month_updated = current_month_start
        await db.commit()
    
    return budget

@router.get("/", response_model=List[CategoryBudgetResponse])
async def get_budgets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(CategoryBudget)
        .where(CategoryBudget.user_id == current_user.id)
    )
    budgets = result.scalars().all()
    
    response_list = []
    for b in budgets:
        # Sync rollover if month changed
        b = await sync_rollover(b, db)
        # Calculate spent this month dynamically
        spent = await calculate_spent_this_month(db, current_user.id, b.category)
        
        # Convert to dict for response
        b_dict = {
            "id": b.id,
            "category": b.category,
            "amount": b.amount,
            "rollover_balance": b.rollover_balance,
            "month_updated": b.month_updated,
            "created_at": b.created_at,
            "spent_this_month": spent
        }
        response_list.append(b_dict)
        
    return response_list

@router.post("/", response_model=CategoryBudgetResponse)
async def create_budget(
    budget_in: CategoryBudgetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if budget for category already exists
    result = await db.execute(
        select(CategoryBudget)
        .where(CategoryBudget.user_id == current_user.id)
        .where(CategoryBudget.category == budget_in.category)
    )
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Budget for this category already exists")
        
    new_budget = CategoryBudget(
        user_id=current_user.id,
        category=budget_in.category,
        amount=budget_in.amount,
        rollover_balance=0.0,
        month_updated=datetime.utcnow().date().replace(day=1)
    )
    db.add(new_budget)
    await db.commit()
    await db.refresh(new_budget)
    
    spent = await calculate_spent_this_month(db, current_user.id, new_budget.category)
    b_dict = {
        "id": new_budget.id,
        "category": new_budget.category,
        "amount": new_budget.amount,
        "rollover_balance": new_budget.rollover_balance,
        "month_updated": new_budget.month_updated,
        "created_at": new_budget.created_at,
        "spent_this_month": spent
    }
    return b_dict

@router.put("/{budget_id}", response_model=CategoryBudgetResponse)
async def update_budget(
    budget_id: str,
    budget_in: CategoryBudgetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(CategoryBudget)
        .where(CategoryBudget.id == budget_id)
        .where(CategoryBudget.user_id == current_user.id)
    )
    budget = result.scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    budget.amount = budget_in.amount
    await db.commit()
    await db.refresh(budget)
    
    spent = await calculate_spent_this_month(db, current_user.id, budget.category)
    b_dict = {
        "id": budget.id,
        "category": budget.category,
        "amount": budget.amount,
        "rollover_balance": budget.rollover_balance,
        "month_updated": budget.month_updated,
        "created_at": budget.created_at,
        "spent_this_month": spent
    }
    return b_dict

@router.delete("/{budget_id}")
async def delete_budget(
    budget_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(CategoryBudget)
        .where(CategoryBudget.id == budget_id)
        .where(CategoryBudget.user_id == current_user.id)
    )
    budget = result.scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    await db.delete(budget)
    await db.commit()
    return {"detail": "Budget deleted"}
