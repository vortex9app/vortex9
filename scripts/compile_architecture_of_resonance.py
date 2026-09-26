#!/usr/bin/env python3
"""Compile The Architecture of Resonance. Interior spelling is not rewritten."""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

from docx import Document
from PIL import Image
from reportlab.lib.colors import Color, HexColor
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
DOCX = ROOT / "Navigating External Static, Script Runners, and the Sovereign Energy Field.docx"
OUT = ROOT / "public" / "downloads" / "The Architecture of Resonance - The Barefoot Mystic.pdf"
BOOK_TITLE = "The Architecture of Resonance: Navigating External Static, Script Runners, and the Sovereign Energy Field"
COVER_TITLE_LINES = (
    "The Architecture of Resonance:",
    "Navigating External Static,",
    "Script Runners, and the",
    "Sovereign Energy Field",
)
GRAIN = ROOT / "public" / "downloads" / "_grain_tile_static.png"

BLACK = HexColor("#000000")
GOLD = HexColor("#e6c865")
GOLD_DIM = HexColor("#c4a44a")
RED = HexColor("#c41e3a")
RED_BRIGHT = HexColor("#ff4136")
BODY = HexColor("#e0e0e0")
MUTED = HexColor("#d4c4a8")

CHAPTER_RE = re.compile(r"^Chapter\s*\d+\s*:", re.I)
BODY_OPENERS = (
    "instead,", "ground ", "open ", "allow ", "drop ", "straighten ",
    "breathe ", "hold ", "alchemize ", "take ", "walk ", "review ",
    "look ", "you ", "we ", "to ", "when ", "this ", "most ", "here ",
    "every ", "consider ", "true ", "let ", "if ", "in ", "for ", "as ",
    "but ", "from ", "no ", "energy ", "welcome ", "may this ",
    "pause", "having ", "nothing ", "the concepts",
)


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
        font_name = f"Static{key.title()}"
        pdfmetrics.registerFont(TTFont(font_name, str(path)))
        names[key] = font_name
    return names["body"], names["bold"], names["italic"]


def make_grain(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (256, 256), (0, 0, 0))
    px = img.load()
    seed = 11
    for y in range(256):
        for x in range(256):
            seed = (1103515245 * seed + 12345 + x * 17 + y * 31) & 0x7FFFFFFF
            n = seed % 22
            v = n
            px[x, y] = (v, v, v)
    img.save(path)


def is_source_toc(text: str) -> bool:
    t = text.strip()
    if t.startswith(("\uf0b7", "", "•", "- ")):
        return True
    stripped = t.lstrip("\uf0b7•- ").strip()
    if stripped.startswith("Focus:"):
        return True
    if CHAPTER_RE.match(stripped) and "(Part" not in stripped:
        return True
    return False


def is_major_heading(text: str) -> bool:
    t = text.strip()
    if CHAPTER_RE.match(t):
        return True
    if t == "Important Notice & Disclaimer":
        return True
    if t.startswith("Afterword:"):
        return True
    if t == "A Solemn Vow of Sovereignty":
        return True
    return False


def is_section_heading(text: str) -> bool:
    t = text.strip()
    if is_major_heading(t) or is_source_toc(t):
        return False
    if t == BOOK_TITLE:
        return False
    if len(t) < 12 or len(t) > 96:
        return False
    if t.endswith((".", "!", "?", ":")):
        return False
    if t[0].islower():
        return False
    low = t.lower()
    if any(low.startswith(op) for op in BODY_OPENERS):
        return False
    return True


def is_any_heading(text: str) -> bool:
    return is_major_heading(text) or is_section_heading(text)


def toc_label(text: str) -> str:
    t = text.strip()
    t = re.sub(r"\s*\(Part\s*\d+\)\s*$", "", t, flags=re.I).strip()
    return t


def load_paragraphs() -> list[str]:
    if not DOCX.exists():
        raise SystemExit(f"Missing {DOCX}")
    doc = Document(str(DOCX))
    paras: list[str] = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text or is_source_toc(text):
            continue
        if text == BOOK_TITLE:
            continue
        paras.append(text)
    if len(paras) < 40:
        raise SystemExit("Source document extracted too few paragraphs")
    return paras


