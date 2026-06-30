from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User
import uuid

async def get_current_user(db: AsyncSession = Depends(get_db)) -> User:
    email = "local@smart-expense.app"
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if user is None:
        user = User(
            id=uuid.uuid4(),
            email=email,
            name="Local User",
            google_id="local-123"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    return user
