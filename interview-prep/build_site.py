#!/usr/bin/env python3
"""
build_site.py

Markdown guides  ->  one self-contained study site (site/index.html).

The Markdown files are the source of truth. This script never edits them; it
reads them and assembles a single HTML page that reads as one study flow:

    Topics -> Chapters (curriculum.json)          the vertical axis
    Learn -> Workshop -> Code -> Quiz             the horizontal axis, per chapter

    python3 build_site.py              build site/index.html
    python3 build_site.py --check      parse, validate and verify; write nothing
    python3 build_site.py --no-verify  skip running reference solutions (no node)

Pipeline:

    curriculum.json ──▶ study order, and the list every chapter must be in
    *.md ─┬─▶ split at `##` ─▶ STAGE_RULES ─▶ learn / workshop sections (HTML)
          ├─▶ ## Exercises ──▶ exercises[] ─▶ node + site/runner.js verify them
          ├─▶ ## Quiz ───────▶ quiz[]
          └─▶ ### Q: blocks ─▶ questions[]  (the Ask chat retrieves over these)
                                              │
    site/template.html + site.css + site.js + runner.js ──▶ site/index.html

Every content contract (question blocks, diagrams, exercises, MCQs, the
curriculum) is enforced here: a malformed block is a build error, not a
silently broken page. The contracts are documented in AGENT.md.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"
CURRICULUM = ROOT / "curriculum.json"

try:
    import markdown as md_lib
except ImportError:
    print("ERROR: pip install markdown", file=sys.stderr)
    sys.exit(1)

# Directories whose .md files are chapters. Every one of them must be listed in
# curriculum.json (as a chapter or an exclusion) so nothing silently drops out.
MODULE_DIRS = [
    "00-experience", "01-auth-identity", "02-google-loop", "03-backend",
    "04-data-cache", "05-testing", "06-cloud-devops", "07-ai-tooling", "08-frontend",
    "09-lld",
]


def file_id(path: Path) -> str:
    """Stable slug used as the in-page id for a file."""
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


def clean_heading(title: str) -> str:
    # Strip trailing markdown emphasis used for asides, e.g. "*(flagship)*"
    return re.sub(r"\*+([^*]+)\*+", r"\1", title).strip()


# --------------------------------------------------------------------------
# Stages: which `##` section goes where
#
# One table, matched against the section heading (case-insensitive, from the
# start). Anything unmatched is Learn — the teaching prose. Chapters don't need
# restructuring to fit the flow; the headings they already use decide it.
# --------------------------------------------------------------------------

STAGE_RULES: list[tuple[str, str]] = [
    (r"in brief\b", "brief"),
    (r"exercises\b", "code"),
    (r"quiz\b", "quiz"),
    (r"(practice ladder|worked problems?|worked example|problem bank|building it|"
     r"reference stack|interview q&a|what a weak answer|the question bank|"
     r"follow-ups google|cross-cutting|workshop\b)", "workshop"),
]


def stage_of(heading: str, body: str) -> str:
    h = heading.lower()
    for pattern, stage in STAGE_RULES:
        if re.match(pattern, h):
            return stage
    # A section holding system-design prompts is practice, not reading.
    if re.search(r"^###\s+Design:", body, re.M):
        return "workshop"
    return "learn"


def split_sections(text: str) -> tuple[str, list[tuple[str, str]]]:
    """(preamble, [(heading, body)]) split at `## ` lines outside code fences."""
    pre: list[str] = []
    sections: list[tuple[str, list[str]]] = []
    fence = None
    for line in text.splitlines():
        m = re.match(r"^(```|~~~)", line)
        if m:
            fence = None if fence == m.group(1) else (fence or m.group(1))
        if fence is None and re.match(r"^##\s+(?!#)", line):
            sections.append((line[3:].strip(), []))
            continue
        (sections[-1][1] if sections else pre).append(line)
    preamble = "\n".join(l for l in pre if not re.match(r"^#\s+", l)).strip()
    # Trailing horizontal rules are page furniture, not content.
    tidy = lambda s: re.sub(r"(\n\s*---\s*)+\s*$", "", "\n".join(s).strip()).strip()
    return tidy([preamble]), [(h, tidy(b)) for h, b in sections]


# --------------------------------------------------------------------------
# Question extraction (the drill contract in AGENT.md — still parsed: the Ask
# chat retrieves over these, and the terminal skills read the same blocks)
# --------------------------------------------------------------------------

Q_HEAD = re.compile(r"^###\s+(Q|Design):\s*(.+?)\s*$", re.M)
META = re.compile(
    r"\*\*Level:\*\*\s*(?P<level>\w+)"
    r"(?:[^\n]*?\*\*Tags:\*\*\s*(?P<tags>[^\n*]+))?"
    r"(?:[^\n]*?\*\*Time:\*\*\s*(?P<time>[^\n*]+))?",
)
DETAILS = re.compile(r"<details>\s*<summary>(?P<summary>.*?)</summary>(?P<body>.*?)</details>", re.S)
FOLLOWUP = re.compile(r"^\s*\d+\.\s*Q:\s*(?P<q>.+?)\s*$", re.M)


def strip_md(s: str) -> str:
    s = re.sub(r"</?details>|<summary>.*?</summary>", "", s, flags=re.S)
    return s.strip()


def parse_questions(path: Path, text: str) -> tuple[list[dict], list[str]]:
    questions: list[dict] = []
    errors: list[str] = []
    heads = list(Q_HEAD.finditer(text))
    for i, head in enumerate(heads):
        kind, prompt = head.group(1), head.group(2)
        start = head.end()
        end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        nxt = re.search(r"^##?#?\s+(?!Q:|Design:)", text[start:end], re.M)
        block = text[start : start + nxt.start()] if nxt else text[start:end]
        where = f"{path.relative_to(ROOT)}: '{prompt[:50]}'"
        meta = META.search(block)
        if not meta:
            errors.append(f"{where} has no **Level:** line")
            continue
        details = list(DETAILS.finditer(block))
        if not details:
            errors.append(f"{where} has no <details> answer")
            continue
        if not strip_md(details[0].group("body")):
            errors.append(f"{where} has an empty answer")
            continue
        fu = [m.group("q") for m in FOLLOWUP.finditer(block)]
        questions.append({
            "id": f"{file_id(path)}-q{i}",
            "kind": kind.lower(),
            "file": file_id(path),
            "question": prompt,
            "level": meta.group("level").lower(),
            "tags": [t.strip() for t in (meta.group("tags") or "").split(",") if t.strip()],
            "answer": strip_md(details[0].group("body"))[:4000],
            "followups": [{"q": q, "a": strip_md(d.group("body"))[:1500]} for q, d in zip(fu, details[1:])],
        })
    return questions, errors


# --------------------------------------------------------------------------
# Exercises (the Code stage)
#
#   ## Exercises
#
#   ### Exercise: Rotate an array right by k
#   **Level:** intermediate · **Topic:** in-place reversal · **Hint:** Three reversals.
#   **Function:** `rotateRight(a: number[], k: number): number[]`
#   **Core:** true · **Source:** scaler              (optional)
#   **Adapter:** linked-list · **Check:** arg0 · **Compare:** unordered   (optional)
#
#   Statement, in markdown, with an example.
#
#   ```tests
#   [{"args": [[3,2,1,4,6,9,8], 3], "expected": [6,9,8,3,2,1,4]},
#    {"gen": "[Array.from({length: 1e5}, (_, i) => i), 7]", "perf": true, "label": "n = 100,000"}]
#   ```
#
#   <details><summary>Solution</summary>
#
#   ```ts
#   function rotateRight(a: number[], k: number): number[] { ... }
#   ```
#   </details>
# --------------------------------------------------------------------------

EX_HEAD = re.compile(r"^###\s+Exercise:\s*(.+?)\s*$", re.M)
MCQ_HEAD = re.compile(r"^###\s+MCQ:\s*(.+?)\s*$", re.M)
META_PAIR = re.compile(r"\*\*([A-Za-z][A-Za-z ]*):\*\*\s*(.+?)(?=\s+·\s+\*\*[A-Za-z][A-Za-z ]*:\*\*|\s*$)")
LEVELS = {"foundation": 10, "intermediate": 20, "senior": 35}


def meta_of(block: str) -> tuple[dict, str]:
    """Pull `**Key:** value` pairs off the block's leading lines; return (meta, rest)."""
    meta: dict[str, str] = {}
    lines = block.strip("\n").splitlines()
    i = 0
    while i < len(lines) and (lines[i].startswith("**") or not lines[i].strip()):
        if lines[i].strip():
            for k, v in META_PAIR.findall(lines[i]):
                meta[k.strip().lower()] = v.strip()
        i += 1
    return meta, "\n".join(lines[i:])


