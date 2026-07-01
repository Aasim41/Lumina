from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

class TransactionCreate(BaseModel):
    date: date
    merchant: str
    amount: float
    category: Optional[str] = None

class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    merchant_clean: Optional[str] = None

class TransactionResponse(BaseModel):
    id: UUID
    date: date
    merchant_raw: str
    merchant_clean: str
    amount: float
    category: str
    source: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UploadResponse(BaseModel):
    rows_processed: int
    categories_found: int
    skipped_rows: int
    transactions: List[TransactionResponse]

class SummaryResponse(BaseModel):
    total_this_month: float
    total_saved_this_month: float
    total_subscriptions_this_month: float
    total_last_month: float
    month_over_month_change: float
    top_category: str
    top_category_amount: float
    transaction_count: int
    daily_average: float
    vault_balance: float
    badges: List[str]
    next_badge_target: Optional[str] = None

class SubscriptionCreate(BaseModel):
    merchant: str
    amount: float
    billing_day: int

class SubscriptionResponse(BaseModel):
    id: UUID
    merchant: str
    amount: float
    billing_day: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CategoryBreakdown(BaseModel):
    category: str
    amount: float
    percentage: float
    count: int

class MonthlyTrend(BaseModel):
    month: str
    amount: float

class ForecastResponse(BaseModel):
    predicted_next_month: float
    confidence_low: float
    confidence_high: float
    per_category: List[dict]
    historical: List[MonthlyTrend]
    projected: List[MonthlyTrend]

class GoogleAuthRequest(BaseModel):
    id_token: str

class GuestAuthRequest(BaseModel):
    name: str
    age: int
    dob: date
    monthly_budget: float

class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    monthly_budget: Optional[float] = None

class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[date] = None
    monthly_budget: Optional[float] = None
    last_budget_update: Optional[date] = None
    
    model_config = ConfigDict(from_attributes=True)

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