def draw_frame(c, w, h, inset=12):
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.15)
    c.roundRect(inset, inset, w - inset * 2, h - inset * 2, 8, stroke=1, fill=0)
    c.setStrokeColor(RED)
    c.setLineWidth(0.45)
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
        c.setStrokeColor(GOLD if i != 1 else RED_BRIGHT)
        c.setFillColor(HexColor("#080808"))
        c.setLineWidth(1)
        c.circle(x, y, 16, stroke=1, fill=1)
        c.setStrokeColor(RED)
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
            c.setFillColor(RED_BRIGHT)
            c.circle(x, y, 1.6, stroke=0, fill=1)
        c.setFillColor(GOLD)
        c.setFont("StaticBold", 6.2)
        c.drawCentredString(x, y - 26, name.upper())
        c.setFillColor(MUTED)
        c.setFont("StaticBody", 5.4)
        c.drawCentredString(x, y - 34, sub)


def paint_grain(c, w, h, alpha=0.5):
    c.setFillColor(BLACK)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    if GRAIN.exists():
        c.saveState()
        try:
            c.drawImage(str(GRAIN), 0, 0, width=w, height=h, preserveAspectRatio=False, mask="auto")
            c.setFillColor(Color(0, 0, 0, alpha=alpha))
            c.rect(0, 0, w, h, stroke=0, fill=1)
        except Exception:
            pass
        c.restoreState()


def page_backdrop(c, doc):
    w, h = A4
    paint_grain(c, w, h, 0.55)
    draw_frame(c, w, h, 14)
    c.setStrokeColor(RED)
    c.setLineWidth(0.6)
    c.line(22 * mm, 16 * mm, w - 22 * mm, 16 * mm)
    c.setFillColor(GOLD_DIM)
    c.setFont("StaticBody", 7)
    c.drawString(22 * mm, 11 * mm, "mystic9.net  ·  Yellow Ankh Grimoire")
    c.setFillColor(RED_BRIGHT)
    c.drawRightString(w - 22 * mm, 11 * mm, str(doc.page))


def cover_page(c, doc):
    w, h = A4
    paint_grain(c, w, h, 0.42)
    draw_frame(c, w, h, 18)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.35)
    c.roundRect(28, 28, w - 56, h - 56, 10, stroke=1, fill=0)

    c.setFillColor(RED_BRIGHT)
    c.setFont("StaticBody", 9)
    c.drawCentredString(w / 2, h - 48 * mm, "YELLOW ANKH GRIMOIRE  ·  MYSTIC9.NET")
    draw_ankh(c, w / 2, h - 68 * mm, 1.8)

    title_y = h / 2 + 62
    for i, line in enumerate(COVER_TITLE_LINES):
        c.setFillColor(GOLD)
        c.setFont("StaticBold", 16 if i == 0 else 12)
        c.drawCentredString(w / 2, title_y - (i * 18), line)
    rule_y = title_y - (len(COVER_TITLE_LINES) * 18) - 6
    c.setStrokeColor(RED)
    c.setLineWidth(0.9)
    c.line(w / 2 - 58, rule_y, w / 2 + 58, rule_y)
    c.setFillColor(GOLD)
    c.setFont("StaticBody", 11)
    c.drawCentredString(w / 2, rule_y - 28, "Written by The Barefoot Mystic")
    c.setFillColor(MUTED)
    c.setFont("StaticBody", 9)
    c.drawCentredString(w / 2, rule_y - 48, "A sovereign field manual  ·  £11.11 GBP")
    draw_seals_row(c, w / 2, 48 * mm)
    c.setFillColor(RED_BRIGHT)
    c.setFont("StaticBody", 8)
    c.drawCentredString(w / 2, 28 * mm, "Independent Node  ·  Lineage Seal  ·  Sovereign Privacy")


class TOCParagraph(Paragraph):
    def __init__(self, text, style, toc_label=None):
        self.toc_label = toc_label
        super().__init__(text, style)


