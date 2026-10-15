# Behavioral & Leadership

One round of the onsite is behavioral, and it is graded as seriously as the
coding rounds — on leadership and collaboration, which the committee often
reads first when deciding level. This round is a person asking for evidence,
and pushing on it.

This chapter has three parts: what the round is grading, the answer shape
that gets credit, and a question bank for senior roles. **Every model answer is
a skeleton** — the shape of a strong answer, with `Your turn` where only your
own experience can supply the detail. Nothing here should be said in an
interview until those blanks hold something true about you.

---

## In brief

- This round grades leadership and collaboration as seriously as the
  coding rounds, and it's often the first thing the committee reads for level.
- STAR is the floor; credit comes from the dig afterward: what you personally
  did, who else was involved, what you'd do differently, what happened after.
- Senior roles commonly probe Navigating Ambiguity, Cross-functional work, and
  Mentoring specifically — have a concrete story for each, not just the
  headline leadership story.
- Every model answer here is a skeleton for one of your own stories — nothing
  should be said in the room until the `Your turn` blanks are true, specific,
  and rehearsed.
- Vague answers to the dig read as inflation even when the story is true;
  precision about your actual surface is what separates mid-level from senior here.

---

## What the round grades

The senior signals below are what third-party accounts consistently describe.

| Attribute | What the interviewer is listening for | Senior signal |
| --- | --- | --- |
| **Leadership** (emergent) | Stepping up when your skills are needed, without a title; setting direction; bringing others along; knowing when to step back | You changed what a *group* did, not just what you did. You influenced people you didn't manage. You mentored and can say what changed in the person |
| **Collaboration & values** | Comfort with ambiguity; humility and owning mistakes; collaboration; putting the user and the mission first; doing the right thing when it's inconvenient | A real failure with a real change afterwards. A time you were wrong and said so. A decision that cost you something because it was right |
| **Navigating ambiguity** *(commonly probed)* | Working out what to build when nobody told you | You started from a blank page and can describe the first wrong turn |
| **Cross-functional work** *(commonly probed)* | Partnering with security engineers, PMs, TPMs, remote teams | Concrete mechanics: how the disagreement was resolved, not that it was |
| **Mentoring** *(commonly probed)* | Growing junior engineers | Named, specific, with an outcome for the other person |

The interviewer will ask for one story, then dig: *what did you personally
do; who else was involved; what would you do differently; what happened
after.* The dig is where the level is decided, and vague answers to the dig
read as inflation even when the story is true. Attribution is the usual
casualty: a claim that a whole system was yours collapses the moment the
interviewer asks who else was on it.

---

## The shape that gets credit

STAR is the floor. Strong interviewers reward two additions.

```mermaid
flowchart LR
  S["Situation<br/>2 sentences"] --> T["Task<br/>what was <i>yours</i>"]
  T --> A["Action<br/>what <i>you</i> did,<br/>and the trade-off"]
  A --> R["Result<br/>a number or a change"]
  R --> F["Reflection<br/>what you'd do differently"]
  F --> G["Generalisation<br/>the rule you now apply"]
```
*The last two boxes are the senior half. A story without them is an anecdote; with them it's judgement.*

- **Boundary.** Say exactly what was yours and what wasn't. "The platform
  served that volume; I owned the auth layer in front of it" is stronger
  than a claim on the whole thing, because it survives the dig.
- **Trade-off.** Name what you gave up. Every real decision cost something.
- **Reflection.** One thing you'd do differently. Not a humblebrag ("I'd
  have done it even faster"); a real one.
- **Generalisation.** The rule you carry now. That's what makes the story
  evidence of judgement rather than luck.

Length: ninety seconds to two minutes for the story, then stop and let them
dig. Have six stories that cover the attributes between them, and know
which story answers which question, because you'll be asked to tell the
same one from different angles.

**Your six.** Six slots, not six anecdotes you happen to remember. Write one
story of your own into each before the round; between them they answer almost
every question in the bank. A story can fill two slots, but if a slot is empty
the matching question will find it.

