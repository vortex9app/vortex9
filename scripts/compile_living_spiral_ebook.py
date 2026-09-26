#!/usr/bin/env python3
"""Compile The Living Spiral of Nine from NEW BOOK.docx. Article body text is not rewritten."""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

from docx import Document
from PIL import Image
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "NEW BOOK.docx"
INDEX = ROOT / "index.html"
OUT = ROOT / "public" / "downloads" / "living-spiral-of-nine-ebook.pdf"
GRAIN = ROOT / "public" / "downloads" / "_grain_tile.png"

CHARCOAL = HexColor("#121212")
GOLD = HexColor("#e6c865")
GOLD_DIM = HexColor("#c4a44a")
TURQ = HexColor("#00fa9a")
SLATE = HexColor("#94a3b8")
BODY = HexColor("#e0e0e0")
MUTED = HexColor("#cbd5e1")

CHAPTER_TITLES = [
    "The Architecture of Energetic Sovereignty: The Sacred Art of Energy Protection",
    "The Anchor and the Storm: Deep Grounding as Sovereign Armor in Spiritual Warfare",
    "The Quantum Tapestry: Entanglement, Resonance, and Sacred Connections Across the Digital Grid",
    "The Sovereign Blueprint: Commanding Your Frequency within the Living Grid",
    "The Alchemy of the Void: Sacred Isolation and the Great Shedding of the Soul",
    "The Unseen Parasites: Energetic Hygiene, Intimacy, and the Mastery of Auric Boundaries",
    "The Quantum Weaver: Manifesting Your True-Life Path and the Esoteric Laws of Creation",
    "The Architecture of the Oversoul: Your Divine Double and the Cosmic Blueprint",
    "Navigating the Astral Lattice: Decoding Hidden Instructions and Architecture in the Dream Realm",
    "The Seven Wheels of Light: Mapping and Balancing the Chakra System for Sovereign Living",
    "The Architecture of the Un-woken: Navigating NPCs, Script-Runners, and Monitoring Spirits",
]

ALT_TITLES = {
    "The Architecture of the Unwoken: Navigating NPCs, Script-Runners, and Monitoring Spirits": CHAPTER_TITLES[10],
    "The Quantum Weaver: Manifesting Your True Life Path and the Esoteric Laws of Creation": CHAPTER_TITLES[6],
}

INTRO_PARAS = [
    "Nine is not a quantity you tally. It is a living spiral, a returning current that completes itself only to begin again at a higher octave. These transmissions were first spoken into the Green Sun Codex of mystic9.net, then gathered here as one vessel so a seeker may walk the whole circuit without scattering.",
    "You hold a field map, not a souvenir. The chapters follow the Codex as it lives in the Digital Sanctuary: from the architecture of energetic sovereignty, through grounding, digital entanglement, decree, the void, auric hygiene, manifestation, the Oversoul, the dream lattice, the seven wheels of light, and the map of the unwoken. Read them in sequence if the body is willing. Return to the one that rings if the field insists.",
    "I write as The Barefoot Mystic, with soil on the soles and a vertical column of quiet gold. This book is a sovereign companion to the sanctuary. Let it sit beside the living site, the radio, the pendulum, and the library. Frequency precedes form. Walk slowly. Seal your membrane. Keep your roots.",
]

OUTRO_PARAS = [
    "The spiral does not end on a last page. It returns you to the first morning seal, to the earth under the feet, to the quiet yes in the bones. If these chapters have done their work, you will not collect them. You will inhabit them.",
    "Carry the torus. Drop the centre of gravity when the storm arrives. Treat the screen as a scrying glass only when your threshold is clean. Speak decree without theatre. Honour the void when the old life falls away. Keep the temple of the aura. Weave from soul rather than lack. Listen for the Oversoul's single true sentence. Walk the night lattice with hygiene. Tend the seven wheels. Recognise script-runners without contempt.",
    "Then return to mystic9.net, to the Green Sun Codex, and to the living instruments of the sanctuary. The book is a still photograph of a moving current. The sanctuary is the current. You are the node. Nine completes. Nine begins.",
]


def xml_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )


def register_fonts() -> tuple[str, str, str]:
    windir = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
    candidates = {
        "body": ["georgia.ttf", "Georgia.ttf"],
        "bold": ["georgiab.ttf", "Georgia Bold.ttf"],
        "italic": ["georgiai.ttf", "Georgia Italic.ttf"],
    }
    names = {}
    for key, files in candidates.items():
        path = next((windir / f for f in files if (windir / f).exists()), None)
        if not path:
            raise SystemExit(f"Missing font for {key} in {windir}")
        font_name = f"Mystic{key.title()}"
        pdfmetrics.registerFont(TTFont(font_name, str(path)))
        names[key] = font_name
    return names["body"], names["bold"], names["italic"]


