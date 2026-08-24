"""
backend/core/gemini.py
----------------------
Robust Gemini Client Helper with Automatic Multi-Key Failover.

Supports fallback across 4+ configured Gemini API keys:
GEMINI_API_KEY (Key 1), GEMINI_API_KEY_2 (Key 2), GEMINI_API_KEY_3 (Key 3), GEMINI_API_KEY_4 (Key 4).
If Key 1 fails (e.g. 429 Rate Limit / Quota Exceeded, 401/403 Invalid Key, 500/503 Error),
it automatically falls back to Key 2, Key 3, and Key 4 in sequence.
"""

import os
import logging
from typing import List, Optional, Tuple, Any
from core.config import settings

log = logging.getLogger("core.gemini")


def get_gemini_api_keys() -> List[str]:
    """Return ordered list of non-empty configured Gemini API keys (Key 1, Key 2, Key 3, Key 4, ...)."""
    keys = []
    candidates = [
        getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", ""),
        getattr(settings, "GEMINI_API_KEY_2", "") or os.getenv("GEMINI_API_KEY_2", ""),
        getattr(settings, "GEMINI_API_KEY_3", "") or os.getenv("GEMINI_API_KEY_3", ""),
        getattr(settings, "GEMINI_API_KEY_4", "") or os.getenv("GEMINI_API_KEY_4", ""),
    ]
    
    # Collect any extra GEMINI_API_KEY_N from os.environ
    for env_k, env_v in os.environ.items():
        if env_k.startswith("GEMINI_API_KEY") and env_v and env_v.strip():
            if env_v.strip() not in [c.strip() for c in candidates if c]:
                candidates.append(env_v)

    for key_str in candidates:
        cleaned = (key_str or "").strip()
        if cleaned and cleaned not in keys:
            keys.append(cleaned)

    return keys


def get_gemini_client(api_key: Optional[str] = None):
    """
    Instantiate a google.genai or google.generativeai Client.
    If api_key is None, uses Primary Key 1 or first available key.
    """
    all_keys = get_gemini_api_keys()
    key = api_key or (all_keys[0] if all_keys else "")
    if not key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=key)
    except Exception:
        try:
            import google.generativeai as genai_legacy
            genai_legacy.configure(api_key=key)
            return genai_legacy
        except Exception as e:
            log.warning("Could not initialize Gemini SDK for key ...%s: %s", key[-6:], e)
            return None


def generate_content_with_fallback(
    prompt: Any = None,
    model: Optional[str] = None,
    config: Optional[Any] = None,
    contents: Optional[Any] = None
) -> Tuple[Any, str]:
    """
    Executes a generate_content call against Gemini.
    First attempts using GEMINI_API_KEY (Key 1).
    If Key 1 fails (429 Quota / Rate Limit, 401/403 Auth Error, Server Error),
    it automatically retries using Key 2, Key 3, and Key 4 in order.

    Returns: (response, used_api_key)
    """
    model_name = model or settings.GEMINI_MODEL
    keys = get_gemini_api_keys()

    if not keys:
        raise RuntimeError("No GEMINI_API_KEY configured in .env")

    last_error = None
    input_content = contents if contents is not None else prompt

    for idx, key in enumerate(keys):
        client = get_gemini_client(key)
        if not client:
            continue
        try:
            # Modern google.genai client
            if hasattr(client, "models") and hasattr(client.models, "generate_content"):
                kwargs = {"model": model_name, "contents": input_content}
                if config is not None:
                    kwargs["config"] = config
                
                response = client.models.generate_content(**kwargs)
                if idx > 0:
                    log.info("Gemini API call succeeded using Fallback Key %d (...%s)", idx + 1, key[-6:])
                return response, key

            # Legacy google.generativeai client
            elif hasattr(client, "GenerativeModel"):
                gmodel = client.GenerativeModel(model_name)
                response = gmodel.generate_content(input_content)
                if idx > 0:
                    log.info("Gemini API call succeeded using Fallback Key %d (...%s)", idx + 1, key[-6:])
                return response, key

        except Exception as e:
            last_error = e
            key_label = f"Key {idx + 1}"
            log.warning("Gemini API %s (...%s) failed: %s. Attempting next fallback key...", key_label, key[-6:], e)

    raise RuntimeError(f"All {len(keys)} configured Gemini API keys failed. Last error: {last_error}")
