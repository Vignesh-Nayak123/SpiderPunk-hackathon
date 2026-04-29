from fastapi import FastAPI
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

app = FastAPI(title="Offline layer backend",)

app.include_router(sync.router,prefix="/sync",tags=["Sync"])
app.include_router(delta.router, prefix="/delta", tags=["Delta"])
app.include_router(prefetch.router,prefix="/prefetch",tags=["Prefetch"])
app.include_router(behavior.router,prefix="/behavior",tags=["Behavior"])

@app.get("/")
def root():
    return {"message":"Offline layer backend is working"}

@app.on_event("startup")
def on_startup():
    from database.db import engine
    from database.models import Base
    Base.metadata.create_all(bind=engine)