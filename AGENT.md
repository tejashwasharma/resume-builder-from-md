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
interview-prep/                tracked; a standalone, shareable interview study book
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
against design 1, and for every strong match
scaffolds and builds a folder under `tailor/output/` (gitignored) with a
tailored CV, its PDF, and a cover letter. The build reuses `build.py`
unchanged, so ATS/content scoring matches.

## Interview prep lives here too

`interview-prep/` is a **standalone interview study book**, written to be
shared with anyone: guides, a generated study site, and drill skills. It is no
longer derived from the resume and holds nothing about this repo's owner — see
its own [AGENT.md](interview-prep/AGENT.md), and read that before working in
it. It is tracked here like any other file — do **not** create a nested `.git`
under it, which would turn the directory into a submodule gitlink and stop the
files being tracked.

It has no coupling to the resume in either direction: a resume change needs no
prep change, and the prep must not acquire claims about one person's history.
Its own checks are the gate:

```
cd interview-prep && python3 check_coverage.py     # question blocks, diagrams, links
cd interview-prep && python3 build_site.py         # regenerate site/index.html
```

## Version control

Public GitHub repo (`resume-builder-from-md`)

**Never commit or push without the user's explicit approval for that specific
change.** Editing files and running builds/checks needs no sign-off; `git
commit` and `git push` do, every time — an earlier approval doesn't carry
forward.

**Publish before you commit and push.** If `interview-prep/` Markdown changed,
rebuild and republish its artifact first. If a design changed, rebuild its PDF
first. A commit whose generated output doesn't match what changed is worse
than one that lags behind by a build.

**Never work inside `.claude/worktrees/`.** Those are ephemeral git worktree
checkouts a session creates for itself and deletes when done — scratch space
belonging to whichever session made it, not part of this project's tree.
Don't read, edit, or fix files there, and don't reference paths under it once
that session has ended. Work from the repo root instead (or, if this session
is itself isolated in a worktree, from that worktree's own path).
