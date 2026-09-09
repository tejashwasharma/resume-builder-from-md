---
name: resume-tailor
description: From a pasted LinkedIn job or search-results link, screen every posting against the master CV, then create and build a tailored resume folder under tailor/output/ for each strong match. Use when the user pastes a LinkedIn jobs link and asks to match their CV / tailor / prep applications, or invokes this skill after pasting one. The master designs/design-1/resume.md is never edited.
---

# Resume tailor

**Input:** a LinkedIn job link or search-results link (often from a job-alert
email — one `currentJobId`, sometimes a whole list).

**Output:** a ranked screen of every posting against the master CV, printed in
chat, and a built tailored-resume folder under `tailor/output/` for each posting
that is a **strong** match — each holding a tailored CV, its PDF, and a cover
letter written for that posting.

The master `designs/design-1/resume.md` is the source of truth and is **never
edited for an application**. `tailor_cv.py` drives everything and reuses
`build.py` unchanged, so ATS and content scoring match the master
build exactly.

---

## Flow

### 1. Enumerate the postings

```
python3 tailor/tailor_cv.py jobs "<the pasted URL>"
```

Prints one line per posting: `<jobId>  <view URL>`. Handles both the
single-job and multi-job (`originToLandingJobPostings`) URL shapes.

### 2. Fetch each posting

WebFetch each `https://www.linkedin.com/jobs/view/<id>` URL. LinkedIn often
301s to `https://uk.linkedin.com/jobs/view/<slug>-<id>` — follow the redirect
it reports. Pull: title, company, location, seniority, the full description,
required vs preferred skills, years of experience.

### 3. Screen against the master

Read `designs/design-1/resume.md` and `interview-prep/WEAK-SPOTS.md` first.
Score each posting on five axes, then rank:

| Axis | Strong | Weak |
| --- | --- | --- |
| **Domain match** | core of the role is what the master evidences (IAM, auth, platform, backend/API at scale) | role is a different discipline (pure infra/SRE, data eng, mobile, ML) |
| **Seniority** | within one level of Senior Engineer I | two+ levels off, or hard-gated on years/title he doesn't have |
| **Must-haves** | every hard requirement is on the master, or missable | multiple hard requirements absent (e.g. deep K8s + primary Go together) |
| **Location / sponsorship** | remote, or explicitly sponsors, or user has said they'll relocate | on-site with "must be based in / relocatable to <city>" and no sponsorship signal |
| **Selection realism** | a recruiter would shortlist this profile | profile only clears the JD by keyword-stuffing |

Print a ranked table: rank, company + role, the five axes in short form, a
one-line verdict, and **strong / borderline / skip**.

### 4. Decide what gets a folder

- **Strong** — domain match is strong, seniority within one level, at most one
  missable must-have gap, and not location-blocked. Build a folder (step 5).
- **Borderline** — one serious concern. List it, say why, and ask the user
  whether to build it. Don't build unprompted.
- **Skip** — hard-gated, wrong discipline, or location-blocked with no
  sponsorship. Name it and the reason; no folder.

Always flag the location/sponsorship reality up front if the batch is
mostly one country and the user is elsewhere — it caps real odds regardless
of fit.

### 5. Build a folder per strong match

Slug convention: `<company>-<role-keyword>`, e.g. `ripple-staff-auth`,
`bjak-tech-lead`.

```
python3 tailor/tailor_cv.py new <slug>
```

Creates `tailor/output/<slug>/` with `job.md`, a copy of the master, and
`cover-letter.md`.

**a. Fill `job.md`** — header (link, location, sponsorship note, seniority,
date), the full JD, and — as you tailor — a line-by-line log of every change
and its reason under "What this variant changes".

**b. Tailor `tailor/output/<slug>/tejashwasharma_resume.md`** (that copy only):

