---
name: resume-build
description: Rebuild a resume design's PDF after any edit to its resume.md or resume.css under designs/. Use whenever resume content, wording, sections, or PDF styling change — the PDFs in output/ are generated and must never be hand-edited or left stale.
---

# Resume build

Two resume designs live side by side; each is a self-contained
`resume.md` + `resume.css`. One pipeline (`build.py`) renders either.

```
designs/design-1/resume.md    content — the primary design (source of truth for tailoring & prep)
designs/design-1/resume.css   print/PDF styling for design 1
designs/design-2/resume.md    content — the alternate single-column variant
designs/design-2/resume.css   print/PDF styling for design 2
build.py                      Markdown + CSS -> HTML -> PDF -> ATS + content report
output/design-1/tejashwasharma_resume.pdf   generated; never hand-edit
output/design-2/tejashwasharma_resume.pdf   generated; never hand-edit
```

## Rebuild-on-edit rule

Immediately after editing a design's `.md` or `.css`, without waiting to be
asked to "build":

```
python3 build.py 1        # rebuild design 1  (default: `python3 build.py`)
python3 build.py 2        # rebuild design 2
python3 build.py all      # rebuild both
```

Each run regenerates that design's PDF and prints an ATS score + content
report. Read the output before treating the build as done — a nonzero exit
or a validation error means the previous PDF was deliberately left untouched.

Then open it so the change is visible:

```
open output/design-1/tejashwasharma_resume.pdf
```

If the build fails (missing dependency, Markdown/CSS error), fix the reported
problem first. Never open a stale PDF from an earlier run and never present it
as the result of the edit.

## Verifying a visual change

The terminal ATS report says nothing about layout. To check how a styling
change rendered, rasterize the pages and look:

```
python3 -c "
import fitz
d = fitz.open('output/design-1/tejashwasharma_resume.pdf')
for i, p in enumerate(d): p.get_pixmap(dpi=110).save(f'page{i+1}.png')
print('pages', d.page_count)"
```

Write the PNGs to the session scratchpad directory, then read them. Watch the
page count: spacing changes can silently push the resume onto a third page.

## After a content change, check the interview prep

`interview-prep/` (tracked in this repo) derives from **design 1**. A content
edit — new skill, reworded bullet, changed metric — can leave it stale. After
rebuilding:

```
cd interview-prep && python3 check_coverage.py
```

Non-zero means design 1 now claims something the prep doesn't teach. See
`AGENT.md` for what each kind of change implies. Styling-only CSS edits don't
affect it.

## Layout routing

The Markdown is a flat list of sections; the column/placement of each is
declared inline beside its heading, and `apply_layout()` in `build.py` routes
it:

```
## Work Experience {: .full }     full-width, starts on its own page
## Profile Summary                default flow
```

`add_section_slugs()` gives each heading a `sec-<slug>` class from its own
text — that is what the CSS hangs the section icon on, so renaming a section
moves its icon with it, no CSS edit needed.

Whole-list classes (`{: .contact }`, `{: .pills }`, `{: .skill }`): `attr_list`
has no spelling for a `<ul>`/`<p>` group, so the class sits on a standalone
line under the last item and `promote_list_classes()` moves it up. A new
whole-list class must be added to `LIST_CLASSES` in `build.py`.

Design 1 is single-column. Its contact block is left-aligned (not right) on
purpose: a right-aligned block gives every line a different left edge and
trips the ATS multi-column heuristic, costing 8 points.

## Gotchas

- python-markdown never lets a list interrupt a paragraph, so a bullet list
  directly under a bold lead-in ("Awards received:") would flatten into the
  paragraph. `normalize_lists()` in `build.py` inserts the blank line at parse
  time — keep it; the `.md` stays untouched.
- In CSS, `:only-child` ignores text nodes, so `p:has(> strong:only-child)`
  matches far more paragraphs than an all-bold one. Don't reach for it to
  target a lead-in paragraph.
- The horizontal page insets live on `body`'s padding, not in `@page`.
  Chromium clips anything painted into the `@page` margin area, and the
  left-margin marker bars deliberately bleed to the sheet edge.
- Page 1 fills the sheet almost exactly. A trailing margin on the last block,
  or an absolutely positioned marker poking above the top of a page, spills an
  empty fragment and costs a whole blank page — check the page count after any
  spacing change.

## The tailoring tool

`tailor/tailor_cv.py` builds per-application variants of design 1 under
`tailor/output/` (gitignored), reusing `build.py` unchanged via
`--md/--css/--output`. That flow is the **`resume-tailor`** skill; don't run
it from here.
