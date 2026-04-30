from database.db import SessionLocal
from database.models import UserActivity
from services.predictor_engine import ai_engine
import datetime

def get_recommendations(user_id: str, current_time: str):
    db = SessionLocal()

    activities = (
        db.query(UserActivity)
        .filter(UserActivity.user_id == user_id)
        .all()
    )

    db.close()

    # Feed past activities into the AI engine if it's empty
    if len(ai_engine.raw_logs) == 0 and len(activities) > 0:
        logs = []
        for a in activities:
            # We would parse a.timestamp to hour and dayOfWeek here
            # But for simplicity, we mock day=0 if not present
            hour = a.timestamp.hour if hasattr(a.timestamp, 'hour') else 10
            day = a.timestamp.weekday() if hasattr(a.timestamp, 'weekday') else 0
            logs.append({'screen': a.event, 'hour': hour, 'dayOfWeek': day})
        ai_engine.ingest_logs(logs)

    # Use current time to get predictions
    try:
        dt = datetime.datetime.fromisoformat(current_time.replace('Z', '+00:00'))
        current_hour = dt.hour
        current_day = dt.weekday()
    except Exception:
        current_hour = datetime.datetime.now().hour
        current_day = datetime.datetime.now().weekday()

    predictions = ai_engine.predict(current_hour, current_day)
    return ai_engine.get_content_to_prefetch(predictions)