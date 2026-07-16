from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

class TransactionCreate(BaseModel):
    date: date
    merchant: str
    amount: float
    category: Optional[str] = None
    currency: Optional[str] = "INR"
    original_amount: Optional[float] = None

class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    merchant_clean: Optional[str] = None

class TransactionResponse(BaseModel):
    id: UUID
    date: date
    merchant_raw: str
    merchant_clean: str
    amount: float
    currency: str
    original_amount: Optional[float]
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
    current_streak: int = 0
    best_streak: int = 0
    streak_status: str = "on_track"

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

# Advanced Analytics
class WeekdaySpend(BaseModel):
    day: str
    amount: float

class TopMerchant(BaseModel):
    merchant: str
    amount: float
    count: int

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
    last_month_predicted: Optional[float] = None
    last_month_actual: Optional[float] = None
    accuracy_percent: Optional[float] = None

class UpdateBudgetRequest(BaseModel):
    monthly_budget: float

class FCMTokenRequest(BaseModel):
    fcm_token: str

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
    avatar_url: Optional[str] = None
    preferred_currency: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[date] = None
    monthly_budget: Optional[float] = None
    last_budget_update: Optional[date] = None
    preferred_currency: str = "INR"
    current_streak: int = 0
    last_logged_date: Optional[date] = None
    unlocked_badges: str = "[]"
    
    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    message: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Insights
class InsightItem(BaseModel):
    message: str
    type: str  # "warning", "positive", "info"
    icon: str  # emoji

# Wishlist
class WishlistCreate(BaseModel):
    name: str
    price: float
    priority: str = "medium"

class WishlistResponse(BaseModel):
    id: UUID
    name: str
    price: float
    priority: str
    is_purchased: str
    days_to_save: Optional[int] = None
    progress_percent: Optional[float] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Split Bills
class SplitMemberCreate(BaseModel):
    name: str
    share_amount: float

class SplitMemberResponse(BaseModel):
    id: UUID
    name: str
    share_amount: float
    is_paid: str
    model_config = ConfigDict(from_attributes=True)

class SplitBillCreate(BaseModel):
    title: str
    total_amount: float
    date: date
    category: str = "Miscellaneous"
    members: List[SplitMemberCreate]

class SplitBillResponse(BaseModel):
    id: UUID
    title: str
    total_amount: float
    date: date
    category: str
    members: List[SplitMemberResponse]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Streaks
class StreakInfo(BaseModel):
    current_streak: int
    best_streak: int
    streak_status: str  # "on_track" or "broken"

# Budgets
class CategoryBudgetCreate(BaseModel):
    category: str
    amount: float

class CategoryBudgetUpdate(BaseModel):
    amount: float

class CategoryBudgetResponse(BaseModel):
    id: UUID
    category: str
    amount: float
    rollover_balance: float
    month_updated: Optional[date] = None
    created_at: datetime
    
    # Computed fields dynamically added by the backend
    spent_this_month: Optional[float] = 0.0
    
    model_config = ConfigDict(from_attributes=True)

class WrapUpResponse(BaseModel):
    month: str
    total_spent: float
    top_category: str
    top_category_amount: float
    top_category_percentage: float
    biggest_splurge_merchant: str
    biggest_splurge_amount: float
    savings_vs_last_month: float
    is_positive_savings: bool