def split_blocks(section: str, head: re.Pattern) -> list[tuple[str, str]]:
    heads = list(head.finditer(section))
    return [
        (h.group(1), section[h.end(): heads[j + 1].start() if j + 1 < len(heads) else len(section)])
        for j, h in enumerate(heads)
    ]


def parse_exercises(cid: str, path: Path, section: str) -> tuple[list[dict], list[str]]:
    out: list[dict] = []
    errors: list[str] = []
    for title, block in split_blocks(section, EX_HEAD):
        where = f"{path.relative_to(ROOT)}: exercise '{title[:50]}'"
        meta, rest = meta_of(block)
        missing = [k for k in ("level", "topic", "hint", "function") if k not in meta]
        if missing:
            errors.append(f"{where} is missing **{'**, **'.join(m.title() for m in missing)}**")
            continue
        if meta["level"] not in LEVELS:
            errors.append(f"{where} has level '{meta['level']}' (use foundation|intermediate|senior)")
            continue
        sig = meta["function"].strip("` ")
        fm = re.match(r"([A-Za-z_$][\w$]*)\s*\(", sig)
        if not fm:
            errors.append(f"{where}: **Function:** must look like `name(args): ReturnType`")
            continue
        tm = re.search(r"^```tests\s*\n(.*?)^```", rest, re.S | re.M)
        sm = re.search(r"<details>\s*<summary>\s*Solution\s*</summary>\s*```ts\s*\n(.*?)```\s*</details>", rest, re.S)
        if not tm:
            errors.append(f"{where} has no ```tests fence")
            continue
        if not sm:
            errors.append(f"{where} has no <details><summary>Solution</summary> ```ts block")
            continue
        try:
            tests = json.loads(tm.group(1))
            assert isinstance(tests, list) and tests
            for t in tests:
                assert isinstance(t, dict) and (("args" in t and "expected" in t and isinstance(t["args"], list)) or "gen" in t)
        except (ValueError, AssertionError):
            errors.append(f"{where}: tests must be a JSON list of {{args: [...], expected}} or {{gen: '...'}}")
            continue
        stm = re.search(r"^```starter\s*\n(.*?)^```", rest, re.S | re.M)
        statement = rest[: min(tm.start(), stm.start() if stm else len(rest))].strip()
        statement = re.sub(r"<details>.*?</details>", "", statement, flags=re.S).strip()
        adapter = meta.get("adapter")
        # A ```starter fence (design problems: a class plus its driver) replaces
        # the generated empty function.
        starter = stm.group(1) if stm else \
            f"function {sig.split(')')[0]}){sig.split(')', 1)[1] if ')' in sig else ''} {{\n  \n}}\n"
        if adapter in ("linked-list", "linked-lists"):
            starter = ("// ListNode is predefined:\n"
                       "// class ListNode { val: number; next: ListNode | null }\n\n" + starter)
        if adapter in ("tree", "tree-out"):
            starter = ("// TreeNode is predefined:\n"
                       "// class TreeNode { val: number; left: TreeNode | null; right: TreeNode | null }\n\n" + starter)
        out.append({
            "id": f"{cid}--{slugify(title)[:60]}",
            "title": title,
            "level": meta["level"],
            "topic": meta["topic"],
            "hint": meta["hint"],
            "fn": fm.group(1),
            "signature": sig,
            "core": meta.get("core", "").lower() == "true",
            "source": meta.get("source", ""),
            "adapter": adapter,
            "check": meta.get("check"),
            "compare": meta.get("compare"),
            "statementMd": statement,
            "tests": tests,
            "solution": sm.group(1).rstrip() + "\n",
            "starter": starter,
            "min": LEVELS[meta["level"]],
        })
    return out, errors


