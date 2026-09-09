#!/usr/bin/env python3
"""
generate_resume.py

Cross-platform pipeline:  Markdown + CSS  ->  HTML  ->  PDF  ->  reports.

Two separate reports are printed, because they answer different questions:
  * ATS COMPATIBILITY - parse fidelity. Can a machine read the file at all?
  * CONTENT QUALITY   - the writing rules online resume graders check.
A resume can pass the first 100/100 and still fail the second.

Usage:
    python generate_resume.py                 Build the PDF and print both reports.
    python generate_resume.py --ats            Run ATS analysis only, on the PDF that
                                                already exists (no rebuild).
    python generate_resume.py --check          Build the PDF and additionally print an
                                                extracted-text preview for manual review.
    python generate_resume.py --verbose        Print step-by-step pipeline progress.
    python generate_resume.py --output x.pdf   Write the PDF to a custom path.

Pipeline (see README.md for the full write-up):

    resume.md + resume.css
            |
            v
    Markdown -> HTML  (python-markdown: tables, sane_lists, attr_list, smarty)
            |
            v
    HTML + CSS (inlined <style>, @page Letter rules)
            |
            v
    Chromium headless (Playwright) -> PDF   [written to a temp file first]
            |
            v
    PyMuPDF: open temp PDF, sanity-check it (pages > 0, extractable text,
             reasonable page size) -> only then replace the real .pdf
            |
            v
    PyMuPDF: extract text/fonts/layout from the FINAL pdf -> ATS heuristics
            |
            v
    ATS score + content-quality findings printed to the terminal
"""

from __future__ import annotations

import argparse
import collections
import re
import shutil
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DESIGNS_DIR = SCRIPT_DIR / "designs"
OUTPUT_DIR = SCRIPT_DIR / "output"
PDF_NAME = "tejashwasharma_resume.pdf"
RESUME_TITLE = "Tejashwa Sharma - Resume"


# --------------------------------------------------------------------------
# Dependency checks (fail with a clear, actionable message instead of a
# raw ImportError/traceback).
# --------------------------------------------------------------------------

def _missing_dependency(package: str, pip_name: str | None = None) -> None:
    pip_name = pip_name or package
    print(f"ERROR: required Python package '{package}' is not installed.", file=sys.stderr)
    print(f"       Install it with:  python3 -m pip install {pip_name}", file=sys.stderr)
    sys.exit(1)


try:
    import markdown as md_lib
except ImportError:
    _missing_dependency("markdown", "Markdown")

try:
    import fitz  # PyMuPDF
except ImportError:
    _missing_dependency("fitz", "PyMuPDF")

try:
    from playwright.sync_api import Error as PlaywrightError
    from playwright.sync_api import sync_playwright
except ImportError:
    _missing_dependency("playwright", "playwright")


