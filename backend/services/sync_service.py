from database.db import SessionLocal
from database.models import Message
from services.conflict_resolver import resolve
from services.idempotency import is_processed, mark_processed
from datetime import datetime, timezone
import uuid


def process_sync(user_id, actions):

    db = SessionLocal()
    processed = []
    failed = []

    try:
        for action in sorted(actions, key=lambda x: x.timestamp):

            # 🔁 idempotency check
            if is_processed(action.action_id):
                continue

            try:

                # ---------------- SEND ----------------
                if action.type == "SEND_MESSAGE":
                    msg = Message(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        chat_id=action.payload["chat_id"],
                        content=action.payload["message"],
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    db.add(msg)

                # ---------------- UPDATE ----------------
                elif action.type == "UPDATE_MESSAGE":
                    msg = db.query(Message).filter_by(
                        id=action.payload["message_id"]
                    ).first()

                    if msg and not msg.is_deleted:
                        decision = resolve(
                            {"timestamp": action.timestamp},
                            msg
                        )

                        if decision == "client":
                            msg.content = action.payload["new_content"]
                            msg.updated_at = datetime.now(timezone.utc)

                # ---------------- DELETE ----------------
                elif action.type == "DELETE_MESSAGE":
                    msg = db.query(Message).filter_by(
                        id=action.payload["message_id"]
                    ).first()

                    if msg:
                        decision = resolve(
                            {"timestamp": action.timestamp},
                            msg
                        )

                        if decision == "client":
                            msg.is_deleted = True
                            msg.updated_at = datetime.now(timezone.utc)

                # mark done
                mark_processed(action.action_id, user_id)
                processed.append(action.action_id)

            except Exception as e:
                print("SYNC ERROR:", e)
                failed.append(action.action_id)

        db.commit()

    finally:
        db.close()

    return {
        "status": "success",
        "processed": processed,
        "failed": failed
    }