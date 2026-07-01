import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_oAT5DBCW1uJa@ep-dark-bread-aowufw00.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        try:
            result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"))
            tables = [row[0] for row in result.fetchall()]
            print(f"Tables in public schema: {tables}")
        except Exception as e:
            print(f"Error: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
