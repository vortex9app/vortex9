from __future__ import annotations

import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

from .config import RESEARCH_IDEAS_PATH, RESEARCH_SOURCES_PATH, ensure_dirs

USER_AGENT = "mystic9.net-local-research/1.0 (https://mystic9.net/)"
SSL_CONTEXT = ssl.create_default_context()
TAG_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"\s+")

CORE_KEYWORDS = [
    "energetic sovereignty",
    "spiritual warfare",
    "grounding",
    "schumann",
    "spiral of 9",
    "toroidal",
    "torus",
    "entity",
    "auric",
    "sacred geometry",
    "numerology",
    "meditation",
    "solfeggio",
    "cymatics",
    "ascension",
    "oversoul",
    "chakra",
    "frequency",
    "manifestation",
    "soul blueprint",
    "astral",
    "light code",
    "water structuring",
    "binaural",
]

LIBRARY_HOOKS = {
    "schumann": "Pair a live Schumann pulse clip with The Anchor and the Storm.",
    "grounding": "Film barefoot earth-contact and decree work from energetic sovereignty.",
    "sacred geometry": "Show Spiral of 9 overlays on the mandala generator.",
    "numerology": "Walk a seeker through a 9-cycle reading on camera.",
    "chakra": "Map the seven wheels of light in a 30-second activation.",
    "solfeggio": "Layer 528 Hz under a short decree from the library.",
    "astral": "Tease Navigating the Astral Lattice without spoiling mastery pages.",
    "oversoul": "Speak to the divine double using Architecture of the Oversoul language.",
    "frequency": "Cut between the frequency tool UI and a field-seal demonstration.",
    "manifestation": "Use Quantum Weaver: frequency precedes form, then a single action.",
}


def _strip(html: str) -> str:
    text = unescape(TAG_RE.sub(" ", html or ""))
    return WHITESPACE_RE.sub(" ", text).strip()


def _fetch(url: str, timeout: int = 20) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(request, timeout=timeout, context=SSL_CONTEXT) as response:
        return response.read()


def _local_name(tag: str) -> str:
    return tag.split("}", 1)[-1].lower()


def _child_text(node: ET.Element, names: set[str]) -> str:
    for child in list(node):
        if _local_name(child.tag) in names:
            if child.text and child.text.strip():
                return child.text.strip()
            return _strip("".join(child.itertext()))
    return ""


def _child_link(node: ET.Element) -> str:
    for child in list(node):
        if _local_name(child.tag) != "link":
            continue
        href = child.attrib.get("href")
        if href:
            return href.strip()
        if child.text and child.text.strip():
            return child.text.strip()
    return ""


def parse_feed_bytes(payload: bytes, source: str) -> list[dict]:
    items: list[dict] = []
    try:
        root = ET.fromstring(payload)
    except ET.ParseError:
        return items
    for node in root.iter():
        name = _local_name(node.tag)
        if name not in {"item", "entry"}:
            continue
        title = _child_text(node, {"title"})
        summary = _child_text(node, {"description", "summary", "content"})
        link = _child_link(node)
        published = _child_text(node, {"pubdate", "published", "updated", "date"})
        if not title:
            continue
        items.append(
            {
                "title": _strip(title),
                "url": link,
                "summary": _strip(summary)[:600],
                "published": published,
                "source": source,
            }
        )
    return items


def load_sources() -> dict:
    if RESEARCH_SOURCES_PATH.exists():
        return json.loads(RESEARCH_SOURCES_PATH.read_text(encoding="utf-8"))
    return {"rss": [{"name": "mystic9-feed", "url": "https://mystic9.net/feed.xml"}], "wikipedia_queries": []}


def match_keywords(text: str) -> list[str]:
    lowered = text.lower()
    return [keyword for keyword in CORE_KEYWORDS if keyword in lowered]


def collect_rss(sources: dict) -> list[dict]:
    collected: list[dict] = []
    feeds = list(sources.get("rss") or []) + list(sources.get("youtube_rss") or [])
    for feed in feeds:
        name = str(feed.get("name") or "feed")
        url = str(feed.get("url") or "")
        if not url:
            continue
        try:
            payload = _fetch(url)
            entries = parse_feed_bytes(payload, name)
            print(f"Research RSS {name}: {len(entries)} entries")
            collected.extend(entries)
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            print(f"Research RSS skipped ({name}): {exc}")
    return collected


def collect_wikipedia(queries: list[str]) -> list[dict]:
    items: list[dict] = []
    for query in queries:
        params = urllib.parse.urlencode(
            {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": 5,
                "format": "json",
            }
        )
        url = f"https://en.wikipedia.org/w/api.php?{params}"
        try:
            payload = json.loads(_fetch(url).decode("utf-8", errors="replace"))
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            print(f"Wikipedia skipped ({query}): {exc}")
            continue
        for hit in payload.get("query", {}).get("search", []):
            title = hit.get("title") or query
            snippet = _strip(hit.get("snippet") or "")
            slug = urllib.parse.quote(title.replace(" ", "_"))
            items.append(
                {
                    "title": title,
                    "url": f"https://en.wikipedia.org/wiki/{slug}",
                    "summary": snippet,
                    "published": "",
                    "source": f"wikipedia:{query}",
                }
            )
    return items


def score_themes(items: list[dict]) -> list[dict]:
    counts: Counter[str] = Counter()
    examples: dict[str, list[str]] = {}
    for item in items:
        blob = f"{item.get('title', '')} {item.get('summary', '')}"
        matched = match_keywords(blob)
        item["matched_keywords"] = matched
        for keyword in matched or []:
            counts[keyword] += 1
            examples.setdefault(keyword, [])
            if item.get("title") and item["title"] not in examples[keyword]:
                examples[keyword].append(item["title"])
    ranked = []
    for keyword, score in counts.most_common():
        ranked.append(
            {
                "term": keyword,
                "score": score,
                "examples": examples.get(keyword, [])[:5],
                "hook": LIBRARY_HOOKS.get(keyword, f"Translate '{keyword}' through the mystic9.net library voice."),
            }
        )
    return ranked


def build_research_report(items: list[dict], themes: list[dict]) -> dict:
    relevant = [item for item in items if item.get("matched_keywords")]
    unused_hooks = [hook for key, hook in LIBRARY_HOOKS.items() if key not in {row['term'] for row in themes}]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "site": "https://mystic9.net/",
        "item_count": len(items),
        "matched_count": len(relevant),
        "themes": themes,
        "content_hooks": [row["hook"] for row in themes[:8]] + unused_hooks[:3],
        "items": relevant[:80] or items[:40],
        "rag_notes": [
            "Blend trending language with canonical mystic9.net chapter URLs, not third-party definitions.",
            "Keep Barefoot Mystic terminology: energetic sovereignty, Spiral of 9, toroidal field, Oversoul.",
        ],
    }


def run_research(output_path: Path | None = None) -> Path:
    ensure_dirs()
    sources = load_sources()
    items = collect_rss(sources)
    items.extend(collect_wikipedia(list(sources.get("wikipedia_queries") or [])))
    themes = score_themes(items)
    report = build_research_report(items, themes)
    path = output_path or RESEARCH_IDEAS_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(report['items'])} research ideas to {path}")
    return path
