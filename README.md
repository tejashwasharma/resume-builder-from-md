# resume-builder-from-md

Write your resume in Markdown, style it in CSS, run one command, get a PDF —
plus two reports telling you how well that PDF will survive an applicant
tracking system and how the writing measures against what online resume
graders check.

```bash
python3 build.py          # design 1 (default) -> output/design-1/tejashwasharma_resume.pdf
python3 build.py 2        # design 2
python3 build.py all      # both
```

The Markdown files are the single source of truth. The PDFs in `output/` are
build output and are never edited by hand.

## Project structure

```text
.
├── build.py                    Build, validate, and report (design-aware)
├── designs/
│   ├── design-1/resume.md      Content — the primary design
│   ├── design-1/resume.css     Appearance — design 1 (single-column)
│   ├── design-2/resume.md      Content — the alternate variant
│   └── design-2/resume.css     Appearance — design 2
├── output/
│   ├── design-1/tejashwasharma_resume.pdf   Generated — never hand-edit
│   └── design-2/tejashwasharma_resume.pdf   Generated — never hand-edit
├── tailor/tailor_cv.py         Per-application variants of design 1 (output in tailor/output/, gitignored)
├── interview-prep/             Study material derived from design 1
├── AGENT.md                    Instructions for AI agents working in this repo
├── .claude/skills/             resume-build / resume-tailor / job-search skills
└── README.md                   This file
```

## Setup

Python 3.9+ and three packages: `markdown` (Markdown → HTML), `playwright`
(HTML → PDF via headless Chromium), and `PyMuPDF` (PDF validation and text
extraction).

```bash
# macOS / Linux
python3 -m pip install markdown playwright pymupdf
python3 -m playwright install chromium
```

```powershell
# Windows (PowerShell or cmd)
python -m pip install markdown playwright pymupdf
python -m playwright install chromium
```

`playwright install chromium` downloads a self-contained Chromium into
Playwright's own cache — no system-wide install, no PATH edits, same command
on every OS.

## Usage

```bash
# Build a design and print both reports (the everyday command)
python3 build.py            # design 1 (default)
python3 build.py 2          # design 2
python3 build.py all        # both

# Build, then print the extracted text per page for manual review
python3 build.py --check

# Re-run the reports against the existing PDF, without rebuilding
python3 build.py --ats

# Step-by-step pipeline progress
python3 build.py --verbose

# Explicit sources (used by tailor/tailor_cv.py) / custom output path
python3 build.py --md path/to/resume.md --css path/to/resume.css --output custom.pdf
```

Workflow: edit the Markdown (or the CSS), run the build, open the PDF, read
the reports.

## How the build works

```text
resume.md + resume.css
        │
        ▼
Markdown → HTML   (python-markdown: tables, sane_lists, attr_list, smarty)
        │
        ▼
HTML with CSS inlined   (headless Chromium via Playwright, @page Letter)
        │
        ▼
PDF written to a TEMP file first
        │
        ▼
PyMuPDF validates it   (pages > 0, extractable text, not blank)
        │
        ▼
Only on success: the temp PDF replaces the real one
        │
        ▼
Reports printed from the FINAL PDF
```

If any step fails the script exits non-zero, prints the reason, and **leaves
the previous PDF untouched** — you never end up with a half-written resume.

## The two reports

They answer different questions, and a resume can ace the first while failing
the second.

### 1. ATS compatibility — parse fidelity

Can a machine read the file at all? Scored out of 100 by `analyze_ats()`.

| Category | Points | What's checked |
| --- | --- | --- |
| Text extraction & PDF integrity | 20 | Text is extractable (8); character count is plausible (6); no image-only pages (6). |
| Contact information | 15 | Email (5), phone (5), LinkedIn/GitHub/URL (5). |
| Section detection | 20 | Summary, Experience, Education, Skills headings (5 each). |
| Work & education content | 15 | Recognizable date ranges (7); degree/institution keywords (8). |
| Reading order | 15 | −8 if blocks cluster into >4 left margins (multi-column); −5 if text is heavily fragmented. |
| Formatting | 15 | −5 over 3 pages; −10 if anything renders outside the printable area. |

