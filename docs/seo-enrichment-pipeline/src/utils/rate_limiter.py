"""Rate limiting for API calls."""

import asyncio
import time
from collections import deque
from dataclasses import dataclass, field


@dataclass
class RateLimiter:
    """Token bucket rate limiter."""
    max_calls: int
    period_seconds: float
    _calls: deque = field(default_factory=deque, init=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, init=False)

    async def acquire(self):
        """Wait until a call is allowed."""
        async with self._lock:
            now = time.monotonic()

            # Remove expired timestamps
            while self._calls and self._calls[0] <= now - self.period_seconds:
                self._calls.popleft()

            if len(self._calls) >= self.max_calls:
                sleep_time = self._calls[0] + self.period_seconds - now
                await asyncio.sleep(sleep_time)
                # Clean up again after sleeping
                now = time.monotonic()
                while self._calls and self._calls[0] <= now - self.period_seconds:
                    self._calls.popleft()

            self._calls.append(time.monotonic())


# Pre-configured limiters
gsc_limiter = RateLimiter(max_calls=10, period_seconds=1.0)     # GSC: ~1200/min
ga4_limiter = RateLimiter(max_calls=5, period_seconds=1.0)      # GA4: conservative
claude_limiter = RateLimiter(max_calls=3, period_seconds=1.0)   # Claude: manage costs
serp_limiter = RateLimiter(max_calls=1, period_seconds=2.0)     # SERP crawl: be polite
