from __future__ import annotations

import hashlib
import json
import os
import ssl
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from .config import BACKUPS_DIR, ROOT, ensure_dirs

TABLES = [
    "user_profiles",
    "registration_alerts",
    "contact_inquiries",
    "journals",
    "academy_courses",
    "academy_modules",
    "academy_enrollments",
    "academy_quiz_results",
    "academy_certificates",
    "academy_funnel_events",
]
PAGE_SIZE = 1000
SSL_CONTEXT = ssl.create_default_context()


def load_dotenv() -> None:
    for name in (".env", ".env.local", ".env.production"):
        path = ROOT / name
        if not path.exists():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def supabase_settings() -> tuple[str, str, str]:
    load_dotenv()
    url = (
        os.environ.get("SUPABASE_URL")
        or os.environ.get("VITE_SUPABASE_URL")
        or "https://ixxmwkkwghqkewwzyem.supabase.co"
    ).rstrip("/")
    service = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("MYSTIC9_SUPABASE_SERVICE_ROLE_KEY")
        or ""
    ).strip()
    anon = (
        os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("VITE_SUPABASE_ANON_KEY")
        or os.environ.get("MYSTIC9_SUPABASE_ANON_KEY")
        or ""
    ).strip()
    key = service or anon
    mode = "service_role" if service else "anon"
    if not key:
        raise RuntimeError(
            "No Supabase API key found. Set SUPABASE_SERVICE_ROLE_KEY (preferred for full backups) "
            "or SUPABASE_ANON_KEY in your local .env."
        )
    return url, key, mode


def _request_json(url: str, key: str, path: str, headers: dict[str, str] | None = None):
    request = urllib.request.Request(
        f"{url}{path}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            **(headers or {}),
        },
    )
    with urllib.request.urlopen(request, timeout=45, context=SSL_CONTEXT) as response:
        payload = response.read().decode("utf-8", errors="replace")
        return json.loads(payload) if payload else []


def export_table(url: str, key: str, table: str) -> list[dict]:
    rows: list[dict] = []
    start = 0
    while True:
        end = start + PAGE_SIZE - 1
        try:
            chunk = _request_json(
                url,
                key,
                f"/rest/v1/{urllib.parse.quote(table)}?select=*",
                headers={"Range": f"{start}-{end}", "Prefer": "count=exact"},
            )
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{table}: HTTP {exc.code} {detail[:300]}") from exc
        if not isinstance(chunk, list):
            raise RuntimeError(f"{table}: unexpected payload")
        rows.extend(chunk)
        if len(chunk) < PAGE_SIZE:
            break
        start += PAGE_SIZE
    return rows


def _summarize(table: str, rows: list[dict]) -> dict:
    summary: dict = {"table": table, "row_count": len(rows)}
    if table == "user_profiles" and rows:
        levels = [int(row.get("level") or 0) for row in rows]
        xp_values = [int(row.get("xp") or 0) for row in rows]
        summary["level_max"] = max(levels) if levels else 0
        summary["xp_total"] = sum(xp_values)
        summary["unique_usernames"] = len({row.get("username") for row in rows if row.get("username")})
    return summary


def run_backup(output_dir: Path | None = None) -> Path:
    ensure_dirs()
    url, key, mode = supabase_settings()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    folder = (output_dir or BACKUPS_DIR) / f"supabase-{stamp}"
    folder.mkdir(parents=True, exist_ok=True)

    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "supabase_url": url,
        "auth_mode": mode,
        "tables": [],
        "notes": [],
    }
    if mode == "anon":
        manifest["notes"].append(
            "Exported with anon key. Row Level Security may hide most rows. "
            "Set SUPABASE_SERVICE_ROLE_KEY locally for a full sovereign dump."
        )

    for table in TABLES:
        try:
            rows = export_table(url, key, table)
            (folder / f"{table}.json").write_text(
                json.dumps(rows, indent=2, ensure_ascii=False, default=str),
                encoding="utf-8",
            )
            manifest["tables"].append(_summarize(table, rows))
            print(f"Exported {table}: {len(rows)} rows")
        except Exception as exc:  # noqa: BLE001
            manifest["tables"].append({"table": table, "row_count": 0, "error": str(exc)})
            print(f"Backup skipped {table}: {exc}")

    metrics = {
        "user_count": next((item.get("row_count", 0) for item in manifest["tables"] if item.get("table") == "user_profiles"), 0),
        "tables_exported": [item.get("table") for item in manifest["tables"] if not item.get("error")],
    }
    (folder / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (folder / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    archive = (output_dir or BACKUPS_DIR) / f"supabase-{stamp}.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for path in folder.iterdir():
            bundle.write(path, arcname=path.name)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (archive.with_suffix(".zip.sha256")).write_text(f"{digest}  {archive.name}\n", encoding="utf-8")
    print(f"Wrote archive {archive}")
    print(f"SHA-256 {digest}")
    return archive
