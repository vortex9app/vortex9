from __future__ import annotations

import json
import random
import re
import sqlite3
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .config import (
    ACADEMY_LANDING,
    ARCHIVE_DIR,
    CAPTION_LIMIT,
    DB_PATH,
    HASHTAGS_PATH,
    QUEUE_DIR,
    VIDEO_EXTENSIONS,
    ensure_dirs,
)


@dataclass
class ContentItem:
    video_path: Path
    caption_body: str
    hashtags: list[str]
    title: str = ""
    manifest_path: Path | None = None
    extra: dict = field(default_factory=dict)

    @property
    def formatted_caption(self) -> str:
        tags = " ".join(dict.fromkeys(self.hashtags))
        parts = [self.caption_body.strip()]
        if tags:
            parts.append(tags)
        caption = "\n\n".join(part for part in parts if part)
        if "mystic9.net/academy" not in caption.lower():
            source = str(self.extra.get("platform") or "tiktok")
            landing = (
                f"{ACADEMY_LANDING}?utm_source={source}&utm_medium=social"
                "&utm_campaign=mystic9_agent&utm_content=foundations"
            )
            caption = f"{caption}\n\nFree Foundations of Frequency (register to unlock):\n{landing}"
        if len(caption) <= CAPTION_LIMIT:
            return caption
        return caption[: CAPTION_LIMIT - 1].rsplit(" ", 1)[0]


def _connect() -> sqlite3.Connection:
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY,
            video_path TEXT UNIQUE,
            caption TEXT,
            hashtags TEXT,
            status TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
    )
    return conn


def load_hashtag_banks() -> dict:
    if not HASHTAGS_PATH.exists():
        return {"core": ["#mystic9"], "banks": {}, "cta": ["mystic9.net"]}
    return json.loads(HASHTAGS_PATH.read_text(encoding="utf-8"))


def pick_hashtags(banks: dict, requested: list[str] | None = None, extra: list[str] | None = None) -> list[str]:
    tags: list[str] = list(banks.get("core") or [])
    catalog = banks.get("banks") or {}
    names = requested or list(catalog.keys())
    for name in names:
        pool = catalog.get(name) or []
        if not pool:
            continue
        sample_size = min(len(pool), random.randint(2, min(4, len(pool))))
        tags.extend(random.sample(pool, sample_size))
    tags.extend(extra or [])
    cleaned = []
    for tag in tags:
        item = tag.strip()
        if not item:
            continue
        if not item.startswith("#"):
            item = "#" + item.lstrip("#")
        cleaned.append(item)
    return list(dict.fromkeys(cleaned))


def _sidecar_for(video: Path) -> Path | None:
    for suffix in (".json", ".caption.json", ".txt", ".caption.txt", ".md"):
        candidate = video.with_suffix(suffix)
        if candidate.exists():
            return candidate
    stem_json = video.with_name(video.stem + ".manifest.json")
    if stem_json.exists():
        return stem_json
    return None


def _read_sidecar(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        data = json.loads(text)
        return data if isinstance(data, dict) else {"caption": text}
    return {"caption": text.strip()}


def _caption_from_filename(video: Path, banks: dict) -> str:
    words = re.sub(r"[_-]+", " ", video.stem).strip()
    cta = random.choice(banks.get("cta") or ["mystic9.net"])
    return f"{words}\n\n{cta}"


def discover_videos() -> list[Path]:
    ensure_dirs()
    videos = [
        path
        for path in QUEUE_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS
    ]
    return sorted(videos, key=lambda item: item.stat().st_mtime, reverse=True)


def load_item(video_path: Path) -> ContentItem:
    banks = load_hashtag_banks()
    sidecar = _sidecar_for(video_path)
    payload: dict = {}
    if sidecar:
        payload = _read_sidecar(sidecar)
    caption = str(payload.get("caption") or payload.get("caption_body") or "").strip()
    if not caption:
        caption = _caption_from_filename(video_path, banks)
    requested = payload.get("banks") or payload.get("hashtag_banks")
    extra = payload.get("extra_hashtags") or payload.get("hashtags") or []
    if isinstance(extra, str):
        extra = extra.split()
    hashtags = pick_hashtags(banks, requested, list(extra))
    return ContentItem(
        video_path=video_path,
        caption_body=caption,
        hashtags=hashtags,
        title=str(payload.get("title") or video_path.stem),
        manifest_path=sidecar,
        extra=payload,
    )


def load_manifest(path: Path) -> ContentItem:
    payload = _read_sidecar(path)
    video_name = payload.get("video") or path.with_suffix(".mp4").name
    video_path = Path(video_name)
    if not video_path.is_absolute():
        video_path = path.parent / video_name
    banks = load_hashtag_banks()
    caption = str(payload.get("caption") or payload.get("caption_body") or "").strip()
    if not caption:
        caption = _caption_from_filename(video_path, banks)
    requested = payload.get("banks") or payload.get("hashtag_banks")
    extra = payload.get("extra_hashtags") or payload.get("hashtags") or []
    if isinstance(extra, str):
        extra = extra.split()
    return ContentItem(
        video_path=video_path,
        caption_body=caption,
        hashtags=pick_hashtags(banks, requested, list(extra)),
        title=str(payload.get("title") or video_path.stem),
        manifest_path=path,
        extra=payload,
    )


def latest_item() -> ContentItem | None:
    videos = discover_videos()
    if not videos:
        return None
    return load_item(videos[0])


def copy_to_clipboard(text: str) -> bool:
    try:
        import pyperclip

        pyperclip.copy(text)
        return True
    except Exception as exc:
        print(f"Clipboard (pyperclip) unavailable: {exc}")
    try:
        import subprocess

        completed = subprocess.run(
            ["clip"],
            input=text.encode("utf-16-le"),
            check=False,
            shell=True,
        )
        return completed.returncode == 0
    except Exception:
        return False


def record_item(item: ContentItem, status: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    conn = _connect()
    conn.execute(
        """
        INSERT INTO items (video_path, caption, hashtags, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(video_path) DO UPDATE SET
            caption=excluded.caption,
            hashtags=excluded.hashtags,
            status=excluded.status,
            updated_at=excluded.updated_at
        """,
        (
            str(item.video_path),
            item.formatted_caption,
            " ".join(item.hashtags),
            status,
            now,
            now,
        ),
    )
    conn.commit()
    conn.close()


def archive_item(item: ContentItem) -> Path:
    ensure_dirs()
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target_dir = ARCHIVE_DIR / stamp
    target_dir.mkdir(parents=True, exist_ok=True)
    dest = target_dir / item.video_path.name
    shutil.copy2(item.video_path, dest)
    (target_dir / "caption.txt").write_text(item.formatted_caption, encoding="utf-8")
    record_item(item, "archived")
    return dest
