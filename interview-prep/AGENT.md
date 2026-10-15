# Agent instructions — interview-prep

A study book for senior software engineering interviews, meant to be shared:
anyone can clone it and prepare from it. **Everything here is world-readable**,
so write for a reader you do not know — never for one person's resume, and
never with a specific employer's internal detail in it.

Two rules follow from that, and they are the ones most easily broken:

- **Never assert anything about the reader.** Not their job history, not what
  is on their CV, not which company they are interviewing with. Where only the
  reader can supply a detail, leave a `> **Your turn:** <what's needed and why
  it matters>` prompt instead of inventing one.
- **Technical citations are welcome; company targeting is not.** Naming
  Spanner, Zanzibar, GFS, Borg or BeyondCorp as published sources is what makes
  the material credible. A sentence about *whose loop the reader is preparing
  for* is not.

The book is Node/TypeScript-centred and says so up front (README, and the
intro of `02-interview-core/01`). Keep concrete examples in that stack rather
than scattering languages.

## Checks

```
python3 check_coverage.py     # question blocks, diagram captions, links
python3 build_site.py --check # curriculum completeness, exercises, MCQs
```

Both must pass before a change is done.

## Structure

- `01-` … `10-` — topic guides, the knowledge base. Questions live here, once.
- `curriculum.json` — the study order and the site's topic structure. Every
  chapter `.md` must appear in exactly one topic or in `exclude`.
- `.claude/skills/` — `drill`, `mock-interview`, `prep-status`. These hold
  *procedure* only. Never move question content into a skill.
- [INDEX](INDEX.md) — topic/keyword → exact file. Use it to locate material instead
  of globbing; keep it updated when adding a guide.
- `progress/log.md` — append-only record of drill sessions and weak areas.

## The question format is a contract

`drill` and `mock-interview` parse it. Every question block must be:

```markdown
### Q: <question>
**Level:** foundation | intermediate | senior · **Tags:** comma, separated

<details><summary>Model answer</summary>

<answer>

</details>

**Follow-ups:**
1. Q: <follow-up>
   <details><summary>Answer</summary><answer></details>
```

Design prompts use a rubric instead of a single answer:

```markdown
### Design: <prompt>
**Level:** senior · **Time:** 45 min
**What a strong answer covers:**
- <checklist item>

<details><summary>Worked solution</summary>...</details>
```

A block missing `**Level:**` or with an empty `<details>` breaks the drills.
`python3 check_coverage.py` validates this.

## Every technical chapter gets a "Building it" section

Placed as its own `## Building it` section, immediately before `## Interview
Q&A`. It answers "if I had to actually build this today, what would I reach
for" — the question a mock interview follow-up ("how would you implement
that") or a take-home actually asks, one level more concrete than "How it
actually works".

Shape, adapted to what the chapter covers:

- **Libraries** — a short table: library/tool → what it's for. Name the one a
  senior Node/TypeScript engineer would actually reach for (`jose` over
  hand-rolled JWT signing, `ioredis` over `redis`), not every alternative.
  Note when the right answer is "don't add a library" (e.g. token-bucket maths
  in five lines beats a dependency).
- **Setting it up** — only for chapters where a real external console exists
  to click through (OAuth2, OIDC, SAML, SCIM, MFA enrolment, OPA bundles, AWS
  services). Concrete steps in a real provider's admin UI — Okta, since the
  book already uses it as the reference IdP — not a generic description.
  Skip this subsection entirely where there's no console step.
- **Pseudocode** — the mechanism's core logic, 15–30 lines, naming the actual
  library from the table. Reuse and lightly adapt code that already exists
  elsewhere in the chapter rather than re-deriving it. Explain *why* a
  non-obvious line is there (why a script must be atomic, why a check happens
  before a mutation) rather than just presenting it.

System-design chapters (`02-interview-core/31`–`40`) get a lighter version —
"**Reference stack**": the libraries you'd name out loud when an interviewer
asks what you'd build this with, no setup steps, no full pseudocode. Coding
chapters (`02-interview-core/03`–`19`) get **Data structures** instead of
libraries — the standard structure per pattern, since a DSA round is
explicitly testing that you don't reach for a dependency.

