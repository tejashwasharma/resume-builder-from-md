# Weak spots

An honest register of where your resume is most likely to get you caught. This
is uncomfortable on purpose. Every item here is something an interviewer can
reach by pulling a thread you yourself put on the page.

Ranked by *likelihood × damage*. Work down from the top.

The `mock-interview` skill pulls curveballs from this file, so anything you
resolve here should be updated — strike it out and note the resolution.

---

## 1. No distributed-systems vocabulary, despite claiming distributed scale

**The gap.** Your resume claims ~2–3B daily requests, a monolith split into 3
services, a Redis caching redesign, and gRPC between services. Not one line
mentions replication, consistency, partitioning, queues, or failure modes.

**Why it bites.** Every one of those claims is a doorway. "You cached policy
decisions in Redis — what happens when the cache and the policy store
disagree?" is a completely fair question and it lands in consistency,
invalidation, and stampede territory immediately.

**What resolves it.** `02-distributed-systems/`, especially
`09-caching-at-scale.md` and `02-cap-pacelc-consistency.md`. You need to be
able to reach for this vocabulary without being asked — using it *before* you're asked
is what signals the level.

---

## 2. Golang is listed but nothing you describe used it

**The gap.** Go sits in your Backend skill line. All eleven Contentstack
bullets describe Node/NestJS work. Nothing on the page evidences Go.

**Why it bites.** Listing a language invites a question in it, and "I've used
it a little" after listing it alongside Node reads worse than not listing it.

**Two honest routes** — pick one, don't drift between them:

- **Prepare it properly.** `04-backend/03-golang.md` covers goroutines,
  channels, the memory model, and the questions that actually get asked. This
  is the better option if you have real Go exposure to build on.
- **Reframe it.** Move Go to a clearly secondary position on the resume, and
  have a one-line answer ready: what you used it for, at what depth, and what
  you'd need to ramp. Confident scoping beats bluffing.

> **FILL IN:** what Go have you actually written? Production service, internal
> tool, side project, or reading only? The answer decides which route is honest.

---

## 3. "~2–3B daily requests" — scale you must be able to draw

**The gap.** It's the biggest number on your resume and it's in the summary,
so it gets asked about early.

**Why it bites.** Two failure modes. Overclaim — implying you designed a
system at that scale when you hardened a layer within one — and a senior
interviewer will find the seam. Underclaim — "that was really the platform,
not me" — and you've just deleted your headline achievement.

**What a good answer sounds like.** The platform served that volume; the auth
layer sat in front of it; here is the architecture, here is specifically what
I owned inside it, here is what I changed and what it did to the numbers.
Precise about the boundary, unapologetic about the part that was yours.

**What resolves it.** `03-system-design/04-design-auth-service.md` works this
exact system at this exact scale, and `03-system-design/02-estimation.md`
turns 2–3B/day into RPS you can say out loud (~30–35k average, and you should
know your peak multiplier).

> **FILL IN:** what was the actual peak-to-average ratio, and what was the
> read/write split on auth requests?

---

## 4. "Led RBAC design and implementation 0 to 1" — attribution

**The gap.** "Led … 0 to 1" is a strong claim. Senior interviewers probe it
almost reflexively, because it's the most commonly inflated phrase on
engineering resumes.

**Why it bites.** The probe is usually gentle and specific: "who else was on
it?", "what did you personally build versus review?", "what did you get wrong
first?". Vague answers read as inflation even when the claim is true.

**What resolves it.** A rehearsed, precise boundary: team size, your specific
surface, what you delegated, and — most persuasive — a decision you got wrong
and corrected. Admitting a wrong turn is the strongest evidence that you were
actually there.

> **FILL IN:** how many engineers, over what period, and what was your first
> RBAC design that didn't survive contact with reality?

---

## 5. You are not currently employed

**The gap.** Contentstack ends Aug 2026 on the resume. It is currently Sep 2026.
Every reader notices, and it is the first thing many will ask.

**Why it bites.** Not because gaps are disqualifying — they aren't — but
because a defensive or over-explained answer creates a problem that the fact
itself doesn't.

**What a good answer sounds like.** Two or three sentences, forward-facing,
no apology, no criticism of the former employer, ending on what you're looking
for next. Then stop talking.

