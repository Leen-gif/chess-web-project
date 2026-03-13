from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

# Load local backend settings for development and server deployment.
load_dotenv(ENV_FILE)


def get_stockfish_path() -> str | None:
    value = os.getenv("STOCKFISH_PATH", "").strip()
    return value or None
