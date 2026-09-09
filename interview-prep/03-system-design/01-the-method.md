# The method — how to run 45 minutes

> **Never done a design round?** Read
> [start here](00-start-here-thinking-in-systems.md) first — what the question
> actually is, the vocabulary, and one system scaled from a single server to ten
> million users. This chapter assumes you know what the boxes are.

System design rounds test how you *work through* a problem, not what you know.
Plenty of strong engineers fail them by knowing everything and structuring
nothing — they talk for 45 minutes and the interviewer can't follow it.

This chapter is the structure to follow.

---

## What is actually being assessed

Not whether you produce "the right architecture" — there isn't one. The
interviewer is checking whether you:

1. **Clarify before building.** Diving into boxes-and-arrows without asking
   what you're building is the single most common failure.
2. **Justify with trade-offs.** "I'd use Kafka" is worthless. "Kafka because
   several consumers need replay, at the cost of operational weight" is the
   answer.
3. **Quantify.** A senior candidate estimates without being asked.
4. **Go deep on demand.** Breadth first, then genuine depth where pushed.
5. **Communicate.** They must be able to follow you. Silence is a fail.
6. **Handle pushback.** Defending a poor choice is worse than changing your
   mind.

---

## The timeline

### 1. Requirements (5 min) — never skip

**Functional** — what does it do? Push back on scope: "Should I include X?"
Interviewers usually want a narrower system than the prompt implies, and
narrowing is a positive signal.

**Non-functional** — the numbers that shape everything:

- How many users? Requests per second? Read/write ratio?
- Latency target? p50 and p99 differ enormously in what they demand.
- Consistency needs? **Ask per-operation** — most systems need strong
  consistency for a few things and eventual for the rest.
- Availability target? Multi-region?
- How long is data retained?

**Then state your assumptions out loud and write them down.** If the
interviewer doesn't give you numbers, invent reasonable ones and say you're
doing so. Designing without numbers is designing without constraints.

### 2. Estimation (5 min)

Convert users into load, storage and bandwidth. See
[estimation](02-estimation.md). Round aggressively — you want the order of
magnitude, not precision. The point is to discover whether this is a
single-database problem or a distributed one.

### 3. API and data model (5 min)

A handful of endpoints — signature, not implementation. Then the core entities
and their relationships, and **critically the access patterns**, because those
choose your database far more than the entities do.

### 4. High-level design (10 min)

Draw the boxes: clients, load balancer, services, data stores, caches, queues.
Walk one request end to end. Keep it simple — you'll add complexity in the deep
dive, and starting complex leaves nowhere to go.

### 5. Deep dive (15 min) — the part that's actually graded

The interviewer will pick something. If they don't, **offer**: "The interesting
part here is X — shall I go into that?" Choosing well is itself a signal.

Good candidates: the data model at scale, the caching and invalidation
strategy, how you shard, the consistency model for the critical operation, or
what happens when a component fails.

### 6. Bottlenecks and wrap (5 min)

Name what breaks first at 10× traffic, what you'd monitor, and what you traded
away. **Volunteering the weaknesses of your own design is a strong signal** —
it shows judgement rather than salesmanship.

---

## Things that separate senior from mid

| Mid-level | Senior |
| --- | --- |
| Draws immediately | Clarifies, then draws |
| "I'd use Kafka" | "Kafka because…, though it costs…" |
| Waits to be asked for numbers | Estimates without being asked |
| Defends every choice | "Good point — that changes things" |
| One correct design | Two options with a reasoned pick |
| Silent while thinking | Narrates the reasoning |
| Ignores failure | "If this dies, here's what happens" |

## Phrases that work

- *"Before I design, let me check what we're optimising for."*
- *"I'll assume 10M daily actives — reasonable?"*
- *"Two options here. A is simpler, B scales further. Given the write volume,
  I'd take B — but if traffic were 10× lower, A."*
