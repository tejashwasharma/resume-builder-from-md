---
name: prep-brief
description: Answer an interview-prep question, or turn a job description / a PDF list of topics into a self-contained prep packet. A single, focused question gets answered directly in chat. Anything broader — a JD, a pasted list, a PDF, "prep me for X" — gets compiled into one artifact with the actual content, not just links. Use when the user says /prep-brief, pastes a job posting, uploads a PDF of topics to prepare, or asks an interview-prep question that isn't a drill or mock session.
---

# Prep brief

Two shapes of input, two different outputs. Get the shape right before doing
anything else.

## Decide the shape

| Input | Output |
| --- | --- |
| One focused question — a definition, "how does X work", "what would I say if asked Y" | **Answer directly in chat.** No artifact. |
| A job description (pasted text or a link), a PDF or list of multiple topics, or an explicit "build me a prep doc for X" | **Build one artifact** — the full content, not a reading list. |

If it's ambiguous (a question that's really three questions bundled together,
or "quiz me on OAuth" — that's `/drill`, not this), ask which they want rather
than guessing wrong and building the wrong shape.

This skill never quizzes or grades — that's `/drill` and `/mock-interview`.
This one researches and compiles.

## Either way: ground it in the book first

1. Read `interview-prep/INDEX.md` (repo root — this skill lives at the
   top level, not inside `interview-prep/`) to find what already exists for
   the topic.
2. Read the matched guide file(s) in full — they hold the model answers, the
   "Building it" sections, and the diagrams. Reuse that content; don't
   re-derive from scratch what the book already has written and verified.
3. Check `interview-prep/WEAK-SPOTS.md` for anything the topic touches. A JD
   or question that lands on a known weak spot is worth flagging explicitly —
   that's the part most likely to get probed.
