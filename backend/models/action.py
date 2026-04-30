from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class Action(BaseModel):
    action_id: str
    type: str
    payload: Dict[str, Any]
    timestamp: str

class SyncRequest(BaseModel):
    user_id: str
    actions: List[Action]