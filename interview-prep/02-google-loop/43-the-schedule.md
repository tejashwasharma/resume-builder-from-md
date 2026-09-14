# The schedule — from today to the onsite, and after

Today is 13 September 2026. You have passed the hiring assessment and the
next step is the technical phone screen, then a virtual onsite. Recruiters
typically schedule the screen one to two weeks out and the onsite two to
three weeks after a pass, so the realistic window is **six to eight weeks**.
This chapter turns the whole part into that many weeks, with an exit test
per week, and then says what happens after the loop.

Two rules the whole plan depends on:

- **Drill, don't read.** Reading produces recognition; the rounds test
  recall. Every week ends with `/drill` or `/mock-interview`, and the mock
  is graded, not skimmed.
- **Fill the blanks first.** The `FILL IN` markers in
  [WEAK-SPOTS](../WEAK-SPOTS.md), [the two roles](02-the-two-roles.md),
  [the security round](41-security-domain-knowledge.md) and
  [Googleyness & Leadership](42-googleyness-and-leadership.md) are the parts
  only you can write. They take an evening. Do them in week 1, because
  every later drill assumes they exist.

If the screen lands sooner than week 2, move the "phone-screen ready" line
up and compress weeks 1–2 into whatever time there is: chapters 10, 11, 12,
13, 18 and 21, in that order.

---

## The plan

