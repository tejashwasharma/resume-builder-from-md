---
name: resume-build
description: Rebuild the resume PDF after any edit to resume.md or resume.css. Use whenever resume content, wording, sections, or PDF styling change — the PDFs in output/ are generated and must never be hand-edited or left stale.
---

# Resume build

Two resumes share one `resume.css`: `resume.md` (auth/platform) and
`resume-backend.md` (Node/backend, language-agnostic). One pipeline (`build.py`)
renders either.

```
resume.md                     content (source of truth for tailoring & prep)
resume-backend.md            content — backend variant
resume.css                    print/PDF styling (shared)
build.py                      Markdown + CSS -> HTML -> PDF -> ATS + content report
output/tejashwasharma_resume.pdf   generated; never hand-edit
output/tejashwasharma_resume_backend.pdf   generated; never hand-edit
```

## Rebuild-on-edit rule

Immediately after editing `resume.md` or `resume.css`, without waiting to be
asked to "build":

```
python3 build.py                    # resume.md
python3 build.py --variant backend  # resume-backend.md
```

Each run regenerates the PDF and prints an ATS score + content
report. Read the output before treating the build as done — a nonzero exit
or a validation error means the previous PDF was deliberately left untouched.

Then open it so the change is visible:

```
open output/tejashwasharma_resume.pdf
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
d = fitz.open('output/tejashwasharma_resume.pdf')
for i, p in enumerate(d): p.get_pixmap(dpi=110).save(f'page{i+1}.png')
print('pages', d.page_count)"
```

Write the PNGs to the session scratchpad directory, then read them. Watch the
page count: spacing changes can silently push the resume onto a third page.

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

The resume is single-column. Its contact block is left-aligned (not right) on
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

`tailor/tailor_cv.py` builds per-application variants of the resume under
`tailor/output/` (gitignored), reusing `build.py` unchanged via
`--md/--css/--output`. That flow is the **`resume-tailor`** skill; don't run
it from here.
