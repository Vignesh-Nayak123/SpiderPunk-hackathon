from sqlalchemy import Column,String,DateTime,Text,Boolean
from datetime import datetime,timezone
from database.db import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True)
    user_id = Column(String)
    chat_id = Column(String)
    content = Column(Text)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    is_deleted = Column(Boolean, default=False)

class ProcessedAction(Base):
    __tablename__ = "processed_actions"

    action_id = Column(String, primary_key=True)
    user_id = Column(String)

class UserActivity(Base):
    __tablename__ = "user_activity"
    id = Column(String, primary_key=True)
    user_id = Column(String)
    event = Column(String)
    timestamp = Column(DateTime)