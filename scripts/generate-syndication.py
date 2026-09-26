# -*- coding: utf-8 -*-
import re
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://mystic9.net"
IMAGE = f"{SITE}/character.jpg"
HUB = "https://pubsubhubbub.appspot.com/"
DESC = (
    "Welcome to mystic9.net. The Barefoot Mystic's digital sanctuary for frequency activation, "
    "sacred geometry, numerology, meditation, water structuring, and multidimensional community ascension."
)
DATES = {
    "energetic-sovereignty": "2026-03-21T09:00:00Z",
    "anchor-and-the-storm": "2026-04-08T09:00:00Z",
    "quantum-tapestry": "2026-05-01T09:00:00Z",
    "sovereign-blueprint": "2026-05-20T09:00:00Z",
    "alchemy-of-the-void": "2026-06-11T09:00:00Z",
    "unseen-parasites": "2026-07-04T09:00:00Z",
    "quantum-weaver": "2026-08-09T09:00:00Z",
}
PORTALS = [
    ("", "mystic9.net | The Digital Sanctuary & Frequency Portal"),
    ("tiers", "Sanctuary Memberships, Passes & 9 Levels | mystic9.net"),
    ("about", "About The Barefoot Mystic | mystic9.net"),
    ("instructions", "How to Navigate the Sanctuary | mystic9.net"),
    ("library", "Mystic9 Library | mystic9.net"),
    ("academy", "Online Course Academy | mystic9.net"),
    ("radio", "The Barefoot Mystic Ambient Stream | mystic9.net"),
    ("schumann", "Live Schumann Resonance Monitor | mystic9.net"),
    ("matrix", "Daily Frequency Matrix | mystic9.net"),
    ("videolounge", "Activator 12-Camera Video Lounge | mystic9.net"),
    ("waterstruct", "Cymatic Water Structuring Tool | mystic9.net"),
    ("pendulum", "Interactive Pendulum / Dowsing Tool | mystic9.net"),
    ("gratitudestream", "Daily Gratitude & Blessing Stream | mystic9.net"),
    ("mandala", "Sacred Geometry Mandala Generator | mystic9.net"),
    ("numerology", "Spiral of 9 Numerology Calculator | mystic9.net"),
    ("lightcodes", "Quantum Light Code Generator | mystic9.net"),
    ("breath", "4-4-4 Solfeggio Breath Pacer | mystic9.net"),
    ("aura", "Biofield Aura Scanner | mystic9.net"),
    ("decrees", "Sovereign Biofield Decrees | mystic9.net"),
    ("shadow", "Burn & Release Shadow Ritual | mystic9.net"),
    ("oracle", "The Oracle Gateway | mystic9.net"),
    ("frequency", "Harmonic Synthesizer & Binaural Beats | mystic9.net"),
    ("community", "Seekers Community Sanctuary | mystic9.net"),
    ("share", "Share the Light & Support Development | mystic9.net"),
    ("contact", "Direct Contact & Newsletter Sanctuary | mystic9.net"),
]


def excerpt(text, max_len):
    clean = re.sub(r"\s+", " ", text).strip()
    if len(clean) <= max_len:
        return clean
    return clean[:max_len].rsplit(" ", 1)[0] + "…"


def rfc822(iso):
    from email.utils import format_datetime
    from datetime import datetime, timezone
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(timezone.utc)
    return format_datetime(dt)


def extract_articles():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    start = html.find("const libraryArticles = [")
    end = html.find("const MYSTIC9_LIBRARY_CATALOG", start)
    block = html[start:end]
    pattern = re.compile(
        r"id:\s*'([^']+)',\s*title:\s*'((?:\\'|[^'])*)',\s*category:\s*'((?:\\'|[^'])*)',\s*content:\s*`([\s\S]*?)`\s*\}",
    )
    articles = []
    for match in pattern.finditer(block):
        articles.append({
            "id": match.group(1),
            "title": match.group(2).replace("\\'", "'"),
            "category": match.group(3).replace("\\'", "'"),
            "content": match.group(4),
        })
    return articles


