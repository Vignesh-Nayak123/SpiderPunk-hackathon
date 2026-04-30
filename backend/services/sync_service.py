from database.db import SessionLocal
from database.models import Message
from services.conflict_resolver import resolve
from services.idempotency import is_processed, mark_processed
from datetime import datetime, timezone
import uuid
import json

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
                body = action.payload or {}
                if isinstance(body, str):
                    try:
                        body = json.loads(body)
                    except:
                        pass

                # ---------------- SEND_MESSAGE ----------------
                if action.type == "SEND_MESSAGE":
                    msg = Message(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        chat_id=body.get("chat_id", "default_chat"),
                        content=body.get("message", ""),
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    db.add(msg)

                # ---------------- UPDATE_MESSAGE ----------------
                elif action.type == "UPDATE_MESSAGE":
                    msg = db.query(Message).filter_by(
                        id=body.get("message_id")
                    ).first()

                    if msg and not msg.is_deleted:
                        try:
                            action_time = datetime.fromisoformat(action.timestamp.replace('Z', '+00:00'))
                        except:
                            action_time = datetime.now(timezone.utc)
                        decision = resolve(
                            {"timestamp": action_time},
                            msg
                        )

                        if decision == "client":
                            msg.content = body.get("new_content", "")
                            msg.updated_at = datetime.now(timezone.utc)

                # ---------------- DELETE_MESSAGE ----------------
                elif action.type == "DELETE_MESSAGE":
                    msg = db.query(Message).filter_by(
                        id=body.get("message_id")
                    ).first()

                    if msg:
                        try:
                            action_time = datetime.fromisoformat(action.timestamp.replace('Z', '+00:00'))
                        except:
                            action_time = datetime.now(timezone.utc)
                        decision = resolve(
                            {"timestamp": action_time},
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
                failed.append({"id": action.action_id, "reason": str(e)})

        db.commit()

    finally:
        db.close()

    return {
        "status": "success",
        "processed": processed,
        "failed": failed
    }