def parse_mcqs(cid: str, path: Path, section: str) -> tuple[list[dict], list[str]]:
    out: list[dict] = []
    errors: list[str] = []
    for i, (q, block) in enumerate(split_blocks(section, MCQ_HEAD)):
        where = f"{path.relative_to(ROOT)}: MCQ '{q[:50]}'"
        opts = re.findall(r"^\s*-\s*\[([ xX])\]\s*(.+?)\s*$", block, re.M)
        why = re.search(r"\*\*Why:\*\*\s*(.+?)\s*$", block, re.M)
        multi = bool(re.search(r"\*\*Multi:\*\*\s*true", block))
        correct = [j for j, (mark, _) in enumerate(opts) if mark.lower() == "x"]
        if len(opts) < 2:
            errors.append(f"{where} needs at least two '- [ ]' options")
        elif not correct or (len(correct) > 1 and not multi):
            errors.append(f"{where} needs exactly one '- [x]' (or **Multi:** true)")
        elif not why:
            errors.append(f"{where} has no **Why:** line")
        else:
            out.append({
                "id": f"{cid}--mcq{i}",
                "q": q,
                "options": [o for _, o in opts],
                "correct": correct,
                "multi": multi,
                "why": why.group(1),
            })
    return out, errors


# --------------------------------------------------------------------------
# Diagrams (contract in AGENT.md: a caption line under every mermaid fence)
# --------------------------------------------------------------------------

