# Microservices

You split a monolith into 3 services, so this comes up as a real question
rather than a theoretical one. The interviewer mostly wants to know whether you
can articulate the **cost**.

---

## In brief

- **Microservices solve an organizational problem more than a technical
  one**: letting teams deploy independently without coordinating. "The
  codebase is messy" or "microservices are modern" are not real reasons to
  split — a modular monolith fixes messiness with none of the operational
  cost.
- **Splitting by technical layer creates a distributed monolith**: every
  feature crosses API/logic/data services, so you still deploy them
  together, paying network complexity for zero independence. Splitting by
  domain (Orders, Billing, Shipping) means a feature usually touches one
  service.
- **Data ownership is the sharpest test of a correct boundary**: if two
  services write the same table, they're actually one service. The
  practical question — "can you deploy this without coordinating with
  another team?" — decides whether the boundary is right.
- **The cost list has to be named unprompted**: every in-process call
  becomes a network call that can fail or hang, debugging needs
  distributed tracing instead of a stack trace, data consistency becomes
  your problem (sagas, outbox), and local development gets meaningfully
  harder. Listing only benefits is the tell of enthusiasm over experience.
- **Sync vs. async communication is decided by one question**: does the
  caller need the answer to continue? A welcome email failing shouldn't be
  able to fail user registration. Avoid synchronous chains (A→B→C→D) —
  latency adds up and any single failure kills the whole request.
- **A service mesh is worth its operational weight only past a certain
  scale** — many services in several languages benefit from consistent
  retries/mTLS/tracing at the infrastructure layer; a handful of services
  in one language gets the same behavior from a library, more cheaply.

---

## What they actually buy you

Microservices solve an **organisational** problem more than a technical one:
letting teams deploy independently without coordinating.

Genuine reasons to split:
- Teams are blocked waiting on each other's deploys
- One component needs to scale very differently from the rest
- Fault isolation genuinely matters
- Different parts want different languages or runtimes

