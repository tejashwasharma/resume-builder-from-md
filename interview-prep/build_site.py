#!/usr/bin/env python3
"""
build_site.py

Markdown guides  ->  one self-contained study site (site/index.html).

The Markdown files are the source of truth. This script never edits them; it
reads them, extracts the question blocks, and assembles a single HTML page.
Publish that page as an Artifact and it gains AI drilling and progress
tracking; opened locally it is still a complete, searchable reference.

    python3 build_site.py            build site/index.html
    python3 build_site.py --check    parse and report, write nothing

Pipeline:

    *.md ─┬─▶ parse question blocks ──▶ QUESTIONS[]  (drives drill + mock)
          └─▶ markdown -> HTML ───────▶ CONTENT{}    (drives read mode)
                                              │
    site/template.html + site.css + site.js ──┴──▶ site/index.html

Question blocks follow the contract in AGENT.md. A malformed block is a build
error, not a silently broken drill.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"

try:
    import markdown as md_lib
except ImportError:
    print("ERROR: pip install markdown", file=sys.stderr)
    sys.exit(1)


# --------------------------------------------------------------------------
# Which files, in which order
# --------------------------------------------------------------------------

MODULES = [
    ("00-experience", "Experience"),
    ("01-auth-identity", "Auth & Identity"),
    ("02-distributed-systems", "Distributed Systems"),
    ("03-system-design", "System Design"),
    ("04-backend", "Backend"),
    ("05-data-cache", "Data & Cache"),
    ("06-testing", "Testing"),
    ("07-cloud-devops", "Cloud & DevOps"),
    ("08-ai-tooling", "AI Tooling"),
    ("09-dsa-coding-rounds", "DSA & Coding Rounds"),
    ("10-frontend", "Frontend"),
]

# Root-level pages, in sidebar order
ROOT_PAGES = ["README.md", "WEAK-SPOTS.md", "STUDY-PLAN.md", "INDEX.md"]


def file_id(path: Path) -> str:
    """Stable slug used as the in-page anchor for a file."""
    rel = path.relative_to(ROOT).as_posix()
    return re.sub(r"[^a-z0-9]+", "-", rel.lower().removesuffix(".md")).strip("-")


def title_of(path: Path, text: str) -> str:
    m = re.search(r"^#\s+(.+)$", text, re.M)
    if m:
        return m.group(1).strip()
    return path.stem.replace("-", " ").title()


def slugify(s: str) -> str:
    """Match python-markdown's toc slugs so section links resolve."""
    s = re.sub(r"[^\w\s-]", "", s.lower()).strip()
    return re.sub(r"[\s_]+", "-", s)


def sections_of(text: str) -> list[dict]:
    """H2 headings, in order — the sections a reader navigates and ticks off."""
    out = []
    for m in re.finditer(r"^##\s+(?!#)(.+)$", text, re.M):
        title = m.group(1).strip()
        # Strip trailing markdown emphasis used for asides, e.g. "*(flagship)*"
        clean = re.sub(r"\*+([^*]+)\*+", r"\1", title).strip()
        out.append({"title": clean, "anchor": slugify(title)})
    return out


# --------------------------------------------------------------------------
# Question extraction
#
# The contract (AGENT.md):
#
#   ### Q: <question>
#   **Level:** foundation|intermediate|senior · **Tags:** a, b
#
#   <details><summary>...</summary>
#   <answer>
#   </details>
#
#   **Follow-ups:**
#   1. Q: <follow-up>
#      <details><summary>Answer</summary><answer></details>
#
# Design prompts use `### Design:` and carry a rubric checklist instead of a
# single model answer.
# --------------------------------------------------------------------------

Q_HEAD = re.compile(r"^###\s+(Q|Design):\s*(.+?)\s*$", re.M)
META = re.compile(
    r"\*\*Level:\*\*\s*(?P<level>\w+)"
    r"(?:[^\n]*?\*\*Tags:\*\*\s*(?P<tags>[^\n*]+))?"
    r"(?:[^\n]*?\*\*Time:\*\*\s*(?P<time>[^\n*]+))?",
)
DETAILS = re.compile(r"<details>\s*<summary>(?P<summary>.*?)</summary>(?P<body>.*?)</details>", re.S)
FOLLOWUP = re.compile(r"^\s*\d+\.\s*Q:\s*(?P<q>.+?)\s*$", re.M)
RUBRIC = re.compile(r"\*\*What a strong answer covers:\*\*(?P<items>.*?)(?=\n\s*<details>|\Z)", re.S)


def strip_md(s: str) -> str:
    """Light cleanup for text that will be shown as plain text / sent to the model."""
    s = re.sub(r"</?details>|<summary>.*?</summary>", "", s, flags=re.S)
    return s.strip()