DIAGRAM_MD = re.compile(r"^```mermaid[^\n]*\n(?P<src>.*?)^```[ \t]*$\n(?P<after>\s*[^\n]*)", re.S | re.M)
DIAGRAM_HTML = re.compile(
    r'<pre><code class="language-mermaid">(?P<src>.*?)</code></pre>\s*<p><em>(?P<cap>.*?)</em></p>', re.S)


def check_diagrams(path: Path, text: str) -> tuple[list[str], int]:
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
            errors.append(f"{where} has no caption — put an italic one-line caption directly under the closing fence")
    return errors, count


# --------------------------------------------------------------------------
# Markdown -> HTML
# --------------------------------------------------------------------------

MD_EXTENSIONS = ["tables", "fenced_code", "sane_lists", "attr_list", "md_in_html", "toc"]
NESTED_DETAILS = re.compile(
    r'<details markdown="block">\s*(?P<summary><summary>.*?</summary>)(?P<body>.*?)</details>', re.S)


def render_nested_details(html: str) -> str:
    def render(m: re.Match) -> str:
        lines = m.group("body").splitlines()
        indent = min((len(l) - len(l.lstrip()) for l in lines if l.strip()), default=0)
        inner = md_lib.markdown(unescape("\n".join(l[indent:] for l in lines)), extensions=MD_EXTENSIONS)
        return f"<details>{m.group('summary')}{inner}</details>"
    return NESTED_DETAILS.sub(render, html)


def render_html(text: str, path: Path, known: set[str]) -> str:
    text = text.replace("<details>", '<details markdown="1">')
    html = md_lib.markdown(text, extensions=MD_EXTENSIONS)
    html = render_nested_details(html)

    # Links to other chapters become in-page navigation; a link to a file that
    # isn't in the site keeps its text and loses its href — never a dead link.
    def relink(m: re.Match) -> str:
        href, label = m.group("href"), m.group("label")
        target = (path.parent / href.split("#")[0]).resolve()
        key = file_id(target) if (ROOT in target.parents or target.parent == ROOT) else None
        if key and key in known:
            return f'<a href="#{key}" data-nav="{key}">{label}</a>'
        return label

    html = re.sub(r'<a href="(?P<href>[^"]*\.md[^"]*)">(?P<label>.*?)</a>', relink, html, flags=re.S)

    def diagram(m: re.Match) -> str:
        src = unescape(m.group("src")).strip()
        return (f'<figure class="diagram"><pre class="mermaid">{src}</pre>'
                f'<figcaption>{m.group("cap")}</figcaption></figure>')

    return DIAGRAM_HTML.sub(diagram, html)


# --------------------------------------------------------------------------
# Curriculum
# --------------------------------------------------------------------------

def load_curriculum() -> tuple[list[dict], list[str]]:
    errors: list[str] = []
    cur = json.loads(CURRICULUM.read_text(encoding="utf-8"))
    topics = cur["topics"]
    listed: dict[str, str] = {}
    for t in topics:
        for ch in t["chapters"]:
            if not (ROOT / ch).exists():
                errors.append(f"curriculum.json: '{ch}' (topic {t['id']}) does not exist")
            if ch in listed:
                errors.append(f"curriculum.json: '{ch}' is in both '{listed[ch]}' and '{t['id']}'")
            listed[ch] = t["id"]
    excluded = set(cur.get("exclude", []))
    for d in MODULE_DIRS:
        for p in sorted((ROOT / d).glob("*.md")):
            rel = p.relative_to(ROOT).as_posix()
            if rel not in listed and rel not in excluded:
                errors.append(f"curriculum.json: '{rel}' is in no topic and not excluded — add it to one")
    return topics, errors


# --------------------------------------------------------------------------
# Verifying exercises: every reference solution must pass its own tests
# --------------------------------------------------------------------------