## The interview-core part

**A chapter's number is a stable id, not its position.** `curriculum.json` is
the reading order and the sidebar's grouping, and a chapter can sit in a topic
with files from other directories. `02-interview-core/` runs `01`–`46`, roughly
grouped as `01` the process, `03`–`19` coding, `20`–`30` plus `44`–`46`
distributed systems, `31`–`39` system design, `40`–`41` security, `42`
behavioural, `43` the schedule — but new chapters take the next free number and
are placed where they belong in `curriculum.json`, rather than renumbering
everything and breaking every inbound link. Keep it company-neutral: no employer-, team- or
job-posting-specific content, and no process detail you cannot source
publicly.

Keep it generic implementation guidance. Where the honest answer depends on
what the reader has actually built, point at the chapter's `> **Your turn:**`
prompt rather than inventing a deployment around it.

## System design cases: one chapter per example

Worked design examples live in `10-design-cases/` as their own topic ("System design cases"). **One system = one chapter**, however large. Do not split a system (an e-commerce platform, an email service) into several chapter files; use one `##` section per component (for example `## Deep dive 3: Inventory`) so the pager still shows one screen at a time. Shape: In brief, The prompt, Step 1 Ask (functional and non-functional requirements, out of scope), Step 2 Numbers, Step 3 Architecture (numbered diagram plus a legend), schema tables, decisions, edge cases, scaling, **alternatives and why not** (a table per major decision: alternative, when it is the right choice, why it loses here), how to drive the conversation, Reference stack, Interview Q&A, What a weak answer sounds like, Quiz, Glossary.

## Rules when writing or editing guides

- **Never invent a fact about the reader's own work.** Where only they know a
  detail, leave `> **Your turn:** <what's needed and why it matters>`. A story
  the reader cannot defend under follow-up is worse than no story.
- **Protocol details get verified, not remembered.** For anything load-bearing
  in `01-auth-identity/` or the distributed-systems chapters, check the spec (RFC
  6749, 7636, 7644, 6238, OIDC Core, SAML 2.0) and cite the section. Errors in
  his own specialty are the most costly kind.
- **Invite the reader's own experience** where a topic genuinely connects to
  work people do — a `> **Bring your own experience.**` aside naming the
  follow-ups that topic attracts. Describe the *kind* of work, never a specific
  employer's system.
- Keep answers at the depth a senior candidate would actually speak aloud, not
  encyclopedia entries.

## After adding or editing a guide

```
python3 check_coverage.py
python3 build_site.py --check
```

The first fails on a malformed question block, an uncaptioned diagram or a
broken link; the second on a chapter missing from `curriculum.json`, a
malformed exercise or MCQ, or a reference solution that does not pass its own
tests. Fix what they report before considering the change done.

## Version control

There is no inner repo. Commit from the parent repo, which pushes to a public
GitHub remote. Do not create a nested `.git` here — it turns this directory
into a submodule gitlink in the parent and the files stop being tracked.

**Never commit or push without the user's explicit approval for that specific
change.** Editing files and running the checks above needs no sign-off; `git
commit` and `git push` do, every time — an earlier approval doesn't carry
forward to the next change.

**Publish before you commit and push.** If any chapter Markdown
changed, rebuild and republish the artifact first (`python3 build_site.py`,
then republish `site/index.html` to the existing artifact URL) — a commit
whose `site/index.html` doesn't match what's live is worse than one that lags
behind by a build. Only commit and push once the rebuilt site is republished,
or once you've confirmed with the user that no content changed.

## The study site — one study flow

`build_site.py` generates `site/index.html` from the Markdown. The Markdown is
the source of truth; the site is output and is never hand-edited.

```
python3 build_site.py              # rebuild after any content change
python3 build_site.py --check      # parse, validate, verify; write nothing
python3 build_site.py --no-verify  # skip running reference solutions (no node)
```

Rebuild after adding or editing a guide, then republish the same file path to
update the artifact in place (same URL).

**The site is one flow, not a set of modes.** The user asked for this
explicitly: no Book / Drill / Mock / Progress tabs. Two axes:

