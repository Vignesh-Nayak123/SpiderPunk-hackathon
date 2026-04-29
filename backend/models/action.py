from pydantic import BaseModel
from datetime import datetime
from typing import List

class Action(BaseModel):
    action_id:str
    type:str
    payload:dict
    timestamp:datetime

class SyncRequest(BaseModel):
    user_id:str
    actions:List[Action]