Not reasons:
- The codebase is messy (that's a structure problem — fix the structure)
- Microservices are modern
- It might scale someday

**A modular monolith** — clear internal boundaries, one deployable — gets you
most of the structural benefit with none of the operational cost, and it stays
splittable later once the boundaries have proven themselves.

---

## Getting boundaries right

This is the decision the whole thing lives or dies on.

**Split by technical layer** (API service → logic service → data service) and
every feature crosses all three: adding one field means three repos, three
deploys, one release train — a distributed monolith with none of the benefits.
**Split by domain** (Orders, Billing, Shipping, each owning its own table and
communicating via events) and adding a field to Shipping touches Shipping.

Criteria, in order:

1. **Domain boundaries.** A service should map to an area with its own
   vocabulary and rules.
2. **Data ownership.** Each service owns its data exclusively. If two services
   write the same table, they're one service. *Shared database is the classic
   anti-pattern — you get distributed deployment with none of the
   independence.*
3. **Rate of change.** Code that changes together should live together.
4. **Team ownership.** A service nobody owns rots.

**The test:** can you deploy this service without coordinating with another
team? If not, the boundary is wrong.

---

## What it costs

Be able to list these — it's what separates experience from enthusiasm:

- Every in-process call becomes a network call that can fail, or worse, be slow
- Debugging needs distributed tracing instead of a stack trace
- Data consistency becomes your problem (sagas, outbox — see
  [idempotency transactions](../02-interview-core/26-idempotency-transactions.md))
- Per-service CI/CD, monitoring, on-call
- Local development gets meaningfully harder
- Versioning and compatibility across services

---

## Communication patterns

```mermaid
flowchart TD
  Q{"Do you need the answer<br/>to continue?"} -->|yes| S["<b>synchronous</b><br/>REST, gRPC<br/><i>you are only as available<br/>as everything you call</i>"]
  Q -->|"no — it is a side effect"| A["<b>asynchronous</b><br/>queue, event<br/><i>absorbs spikes, no result</i>"]
  S --> C["<b>avoid chains.</b> A → B → C → D<br/>adds latency and any one failure<br/>kills the request"]
```
*Sending a welcome email must not be able to fail user registration — that single example decides most of these calls for you.*

**Synchronous (REST, gRPC)** — simple, immediate result, but it couples
availability: your service is only as available as everything it calls, and
latency adds up down the chain.

**Asynchronous (queue, event)** — decoupled in time, absorbs spikes, but the
caller doesn't get a result, and debugging spans systems.

The rule: **synchronous when you need the answer to continue, asynchronous for
side effects.** Sending a welcome email shouldn't be able to fail user
registration.

**Avoid chains.** A → B → C → D means latency adds up and any one failure kills
the request. Prefer a shallow fan-out, or events.

---

## The service mesh question

```mermaid
flowchart LR
  subgraph A["Service A"]
    direction TB
    AA["app"] --> AP["sidecar"]
  end
  subgraph B["Service B"]
    direction TB
    BP["sidecar"] --> BB["app"]
  end
  AP -->|"mTLS, retries, timeouts,<br/>tracing — all here"| BP
```
*Worth it for many services in several languages. For a handful in one language a library does the same job without the operational weight.*

A mesh (Istio, Linkerd) puts a sidecar proxy next to each service and handles
retries, timeouts, mTLS, load balancing and tracing at the infrastructure layer
instead of in your code.

Worth it when you have many services in several languages and want consistent
behaviour without every team implementing it. Not worth it for a handful of
services — it's a lot of operational complexity, and a library does the same
job when everything is one language.


## Building it

No new library beyond what the specific communication choice already needs:

| Pattern | See |
| --- | --- |
| Synchronous (REST/gRPC) | [api-styles](04-api-styles.md) |
| Asynchronous (queue/event) | [messaging-streams](../02-interview-core/27-messaging-streams.md) |
| Service mesh sidecar | Infrastructure (Istio, Linkerd) — not application code; see [zero-trust-idps](../01-auth-identity/10-zero-trust-idps.md) |

The design decision this chapter is actually testing — where the boundary
goes — isn't a library choice at all.

---

## Interview Q&A

### Q: How do you decide where to draw service boundaries?
**Level:** senior · **Tags:** microservices, ddd, architecture

<details><summary>Model answer</summary>

I'd talk about criteria rather than an answer, because the criteria are what
transfer.

**Domain boundaries first** — services should map to bounded contexts, areas
with their own vocabulary and rules. If two parts of the system use the same
word to mean different things, that's usually a boundary.

**Data ownership** — each service owns its data exclusively. If two services
need to write the same table, they belong together. A shared database across
"microservices" is the classic anti-pattern: you get distributed deployment
with none of the independence, because neither service can change its schema
alone.

**Rate and reason of change** — code that changes together should live
together. If every feature touches all three services, the split is wrong.

**Team ownership**, because a service with no owner rots.

The anti-pattern is splitting by technical layer — an API service, a logic
service, a data service. Every feature then crosses all three, so you deploy
them together and you've built a distributed monolith: all the network
complexity, none of the benefit.

The practical test I'd apply: can I deploy this without coordinating with
another team? If no, the boundary is wrong.

</details>

**Follow-ups:**

1. Q: Was splitting the monolith worth it?
   <details><summary>Answer</summary>

   That depends on what was actually blocking us, and I'd want to answer
   honestly rather than defend the decision.

   The costs are real: every in-process call became a network call that can
   fail or hang, debugging needed distributed tracing rather than a stack
   trace, data consistency became our problem, and local development got
   harder.

   It's worth it when teams are genuinely blocked deploying independently, when
   one component needs to scale differently, or when fault isolation matters.

   It isn't worth it when the real problem is a badly-structured codebase. A
   **modular monolith** — clear internal boundaries, one deployable — gets most
   of the structural benefit with none of the operational cost, and you can
   still split later once the boundaries have proven themselves.

   With three services and one team, I think a modular monolith might have
   carried us for another year. What made the split worthwhile was scaling one
   component separately from the others.

   > **FILL IN:** what actually drove your split — scaling, team boundaries, or
   > deploy contention? The honest reason makes this a much better answer.

   </details>

2. Q: Two services need the same data. What do you do?
   <details><summary>Answer</summary>

   Some sharing is unavoidable; the question is the mechanism.

   The option I'd usually pick is **duplicating the data** each service needs,
   kept eventually consistent through events. Each service owns its own copy,
   shaped for its own use. It feels wrong if you're trained on normalisation,
   but it's the right trade here — you're buying independence with storage and
   a consistency window.

   Alternatively, **call the owning service** synchronously. Simple and always
   current, but now the caller is only as available as the callee, and latency
   compounds.

   What you avoid is **two services writing the same table**, because then
   neither can change its schema independently. That's the coupling that
   removes the entire point of splitting.

   If a lot of data needs sharing, that's usually a signal the boundary is
   wrong and the two services want to be one.

   </details>

### Q: How do you debug a request that spans five services?
**Level:** senior · **Tags:** observability, tracing

<details><summary>Model answer</summary>

Distributed tracing, and it needs to be in place before you need it — you can't
add it during an incident.

A **correlation ID** is generated at the edge and propagated through every call,
usually via headers, so logs from all five services can be pulled together for
one request. That alone solves most of it.

Proper tracing goes further: each service emits **spans** with timing and
parent/child relationships, so a tool like Jaeger shows the whole request as a
waterfall — where the time went and which call failed. OpenTelemetry is the
standard for instrumenting it.

The three pillars together: **logs** for what happened, **metrics** for
aggregate health, **traces** for one request's path through the system.

The practical points I'd add: propagation must survive async boundaries — a
message going through a queue has to carry the trace context, or the trace
breaks exactly where it's most useful. And you sample, because tracing
everything is expensive — but sample intelligently, keeping all the errors and
slow requests rather than a flat percentage.

For a multi-tenant system I'd also tag spans with tenant, because "it's slow
for one customer" is undiagnosable otherwise.

</details>

---

## What a weak answer sounds like

- **"Microservices scale better."** They scale *teams*. Technically they add
  latency and failure modes.
- **Splitting by technical layer.** Distributed monolith.
- **Shared database across services.** The anti-pattern.
- **Listing only benefits.** Every architecture question wants the cost.
- **No tracing story.** Debugging is the biggest day-to-day cost.

---

## Quiz

### MCQ: According to this chapter, what problem do microservices primarily solve?
- [ ] A purely technical scalability problem
- [x] An organizational problem — letting teams deploy independently without coordinating with each other
- [ ] A code readability problem
- [ ] A cost-reduction problem
**Why:** The genuine reasons to split are organizational (teams blocked on each other's deploys, differing scaling needs, fault isolation) — "the codebase is messy" or "it's modern" are explicitly named as not reasons.

### MCQ: Why does splitting services by technical layer (API service → logic service → data service) create a "distributed monolith"?
- [ ] It requires more servers than splitting by domain
- [x] Every feature crosses all three layers, so the services still have to deploy together — you get network complexity with none of the independence benefit
- [ ] Technical-layer splits are always slower at runtime
- [ ] It's impossible to implement with modern frameworks
**Why:** The alternative — splitting by domain (Orders, Billing, Shipping) — means adding a field to Shipping touches only Shipping, actually achieving independent deployability.

### MCQ: What is "the classic anti-pattern" this chapter names for microservice data ownership?
- [ ] Using a NoSQL database instead of SQL
- [x] Two services writing to the same shared database table — if they do, they're effectively one service pretending to be two
- [ ] Storing data in more than one region
- [ ] Using an ORM instead of raw SQL
**Why:** Sharing a table means neither service can change its schema independently, which removes the entire point of splitting — you get distributed deployment complexity with none of the actual independence.

### MCQ: What's the practical test this chapter offers for whether a service boundary is correctly drawn?
- [ ] Whether the service has fewer than 1,000 lines of code
- [x] Whether you can deploy this service without coordinating with another team
- [ ] Whether the service uses a different programming language
- [ ] Whether the service has its own dedicated on-call rotation
**Why:** This directly tests the organizational goal microservices are meant to serve — if deploying one service still requires coordinating with another team, the boundary hasn't actually achieved independence.

### MCQ: Which of these is explicitly named as part of the real cost of microservices that should be volunteered unprompted?
- [ ] Higher cloud hosting bills only
- [x] Every in-process call becomes a network call that can fail or be slow, and debugging needs distributed tracing instead of a stack trace
- [ ] The need to rewrite the entire codebase in a new language
- [ ] Losing the ability to use version control
**Why:** Listing only benefits is called out as a weak answer — naming these concrete costs (network calls that fail, harder debugging, consistency becoming your problem, harder local dev) is what separates experience from enthusiasm.

### MCQ: What question decides whether a call between services should be synchronous or asynchronous?
- [ ] Whether the two services are written in the same language
- [x] Does the caller need the answer to continue — if yes, synchronous; if it's a side effect, asynchronous
- [ ] Whether the call crosses a network boundary
- [ ] How large the payload is
**Why:** A welcome email failing shouldn't be able to fail user registration — that's the concrete example that makes the sync/async decision obvious in practice.

### MCQ: Why should synchronous call chains (Service A → B → C → D) be avoided where possible?
- [ ] Synchronous calls are always slower than asynchronous ones
- [x] Latency compounds down the chain, and a failure anywhere in the chain kills the entire request
- [ ] Chains longer than two services aren't supported by most frameworks
- [ ] It's a purely stylistic preference with no real cost
**Why:** Each additional synchronous hop adds both latency and a new point of failure — a shallow fan-out or event-based design avoids that compounding risk.

### MCQ: For two services that both need access to the same underlying data, what's usually the preferred approach over having them share a database table?
- [ ] Merging the two services back into one
- [x] Each service maintains its own copy of the data it needs, kept eventually consistent through events
- [ ] Using a distributed transaction across both services on every read
- [ ] Granting one service direct read access to the other's database
**Why:** This trades storage duplication and a consistency window for genuine independence — each service can evolve its own copy's schema without coordinating with the other.

### MCQ: Why is a "correlation ID" described as solving "most of" the distributed debugging problem, even before proper distributed tracing is added?
- [ ] It automatically fixes the underlying bug causing slow requests
- [x] Generated at the edge and propagated through every call, it lets logs from all services involved in one request be pulled together, even without full span-based tracing
- [ ] It replaces the need for logging entirely
- [ ] It's only useful for security auditing, not debugging
**Why:** Even a simple shared identifier across service logs dramatically narrows "which of these five services' logs relate to this one failing request" — full tracing (spans, parent/child relationships) adds more detail on top of that foundation.

### MCQ: When is a service mesh (Istio, Linkerd) worth its operational complexity, according to this chapter?
- [ ] Always — it should be the default for any service-to-service communication
- [x] When there are many services written in several different languages, where consistent retry/mTLS/tracing behavior would otherwise need to be reimplemented per language
- [ ] Only for public-facing APIs, never for internal services
- [ ] Never — a service mesh is described as pure overhead in all cases
**Why:** For a handful of services in one language, a shared library achieves the same cross-cutting behavior without taking on a sidecar proxy's operational weight — the mesh earns its cost specifically at multi-language scale.

---

## Glossary

- **Bounded context** — a domain area with its own vocabulary and rules.
- **Distributed monolith** — services that must deploy together. Worst of both.
- **Modular monolith** — internal boundaries, one deployable.
- **Service mesh** — sidecar proxies handling retries, mTLS, tracing.
- **Correlation ID** — an id following one request across services.
- **Span / trace** — one operation's timing / the whole request's path.
- **OpenTelemetry** — the standard for emitting traces and metrics.
