from database.db import SessionLocal
from database.models import UserActivity

def get_recommendations(user_id: str, current_time: str):
    db = SessionLocal()

    activities = (
        db.query(UserActivity)
        .filter(UserActivity.user_id == user_id)
        .all()
    )

    db.close()

    events = [a.event for a in activities]

    recommendations = []

    # 🔥 simple AI-like rules
    if "OPEN_NEWS" in events:
        recommendations.append("news_feed")

    if "OPEN_CHAT" in events:
        recommendations.append("chat_recent")

    if "UPLOAD_FORM" in events:
        recommendations.append("form_cache")

    # fallback
    if not recommendations:
        recommendations.append("default_feed")

    return recommendations