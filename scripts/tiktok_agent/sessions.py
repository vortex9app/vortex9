from __future__ import annotations

from playwright.sync_api import BrowserContext, Page

from .human import pause


def _names_for(context: BrowserContext, needle: str) -> set[str]:
    return {
        cookie["name"]
        for cookie in context.cookies()
        if needle in (cookie.get("domain") or "")
    }


def tiktok_logged_in(context: BrowserContext) -> bool:
    names = _names_for(context, "tiktok.com")
    return bool(names & {"sessionid", "sid_tt", "sessionid_ss"})


def facebook_logged_in(context: BrowserContext) -> bool:
    names = _names_for(context, "facebook.com")
    return "c_user" in names


def _safe_goto(page: Page, url: str) -> None:
    try:
        page.goto(url, wait_until="commit", timeout=20000)
        pause(0.8, 1.4)
    except Exception as exc:
        print(f"Page load incomplete for {url}: {exc}")


def inspect_sessions(context: BrowserContext) -> dict[str, bool]:
    cookie_state = {
        "tiktok": tiktok_logged_in(context),
        "facebook": facebook_logged_in(context),
    }
    print(
        "Cookie session: "
        f"TikTok={'yes' if cookie_state['tiktok'] else 'no'}, "
        f"Facebook={'yes' if cookie_state['facebook'] else 'no'}"
    )
    if all(cookie_state.values()):
        return cookie_state

    page = context.pages[0] if context.pages else context.new_page()
    if not cookie_state["tiktok"]:
        print("Opening TikTok to confirm login...")
        _safe_goto(page, "https://www.tiktok.com/")
        cookie_state["tiktok"] = tiktok_logged_in(context)
    if not cookie_state["facebook"]:
        print("Opening Facebook to confirm login...")
        _safe_goto(page, "https://www.facebook.com/")
        cookie_state["facebook"] = facebook_logged_in(context)
    return cookie_state
