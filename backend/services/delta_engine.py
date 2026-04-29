from database.db import SessionLocal
from database.models import Message
from datetime import timezone

def get_delta(user_id: str, last_synced_at):
    db = SessionLocal()
    created = []
    deleted = []
    updated = []
    # Get new or updated messages
    messages = (
        db.query(Message)
        .filter(Message.user_id == user_id)
        .filter(Message.updated_at > last_synced_at)
        .all()
    )

    for msg in messages:
        created_at = msg.created_at
        updated_at = msg.updated_at

        # 🔥 Normalize DB timestamps
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)

        # 🔥 Normalize request timestamp
        if last_synced_at.tzinfo is None:
            last_synced_at = last_synced_at.replace(tzinfo=timezone.utc)

        data = {
            "id": msg.id,
            "chat_id": msg.chat_id,
            "content": msg.content,
            "updated_at": updated_at
        }

        if msg.is_deleted:
            deleted.append({"id": msg.id})
        elif created_at > last_synced_at:
            created.append(data)
        else:
            updated.append(data)
    db.close()

    return {
        "created": created,
        "updated": updated,
        "deleted": deleted
    }