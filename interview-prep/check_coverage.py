#!/usr/bin/env python3
"""
check_coverage.py

Structural checks over the book's Markdown. Run it after editing any guide.

    python3 check_coverage.py        report and exit non-zero on any error

Three checks:
  1. Question format  - every ### Q: / ### Design: block parses (the drill contract)
  2. Diagram format   - every ```mermaid fence has a body and a caption
  3. Links            - every relative .md link resolves
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def check_questions() -> list[str]:
    """Every ### Q: block must carry **Level:** and a non-empty <details>."""
    errs = []
    head = re.compile(r"^###\s+(Q|Design):\s*(.+?)\s*$", re.M)
    for p in sorted(ROOT.rglob("*.md")):
        if ".git" in p.parts:
            continue
        text = p.read_text(encoding="utf-8")
        hs = list(head.finditer(text))
        for i, h in enumerate(hs):
            end = hs[i + 1].start() if i + 1 < len(hs) else len(text)
            block = text[h.end() : end]
            rel = p.relative_to(ROOT)
            if not re.search(r"\*\*Level:\*\*", block):
                errs.append(f"{rel}: '{h.group(2)[:45]}' missing **Level:**")
            m = re.search(r"<details>.*?<summary>.*?</summary>(.*?)</details>", block, re.S)
            if not m:
                errs.append(f"{rel}: '{h.group(2)[:45]}' missing <details> answer")
            elif not m.group(1).strip():
                errs.append(f"{rel}: '{h.group(2)[:45]}' has an empty answer")
    return errs


def check_diagrams() -> list[str]:
    """Every ```mermaid fence needs a body and an italic caption under it.

    The caption is load-bearing, not decoration: the site strips diagram source
    out of its search index and out of what the Ask chat retrieves over, so the
    caption is the only part of a diagram that stays findable. See AGENT.md.
    """
    errs = []
    fence = re.compile(
        r"^```mermaid[^\n]*\n(?P<src>.*?)^```[ \t]*$\n(?P<after>\s*[^\n]*)",
        re.S | re.M,
    )
    for p in sorted(ROOT.rglob("*.md")):
        if ".git" in p.parts or p.name == "AGENT.md":
            continue
        rel = p.relative_to(ROOT)
        for i, m in enumerate(fence.finditer(p.read_text(encoding="utf-8")), 1):
            if not m.group("src").strip():
                errs.append(f"{rel}: diagram {i} is an empty fence")
                continue
            after = m.group("after").strip()
            if not (len(after) > 2 and after.startswith("*") and after.endswith("*")):
                errs.append(f"{rel}: diagram {i} has no italic caption under it")
    return errs


def check_links() -> list[str]:
    errs = []
    link = re.compile(r"\[[^\]]*\]\(([^)]+\.md)(?:#[^)]*)?\)")
    for p in sorted(ROOT.rglob("*.md")):
        if ".git" in p.parts:
            continue
        for m in link.finditer(p.read_text(encoding="utf-8")):
            target = (p.parent / m.group(1)).resolve()
            if not target.exists():
                errs.append(f"{p.relative_to(ROOT)} -> {m.group(1)} (missing)")
    return errs


def main() -> int:
    qerrs = check_questions()
    derrs = check_diagrams()
    lerrs = check_links()
    print(f"QUESTION FORMAT   {'✓ all blocks well-formed' if not qerrs else f'✗ {len(qerrs)} malformed'}")
    for e in qerrs[:20]:
        print(f"    {e}")
    print(f"DIAGRAM FORMAT    {'✓ all captioned' if not derrs else f'✗ {len(derrs)} malformed'}")
    for e in derrs[:20]:
        print(f"    {e}")
    print(f"LINKS             {'✓ all resolve' if not lerrs else f'✗ {len(lerrs)} broken'}")
    for e in lerrs[:20]:
        print(f"    {e}")

    if qerrs or derrs or lerrs:
        print("\nFix the errors above before considering a change done.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
