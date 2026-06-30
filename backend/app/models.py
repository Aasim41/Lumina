import uuid
import datetime
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, Enum, Uuid, Integer
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
    monthly_budget = Column(Float, nullable=True)
    last_budget_update = Column(Date, nullable=True)
    vault_balance = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    date = Column(Date, nullable=False)
    merchant_raw = Column(String, nullable=False)
    merchant_clean = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
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
