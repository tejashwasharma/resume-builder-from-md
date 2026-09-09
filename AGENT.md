# Agent instructions — resume project

## Layout

```
build.py                       Markdown + CSS -> HTML -> PDF -> ATS + content report
designs/
  design-1/resume.md           content — the primary design (source of truth)
  design-1/resume.css          styling for design 1 (single-column, ATS 100)
  design-2/resume.md           content — the alternate single-column variant
  design-2/resume.css          styling for design 2
output/
  design-1/tejashwasharma_resume.pdf   generated; never hand-edit
  design-2/tejashwasharma_resume.pdf   generated; never hand-edit
tailor/
  tailor_cv.py                 per-application variants of design 1
  output/                      gitignored; one folder per job, each with its own PDF
interview-prep/                tracked; study material derived from design 1
```

## Rebuild-on-edit rule

Editing a design's `resume.md` or `resume.css` means rebuilding that design's
PDF immediately — don't wait to be asked.

The full procedure (build command, ATS-report check, opening the result,
visual verification, the Markdown/CSS gotchas) lives in the **`resume-build`**
skill at `.claude/skills/resume-build/SKILL.md`. Follow it rather than
duplicating the steps here; the skill is the source of truth.

Short version: `python3 build.py 1` (or `2`, or `all`) from this directory,
read the ATS report, then `open output/design-<n>/tejashwasharma_resume.pdf`.
Never open a stale PDF after a failed build.

## Tailoring for a specific job

When the user pastes a LinkedIn job or search-results link and wants their CV
matched, **do not edit `designs/design-1/resume.md`**. Use the
**`resume-tailor`** skill at `.claude/skills/resume-tailor/SKILL.md`. It
enumerates the postings (`tailor/tailor_cv.py jobs "<url>"`), screens each
against design 1 + `interview-prep/WEAK-SPOTS.md`, and for every strong match
scaffolds and builds a folder under `tailor/output/` (gitignored) with a
tailored CV, its PDF, and a cover letter. The build reuses `build.py`
unchanged, so ATS/content scoring matches.

## Interview prep lives here too

`interview-prep/` holds study material derived from **design 1** — guides, an
AI-drilled study site, and the stories behind each bullet. It has its own
[AGENT.md](interview-prep/AGENT.md); read that before working in it. It is
tracked here like any other file — do **not** create a nested `.git` under it,
which would turn the directory into a submodule gitlink and stop the files
being tracked.

### The resume and the prep must not drift

Design 1 is the source of truth for *what needs preparing*. After any change
to `designs/design-1/resume.md` — a new skill, a reworded bullet, a new
metric — check the prep still covers it:

```
cd interview-prep && python3 check_coverage.py
```

It exits non-zero when the resume claims something the prep doesn't teach, and
names the gap.

| Resume change | What to update in `interview-prep/` |
| --- | --- |
| New skill/technology added | A guide covering it, in the matching module |
| Skill removed | Prune or de-emphasise it; drop it from `INDEX.md` |
| Bullet reworded or a metric changed | The matching story in `00-experience/` |
| New bullet | A new story with STAR + follow-ups |
| A claim made bolder | Check `WEAK-SPOTS.md` — bolder claims invite harder probes |

Then rebuild the site so the change reaches the study artifact:

```
cd interview-prep && python3 build_site.py
```

## Version control

Public GitHub repo (`resume-builder-from-md`). `origin` is
`ssh://git@ssh.github.com:443/...` rather than the default port-22 URL,
because port 22 is blocked on at least one network this has run on. Plain
`git push` / `git pull` work as normal — don't "fix" the remote back to the
`git@github.com:...` shorthand.

**Never commit or push without the user's explicit approval for that specific
change.** Editing files and running builds/checks needs no sign-off; `git
commit` and `git push` do, every time — an earlier approval doesn't carry
forward.

**Publish before you commit and push.** If `interview-prep/` Markdown changed,
rebuild and republish its artifact first. If a design changed, rebuild its PDF
first. A commit whose generated output doesn't match what changed is worse
than one that lags behind by a build.
