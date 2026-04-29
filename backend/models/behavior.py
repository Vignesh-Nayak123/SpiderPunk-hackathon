from pydantic import BaseModel

class BehaviorLog(BaseModel):
    user_id: str
    event: str