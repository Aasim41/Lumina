import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_oAT5DBCW1uJa@ep-dark-bread-aowufw00.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN dob DATE;"))
            print("Successfully added dob column.")
        except Exception as e:
            print(f"Error (might already exist): {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