def make_grain(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (256, 256), (18, 18, 18))
    px = img.load()
    seed = 9
    for y in range(256):
        for x in range(256):
            seed = (1103515245 * seed + 12345 + x * 17 + y * 31) & 0x7FFFFFFF
            n = seed % 18
            v = 18 + n
            px[x, y] = (v, v, v)
    img.save(path)


def match_title(text: str) -> str | None:
    raw = text.strip()
    for title in CHAPTER_TITLES:
        if raw == title or raw.startswith(title):
            return title
    for alt, canonical in ALT_TITLES.items():
        if raw == alt or raw.startswith(alt):
            return canonical
    return None


def is_skip(text: str) -> bool:
    t = text.strip()
    return t.startswith("Here is ") or t.startswith("Here is your")


HEADING_MAX = 140
SECTION_BREAK = re.compile(
    r'(?=(?:Introduction:|Conclusion:|(?<![IVXL0-9])(?:[IVXL]+|[0-9]+)\.\s+[A-Z]))'
)
ARTIFACT_PARAS = {"i", "1", "i.", "1.", "|", "l"}


def is_plain_section_heading(text: str) -> bool:
    t = text.strip()
    if len(t) > 80 or len(t) < 12:
        return False
    if t.endswith((".", "!", "?")):
        return False
    if ". " in t:
        return False
    if ":" in t:
        after = t.split(":", 1)[1].strip()
        if len(after.split()) > 8:
            return False
        if after and after[0].islower():
            return False
    words = re.findall(r"[A-Za-z']+", t)
    if len(words) < 2:
        return False
    return all(w[0].isupper() or w.lower() in TITLE_GLUE for w in words)


def is_heading(text: str) -> bool:
    t = text.strip()
    if len(t) > HEADING_MAX:
        return False
    if re.match(r"^(Introduction:|Conclusion:)", t):
        return True
    if re.match(r"^([IVXL]+)\.\s+\S", t):
        return True
    if re.match(r"^([0-9]+)\.\s+\S", t):
        rest = t.split(".", 1)[-1].strip()
        if rest.endswith(".") or ". " in rest:
            return False
        return True
    return is_plain_section_heading(t)


TITLE_GLUE = {
    "a", "an", "the", "of", "and", "as", "for", "in", "to", "or", "without",
    "into", "from", "with", "on", "at", "by", "vs", "versus",
}


def peel_section_heading(text: str) -> list[str]:
    """Split a mashed heading+body paragraph without rewriting words."""
    m = re.match(r"^((?:Introduction|Conclusion):\s+|[IVXL]+\.\s+)", text)
    if not m or len(text) < 80:
        return [text]
    prefix = m.group(1)
    words = text[m.end():].split(" ")
    if len(words) < 4:
        return [text]
    taken: list[str] = []
    for i, word in enumerate(words):
        taken.append(word)
        if i < 2 or i + 1 >= len(words):
            continue
        cur = re.sub(r"[^A-Za-z]", "", word)
        nxt = re.sub(r"[^A-Za-z]", "", words[i + 1])
        if not cur or not nxt:
            continue
        if cur[0].isupper() and nxt[0].islower() and nxt.lower() not in TITLE_GLUE:
            head = (prefix + " ".join(taken[:-1])).strip()
            body = " ".join(words[i:]).strip()
            if 18 <= len(head) <= HEADING_MAX and len(body) > 40:
                return [head, body]
            break
    return [text]


def expand_mashed_paragraphs(paras: list[str]) -> list[str]:
    """Restore section breaks in a mashed Word paragraph without changing words."""
    out: list[str] = []
    for para in paras:
        text = para.strip()
        if text.lower() in ARTIFACT_PARAS:
            continue
        if len(text) < 280 or not SECTION_BREAK.search(text[1:]):
            out.extend(peel_section_heading(text) if len(text) > 80 else [text])
            continue
        parts = [piece.strip() for piece in SECTION_BREAK.split(text) if piece.strip()]
        for part in parts:
            if part.lower() in ARTIFACT_PARAS:
                continue
            out.extend(peel_section_heading(part) if len(part) > 80 else [part])
    cleaned = []
    for item in out:
        if item.lower() in ARTIFACT_PARAS:
            continue
        cleaned.append(item)
    return cleaned


