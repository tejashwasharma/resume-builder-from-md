# Foundations and failure modes

Your resume claims ~2–3B daily requests, a monolith split, cross-service gRPC
and a Redis caching redesign — all distributed systems territory, with no
distributed systems vocabulary anywhere on the page. This part closes that gap.
See [WEAK-SPOTS](../WEAK-SPOTS.md) #1.

> **New to this?** Read [start here](20-distributed-start-here.md) first — it
> explains what a distributed system is and defines every term used below.
> This chapter assumes that vocabulary and moves at speaking pace.

---

## In brief

- The **fallacies of distributed computing** are eight false assumptions
  about networks that every outage rediscovers at least one of — the
  network isn't reliable, latency isn't zero, bandwidth isn't infinite, and
  it isn't secure by default (internal traffic needs authentication too).
- **A timeout means "unknown," not "failed."** From the caller's side, at
  least five things could have happened — never arrived, crashed before
  acting, did the work then crashed, did the work and the reply was lost,
  or just slow — and they demand opposite responses. That single ambiguity
  is why idempotency exists and why "exactly once" delivery is a myth.
- **"Just retry" without care causes retry storms**: a slow (overloaded)
  service gets timed-out clients that retry, which triples its load right
  when it's already struggling — a feedback loop that turns a blip into a
  collapse. The fix is exponential backoff *with jitter* (the part people
  forget), circuit breakers, and retry budgets.
- **Grey failure hurts more than a crash**: a node that's up, passing
  health checks, and serving 30% errors or 10x latency doesn't get removed
  automatically the way a dead node does — it keeps taking traffic and
  keeps damaging it. Binary liveness checks miss this by design; alert on
  error rate and latency percentiles instead.
- Failure kinds run from easiest to worst to reason about: crash-stop,
  crash-recovery, omission, timing, and Byzantine (arbitrary/malicious) —
  rare outside adversarial settings and expensive to tolerate.
- **A network call is roughly 5,000x a main-memory read** — the reason an
  N+1 across services is catastrophic where the same pattern in-process is
  merely untidy, and why caching moves the needle so dramatically.

---

## Foundations

A system is distributed when it runs on more than one machine, and those
machines talk over a network.

Two things follow from that, and almost every hard problem in this part comes
from them:

- **Machines fail on their own.** One can die while the others keep going.
- **The network is unreliable.** Messages get lost, delayed, duplicated, or
  arrive out of order.

### The fallacies of distributed computing

Eight things people assume about networks that aren't true. Every outage
rediscovers at least one:

| Fallacy | What actually bites you |
| --- | --- |
| The network is reliable | Packets drop; calls fail halfway through |
| Latency is zero | A remote call is ~10⁵× a local one |
| Bandwidth is infinite | Chatty APIs saturate links |
| The network is secure | Internal traffic needs authentication too |
| Topology doesn't change | Instances come and go constantly |
| There is one administrator | Config drifts between teams |
| Transport cost is zero | Serialisation and TLS are real CPU |
| The network is homogeneous | Cross-region and cross-cloud differ wildly |

The fourth is the one your own work touches: the auth npm package exists
precisely because internal calls needed authenticating rather than trusting the
network.

### Latency numbers worth memorising

Interviewers use these to check you can reason about cost:

```
L1 cache                       ~1 ns
Main memory                  ~100 ns
SSD random read              ~150 μs
Datacentre round trip        ~500 μs      ← a service call
Disk seek (spinning)          ~10 ms
Cross-continent round trip   ~150 ms
```

The takeaway: **a network call is ~5,000× main memory.** That's why an N+1
across services is catastrophic where an N+1 in memory is merely untidy, and
it's why caching moves the needle so much.

---

## The failure that defines everything: partial failure

In a single process, a function call either returns or the whole process dies.
In a distributed system there is a third outcome: **you don't know**.

