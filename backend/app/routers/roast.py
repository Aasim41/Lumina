from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import random
from datetime import datetime, date

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction

router = APIRouter(prefix="/api/roast", tags=["Roast"])

class RoastRequest(BaseModel):
    amount: float
    category: str
    merchant: str

ROAST_TEMPLATES = {
    "Food & Dining": [
        "₹{amount} at {merchant}? Are you allergic to your own kitchen? Your wallet is crying.",
        "Oh look, another ₹{amount} on food. Let me guess, you 'didn't have time' to cook?",
        "Eating at {merchant} again? You know instant noodles cost like ₹20, right?",
        "₹{amount} for a single meal. I hope it tasted like financial regret."
    ],
    "Entertainment": [
        "₹{amount} on {merchant}? I hope you're having fun, because your bank account isn't.",
        "You spent ₹{amount} to be 'entertained'? Try staring at a wall. It's free.",
        "If you spent less on {merchant} and more time working, you wouldn't need a budget app."
    ],
    "Shopping": [
        "₹{amount} at {merchant}?! Do you really need more stuff? (Spoiler: No).",
        "Retail therapy is just a fancy word for going broke. Goodbye ₹{amount}.",
        "Wow, ₹{amount} gone. Jeff Bezos thanks you for your contribution."
    ],
    "General": [
        "₹{amount} on {merchant}? Are we made of money now?",
        "I'm updating your financial status to 'Hopeless'. Nice job spending ₹{amount} at {merchant}.",
        "Another day, another ₹{amount} vanished into the void of {merchant}."
    ]
}

@router.post("/")
async def get_roast(
    req: RoastRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Smart Roaster Logic
    now = datetime.now()
    start_of_month = date(now.year, now.month, 1)

    # 1. Count transactions in this category this month
    count_query = select(func.count(Transaction.id)).where(
        Transaction.user_id == current_user.id,
        Transaction.category == req.category,
        Transaction.date >= start_of_month
    )
    count_result = await db.execute(count_query)
    freq_count = count_result.scalar() or 0
    
    # Add the current transaction to the count
    freq_count += 1

    # 2. Sum amounts in this category this month
    sum_query = select(func.sum(Transaction.amount)).where(
        Transaction.user_id == current_user.id,
        Transaction.category == req.category,
        Transaction.date >= start_of_month
    )
    sum_result = await db.execute(sum_query)
    total_amount = (sum_result.scalar() or 0.0) + req.amount

    budget = current_user.monthly_budget or 10000.0  # Fallback to 10k if not set
    
    # Barriers: Frequency > 5 times in the same category OR Volume > 25% of total budget
    if freq_count > 5 or total_amount > (0.25 * budget):
        cat = req.category if req.category in ROAST_TEMPLATES else "General"
        template = random.choice(ROAST_TEMPLATES[cat])
        roast_msg = template.format(amount=req.amount, merchant=req.merchant)
        
        # Add context to the roast
        if total_amount > (0.25 * budget):
            roast_msg += f" You've blown over 25% of your budget just on {req.category} this month!"
        elif freq_count > 5:
            roast_msg += f" That's {freq_count} times you've spent on {req.category} this month. Addicted much?"
            
        return {"message": roast_msg}
    
    # Healthy spending -> no roast
    return {"message": None}
