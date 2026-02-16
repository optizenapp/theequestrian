"""Async Postgres connection pool using psycopg3."""

import asyncio
from contextlib import asynccontextmanager
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
import structlog

from src.config.settings import settings

logger = structlog.get_logger()

_pool: AsyncConnectionPool | None = None


async def init_pool() -> AsyncConnectionPool:
    """Initialize the connection pool."""
    global _pool
    if _pool is None:
        _pool = AsyncConnectionPool(
            conninfo=settings.database_url,
            min_size=settings.database_pool_min,
            max_size=settings.database_pool_max,
            kwargs={"row_factory": dict_row},
        )
        await _pool.open()
        logger.info("Database pool initialized", min=settings.database_pool_min, max=settings.database_pool_max)
    return _pool


async def close_pool():
    """Close the connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed")


@asynccontextmanager
async def get_conn():
    """Get a connection from the pool."""
    pool = await init_pool()
    async with pool.connection() as conn:
        yield conn


@asynccontextmanager
async def get_cursor():
    """Get a cursor from the pool."""
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            yield cur