- **Vertical — Topics → Chapters**, from `curriculum.json`. It is the single
  source of study order and of the sidebar's grouping. Every chapter `.md` must
  be listed in exactly one topic or in `exclude`; the build fails otherwise. A
  new chapter means a new line in `curriculum.json`.
- **Horizontal — stages inside a chapter:** Learn → Workshop → Code → Quiz.
  Only stages with content appear. Which `##` section lands in which stage is
  one table, `STAGE_RULES` in `build_site.py`, matched on the heading —
  chapters are not restructured to fit. Unmatched headings are Learn.
  - **Learn** — one `##` section per screen. The first screen is the chapter
    intro plus its `## In brief` section (5–8 bullets). Basic coding topics
    start *in brief*; advanced topics (auth, distributed, design) teach from
    zero after the brief. Glossary is always the last screen.
  - **Workshop** — worked problems, problem banks, "Building it", worked
    examples, reference stacks, interview Q&A and weak answers, plus any
    `## Workshop: …` section (use that prefix for side-by-side implementation
    variants, e.g. OAuth without vs with PKCE). Q&A is think-first-then-reveal:
    no typing, no AI grading.
  - **Code** — `## Exercises` (contract below), in a TypeScript editor.
  - **Quiz** — `## Quiz` MCQs (contract below).

**Navigation is in-memory.** `go()` updates state and renders; it never waits
on `hashchange`, which the sandboxed claude.ai frame may not fire (that bug
made chapter links dead). The hash is written with `history.pushState` in a
`try` as a bonus for Back and deep links. Every chapter is one click away in
the sidebar (all topics open by default), and each Learn/Workshop stage has a
**Jump to** menu and a **Show as one page** toggle, so nothing is locked
behind the one-screen-at-a-time view.

**Progress is chapter-level only** — not started / started / done — plus which
problems are solved and the best quiz score. No per-section ticks.

### The Code stage runs TypeScript only

`## Exercises` blocks are executed — in a Web Worker on the page, and under
node at build time via `site/runner.js`. **Only TypeScript/JavaScript can run
there.** The Python and Go chapters therefore carry their code in `## Building
it` and `## Workshop:` sections, which render as prose, and must not define
`## Exercises`; adding one would hand Go source to the TypeScript runner and
fail the build.

### The Exercise contract (Code stage)

````markdown
## Exercises

### Exercise: Rotate an array right by k
**Level:** intermediate · **Topic:** three reversals · **Hint:** one line, never the solution
**Function:** `rotateRight(a: number[], k: number): number[]`
**Core:** true · **Source:** scaler · **Adapter:** linked-list · **Check:** arg0 · **Compare:** unordered

Short statement with one example.

```tests
[{"args": [[3,2,1,4,6,9,8], 3], "expected": [6,9,8,3,2,1,4]},
 {"gen": "[Array.from({length: 1e5}, (_, i) => i), 7]", "perf": true, "label": "n = 100,000"}]
```

<details><summary>Solution</summary>

```ts
function rotateRight(a: number[], k: number): number[] { … }
```
</details>
````

- `Level`, `Topic`, `Hint`, `Function` are required; the rest are optional.
- `Hint` is the level-1 hint the page shows next to `Topic`: a nudge toward the
  technique, **never** the algorithm.
- `Adapter: linked-list` turns every array argument into a `ListNode` list and
  a returned list back into an array; `linked-lists` does it for an array of
  lists; `tree` reads the first argument as a level-order array
  (`[3,9,20,null,null,15,7]`) into a `TreeNode`, and `tree-out` only converts a
  returned tree. A returned list or tree always comes back as an array.
- A ```starter fence (between the statement and the tests) replaces the
  generated empty function — design problems use it to hand over a class
  skeleton plus a `run(ops, args)` driver that replays operations. `Check: arg0` compares the mutated first argument (in-place problems).
  `Compare: unordered | float` relaxes equality.
- A `gen` test is a JS expression producing the args; its expected value comes
  from the reference solution. Mark large inputs `perf: true` — they catch an
  O(n²) solution by timing out.
- **The build runs every reference solution against its own tests** under
  node, through `site/runner.js` — the same runner the page uses in its Web
  Worker. A wrong expected value is a build error. Solutions must be
  self-contained (no helpers from another exercise).

### The MCQ contract (Quiz stage)

```markdown
## Quiz