def parse_questions(path: Path, text: str, module: str) -> tuple[list[dict], list[str]]:
    """Return (questions, errors) for one file."""
    questions: list[dict] = []
    errors: list[str] = []
    heads = list(Q_HEAD.finditer(text))

    for i, head in enumerate(heads):
        kind, prompt = head.group(1), head.group(2)
        start = head.end()
        end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        # Stop at the next H2/H3 so trailing prose isn't swallowed
        nxt = re.search(r"^##?#?\s+(?!Q:|Design:)", text[start:end], re.M)
        block = text[start : start + nxt.start()] if nxt else text[start:end]

        meta = META.search(block)
        if not meta:
            errors.append(f"{path.relative_to(ROOT)}: '{prompt[:50]}' has no **Level:** line")
            continue

        details = list(DETAILS.finditer(block))
        if not details:
            errors.append(f"{path.relative_to(ROOT)}: '{prompt[:50]}' has no <details> answer")
            continue
        if not strip_md(details[0].group("body")):
            errors.append(f"{path.relative_to(ROOT)}: '{prompt[:50]}' has an empty answer")
            continue

        # Follow-ups pair positionally with the <details> blocks after the first
        fu_prompts = [m.group("q") for m in FOLLOWUP.finditer(block)]
        followups = [
            {"q": q, "a": strip_md(d.group("body"))}
            for q, d in zip(fu_prompts, details[1:])
        ]

        rubric: list[str] = []
        if kind == "Design":
            rm = RUBRIC.search(block)
            if rm:
                rubric = [
                    li.strip("- ").strip()
                    for li in rm.group("items").splitlines()
                    if li.strip().startswith("-")
                ]

        questions.append(
            {
                "id": f"{file_id(path)}-q{i}",
                "kind": kind.lower(),
                "file": file_id(path),
                "module": module,
                "question": prompt,
                "level": meta.group("level").lower(),
                "tags": [t.strip() for t in (meta.group("tags") or "").split(",") if t.strip()],
                "answer": strip_md(details[0].group("body")),
                "followups": followups,
                "rubric": rubric,
                "needsInput": "FILL IN" in block,
            }
        )

    return questions, errors


# --------------------------------------------------------------------------
# Diagrams
#
# A mechanism gets a Mermaid flow chart above the prose that walks it (see
# AGENT.md). The contract:
#
#   ```mermaid
#   sequenceDiagram
#     ...
#   ```
#   *One-line caption saying what to take from it.*
#
# The caption is required and is not decoration: the site strips diagram
# source out of its search and retrieval text, so the caption is the only
# part of a diagram that stays findable. A fence with no caption, or with no
# body, is a build error.
# --------------------------------------------------------------------------

DIAGRAM_MD = re.compile(
    r"^```mermaid[^\n]*\n(?P<src>.*?)^```[ \t]*$\n(?P<after>\s*[^\n]*)",
    re.S | re.M,
)
DIAGRAM_HTML = re.compile(
    r'<pre><code class="language-mermaid">(?P<src>.*?)</code></pre>\s*'
    r"<p><em>(?P<cap>.*?)</em></p>",
    re.S,
)


def check_diagrams(path: Path, text: str) -> tuple[list[str], int]:
    """Return (errors, count) for the diagram fences in one file."""
    errors: list[str] = []
    count = 0
    for m in DIAGRAM_MD.finditer(text):
        count += 1
        where = f"{path.relative_to(ROOT)}: diagram {count}"
        if not m.group("src").strip():
            errors.append(f"{where} is an empty ```mermaid fence")
            continue
        after = m.group("after").strip()
        if not (len(after) > 2 and after.startswith("*") and after.endswith("*")):
            errors.append(
                f"{where} has no caption \u2014 put an italic one-line caption "
                "directly under the closing fence"
            )
    return errors, count


# --------------------------------------------------------------------------
# Markdown -> HTML
# --------------------------------------------------------------------------

def render_html(text: str, path: Path, known: dict[str, str]) -> str:
    html = md_lib.markdown(
        text,
        extensions=["tables", "fenced_code", "sane_lists", "attr_list", "md_in_html", "toc"],
    )

    # Rewrite links to other .md files into in-page anchors. A link whose
    # target isn't in the site (not written yet) loses its href but keeps its
    # text, so the page never carries a dead link.
    def relink(m: re.Match) -> str:
        href, label = m.group("href"), m.group("label")
        target = (path.parent / href.split("#")[0]).resolve()
        key = file_id(target) if ROOT in target.parents or target.parent == ROOT else None
        if key and key in known:
            return f'<a href="#{key}" data-nav="{key}">{label}</a>'
        return label

    html = re.sub(
        r'<a href="(?P<href>[^"]*\.md[^"]*)">(?P<label>.*?)</a>',
        relink,
        html,
        flags=re.S,
    )

    # Mermaid fence -> figure. Mermaid needs its arrows back, so undo the
    # entity escaping the code-block renderer applied.
    def diagram(m: re.Match) -> str:
        src = unescape(m.group("src")).strip()
        return (
            '<figure class="diagram">'
            f'<pre class="mermaid">{src}</pre>'
            f'<figcaption>{m.group("cap")}</figcaption>'
            "</figure>"
        )

    return DIAGRAM_HTML.sub(diagram, html)


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------

