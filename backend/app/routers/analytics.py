from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction, Subscription
from app.schemas import SummaryResponse, CategoryBreakdown, MonthlyTrend
import io
import csv
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/summary", response_model=SummaryResponse)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.today()
    start_this_month = today.replace(day=1).date()
    start_last_month = (today.replace(day=1) - relativedelta(months=1)).date()
    
    # All txns for user
    result = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id))
    transactions = result.scalars().all()
    
    this_month_txns = [t for t in transactions if t.date >= start_this_month]
    last_month_txns = [t for t in transactions if start_last_month <= t.date < start_this_month]
    
    total_this_month = sum(t.amount for t in this_month_txns if t.category not in ["Savings", "SecretVault"])
    total_saved_this_month = sum(t.amount for t in this_month_txns if t.category in ["Savings", "SecretVault"])
    total_last_month = sum(t.amount for t in last_month_txns if t.category not in ["Savings", "SecretVault"])
    
    if total_last_month > 0:
        mom_change = ((total_this_month - total_last_month) / total_last_month) * 100
    else:
        mom_change = 0.0
        
    category_totals = {}
    for t in this_month_txns:
        if t.category != "Savings":
            category_totals[t.category] = category_totals.get(t.category, 0) + t.amount
        
    top_category = ""
    top_category_amount = 0.0
    if category_totals:
        top_category = max(category_totals, key=category_totals.get)
        top_category_amount = category_totals[top_category]
        
    days_in_month = (today.replace(day=1) + relativedelta(months=1) - timedelta(days=1)).day
    daily_average = total_this_month / today.day if today.day > 0 else 0
    
    sub_result = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    subscriptions = sub_result.scalars().all()
    total_subscriptions_this_month = sum(s.amount for s in subscriptions)

    # Badges Calculation
    badges = []
    next_badge_target = None
    budget = current_user.monthly_budget or 0
    
    if len([t for t in transactions if t.category not in ["SecretVault", "SecretVault_Processed", "Savings"]]) > 0:
        badges.append("First Steps")
        
    if budget > 0:
        # Projected total spending for the entire month
        projected_spend = daily_average * days_in_month
        
        # Super Saver
        super_saver_target = budget * 0.2
        if total_saved_this_month > super_saver_target:
            badges.append("Super Saver")
        
        # On Track
        if projected_spend < budget:
            badges.append("On Track")
            
        # Determine Next Target
        if "Super Saver" not in badges:
            remaining_to_save = super_saver_target - total_saved_this_month
            next_badge_target = f"Save ₹{remaining_to_save:.0f} more this month to unlock 'Super Saver'!"
        elif "On Track" not in badges:
            next_badge_target = f"Keep your projected spending below ₹{budget:.0f} to unlock 'On Track'!"
        else:
            next_badge_target = "Incredible! You've unlocked all badges for this month!"

    return SummaryResponse(
        total_this_month=total_this_month,
        total_saved_this_month=total_saved_this_month,
        total_subscriptions_this_month=total_subscriptions_this_month,
        total_last_month=total_last_month,
        month_over_month_change=mom_change,
        top_category=top_category,
        top_category_amount=top_category_amount,
        transaction_count=len([t for t in this_month_txns if t.category not in ["Savings", "SecretVault"]]),
        daily_average=daily_average,
        vault_balance=current_user.vault_balance or 0.0,
        badges=badges,
        next_badge_target=next_badge_target
    )

@router.get("/categories", response_model=List[CategoryBreakdown])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.today()
    start_this_month = today.replace(day=1).date()
    
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == current_user.id, Transaction.date >= start_this_month)
    )
    transactions = result.scalars().all()
    
    total_amount = sum(t.amount for t in transactions)
    
    category_map = {}
    for t in transactions:
        if t.category in ["Savings", "SecretVault"]:
            continue
            
        if t.category not in category_map:
            category_map[t.category] = {"amount": 0, "count": 0}
        category_map[t.category]["amount"] += t.amount
        category_map[t.category]["count"] += 1
        
    breakdown = []
    for cat, data in category_map.items():
        percentage = (data["amount"] / total_amount * 100) if total_amount > 0 else 0
        breakdown.append(CategoryBreakdown(
            category=cat,
            amount=data["amount"],
            percentage=percentage,
            count=data["count"]
        ))
        
    breakdown.sort(key=lambda x: x.amount, reverse=True)
    return breakdown

