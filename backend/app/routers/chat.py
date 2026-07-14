from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.database import get_db
from app.models import Transaction, User
from app.dependencies import get_current_user
from app.schemas import ChatRequest
from groq import Groq
import os
import json
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/chat", tags=["chat"])

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

@router.post("")
async def chat_with_advisor(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_message = request.message
    
    # Fetch user's recent transactions for context (last 30 days)
    thirty_days_ago = datetime.utcnow().date() - timedelta(days=30)
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.date >= thirty_days_ago)
        .order_by(Transaction.date.desc())
    )
    transactions = result.scalars().all()
    
    # Calculate some summary stats for the prompt
    total_spent = sum(t.amount for t in transactions)
    category_totals = {}
    for t in transactions:
        category_totals[t.category] = category_totals.get(t.category, 0) + t.amount
        
    context_data = {
        "user_name": current_user.name,
        "total_spent_last_30_days": total_spent,
        "spending_by_category": category_totals,
        "recent_transactions_count": len(transactions),
        "top_5_recent_transactions": [
            {"merchant": t.merchant_clean, "amount": t.amount, "category": t.category, "date": str(t.date)}
            for t in transactions[:5]
        ]
    }
    
    system_prompt = f"""
    You are 'Lumina', an expert, friendly AI Financial Advisor built into the Smart Expense Tracker app.
    Your tone is encouraging, professional, and concise. Use emojis occasionally.
    
    IMPORTANT INSTRUCTIONS:
    1. ALWAYS use INR (₹) as the default currency in your responses.
    2. NEVER mention or display the "Secret Vault" or "Vault" feature.

    Here is the user's financial context for the last 30 days:
    {json.dumps(context_data, indent=2)}
    
    Based on this data, answer the user's question with actionable insights. Do not make up transactions outside of this data, but you can infer general advice.
    Keep your response under 150 words and use markdown formatting (like bolding key numbers).
    """

    if not GROQ_API_KEY:
        # Fallback if no API key is provided
        fallback_msg = f"Hey {current_user.name}! I see you've spent ₹{total_spent} in the last 30 days. Your top spending is in your tracked categories. (Note: To get true AI insights, please add your GROQ_API_KEY to the backend .env file!)"
        return {"response": fallback_msg}
        
    try:
        client = Groq(api_key=GROQ_API_KEY)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_message,
                }
            ],
            model="llama-3.1-8b-instant",
        )
        return {"response": chat_completion.choices[0].message.content}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Groq API Error:", e)
        error_msg = str(e).lower()
        if "api_key" in error_msg or "api key" in error_msg or "403" in error_msg or "401" in error_msg:
            return {"response": "Oops! It looks like your Groq API Key is invalid. Please double-check your `GROQ_API_KEY` in the backend `.env` file (it should usually start with `gsk_`)."}
        return {"response": f"I'm having trouble analyzing your finances right now. Debug Error: {str(e)}"}
