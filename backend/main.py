from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import sync,delta,prefetch,behavior
from database.db import engine
from database.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    Base.metadata.create_all(bind=engine)
    print("Database tables created")

    yield

    # Shutdown logic (optional)
    print("Shutting down...")

app = FastAPI(title="Offline layer backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sync.router,prefix="/sync",tags=["Sync"])
app.include_router(delta.router, prefix="/delta", tags=["Delta"])
app.include_router(prefetch.router,prefix="/prefetch",tags=["Prefetch"])
app.include_router(behavior.router,prefix="/behavior",tags=["Behavior"])

@app.get("/")
def root():
    return {"message":"Offline layer backend is working"}

from database.db import SessionLocal
from database.models import Message

from fastapi import Request

@app.get("/api/messages")
def get_messages(request: Request):
    db = SessionLocal()
    user_id = request.headers.get("x-user-id", "default_user")
    try:
        messages = db.query(Message).filter_by(is_deleted=False).order_by(Message.created_at).all()
        return {
            "success": True,
            "messages": [
                {
                    "id": msg.id,
                    "chat_id": msg.chat_id,
                    "text": msg.content,
                    "time": msg.created_at.strftime("%I:%M %p") if msg.created_at else "Unknown",
                    "isOwn": msg.user_id == user_id,
                    "status": "delivered"
                }
                for msg in messages
            ]
        }
    finally:
        db.close()

@app.get("/api/feed")
def get_feed():
    return {
        "success": True,
        "items": []
    }