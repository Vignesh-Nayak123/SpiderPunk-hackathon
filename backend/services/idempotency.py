from database.models import ProcessedAction
from database.db import SessionLocal

def is_processed(action_id:str):
    db = SessionLocal()
    exists = db.query(ProcessedAction).filter_by(action_id=action_id).first()
    db.close()
    return exists is not None

def mark_processed(action_id:str,user_id:str):
    db = SessionLocal()
    db.add(ProcessedAction(action_id=action_id,user_id=user_id))
    db.commit()
    db.close()
