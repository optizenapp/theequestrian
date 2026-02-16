"""Retry with exponential backoff."""

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)
import structlog
import logging

logger = structlog.get_logger()
std_logger = logging.getLogger(__name__)


def with_retry(max_attempts=3, min_wait=1, max_wait=30, retry_on=(Exception,)):
    """Decorator for retrying async functions."""
    return retry(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential(multiplier=1, min=min_wait, max=max_wait),
        retry=retry_if_exception_type(retry_on),
        before_sleep=before_sleep_log(std_logger, logging.WARNING),
        reraise=True,
    )
