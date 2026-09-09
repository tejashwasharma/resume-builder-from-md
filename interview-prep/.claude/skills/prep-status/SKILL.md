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
2. The study site's `db`, if it has been used — Artifact tool,
   `action: "read_db"`, `db_op: "list"`, collection `progress`. Each doc is
   a topic with `{attempts, strong, weak, weakAreas, lastAt}`. Reconcile with
   the log rather than reporting whichever you happened to read.
3. `WEAK-SPOTS.md` — open risks. Struck-through items are resolved.
4. `INDEX.md` — the full module list, to find what has never been touched.
5. Run `python3 check_coverage.py` if it exists, for gaps in the material
   itself (as opposed to gaps in their practice).
6. Check for unfilled markers: `grep -rc "FILL IN" 00-experience/ WEAK-SPOTS.md`

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
- <unfilled FILL IN markers, unresolved weak spots>

## Do this next
1. <one specific action — a command to run or a file to read>
2. <second>
3. <third>
```

## Judgement to apply

- **A repeated weakness outranks an untouched module.** Something they've
  fumbled twice is a live problem; something never drilled is just unknown.
- **Unfilled `FILL IN` markers in `00-experience/` are blocking.** They cannot
  practise behavioral rounds on stories with holes. Say this bluntly if the
  count is high.
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
