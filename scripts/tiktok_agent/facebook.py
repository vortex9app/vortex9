from __future__ import annotations

from playwright.sync_api import Locator, Page

from .human import human_type, pause, think_pause
from .pipeline import ContentItem
from .uploader import UploadPreparationError, _dismiss_overlays, _first_visible

FACEBOOK_REELS_URL = "https://www.facebook.com/reels/create"

CAPTION_SELECTORS = [
    "div[aria-label='Description'][contenteditable='true']",
    "div[aria-label='Write a caption...'][contenteditable='true']",
    "div[contenteditable='true'][role='textbox']",
    "div[contenteditable='true']",
    "textarea",
]

POST_SELECTORS = [
    "div[aria-label='Post'][role='button']",
    "div[aria-label='Share'][role='button']",
    "div[aria-label='Publish'][role='button']",
    "button:has-text('Post')",
    "button:has-text('Share now')",
]


def wait_for_facebook_session(page: Page, timeout_ms: int = 180_000) -> None:
    page.goto(FACEBOOK_REELS_URL, wait_until="domcontentloaded")
    pause(1.2, 2.0)
    _dismiss_overlays(page)
    if "login" not in page.url.lower():
        return
    print("Facebook needs a login in this browser profile.")
    print("Sign in inside the opened window. The agent continues after the reels composer loads.")
    page.wait_for_url("**/reels/**", timeout=timeout_ms)
    think_pause()


def _attach_video(page: Page, video_path: str) -> None:
    inputs = page.locator("input[type='file']")
    if inputs.count():
        inputs.first.set_input_files(video_path)
        return
    raise UploadPreparationError("Could not find Facebook's video file input.")


def _click_next(page: Page) -> None:
    for label in ("Next", "Continue", "OK"):
        button = page.get_by_role("button", name=label)
        try:
            if button.count() and button.first.is_visible():
                button.first.click(timeout=2000)
                pause(0.8, 1.4)
        except Exception:
            continue


def _fill_caption(page: Page, caption: str) -> None:
    editor = _first_visible(page, CAPTION_SELECTORS, timeout_ms=20000)
    if editor is None:
        raise UploadPreparationError(
            "Video attached on Facebook, but the caption field was not found. Caption is on the clipboard."
        )
    editor.click()
    pause(0.2, 0.5)
    human_type(page, caption)


def _find_post_button(page: Page) -> Locator | None:
    for selector in POST_SELECTORS:
        locator = page.locator(selector).first
        try:
            if locator.count():
                return locator
        except Exception:
            continue
    return None


def prepare_facebook_upload(page: Page, item: ContentItem) -> Locator | None:
    wait_for_facebook_session(page)
    _dismiss_overlays(page)
    think_pause()
    _attach_video(page, str(item.video_path.resolve()))
    print(f"Facebook attached video: {item.video_path.name}")
    pause(2.0, 3.5)
    _click_next(page)
    _fill_caption(page, item.formatted_caption)
    print("Facebook caption filled.")
    _click_next(page)
    think_pause()
    return _find_post_button(page)