### MCQ: A public client can't keep a secret. What stops a stolen code being redeemed?
- [ ] The state parameter
- [x] PKCE — the code_verifier only the client knows
**Why:** one line that teaches, not just "B is correct".
```

Exactly one `[x]` (or `**Multi:** true` with several) and a `**Why:**` line.
These are not `### Q:` blocks, so `check_coverage.py` and the drill contract
are unaffected.

### AI in the Code stage — the AI proposes, the page executes

Two AI features, both through the artifact's `sample` capability, both only on
a button press:

- **New problem (AI)** generates a problem with tests and a hidden reference
  solution; the page runs the reference against the tests in the worker and
  keeps only tests it agrees with (≥ 5, or it retries — at most 3 attempts).
  Saved to `db` under `generated/`.
- **Check with AI** proposes edge-case inputs for the viewer's code; the page
  **runs** them through the viewer's code and the reference and shows only real
  mismatches, plus complexity and line notes. The prompt forbids writing
  corrected code — keep it that way; **Show solution** is a separate,
  deliberate button.

Never show a pass/fail that came from the model's opinion rather than an
execution. The worker is built from a blob per run with no `eval` — the
artifact's CSP may forbid it.

Mechanisms get a Mermaid flow chart **above** the prose that walks them. The
diagram is a map; the numbered walkthrough with real requests is still the
explanation. See "Diagrams" below for the contract — the build enforces it.

## The Ask chat

The site has a chat grounded in the book (`askSend` in `site/site.js`). It does
naive keyword retrieval over chapter text (`relevantChapters`), sends the top
matches plus the current chapter as context, and cites them as links.

Two things to preserve if you touch it: the prompt tells the model to say when
the book doesn't cover something rather than bluffing, and to point at
`Your turn` prompts rather than inventing the reader's history. Both matter — a
confident wrong answer about someone's own experience is worse than no answer.

### Answer quality

Retrieval covers **both** prose passages and the book's 99 question/answer
pairs, and Q&A entries are weighted above prose — a model answer written for
that exact question beats any prose chunk. Keep that weighting.

The stop list deliberately includes generic verbs (`work`, `use`, `handle`,
`explain`). Without them, "how does PKCE work" ranked "How do you handle
CPU-heavy work in Node?" as highly as the PKCE question.

`askIntent()` sets the model tier and answer length per question: lookups stay
on `quick`, while explain/compare/design and coaching questions get `default`.
That is how the chat is both cheap and useful — don't flatten it back to one
tier in either direction.

Coaching questions ("what should I study", "weakest areas") get real data via
`progressBrief()`: chapter status, solved problems, quiz bests and the next
chapter on the path. Without it the model invents an answer, which is worse
than none.

### Diagrams — a map above the prose, never instead of it

Every flow is explained as a written walkthrough with real requests (curl,
JSON, XML) and a table explaining every entity or field. **That prose is the
explanation and it is not negotiable** — it renders anywhere, it is searchable
and quotable, and the concrete payloads are what actually get asked about in an
interview.

Above it sits a Mermaid flow chart. In an interview you draw the shape first
and narrate the steps over it; the book should rehearse it in that order.

This reverses an earlier rule, deliberately. An animated diagram was built and
removed, then static diagrams too — and that was the right call both times,
because those attempts put a picture **in place of** the explanation. A diagram
that supplements intact prose is a different bet. Do not re-litigate it, and do
not slide back into the old failure by trimming prose because "the diagram
covers it."

The format (a fenced `mermaid` block, then an italic caption line):

    ```mermaid
    sequenceDiagram
        ...
    ```
    *One line saying what to take from it.*

The rules, which `build_site.py` enforces where it can:

- **One diagram per mechanism**, at the top of its `## How it actually works`
  section, immediately before `### Who's who`. Decision trees and state
  machines may head the specific `###` they belong to.
- **Every step in a diagram has a numbered step in the prose below it.** A
  detail that exists only in the diagram is in the wrong place.
