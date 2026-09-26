from __future__ import annotations

from playwright.sync_api import Locator, Page, TimeoutError as PlaywrightTimeout

from .config import UPLOAD_URL
from .human import human_type, pause, think_pause
from .pipeline import ContentItem

FILE_INPUT_SELECTORS = [
    "input[type='file']",
    "input[accept*='video']",
    "input[data-e2e='upload-btn']",
]

CAPTION_SELECTORS = [
    "[data-e2e='caption']",
    "[data-e2e='caption-input']",
    "[data-text='true']",
    "div.public-DraftEditor-content[contenteditable='true']",
    "div[contenteditable='true'][role='textbox']",
    "div[contenteditable='true']",
    "textarea",
]

POST_SELECTORS = [
    "[data-e2e='post_video_button']",
    "[data-e2e='publish-button']",
    "button:has-text('Post')",
    "button:has-text('Publish')",
]


class UploadPreparationError(RuntimeError):
    pass


def _first_visible(page: Page, selectors: list[str], timeout_ms: int = 8000) -> Locator | None:
    for selector in selectors:
        locator = page.locator(selector).first
        try:
            locator.wait_for(state="visible", timeout=timeout_ms)
            return locator
        except PlaywrightTimeout:
            continue
        except Exception:
            continue
    return None


def _dismiss_overlays(page: Page) -> None:
    labels = [
        "Allow all",
        "Accept all",
        "Accept",
        "Got it",
        "Not now",
        "Skip",
        "Close",
    ]
    for label in labels:
        button = page.get_by_role("button", name=label, exact=False)
        try:
            if button.count() and button.first.is_visible():
                button.first.click(timeout=1200)
                pause(0.3, 0.7)
        except Exception:
            continue


def _looks_like_login(page: Page) -> bool:
    url = page.url.lower()
    if "login" in url or "signup" in url:
        return True
    login = page.get_by_text("Log in", exact=False)
    try:
        return bool(login.count()) and login.first.is_visible()
    except Exception:
        return False


def wait_for_session(page: Page, timeout_ms: int = 180_000) -> None:
    page.goto(UPLOAD_URL, wait_until="domcontentloaded")
    pause(1.0, 1.8)
    _dismiss_overlays(page)
    if not _looks_like_login(page):
        return
    print("TikTok needs a login in this persistent profile.")
    print("Sign in inside the opened window. The agent will continue after it reaches the upload page.")
    page.wait_for_url("**/tiktokstudio/**", timeout=timeout_ms)
    think_pause()


def _attach_video(page: Page, video_path: str) -> None:
    inputs = page.locator("input[type='file']")
    if inputs.count():
        inputs.first.set_input_files(video_path)
        return
    locator = _first_visible(page, FILE_INPUT_SELECTORS, timeout_ms=4000)
    if locator is None:
        raise UploadPreparationError("Could not find TikTok's video file input.")
    locator.set_input_files(video_path)


def _fill_caption(page: Page, caption: str) -> None:
    editor = _first_visible(page, CAPTION_SELECTORS, timeout_ms=25000)
    if editor is None:
        raise UploadPreparationError(
            "Video attached, but the caption field was not found. Caption is on the clipboard."
        )
    editor.click()
    pause(0.2, 0.5)
    page.keyboard.press("Control+A")
    pause(0.1, 0.25)
    page.keyboard.press("Backspace")
    human_type(page, caption)


def _find_post_button(page: Page) -> Locator | None:
    for selector in POST_SELECTORS:
        locator = page.locator(selector).first
        try:
            if locator.count():
                return locator
        except Exception:
            continue
    by_role = page.get_by_role("button", name="Post")
    if by_role.count():
        return by_role.last
    return None


def prepare_upload(page: Page, item: ContentItem) -> Locator | None:
    wait_for_session(page)
    _dismiss_overlays(page)
    think_pause()
    _attach_video(page, str(item.video_path.resolve()))
    print(f"Attached video: {item.video_path.name}")
    pause(2.2, 4.0)
    _fill_caption(page, item.formatted_caption)
    print("Caption and hashtags filled.")
    think_pause()
    return _find_post_button(page)


def maybe_publish(post_button: Locator | None, *, publish: bool) -> None:
    if not publish:
        print("Verify mode: review the draft, then press Post yourself in the browser.")
        return
    if post_button is None:
        raise UploadPreparationError("Publish requested, but the Post button was not found.")
    pause(0.6, 1.2)
    post_button.click()
    print("Clicked Post. Confirm in the browser that TikTok accepted the upload.")