def verify_exercises(exercises: list[dict]) -> list[str]:
    node = shutil.which("node")
    if not node:
        print("  ! node not found — exercises NOT verified (install node, or pass --no-verify to silence)",
              file=sys.stderr)
        return []
    runner = (SITE / "runner.js").read_text(encoding="utf-8")
    parts = [runner, "const R = makeRunner();", "(globalThis as any).ListNode = R.ListNode;",
             "(globalThis as any).TreeNode = R.TreeNode;",
             "const report: any[] = [];"]
    for ex in exercises:
        opts = json.dumps({"adapter": ex["adapter"], "check": ex["check"], "compare": ex["compare"]})
        parts.append(
            "{\n"
            f"  const fn: any = (() => {{\n{ex['solution']}\n  return typeof {ex['fn']} === 'function' ? {ex['fn']} : undefined;\n  }})();\n"
            f"  if (!fn) report.push({{ id: {json.dumps(ex['id'])}, missing: true }});\n"
            f"  else report.push({{ id: {json.dumps(ex['id'])}, results: R.run(fn, {json.dumps(ex['tests'])}, {{ ...{opts}, ref: fn }}) }});\n"
            "}"
        )
    parts.append("console.log(JSON.stringify(report));")
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / "verify.ts"
        f.write_text("\n".join(parts), encoding="utf-8")
        try:
            p = subprocess.run([node, "--experimental-transform-types", "--no-warnings", str(f)],
                               capture_output=True, text=True, timeout=300)
        except subprocess.TimeoutExpired:
            return ["exercise verification timed out after 300 s — a reference solution or perf case is too slow"]
    if p.returncode != 0:
        return ["exercise verification crashed under node:\n" + (p.stderr or p.stdout)[-3000:]]
    errors: list[str] = []
    for item in json.loads(p.stdout.strip().splitlines()[-1]):
        if item.get("missing"):
            errors.append(f"exercise {item['id']}: the solution doesn't define the function named in **Function:**")
            continue
        for r in item["results"]:
            if r.get("skipped"):
                continue
            if not r.get("pass"):
                detail = r.get("error") or f"got {json.dumps(r.get('actual'))[:120]}, expected {json.dumps(r.get('expected'))[:120]}"
                errors.append(f"exercise {item['id']}: test {r['i'] + 1} fails its own reference solution — {detail}")
            elif r.get("perf") and r.get("ms", 0) > 1500:
                errors.append(f"exercise {item['id']}: perf test {r['i'] + 1} took {r['ms']:.0f} ms on the reference — shrink it")
    return errors


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------

def plain_words(md: str) -> int:
    md = re.sub(r"```.*?```", " ", md, flags=re.S)
    return len(md.split())


