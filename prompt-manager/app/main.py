from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import templates_router, skills_router, usage_router, categories_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (Alembic is preferred for production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Prompt & Skills Manager", version="0.7.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(templates_router)
app.include_router(skills_router)
app.include_router(usage_router)
app.include_router(categories_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "prompt-skills-manager", "version": "0.7.0"}