def feed_items(articles):
    items = [
        {
            "id": "sanctuary-beacon",
            "title": "mystic9.net | The Digital Sanctuary & Frequency Portal",
            "description": DESC,
            "url": f"{SITE}/",
            "date": "2026-03-21T09:00:00Z",
            "category": "Foundational Transmission",
        },
        {
            "id": "about-barefoot-mystic",
            "title": "About The Barefoot Mystic",
            "description": "The Barefoot Mystic works as a frequency activator and healer dedicated to bridging quantum fields, sacred geometry, and multidimensional consciousness.",
            "url": f"{SITE}/#about",
            "date": "2026-03-21T10:00:00Z",
            "category": "Foundational Transmission",
        },
        {
            "id": "library-portal",
            "title": "Mystic9 Library: Portals of Ancient Wisdom & Quantum Truths",
            "description": "Enter the Green Sun Codex and Yellow Ankh Grimoire. Library chapters of Ancient Wisdom, Sanctuary Practice, Quantum Truths, and Esoteric Mastery.",
            "url": f"{SITE}/#library",
            "date": "2026-03-21T11:00:00Z",
            "category": "Library",
        },
    ]
    for article in articles:
        items.append({
            "id": article["id"],
            "title": article["title"],
            "description": excerpt(article["content"], 320),
            "url": f"{SITE}/share/{article['id']}",
            "date": DATES.get(article["id"], "2026-08-09T09:00:00Z"),
            "category": article["category"],
        })
    return items


def write_rss(items):
    last = rfc822(items[-1]["date"])
    parts = []
    for item in items:
        parts.append(f"""    <item>
      <title>{escape(item['title'])}</title>
      <link>{escape(item['url'])}</link>
      <guid isPermaLink="true">{escape(item['url'])}</guid>
      <pubDate>{rfc822(item['date'])}</pubDate>
      <category>{escape(item['category'])}</category>
      <description>{escape(item['description'])}</description>
    </item>""")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:sy="http://purl.org/rss/1.0/modules/syndication/">
  <channel>
    <title>mystic9.net Transmissions</title>
    <link>{SITE}/</link>
    <description>{escape(DESC)}</description>
    <language>en</language>
    <lastBuildDate>{last}</lastBuildDate>
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>
    <atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <atom:link href="{HUB}" rel="hub"/>
    <image>
      <url>{escape(IMAGE)}</url>
      <title>mystic9.net</title>
      <link>{SITE}/</link>
    </image>
{chr(10).join(parts)}
  </channel>
</rss>
"""
    (ROOT / "feed.xml").write_text(xml, encoding="utf-8")


def write_atom(items):
    updated = items[-1]["date"]
    parts = []
    for item in items:
        parts.append(f"""  <entry>
    <id>{escape(item['url'])}</id>
    <title>{escape(item['title'])}</title>
    <updated>{item['date']}</updated>
    <link rel="alternate" href="{escape(item['url'])}"/>
    <category term="{escape(item['category'])}"/>
    <summary>{escape(item['description'])}</summary>
  </entry>""")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>{SITE}/</id>
  <title>mystic9.net Transmissions</title>
  <updated>{updated}</updated>
  <link rel="self" href="{SITE}/atom.xml" type="application/atom+xml"/>
  <link rel="alternate" href="{SITE}/" type="text/html"/>
  <link rel="hub" href="{HUB}"/>
  <subtitle>{escape(DESC)}</subtitle>
  <icon>{escape(IMAGE)}</icon>
  <logo>{escape(IMAGE)}</logo>
{chr(10).join(parts)}
</feed>
"""
    (ROOT / "atom.xml").write_text(xml, encoding="utf-8")


def write_sitemap(articles):
    rows = []
    for pid, _title in PORTALS:
        loc = f"{SITE}/" if not pid else f"{SITE}/#{pid}"
        changefreq = "daily" if not pid else "weekly"
        priority = "1.0" if not pid else "0.7"
        rows.append(f"""  <url>
    <loc>{escape(loc)}</loc>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>""")
    for article in articles:
        lastmod = DATES.get(article["id"], "2026-08-09T09:00:00Z")[:10]
        loc = f"{SITE}/?article={article['id']}#library"
        rows.append(f"""  <url>
    <loc>{escape(loc)}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>""")
    rows.append(f"""  <url>
    <loc>{SITE}/feed.xml</loc>
    <changefreq>hourly</changefreq>
    <priority>0.5</priority>
  </url>""")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(rows)}
</urlset>
"""
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")


def write_robots():
    (ROOT / "robots.txt").write_text(
        f"""User-agent: *
Allow: /
Disallow: /api/recover
Disallow: /api/config

Sitemap: {SITE}/sitemap.xml
""",
        encoding="utf-8",
    )


def main():
    articles = extract_articles()
    if len(articles) < 7:
        raise SystemExit(f"expected 7 library chapters, found {len(articles)}")
    items = feed_items(articles)
    write_rss(items)
    write_atom(items)
    write_sitemap(articles)
    write_robots()
    print(f"Wrote feed.xml, atom.xml, sitemap.xml, robots.txt ({len(articles)} chapters)")


if __name__ == "__main__":
    main()