- *"That's the naive version. Let me now fix the obvious bottleneck."*
- *"I'm least confident about this part — let me think aloud."*

## Failure modes

- **Designing before clarifying.** The most common, and the most costly.
- **Boiling the ocean** — every feature, no depth anywhere.
- **Over-engineering** — Kafka and Kubernetes for 100 requests/second.
- **Name-dropping without trade-offs.**
- **Going quiet.** They're assessing reasoning; silence hides it.
- **Ignoring the interviewer's steer.** If they ask about the database, they
  want the database.


## Reference stack

No library runs this round — the method is the skill being tested. The only
tooling that matters is whatever you sketch with (a shared doc, Excalidraw, a
literal whiteboard) and using it fast enough that drawing never becomes the
bottleneck on your 45 minutes.

---

## Interview Q&A

### Q: How do you approach a system design question you've never seen?
**Level:** senior · **Tags:** method, process

<details><summary>Model answer</summary>

The same structure regardless of the prompt, because the structure is what's
being assessed.

I start with requirements — functional scope first, and I actively narrow it,
since interviewers usually want a smaller system than the prompt suggests. Then
non-functional: scale, read/write ratio, latency targets, consistency needs per
operation, availability. If numbers aren't given I state assumptions explicitly
rather than proceeding without constraints.

Then a quick estimation to find the order of magnitude — that decides whether
this is one database or a sharded system, and it's better to discover that in
minute six than minute thirty.

Then the API surface and data model, driven by access patterns rather than
entities, because access patterns choose the datastore.

Then a deliberately simple high-level design, and I walk one request through it
end to end so we share a mental model.

Most of the time goes on the deep dive. I'll either follow the interviewer's
interest or offer the part I think is genuinely hardest — choosing well is
itself a signal.

I close by naming what breaks first at 10× and what I traded away. Volunteering
my own design's weaknesses tends to land better than defending it.

</details>

**Follow-ups:**

1. Q: The interviewer stays silent and gives you nothing. What do you do?
   <details><summary>Answer</summary>

   Treat the silence as part of the exercise — it's often deliberate, to see
   whether you can drive.

   I'd state assumptions explicitly and move: "You haven't given me a scale, so
   I'll assume 10 million daily actives and a 100:1 read/write ratio — I'll
   flag where that assumption matters." That converts missing information into
   a stated constraint rather than a blocker.

   Then I'd narrate continuously, because a silent interviewer can only assess
   what I say out loud. And I'd create decision points deliberately: "Two
   options here — I'll take A for these reasons, but tell me if you'd rather
   explore B." That gives them cheap places to engage.

   The thing to avoid is stalling or waiting for permission. Silence isn't
   disapproval; it's usually the test.

   </details>

2. Q: Halfway through, the interviewer says your approach won't work. What now?
   <details><summary>Answer</summary>

   First, understand the objection rather than defending. "Can you say more
   about where it breaks?" — sometimes they've spotted something real,
   sometimes they're testing whether I'll cave under pressure, and I can't tell
   which until I understand it.

   If they're right, say so plainly and adapt: "You're right, that fails when X
   — here's what I'd change." Changing your mind on evidence is a strong
   signal, not a weak one.

   If I still think the design holds, I'd explain the reasoning and the
   assumption it rests on: "It works if writes stay under N — is that
   assumption wrong?" That reframes it as a factual disagreement we can settle
   rather than a contest.

   The failure mode is stubbornly defending a design that's been shown to
   break. Nobody wants to work with someone who can't take a correction, and
   this question is very often about exactly that.

   </details>

---

## Glossary

- **Functional / non-functional requirements** — what it does / how well.
- **Back-of-envelope** — order-of-magnitude estimation.
- **Access pattern** — how data is read and written; chooses the datastore.
- **Deep dive** — the extended focus on one component; where most marks are.
- **Bottleneck** — what saturates first as load grows.
