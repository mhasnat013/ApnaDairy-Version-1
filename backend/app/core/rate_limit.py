"""Lightweight in-memory sliding-window rate limiter for abuse-prone endpoints.

No external dependency: keeps a per (client IP, path) list of recent hit
timestamps and rejects callers that exceed `limit` hits per `window` seconds
with HTTP 429. Intended for login/register style endpoints, not as a
replacement for edge rate limiting in production.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, Request

_hits: dict[tuple[str, str], list[float]] = defaultdict(list)


def limiter(limit: int = 30, window_seconds: int = 60):
    """Dependency factory: `dependencies=[Depends(limiter(30, 60))]`."""

    def _check(request: Request) -> None:
        client = request.client.host if request.client else "unknown"
        key = (client, request.url.path)
        now = time.monotonic()
        hits = _hits[key]
        cutoff = now - window_seconds
        while hits and hits[0] <= cutoff:
            hits.pop(0)
        if len(hits) >= limit:
            raise HTTPException(
                status_code=429,
                detail="Too many attempts. Please wait a minute and try again.",
            )
        hits.append(now)

    return _check
