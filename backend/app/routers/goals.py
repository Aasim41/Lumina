from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
from uuid import UUID
import datetime

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, FinancialGoal
from app.schemas import GoalCreate, GoalContribute, GoalResponse

router = APIRouter(prefix="/api/goals", tags=["goals"])

def calculate_goal_metrics(goal: FinancialGoal):
    # progress_percent
    progress_percent = 0.0
    if goal.target_amount > 0:
        progress_percent = (goal.saved_amount / goal.target_amount) * 100
        progress_percent = min(progress_percent, 100.0)
    
    # monthly_needed
    monthly_needed = 0.0
    if goal.target_date and goal.target_amount > goal.saved_amount:
        today = datetime.date.today()
        if goal.target_date > today:
            months_remaining = (goal.target_date.year - today.year) * 12 + goal.target_date.month - today.month
            if today.day > goal.target_date.day:
                months_remaining -= 1
                
            months_remaining = max(1, months_remaining) # Avoid division by zero
            monthly_needed = (goal.target_amount - goal.saved_amount) / months_remaining

    return progress_percent, monthly_needed

@router.get("", response_model=List[GoalResponse])
async def get_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(FinancialGoal).where(FinancialGoal.user_id == current_user.id).order_by(FinancialGoal.created_at.desc())
    )
    goals = result.scalars().all()
    
    response = []
    for g in goals:
        prog, needed = calculate_goal_metrics(g)
        goal_dict = {
            "id": g.id,
            "name": g.name,
            "target_amount": g.target_amount,
            "saved_amount": g.saved_amount,
            "target_date": g.target_date,
            "icon": g.icon,
            "created_at": g.created_at,
            "progress_percent": prog,
            "monthly_needed": needed
        }
        response.append(GoalResponse(**goal_dict))
        
    return response

@router.post("", response_model=GoalResponse)
async def create_goal(
    goal_req: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_goal = FinancialGoal(
        user_id=current_user.id,
        name=goal_req.name,
        target_amount=goal_req.target_amount,
        target_date=goal_req.target_date,
        icon=goal_req.icon,
        saved_amount=0.0
    )
    db.add(new_goal)
    await db.commit()
    await db.refresh(new_goal)
    
    prog, needed = calculate_goal_metrics(new_goal)
    return GoalResponse(
        id=new_goal.id,
        name=new_goal.name,
        target_amount=new_goal.target_amount,
        saved_amount=new_goal.saved_amount,
        target_date=new_goal.target_date,
        icon=new_goal.icon,
        created_at=new_goal.created_at,
        progress_percent=prog,
        monthly_needed=needed
    )

@router.patch("/{goal_id}/contribute", response_model=GoalResponse)
async def contribute_to_goal(
    goal_id: UUID,
    contrib: GoalContribute,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(FinancialGoal).where(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    goal.saved_amount += contrib.amount
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    
    prog, needed = calculate_goal_metrics(goal)
    return GoalResponse(
        id=goal.id,
        name=goal.name,
        target_amount=goal.target_amount,
        saved_amount=goal.saved_amount,
        target_date=goal.target_date,
        icon=goal.icon,
        created_at=goal.created_at,
        progress_percent=prog,
        monthly_needed=needed
    )

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(FinancialGoal).where(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    await db.delete(goal)
    await db.commit()
    return {"message": "Goal deleted successfully"}
