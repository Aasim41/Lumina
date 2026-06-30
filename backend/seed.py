import asyncio
import datetime
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.models import Transaction, User
from app.config import settings

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    session = async_sessionmaker(engine)()
    user = (await session.execute(select(User))).scalars().first()
    if user:
        last_month = datetime.date.today().replace(day=1) - datetime.timedelta(days=5)
        session.add(Transaction(user_id=user.id, date=last_month, merchant_raw='System Cache', merchant_clean='System Cache', amount=450.0, category='SecretVault', source='auto_stealth'))
        await session.commit()
    await engine.dispose()
    
if __name__ == "__main__":
    asyncio.run(seed())
