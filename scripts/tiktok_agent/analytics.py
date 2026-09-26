from __future__ import annotations

import csv
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import Page

from .config import ANALYTICS_CSV_PATH, ensure_dirs
from .human import pause, think_pause

TIKTOK_ANALYTICS_URLS = [
    "https://www.tiktok.com/tiktokstudio/analytics",
    "https://www.tiktok.com/analytics",
]
FACEBOOK_ANALYTICS_URLS = [
    "https://www.facebook.com/professional_dashboard",
    "https://professional.facebook.com/latest/insights",
    "https://www.facebook.com/insights",
]

CSV_FIELDS = [
    "captured_at",
    "platform",
    "followers",
    "views",
    "likes",
    "comments",
    "shares",
    "profile_views",
    "engagement",
    "dashboard_url",
    "notes",
]

LABEL_ALIASES = {
    "followers": ("followers", "follower", "fans"),
    "views": ("video views", "views", "watch time", "post reach", "reach"),
    "likes": ("likes", "reactions"),
    "comments": ("comments",),
    "shares": ("shares", "reposts"),
    "profile_views": ("profile views", "profile visits"),
    "engagement": ("engagement", "engagement rate"),
}

NUMBER_RE = re.compile(
    r"(?P<value>\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?P<suffix>[KMB])?",
    re.I,
)


def _parse_number(raw: str) -> str:
    text = raw.strip().replace("\u202f", "").replace(" ", "")
    match = NUMBER_RE.search(text)
    if not match:
        return ""
    value = match.group("value").replace(",", "")
    suffix = (match.group("suffix") or "").upper()
    try:
        number = float(value)
    except ValueError:
        return match.group("value")
    multiplier = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}.get(suffix, 1)
    scaled = int(number * multiplier) if multiplier > 1 else number
    if isinstance(scaled, float) and scaled.is_integer():
        scaled = int(scaled)
    return str(scaled)


def extract_metrics(text: str) -> dict[str, str]:
    lowered = text.lower()
    metrics = {key: "" for key in LABEL_ALIASES}
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        haystack = line.lower()
        for field, aliases in LABEL_ALIASES.items():
            if metrics[field]:
                continue
            if not any(alias in haystack for alias in aliases):
                continue
            candidate = _parse_number(line)
            if not candidate and index + 1 < len(lines):
                candidate = _parse_number(lines[index + 1])
            if not candidate and index > 0:
                candidate = _parse_number(lines[index - 1])
            if candidate:
                metrics[field] = candidate
    if not any(metrics.values()):
        compact = lowered.replace("\n", " ")
        for field, aliases in LABEL_ALIASES.items():
            for alias in aliases:
                pattern = re.compile(rf"{re.escape(alias)}\D{{0,12}}(\d[\d,.]*(?:\s*[KMB])?)", re.I)
                found = pattern.search(compact)
                if found:
                    metrics[field] = _parse_number(found.group(1))
                    break
    return metrics


def _looks_like_login(page: Page) -> bool:
    url = page.url.lower()
    return any(token in url for token in ("login", "signup", "/signin"))


def _open_first(page: Page, urls: list[str], label: str) -> str:
    last_error = "no urls"
    for url in urls:
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            pause(1.4, 2.4)
            if _looks_like_login(page):
                last_error = "login wall"
                continue
            return page.url
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
    raise RuntimeError(f"Could not open {label} analytics ({last_error}).")


def _row_for(platform: str, page: Page) -> dict[str, str]:
    think_pause()
    body = ""
    try:
        body = page.inner_text("body", timeout=15000)
    except Exception:
        body = page.content()
    metrics = extract_metrics(body)
    notes = []
    if _looks_like_login(page):
        notes.append("login-required")
    if not any(metrics.values()):
        notes.append("no-labeled-metrics-found")
    return {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "platform": platform,
        "followers": metrics.get("followers", ""),
        "views": metrics.get("views", ""),
        "likes": metrics.get("likes", ""),
        "comments": metrics.get("comments", ""),
        "shares": metrics.get("shares", ""),
        "profile_views": metrics.get("profile_views", ""),
        "engagement": metrics.get("engagement", ""),
        "dashboard_url": page.url,
        "notes": ";".join(notes),
    }


def append_rows(path: Path, rows: list[dict[str, str]]) -> None:
    ensure_dirs()
    path.parent.mkdir(parents=True, exist_ok=True)
    new_file = not path.exists()
    with path.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        if new_file:
            writer.writeheader()
        for row in rows:
            writer.writerow(row)


def collect_analytics(page: Page) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    try:
        _open_first(page, TIKTOK_ANALYTICS_URLS, "TikTok")
        rows.append(_row_for("tiktok", page))
        print("Captured TikTok analytics snapshot.")
    except Exception as exc:  # noqa: BLE001
        rows.append(
            {
                "captured_at": datetime.now(timezone.utc).isoformat(),
                "platform": "tiktok",
                "followers": "",
                "views": "",
                "likes": "",
                "comments": "",
                "shares": "",
                "profile_views": "",
                "engagement": "",
                "dashboard_url": "",
                "notes": f"error:{exc}",
            }
        )
        print(f"TikTok analytics skipped: {exc}")

    try:
        _open_first(page, FACEBOOK_ANALYTICS_URLS, "Facebook")
        rows.append(_row_for("facebook", page))
        print("Captured Facebook analytics snapshot.")
    except Exception as exc:  # noqa: BLE001
        rows.append(
            {
                "captured_at": datetime.now(timezone.utc).isoformat(),
                "platform": "facebook",
                "followers": "",
                "views": "",
                "likes": "",
                "comments": "",
                "shares": "",
                "profile_views": "",
                "engagement": "",
                "dashboard_url": "",
                "notes": f"error:{exc}",
            }
        )
        print(f"Facebook analytics skipped: {exc}")
    return rows


def run_analytics(page: Page, output_path: Path | None = None) -> Path:
    path = output_path or ANALYTICS_CSV_PATH
    rows = collect_analytics(page)
    append_rows(path, rows)
    print(f"Appended {len(rows)} analytics rows to {path}")
    try:
        from .conversions import snapshot_academy_counts

        snapshot_academy_counts()
    except Exception as exc:  # noqa: BLE001
        print(f"Academy conversion snapshot skipped: {exc}")
    return path
