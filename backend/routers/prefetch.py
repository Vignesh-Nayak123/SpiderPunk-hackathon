from fastapi import APIRouter,Query
from services.predictor import get_recommendations

router = APIRouter()

@router.get("/")
def predict(user_id: str = Query(...),
    time: str = Query(...)):
    recommendations = get_recommendations(user_id, time)

    return {
        "content_ids": recommendations
    }