def _check_chromium_installed() -> None:
    """Give a clear install hint if the Playwright browser binary is missing."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            browser.close()
    except PlaywrightError as exc:
        print("ERROR: Playwright's Chromium browser is not installed or failed to launch.", file=sys.stderr)
        print(f"       Details: {exc}", file=sys.stderr)
        print("       Install it with:  python3 -m playwright install chromium", file=sys.stderr)
        sys.exit(1)


# --------------------------------------------------------------------------
# File discovery
# --------------------------------------------------------------------------

DESIGN_CHOICES = ("1", "2")


def resolve_sources(
    design: str,
    md_override: "str | None" = None,
    css_override: "str | None" = None,
) -> tuple[Path, Path, Path]:
    """Return (markdown, stylesheet, default_output_pdf).

    Normal use: a design number picks designs/design-<n>/resume.{md,css} and
    the PDF lands in output/design-<n>/. An explicit --md/--css pair (used by
    the tailoring tool) overrides both and writes the PDF next to the markdown.
    """
    if md_override or css_override:
        if not (md_override and css_override):
            print("ERROR: --md and --css must be given together", file=sys.stderr)
            sys.exit(1)
        md_path = Path(md_override).resolve()
        css_path = Path(css_override).resolve()
        default_pdf = md_path.with_name(PDF_NAME)
    else:
        design_dir = DESIGNS_DIR / f"design-{design}"
        md_path = design_dir / "resume.md"
        css_path = design_dir / "resume.css"
        default_pdf = OUTPUT_DIR / f"design-{design}" / PDF_NAME

    if not md_path.exists():
        print(f"ERROR: resume markdown not found: {md_path}", file=sys.stderr)
        sys.exit(1)
    if not css_path.exists():
        print(f"ERROR: stylesheet not found: {css_path}", file=sys.stderr)
        sys.exit(1)
    return md_path, css_path, default_pdf


# --------------------------------------------------------------------------
# Markdown -> HTML
# --------------------------------------------------------------------------

LIST_ITEM_RE = re.compile(r"^\s*([-*+]|\d+\.)\s+")


def normalize_lists(md_text: str) -> str:
    """Insert a blank line before a list that starts right after a text line.

    python-markdown never lets a list interrupt a paragraph, so a lead-in like
    "**Awards received:**" followed immediately by "- ..." would otherwise be
    swallowed into the paragraph. This only adjusts whitespace between blocks;
    no resume content is added, removed, or reworded.
    """
    out: list[str] = []
    for line in md_text.splitlines():
        prev = out[-1] if out else ""
        starts_list = bool(LIST_ITEM_RE.match(line))
        prev_is_text = bool(prev.strip()) and not LIST_ITEM_RE.match(prev)
        if starts_list and prev_is_text:
            out.append("")
        out.append(line)
    return "\n".join(out) + "\n"


# Classes that describe a whole list, not the item they are written under.
LIST_CLASSES = ("contact", "pills")

LIST_CLASS_RE = re.compile(
    r'<ul>((?:(?!</?ul\b).)*?)<li class="(' + "|".join(LIST_CLASSES) + r')">(.*?)</li>\s*</ul>',
    re.DOTALL,
)


def promote_list_classes(body_html: str) -> str:
    """Move a whole-list class from the last `<li>` up onto its `<ul>`.

    `attr_list` attaches a standalone `{: .contact }` line to the block it
    follows, and inside a list that block is the final item - there is no
    Markdown spelling that targets the `<ul>` itself. So the Markdown writes the
    class under the last bullet and this moves it where the CSS expects it.
    Lists here never nest, so a non-greedy match between `<ul>` and `</ul>` is
    enough.
    """
    def move(match: re.Match) -> str:
        body, cls, last_item = match.group(1), match.group(2), match.group(3)
        return f'<ul class="{cls}">{body}<li>{last_item}</li>\n</ul>'

    return LIST_CLASS_RE.sub(move, body_html)


H2_SPLIT_RE = re.compile(r"(?=<h2\b)")
H2_CLASS_RE = re.compile(r'<h2\b[^>]*\bclass="([^"]*)"')
H2_TAG_RE = re.compile(r"<h2(?P<attrs>[^>]*)>(?P<text>.*?)</h2>", re.DOTALL)
NON_SLUG_RE = re.compile(r"[^a-z0-9]+")


def add_section_slugs(body_html: str) -> str:
    """Give every `<h2>` a `sec-<slug>` class derived from its own text.

    That is what the stylesheet hooks each section icon onto, so the choice of
    icon stays in the CSS and the Markdown headings stay plain prose - renaming
    a section in the Markdown is all it takes to move its icon with it.
    """
    def tag(match: re.Match) -> str:
        attrs, text = match.group("attrs"), match.group("text")
        slug = NON_SLUG_RE.sub("-", re.sub(r"<[^>]+>", "", text).lower()).strip("-")
        if not slug:
            return match.group(0)
        existing = re.search(r'\bclass="([^"]*)"', attrs)
        if existing:
            attrs = attrs.replace(existing.group(0), f'class="{existing.group(1)} sec-{slug}"')
        else:
            attrs = f'{attrs} class="sec-{slug}"'
        return f"<h2{attrs}>{text}</h2>"

    return H2_TAG_RE.sub(tag, body_html)


def apply_layout(body_html: str) -> str:
    """Route each `## Section` into the two-column page-1 grid or a full-width block.

    The Markdown stays a flat list of sections - readable on its own - and the
    column each one lands in is declared next to its heading with `attr_list`:

        ## Core Competencies {: .aside }   -> right-hand sidebar on page 1
        ## Work Experience {: .full }      -> full-width block (its own page)
        ## Profile Summary                 -> left-hand main column (the default)

    The class must sit inline on the heading line: a standalone `{: .aside }`
    line under a heading is parsed as a paragraph, not as the heading's attrs.

    Everything before the first `<h2>` (name, title, contact, objective) becomes
    the masthead above the grid. Section order is preserved within each column.
    """
    chunks = H2_SPLIT_RE.split(body_html)
    if not chunks:
        return body_html

    masthead = chunks[0] if not chunks[0].lstrip().startswith("<h2") else ""
    sections = chunks[1:] if masthead else chunks

    main: list[str] = []
    side: list[str] = []
    full: list[str] = []
    for section in sections:
        match = H2_CLASS_RE.search(section)
        classes = match.group(1).split() if match else []
        if "full" in classes:
            full.append(section)
        elif "aside" in classes:
            side.append(section)
        else:
            main.append(section)

    parts = []
    if masthead.strip():
        parts.append(f'<header class="masthead">\n{masthead.strip()}\n</header>')
    if main or side:
        parts.append(
            '<div class="layout">\n'
            f'<div class="column column-main">\n{"".join(main)}</div>\n'
            f'<aside class="column column-side">\n{"".join(side)}</aside>\n'
            "</div>"
        )
    if full:
        parts.append(f'<div class="fullwidth">\n{"".join(full)}</div>')

    return "\n".join(parts)


def render_html(md_path: Path, css_path: Path, title: str) -> str:
    md_text = md_path.read_text(encoding="utf-8")
    if not md_text.strip():
        print(f"ERROR: {md_path} is empty.", file=sys.stderr)
        sys.exit(1)

    body_html = apply_layout(add_section_slugs(promote_list_classes(md_lib.markdown(
        normalize_lists(md_text),
        extensions=["tables", "sane_lists", "attr_list", "smarty"],
    ))))
    css_text = css_path.read_text(encoding="utf-8")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
{css_text}
</style>
</head>
<body>
{body_html}
</body>
</html>
"""