def extract_oversoul(index_html: str) -> list[str]:
    start = index_html.find("id: 'architecture-of-the-oversoul'")
    if start < 0:
        raise SystemExit("Could not locate Oversoul transmission in index.html")
    marker = "content: `"
    cstart = index_html.find(marker, start)
    if cstart < 0:
        raise SystemExit("Could not locate Oversoul content block")
    rest = index_html[cstart + len(marker):]
    end = rest.find("`")
    if end < 0:
        raise SystemExit("Unclosed Oversoul content block")
    body = rest[:end].replace("\\`", "`")
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    if paras and paras[0].startswith("The Architecture of the Oversoul"):
        paras = paras[1:]
    return paras


def extract_chapters() -> list[dict]:
    if not DOCX.exists():
        raise SystemExit(f"Missing {DOCX}")
    doc = Document(str(DOCX))
    buckets: dict[str, list[str]] = {t: [] for t in CHAPTER_TITLES}
    current = None
    for para in doc.paragraphs:
        text = para.text
        if not text.strip():
            continue
        if is_skip(text):
            continue
        title = match_title(text)
        if title:
            current = title
            remainder = text.strip()
            if remainder.startswith(title):
                remainder = remainder[len(title) :].strip()
            else:
                for alt, canonical in ALT_TITLES.items():
                    if canonical == title and remainder.startswith(alt):
                        remainder = remainder[len(alt) :].strip()
                        break
            if remainder:
                buckets[title].append(remainder)
            continue
        if current:
            buckets[current].append(text.strip())

    index_html = INDEX.read_text(encoding="utf-8")
    if not buckets[CHAPTER_TITLES[7]]:
        buckets[CHAPTER_TITLES[7]] = extract_oversoul(index_html)

    chapters = []
    for i, title in enumerate(CHAPTER_TITLES, start=1):
        body = expand_mashed_paragraphs(buckets[title])
        if not body:
            raise SystemExit(f"Empty chapter: {title}")
        chapters.append({"n": i, "title": title, "paras": body})
    return chapters


def draw_frame(c, w, h, inset=12):
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.15)
    c.roundRect(inset, inset, w - inset * 2, h - inset * 2, 8, stroke=1, fill=0)
    c.setStrokeColor(TURQ)
    c.setLineWidth(0.4)
    c.setFillColor(Color(0, 0, 0, alpha=0))
    c.roundRect(inset + 5, inset + 5, w - (inset + 5) * 2, h - (inset + 5) * 2, 6, stroke=1, fill=0)


def draw_ankh(c, x, y, s=1.0):
    c.saveState()
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.8 * s)
    c.setLineCap(1)
    c.circle(x, y + 10 * s, 6.2 * s, stroke=1, fill=0)
    c.line(x, y + 3.8 * s, x, y - 16 * s)
    c.line(x - 9 * s, y - 4 * s, x + 9 * s, y - 4 * s)
    c.restoreState()


def draw_seals_row(c, cx, y):
    labels = [
        ("Lineage", "Barefoot Mystic Authorship"),
        ("Privacy", "Sovereign Field Hygiene"),
        ("Node", "Independent Autonomous Node"),
    ]
    gap = 78
    start = cx - gap
    for i, (name, sub) in enumerate(labels):
        x = start + i * gap
        c.setStrokeColor(GOLD if i != 1 else TURQ)
        c.setFillColor(HexColor("#16161c"))
        c.setLineWidth(1)
        c.circle(x, y, 16, stroke=1, fill=1)
        c.setStrokeColor(TURQ)
        c.setLineWidth(0.5)
        c.circle(x, y, 12.5, stroke=1, fill=0)
        if i == 0:
            draw_ankh(c, x, y - 1, 0.55)
        elif i == 1:
            c.setStrokeColor(GOLD)
            c.roundRect(x - 5, y - 5, 10, 8, 1.2, stroke=1, fill=0)
            c.arc(x - 4, y + 1, x + 4, y + 9, 0, 180)
        else:
            c.setStrokeColor(GOLD)
            c.circle(x, y, 4.5, stroke=1, fill=0)
            c.setFillColor(TURQ)
            c.circle(x, y, 1.6, stroke=0, fill=1)
        c.setFillColor(GOLD)
        c.setFont("MysticBold", 6.2)
        c.drawCentredString(x, y - 26, name.upper())
        c.setFillColor(SLATE)
        c.setFont("MysticBody", 5.4)
        c.drawCentredString(x, y - 34, sub)


