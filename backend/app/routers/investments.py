from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import yfinance as yf

from app.database import get_db
from app.models import Investment, User
from app.schemas import InvestmentCreate, InvestmentUpdate, InvestmentResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/investments", tags=["Investments"])

def get_current_price(ticker: str) -> float:
    try:
        stock = yf.Ticker(ticker)
        data = stock.history(period="1d")
        if not data.empty:
            return float(data['Close'].iloc[-1])
        # Fallback if no history
        info = stock.info
        if 'currentPrice' in info:
            return float(info['currentPrice'])
        elif 'regularMarketPrice' in info:
            return float(info['regularMarketPrice'])
        return 0.0
    except Exception as e:
        print(f"Error fetching price for {ticker}: {e}")
        return 0.0

@router.get("/", response_model=List[InvestmentResponse])
async def get_investments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Investment).where(Investment.user_id == str(current_user.id)).order_by(Investment.created_at.desc())
    )
    investments = result.scalars().all()
    
    response_items = []
    for inv in investments:
        current_price = 0.0
        if inv.ticker:
            current_price = get_current_price(inv.ticker)
        
        current_value = current_price * inv.quantity if current_price else inv.invested_amount
        
        resp = InvestmentResponse(
            id=inv.id,
            user_id=inv.user_id,
            name=inv.name,
            ticker=inv.ticker,
            asset_class=inv.asset_class,
            quantity=inv.quantity,
            average_buy_price=inv.average_buy_price,
            invested_amount=inv.invested_amount,
            current_price=current_price if current_price > 0 else None,
            current_value=current_value,
            created_at=inv.created_at
        )
        response_items.append(resp)
        
    return response_items

@router.post("/", response_model=InvestmentResponse)
async def create_investment(
    investment: InvestmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_inv = Investment(
        user_id=str(current_user.id),
        **investment.model_dump()
    )
    db.add(new_inv)
    await db.commit()
    await db.refresh(new_inv)
    
    current_price = 0.0
    if new_inv.ticker:
        current_price = get_current_price(new_inv.ticker)
        
    current_value = current_price * new_inv.quantity if current_price else new_inv.invested_amount
    
    return InvestmentResponse(
        id=new_inv.id,
        user_id=new_inv.user_id,
        name=new_inv.name,
        ticker=new_inv.ticker,
        asset_class=new_inv.asset_class,
        quantity=new_inv.quantity,
        average_buy_price=new_inv.average_buy_price,
        invested_amount=new_inv.invested_amount,
        current_price=current_price if current_price > 0 else None,
        current_value=current_value,
        created_at=new_inv.created_at
    )

@router.patch("/{investment_id}", response_model=InvestmentResponse)
async def update_investment(
    investment_id: str,
    investment: InvestmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Investment).where(Investment.id == investment_id, Investment.user_id == str(current_user.id)))
    inv = result.scalar_one_or_none()
    
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
        
    update_data = investment.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(inv, key, value)
        
    await db.commit()
    await db.refresh(inv)
    
    current_price = 0.0
    if inv.ticker:
        current_price = get_current_price(inv.ticker)
        
    current_value = current_price * inv.quantity if current_price else inv.invested_amount
    
    return InvestmentResponse(
        id=inv.id,
        user_id=inv.user_id,
        name=inv.name,
        ticker=inv.ticker,
        asset_class=inv.asset_class,
        quantity=inv.quantity,
        average_buy_price=inv.average_buy_price,
        invested_amount=inv.invested_amount,
        current_price=current_price if current_price > 0 else None,
        current_value=current_value,
        created_at=inv.created_at
    )

@router.delete("/{investment_id}")
async def delete_investment(
    investment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Investment).where(Investment.id == investment_id, Investment.user_id == str(current_user.id)))
    inv = result.scalar_one_or_none()
    
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
        
    await db.delete(inv)
    await db.commit()
    return {"message": "Investment deleted"}