def collect() -> tuple[dict, list[dict], list[str], dict]:
    content: dict[str, dict] = {}
    questions: list[dict] = []
    errors: list[str] = []
    diagrams = 0

    files: list[tuple[Path, str]] = []
    for name in ROOT_PAGES:
        p = ROOT / name
        if p.exists():
            files.append((p, "Overview"))
    for dirname, label in MODULES:
        d = ROOT / dirname
        if not d.is_dir():
            continue
        for p in sorted(d.glob("*.md")):
            files.append((p, label))

    known = {file_id(p): label for p, label in files}

    for path, module in files:
        text = path.read_text(encoding="utf-8")
        qs, errs = parse_questions(path, text, module)
        questions.extend(qs)
        errors.extend(errs)
        derrs, dcount = check_diagrams(path, text)
        errors.extend(derrs)
        diagrams += dcount
        content[file_id(path)] = {
            "id": file_id(path),
            "title": title_of(path, text),
            "module": module,
            "path": path.relative_to(ROOT).as_posix(),
            "html": render_html(text, path, known),
            "questions": len(qs),
            "diagrams": dcount,
            "sections": sections_of(text),
            "words": len(text.split()),
        }

    # Module status, so the sidebar can show what is not yet written
    planned = {label: 0 for _, label in MODULES}
    written = {label: 0 for _, label in MODULES}
    for dirname, label in MODULES:
        d = ROOT / dirname
        written[label] = len(list(d.glob("*.md"))) if d.is_dir() else 0
    # The spine: ordered parts, each with its chapters. Drives the contents
    # page, prev/next, and progress.
    order = [p for p, _ in files]
    spine, seen = [], {}
    for path, module in files:
        seen.setdefault(module, []).append(file_id(path))
    parts, n = [], 0
    for module in dict.fromkeys(m for _, m in files):
        chapters = []
        for cid in seen[module]:
            n += 1
            content[cid]["number"] = n
            chapters.append(cid)
        parts.append({"name": module, "chapters": chapters})
    spine = [cid for part in parts for cid in part["chapters"]]

    stats = {
        "files": len(content),
        "questions": len(questions),
        "diagrams": diagrams,
        "sections": sum(len(c["sections"]) for c in content.values()),
        "words": sum(c["words"] for c in content.values()),
        "parts": parts,
        "spine": spine,
        "pending": [
            {"name": label, "dir": d}
            for d, label in MODULES if written[label] == 0
        ],
        "modules": [
            {"name": label, "files": written[label]} for _, label in MODULES
        ],
    }
    return content, questions, errors, stats


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="parse and report only")
    args = ap.parse_args()

    content, questions, errors, stats = collect()

    if errors:
        print("Malformed content:\n", file=sys.stderr)
        for e in errors:
            print(f"  ✗ {e}", file=sys.stderr)
        print(
            f"\n{len(errors)} block(s) break the content contract (see AGENT.md). "
            "Site not written.",
            file=sys.stderr,
        )
        return 1

    by_level: dict[str, int] = {}
    for q in questions:
        by_level[q["level"]] = by_level.get(q["level"], 0) + 1

    print(f"Files parsed      {stats['files']}")
    print(f"Questions found   {stats['questions']}  " + ", ".join(f"{k}:{v}" for k, v in sorted(by_level.items())))
    print(f"Follow-ups        {sum(len(q['followups']) for q in questions)}")
    print(f"Diagrams          {stats['diagrams']}")
    print(f"Sections          {stats['sections']}  across {len(stats['parts'])} parts")
    print(f"Words             {stats['words']:,}")
    print(f"Need your input   {sum(1 for q in questions if q['needsInput'])}")

    if args.check:
        print("\n--check: nothing written.")
        return 0

    template = (SITE / "template.html").read_text(encoding="utf-8")
    css = (SITE / "site.css").read_text(encoding="utf-8")
    js = (SITE / "site.js").read_text(encoding="utf-8")

    data = json.dumps(
        {"content": content, "questions": questions, "stats": stats},
        ensure_ascii=False,
        separators=(",", ":"),
    )

    out = (
        template.replace("/*{{CSS}}*/", css)
        .replace("/*{{JS}}*/", js)
        .replace("/*{{DATA}}*/", data)
    )
    (SITE / "index.html").write_text(out, encoding="utf-8")

    size_kb = len(out.encode()) / 1024
    print(f"\nWrote site/index.html  ({size_kb:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
