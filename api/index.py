"""Vercel serverless entry point for the CryorApply FastAPI backend.

Vercel's Python runtime detects the module-level ``app`` ASGI application and
serves it. The backend source lives in ``Source/backend`` so it can still be run
locally with ``uvicorn app.main:app``; here we add that folder to ``sys.path`` and
re-export the same app, with no code duplication.
"""

import os
import sys

BACKEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "Source", "backend")
)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app  # noqa: E402  (path set above)

__all__ = ["app"]