| Week | Focus | Read | Drill | Exit test |
| --- | --- | --- | --- | --- |
| **1** (13–19 Sep) | Orientation + coding foundations | [01](01-the-loop.md), [02](02-the-two-roles.md), [03](03-coding-round-how-google-runs-it.md), [04](04-patterns-and-complexity.md), [05](05-choosing-the-approach.md), [06 arrays](06-arrays-and-two-pointers.md), [07 strings](07-strings-and-hashing.md) | All `FILL IN` markers filled. One problem a day out loud, timed, from 12–13. Write the `MinHeap`, union-find and a trie from scratch once each | Merge intervals and minimum window substring, each under 35 minutes, narrated, in a plain doc |
| **2** (20–26 Sep) | Coding: structures | [08](08-linked-lists.md), [09](09-stacks-queues-monotonic.md), [10](10-trees-and-bst.md), [11](11-heaps-and-top-k.md), [12 graphs](12-graphs.md), [13](13-matrices-and-grids.md) | Two problems a day. `/mock-interview coding` once. Recruiter questions from [01](01-the-loop.md#what-to-ask-the-recruiter-now) sent | Largest rectangle, course schedule and LCA under 35 minutes each. **Phone-screen ready.** |
| **3** (27 Sep–3 Oct) | Coding: techniques | [14](14-recursion-and-backtracking.md), [15 DP](15-dynamic-programming.md), [16](16-binary-search-and-bits.md), [17](17-tries-intervals-and-design-structures.md) | Two problems a day. `/mock-interview coding` twice. Re-solve everything in the mistake log from blank | Coin change, edit distance, Koko and LRU cache under 35 minutes. Can name the pattern of an unseen problem within a minute |
| **4** (4–10 Oct) | Distributed-systems foundations | [20](20-distributed-start-here.md)–[30](30-observability-slos-and-operations.md) | One coding problem a day to keep the hand in (from the [mock pool](19-the-drill-plan.md#the-mock-pool)). `/drill` on consistency, replication, caching, resilience. `/mock-interview distributed` once | Can explain CAP/PACELC, quorums, idempotency, cache invalidation and SLOs out loud, each in two minutes, with a Google-scale example |
| **5** (11–17 Oct) | System design | [31](31-design-round-start-here.md)–[39](39-design-classics.md), then [40 security designs](40-design-security-systems.md) | `/mock-interview design` three times: the auth service, the cloud posture system, the supply-chain integrity pipeline. One coding problem a day | A 45-minute design of the third-party access inventory that hits every rubric item, unprompted, including failure modes and "at 10×" |
| **6** (18–24 Oct) | Security round + Googleyness & Leadership | [41](41-security-domain-knowledge.md), [42](42-googleyness-and-leadership.md), [hard questions](../00-experience/hard-questions.md) | `/mock-interview security` twice. `/mock-interview googleyness` twice. Six stories timed under two minutes each. [18 security-flavoured problems](18-security-flavoured-problems.md) — all nine | Can threat-model a new service in five minutes; can explain SLSA, dependency confusion and workload identity without notes; every G&L story has its boundary, trade-off, reflection and rule |
| **7** (25–31 Oct) | Full rehearsal | Nothing new | A full simulated onsite over two days: coding, coding, design, googleyness, security — one per sitting, graded. Re-solve the mistake log from blank. `/prep-status` to find what's untouched | Every mock round rated "hire" or better; no `FILL IN` left; you can list the 30 pool problems' patterns from memory |
| **8** (1–7 Nov) | Taper | Re-read [03](03-coding-round-how-google-runs-it.md) and [42](42-googleyness-and-leadership.md) only | One easy problem a day, out loud. No new material after the Wednesday | Rested. See the day-before checklist |

Weeks 4–6 keep one coding problem a day on purpose: the phone screen may
land anywhere in that window, and coding fluency decays fastest.

**If the onsite is confirmed for a specific date,** count back: the final
week is always the taper, the week before is always full rehearsal, and
everything else compresses proportionally with coding protected first,
design second, foundations third.

---

## The final week

**Five days out**

- Confirm the round schedule and formats with the recruiter (from
  [the loop](01-the-loop.md#what-to-ask-the-recruiter-now)); write each
  round's name and interviewer area on a card.
- Set up the coding surface you'll actually use: a blank Google Doc with a
  monospace font and auto-capitalisation off. Solve two problems in it.
- Test the video setup: camera, microphone, lighting, a second screen for
  notes *only if* the interviewer knows and it isn't distracting.
- Print or pin: your six stories (one line each), the eight-step coding
  script, the design method's headings, and two questions per interviewer.

**The day before**

- One easy coding problem, out loud, in the doc. Stop.
- Read your six stories once. Don't rehearse them again.
- Re-read the [L5 downgrades](03-coding-round-how-google-runs-it.md#the-l5-downgrades)
  table — it's the list of things you can control.
- Prepare the room: water, a notepad, phone on silent, a note on the door.
- Sleep. A tired candidate narrates badly, and narration is the round.

**The day of**

- Start each round by saying the step you're on. "Let me restate that."
- Between rounds: stand up, water, don't post-mortem the last one. Each
  interviewer starts fresh; so do you.
- If a round goes badly, it's one line in a packet of five. The next round
  is a new interviewer with no knowledge of it.
- End every round with your two questions. Write down anything you learn
  about the team for team match.

---

## After the loop

**The hiring committee wait.** One to two weeks, sometimes more. Your
recruiter may ask for extra information or, if the packet is mixed,
schedule one more round; that's a normal outcome, not a bad sign. A short,
factual note to the recruiter is fine if you realise you gave a wrong
answer to a specific question. Anything longer isn't.

**Team match.** If the committee says hire, you may talk to one or more
hiring managers. Treat each as a two-way interview: the
[team-match talking points](02-the-two-roles.md#team-match-talking-points)
are yours; theirs is whether the team has the ownership, the 0→1 scope and
the mentoring structure the postings describe. Ask what a successful first
year looks like. Say which of the two roles you prefer, and why — you will
be asked.

**The offer.** Level is decided by the committee; comp is set by a
separate compensation process from the level and the location. A Google
offer typically has base salary, an annual bonus target, and an equity
grant vesting over several years, plus a possible signing bonus. Ask the
recruiter to walk through each component and the vesting schedule. It is
normal to take a few days and to negotiate with data; it is not normal to
negotiate the level after the committee has set it. The salary framing in
[hard questions](../00-experience/hard-questions.md#salary) applies.

> **FILL IN:** your target and your floor for total compensation, written
> down before any number is discussed, and the non-comp things that matter
> (start date, team, remote arrangement).

---

## Interview Q&A

### Q: You have six weeks. How would you split the preparation?
**Level:** foundation · **Tags:** google-loop, preparation, schedule

<details><summary>Model answer</summary>

Coding first and continuously, design in the middle, behavioural and
domain last but not least, with a rehearsal week and a taper.

Concretely: three weeks on coding — the structures, then the techniques —
because two of the five rounds are coding and the phone screen gates
everything; one week on distributed-systems foundations, because the
design round is graded on that vocabulary; one week on system design with
worked designs from the team's own domain; one week on the security
knowledge round and Googleyness & Leadership, with every story rehearsed
and timed. Then a full simulated onsite, and a final week where nothing
new is added.

The rule underneath it is that I'd drill every day and read only to
support the drill. And I'd fill in the parts only I can write — my own
stories, my honest answers on the weak spots — in the first week, because
every mock after that depends on them.

</details>

**Follow-ups:**

1. Q: What would you cut if you only had two weeks?
   <details><summary>Answer</summary>

   Foundations reading and the classics designs. Keep: the coding ladder
   compressed to arrays, graphs, DP and design structures; one worked
   security design; the six stories timed; and two mock rounds. Coding is
   protected first because it's two rounds and the gate.

   </details>

### Q: What do you do the day before an onsite?
**Level:** foundation · **Tags:** google-loop, preparation, day-before

<details><summary>Model answer</summary>

Almost nothing, deliberately. One easy problem out loud in the same kind
of document I'll use tomorrow, to keep the narration habit warm. Read my
stories once — not rehearse, read. Confirm the schedule, the setup and the
room. Then stop, because the thing most likely to cost me a round is being
tired, and narration and judgement are the first things fatigue takes.

</details>

**Follow-ups:**

1. Q: And between rounds on the day?
   <details><summary>Answer</summary>

   Stand up, drink water, and don't replay the last round. Each
   interviewer starts with no knowledge of the others, and the committee
   reads five independent write-ups — so the only thing a post-mortem
   between rounds can do is hurt the next one.

   </details>

---

## Glossary

- **Taper** — the final week with no new material, so the onsite is done rested.
- **Exit test** — the concrete check that a week's work is done, replacing a page count.
- **Mistake log** — the running record of missed problems by the signal missed; re-solved from blank on schedule.
- **Full rehearsal** — a simulated onsite, one round per sitting, graded.
- **Team match** — post-committee conversations with hiring managers; two-way.
