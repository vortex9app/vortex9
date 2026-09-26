from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT_ROOT = ROOT / "content"
CONTENT_DIR = CONTENT_ROOT / "tiktok"
QUEUE_DIR = CONTENT_DIR / "queue"
ARCHIVE_DIR = CONTENT_DIR / "archive"
HASHTAGS_PATH = CONTENT_DIR / "hashtags.json"
DB_PATH = CONTENT_DIR / "pipeline.db"
RESEARCH_SOURCES_PATH = CONTENT_ROOT / "research_sources.json"
RESEARCH_IDEAS_PATH = CONTENT_ROOT / "research_ideas.json"
ANALYTICS_CSV_PATH = CONTENT_ROOT / "analytics_tracker.csv"
ACADEMY_CONVERSIONS_PATH = CONTENT_ROOT / "academy_conversions.csv"
ACADEMY_LANDING = os.environ.get(
    "MYSTIC9_ACADEMY_LANDING",
    "https://mystic9.net/academy/foundations",
)
BACKUPS_DIR = ROOT / "backups"

PROFILE_DIR = Path(
    os.environ.get(
        "MYSTIC9_TIKTOK_PROFILE",
        Path(os.environ.get("LOCALAPPDATA", Path.home())) / "mystic9-tiktok-agent" / "profile",
    )
)

UPLOAD_URL = os.environ.get(
    "MYSTIC9_TIKTOK_UPLOAD_URL",
    "https://www.tiktok.com/tiktokstudio/upload",
)
FACEBOOK_REELS_URL = os.environ.get(
    "MYSTIC9_FACEBOOK_UPLOAD_URL",
    "https://www.facebook.com/reels/create",
)
CDP_ENDPOINT = os.environ.get("MYSTIC9_CDP_ENDPOINT", "http://127.0.0.1:9222")

VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}
CAPTION_LIMIT = 2200
DEFAULT_LOCALE = "en-GB"
DEFAULT_TIMEZONE = "Europe/London"
DEFAULT_VIEWPORT = {"width": 1366, "height": 768}


def ensure_dirs() -> None:
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    CONTENT_ROOT.mkdir(parents=True, exist_ok=True)
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