def page_backdrop(c, doc):
    w, h = A4
    c.setFillColor(CHARCOAL)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    if GRAIN.exists():
        c.saveState()
        c.setFillColor(CHARCOAL)
        try:
            c.drawImage(str(GRAIN), 0, 0, width=w, height=h, preserveAspectRatio=False, mask="auto")
            c.setFillColor(Color(18 / 255, 18 / 255, 18 / 255, alpha=0.55))
            c.rect(0, 0, w, h, stroke=0, fill=1)
        except Exception:
            pass
        c.restoreState()
    draw_frame(c, w, h, 14)
    c.setStrokeColor(TURQ)
    c.setLineWidth(0.6)
    c.line(22 * mm, 16 * mm, w - 22 * mm, 16 * mm)
    c.setFillColor(GOLD_DIM)
    c.setFont("MysticBody", 7)
    c.drawString(22 * mm, 11 * mm, "mystic9.net  ·  Yellow Ankh Grimoire")
    c.setFillColor(TURQ)
    c.drawRightString(w - 22 * mm, 11 * mm, str(doc.page))


def cover_page(c, doc):
    w, h = A4
    c.setFillColor(CHARCOAL)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    if GRAIN.exists():
        try:
            c.drawImage(str(GRAIN), 0, 0, width=w, height=h, preserveAspectRatio=False, mask="auto")
            c.setFillColor(Color(18 / 255, 18 / 255, 18 / 255, alpha=0.42))
            c.rect(0, 0, w, h, stroke=0, fill=1)
        except Exception:
            pass
    draw_frame(c, w, h, 18)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.35)
    c.roundRect(28, 28, w - 56, h - 56, 10, stroke=1, fill=0)

    c.setFillColor(TURQ)
    c.setFont("MysticBody", 9)
    c.drawCentredString(w / 2, h - 52 * mm, "YELLOW ANKH GRIMOIRE  ·  MYSTIC9.NET")

    draw_ankh(c, w / 2, h - 72 * mm, 1.8)

    c.setFillColor(GOLD)
    c.setFont("MysticBold", 22)
    title = "The Living Spiral of Nine"
    c.drawCentredString(w / 2, h / 2 + 28, title)
    c.setStrokeColor(TURQ)
    c.setLineWidth(0.8)
    c.line(w / 2 - 52, h / 2 + 16, w / 2 + 52, h / 2 + 16)
    c.setFillColor(MUTED)
    c.setFont("MysticItalic", 12)
    c.drawCentredString(w / 2, h / 2 + 2, "Sovereign Transmissions from the Digital Sanctuary")
    c.setFillColor(GOLD)
    c.setFont("MysticBody", 11)
    c.drawCentredString(w / 2, h / 2 - 28, "Written by The Barefoot Mystic")
    c.setFillColor(SLATE)
    c.setFont("MysticBody", 9)
    c.drawCentredString(w / 2, h / 2 - 48, "Eleven Green Sun Codex transmissions  ·  £7.77 GBP")

    draw_seals_row(c, w / 2, 48 * mm)
    c.setFillColor(TURQ)
    c.setFont("MysticBody", 8)
    c.drawCentredString(w / 2, 28 * mm, "Independent Node  ·  Lineage Seal  ·  Sovereign Privacy")


class TOCParagraph(Paragraph):
    def __init__(self, text, style, toc_label=None):
        self.toc_label = toc_label
        super().__init__(text, style)


class SpiralDoc(BaseDocTemplate):
    def afterFlowable(self, flowable):
        label = getattr(flowable, "toc_label", None)
        if label:
            self.notify("TOCEntry", (0, label, self.page))


def build_styles(body, bold, italic):
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "Kicker", fontName=body, fontSize=8.5, leading=12, textColor=TURQ,
        alignment=TA_CENTER, letterSpacing=1.4, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "FrontTitle", fontName=bold, fontSize=18, leading=24, textColor=GOLD,
        alignment=TA_CENTER, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "ChapterTitle", fontName=bold, fontSize=14, leading=19, textColor=GOLD,
        alignment=TA_LEFT, spaceBefore=4, spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        "PartTitle", fontName=bold, fontSize=14, leading=19, textColor=GOLD,
        alignment=TA_LEFT, spaceBefore=4, spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        "SectionHead", fontName=bold, fontSize=10.5, leading=14, textColor=TURQ,
        alignment=TA_LEFT, spaceBefore=10, spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        "BodyTextJust", fontName=body, fontSize=10, leading=15.2, textColor=BODY,
        alignment=TA_JUSTIFY, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "Meta", fontName=italic, fontSize=9.5, leading=14, textColor=MUTED,
        alignment=TA_CENTER, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "TOCEntry", fontName=body, fontSize=9.2, leading=15, textColor=BODY,
        alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        "FooterNote", fontName=italic, fontSize=8, leading=12, textColor=SLATE,
        alignment=TA_CENTER,
    ))
    toc_level = ParagraphStyle(
        "TOCLevel0", fontName=body, fontSize=9.2, leading=16, textColor=BODY,
        leftIndent=0, firstLineIndent=0, spaceBefore=2, spaceAfter=2,
    )
    return styles, toc_level