```mermaid
flowchart LR
  R["A's timeout fires"] --> A1["a. never arrived"]
  R --> A2["b. arrived, B crashed first"]
  R --> A3["c. B did the work, then crashed"]
  R --> A4["d. B did the work, reply lost"]
  R --> A5["e. B is just slow"]
  A1 --> S["Safe to retry"]
  A2 --> S
  A3 --> D["Retry duplicates the work"]
  A4 --> D
  A5 --> D
```
*From A's side all five look identical — that is what partial failure means, and why "just retry" is a decision rather than a default.*

When A sends B a request and gets no response before its timeout, at least five
things could have happened: (a) the request never arrived; (b) it arrived but B
crashed before acting; (c) it arrived, B *did the work*, then crashed before
replying; (d) B did the work and replied, but the reply was lost; (e) B is just
slow. Cases a and b are safe to retry. Cases c and d mean a retry **duplicates**
the effect. Case e means a retry piles more load onto a struggling service.

**A timeout tells you nothing about which of these happened** — and a, b need
the opposite response from c, d.

**A timeout tells you nothing about whether the work happened.** This is the
root of why idempotency matters, why "exactly once" is a myth, and why retries
are dangerous without care.

### Why "just retry" makes things worse

A slow service is usually an overloaded one. Retrying multiplies its load at
exactly the wrong moment, and the classic outage shape follows:

```mermaid
flowchart TD
  A["Service slows"] --> B["Clients time out"]
  B --> C["Clients retry"]
  C --> D["Load triples"]
  D -->|"and round again"| A
  D --> E["Total collapse"]
```
*The edge from load back to slowness is the whole problem: retries are a feedback loop, so a blip amplifies itself.*

This is a **retry storm**, and it's how a small blip becomes an outage. The
defences — exponential backoff with jitter, circuit breakers, retry budgets —
are in [resilience patterns](29-resilience-rate-limiting.md).

### Failure kinds, from easiest to worst

1. **Crash-stop** — the node dies and stays dead. Easiest: absence is
   detectable.
2. **Crash-recovery** — it comes back, possibly with stale state.
3. **Omission** — messages are dropped, some of the time.
4. **Timing** — everything works but too slowly to be useful.
5. **Byzantine** — a node behaves arbitrarily or maliciously. Rare outside
   adversarial settings, and enormously expensive to tolerate.

**Grey failure is the one that hurts most in practice**: a node that is up,
passing health checks, and serving 30% errors or 10× latency. Binary
up/down health checks miss it entirely, which is why you alert on error rates
and latency percentiles rather than liveness.


## Building it

**Libraries**

| Need | Library | Why |
| --- | --- | --- |
| Simulate partial failure in tests | `toxiproxy` | Injects latency, timeouts and connection resets between real services, so "what happens when B is slow" is a test, not a guess |
| Retry with backoff | `p-retry` | Exponential backoff and jitter out of the box — the shape "Why 'just retry' makes things worse" argues for |

**Pseudocode — a caller that treats a timeout as "unknown", not "failed"**

```ts
import pRetry from 'p-retry';

await pRetry(() => chargeCard(idempotencyKey, amount), {
  retries: 3,
  minTimeout: 200,
  factor: 2,          // backoff, not a fixed interval
  randomize: true,    // jitter — stops synchronized retry storms
});
```

The idempotency key, not the retry logic, is what makes this safe against
cases (c) and (d) from "The failure that defines everything" — a retry
without one duplicates the charge.

---

## At hyperscale

Google's engineering literature is unusually candid about failure, which is
why it is the right reference here. *The Google File System* (SOSP 2003)
opens by stating that with thousands of machines, "some are not functional at
any given time and some will not recover from their current failures" —
failure is a steady-state condition, not an event. *Paxos Made Live: An
Engineering Perspective* (Chandra, Griesemer, Redstone — PODC 2007) is the
paper to cite for the gap between an algorithm and a running system: the
authors describe the disk corruption, operator error and hard-to-reproduce
bugs that turned a "proven" protocol into years of engineering, and the
extensive testing harness they built to inject failures deliberately.

