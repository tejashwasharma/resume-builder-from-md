# The method — how to run 45 minutes

> **Never done a design round?** Read
> [start here](31-design-round-start-here.md) first — what the question
> actually is, the vocabulary, and one system scaled from a single server to ten
> million users. This chapter assumes you know what the boxes are.

System design rounds test how you *work through* a problem, not what you know.
Plenty of strong engineers fail them by knowing everything and structuring
nothing — they talk for 45 minutes and the interviewer can't follow it.

This chapter is the structure to follow.

---

## In brief

- **The round tests how you work through a problem, not what you know** —
  strong engineers fail by knowing everything and structuring nothing,
  talking for 45 minutes in a way the interviewer can't follow.
- **The L5 bar is about who's driving the conversation**, not extra
  knowledge: setting the agenda unprompted, stating trade-offs (not just
  naming a technology), designing the failure path alongside the happy
  path, and bringing SLOs/rollout/on-call in without being asked.
- **The six-part timeline**: requirements (never skip — functional scope
  narrowed, non-functional numbers stated explicitly) → estimation (order
  of magnitude, not precision) → API and data model (driven by access
  patterns, which choose the database far more than entities do) →
  high-level design (deliberately simple, walk one request end to end) →
  deep dive (where most marks are — offer the hardest part if not
  steered) → bottlenecks and wrap.
- **State assumptions explicitly rather than stalling on missing
  information** — "you haven't given me a scale, so I'll assume 10M daily
  actives, and flag where that matters" turns silence into a constraint
  instead of a blocker.
- **Volunteering your own design's weaknesses is a stronger signal than
  defending it** — naming what breaks at 10x traffic and what you traded
  away shows judgment, not salesmanship.
