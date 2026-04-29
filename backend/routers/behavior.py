from fastapi import APIRouter
from datetime import datetime, timezone
import uuid

from database.db import SessionLocal
from database.models import UserActivity
from models.behavior import BehaviorLog

router = APIRouter()

@router.post("/")
def log_behavior(data: BehaviorLog):
    db = SessionLocal()

    try:
        activity = UserActivity(
            id=str(uuid.uuid4()),
            user_id=data.user_id,
            event=data.event,
            timestamp=datetime.now(timezone.utc)
        )

        db.add(activity)
        db.commit()

        return {"status": "logged"}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

    finally:
        db.close()