| Slot | Best for | Your story |
| --- | --- | --- |
| **Built it from nothing** | Ambiguity, ownership, 0→1, a wrong first design | |
| **Influence without authority** | Getting other teams to adopt something, cross-team work | |
| **Prioritised under pressure** | Conflicting stakeholders, a backlog you ranked and defended | |
| **Diagnosed and fixed something expensive** | Debugging, a refactor justified with data and shipped safely | |
| **An incident you owned** | Pressure, communication, RCA, what changed after | |
| **Led without the title** | Emergent leadership, mentoring, disagreement | |

Fill the third column in writing. A slot you cannot fill is the one to go
looking for in your own history now, not in the room.

---

## The question bank

Scoped to what senior roles want: setting team culture, alignment
across teams, security judgement, mentoring, autonomy. Each answer is a
skeleton with the story to hang it on, the dig to expect, and what a weak
answer sounds like.

### Q: Tell me about a time you built something from nothing, with no clear requirements.
**Level:** senior · **Tags:** leadership, ambiguity, ownership

<details><summary>Model answer</summary>

**Pick a story:** the "built it from nothing" slot — a surface with no model
and no spec, and users asking for something it could not do.

**Skeleton.** Situation: the state of the thing before, and the demand that
made it urgent; no model, no spec. Task: what you owned — the design, the
delivery, or both. Action: how I *found* the
requirements — which customers I talked to, which internal teams, what the
first design was and why it didn't survive. Result: the model shipped,
existing customers migrated without breakage, and the numbers that
followed. Reflection: the thing I'd do differently. Generalisation: "when
requirements are missing I go find three concrete users and design for the
hardest one."

The interviewer is listening for the *blank page* part — how you reduced
ambiguity — more than the result.

> **Your turn:** the first design that didn't survive contact with reality,
> and what killed it. That single detail is what proves you were there.

> **Your turn:** who you talked to in the first two weeks, and what you
> learned that changed the design.

**The dig:** "Who else was on it?" "What did you personally build versus
review?" "How did you know you were done?" Boundary answers, ready.

**Weak version:** "I designed the whole system end to end." No blank page,
no wrong turn, no boundary. Reads as inflation.

</details>

**Follow-ups:**

1. Q: What would you do differently if you started it again tomorrow?
   <details><summary>Answer</summary>

   A real one, specific to the design. Candidates: modelling something as
   a role that should have been an attribute; under-estimating migration;
   not instrumenting adoption from day one.

   > **Your turn:** the actual answer. "Nothing" is a no-hire signal.

   </details>

### Q: Tell me about a time you got several teams to adopt a technical direction without having authority over them.
**Level:** senior · **Tags:** leadership, influence, cross-team

<details><summary>Model answer</summary>

**Pick a story:** the "influence without authority" slot — a shared library,
service or practice that other teams took on because it was better, not because
someone made them.

**Skeleton.** Situation: several teams each solving the same problem their own
way; no authority over any of them. Task: make one implementation the standard.
Action: the *mechanics* of influence — what made adoption easier than
not adopting, who the first adopter was and why, what objection the
hardest team had and what changed their mind, what I gave up to get
agreement. Result: the teams converged on one implementation. Reflection and rule: "I don't
win adoption with a mandate; I win it by making the right thing the path
of least resistance and getting one credible team on first."

**The dig:** "Which team resisted, and why?" "What did you change in
response to their pushback?" "Did anyone not adopt?"

> **Your turn:** the hardest team, their specific objection, and what
> changed. Without it this is a slogan.

**Weak version:** "I built a package and everyone used it." Adoption
without friction isn't leadership; it's luck, and the interviewer knows it.

</details>

**Follow-ups:**

1. Q: How would you do this when the teams are in three time zones?
   <details><summary>Answer</summary>

   Same mechanics, more writing. A design doc that's honest about
   trade-offs, circulated before any meeting; one early adopter in the
   partner team's own time zone; adoption metrics visible to everyone;
   and never asking for a decision in a meeting the decision-makers can't
   attend. That is what "driving technical alignment" looks like in practice.

   </details>

