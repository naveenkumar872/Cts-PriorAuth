import asyncio
import sys

# asyncmy + SSL requires SelectorEventLoop on Windows (default ProactorEventLoop
# doesn't support SSL sockets via IOCP correctly).
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI

app = FastAPI(
    title="Prior Authorization Triage & Policy Companion",
    description="Backend API for prior authorization triage, AI-assisted review, and policy companion.",
    version="0.1.0",
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Returns service health status."""
    return {"status": "ok"}
