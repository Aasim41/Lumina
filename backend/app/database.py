from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg uses ssl= not sslmode=
if "asyncpg" in db_url and "sslmode=" in db_url:
    db_url = db_url.replace("sslmode=", "ssl=")

engine = create_async_engine(
    db_url,
    echo=False
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto-migrate each column separately so errors in one don't break others (especially on SQLite)
    auto_migrations = [
        "ALTER TABLE users ADD COLUMN dob DATE;",
        "ALTER TABLE users ADD COLUMN last_budget_update DATE;",
        "ALTER TABLE users ADD COLUMN fcm_token VARCHAR;",
        "ALTER TABLE users ADD COLUMN preferred_currency VARCHAR;",
        "ALTER TABLE transactions ADD COLUMN currency VARCHAR;",
        "ALTER TABLE transactions ADD COLUMN original_amount FLOAT;"
    ]
    
    from sqlalchemy import text
    for query in auto_migrations:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(query))
        except Exception:
            pass
