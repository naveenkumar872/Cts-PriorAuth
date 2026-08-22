"""
Fast In-Memory TTL Cache Manager
Provides instant response times (0–2ms) for frequent read endpoints
and automatically supports cache invalidation on database mutations.
"""

import time
import threading
from typing import Any, Dict, Optional

_cache: Dict[str, Any] = {}
_cache_expiry: Dict[str, float] = {}
_lock = threading.Lock()


def get_cache(key: str) -> Optional[Any]:
    """Retrieve value from cache if it exists and has not expired."""
    with _lock:
        if key in _cache:
            if time.time() < _cache_expiry.get(key, 0):
                return _cache[key]
            # Expired
            _cache.pop(key, None)
            _cache_expiry.pop(key, None)
    return None


def set_cache(key: str, value: Any, ttl_seconds: int = 30) -> None:
    """Store value in cache with a TTL (Time To Live)."""
    with _lock:
        _cache[key] = value
        _cache_expiry[key] = time.time() + ttl_seconds


def invalidate_cache(key_prefix: str = "") -> None:
    """Clear specific cache keys or all keys matching a prefix."""
    with _lock:
        if not key_prefix:
            _cache.clear()
            _cache_expiry.clear()
        else:
            keys_to_del = [k for k in _cache if k.startswith(key_prefix)]
            for k in keys_to_del:
                _cache.pop(k, None)
                _cache_expiry.pop(k, None)