# --------------------------------------------------------------------------
# HTML -> PDF (Playwright / headless Chromium)
# --------------------------------------------------------------------------

def html_to_pdf(html: str, out_pdf: Path, verbose: bool = False) -> None:
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_html = Path(tmp_dir) / "resume.html"
        tmp_html.write_text(html, encoding="utf-8")

        if verbose:
            print(f"  [render] wrote intermediate HTML -> {tmp_html}")

        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                page = browser.new_page()
                page.goto(tmp_html.as_uri())
                page.wait_for_load_state("load")
                page.pdf(
                    path=str(out_pdf),
                    print_background=True,
                    prefer_css_page_size=True,  # honor @page size/margin in the CSS
                )
                if verbose:
                    print(f"  [render] Chromium wrote PDF -> {out_pdf}")
            finally:
                browser.close()


# --------------------------------------------------------------------------
# PDF validation
# --------------------------------------------------------------------------

class ValidationError(Exception):
    pass


def validate_pdf(pdf_path: Path, verbose: bool = False) -> "fitz.Document":
    try:
        doc = fitz.open(pdf_path)
    except Exception as exc:  # noqa: BLE001
        raise ValidationError(f"could not open generated PDF: {exc}") from exc

    if doc.page_count < 1:
        raise ValidationError("generated PDF has zero pages")

    total_chars = 0
    for page in doc:
        total_chars += len(page.get_text("text"))

    if total_chars < 200:
        raise ValidationError(
            f"generated PDF has suspiciously little extractable text ({total_chars} chars) "
            "- it may have rendered as blank or image-only"
        )

    if verbose:
        print(f"  [validate] pages={doc.page_count} extractable_chars={total_chars}")

    return doc


# --------------------------------------------------------------------------
# ATS heuristic scoring
#
# This is NOT a real ATS (Workday/Greenhouse/Lever/Taleo, etc.) score.
# It is a transparent, rule-based approximation of "how likely is a typical
# resume parser to extract this content correctly", documented here and in
# README.md. The 100 points are split as:
#
#   20 pts  Text extraction & PDF integrity
#   15 pts  Contact information detected (email / phone / links)
#   20 pts  Standard section headings detected
#   15 pts  Work experience & education content detected
#   15 pts  Reading order / low text fragmentation (column & block layout)
#   15 pts  Formatting sanity (fonts, page count, content-in-bounds)
# --------------------------------------------------------------------------

SECTION_HEADINGS = {
    "profile": ["profile", "summary", "objective"],
    "experience": ["work experience", "experience", "employment"],
    "education": ["education"],
    "skills": ["skills", "core skills", "technologies"],
}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(\+?\d[\d\s().-]{7,}\d)")
LINK_RE = re.compile(r"(linkedin\.com|github\.com|https?://)", re.IGNORECASE)
DATE_RANGE_RE = re.compile(
    r"(19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|Present|present)"
)
DEGREE_RE = re.compile(
    r"(Bachelor|Master|B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|University|College|Institute)",
    re.IGNORECASE,
)


