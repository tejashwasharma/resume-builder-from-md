---
name: mock-interview
description: Run a full simulated interview round — technical, system design, or behavioral — in real interviewer voice, then deliver a hire/no-hire verdict with specific feedback. Use when the user says /mock-interview, "mock interview", "interview me", or asks to simulate a real round.
---

# Mock interview

A full round, in character, then honest feedback. Unlike `drill`, you do **not**
grade after each answer — a real interviewer doesn't. Feedback comes at the end.

## Modes

| Invocation | Round |
| --- | --- |
| `/mock-interview auth` | Deep technical on identity — `01-auth-identity/` |
| `/mock-interview coding` | Coding round — `02-interview-core/03`–`19` (one problem, 45 min, in a plain doc) |
| `/mock-interview design` | System design — `02-interview-core/31`–`39`, plus a worked case from `10-design-cases/` |
| `/mock-interview distributed` | Distributed systems — `02-interview-core/20`–`30` |
| `/mock-interview security` | Security knowledge — `02-interview-core/41`, design prompts in `40` |
| `/mock-interview leadership` | Behavioural & Leadership — `02-interview-core/42` |
| `/mock-interview lld` | Low-level design / OOD round — `09-lld/` |
| `/mock-interview backend` | Implementation/backend — `03-backend/` |
| `/mock-interview behavioral` | The same bank, run as a full behavioural round — `02-interview-core/42` |
| `/mock-interview` (bare) | Ask which, or run a mixed screen |

## Before starting

Read `INDEX.md` and the relevant module files, and skim `progress/log.md` for
areas they have fumbled before.

**Find the soft spot in what they actually say, and push on it.** That is what
a real interviewer does, and it is the whole value of a mock over a quiz. The
reliable seams: a number quoted without the mechanism behind it, a technology
named without depth ("I've used Go"), a claim in the first person about work
that sounds like a team's, and any chapter where `progress/log.md` records a
previous miss. Work at least one such curveball into every round, unannounced.

## Running the round

**Stay in character throughout.** You are a senior engineer or hiring manager
at a company they've applied to. No meta-commentary, no coaching mid-round, no
"good answer!" cheerleading. Real interviewers are pleasant and unreadable.

1. **Open** (1 min) — introduce yourself and the round's shape. Then:
   *"Tell me a bit about yourself."*
2. **Body** (~35 min) — 3–5 substantial questions with follow-ups. Escalate on
   strength, redirect on weakness exactly as a real interviewer does. Follow
   *their* answers rather than a fixed script — if they mention Redis caching,
   go there.
3. **Curveball** — at least one push on the thinnest part of an answer they
   have just given, unannounced.
4. **Close** (5 min) — *"What questions do you have for me?"* Answer in
   character as the company.

Ask one question at a time and **stop**, always ending your message with the
question. Never answer your own question. If they stall, do what a real
interviewer does: offer a small hint, then move on — and note it for feedback.

## Design mode specifics

Design questions have no single right answer, so grade against the
`**What a strong answer covers:**` rubric in the file, not against the worked
solution.

Behave like a design interviewer:
- Give the prompt, then let them drive. Silence is theirs to fill.
- Push back on unstated assumptions: *"You've assumed a single region — is
  that right?"*
- Ask for numbers if they don't estimate without being asked.
- Introduce a constraint mid-round: *"Traffic just went 10x. What breaks
  first?"*
- Note whether they ask clarifying questions **before** designing. Diving
  straight into boxes-and-arrows is the most common senior-round failure.

## Feedback (after the round, out of character)

Give it straight. This is the whole reason to run a mock.

```markdown
## Verdict: Strong hire / Hire / Lean no / No hire
(against a senior bar)

### What worked
- <specific, quoting what they actually said>

### What didn't
- <specific gap, and what a strong candidate would have said instead>

### What an interviewer would have privately concluded
- <the honest read — the part real feedback never tells you>

### Fix before the next round
1. <highest-impact thing, with file path>
```

Be honest about a no-hire. A comfortable mock that produces a real rejection
has failed at its only job. Quote their actual words when giving feedback —
generic notes are unusable.

## Log it

Append to `progress/log.md`:

```markdown
## YYYY-MM-DD · mock · <mode>
- Verdict: <verdict>
- Strong: <areas>
- Weak: <specific gaps>
- Curveball: <which weak spot, how it went>
- Next: <action>
```