- **The caption is required** and the build fails without one. It is not
  decoration: the site strips diagram source out of its search index and out of
  what the Ask chat retrieves over, so the caption is the only part of a
  diagram that stays findable. Say what to take from it, don't restate the
  title.
- **Max ~10 nodes or ~8 sequence steps.** Split rather than crowd. A diagram
  that needs a legend has failed.
- **Size it for the reading column**, which is about 800px. A diagram wider
  than that gets scaled down and its labels stop being readable; taller than
  ~900px on screen and it stops being one glance. In practice: `flowchart TD`
  for chains and decision trees, `LR` only for a genuinely short linear flow;
  node labels of one or two short lines. If it comes out too big, the fix is
  fewer nodes, not smaller text.
- **Don't redraw the table underneath it.** Where a chapter already lists every
  check and what it stops, the diagram shows the *shape* — validate in order,
  any failure rejects — and lets the table carry the detail.
- **Label edges with real things** — `POST /token + code_verifier`, not "sends
  request". Same reason the prose uses curl.
- **Types:** `sequenceDiagram` for flows across parties, `flowchart` for
  decision trees and request paths, `stateDiagram-v2` for lifecycles.
- **Never invent the reader's architecture.** Where only they know the shape,
  leave a `> **Your turn:**` prompt instead of a plausible guess — same rule as
  prose.

When adding a protocol chapter, follow the shape: the diagram, then who's who,
then the steps as real requests, then a table of what each field is for and
what breaks without it.

Mermaid loads from a CDN, lazily, only for chapters that have a diagram.
Offline the block shows as its own source — readable, and still says what the
flow is. That is an acceptable degradation; don't engineer around it.

### Cost design — don't undo this

The chat is deliberately cheap, and the pieces work together:

- **Passage retrieval, not chapter retrieval.** `passages()` chops chapters
  into ~400-char chunks; `relevantPassages()` returns the best 6. An earlier
  version sent 3 whole chapters (21k chars) and, worse, sent each chapter's
  *first* 7000 characters — which often didn't contain the answer.
- **`modelTier: 'quick'`** — the cheapest and fastest tier, used for *every*
  chat question. Fine here because answers are short responses against supplied
  context, not open reasoning. `askIntent()` still varies the answer-length
  budget and how many passages are retrieved; it no longer escalates the model.
  Don't reintroduce a bigger tier for the chat.
- **Short answers** — the prompt asks for 2-4 sentences, under 100 words.
- **History capped** at the last two exchanges, so the prompt doesn't grow
  every turn.
- **`cache: false`** — a conversation shouldn't replay a cached turn.

Roughly 600 input tokens per question instead of ~5,250.

Problem generation and code review (Code stage, not the chat) stay on
`modelTier: 'default'` on purpose: writing tests that hold up, and spotting the
input that breaks someone's code, need more capability than a lookup does.

## Two progress records

- `progress/log.md` — written by the terminal skills (`drill`, `mock-interview`).
- The artifact's `db` — written by the site, **per viewer**, under
  `data/users/me/progress/`: `chapters/{id}` (status), `solved/{exerciseId}`,
  `quiz/{chapterId}` (best score), `generated/{id}` (AI problems).

**The `data/users/me/` prefix is load-bearing and must not be removed.** It is
the one subtree the runtime scopes to the signed-in viewer — `me` resolves to
their own id, and the subtree is private even from the artifact's owner. Share
the link with someone and they build their own record instead of editing
yours. A viewer the runtime cannot identify (an anonymous visitor on a public
link) has no subtree at all: the write throws, the page swallows it, and their
progress stays in their own browser's `localStorage`. Everything goes through
`DB_ROOT` in `site/site.js`, so there is exactly one place to get this wrong.

**That prefix only resolves if the published version declares `user` alongside
`db`.** Publish with `capabilities: {sample: {}, db: {}, user: {}}` — dropping
`user` silently breaks per-viewer scoping.

They are separate by design. `prep-status` should read `progress/log.md` and,
when the site has been used, also pull the artifact's `db` (the `ArtifactData`
tool: `list` on `data/users/me/progress/chapters`, `.../solved`, `.../quiz`)
and reconcile before reporting.
