import asyncio
import sys
from logging.config import fileConfig

# asyncmy + SSL on Windows requires SelectorEventLoop (ProactorEventLoop
# doesn't support SSL sockets via IOCP correctly).
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import pool
from sqlalchemy.engine import Connection

from alembic import context

# ---------------------------------------------------------------------------
# Project imports
# ---------------------------------------------------------------------------
from backend.core.config import settings
from backend.core.database import engine  # reuse app engine — carries SSL connect_args
from backend.models import Base  # noqa: F401 — imports all models for autogenerate

# ---------------------------------------------------------------------------
# Alembic config
# ---------------------------------------------------------------------------
config = context.config

# Inject async DATABASE_URL from application settings (used by offline mode)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# Offline mode
# ---------------------------------------------------------------------------
def run_migrations_offline() -> None:
    """Generate SQL without a live DB connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online mode (async) — uses the app's engine so SSL connect_args are included.
# ---------------------------------------------------------------------------
def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        # compare_server_default causes "Can't locate timezone: UTC" on TiDB/MySQL
        # because MySQL returns CURRENT_TIMESTAMP with tz metadata Alembic can't parse.
        compare_server_default=False,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