**What resolves it.** [hard questions](00-experience/hard-questions.md).

> **FILL IN:** what actually happened, and what do you want it to sound like?
> This one genuinely needs your input — I won't script a reason for you.

---

## 6. "13s to under 200ms" — the missing middle

**The gap.** You state the before and after but never the diagnosis.

**Why it bites.** The obvious follow-up is "what was the 13 seconds *doing*?"
An engineer who actually did the work answers instantly and specifically —
policy evaluation walking every rule, an N+1 against the policy store, no
cache on the hot path. Hesitating here undermines the whole bullet.

**What a good answer sounds like.** How you found it (profiling, tracing,
Datadog flame graph), what the bottleneck actually was, why your fix targeted
that specifically, and what you'd do next if you needed another 10x.

> **FILL IN:** what did profiling actually show, and how did you find it?

---

## 7. "2–3x more PRs per sprint" from AI adoption

**The gap.** Throughput claims invite quality skepticism, especially from
interviewers who are wary of AI-assisted output.

**Why it bites.** "More PRs" alone can read as "more churn." The unspoken
question is whether defect rate went up.

**What a good answer sounds like.** Pair the throughput number with the
quality number you already have — coverage went 75% → 85%+ over the same
period — and be ready on review process: what AI drafted versus what a human
approved, and what you refused to let it do.

**What resolves it.** `08-ai-tooling/` — [ai engineering](08-ai-tooling/01-ai-engineering.md)
for what you built, and [ai across the sdlc](08-ai-tooling/02-ai-across-the-sdlc.md)
for what it does day to day, which is where this question actually lands.

---

## 8. "Zero Trust Architecture" — buzzword risk

**The gap.** It appears in your skills line with no bullet evidencing it.

**Why it bites.** It's the single most over-claimed phrase in IAM. Some
interviewers ask about it *specifically* to see whether a candidate is
pattern-matching on vocabulary.

**What a good answer sounds like.** Skip the marketing definition. Name
concrete controls you implemented: per-request authorization rather than
network-perimeter trust, short-lived tokens, session revocation, continuous
verification, least-privilege defaults in the RBAC model. You have real work
behind several of those — say those, not the slogan.

**What resolves it.** [zero trust idps](01-auth-identity/10-zero-trust-idps.md).

---

## Lower-priority, still worth an answer

- **"Ping Identity"** — listed alongside Okta and Entra ID, but your bullets
  only evidence Okta and Entra. Be ready to scope your Ping exposure honestly.
- **"Firebase"** and **Socket.io** — old-stack items with no supporting bullet.
  Fine to list, but know roughly when you last used them.
- **"Led 5+ developers technically"** — the apologetic "(no formal title)"
  parenthetical is gone from the resume, so the claim now stands unqualified.
  Be ready for "what was your actual title then?" and answer it plainly
  rather than retreating from the claim.
- **Two roles at one company** — expect "what changed when you were promoted?"
  A precise answer about scope change is an easy win.
- **"AI Security Analysis"** — the boldest of the new AI claims, and it sits in
  your own specialty, where an overclaim is most expensive. Hold the line
  between *pattern matching* (string-concatenated queries, committed secrets,
  a dependency CVE, a missing check on a new route) and *threat modelling*,
  which needs context a model cannot have. See
  [ai across the sdlc](08-ai-tooling/02-ai-across-the-sdlc.md) §5.
- **The breadth items** — PassportJS, CloudWatch, Route 53, PM2, Postman, Jira.
  Each is now on the page and each is one question deep. The prep covers them
  ([frameworks](04-backend/02-frameworks.md) §Passport.js,
  [aws and containers](07-cloud-devops/01-aws-and-containers.md),
  [cicd and observability](07-cloud-devops/02-cicd-and-observability.md)
  §The day-to-day tooling) — the risk is not depth, it's being unable to say
  *when you last used it* on the ones you touched years ago.

---

## How to use this file

1. Fill in every `> **FILL IN:**` above. Those are the answers only you have,
   and each one is load-bearing for a story you'll otherwise fumble.
2. Run `/mock-interview` — it will deliberately aim at these.
3. When you can answer one cleanly under pressure, strike it out here and note
   what your answer is. This file should shrink over time.
