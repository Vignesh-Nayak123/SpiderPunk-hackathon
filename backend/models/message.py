from sqlalchemy import Column, String, Text, DateTime, Boolean
from datetime import datetime, timezone
from database.db import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    chat_id = Column(String)

    content = Column(Text)

    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.now(timezone.utc))

    is_deleted = Column(Boolean, default=False)