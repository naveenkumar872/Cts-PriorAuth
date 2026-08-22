import ssl
import sys
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.core.config import settings

# ---------------------------------------------------------------------------
# SSL context — TiDB Cloud (serverless) requires TLS on all connections.
# asyncmy accepts an ssl.SSLContext passed via connect_args.
# On Windows the SelectorEventLoop policy must be set before any async calls
# (done in main.py and alembic/env.py).
# ---------------------------------------------------------------------------
_ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE   # TiDB Cloud's CA is trusted; flip to
                                        # CERT_REQUIRED + load_verify_locations
                                        # if you want strict cert validation.

# ---------------------------------------------------------------------------
# Async engine
# pool_pre_ping=True — tests the connection before handing it out from the pool,
# which gracefully handles stale connections after MySQL's wait_timeout.
# ---------------------------------------------------------------------------
_db_url = settings.DATABASE_URL
try:
    import asyncmy  # noqa: F401
except ImportError:
    if _db_url.startswith("mysql+asyncmy://"):
        _db_url = _db_url.replace("mysql+asyncmy://", "mysql+aiomysql://", 1)

engine = create_async_engine(
    _db_url,
    echo=False,
    pool_pre_ping=True,
    connect_args={"ssl": _ssl_ctx},
)

# ---------------------------------------------------------------------------
# Session factory
# expire_on_commit=False — prevents lazy-load errors after commit in async code.
# ---------------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# FastAPI dependency — yields a session per request, auto-closes on exit.
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a database session for use as a FastAPI dependency.

    Usage:
        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        yield session