### Q: Tell me about a time you pushed back on a decision for security reasons.
**Level:** senior · **Tags:** leadership, security, conflict

<details><summary>Model answer</summary>

**Pick a story:** whichever of your stories contains a real disagreement about
a control — a timeout customers disliked, a finding someone wanted to defer, a
dependency someone wanted to ship anyway.

**Skeleton.** Situation: a product or deadline pressure that conflicted with
a control — a session timeout customers found annoying, a finding
someone wanted to defer. Task: mine to decide, or to argue. Action: how I
made the risk concrete for a non-security audience (the specific attack,
the specific customer impact), what compromise I offered, and where I held
the line. Result: what shipped. Reflection: whether I escalated at the
right time. Rule: "I translate security into the other person's risk
language, and I offer the smallest change that closes the risk."

Senior roles expect you to partner with product and security
engineers; the interviewer wants to see you hold a position *and* stay
collaborative.

> **Your turn:** the actual disagreement — who wanted what, what you
> proposed instead, and the outcome. If the honest answer is that you
> lost the argument, that's a fine story too, told with what you learned.

**Weak version:** "I always insist on security." No trade-off, no
collaboration, and interviewers don't want that.

</details>

**Follow-ups:**

1. Q: When is it right to *not* push back?
   <details><summary>Answer</summary>

   When the risk is genuinely low, the mitigation is disproportionate, or
   a compensating control exists — and I've said so in writing so the
   acceptance is a decision, not a drift. Security that blocks everything
   gets routed around; the credibility to win the important argument comes
   from conceding the unimportant ones.

   </details>

### Q: Tell me about someone you mentored. What changed for them?
**Level:** intermediate · **Tags:** leadership, mentoring

<details><summary>Model answer</summary>

**Pick a story:** the "led without the title" slot, or any mentoring that
happened alongside a rollout you owned.

**Skeleton.** A named (or role-described) person, where they started, what
you did — not "I answered questions" but a mechanism: pairing on design,
giving them ownership of a real piece, reviewing for reasoning rather than
correctness — and what they could do afterwards that they couldn't before.
Reflection: something you got wrong as a mentor. Rule: "I give people
something that's theirs, early, and review the thinking, not the code."


> **Your turn:** the person, the starting point, the mechanism, and the
> observable change. This question is unanswerable without a real example.

**Weak version:** "I mentored the junior developers on the team." Plural,
no mechanism, no outcome.

</details>

**Follow-ups:**

1. Q: What did you get wrong as a mentor?
   <details><summary>Answer</summary>

   Common honest answers: doing it for them when under deadline;
   feedback too soft too long; assuming they'd ask. Pick the true one.

   > **Your turn:** yours.

   </details>

### Q: Tell me about a failure. What changed because of it?
**Level:** senior · **Tags:** leadership, collaboration, failure

<details><summary>Model answer</summary>

**Pick a story:** an incident you owned, or the first design of something that
didn't survive contact with reality.

**Skeleton.** A real failure with your name on it — not a team failure, not
a "failure" that's secretly a success. What happened, what you did in the
moment, and — the part that's graded — what you changed afterwards that
was structural: a check that now exists, a process that now runs, a habit
you now have. Rule: "I treat every incident I caused as a missing control,
and I build the control."

Collaboration and values are largely this question. The interviewer is checking for
ownership without defensiveness.

> **Your turn:** the failure itself. The shape above is the framing; this needs
> the fact, including the part that was yours.

**Weak version:** "I worked too hard once." Or a failure that belonged to
someone else.

</details>

**Follow-ups:**

1. Q: How did you communicate it at the time?
   <details><summary>Answer</summary>

   Early, to the people affected, with what I knew and didn't yet know,
   and a time for the next update. The dig here is whether I told people
   before I was sure — the right answer is yes.

   </details>

### Q: Tell me about a time you disagreed with your manager or tech lead.
**Level:** intermediate · **Tags:** leadership, conflict, communication

<details><summary>Model answer</summary>

**Pick a story:** an architectural decision you argued for or against — a
split, a rewrite, a technology choice — where the other side had a real case.

