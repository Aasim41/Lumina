from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models import Subscription, User
from app.services.firebase import send_push_notification
from datetime import datetime, timedelta
import asyncio

scheduler = AsyncIOScheduler()

async def check_upcoming_subscriptions():
    """
    Checks for subscriptions billing tomorrow and sends a push notification.
    """
    print("Running check_upcoming_subscriptions job...")
    tomorrow = datetime.now() + timedelta(days=1)
    target_day = tomorrow.day

    async with AsyncSessionLocal() as session:
        # Get all subscriptions billing tomorrow
        result = await session.execute(select(Subscription).where(Subscription.billing_day == target_day))
        subscriptions = result.scalars().all()

        for sub in subscriptions:
            # Fetch the user to get their fcm_token
            user_result = await session.execute(select(User).where(User.id == sub.user_id))
            user = user_result.scalar_one_or_none()

            if user and user.fcm_token:
                title = "Upcoming Subscription"
                body = f"Heads up! Your {sub.merchant} subscription for ₹{sub.amount} is due tomorrow."
                
                try:
                    send_push_notification(user.fcm_token, title, body, data={"type": "subscription"})
                    print(f"Sent notification to {user.email} for {sub.merchant}")
                except Exception as e:
                    print(f"Failed to send push notification to {user.email}: {e}")

# Run every day at 9:00 AM
scheduler.add_job(check_upcoming_subscriptions, 'cron', hour=9, minute=0)

def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        print("Subscription scheduler started.")