The *Site Reliability Engineering* book (O'Reilly 2016) turns this into
practice: cascading failures get their own chapter (22), with retries,
timeouts and load shedding treated as the levers that either contain a partial
failure or amplify it into a total one. Retry storms — every caller retrying
into an already-overloaded service — are the canonical example, and the
remedy (exponential backoff with jitter, retry budgets, and shedding load
early) is precisely what this chapter's "partial failure" section teaches.

**The design-round question this chapter answers:** *"Walk me through what
happens when this dependency is slow — not down, slow."* Slow is worse than
down: a dead dependency fails fast, a slow one ties up every thread and
connection waiting on it. A senior answer names the timeout, the retry policy
with jitter, the circuit breaker, and the fallback behaviour, and then says
which of those it would set first.

## Interview Q&A

### Q: What makes distributed systems basically harder than single-machine systems?
**Level:** foundation · **Tags:** distributed, failure, basics

<details><summary>Model answer</summary>

Partial failure, and everything that follows from it.

On one machine a call either returns or the process dies — both are
unambiguous. Across a network there's a third outcome: no response, and you
cannot tell which of five things happened. The request may never have arrived,
or arrived and the work was done but the reply was lost, or the remote side is
simply slow. Those need opposite responses — retry versus definitely-don't-retry
— and the caller has no way to distinguish them.

That single ambiguity generates most of the field. Idempotency exists because
retries may duplicate work. "Exactly once" is a myth because you can't
distinguish lost-request from lost-reply. Consensus protocols exist because
nodes can't agree on what happened. Timeouts are guesses, and a wrong guess
either gives up on healthy work or hammers a struggling service.

The second-order problem is that failures aren't independent in practice: a
slow service causes client retries, which increase its load, which makes it
slower. Local failures become global through feedback.

</details>

**Follow-ups:**

1. Q: A request times out. What should the caller do?
   <details><summary>Answer</summary>

   It depends entirely on whether the operation is idempotent, and that's the
   design decision the timeout forces you to have already made.

   If it is — a read, or a write with an idempotency key — retry with
   exponential backoff and jitter. The duplicate is harmless.

   If it isn't — "charge this card", "send this email" — retrying may perform
   the action twice. Either make it idempotent (assign a client-generated key
   the server deduplicates on), or don't retry and surface the uncertainty,
   which usually means a reconciliation process rather than pretending you know.

   The engineering answer is that you shouldn't have non-idempotent operations
   on a path that can time out, because you've built something where the safe
   action after a failure is undefined.

   </details>

2. Q: What's a retry storm, and how do you prevent it?
   <details><summary>Answer</summary>

   A feedback loop that turns a slowdown into an outage. A service gets slow,
   clients time out, clients retry, effective load multiplies, the service gets
   slower, more clients time out. It collapses, and it stays collapsed because
   the retry load prevents recovery even after the original cause is gone.

   Prevention comes in layers. **Exponential backoff with jitter** — backoff
   spaces retries out, and jitter is the part people forget: without random
   variation, every client retries at the same instant and you get synchronised
   thundering herds. **Circuit breakers** stop calling a failing dependency
   entirely, so it gets room to recover. **Retry budgets** cap retries as a
   percentage of total traffic, so retries can never dominate. **Deadline
   propagation** — pass the remaining time budget down the call chain so nobody
   retries work whose deadline has already passed.

   The one that matters most and is most often missed is the jitter.

   </details>

### Q: What's grey failure, and why does it matter more than a crash?
**Level:** senior · **Tags:** failure, observability, operations

<details><summary>Model answer</summary>

Grey failure is a component that is up, passing health checks, and
malfunctioning — serving a fraction of requests as errors, or responding at 10×
normal latency, or working for one shard and not others.

It's worse than a crash for two reasons. A crashed node is *detected*: load
balancers remove it, failover triggers, and the system heals automatically.
A grey-failing node keeps receiving traffic and keeps damaging it, indefinitely.

And it's worse because binary health checks miss it by design. A
`/health` endpoint returning 200 while the service fails 30% of real requests is
the normal case, not an edge case — health checks usually test the process, not
the dependency that's actually broken.

The defences are observability rather than architecture: alert on error rate
and latency percentiles rather than liveness; use p99 not averages, because an
average hides a broken tenth; make health checks meaningful by exercising real
dependencies; and give operators a way to remove a suspect instance manually,
because automation won't.

This connects directly to incident response — a grey failure is the incident
that gets reported by a customer rather than by an alarm, which is the worst
way to find out.

</details>

**Follow-ups:**

1. Q: How do you detect that a node is failing when it says it's healthy?
   <details><summary>Answer</summary>

   Stop trusting self-reports and look at outcomes.

   Compare instances against each other: if one instance in a pool has a
   markedly higher error rate or latency than its peers handling equivalent
   traffic, that's a strong signal regardless of what it says about itself.

   Measure from the client side, since the caller experiences the real
   behaviour — client-observed error rates and latency per upstream instance
   catch things no server-side check will.

   Make health checks *deep* rather than shallow: actually query the database,
   actually check the cache. That trades a risk — a deep check can cascade,
   marking every instance unhealthy when a shared dependency wobbles — so the
   usual compromise is shallow checks for liveness and deep checks for
   readiness, with hysteresis so a blip doesn't drain the pool.

   And outlier detection in the load balancer or mesh, which ejects an instance
   whose error rate diverges from its peers.

   </details>

---

## What a weak answer sounds like

- **"Distributed systems are harder because of network latency."** Latency is
  a performance problem. Partial failure is the *correctness* problem.
- **"We retry on failure."** Without idempotency, backoff, jitter and a
  breaker, that's a description of how you cause an outage.
- **Treating a timeout as a failure.** It's an unknown, and that distinction is
  the whole point.
- **Believing "exactly once" delivery exists.** See
  [time ordering idempotency](26-idempotency-transactions.md).
- **Only considering crash failures**, and having no answer for a node that's
  half-working.

---

## Quiz

### MCQ: What do the "fallacies of distributed computing" describe?
- [ ] Bugs specific to microservice architectures
- [x] False assumptions people make about networks (e.g. "the network is reliable", "latency is zero") that every outage rediscovers at least one of
- [ ] Design patterns that should always be avoided
- [ ] Common mistakes in database schema design
**Why:** These eight assumptions — reliability, zero latency, infinite bandwidth, security, static topology, one administrator, zero transport cost, homogeneity — are all false, and code that assumes them breaks in production.

### MCQ: Service A calls Service B and its timeout fires with no response. What is the fundamentally correct interpretation?
- [ ] The request definitely failed and can be safely retried
- [x] The outcome is unknown — at least five different things could have happened, and they call for opposite responses
- [ ] The request definitely succeeded, since B usually works
- [ ] This always means the network cable was physically disconnected
**Why:** A timeout doesn't distinguish "never arrived" (safe to retry) from "arrived, B did the work, reply was lost" (retry duplicates the effect) — the caller genuinely cannot tell which occurred.

### MCQ: Why is jitter (random variation in retry delay) as important as the backoff itself?
- [ ] It makes retries happen faster overall
- [x] Without it, every client retries at the same instant after the same backoff, creating a synchronized thundering herd
- [ ] It's required by most HTTP client libraries
- [ ] It reduces the total number of retries needed
**Why:** Exponential backoff alone still leaves all clients retrying in lockstep; jitter spreads those retries out so they don't collectively re-create the overload they were meant to avoid.

### MCQ: What causes a "retry storm" to become a full outage rather than a brief blip?
- [ ] A single client retrying too many times
- [x] Retries are a feedback loop — timed-out clients retry, load increases on the already-struggling service, which gets slower, causing more timeouts and more retries
- [ ] The database running out of disk space
- [ ] A misconfigured DNS record
**Why:** The load-to-slowness edge is what turns a temporary slowdown into a collapse that persists even after the original cause is gone, because the retry traffic itself is now the problem.

### MCQ: What makes "grey failure" more dangerous in practice than a node crashing outright?
- [ ] Grey failures are more common statistically
- [x] A crashed node is detected and removed automatically (load balancers, failover); a grey-failing node keeps passing health checks and keeps receiving and damaging traffic indefinitely
- [ ] Grey failures always cause data loss, unlike crashes
- [ ] Crashes are always caused by grey failures first
**Why:** Binary up/down health checks are blind to a node serving 30% errors or 10x latency while still responding 200 to `/health` — which is why alerting needs error rates and latency percentiles, not just liveness.

### MCQ: Why do a shallow health check (liveness) and a deep health check (readiness) serve different purposes?
- [ ] Shallow checks are simply an outdated approach
- [x] A deep check that queries real dependencies can cascade — marking every instance unhealthy when a shared dependency wobbles — so shallow liveness and deep readiness are usually split, with hysteresis
- [ ] Deep checks are always faster to run
- [ ] Only readiness checks are needed in production
**Why:** Exercising real dependencies gives a more honest signal but risks a shared-dependency blip taking down an entire healthy pool — the split balances honesty against that cascade risk.

### MCQ: What's the correct response when a non-idempotent operation (e.g. "charge this card") is on a path that can time out?
- [ ] Always retry once and accept the small risk
- [x] Either make the operation idempotent (a client-generated key the server deduplicates on) or don't retry automatically and surface the uncertainty for reconciliation
- [ ] Never allow any operation that could time out
- [ ] Increase the timeout until it never fires
**Why:** Retrying a non-idempotent operation after a timeout risks performing the action twice (e.g. double-charging) — the fix is either idempotency or explicit handling of the ambiguity, not blind retry.

### MCQ: Roughly how much more expensive is a network round trip within a datacenter compared to a main-memory access?
- [ ] About 10x
- [ ] About 100x
- [x] Roughly 5,000x
- [ ] About the same
**Why:** This is why an N+1 query pattern across services is catastrophic where the same pattern within one process is merely inefficient — and why caching (turning a network call into a memory read) has such outsized impact.

### MCQ: What distinguishes "crash-recovery" failure from "crash-stop" failure?
- [ ] Crash-recovery is more common in cloud environments
- [x] A crash-stop node dies and stays dead; a crash-recovery node comes back, possibly with stale state
- [ ] Crash-recovery only applies to database nodes
- [ ] Crash-stop is a subtype of Byzantine failure
**Why:** Crash-stop is the easiest failure mode to reason about because absence is detectable and permanent; crash-recovery adds the complication of a node returning with potentially outdated state.

### MCQ: Why is Byzantine failure (a node behaving arbitrarily or maliciously) rarely designed for outside adversarial settings?
- [ ] It never actually occurs in real systems
- [x] Tolerating it is enormously expensive compared to simpler failure models, and it's mainly relevant where nodes might actively be compromised or malicious
- [ ] It's identical to crash-stop failure in practice
- [ ] Byzantine fault tolerance is a solved, free problem in modern systems
**Why:** Most internal distributed systems can assume nodes fail honestly (crash, slow, drop messages) rather than lie — Byzantine fault tolerance is reserved for contexts like blockchain or multi-party systems with untrusted participants, where the extra cost is justified.

---

## Glossary

- **Partial failure** — some components fail while others continue.
- **Fallacies of distributed computing** — eight false assumptions, chiefly
  that the network is reliable.
- **Grey failure** — up and passing health checks, but malfunctioning.
- **Retry storm** — retries multiplying load on a struggling service.
- **Jitter** — randomness added to backoff so clients don't synchronise.
- **Retry budget** — a cap on retries as a share of total traffic.
- **Deadline propagation** — passing the remaining time budget down the chain.
- **Byzantine failure** — arbitrary or malicious behaviour.
- **Crash-stop / crash-recovery** — dies and stays dead / returns with stale
  state.