**Skeleton.** The disagreement stated fairly — their position had merit,
say what it was. How you made your case: data, a prototype, a written
doc. How it resolved: you won, you lost, or you found a third option. What
you did after losing, if you lost — committed fully, which is the collaboration
signal. Rule: "disagree in writing with evidence, decide together, then
commit without relitigating."

> **Your turn:** a real one. Interviewers can tell a constructed disagreement
> from a lived one by the dig: "what exactly did they say?"

**Weak version:** a disagreement where you were obviously right and they
were obviously wrong. Real ones aren't like that.

</details>

**Follow-ups:**

1. Q: Have you ever been wrong in one of these?
   <details><summary>Answer</summary>

   Yes, and the story where I was is the stronger one to tell. Say what
   convinced me, and that I said so.

   > **Your turn:** the time you were wrong.

   </details>

### Q: Describe a production incident you handled. Walk me through it.
**Level:** senior · **Tags:** leadership, incidents, pressure

<details><summary>Model answer</summary>

**Pick a story:** the worst incident you personally handled.

**Skeleton.** The timeline: detection (how did you find out — alert or
customer?), triage (what you looked at first and why), mitigation (what
stopped the bleeding, and the trade-off — did you fail open?),
communication (who you told, when), resolution, and the RCA with the
control that came out of it. The interviewer is listening for calm
sequencing and for the *after*. Rule: "mitigate before diagnose; communicate
before certain; every incident leaves a control behind."

> **Your turn:** the incident's actual timeline and the control it produced.
> The chapter has the shape; this needs the times and the numbers.

**Weak version:** the story ends when the incident ends. No RCA, no change.

</details>

**Follow-ups:**

1. Q: What would a larger-scale version of that incident have needed?
   <details><summary>Answer</summary>

   Automated detection before customers noticed; a rollback that's a
   button, not a procedure; a cache or fallback so the critical path degrades
   rather than fails; and an incident channel with a single commander.
   That's the [observability and operations](30-observability-slos-and-operations.md)
   chapter, said out loud.

   </details>

### Q: Tell me about a time you had to prioritise between conflicting asks from different stakeholders.
**Level:** intermediate · **Tags:** leadership, prioritisation

<details><summary>Model answer</summary>

**Pick a story:** the "prioritised under pressure" slot — a backlog you ranked
against a deadline, with people who each wanted a different part of it first.

**Skeleton.** Who wanted what (one group wants everything fixed; another wants
the roadmap; customers want their specific item closed). The
framework you used to rank — risk × exposure × effort, or whatever it
actually was — and how you made it *visible* so the ranking wasn't your
opinion. What you deferred and how you made that a recorded decision.
Result. Rule: "I make the prioritisation legible so the disagreement is
about the criteria, not about me."

> **Your turn:** the actual ranking criteria and one item you deliberately
> deferred — and whether that ever bit you.

**Weak version:** "I did the most important ones first." Important by
what measure, decided by whom?

</details>

**Follow-ups:**

1. Q: How did you handle the stakeholder whose ask you deprioritised?
   <details><summary>Answer</summary>

   Told them directly, with the criteria and where their item sat, and
   what would move it up. People accept "no, and here's why" far better
   than silence, and the criteria let them argue the ranking rather than
   the person.

   </details>

### Q: Tell me about a time you gave someone difficult feedback.
**Level:** intermediate · **Tags:** leadership, feedback

<details><summary>Model answer</summary>

**Skeleton.** The situation — a code-quality pattern, a missed commitment,
a design that was going to fail. What you said, how you said it (privately,
specifically, about the work), and what you offered alongside it. What
changed. Reflection: whether you waited too long. Rule: "specific,
private, early, and paired with help."

For a senior role where you'll help set the review culture, this
one matters more than it looks.

> **Your turn:** a real instance. If none comes to mind, that itself is
> worth reflecting on before the round.

**Weak version:** feedback that was really praise, or feedback delivered
in a review comment with no conversation.

</details>

**Follow-ups:**

