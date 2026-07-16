import uuid
import datetime
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, Enum, Uuid, Integer, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy.sql import func

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    google_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    dob = Column(Date, nullable=True)
    monthly_budget = Column(Float, nullable=True)
    last_budget_update = Column(Date, nullable=True)
    vault_balance = Column(Float, default=0.0)
    preferred_currency = Column(String, default="INR")
    fcm_token = Column(String, nullable=True)
    current_streak = Column(Integer, default=0)
    last_logged_date = Column(Date, nullable=True)
    unlocked_badges = Column(String, default="[]")  # Store as JSON string array
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    category_budgets = relationship("CategoryBudget", back_populates="user", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    date = Column(Date, nullable=False)
    merchant_raw = Column(String, nullable=False)
    merchant_clean = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    original_amount = Column(Float, nullable=True)
    category = Column(String, nullable=False)
    source = Column(String, nullable=False) # 'csv_upload' or 'manual_entry'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    merchant = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    billing_day = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="subscriptions")

class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    priority = Column(String, default="medium")  # high, medium, low
    is_purchased = Column(String, default="false")  # "true" or "false"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User")

class SplitBill(Base):
    __tablename__ = "split_bills"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    category = Column(String, default="Miscellaneous")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User")
    members = relationship("SplitMember", back_populates="bill", cascade="all, delete-orphan")

class SplitMember(Base):
    __tablename__ = "split_members"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    bill_id = Column(Uuid, ForeignKey("split_bills.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String, nullable=False)
    share_amount = Column(Float, nullable=False)
    is_paid = Column(String, default="false")  # "true" or "false"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    bill = relationship("SplitBill", back_populates="members")

class ForecastSnapshot(Base):
    __tablename__ = "forecast_snapshots"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    month = Column(Date, nullable=False)  # first of month
    predicted_amount = Column(Float, nullable=False)
    actual_amount = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User")

class CategoryBudget(Base):
    __tablename__ = "category_budgets"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    rollover_balance = Column(Float, default=0.0)
    month_updated = Column(Date, nullable=True) # Tracks the month this rollover was last updated
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="category_budgets")
