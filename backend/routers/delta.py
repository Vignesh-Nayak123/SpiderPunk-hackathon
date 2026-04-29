from fastapi import APIRouter
from models.delta import DeltaRequest
from services.delta_engine import get_delta
from datetime import datetime,timezone

router = APIRouter()

@router.post("/")
def fetch_delta(request: DeltaRequest):

    last_sync = request.last_synced_at or datetime(1970, 1, 1)

    # # make it naive UTC
    # if last_sync.tzinfo is not None:
    #     last_sync = last_sync.replace(tzinfo=None)
    last_sync = request.last_synced_at or datetime(1970, 1, 1, tzinfo=timezone.utc)
    delta = get_delta(request.user_id, last_sync)


    return {
        **delta,
        "server_time": datetime.now(timezone.utc)
    }