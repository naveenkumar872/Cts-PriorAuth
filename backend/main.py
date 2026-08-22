from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from sqlalchemy import text

from api.routes import auth, ai, policy, analytics, users, validation, documents, context, evaluation, explanation
from core.config import settings
from core.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify TiDB connection on startup — warn but don't crash if temporarily unreachable
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("TiDB connection verified successfully.")
    except Exception as exc:
        logger.warning(f"TiDB connection check failed at startup: {exc}")
        logger.warning("Server will start anyway — database calls will retry on first request.")

    logger.info("PriorAuth AI Backend started.")
    yield
    logger.info("PriorAuth AI Backend shutting down.")


app = FastAPI(
    title="PriorAuth AI API",
    description="AI-powered Prior Authorization Triage & Policy Companion — TiDB backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/api/v1/authorizations", tags=["Authorizations"])
app.include_router(ai.router,         prefix="/api/v1/ai",             tags=["AI Triage"])
app.include_router(policy.router,     prefix="/api/v1/policies",       tags=["Policy Companion"])
app.include_router(analytics.router,  prefix="/api/v1/analytics",      tags=["Analytics"])
app.include_router(users.router,      prefix="/api/v1/users",          tags=["Users"])
app.include_router(validation.router, prefix="/api/v1/validation",     tags=["Module 3 Validation"])
app.include_router(documents.router,  prefix="/api/v1/documents",      tags=["Documents"])
app.include_router(context.router,     prefix="/api/v1/context",      tags=["Module 4 Context Mapping"])
app.include_router(evaluation.router,  prefix="/api/v1/evaluation",   tags=["Rule-Based Evaluation"])
app.include_router(explanation.router, prefix="/api/v1/explanation",  tags=["Module 6A Policy Evidence & Explanation"])


@app.get("/", tags=["Health"])
async def root():
    return {"service": "PriorAuth AI API", "version": "1.0.0", "status": "healthy"}


@app.get("/health", tags=["Health"])
async def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as exc:
        db_status = f"error: {exc}"

    return JSONResponse(content={
        "status": "healthy" if db_status == "connected" else "degraded",
        "services": {
            "tidb": db_status,
            "gemini": "not_configured" if not settings.GEMINI_API_KEY else "configured",
            "chromadb": "not_configured",
        },
    })
