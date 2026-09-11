#!/usr/bin/env python3
"""
check_coverage.py

Does the prep material still cover the resume?

The resume is the source of truth for what needs preparing. Every technology
named in its Technical Skills section must have real material here — not a passing
mention. Add "Fastify" to the resume and this fails until a guide covers it.

    python3 check_coverage.py             report and exit non-zero on gaps
    python3 check_coverage.py --write     also regenerate coverage.md

Four checks:
  1. Resume coverage  - every Technical Skills token appears in a guide
  2. Question format  - every ### Q: block parses (the drill contract)
  3. Diagram format   - every ```mermaid fence has a body and a caption
  4. Links            - every relative .md link resolves

Distributed systems and system design are reported separately: they are
expected at senior level but have no resume token to match against.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RESUME = ROOT.parent / "designs" / "design-1" / "resume.md"

# A token needs this many mentions outside the index to count as covered.
MIN_MENTIONS = 2

# Tokens that are phrases rather than searchable terms, matched loosely.
# Keys are tokens as they come out of the resume after normalisation.
ALIASES = {
    "Identity and Access Management": ["IAM", "identity and access management"],
    "Authentication & Authorization": ["authentication", "authorization"],
    "Multi-Factor Authentication": ["MFA", "TOTP", "multi-factor"],
    "Role-Based Access Control": ["RBAC"],
    "OpenID Connect": ["OIDC", "OpenID Connect"],
    "Single Sign-On": ["SSO", "single sign-on"],
    "React": ["React"],
    "Jest": ["Jest"],
    "sustained 85%+ coverage": ["coverage"],
    "AGENT.md/SKILLS.md & agent-navigation docs": ["AGENT.md"],
    "prompt/playbook libraries": ["playbook"],
    "prompt caching & model routing": ["prompt caching"],
    "Rego/OPA": ["Rego", "OPA"],
    "Zero Trust Architecture": ["Zero Trust"],
    "Microsoft Entra ID": ["Entra"],
    "Node.js": ["Node.js", "Node"],
    "REST APIs": ["REST"],
    # The template spells several skills differently from the guides. These
    # are the same skill under another name, not a new claim to prepare for.
    "React.js": ["React"],
    "Express.js": ["Express"],
    "Redux Thunk/Saga": ["Redux"],
    "Styled Components": ["Styled Components", "Styled-Components"],
    "AWS EC2": ["EC2"],
    "Unit Testing": ["unit test"],
    "Integration Testing": ["integration test"],
    "E2E Testing": ["E2E", "end-to-end test"],
    "Test Automation": ["test automation", "automated test"],
    "85%+ Coverage": ["coverage"],
    "Micro-Frontends": ["micro-frontend"],
    "Microservices": ["microservice"],
    "MFA/TOTP": ["MFA", "TOTP", "multi-factor"],
    "AGENT.md/SKILLS.md agent-navigation docs": ["AGENT.md"],
    "Prompt & playbook libraries": ["playbook"],
    "Prompt caching & model routing": ["prompt caching", "model routing"],
    # The chapters name these by the term the industry uses, not by the
    # resume's label for the skill.
    "AI-assisted Code Review": ["pre-review"],
    "AI Test Generation": ["test generation"],
    "AI Security Analysis": ["security analysis"],
}

# Matched case-insensitively: the resume capitalises these labels differently
# from one layout to the next ("prompt caching & model routing" became "Prompt
# caching & model routing"), and a case-only difference silently fell through
# to a literal search for the whole phrase, which never matches.
ALIASES_LOWER = {k.lower(): v for k, v in ALIASES.items()}

# Not on the resume, but expected of a senior candidate.
ROLE_LEVEL = {
    "Distributed systems": "02-distributed-systems",
    "System design": "03-system-design",
    "DSA / coding rounds": "09-dsa-coding-rounds",
}


def resume_tokens() -> list[tuple[str, str]]:
    """[(skill line label, token)] from the resume's Technical Skills section.

    Only that section: elsewhere the resume uses the same `- **Label:** value`
    shape for things that are not skills (the Major Clients entries, Personal
    Details), and sweeping those in would demand a guide for "Date of Birth".
    """
    if not RESUME.exists():
        print(f"ERROR: resume not found at {RESUME}", file=sys.stderr)
        sys.exit(2)
    md = RESUME.read_text(encoding="utf-8")
    section = re.search(r"^## Technical Skills\b.*?(?=^## |\Z)", md, re.M | re.S)
    if not section:
        print("ERROR: no '## Technical Skills' section in the resume", file=sys.stderr)
        sys.exit(2)
    out = []
    for label, values in re.findall(r"^-?\s*\*\*(.+?):\*\* (.+)$", section.group(0), re.M):
        # The template separates skills with pipes; commas and middots survive
        # from the older layout and stay accepted.
        for tok in re.split(r"[|,·]", values):
            # Keep the real name out of a parenthesised list fragment
            # ("Firebase (Auth" / "Hosting)") rather than the broken punctuation.
            tok = tok.strip().strip("()").split("(")[0].strip()
            if tok:
                out.append((label, tok))
    return out


def guide_text() -> str:
    """All prose from the guides, excluding the index (which lists everything)."""
    parts = []
    for p in sorted(ROOT.rglob("*.md")):
        if ".git" in p.parts or p.name in {"INDEX.md", "coverage.md"}:
            continue
        parts.append(p.read_text(encoding="utf-8"))
    return "\n".join(parts)


def covered(token: str, haystack: str) -> tuple[bool, int]:
    needles = ALIASES_LOWER.get(token.lower(), [token])
    n = sum(len(re.findall(re.escape(x), haystack, re.I)) for x in needles)
    return n >= MIN_MENTIONS, n


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
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true", help="regenerate coverage.md")
    args = ap.parse_args()

    text = guide_text()
    tokens = resume_tokens()
    rows, missing = [], []

    for label, tok in tokens:
        ok, n = covered(tok, text)
        rows.append((label, tok, ok, n))
        if not ok:
            missing.append((label, tok, n))

    print("RESUME COVERAGE")
    print(f"  {len(tokens) - len(missing)}/{len(tokens)} skills from the resume have material here\n")

    if missing:
        print("  Not yet covered — the resume claims these and the prep doesn't teach them:")
        for label, tok, n in missing:
            print(f"    ✗ {tok:<42} ({label}){'  [1 passing mention]' if n else ''}")
        print()

    print("ROLE-LEVEL TOPICS (not on the resume, expected anyway)")
    for name, d in ROLE_LEVEL.items():
        files = len(list((ROOT / d).glob("*.md"))) if (ROOT / d).is_dir() else 0
        print(f"  {'✓' if files else '✗'} {name:<24} {files} file(s)")
    print()

    qerrs = check_questions()
    derrs = check_diagrams()
    lerrs = check_links()
    print(f"QUESTION FORMAT   {'✓ all blocks well-formed' if not qerrs else f'✗ {len(qerrs)} malformed'}")
    for e in qerrs[:10]:
        print(f"    {e}")
    print(f"DIAGRAM FORMAT    {'✓ all captioned' if not derrs else f'✗ {len(derrs)} malformed'}")
    for e in derrs[:10]:
        print(f"    {e}")
    print(f"LINKS             {'✓ all resolve' if not lerrs else f'✗ {len(lerrs)} broken'}")
    for e in lerrs[:10]:
        print(f"    {e}")

    if args.write:
        lines = [
            "# Coverage",
            "",
            "Generated by `check_coverage.py`. Every technology on the resume's Core",
            "Skills line, and whether this repo teaches it.",
            "",
            "| Skill line | Technology | Covered |",
            "| --- | --- | --- |",
        ]
        for label, tok, ok, n in rows:
            lines.append(f"| {label} | {tok} | {'✅' if ok else '❌'} |")
        lines += ["", "## Expected at senior level, not on the resume", ""]
        for name, d in ROLE_LEVEL.items():
            files = len(list((ROOT / d).glob("*.md"))) if (ROOT / d).is_dir() else 0
            lines.append(f"- {'✅' if files else '❌'} **{name}** — `{d}/` ({files} files)")
        (ROOT / "coverage.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nWrote coverage.md")

    failed = bool(missing or qerrs or derrs or lerrs)
    if failed:
        print("\nGaps above. If the resume changed, the prep needs to catch up.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