class StaticDoc(BaseDocTemplate):
    def afterFlowable(self, flowable):
        label = getattr(flowable, "toc_label", None)
        if label:
            self.notify("TOCEntry", (0, label, self.page))


def build_styles(body, bold, italic):
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "Kicker", fontName=body, fontSize=8.5, leading=12, textColor=RED_BRIGHT,
        alignment=TA_CENTER, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "FrontTitle", fontName=bold, fontSize=16, leading=22, textColor=GOLD,
        alignment=TA_CENTER, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "Heading", fontName=bold, fontSize=12, leading=16, textColor=GOLD,
        alignment=TA_LEFT, spaceBefore=12, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "BodyTextJust", fontName=body, fontSize=10, leading=15.4, textColor=BODY,
        alignment=TA_JUSTIFY, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "Meta", fontName=italic, fontSize=9.5, leading=14, textColor=MUTED,
        alignment=TA_CENTER, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "FooterNote", fontName=italic, fontSize=8, leading=12, textColor=GOLD_DIM,
        alignment=TA_CENTER,
    ))
    toc_level = ParagraphStyle(
        "TOCLevel0", fontName=body, fontSize=9.2, leading=16, textColor=BODY,
        leftIndent=0, firstLineIndent=0, spaceBefore=2, spaceAfter=2,
    )
    return styles, toc_level


def compile_pdf(paras: list[str]) -> None:
    make_grain(GRAIN)
    body, bold, italic = register_fonts()
    styles, toc_level = build_styles(body, bold, italic)
    OUT.parent.mkdir(parents=True, exist_ok=True)

    doc = StaticDoc(
        str(OUT),
        pagesize=A4,
        title="The Architecture of Resonance - The Barefoot Mystic",
        author="The Barefoot Mystic",
        subject="Yellow Ankh Grimoire | mystic9.net",
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

    story = [
        NextPageTemplate("interior"),
        PageBreak(),
        Paragraph("YELLOW ANKH GRIMOIRE", styles["Kicker"]),
        Paragraph(xml_escape(BOOK_TITLE), styles["FrontTitle"]),
        Paragraph("Written by The Barefoot Mystic", styles["Meta"]),
        Spacer(1, 8),
        Paragraph("Contents", styles["FrontTitle"]),
        toc,
        PageBreak(),
    ]

    seen_toc: set[str] = set()
    pending: list = []
    for para in paras:
        if is_any_heading(para):
            label = toc_label(para) if is_major_heading(para) else None
            if label:
                if label in seen_toc:
                    label = None
                else:
                    seen_toc.add(label)
            node = TOCParagraph(xml_escape(para), styles["Heading"], toc_label=label)
            if pending:
                story.append(KeepTogether(pending[:2]))
                for extra in pending[2:]:
                    story.append(extra)
                pending = []
            if CHAPTER_RE.match(para.strip()) and "Part 1" in para:
                story.append(PageBreak())
            pending = [node]
        else:
            node = Paragraph(xml_escape(para), styles["BodyTextJust"])
            if pending:
                pending.append(node)
            else:
                story.append(node)
    if pending:
        story.append(KeepTogether(pending[:2]))
        for extra in pending[2:]:
            story.append(extra)

    story.append(Spacer(1, 16))
    story.append(Paragraph(
        xml_escape("The Barefoot Mystic  ·  mystic9.net  ·  The Architecture of Resonance"),
        styles["FooterNote"],
    ))
    doc.multiBuild(story)
    try:
        GRAIN.unlink(missing_ok=True)
    except TypeError:
        if GRAIN.exists():
            GRAIN.unlink()


def main() -> int:
    paras = load_paragraphs()
    heads = sum(1 for p in paras if is_any_heading(p))
    majors = [p for p in paras if is_major_heading(p)]
    print(f"paragraphs={len(paras)} headings={heads} majors={len(majors)}")
    for p in majors:
        print(" ", p[:110])
    compile_pdf(paras)
    print("Wrote", OUT, "size", OUT.stat().st_size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