@router.get("/trends", response_model=List[MonthlyTrend])
async def get_trends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    twelve_months_ago = (datetime.today().replace(day=1) - relativedelta(months=11)).date()
    
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == current_user.id, Transaction.date >= twelve_months_ago)
    )
    transactions = result.scalars().all()
    
    trend_map = {}
    for i in range(12):
        d = datetime.today().replace(day=1) - relativedelta(months=11-i)
        month_str = d.strftime("%Y-%m")
        trend_map[month_str] = 0.0
        
    for t in transactions:
        if t.category in ["Savings", "SecretVault"]:
            continue
        month_str = t.date.strftime("%Y-%m")
        if month_str in trend_map:
            trend_map[month_str] += t.amount
            
    trends = [MonthlyTrend(month=k, amount=v) for k, v in trend_map.items()]
    return trends

from fpdf import FPDF

@router.get("/export/pdf")
async def export_transactions_pdf(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.desc())
    )
    transactions = result.scalars().all()

    class PDF(FPDF):
        def header(self):
            self.set_font("helvetica", "B", 20)
            self.cell(0, 10, "Transaction History", new_x="LMARGIN", new_y="NEXT", align="L")
            self.set_font("helvetica", "", 11)
            self.set_text_color(100, 100, 100)
            self.cell(0, 10, f"Generated on: {datetime.today().strftime('%B %d, %Y')}", new_x="LMARGIN", new_y="NEXT", align="L")
            self.ln(5)

    pdf = PDF()
    pdf.add_page()
    pdf.set_font("helvetica", "", 10)

    # Table Header
    pdf.set_fill_color(139, 92, 246) # Purple-500
    pdf.set_text_color(255, 255, 255)
    pdf.cell(30, 10, "Date", border=1, fill=True)
    pdf.cell(60, 10, "Merchant", border=1, fill=True)
    pdf.cell(40, 10, "Category", border=1, fill=True)
    pdf.cell(30, 10, "Amount", border=1, fill=True)
    pdf.cell(30, 10, "Source", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

    pdf.set_text_color(0, 0, 0)
    for t in transactions:
        pdf.cell(30, 10, str(t.date), border=1)
        pdf.cell(60, 10, str(t.merchant_clean or t.merchant_raw or 'Unknown'), border=1)
        pdf.cell(40, 10, str(t.category or 'Miscellaneous'), border=1)
        pdf.cell(30, 10, f"Rs. {t.amount:.2f}", border=1)
        pdf.cell(30, 10, str(t.source or 'Manual'), border=1, new_x="LMARGIN", new_y="NEXT")

    # Output to stream
    pdf_bytes = pdf.output(dest="S")
    
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=transaction_history.pdf"}
    )

@router.get("/export")
async def export_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id).order_by(Transaction.date.desc()))
    transactions = result.scalars().all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Merchant', 'Amount', 'Category', 'Source'])
    
    for t in transactions:
        writer.writerow([t.date, t.merchant_clean, t.amount, t.category, t.source])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=transactions_export.csv"}
    )

from pydantic import BaseModel
class RolloverRequest(BaseModel):
    action: str

@router.post("/rollover")
async def process_rollover(
    req: RolloverRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Calculate stealth savings from LAST month
    today = datetime.today()
    start_this_month = today.replace(day=1).date()
    start_last_month = (today.replace(day=1) - relativedelta(months=1)).date()
    
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.category == "SecretVault")
        .where(Transaction.date >= start_last_month)
        .where(Transaction.date < start_this_month)
    )
    last_month_stealth_txns = result.scalars().all()
    
    total_saved = sum(t.amount for t in last_month_stealth_txns)
    
    if total_saved <= 0:
        return {"status": "no_savings"}
        
    if req.action == "budget":
        if current_user.monthly_budget is None:
            current_user.monthly_budget = 0.0
        current_user.monthly_budget += total_saved
    elif req.action == "vault":
        if current_user.vault_balance is None:
            current_user.vault_balance = 0.0
        current_user.vault_balance += total_saved
    else:
        return {"error": "Invalid action"}
        
    # Mark transactions as processed so they aren't rolled over again
    for t in last_month_stealth_txns:
        t.category = "SecretVault_Processed"
        
    await db.commit()
    
    return {"status": "success", "rolled_over": total_saved}

@router.get("/rollover-status")
async def get_rollover_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.today()
    start_this_month = today.replace(day=1).date()
    start_last_month = (today.replace(day=1) - relativedelta(months=1)).date()
    
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.category == "SecretVault")
        .where(Transaction.date >= start_last_month)
        .where(Transaction.date < start_this_month)
    )
    last_month_stealth_txns = result.scalars().all()
    total_saved = sum(t.amount for t in last_month_stealth_txns)
    
    return {"has_unprocessed_savings": total_saved > 0, "amount": total_saved}
