from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from .config import PROFILE_DIR


@dataclass
class LocalBrowser:
    channel: str
    user_data_dir: Path
    profile_directory: str
    locked: bool
    label: str

    @property
    def ready(self) -> bool:
        return self.user_data_dir.exists() and not self.locked


def _local_appdata() -> Path:
    return Path(os.environ.get("LOCALAPPDATA", Path.home()))


def _locked(user_data_dir: Path) -> bool:
    return (user_data_dir / "SingletonLock").exists() or (user_data_dir / "lockfile").exists()


def agent_browser() -> LocalBrowser:
    return LocalBrowser(
        channel="chrome",
        user_data_dir=PROFILE_DIR,
        profile_directory="Default",
        locked=_locked(PROFILE_DIR),
        label="mystic9 agent Chrome profile",
    )


def detect_local_browser() -> LocalBrowser:
    """Use a dedicated persistent Chrome profile.

    Current Chrome builds refuse DevTools on the live Default user-data folder,
    so the agent keeps its own profile under %LOCALAPPDATA%/mystic9-tiktok-agent.
    Log in to TikTok and Facebook once in that window; later runs reuse it.
    """
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    return agent_browser()