def collect(verify: bool) -> tuple[dict, list[dict], list[str], dict]:
    topics, errors = load_curriculum()
    content: dict[str, dict] = {}
    questions: list[dict] = []
    all_exercises: list[dict] = []
    diagrams = 0

    order = [(ROOT / ch, t) for t in topics for ch in t["chapters"] if (ROOT / ch).exists()]
    known = {file_id(p) for p, _ in order}

    for n, (path, topic) in enumerate(order, 1):
        cid = file_id(path)
        text = path.read_text(encoding="utf-8")
        qs, errs = parse_questions(path, text)
        questions.extend(qs)
        errors.extend(errs)
        derrs, dcount = check_diagrams(path, text)
        errors.extend(derrs)
        diagrams += dcount

        preamble, sections = split_sections(text)
        learn, workshop, exercises, quiz = [], [], [], []
        brief = None
        for heading, body in sections:
            stage = stage_of(heading, body)
            title = clean_heading(heading)
            md = f"## {heading}\n\n{body}"
            if stage == "code":
                exs, e = parse_exercises(cid, path, body)
                exercises.extend(exs)
                errors.extend(e)
                continue
            if stage == "quiz":
                mcqs, e = parse_mcqs(cid, path, body)
                quiz.extend(mcqs)
                errors.extend(e)
                continue
            if stage == "brief":
                brief = body
                continue
            item = {"title": title, "anchor": slugify(heading), "html": render_html(md, path, known),
                    "words": plain_words(body)}
            if stage == "workshop":
                item["blocks"] = len(re.findall(r"^###\s+(?:Q|Design):", body, re.M))
                workshop.append(item)
            else:
                learn.append(item)

        # The opening screen: the chapter's intro plus its brief. For basic
        # chapters the brief is the start; advanced ones teach from zero after it.
        opening = "\n\n".join(x for x in [preamble, f"### In brief\n\n{brief}" if brief else ""] if x)
        if opening:
            learn.insert(0, {"title": "In brief" if brief else "Introduction", "anchor": "intro",
                             "html": render_html(opening, path, known), "words": plain_words(opening),
                             "brief": bool(brief)})
        # Glossary reads best as the last screen of Learn.
        learn.sort(key=lambda s: s["title"].lower().startswith("glossary"))

        for ex in exercises:
            ex["statement"] = render_html(ex.pop("statementMd"), path, known)
        all_exercises.extend(exercises)

        for s in learn:
            s["min"] = max(1, round(s["words"] / 200))
        for s in workshop:
            s["min"] = max(2, s["blocks"] * 4 + round(s["words"] / 400)) if s["blocks"] else max(1, round(s["words"] / 220))

        time = {
            "learn": sum(s["min"] for s in learn),
            "workshop": sum(s["min"] for s in workshop),
            "code": sum(e["min"] for e in exercises),
            "codeCore": sum(e["min"] for e in exercises if e["core"]),
            "quiz": len(quiz),
        }
        content[cid] = {
            "id": cid,
            "n": n,
            "title": title_of(path, text),
            "topic": topic["id"],
            "path": path.relative_to(ROOT).as_posix(),
            "learn": learn,
            "workshop": workshop,
            "exercises": exercises,
            "quiz": quiz,
            "time": time,
            "words": len(text.split()),
            "diagrams": dcount,
        }

    if verify and all_exercises and not errors:
        errors.extend(verify_exercises(all_exercises))

    stats = {
        "chapters": len(content),
        "questions": len(questions),
        "exercises": len(all_exercises),
        "mcqs": sum(len(c["quiz"]) for c in content.values()),
        "diagrams": diagrams,
        "words": sum(c["words"] for c in content.values()),
    }
    topic_out = [{k: t[k] for k in ("id", "title", "level", "blurb")} |
                 {"chapters": [file_id(ROOT / ch) for ch in t["chapters"] if (ROOT / ch).exists()]}
                 for t in topics]
    return content, questions, errors, {"stats": stats, "topics": topic_out}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="parse, validate and verify; write nothing")
    ap.add_argument("--no-verify", action="store_true", help="skip running reference solutions under node")
    args = ap.parse_args()

    content, questions, errors, meta = collect(verify=not args.no_verify)

    if errors:
        print("Malformed content:\n", file=sys.stderr)
        for e in errors:
            print(f"  ✗ {e}", file=sys.stderr)
        print(f"\n{len(errors)} problem(s) break a content contract (see AGENT.md). Site not written.", file=sys.stderr)
        return 1

    s = meta["stats"]
    hours = lambda key: sum(c["time"][key] for c in content.values()) / 60
    print(f"Chapters          {s['chapters']} in {len(meta['topics'])} topics")
    print(f"Exercises         {s['exercises']}  (verified: {'no' if args.no_verify else 'yes'})")
    print(f"MCQs              {s['mcqs']}")
    print(f"Questions         {s['questions']}")
    print(f"Diagrams          {s['diagrams']}")
    print(f"Words             {s['words']:,}")
    print(f"Time              learn {hours('learn'):.0f} h · workshop {hours('workshop'):.0f} h · "
          f"code {hours('code'):.0f} h (core {hours('codeCore'):.0f} h) · quiz {hours('quiz'):.0f} h")

    if args.check:
        print("\n--check: nothing written.")
        return 0

    template = (SITE / "template.html").read_text(encoding="utf-8")
    css = (SITE / "vendor" / "codemirror-5.65.18.min.css").read_text(encoding="utf-8") + "\n" + \
        (SITE / "site.css").read_text(encoding="utf-8")
    js = (SITE / "site.js").read_text(encoding="utf-8")
    runner = (SITE / "runner.js").read_text(encoding="utf-8")
    data = json.dumps({"content": content, "questions": questions, **meta},
                      ensure_ascii=False, separators=(",", ":"))
    # Keep the JSON from closing its own <script> tag.
    data = data.replace("</", "<\\/")

    out = (template.replace("/*{{CSS}}*/", css)
           .replace("/*{{RUNNER}}*/", runner)
           .replace("/*{{JS}}*/", js)
           .replace("/*{{DATA}}*/", data))
    (SITE / "index.html").write_text(out, encoding="utf-8")
    print(f"\nWrote site/index.html  ({len(out.encode()) / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