4. If nothing in the book covers it, say so plainly and answer from general
   knowledge, clearly labeled as general (not the candidate's own experience).

**Never invent a fact about the candidate's own work.** Same rule as the rest
of `interview-prep/`: where only he knows a detail and the book has no answer,
say `FILL IN: <what's needed>` rather than guessing a plausible-sounding story.
A confident invented answer is worse than an honest gap.

## Path A — direct answer

Answer in the chat, no artifact. Keep it at the depth a senior candidate would
actually speak aloud, not an encyclopedia entry — same bar as the book.

- If the book covers it, answer from the model answer, cite the file
  (`interview-prep/01-auth-identity/02-oauth2.md`-style), and add anything the
  question asked that the file didn't (e.g. a follow-up angle).
- If it's about the candidate's own experience and the book doesn't have it,
  say what's missing rather than inventing it.
- If it's general knowledge the book doesn't cover, answer it, and mention in
  one line that it isn't in the book (so they know whether to add it, and
  whether it's worth another `/drill` pass later).

## Path B — the artifact

### 1. Extract the ask

- **JD pasted as text** — pull out: role title, company if named, seniority,
  every required/preferred skill, round types if the posting names them
  (system design, coding, behavioral).
- **JD as a link** — WebFetch it first, then extract the same fields.
- **PDF** — Read it (the Read tool renders PDF pages); pull out the list of
  topics/questions it names.
- **A plain list or "prep me for X" in chat** — take it at face value.

### 2. Map every item to the book

For each extracted topic, find the matching file(s) via
`interview-prep/INDEX.md`. Note, per topic, one of:

- **Covered** — file(s) found, content pulled in Path B step 3.
- **Partially covered** — related material exists but doesn't hit the exact
  angle the JD/list names; pulled in and flagged.
- **Not covered** — nothing in the book. Answer from general knowledge in the
  artifact, clearly labeled `(general — not in the book)`, so it's obvious
  what to double check.
- **About the candidate specifically, and thin** — cross-reference
  `interview-prep/WEAK-SPOTS.md`. If it's a known gap, say so and suggest the
  honest framing rather than papering over it.

### 3. Write the content — not a reading list

The whole point is a packet someone can study from without opening another
file. For each topic, inline, **in this order**:

1. **A beginner-friendly opener.** One or two plain-language sentences saying
   what the thing *is* and why it exists, with a concrete example or everyday
   analogy — before any jargon. Someone who has never touched the topic
   should be able to read this paragraph and follow the rest.
2. **The senior-level content.** The mechanism, the real trade-offs, and the
   concrete model answer(s) pulled from the book's Q&A blocks — reworded only
   if the JD's framing changes the emphasis, never weakened or hedged out.
   Every technical term still gets defined on first use, same as step 1, so
   the depth never re-introduces the jargon problem the opener just solved.
3. **A Node.js example or pseudocode block**, for any topic where seeing the
   shape of the code makes the concept click — which in practice is almost
   every topic, not just ones that are already "coding". See "Every topic
   gets runnable shape" below.
4. 1-3 realistic follow-up questions an interviewer would actually ask next,
   with short answers.
5. A one-line "watch out" callout wherever `interview-prep/WEAK-SPOTS.md`
   flags the topic.

Organize by round type if the JD names one (system design / coding /
behavioral / domain knowledge), otherwise by topic in the order the JD or list
raised them. Open with a short header: role/company (if known), and a
one-paragraph "what this round will actually probe" summary.

### Write basic → hero, like the book

This is the same instruction `interview-prep/AGENT.md` gives its own chapters
("the knowledge, written basic → hero") — apply it here too, not just the
depth.

- **Never assume the reader already has the vocabulary.** Define a term the
  first time it's used, in one clause, the way the book does — "a composite
  index (an index on more than one column, in a fixed order — like a phone
  book sorted surname-then-first-name)" rather than "a composite index"
  followed by silence.
- **Reach for a concrete example or everyday analogy before an abstract one.**
  The book does this constantly (the phone-book index, the "two viewers
  editing the same doc" framing for concurrency) — steal the pattern, not
  just the facts.
- **Beginner-friendly is not the same as shallow.** The opener earns its
  place by making the rest of the section legible; the section still has to
  land at the depth a senior candidate is actually graded on. Cutting the
  senior material to stay simple defeats the point — add the plain-language
  ramp, don't remove the ceiling.
- **A worked example beats an assertion.** Where the book has one (the atomic
  `UPDATE ... WHERE status = 'open'` race-condition fix, the DataLoader batching
  fix), keep it verbatim rather than summarising it into prose — a runnable
  or literal example is what makes a mechanism stick.
- **Close a genuinely dense topic with a two- or three-line glossary** of the
  terms it introduced, the way the book's chapters do, if the topic leans
  heavily on jargon (caching, indexing, protocol internals). Skip it for
  topics that don't need one — it's a tool, not a mandatory footer.

### Every topic gets runnable shape — in Node.js, always

**The language is always Node.js/JavaScript (or TypeScript where the book's
own source uses it), never anything else** — Python, Java, Go pseudocode with
foreign syntax — because that's the candidate's actual stack and switching
languages mid-explanation adds a translation step that costs more than it
teaches. This holds even for topics that aren't "backend": a database concept
gets a Node snippet using the driver the book names (`pg`, `mongoose`,
`ioredis`), not a bare SQL statement floating with no caller.

- **Default to showing, not just telling.** A concept like "guards run before
  the handler" or "ack after processing, not before" is far more legible as
  four lines of Node than as a sentence describing the rule. Reach for a
  snippet whenever one would replace an abstract sentence with a concrete one
  — which is most of the time.
- **Reuse the book's own code first.** Every chapter under `interview-prep/`
  already has runnable Node/TS snippets in its "Building it" section and its
  Q&A blocks (a `PermissionGuard`, an atomic `UPDATE`, a kafkajs consumer, a
  `useCallback` fix). Copy those rather than writing new ones — they're
  already correct and already tied to the candidate's real stack (NestJS
  guards, `ioredis`, `kafkajs`, Express middleware).
- **Where the book has no code for a topic** (a protocol comparison, a
  trade-off table), write a short original Node example or pseudocode block
  — 5-15 lines is usually enough. Favor a runnable shape (real function and
  variable names, real library calls) over invented pseudo-syntax; label it
  clearly as pseudocode only when showing exact library usage would be
  longer than the point being made.
- **One example per topic, not one per sub-point.** A single well-chosen
  snippet that a beginner can trace line by line beats three shallow ones.
- **Comment the non-obvious line**, the same rule the book applies to its own
  "Building it" pseudocode — say *why* a line exists (why the offset commits
  after processing, why the update's `WHERE` clause carries the old status),
  not just what it does.

### 4. Load `artifact-design` before writing the file

This is a real document someone will read start to finish, possibly on a
phone before an interview — check the design skill's guidance on structure and
readability before writing the HTML. Then write the packet as an HTML artifact
(a plain reading document — no interactivity is needed) and publish it with
the Artifact tool. Pick a title naming the role/topic ("Ripple Staff Auth
Prep", "OAuth + SCIM Deep Dive"), not a generic label.

**Give it a left sidebar of content links, the same navigation shape as the
book's own `INDEX.md`.** One persistent nav pane listing every section and, under
each, its topics as jump links, so a topic is one click away instead of a
scroll from anywhere in the document — this is a multi-topic reference packet,
not a single-scroll article. Collapse it to a top "Contents" toggle below a
narrow viewport rather than hiding it entirely; a phone read-through still
needs to jump between topics the night before.

### 5. Report back, don't restate

In chat: the artifact link, which topics were fully covered vs. general vs.
flagged as a personal gap, and — if it maps to a real application — a
one-line pointer to the matching `resume-tailor` output folder if one exists,
so the two stay associated.

## Boundaries

- **Read-only against the book.** This skill never edits guide files,
  `interview-prep/INDEX.md`, or `interview-prep/WEAK-SPOTS.md`. A real gap in
  the book's coverage is worth mentioning to the user, not silently patching
  from here.
- **Never fabricate the candidate's history** to fill a JD requirement. The
  artifact's job is honest prep, not a stronger story than the resume
  supports — that gap gets found in the actual interview either way.
- Don't append to `interview-prep/progress/log.md` — that file tracks
  drilled/graded practice (`drill`, `mock-interview`), and a compiled brief
  isn't practice.
- This skill lives at the repo top level (`.claude/skills/`), not inside
  `interview-prep/.claude/skills/`, so it's available anywhere in the repo —
  not just when already working under `interview-prep/`.