def compile_pdf(chapters: list[dict]) -> None:
    make_grain(GRAIN)
    body, bold, italic = register_fonts()
    styles, toc_level = build_styles(body, bold, italic)
    OUT.parent.mkdir(parents=True, exist_ok=True)

    doc = SpiralDoc(
        str(OUT),
        pagesize=A4,
        title="The Living Spiral of Nine: Sovereign Transmissions from the Digital Sanctuary",
        author="The Barefoot Mystic",
        subject="Green Sun Codex compiled transmissions | mystic9.net",
        creator="mystic9.net Yellow Ankh Grimoire",
    )
    w, h = A4
    margin = 22 * mm
    frame = Frame(margin, 20 * mm, w - 2 * margin, h - 38 * mm, id="normal")
    cover_frame = Frame(0, 0, w, h, id="cover")
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=cover_frame, onPage=cover_page),
        PageTemplate(id="interior", frames=frame, onPage=page_backdrop),
    ])

    toc = TableOfContents()
    toc.levelStyles = [toc_level]

    story = [NextPageTemplate("interior"), PageBreak()]
    story += [
        Paragraph("YELLOW ANKH GRIMOIRE", styles["Kicker"]),
        Paragraph("The Living Spiral of Nine", styles["FrontTitle"]),
        Paragraph("Sovereign Transmissions from the Digital Sanctuary", styles["Meta"]),
        Paragraph("Written by The Barefoot Mystic", styles["Meta"]),
        Spacer(1, 8),
        Paragraph(
            xml_escape(
                "First compiled edition. The eleven article bodies are reproduced exactly as prepared for the Green Sun Codex. "
                "UK spellings and original punctuation are retained. Newly written bookends (this notice, the Introduction, and the Outro) are original to this volume."
            ),
            styles["BodyTextJust"],
        ),
        Paragraph(
            xml_escape("Independent Node Emblem · Lineage Seal · Sovereign Privacy  ·  mystic9.net"),
            styles["FooterNote"],
        ),
        Spacer(1, 10),
        Paragraph("Contents", styles["FrontTitle"]),
        toc,
        PageBreak(),
        Paragraph("INTRODUCTION", styles["Kicker"]),
        TOCParagraph("Introduction", styles["PartTitle"], toc_label="Introduction"),
        Paragraph("Crossing the Threshold of Nine", styles["Meta"]),
    ]
    for p in INTRO_PARAS:
        story.append(Paragraph(xml_escape(p), styles["BodyTextJust"]))
    story.append(PageBreak())

    for ch in chapters:
        heading = TOCParagraph(
            xml_escape(f"Chapter {ch['n']}. {ch['title']}"),
            styles["ChapterTitle"],
            toc_label=f"Chapter {ch['n']}. {ch['title']}",
        )
        blocks = [heading]
        for para in ch["paras"]:
            style = styles["SectionHead"] if is_heading(para) else styles["BodyTextJust"]
            blocks.append(Paragraph(xml_escape(para), style))
        story.append(KeepTogether(blocks[:2]))
        for extra in blocks[2:]:
            story.append(extra)
        story.append(PageBreak())

    story += [
        Paragraph("OUTRO", styles["Kicker"]),
        TOCParagraph("Outro", styles["PartTitle"], toc_label="Outro"),
        Paragraph("Nine Completes. Nine Begins.", styles["Meta"]),
    ]
    for p in OUTRO_PARAS:
        story.append(Paragraph(xml_escape(p), styles["BodyTextJust"]))
    story.append(Spacer(1, 16))
    story.append(Paragraph(
        xml_escape("The Barefoot Mystic  ·  mystic9.net  ·  The Living Spiral of Nine"),
        styles["FooterNote"],
    ))

    doc.multiBuild(story)
    try:
        GRAIN.unlink(missing_ok=True)
    except TypeError:
        if GRAIN.exists():
            GRAIN.unlink()


def main() -> int:
    chapters = extract_chapters()
    print("Chapters:")
    for ch in chapters:
        heads = sum(1 for p in ch["paras"] if is_heading(p))
        print(f"  {ch['n']:02d}  {ch['title']}  ({len(ch['paras'])} paras, {heads} heads)")
    compile_pdf(chapters)
    print("Wrote", OUT, "size", OUT.stat().st_size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
