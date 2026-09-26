#!/usr/bin/env python3
"""Local mystic9.net agent: drafts, research, analytics, and Supabase backups.

Usage:
    python deploy_agent.py --check-session
    python deploy_agent.py --latest
    python deploy_agent.py --research
    python deploy_agent.py --analytics
    python deploy_agent.py --backup
    python deploy_agent.py --maintain
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts"))

from tiktok_agent.analytics import run_analytics  # noqa: E402
from tiktok_agent.backup import run_backup  # noqa: E402
from tiktok_agent.browser import connect_existing_browser, launch_persistent_browser  # noqa: E402
from tiktok_agent.config import QUEUE_DIR, ensure_dirs  # noqa: E402
from tiktok_agent.conversions import log_outbound  # noqa: E402
from tiktok_agent.facebook import prepare_facebook_upload  # noqa: E402
from tiktok_agent.human import pause  # noqa: E402
from tiktok_agent.pipeline import (  # noqa: E402
    archive_item,
    copy_to_clipboard,
    discover_videos,
    latest_item,
    load_item,
    load_manifest,
    record_item,
)
from tiktok_agent.profiles import detect_local_browser  # noqa: E402
from tiktok_agent.research import run_research  # noqa: E402
from tiktok_agent.sessions import inspect_sessions  # noqa: E402
from tiktok_agent.uploader import UploadPreparationError, maybe_publish, prepare_upload  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Local TikTok/Facebook draft agent for mystic9.net content."
    )
    parser.add_argument("--video", type=Path, help="Path to a local video file.")
    parser.add_argument("--latest", action="store_true", help="Use the newest file in content/tiktok/queue.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Format caption/hashtags and copy them to the clipboard without opening a browser.",
    )
    parser.add_argument(
        "--check-session",
        action="store_true",
        help="Open your local Chrome profile and report TikTok/Facebook login state.",
    )
    parser.add_argument(
        "--platform",
        choices=("tiktok", "facebook", "both"),
        default="both",
        help="Which composer to prepare. Default: both.",
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Click Post after the draft is ready. Default is verify-only.",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip the terminal confirmation required by --publish.",
    )
    parser.add_argument(
        "--user-data-dir",
        type=Path,
        default=None,
        help="Override the detected Chrome/Edge user-data directory.",
    )
    parser.add_argument(
        "--channel",
        default=None,
        help="Playwright browser channel override: chrome, msedge, or chromium.",
    )
    parser.add_argument(
        "--profile-directory",
        default=None,
        help="Chrome profile folder name inside --user-data-dir, e.g. Default.",
    )
    parser.add_argument(
        "--cdp",
        default=None,
        help="Connect to an already-running browser, e.g. http://127.0.0.1:9222",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        help="JSON sidecar with caption, banks, and video filename.",
    )
    parser.add_argument(
        "--archive",
        action="store_true",
        help="Copy the selected video and caption into content/tiktok/archive after a successful run.",
    )
    parser.add_argument(
        "--research",
        action="store_true",
        help="Scan configured RSS/Wikipedia sources into content/research_ideas.json.",
    )
    parser.add_argument(
        "--analytics",
        action="store_true",
        help="Read TikTok/Facebook creator dashboards into content/analytics_tracker.csv.",
    )
    parser.add_argument(
        "--backup",
        action="store_true",
        help="Export Supabase tables into a local zip under backups/.",
    )
    parser.add_argument(
        "--maintain",
        action="store_true",
        help="Run research, analytics, and backup in one pass.",
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Repeat unattended research (and optional backup) on --interval seconds. Does not open a browser.",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=21600,
        help="Seconds between --daemon cycles. Default: 21600 (6 hours).",
    )
    return parser.parse_args()


def choose_item(args: argparse.Namespace):
    ensure_dirs()
    if args.manifest:
        path = args.manifest if args.manifest.is_absolute() else ROOT / args.manifest
        if not path.exists():
            raise SystemExit(f"Manifest not found: {path}")
        return load_manifest(path)
    if args.video:
        path = args.video if args.video.is_absolute() else ROOT / args.video
        if not path.exists():
            raise SystemExit(f"Video not found: {path}")
        return load_item(path)

    videos = discover_videos()
    if args.latest or len(videos) == 1:
        item = latest_item()
        if item is None:
            raise SystemExit(
                f"No videos in {QUEUE_DIR}. Drop an .mp4/.mov there, plus an optional .txt or .json sidecar."
            )
        return item

    if not videos:
        example = QUEUE_DIR / "example.manifest.json"
        if args.dry_run and example.exists():
            print("No videos queued; using example.manifest.json for caption dry-run.")
            return load_manifest(example)
        raise SystemExit(
            f"No videos in {QUEUE_DIR}. Drop an .mp4/.mov there, plus an optional .txt or .json sidecar."
        )

    print("Queued videos:")
    for index, path in enumerate(videos, start=1):
        print(f"  {index}. {path.name}")
    choice = input("Select a number (or Enter for newest): ").strip()
    if not choice:
        return load_item(videos[0])
    try:
        return load_item(videos[int(choice) - 1])
    except (ValueError, IndexError):
        raise SystemExit("Invalid selection.") from None


def print_pack(item) -> None:
    print()
    print(f"Title : {item.title}")
    print(f"Video : {item.video_path}")
    print("-" * 40)
    print(item.formatted_caption)
    print("-" * 40)
    if copy_to_clipboard(item.formatted_caption):
        print("Caption + hashtags copied to clipboard.")
    else:
        print("Could not copy to clipboard; paste from the block above if needed.")
    log_outbound(str(item.extra.get("platform") or "tiktok"), item.video_path.name)


def open_context(playwright, args):
    if args.cdp:
        context = connect_existing_browser(playwright, args.cdp)
        if context is None:
            raise SystemExit(f"Could not attach to browser at {args.cdp}.")
        print(f"Attached to existing browser: {args.cdp}")
        return context, False

    local = None if args.user_data_dir else detect_local_browser()
    if local:
        print(f"Persistent profile: {local.label}")
        print(f"User data: {local.user_data_dir}")
        if local.locked:
            raise SystemExit("The agent Chrome profile is already open. Close that window and retry.")
    context = launch_persistent_browser(
        playwright,
        local=local,
        user_data_dir=args.user_data_dir,
        channel=args.channel if args.channel is not None else (None if local else "chrome"),
        profile_directory=args.profile_directory,
    )
    return context, True


def run_session_check(args) -> None:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        context, owns = open_context(playwright, args)
        try:
            print("Reading TikTok and Facebook cookies from the local profile...")
            results = inspect_sessions(context)
            print()
            print(f"TikTok  login: {'yes' if results.get('tiktok') else 'no'}")
            print(f"Facebook login: {'yes' if results.get('facebook') else 'no'}")
            if not all(results.values()):
                print("Log in to TikTok and Facebook in this window (one time).")
                print("Those logins stay in the agent profile for later runs.")
                if not args.yes:
                    print("After logging in, press Enter to re-check.")
                    input()
                    results = inspect_sessions(context)
                    print(f"TikTok  login: {'yes' if results.get('tiktok') else 'no'}")
                    print(f"Facebook login: {'yes' if results.get('facebook') else 'no'}")
            else:
                print("Both sessions are available in this profile. Ready to prepare drafts.")
            if not args.yes:
                print("Press Enter to close the check window.")
                input()
        finally:
            if owns:
                context.close()


def run_browser(args: argparse.Namespace, item) -> None:
    from playwright.sync_api import sync_playwright

    platforms = ("tiktok", "facebook") if args.platform == "both" else (args.platform,)
    with sync_playwright() as playwright:
        context, owns = open_context(playwright, args)
        page = context.pages[0] if context.pages else context.new_page()
        try:
            for platform in platforms:
                item.extra["platform"] = platform
                copy_to_clipboard(item.formatted_caption)
                log_outbound(platform, item.video_path.name)
                if platform == "tiktok":
                    post_button = prepare_upload(page, item)
                    record_item(item, "tiktok-draft-ready")
                    maybe_publish(post_button, publish=args.publish)
                else:
                    fb_page = context.new_page()
                    post_button = prepare_facebook_upload(fb_page, item)
                    record_item(item, "facebook-draft-ready")
                    maybe_publish(post_button, publish=args.publish)
                if args.publish:
                    record_item(item, f"{platform}-publish-clicked")
            print("Browser stays open for review. Press Enter here when you are done.")
            input()
            if args.archive:
                dest = archive_item(item)
                print(f"Archived to {dest}")
        except UploadPreparationError as exc:
            record_item(item, "needs-manual")
            print(f"Stopped at a safe point: {exc}")
            print("The caption is on the clipboard. Finish the upload in the open window, then press Enter.")
            input()
        finally:
            pause(0.2, 0.4)
            if owns:
                context.close()


def run_analytics_job(args) -> None:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        context, owns = open_context(playwright, args)
        page = context.pages[0] if context.pages else context.new_page()
        try:
            run_analytics(page)
            if not args.yes and not args.maintain:
                print("Analytics capture finished. Press Enter to close the browser.")
                input()
        finally:
            if owns:
                context.close()


HEARTBEAT_PATH = ROOT / "content" / "agent_heartbeat.json"


def write_heartbeat(status: str, details: dict | None = None) -> None:
    ensure_dirs()
    payload = {
        "status": status,
        "updated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "details": details or {},
    }
    HEARTBEAT_PATH.write_text(__import__("json").dumps(payload, indent=2), encoding="utf-8")
    print(f"Heartbeat: {status} -> {HEARTBEAT_PATH}")


def run_unattended_cycle(include_backup: bool) -> dict:
    """RSS/Wikipedia research plus optional Supabase backup. No browser."""
    details: dict = {}
    errors: list[str] = []
    try:
        path = run_research()
        details["research"] = "ok"
        details["ideas_path"] = str(path)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"research: {exc}")
        details["research"] = str(exc)
        print(f"Research failed: {exc}", file=sys.stderr)
    if include_backup:
        try:
            run_backup()
            details["backup"] = "ok"
        except Exception as exc:  # noqa: BLE001
            errors.append(f"backup: {exc}")
            details["backup"] = str(exc)
            print(f"Backup failed: {exc}", file=sys.stderr)
    details["errors"] = errors
    write_heartbeat("degraded" if errors else "ok", details)
    if errors:
        raise SystemExit("Unattended cycle finished with errors:\n- " + "\n- ".join(errors))
    return details


def run_daemon(args) -> None:
    interval = max(300, int(args.interval or 21600))
    print(f"Agent daemon started. Research every {interval}s. Ctrl+C to stop.")
    while True:
        try:
            run_unattended_cycle(include_backup=bool(args.backup))
        except SystemExit as exc:
            print(exc, file=sys.stderr)
        except KeyboardInterrupt:
            write_heartbeat("stopped", {"reason": "keyboard"})
            raise
        try:
            import time

            time.sleep(interval)
        except KeyboardInterrupt:
            write_heartbeat("stopped", {"reason": "keyboard"})
            raise


def run_maintenance(args) -> None:
    errors: list[str] = []
    if args.maintain or args.research:
        try:
            run_research()
        except Exception as exc:  # noqa: BLE001
            errors.append(f"research: {exc}")
            print(f"Research failed: {exc}", file=sys.stderr)
    if args.maintain or args.analytics:
        try:
            run_analytics_job(args)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"analytics: {exc}")
            print(f"Analytics failed: {exc}", file=sys.stderr)
    if args.maintain or args.backup:
        try:
            run_backup()
        except Exception as exc:  # noqa: BLE001
            errors.append(f"backup: {exc}")
            print(f"Backup failed: {exc}", file=sys.stderr)
    if errors:
        raise SystemExit("Maintenance finished with errors:\n- " + "\n- ".join(errors))


def main() -> None:
    args = parse_args()
    if args.check_session:
        run_session_check(args)
        return
    if args.daemon:
        run_daemon(args)
        return
    if args.research and not args.maintain and not args.analytics:
        run_unattended_cycle(include_backup=bool(args.backup))
        return
    if args.maintain or args.analytics or args.backup:
        run_maintenance(args)
        return

    if args.publish and not args.yes:
        confirm = input("This will click the Post button. Type PUBLISH to continue: ").strip()
        if confirm != "PUBLISH":
            raise SystemExit("Publish cancelled. Re-run without --publish to stop at verification.")

    item = choose_item(args)
    print_pack(item)
    if args.dry_run:
        record_item(item, "dry-run")
        return
    if not item.video_path.exists():
        raise SystemExit(f"Video file is missing: {item.video_path}")
    run_browser(args, item)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        raise SystemExit("Cancelled.") from None
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        print(f"Agent stopped with an unexpected error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