- **Profile Summary** — lead with the part of the background the role is
  about; adopt the JD's framing where it's true ("identity platform", "money
  movement at scale", "hands-on technical lead"). The role subtitle under the
  name, and the objective line above the columns, may both be repositioned to
  match the posting.
- **Technical Skills** — reorder lines and terms so what the JD names comes
  first. Don't pad with skills that aren't there.
- **Core Competencies** — reorder the list for the posting; keep it about a
  dozen long, since the resume is a tight two pages.
- **Experience** — reorder bullets within a role and reword to surface the
  matching work. Every bullet stays an achievement with its metric intact.
- **Two pages.** Drop the least-relevant bullets to make room — that's the
  point of a variant.

**c. Honesty is the constraint.** Reorder, reword, re-emphasise, drop. Never
add a tool, a project, a metric, or a team size the master doesn't have. If
`interview-prep/WEAK-SPOTS.md` flags something as thin (Go depth, Kubernetes),
tailoring must not inflate it — the interview finds the seam. Those gaps
belong in the cover note, not the CV.

**d. Build**

```
python3 tailor/tailor_cv.py build <slug>
```

Writes `tailor/output/<slug>/tejashwasharma_resume.pdf` and prints the ATS score
and content report. Non-zero exit leaves the previous PDF untouched. Fix any
content warning it's reasonable to fix (an over-length bullet); the "no
current role" flag is accurate and matches the master — leave it.

**e. Verify layout** — rasterise and look, watching the page count:

```
python3 -c "
import fitz
d = fitz.open('tailor/output/<slug>/tejashwasharma_resume.pdf')
for i, p in enumerate(d): p.get_pixmap(dpi=110).save(f'v{i+1}.png')
print('pages', d.page_count)"
```

Write the PNGs to the session scratchpad and read them.

**f. Write the cover letter** — `tailor/output/<slug>/cover-letter.md`

Write it **after** tailoring the CV, not before. The tailored CV has already
decided which parts of the background this role is about; the letter carries
the reasoning the CV format cannot, and the two must agree.

Markdown, not PDF. Most applications want a letter pasted into a form or an
email body, and a plain-text letter survives that. Only build a PDF if the user
asks.

**Four paragraphs, 250–350 words.** Longer does not get read.

1. **The hook** — why this role at this company, naming something real from the
   posting or the product. Never "I am writing to apply for the position of".
2. **The proof** — the single most relevant achievement from the master, with
   its metric, told as a result. One story, not a list. The CV is the list.
3. **The fit** — connect two or three of the JD's stated needs to work already
   on the master. Their vocabulary, his evidence.
4. **The close** — what he wants next, plus an honest note on any gap worth
   naming first. Short.

**The letter is where a gap gets addressed, and the only place.** Rule (c)
above forbids the CV from inflating anything `WEAK-SPOTS.md` flags as thin —
Go depth, Kubernetes, Ping Identity. If the JD hard-requires one of those, the
letter names it, scopes it accurately, and says what ramping looks like. Done
in one sentence that reads as confidence, not apology. Silence is worse: they
find the seam in the interview either way.

**Same honesty constraint as the CV.** Every claim traces to
`designs/design-1/resume.md`. No new tools, metrics, team sizes or projects, and
no enthusiasm that implies experience he doesn't have.

**Banned:** "passionate", "dynamic", "fast-paced", "wear many hats",
"rockstar/ninja", "I would be a great fit", and any paragraph that restates the
CV in prose. If a sentence would survive being pasted into a different
application unchanged, cut it — that's the test for whether it's actually
tailored.

Address a named hiring manager where the posting gives one; "Dear Hiring Team"
otherwise. Never "To Whom It May Concern".

### 6. Report back

- The ranked table from step 3.
- Which slugs got folders, each with its ATS score and page count.
- For each, the cover letter's angle in one line — the hook and the gap it
  addresses, if any — so the user can sanity-check the pitch without opening
  the file.
- Which postings were skipped or held as borderline, and why.
- The location/sponsorship caveat if it applies.

---

## Other commands

```
python3 tailor/tailor_cv.py list           every variant: PDF built, letter written, job, status
python3 tailor/tailor_cv.py diff <slug>    unified diff of the variant against master
```

`list` shows `✓ cl` once a letter is written, `draft` while it's still the
scaffolded template, so an application that's missing its letter is visible at
a glance.

Run `diff <slug>` before an application to re-read exactly what changed and
confirm all of it is defensible in an interview. Re-read the cover letter at
the same time — it must not claim anything the diff doesn't support.

## When the master changes

A variant is a point-in-time fork; it does not auto-update. After a master
edit, `diff <slug>` shows whether the drift matters for that job — re-scaffold
if it's easier.

## Boundaries

- Never edit `designs/design-1/resume.{md,css}` from this skill. A change to
  the master itself is the `resume-build` skill.
- Never `git add -f` anything under `tailor/output/` — private, per-job.
