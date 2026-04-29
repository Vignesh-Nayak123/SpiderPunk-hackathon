from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DeltaRequest(BaseModel):
    user_id: str
    last_synced_at: Optional[datetime] = None