- **When pushed on a flaw, understand the objection before responding** —
  changing your design on real evidence beats defending a broken one, and
  reframing a disagreement as a checkable assumption ("it works if writes
  stay under N — is that wrong?") is stronger than either caving or
  stonewalling.

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

## How Google runs the design round

What follows is limited to what Google says publicly on its careers site and
what is consistently reported by candidates; nothing here is inside
knowledge.

- **One slot, about 45 minutes**, one interviewer, usually a senior engineer
  from a team other than the one you would join. The loop is
  team-independent until the end, so the interviewer is not testing your fit
  for their product — they are testing the four attributes Google publishes:
  general cognitive ability, role-related knowledge, leadership, and
  Googleyness. In this round GCA is "can you decompose an ambiguous problem
  and reason about trade-offs" and RRK is "do you know how real systems
  behave".
- **The prompt is deliberately under-specified.** "Design a system that
  tracks which third parties have access to our data" is the whole question.
  The ambiguity is the test: the interviewer wants to see which questions you
  ask, which assumptions you state out loud, and whether you scope before you
  draw.
- **You are expected to drive.** The interviewer will let silence run. A
  candidate who waits to be asked "and how would you store that?" is scored
  lower than one who says "let me talk about storage next, then failure
  modes, then how I'd roll it out."
- **The probes are predictable.** "What if traffic is 10x?" "What breaks
  first?" "How do you roll this out without an outage?" "What happens when
  this box dies?" "Who owns this when it pages at 3am?" Prepare an answer
  shape for each; chapter [30](30-observability-slos-and-operations.md)
  covers the operational ones.
- **Whiteboard is a shared doc or drawing tool.** Practise drawing the
  standard architecture from [35](35-building-blocks.md) in under two
  minutes in whatever tool you are given, because the time you spend fighting
  the tool is time not spent designing.

---

## The L5 bar

The difference between a mid-level and a senior pass in this round is not
knowledge. It is who is in charge of the conversation.

| Mid-level (L4) | Senior (L5) |
| --- | --- |
| Answers the questions asked | Sets the agenda, says what comes next, and why |
| Estimates when prompted | States assumptions and numbers unprompted, and revisits them when the design changes |
| Names a technology | Names the trade-off, the alternative, and what would make them switch |
| Designs the happy path | Designs the failure path too: what is replicated, what is restartable, what is neither |
| Waits for "how do you run it?" | Brings SLOs, rollout, on-call and cost in without being asked |
| Treats security as a checkbox | Treats authn/authz, tenancy boundaries, audit and secrets as part of the data model |
| Goes deep everywhere or nowhere | Picks the one component the role cares about and goes deep there, on purpose |
| Defends the first design | Changes the design when the pushback is right, and says why |

For the two Singapore roles the "component the role cares about" is the
security control plane: how findings are produced, deduplicated, owned and
closed ([40](40-design-security-systems.md)). Go deep there by choice, and
say that you are choosing to.

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
[estimation](33-estimation.md). Round aggressively — you want the order of
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

## Quiz

### MCQ: What is the design round primarily assessing, according to this chapter?
- [ ] Whether you produce the objectively correct architecture
- [x] How you work through an ambiguous problem — clarifying, justifying trade-offs, quantifying, and communicating throughout
- [ ] How many system design patterns you can name
- [ ] How fast you can draw the final diagram
**Why:** There isn't one "right architecture" — strong engineers can still fail by knowing everything but structuring and communicating nothing.

### MCQ: What primarily distinguishes an L5 (senior) pass from an L4 (mid-level) pass in this round?
- [ ] Knowing more specific technology names
- [x] Who is driving the conversation — setting the agenda, stating trade-offs unprompted, and designing the failure path alongside the happy path
- [ ] Drawing the diagram faster
- [ ] Avoiding any discussion of what could go wrong
**Why:** Both levels might "know" the same facts — the senior candidate proactively brings in estimation, trade-offs, failure modes, and operational concerns without being asked.

### MCQ: In the six-part timeline, why does "requirements" come first and get explicitly called out as something to never skip?
- [ ] It's required by Google's official interview rubric
- [x] Diving into boxes-and-arrows without clarifying scope and numbers is called the single most common and costly failure mode
- [ ] It's the longest phase of the interview
- [ ] Requirements gathering is the only phase that gets scored
**Why:** Designing without stated numbers or scope means designing without constraints — everything downstream (data model, estimation, architecture) depends on this being established first.

### MCQ: Why does the chapter say access patterns "choose the datastore" more than the entities do?
- [ ] Entities are irrelevant to database selection
- [x] How data will actually be read and written (query shape, frequency, consistency needs) determines whether you need a relational store, a key-value store, a search index, etc. — not just what the data looks like
- [ ] All datastores support the same access patterns equally
- [ ] This only applies to NoSQL databases
**Why:** Two systems with identical entities can need completely different databases depending on whether the dominant pattern is point lookups, range scans, or full-text search.

### MCQ: When an interviewer gives you no numbers and stays silent, what's the recommended response?
- [ ] Wait for them to provide the missing information
- [x] State a reasonable assumption explicitly and proceed, flagging where that assumption matters
- [ ] Ask if the interview can be rescheduled
- [ ] Design a generic system with no specific scale in mind
**Why:** Converting missing information into a stated, explicit constraint ("I'll assume 10M daily actives") keeps the design moving and shows you can drive — silence is often deliberately part of the test.

### MCQ: Why is "volunteering the weaknesses of your own design" considered a strong signal rather than a risk?
- [ ] It shortens the interview
- [x] It demonstrates judgment and self-awareness rather than salesmanship — a senior engineer is expected to know what they traded away
- [ ] It's required to reach the estimation phase
- [ ] Interviewers penalize candidates who don't find any flaws
**Why:** Naming what breaks at 10x traffic and what was traded away shows the same critical thinking that would be applied to a real production system, not just optimism about the design presented.

### MCQ: The interviewer says your design won't work. What's the recommended first move?
- [ ] Immediately abandon the design and start over
- [x] Understand the objection before responding — ask what specifically breaks, since it could be a real flaw or a test of whether you'll cave under pressure
- [ ] Defend the original design without further discussion
- [ ] Ask the interviewer to suggest the correct design instead
**Why:** You can't tell whether the pushback is a genuine flaw or a pressure test until you understand it — responding to a misunderstood objection risks either caving unnecessarily or missing a real problem.

### MCQ: What should you do if, after understanding the pushback, you still believe your design is correct?
- [ ] Stop discussing it and move to a different topic
- [x] Explain the reasoning and the assumption the design rests on, reframing it as a checkable fact ("it works if writes stay under N — is that assumption wrong?")
- [ ] Simply repeat the original explanation more emphatically
- [ ] Agree with the interviewer regardless, to avoid conflict
**Why:** This turns a potential standoff into a factual question that can actually be resolved, rather than a battle of who's more persistent.

### MCQ: Why is "over-engineering" (e.g. proposing Kafka and Kubernetes for 100 requests/second) listed as a failure mode?
- [ ] Kafka and Kubernetes are never appropriate in interviews
- [x] It signals reaching for impressive-sounding technology rather than reasoning from the actual scale and bottleneck of the problem
- [ ] These technologies are too difficult to explain in 45 minutes
- [ ] Interviewers have a fixed list of banned technologies
- [ ] It shows a lack of knowledge about these specific tools
**Why:** Naming heavyweight infrastructure without justifying it against the actual numbers is name-dropping without trade-offs — exactly the pattern that reads as memorized rather than reasoned.

### MCQ: Why does the chapter recommend narrowing scope ("should search be included?") rather than accepting the full prompt at face value?
- [ ] It reduces the total time available for the interview
- [x] Interviewers usually want a narrower system than the prompt implies, and proactively narrowing scope is itself a positive signal of judgment
- [ ] Broad prompts are always interviewer mistakes
- [ ] Narrow designs are inherently more scalable
**Why:** "Design Twitter" is a week of real engineering work — explicitly agreeing to cover posting and a timeline while deferring search, DMs, and trending shows deliberate scoping, not evasion.

---

## Glossary

- **Functional / non-functional requirements** — what it does / how well.
- **Back-of-envelope** — order-of-magnitude estimation.
- **Access pattern** — how data is read and written; chooses the datastore.
- **Deep dive** — the extended focus on one component; where most marks are.
- **Bottleneck** — what saturates first as load grows.