This is **not** a score from Workday, Greenhouse, Lever or Taleo — no such
product is used or emulated. Those systems produce no score at all; they parse
into fields that recruiters filter on. This is a transparent local heuristic
for the things a parser typically trips over.

### 2. Content quality — the writing

Parse fidelity says nothing about whether the resume reads well, so a second
report covers the rules online graders apply. It prints findings only, with
**no score out of 100** — a second number would invite the same false
confidence as the first.

| Check | Rule |
| --- | --- |
| Bullets | Bullet characters actually reached the text layer. |
| Bullet length | No experience bullet over 30 words (~2 rendered lines). |
| Action-verb openings | Each experience bullet opens on a verb, not a category label. |
| Verb variety | No opener reused more than twice. |
| Quantified results | At least 30% of experience bullets carry a number, spelled-out quantities included. |
| Section headings | Standalone Summary / Experience / Education / Skills headings. |
| Length | 400–800 words. |
| Current role | An open-ended date range exists — reported, never "fixed" for you. |

Bullets are reconstructed from the PDF using **layout, not text**: body text
sits at the page margin, a bullet is indented, and its wrapped continuation is
indented further, so the left edge is what separates a wrapped line from the
heading that follows a list. Award and education entries, and any list
introduced by a lead-in ending in `:`, are excluded from the verb and length
rules — they are inventories, not achievement claims.

Neither report ever rewrites your Markdown to chase a better number.

### What neither report covers

Keyword match against a specific job description. That is what most online
"ATS score" products actually measure, and it is tailored per application
rather than fixed in the resume file.

## CSS choices that exist for the parser

A PDF can look perfect and still parse badly. Chromium places every glyph by
coordinate and never emits a character-spacing operator, so extractors rebuild
words purely from gap geometry. These rules are commented `ATS:` where they
sit in the stylesheet; reverting them degrades the text layer while the PDF
looks unchanged.

| Rule | Without it |
| --- | --- |
| `font-variant-ligatures: none` on `body` | `fi`/`fl`/`ff` become single U+FB0x glyphs, so the text layer holds "uniﬁed" and "workﬂows" — a search for "unified" or "workflow" misses. |
| `letter-spacing: 0` on `h2` | Wide tracking makes headings extract as `E X P E R I E N C E`, and a parser matching section names finds none of them. |
| `::before` bullets, not `list-style` | Chromium rasterizes `::marker` glyphs as graphics; they never reach the text layer. |
| Bullet on the text baseline | Nudging it with `position`/`top` makes extractors stop grouping it with its line, stranding each bullet alone. |
| Skills as `.skill` paragraphs, not a table | A two-column table extracts labels and values as separate, misordered lines, orphaning "Backend" and "Frontend" from their technologies. |

Verified by extracting the built PDF with three independent engines — PyMuPDF,
pypdf and pdfminer.six. They disagree with each other on marginal spacing, so
agreement across all three is the bar.

The contact line is plain text separated by `·`, with no emoji icons: emoji in
a text layer extract as stray characters or vanish, depending on the parser.

## Fonts

The stylesheet uses a system-safe humanist stack rather than a bundled font
file, so the build reproduces on Windows, macOS and Linux with no setup and no
font licensing to track:

```css
font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif;
```

Chromium subsets and embeds whatever this resolves to, so the text stays
selectable and portable.

## Why this stack

| Concern | Choice | Why |
| --- | --- | --- |
| Markdown → HTML | `python-markdown` | Small and stable; `attr_list` supplies the `{: .full }` layout hooks on the section headings, `smarty` the typographic punctuation. |
| HTML → PDF | Playwright + headless Chromium | Real print-CSS support (`@page`, `break-inside`, `prefer_css_page_size`), reliable page sizing, selectable text, identical output across platforms, one-command install. |
| Validation & analysis | PyMuPDF (`fitz`) | Fast, dependency-light text/font/layout extraction — used both to sanity-check the render and to compute the reports. |

Considered and rejected: **WeasyPrint**, whose CSS support is weaker than a
browser engine and which needs system Cairo/Pango libraries that break often on
Windows; and **wkhtmltopdf**, unmaintained upstream, weaker on modern CSS, and
distributed as a separate binary to manage on PATH per OS.