1. Q: What if they didn't take it well?
   <details><summary>Answer</summary>

   Listen first — the reaction usually contains information about
   something I didn't see. Then restate the specific behaviour and the
   impact, not the judgement, and agree one concrete next step. And follow
   up, because feedback without follow-up is just an unpleasant
   conversation.

   </details>

### Q: Tell me about something you had to learn very quickly.
**Level:** foundation · **Tags:** leadership, learning, gca

<details><summary>Model answer</summary>

**Pick a story:** a protocol, language or tool you had to learn because a
commitment depended on it — a spec you read cold, an engine whose evaluation
model you had to understand before you could make it fast.

**Skeleton.** What you didn't know, why it was suddenly needed, *how* you
learned it — the spec, a reference implementation, a person — and how you
knew you'd learned enough. What you built with it. Rule: "I learn from the
primary source and a working example, and I ship something small
immediately to find out what I misunderstood."

This is General Cognitive Ability wearing a behavioral costume; the
interviewer is listening for the method.

> **Your turn:** which one, and the concrete first thing you built with it.

</details>

**Follow-ups:**

1. Q: What did you get wrong at first?
   <details><summary>Answer</summary>

   There's always something. For SAML, common honest answers are clock
   skew, signature scope, or IdP-initiated flows; for Rego, the evaluation
   model. Say yours.

   > **Your turn:** the misunderstanding.

   </details>

### Q: Why this company, and why this team?
**Level:** intermediate · **Tags:** leadership, motivation

<details><summary>Model answer</summary>

The behavioral interviewer asks it too, and is listening for whether the
answer is about the *work* — the leverage, the problem, the scope — rather
than the brand.

Keep it under a minute. Name one specific thing about the team's public
work. Then stop.

> **Your turn:** the specific thing.

</details>

**Follow-ups:**

1. Q: What would make you leave in a year?
   <details><summary>Answer</summary>

   Honest and short: if the role turned out to be maintaining rather than
   building, or if I didn't get the ownership I was promised. Framed as what
   I'm looking for, not as a threat.

   </details>

### Q: How do you handle ambiguity day to day — not a project, just a normal week?
**Level:** intermediate · **Tags:** leadership, ambiguity, collaboration

<details><summary>Model answer</summary>

**Skeleton.** Not a story so much as a method, illustrated once. When the
ask is unclear: write down what I think it means and send it, because a
wrong written interpretation gets corrected in an hour and a wrong silent
one gets corrected in a month. Find the person who'll consume the result
and ask them what "done" looks like. Ship the smallest thing that tests the
interpretation. And be explicit about what I decided on my own so people
can object.

Then one example — a week where the requirement was a sentence and the work
turned out to be a month.

> **Your turn:** the example.

**Weak version:** "I'm comfortable with ambiguity." That's a claim; the
question wants a method.

</details>

**Follow-ups:**

1. Q: When do you escalate instead of deciding?
   <details><summary>Answer</summary>

   When the decision is hard to reverse, when it commits other teams, or
   when I'd need information only someone else has. Everything else I
   decide and announce. The failure mode at senior level is escalating too
   much, not too little.

   </details>

---

## Before the round

- Fill every `Your turn` above, and the third column of the six-slot table.
  Then run `/mock-interview leadership` — it will dig where the blanks were.
- Practise the six stories out loud, timed, until each is under two minutes
  with the boundary, trade-off, reflection and rule intact.
- Rehearse the two openers this round usually starts with — "tell me about
  yourself" (a 60–90 second walk from role to role that ends at *why this job*)
  and "why did you leave" (two or three sentences, no criticism, forward-facing,
  then stop).
- Prepare two questions for the interviewer.

---

## Glossary

- **Emergent leadership** — leading when your skills are needed, without a title, and stepping back when they aren't.
- **Collaboration & values** — the attribute covering ambiguity, humility, collaboration and doing the right thing.
- **STAR** — Situation, Task, Action, Result; the floor for a behavioral answer.
- **Reflection / generalisation** — the two additions that turn a story into evidence of judgement.
- **Boundary** — the explicit statement of what was yours versus the team's; what survives the dig.
- **The dig** — the follow-ups that test whether the story is real: who else, what did you do, what would you change.
