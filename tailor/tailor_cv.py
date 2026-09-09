#!/usr/bin/env python3
"""
tailor_cv.py — per-application resume variants, without touching the master.

The master (`designs/design-1/resume.md`) is the source of truth and is never
edited for a single job. Each application gets its own folder under
`tailor/output/` (gitignored) holding a copy of the Markdown to tailor, the job
description it is aimed at, a cover letter drafted from both, and its own
built PDF.

Rendering and scoring are NOT reimplemented here — this script copies the
variant Markdown and the design-1 CSS through `build.py` with an explicit
`--md/--css/--output`, so the real pipeline runs unchanged and ATS/content
scoring matches the master build exactly.

    python3 tailor_cv.py jobs  "<url>"    LinkedIn job/search URL -> job IDs + view links
    python3 tailor_cv.py new   <slug>     scaffold tailored_cv/<slug>/
    python3 tailor_cv.py build <slug>     build that variant's PDF + reports
    python3 tailor_cv.py diff  <slug>     unified diff: variant vs master .md
    python3 tailor_cv.py list             every variant, with target job

A <slug> is a short kebab-case id, e.g. `ripple-staff-auth`.

The usual entry point is the `resume-tailor` skill: paste a LinkedIn jobs
link, and it runs `jobs` to enumerate postings, screens each against the
master, and creates + builds a folder here for every strong match.
"""

from __future__ import annotations

import argparse
import difflib
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
MASTER_MD = REPO / "designs" / "design-1" / "resume.md"
MASTER_CSS = REPO / "designs" / "design-1" / "resume.css"
BUILDER = REPO / "build.py"
TAILORED = ROOT / "output"

JOB_TEMPLATE = """\
# <Job title> — <Company>

- **Link:** <url>
- **Location:** <where / remote / sponsorship?>
- **Seniority:** <level on the posting>
- **Added:** <YYYY-MM-DD>
- **Status:** draft
  <!-- draft | applied | interviewing | closed -->


## Job description

<paste the full JD here — it is the input for tailoring and for the
keyword-coverage read>

## What this variant changes vs the master

<fill in as you tailor — one line per change, and why. Keep it honest:
reorder, reword, re-emphasise. Do not add experience the master doesn't have.>
"""

# The cover letter is plain Markdown on purpose: most applications want it
# pasted into a form or an email body, not attached as a second PDF. Everything
# in it must be traceable to the master CV — the letter is where a gap gets
# addressed honestly, never where a new claim gets invented.
COVER_TEMPLATE = """\
# Cover letter — <Job title>, <Company>

- **For:** tailored_cv/<slug>/
- **Addressed to:** <hiring manager name, or "Hiring Team">
- **Status:** draft
  <!-- draft | sent -->

<!--
  Four paragraphs, 250-350 words total. Longer does not get read.

  1. THE HOOK — why this role, this company, specifically. Name something real
     from the posting or the product. No "I am writing to apply for".
  2. THE PROOF — the single most relevant achievement, with its metric, told as
     a result rather than a duty. One story, not a list; the CV is the list.
  3. THE FIT — connect two or three of their stated needs to work already on
     the master CV. Their vocabulary, his evidence.
  4. THE CLOSE — what he wants next, plus the honest note on any gap worth
     naming before they find it. Short.

  Rules:
  - Every claim traces to designs/design-1/resume.md. No new tools, metrics,
    team sizes or projects.
  - Address a real gap directly if the JD hard-requires something thin (see
    interview-prep/WEAK-SPOTS.md). Scoped honestly, that reads as confidence.
  - No "passionate", "dynamic", "fast-paced", "wear many hats", "rockstar".
  - Do not restate the CV in prose. It adds a reason the CV cannot carry.
-->

---

Dear <name / Hiring Team>,

<letter body>

Best regards,
Tejashwa Sharma
+91-7869097744 · tejsharma407@gmail.com
linkedin.com/in/tejashwasharma
"""


def _variant_dir(slug: str) -> Path:
    return TAILORED / slug


def _variant_md(slug: str) -> Path:
    return _variant_dir(slug) / "tejashwasharma_resume.md"


def cmd_jobs(url: str) -> int:
    """Pull LinkedIn job posting IDs out of a job or search-results URL."""
    ids: list[str] = []

    def add(val: str) -> None:
        for part in unquote(val).replace("%2C", ",").split(","):
            part = part.strip()
            if part.isdigit() and len(part) >= 6 and part not in ids:
                ids.append(part)

    q = parse_qs(urlparse(url).query)
    for key in ("currentJobId", "originToLandingJobPostings", "jobId"):
        for val in q.get(key, []):
            add(val)
    # Fallback: scan the raw string for the shapes LinkedIn also uses.
    for m in re.finditer(r"(?:jobs/view/|currentJobId=|jobId=)(\d{6,})", url):
        if m.group(1) not in ids:
            ids.append(m.group(1))

    if not ids:
        print("no job IDs found in that URL", file=sys.stderr)
        return 1
    for jid in ids:
        print(f"{jid}\thttps://www.linkedin.com/jobs/view/{jid}")
    return 0


