from __future__ import annotations

from pathlib import Path

from playwright.sync_api import BrowserContext, Playwright

from .config import CDP_ENDPOINT, DEFAULT_LOCALE, DEFAULT_TIMEZONE, DEFAULT_VIEWPORT, PROFILE_DIR, ensure_dirs
from .profiles import LocalBrowser, detect_local_browser
from .stealth import STEALTH_INIT_SCRIPT


CHROME_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-infobars",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
]


def connect_existing_browser(playwright: Playwright, endpoint: str | None = None) -> BrowserContext | None:
    """Attach to Chrome if it was started with --remote-debugging-port."""
    target = endpoint or CDP_ENDPOINT
    try:
        browser = playwright.chromium.connect_over_cdp(target, timeout=2500)
        context = browser.contexts[0] if browser.contexts else browser.new_context()
        context.add_init_script(STEALTH_INIT_SCRIPT)
        return context
    except Exception:
        return None


def launch_persistent_browser(
    playwright: Playwright,
    *,
    local: LocalBrowser | None = None,
    user_data_dir: Path | None = None,
    channel: str | None = "chrome",
    profile_directory: str | None = None,
    headless: bool = False,
) -> BrowserContext:
    """Open the agent's persistent Chrome profile (cookies survive across runs)."""
    ensure_dirs()
    selected = local or (detect_local_browser() if user_data_dir is None else None)
    profile = Path(user_data_dir or (selected.user_data_dir if selected else PROFILE_DIR))
    profile.mkdir(parents=True, exist_ok=True)
    chosen_channel = channel if channel is not None else (selected.channel if selected else "chrome")
    chosen_directory = profile_directory or (selected.profile_directory if selected else "Default")
    args = list(CHROME_ARGS)
    if chosen_directory:
        args.append(f"--profile-directory={chosen_directory}")

    launch_kwargs = {
        "user_data_dir": str(profile),
        "headless": headless,
        "viewport": DEFAULT_VIEWPORT,
        "locale": DEFAULT_LOCALE,
        "timezone_id": DEFAULT_TIMEZONE,
        "args": args,
        "ignore_default_args": ["--enable-automation"],
        "color_scheme": "dark",
        "timeout": 60000,
    }
    if chosen_channel:
        launch_kwargs["channel"] = chosen_channel

    try:
        context = playwright.chromium.launch_persistent_context(**launch_kwargs)
    except Exception as first_error:
        launch_kwargs["viewport"] = None
        try:
            context = playwright.chromium.launch_persistent_context(**launch_kwargs)
        except Exception as second_error:
            raise RuntimeError(
                f"Could not open {profile}. Close other agent Chrome windows and retry. "
                f"Last error: {second_error}"
            ) from first_error

    context.add_init_script(STEALTH_INIT_SCRIPT)
    return context
