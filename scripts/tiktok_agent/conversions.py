from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path

from .config import ACADEMY_CONVERSIONS_PATH, ACADEMY_LANDING, ensure_dirs

FIELDS = [
    "captured_at",
    "event",
    "platform",
    "video",
    "landing_url",
    "foundations_enrollments",
    "harmonic_enrollments",
    "master_enrollments",
    "quiz_passes",
    "certificates",
    "notes",
]


def _append(row: dict) -> Path:
    ensure_dirs()
    ACADEMY_CONVERSIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    new_file = not ACADEMY_CONVERSIONS_PATH.exists()
    with ACADEMY_CONVERSIONS_PATH.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        if new_file:
            writer.writeheader()
        writer.writerow({field: row.get(field, "") for field in FIELDS})
    return ACADEMY_CONVERSIONS_PATH


def log_outbound(platform: str, video: str, landing_url: str | None = None) -> Path:
    url = landing_url or (
        f"{ACADEMY_LANDING}?utm_source={platform}&utm_medium=social"
        "&utm_campaign=mystic9_agent&utm_content=foundations"
    )
    path = _append(
        {
            "captured_at": datetime.now(timezone.utc).isoformat(),
            "event": "outbound_draft",
            "platform": platform,
            "video": video,
            "landing_url": url,
            "notes": "social draft pointed at free Foundations registration",
        }
    )
    print(f"Logged academy funnel URL to {path}")
    return path


def snapshot_academy_counts() -> Path:
    counts = {
        "foundations_enrollments": "",
        "harmonic_enrollments": "",
        "master_enrollments": "",
        "quiz_passes": "",
        "certificates": "",
        "notes": "",
    }
    try:
        from .backup import export_table, supabase_settings

        url, key, mode = supabase_settings()
        enrollments = export_table(url, key, "academy_enrollments")
        quizzes = export_table(url, key, "academy_quiz_results")
        certs = export_table(url, key, "academy_certificates")
        counts["foundations_enrollments"] = str(sum(1 for row in enrollments if row.get("course_id") == "foundations"))
        counts["harmonic_enrollments"] = str(sum(1 for row in enrollments if row.get("course_id") == "harmonic"))
        counts["master_enrollments"] = str(sum(1 for row in enrollments if row.get("course_id") == "master"))
        counts["quiz_passes"] = str(sum(1 for row in quizzes if row.get("passed")))
        counts["certificates"] = str(len(certs))
        counts["notes"] = f"supabase-{mode}"
    except Exception as exc:  # noqa: BLE001
        counts["notes"] = f"snapshot-skipped:{exc}"
        print(f"Academy conversion snapshot skipped: {exc}")
    path = _append(
        {
            "captured_at": datetime.now(timezone.utc).isoformat(),
            "event": "academy_snapshot",
            "platform": "supabase",
            "landing_url": ACADEMY_LANDING,
            **counts,
        }
    )
    print(f"Academy conversion snapshot appended to {path}")
    return path