def cmd_new(slug: str) -> int:
    d = _variant_dir(slug)
    if d.exists():
        print(f"ERROR: {d} already exists", file=sys.stderr)
        return 1
    if not MASTER_MD.exists():
        print(f"ERROR: master not found: {MASTER_MD}", file=sys.stderr)
        return 1

    d.mkdir(parents=True)
    shutil.copyfile(MASTER_MD, _variant_md(slug))
    (d / "job.md").write_text(JOB_TEMPLATE, encoding="utf-8")
    (d / "cover-letter.md").write_text(
        COVER_TEMPLATE.replace("<slug>", slug), encoding="utf-8"
    )

    print(f"Created {d.relative_to(ROOT)}/")
    print("  job.md                     — paste the JD, note your changes")
    print("  tejashwasharma_resume.md   — copy of the master; tailor this one")
    print("  cover-letter.md            — draft from the JD + the tailored CV")
    print()
    print(f"Next: edit the Markdown, then  python3 tailor_cv.py build {slug}")
    return 0


def cmd_build(slug: str) -> int:
    md = _variant_md(slug)
    if not md.exists():
        print(f"ERROR: no variant at {md}. Run:  python3 tailor_cv.py new {slug}", file=sys.stderr)
        return 1
    if not MASTER_CSS.exists() or not BUILDER.exists():
        print("ERROR: design-1 CSS or build.py missing", file=sys.stderr)
        return 1

    out_pdf = _variant_dir(slug) / "tejashwasharma_resume.pdf"

    # Reuse the real pipeline unchanged: build.py renders this variant's
    # Markdown against the design-1 stylesheet, redirecting only the output PDF.
    proc = subprocess.run(
        [
            sys.executable, str(BUILDER),
            "--md", str(md.resolve()),
            "--css", str(MASTER_CSS.resolve()),
            "--output", str(out_pdf.resolve()),
        ],
    )

    if proc.returncode == 0:
        print(f"\nVariant PDF: {out_pdf.relative_to(ROOT)}")
    else:
        print("\nBuild failed — variant PDF left untouched.", file=sys.stderr)
    return proc.returncode


def cmd_diff(slug: str) -> int:
    md = _variant_md(slug)
    if not md.exists():
        print(f"ERROR: no variant at {md}", file=sys.stderr)
        return 1
    master = MASTER_MD.read_text(encoding="utf-8").splitlines(keepends=True)
    variant = md.read_text(encoding="utf-8").splitlines(keepends=True)
    diff = list(difflib.unified_diff(master, variant, "master", f"{slug}", n=2))
    if not diff:
        print("identical to master — nothing tailored yet")
        return 0
    sys.stdout.writelines(diff)
    return 0


def cmd_list() -> int:
    if not TAILORED.is_dir():
        print("no tailored_cv/ yet")
        return 0
    rows = []
    for d in sorted(p for p in TAILORED.iterdir() if p.is_dir()):
        job = d / "job.md"
        headline, status = "(no job.md)", ""
        if job.exists():
            for line in job.read_text(encoding="utf-8").splitlines():
                bare = line.lstrip("- *").strip()
                if line.startswith("# "):
                    headline = line[2:].strip()
                elif bare.lower().startswith("status:"):
                    status = bare.split(":", 1)[1].strip().strip("*").split()[0] if ":" in bare else ""
            if headline.startswith("<Job title>"):
                headline = "(unfilled)"
        pdf = "✓ pdf" if (d / "tejashwasharma_resume.pdf").exists() else "—"
        # A scaffolded-but-unwritten letter still holds the placeholder, so
        # existence alone would over-report. Check it was actually drafted.
        cover = d / "cover-letter.md"
        if not cover.exists():
            cl = "—"
        elif "<letter body>" in cover.read_text(encoding="utf-8"):
            cl = "draft"
        else:
            cl = "✓ cl"
        rows.append((d.name, headline, status, pdf, cl))
    if not rows:
        print("no variants yet — create one with:  python3 tailor_cv.py new <slug>")
        return 0
    w = max(len(r[0]) for r in rows)
    for name, headline, status, pdf, cl in rows:
        tail = f"  [{status}]" if status else ""
        print(f"  {name:<{w}}  {pdf:<6}  {cl:<6}  {headline}{tail}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sj = sub.add_parser("jobs")
    sj.add_argument("url")
    for name in ("new", "build", "diff"):
        s = sub.add_parser(name)
        s.add_argument("slug")
    sub.add_parser("list")
    args = ap.parse_args()

    if args.cmd == "jobs":
        return cmd_jobs(args.url)
    if args.cmd == "new":
        return cmd_new(args.slug)
    if args.cmd == "build":
        return cmd_build(args.slug)
    if args.cmd == "diff":
        return cmd_diff(args.slug)
    if args.cmd == "list":
        return cmd_list()
    return 2


if __name__ == "__main__":
    sys.exit(main())
