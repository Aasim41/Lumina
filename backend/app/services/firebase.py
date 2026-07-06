import os
import firebase_admin
from firebase_admin import credentials, messaging
from pathlib import Path

# Initialize Firebase on module load
try:
    cred_path = Path(__file__).parent.parent.parent / "firebase-adminsdk.json"
    if cred_path.exists():
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    else:
        print("Warning: firebase-adminsdk.json not found. Push notifications will be disabled.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")

def send_push_notification(fcm_token: str, title: str, body: str):
    if not firebase_admin._apps:
        print("Firebase not initialized. Cannot send notification.")
        return False
    
    if not fcm_token:
        print("No FCM token provided.")
        return False
        
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=fcm_token,
        )
        response = messaging.send(message)
        print('Successfully sent message:', response)
        return True
    except Exception as e:
        print('Error sending message:', e)
        return False
