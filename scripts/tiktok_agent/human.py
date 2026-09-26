from __future__ import annotations

import random
import time
from collections.abc import Callable


def pause(lo: float = 0.35, hi: float = 1.15) -> None:
    time.sleep(random.uniform(lo, hi))


def micro_pause() -> None:
    pause(0.08, 0.28)


def think_pause() -> None:
    pause(0.7, 1.8)


def jitter_int(lo: int, hi: int) -> int:
    return random.randint(lo, hi)


def human_type(page, text: str, *, burst: int | None = None) -> None:
    """Type with irregular cadence so it does not look like a single dump."""
    chars_until_rest = burst or jitter_int(7, 18)
    for index, char in enumerate(text):
        page.keyboard.type(char, delay=jitter_int(12, 48))
        chars_until_rest -= 1
        if char in "\n.,!?#" or chars_until_rest <= 0:
            pause(0.09, 0.32)
            chars_until_rest = jitter_int(7, 18)
        elif index % 40 == 0:
            micro_pause()


def with_retries(action: Callable[[], None], attempts: int = 3) -> None:
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            action()
            return
        except Exception as exc:  # noqa: BLE001 — surface later
            last_error = exc
            think_pause()
    if last_error:
        raise last_error
