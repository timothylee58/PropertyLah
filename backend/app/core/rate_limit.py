"""Minimal in-memory rate limiting.

Fixed-window counter per (client IP, bucket). Good enough to blunt scraping
and retry storms on a single backend instance; it resets on process restart
and does not coordinate across instances — swap for a shared store (Redis,
etc.) before running more than one instance behind a load balancer.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, Request

from app.config import settings

WINDOW_SECONDS = 60

# bucket -> client_ip -> (window_start_epoch, count)
_counters: dict[str, dict[str, tuple[float, int]]] = defaultdict(dict)


def _client_key(request: Request) -> str:
    # behind a reverse proxy, X-Forwarded-For is the real client; fall back to
    # the socket peer for local/dev runs where nothing sets that header
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check(bucket: str, key: str, limit_per_minute: int) -> None:
    now = time.monotonic()
    window = _counters[bucket]
    window_start, count = window.get(key, (now, 0))

    if now - window_start >= WINDOW_SECONDS:
        window_start, count = now, 0

    count += 1
    window[key] = (window_start, count)

    if count > limit_per_minute:
        raise HTTPException(status_code=429, detail="too many requests, slow down")


def enforce(bucket: str, limit_per_minute: int):
    """FastAPI dependency factory: raises 429 past `limit_per_minute` req/min."""

    def _dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        _check(bucket, _client_key(request), limit_per_minute)

    return _dependency


def reset() -> None:
    """Test helper — clears all counters between test runs."""
    _counters.clear()