def analyze_ats(doc: "fitz.Document", verbose: bool = False) -> dict:
    pages_text = [page.get_text("text") for page in doc]
    full_text = "\n".join(pages_text)
    lower_text = full_text.lower()
    total_chars = len(full_text)

    warnings: list[str] = []
    breakdown: dict[str, dict] = {}

    # --- 1. Text extraction & PDF integrity (20) --------------------------
    pts = 0
    if total_chars > 0:
        pts += 8
    if total_chars >= 1500:
        pts += 6
    elif total_chars >= 500:
        pts += 3
    else:
        warnings.append("Extracted text is short for a multi-section resume; verify no content is image-only.")
    empty_pages = [i + 1 for i, t in enumerate(pages_text) if len(t.strip()) < 20]
    if not empty_pages:
        pts += 6
    else:
        warnings.append(f"Page(s) {empty_pages} contain almost no extractable text (possible image-only content).")
    breakdown["Text extraction"] = {"score": pts, "max": 20}

    # --- 2. Contact information (15) --------------------------------------
    pts = 0
    email_found = bool(EMAIL_RE.search(full_text))
    phone_found = bool(PHONE_RE.search(full_text))
    link_found = bool(LINK_RE.search(full_text))
    pts += 5 if email_found else 0
    pts += 5 if phone_found else 0
    pts += 5 if link_found else 0
    if not email_found:
        warnings.append("No email address detected in extracted text.")
    if not phone_found:
        warnings.append("No phone number detected in extracted text.")
    if not link_found:
        warnings.append("No LinkedIn/GitHub/portfolio link detected in extracted text.")
    breakdown["Contact information"] = {"score": pts, "max": 15}

    # --- 3. Section headings (20) ------------------------------------------
    pts = 0
    detected_sections = []
    for section, keywords in SECTION_HEADINGS.items():
        if any(kw in lower_text for kw in keywords):
            pts += 5
            detected_sections.append(section)
        else:
            warnings.append(f"Could not detect a '{section}' section heading in extracted text.")
    breakdown["Section detection"] = {"score": pts, "max": 20}

    # --- 4. Work experience & education content (15) ------------------------
    pts = 0
    date_ranges = DATE_RANGE_RE.findall(full_text)
    if date_ranges:
        pts += 7
    else:
        warnings.append("No recognizable employment/education date ranges (e.g. '2022 - 2024') detected.")
    if DEGREE_RE.search(full_text):
        pts += 8
    else:
        warnings.append("No recognizable degree/institution keywords detected.")
    breakdown["Work & education content"] = {"score": pts, "max": 15}

    # --- 5. Reading order / fragmentation (15) ------------------------------
    pts = 15
    col_warning = None
    x_positions = []
    for page in doc:
        blocks = page.get_text("blocks")
        for b in blocks:
            text = b[4].strip()
            if text:
                x_positions.append(round(b[0]))
    if x_positions:
        # crude column heuristic: cluster left-edges into buckets 40pt wide
        buckets = sorted(set(x // 40 for x in x_positions))
        distinct_left_margins = len(buckets)
        if distinct_left_margins > 4:
            pts -= 8
            col_warning = "Content may use a multi-column layout, which can reduce compatibility with some ATS parsers."
    if col_warning:
        warnings.append(col_warning)
    # fragmentation check: many very short text blocks relative to total chars
    total_blocks = sum(len(page.get_text("blocks")) for page in doc)
    if total_chars > 0 and total_blocks > 0 and (total_chars / total_blocks) < 8:
        pts -= 5
        warnings.append("Extracted text is broken into many short fragments, which can confuse simple ATS parsers.")
    pts = max(pts, 0)
    breakdown["Reading order"] = {"score": pts, "max": 15}

    # --- 6. Formatting sanity (15) ------------------------------------------
    pts = 15
    if doc.page_count > 3:
        pts -= 5
        warnings.append(f"PDF has {doc.page_count} pages; consider trimming to 1-2 for most roles.")
    page0 = doc[0]
    fonts = page0.get_fonts(full=True)
    non_embedded = [f for f in fonts if f[3] == "" and not f[4]]  # weak heuristic, informational only
    if verbose:
        print(f"  [ats] fonts on page 1: {[f[3] or f[4] for f in fonts]}")
    # content-in-bounds check
    page_rect = page0.rect
    out_of_bounds = False
    for b in page0.get_text("blocks"):
        if b[0] < -1 or b[1] < -1 or b[2] > page_rect.width + 1 or b[3] > page_rect.height + 1:
            out_of_bounds = True
            break
    if out_of_bounds:
        pts -= 10
        warnings.append("Some content appears to render outside the printable page area.")
    breakdown["Formatting"] = {"score": max(pts, 0), "max": 15}

    total_score = sum(v["score"] for v in breakdown.values())
    total_max = sum(v["max"] for v in breakdown.values())

    return {
        "score": total_score,
        "max": total_max,
        "breakdown": breakdown,
        "warnings": warnings,
        "total_chars": total_chars,
        "page_count": doc.page_count,
        "detected_sections": detected_sections,
    }


# --------------------------------------------------------------------------
# Content-quality checks
#
# The ATS score above is a PARSE-FIDELITY check: can a machine read the file.
# It is deliberately lenient, and a resume can pass it 100/100 while scoring
# badly on the tools people actually paste their resume into.
#
# Most products marketed as an "ATS score" are one of two other things:
#
#   1. JD-match scorers - keyword overlap against a specific job description.
#      Nothing in a resume file can fix a low score there; you tailor per
#      application. Out of scope for this script.
#   2. Content graders - rule checks on the writing itself. Those rules are
#      public and mechanical, so they ARE worth checking here.
#
# This section implements (2). It reports findings only; it never rewrites
# the Markdown, and it deliberately produces no score out of 100 - a second
# number would just invite the same false confidence as the first one.
# --------------------------------------------------------------------------

# Bullets should open on a strong verb. Graders check the first word, so a
# bold category label ("RBAC & onboarding: led ...") reads as a noun and is
# marked down however good the content behind it is.
ACTION_VERBS = {
    "added", "architected", "authored", "automated", "built", "conducted",
    "created", "cut", "delivered", "deployed", "designed", "developed",
    "drove", "eliminated", "expanded", "extended", "grew", "hardened",
    "implemented", "improved", "increased", "introduced", "launched", "led",
    "maintained", "managed", "mentored", "migrated", "modernized", "owned",
    "partnered", "presented", "prototyped", "reduced", "redesigned",
    "refactored", "removed", "replaced", "resolved", "scaled", "shipped",
    "simplified", "split", "streamlined", "unified",
}

MAX_BULLET_WORDS = 30      # common grader cap; ~2 rendered lines
MAX_VERB_REPEATS = 2       # same bullet opener reused more than this reads as repetitive

# A bullet counts as quantified if it carries a digit or a spelled-out
# quantity. "Zero findings" and "doubled throughput" are results; "improving
# scalability" is not.
QUANTITY_RE = re.compile(
    r"\d|\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|"
    r"dozens?|hundreds?|thousands?|millions?|billions?|doubled|tripled|halved)\b",
    re.IGNORECASE,
)
MIN_RESUME_WORDS = 400
MAX_RESUME_WORDS = 800

# Section names graders match on. Each tuple is (label, accepted headings).
CANONICAL_SECTIONS = [
    ("Summary", {"summary", "profile", "profile summary", "objective", "about"}),
    ("Experience", {"experience", "work experience", "employment", "employment history"}),
    ("Education", {"education"}),
    ("Skills", {"skills", "core skills", "technical skills", "technologies"}),
]


# A lead-in ending in ":" introduces a list, but not every such list is an
# inventory. The template groups genuine achievement bullets under labels like
# "Session Governance & Security:", and those must still face the verb/length
# rules; only these subjects name a list of items rather than accomplishments.
INVENTORY_LEAD_INS = re.compile(
    r"\b(award|recognition|certification|honou?r|publication|patent|"
    r"language|tool|technolog|client)s?\b",
    re.IGNORECASE,
)


def is_inventory_lead_in(lead_in: str) -> bool:
    """True for "Awards received:" - false for a grouping label like
    "Platform Scale, Observability & Reliability:"."""
    return lead_in.endswith(":") and bool(INVENTORY_LEAD_INS.search(lead_in))


def is_section_heading(text: str) -> bool:
    """True for a standalone ALL-CAPS section name ("WORK EXPERIENCE").

    The company bands in this template are ALL-CAPS too
    ("CONTENTSTACK INDIA PVT. LTD. | Pune, India - Remote"), and treating one
    as a section would relabel every bullet under it and drop it out of the
    Experience checks. A real section name is short and carries no separator.
    """
    if "|" in text or len(text) > 40:
        return False
    return text == text.upper() and any(c.isalpha() for c in text)


def extract_bullets(doc: "fitz.Document") -> list[dict]:
    """Rebuild bullets from the PDF, using layout rather than text alone.

    Reading the text layer line by line is not enough: a wrapped bullet and
    the company heading that follows the list look identical as strings. The
    left edge separates them cleanly - body text sits at the page margin,
    a bullet is indented, and its wrapped continuation is indented further
    still - so a bullet is closed by the first line at or left of the margin.

    Returns one dict per bullet: {"text", "section", "itemized"}, where
    section is the enclosing ALL-CAPS heading and itemized marks a list
    introduced by a lead-in line ending in ":" ("Awards received:"). Those
    are inventories, not achievement bullets, so the verb check skips them.
    """
    bullets: list[dict] = []
    # Section, lead-in and the open bullet all carry ACROSS pages: page 2 of
    # a resume rarely repeats the "EXPERIENCE" heading, and a bullet can wrap
    # over the page break.
    section = ""
    lead_in = ""
    current: dict | None = None

    for page in doc:
        lines = []
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                text = "".join(s["text"] for s in line["spans"]).strip()
                if text:
                    lines.append((line["bbox"][0], line["bbox"][1], text))
        lines.sort(key=lambda l: (round(l[1]), l[0]))
        if not lines:
            continue

        margin = min(x for x, _, _ in lines)

        for x0, _, text in lines:
            is_bullet = text.startswith("•")
            # A section heading is recognised wherever it sits: this template
            # indents them to clear their icon, so an x-position test alone
            # would read "WORK EXPERIENCE" as the wrapped tail of the bullet
            # above it and leave every following bullet in the wrong section.
            is_heading = not is_bullet and is_section_heading(text)
            # Indented and neither: a wrapped continuation line.
            if current is not None and not is_bullet and not is_heading and x0 > margin + 2:
                current["text"] += " " + text
                continue
            if current is not None:
                bullets.append(current)
                current = None

            if is_bullet:
                current = {
                    "text": text.lstrip("•").strip(),
                    "section": section,
                    "itemized": is_inventory_lead_in(lead_in),
                }
            elif is_heading:
                section = text
                lead_in = ""
            elif x0 <= margin + 2:
                lead_in = text

    if current is not None:
        bullets.append(current)
    return [b for b in bullets if b["text"]]


def analyze_content(doc: "fitz.Document") -> list[tuple[str, str, str]]:
    """Return [(status, check, detail)] where status is 'ok' or 'warn'."""
    pages_text = [page.get_text("text") for page in doc]
    full_text = "\n".join(pages_text)
    lines = [l.strip() for l in full_text.splitlines() if l.strip()]
    findings: list[tuple[str, str, str]] = []

    # Achievement bullets only: the entries under EDUCATION / CERTIFICATIONS
    # and inventories like "Awards received:" are not achievement claims, and
    # graders do not hold them to the same verb/length rules.
    all_bullets = extract_bullets(doc)
    bullets = [b["text"] for b in all_bullets
               if not b["itemized"] and "EXPERIENCE" in b["section"].upper()]

    # --- Bullets reached the text layer at all ----------------------------
    # No bullet characters usually means the markers were rendered as
    # graphics (a CSS ::marker, or an icon font). The page looks bulleted
    # but a parser sees an undifferentiated wall of paragraphs.
    if not bullets:
        findings.append(("warn", "Bullets",
                         "no bullet characters found in the Experience section - markers may be "
                         "rendered as graphics, leaving a parser with unstructured paragraphs"))
        return findings + _document_level_findings(full_text, lines)

    # --- Bullet length ----------------------------------------------------
    long_bullets = [b for b in bullets if len(b.split()) > MAX_BULLET_WORDS]
    if bullets and not long_bullets:
        longest = max(len(b.split()) for b in bullets)
        findings.append(("ok", "Bullet length",
                         f"all {len(bullets)} experience bullets within {MAX_BULLET_WORDS} words "
                         f"(longest {longest})"))
    elif long_bullets:
        worst = max(long_bullets, key=lambda b: len(b.split()))
        findings.append(("warn", "Bullet length",
                         f"{len(long_bullets)} of {len(bullets)} bullets exceed {MAX_BULLET_WORDS} words "
                         f"(longest {len(worst.split())}): \"{worst[:60]}...\""))

    # --- Action-verb openings ---------------------------------------------
    def opens_on_verb(bullet: str) -> bool:
        first = re.split(r"[^A-Za-z]+", bullet.strip(), maxsplit=1)[0].lower()
        return first in ACTION_VERBS or (first.endswith("ed") and len(first) > 4)

    weak = [b for b in bullets if not opens_on_verb(b)]
    if bullets and not weak:
        findings.append(("ok", "Action-verb openings",
                         f"all {len(bullets)} experience bullets open on a verb"))
    elif weak:
        findings.append(("warn", "Action-verb openings",
                         f"{len(weak)} bullet(s) do not open on an action verb, "
                         f"e.g. \"{weak[0][:60]}...\""))

    # --- Verb variety -----------------------------------------------------
    # Graders flag the same opener reused across bullets; it reads as one
    # kind of work repeated rather than a range of contributions.
    openers = collections.Counter(
        re.split(r"[^A-Za-z]+", b.strip(), maxsplit=1)[0].lower() for b in bullets
    )
    overused = {v: n for v, n in openers.items() if n > MAX_VERB_REPEATS}
    if not overused:
        findings.append(("ok", "Verb variety",
                         f"{len(openers)} distinct openers across {len(bullets)} bullets"))
    else:
        worst = ", ".join(f"\"{v}\" x{n}" for v, n in sorted(overused.items(), key=lambda kv: -kv[1]))
        findings.append(("warn", "Verb variety",
                         f"opener reused more than {MAX_VERB_REPEATS}x: {worst}"))

    # --- Quantified results -----------------------------------------------
    # Digits, but also spelled-out quantities: "cleared the audit with zero
    # findings" is a quantified claim, and a digits-only regex misses it.
    quantified = [b for b in bullets if QUANTITY_RE.search(b)]
    share = round(100 * len(quantified) / len(bullets)) if bullets else 0
    findings.append((
        "ok" if share >= 30 else "warn",
        "Quantified results",
        f"{share}% of experience bullets contain a number ({len(quantified)}/{len(bullets)})",
    ))

    return findings + _document_level_findings(full_text, lines)


def _document_level_findings(full_text: str, lines: list[str]) -> list[tuple[str, str, str]]:
    """Checks that apply to the whole document, independent of the bullets."""
    findings: list[tuple[str, str, str]] = []

    # --- Canonical section headings ---------------------------------------
    heading_lines = {l.lower() for l in lines if l == l.upper() and any(c.isalpha() for c in l)}
    missing = [label for label, accepted in CANONICAL_SECTIONS if not (heading_lines & accepted)]
    if not missing:
        findings.append(("ok", "Section headings", "Summary, Experience, Education and Skills all present"))
    else:
        findings.append(("warn", "Section headings",
                         f"no standalone heading matched: {', '.join(missing)} "
                         "(a merged heading like 'EDUCATION & CERTIFICATIONS' can miss an exact match)"))

    # --- Length -----------------------------------------------------------
    word_count = len(re.findall(r"[A-Za-z][A-Za-z'’/+.-]*", full_text))
    if MIN_RESUME_WORDS <= word_count <= MAX_RESUME_WORDS:
        findings.append(("ok", "Length", f"{word_count} words, within the usual {MIN_RESUME_WORDS}-{MAX_RESUME_WORDS} range"))
    else:
        findings.append(("warn", "Length",
                         f"{word_count} words, outside the usual {MIN_RESUME_WORDS}-{MAX_RESUME_WORDS} range"))

    # --- Current role -----------------------------------------------------
    if re.search(r"\b(Present|Current)\b", full_text):
        findings.append(("ok", "Current role", "an open-ended date range is present"))
    else:
        findings.append(("warn", "Current role",
                         "every role has an end date - graders read this as no current position, "
                         "and may flag a gap. Only 'fix' this if it is actually inaccurate."))

    return findings


def print_content_report(findings: list[tuple[str, str, str]]) -> None:
    passed = sum(1 for status, _, _ in findings if status == "ok")
    print("CONTENT QUALITY (what online resume graders check - no score, findings only)")
    print(f"  {passed}/{len(findings)} checks clean")
    print()
    for status, check, detail in findings:
        mark = "✓" if status == "ok" else "⚠"
        print(f"  {mark} {check:<22} {detail}")
    print()
    print("  Not checked here: keyword match against a specific job description.")
    print("  That is what most online 'ATS scores' actually measure, and it is")
    print("  tailored per application, not fixed in the resume file.")
    print()


def print_ats_report(pdf_path: Path, result: dict) -> None:
    score = result["score"]
    print()
    print("=" * 40)
    print(" RESUME GENERATED SUCCESSFULLY" if pdf_path.exists() else " ATS REPORT")
    print("=" * 40)
    print()
    print("PDF:")
    print(f"  {pdf_path}")
    print()
    print("Pages:")
    print(f"  {result['page_count']}")
    print()
    print("Extracted characters:")
    print(f"  {result['total_chars']:,}")
    print()
    print("ATS COMPATIBILITY SCORE (heuristic - not a real ATS)")
    print(f"  {score} / {result['max']}")
    print()
    print("Breakdown:")
    for name, v in result["breakdown"].items():
        mark = "✓" if v["score"] == v["max"] else ("⚠" if v["score"] > 0 else "✗")
        print(f"  {mark} {name:<28} {v['score']}/{v['max']}")
    print("  " + "-" * 32)
    print(f"  {'Total':<30} {score}/{result['max']}")

    if result["warnings"]:
        print()
        print("Warnings:")
        for w in result["warnings"]:
            print(f"  ⚠ {w}")

    print()
    print("Recommendation:")
    if score >= 85:
        print("  PDF is likely ATS-readable.")
    elif score >= 65:
        print("  PDF is probably ATS-readable, but review the warnings above.")
    else:
        print("  PDF may have ATS-readability issues - review the warnings above.")
    print()


def print_text_preview(doc: "fitz.Document", max_chars: int = 2000) -> None:
    print()
    print("=" * 40)
    print(" EXTRACTED TEXT PREVIEW (--check)")
    print("=" * 40)
    for i, page in enumerate(doc, start=1):
        text = page.get_text("text")
        print(f"\n----- Page {i} ({len(text)} chars) -----")
        preview = text if len(text) <= max_chars else text[:max_chars] + "\n... [truncated]"
        print(preview)
    print()


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Build a resume design from Markdown + CSS and score it for ATS readability.")
    parser.add_argument("design", nargs="?", default="1", choices=("1", "2", "all"),
                        help="which design under designs/ to build (default: 1; 'all' builds both).")
    parser.add_argument("--md", type=str, default=None, help="Explicit Markdown source (with --css); bypasses the design lookup.")
    parser.add_argument("--css", type=str, default=None, help="Explicit stylesheet (with --md).")
    parser.add_argument("--output", type=str, default=None, help="Custom output PDF path (default: output/design-<n>/tejashwasharma_resume.pdf).")
    parser.add_argument("--check", action="store_true", help="After generating, print an extracted-text preview for manual validation.")
    parser.add_argument("--ats", action="store_true", help="Run ATS analysis only, against the existing PDF (skips rebuilding).")
    parser.add_argument("--verbose", action="store_true", help="Print step-by-step pipeline progress.")
    args = parser.parse_args()

    designs = ("1", "2") if args.design == "all" else (args.design,)
    if len(designs) > 1 and (args.md or args.css):
        print("ERROR: --md/--css cannot be combined with 'all'", file=sys.stderr)
        return 1
    rc = 0
    for design in designs:
        if len(designs) > 1:
            print(f"\n{'=' * 44}\n  design-{design}\n{'=' * 44}")
        rc |= _run(design, args)
    return rc


def _run(design: str, args) -> int:
    md_path, css_path, default_pdf_path = resolve_sources(design, args.md, args.css)
    out_pdf = Path(args.output).resolve() if args.output else default_pdf_path

    if args.verbose:
        print(f"[source] markdown: {md_path}")
        print(f"[source] css:      {css_path}")
        print(f"[target] pdf:      {out_pdf}")

    # --ats-only mode: analyze whatever PDF already exists, do not rebuild.
    if args.ats and not args.check:
        if not out_pdf.exists():
            print(f"ERROR: {out_pdf} does not exist yet. Run `python generate_resume.py` first.", file=sys.stderr)
            return 1
        try:
            doc = validate_pdf(out_pdf, verbose=args.verbose)
        except ValidationError as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            return 1
        result = analyze_ats(doc, verbose=args.verbose)
        print_ats_report(out_pdf, result)
        print_content_report(analyze_content(doc))
        return 0

    _check_chromium_installed()

    title = RESUME_TITLE
    html = render_html(md_path, css_path, title)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_pdf = Path(tmp_dir) / "resume_candidate.pdf"

        if args.verbose:
            print("[step] rendering HTML -> PDF via headless Chromium ...")
        try:
            html_to_pdf(html, tmp_pdf, verbose=args.verbose)
        except Exception as exc:  # noqa: BLE001
            print(f"ERROR: PDF rendering failed: {exc}", file=sys.stderr)
            return 1

        if args.verbose:
            print("[step] validating candidate PDF ...")
        try:
            doc = validate_pdf(tmp_pdf, verbose=args.verbose)
        except ValidationError as exc:
            print(f"ERROR: generated PDF failed validation, existing PDF left untouched: {exc}", file=sys.stderr)
            return 1

        # Only now replace the previous PDF - keeps the old one intact on any failure above.
        out_pdf.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(tmp_pdf, out_pdf)
        # doc was opened against tmp_pdf inside the (now-removed) temp dir; reopen against the final path.
        doc.close()
        doc = fitz.open(out_pdf)

    if args.verbose:
        print("[step] running ATS analysis ...")
    result = analyze_ats(doc, verbose=args.verbose)
    print_ats_report(out_pdf, result)
    print_content_report(analyze_content(doc))

    if args.check:
        print_text_preview(doc)

    doc.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
