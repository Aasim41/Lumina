from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import auth, upload, transactions, analytics, forecast, users, subscriptions, roast, mystery
from app.services.categorizer import load_model

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    load_model()
    yield

app = FastAPI(title="Smart Expense API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(forecast.router)
app.include_router(users.router)
app.include_router(subscriptions.router)
app.include_router(roast.router)
app.include_router(mystery.router)

@app.get("/")
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
