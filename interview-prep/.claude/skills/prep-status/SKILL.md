---
name: prep-status
description: Report interview-prep progress — what's been drilled, what's weak, what's untouched, and what to do next. Use when the user says /prep-status, "where am I", "what should I study next", or asks about their prep progress.
---

# Prep status

Answer one question: **what should they do next?**

## Gather

1. `progress/log.md` — terminal drill and mock history. Missing or empty
   means they haven't started *in the terminal*; check the site's record
   before concluding they haven't practised at all.
2. The study site's `db`, if it has been used — the `ArtifactData` tool,
   `action: "list"`, on `data/users/me/progress/chapters` (status per chapter),
   `data/users/me/progress/solved` and `data/users/me/progress/quiz` (best
   score). Progress is stored per viewer under `data/users/me/`, so this reads
   the user's own record and nobody else's. Reconcile with the log rather than
   reporting whichever you happened to read.
3. `curriculum.json` and `INDEX.md` — the full topic list, to find what has
   never been touched.
4. Run `python3 check_coverage.py`, for gaps in the material itself (as opposed
   to gaps in their practice).
5. Check for unanswered prompts: `grep -rc "Your turn" --include='*.md' .` —
   these are the details only they can supply.

## Report

Keep it short and prescriptive. No dashboards.

```markdown
## Where you are

<2-3 sentences: how much practice, how recent, overall shape>

### Solid
- <topic> — <when, how it went>

### Weak — seen more than once
- <specific concept, not just the topic> → <file to restudy>

### Never touched
- <modules with no drill history>

### Blocking
- <unanswered `Your turn` prompts, empty story slots, repeated misses>

## Do this next
1. <one specific action — a command to run or a file to read>
2. <second>
3. <third>
```

## Judgement to apply

- **A repeated weakness outranks an untouched module.** Something they've
  fumbled twice is a live problem; something never drilled is just unknown.
- **An empty six-slot story table in `02-interview-core/42` is blocking.** They
  cannot practise behavioural rounds without their own stories in those slots.
  Say so bluntly, and the same for unanswered `Your turn` prompts in the
  chapters they are about to drill.
- **Recency matters.** A topic drilled once six weeks ago is not retained.
  Flag anything strong-but-stale for a refresh.
- **Weight by round frequency**, not by their comfort. System design and
  behavioral appear in nearly every senior loop; frontend rarely does for a
  backend/IAM role. Don't send them to polish a strength.
- **Never pad the list.** Three actions maximum. If one thing matters, say one
  thing.

## If they have an interview scheduled

If they mention a date or company, switch to triage: what's highest-risk in
the time remaining, and what to deliberately skip. Cramming a new module days
before a loop is worse than rehearsing stories they already have.
