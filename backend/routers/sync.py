from fastapi import APIRouter
from models.action import SyncRequest
from services.sync_service import process_sync

router = APIRouter()

@router.post("/")
def sync_data(request: SyncRequest):
    return process_sync(request.user_id, request.actions)