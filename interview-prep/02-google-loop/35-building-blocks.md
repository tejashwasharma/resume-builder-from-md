# Building blocks

*In the Google round: draw the standard architecture in under two minutes, then spend the time on the block the role cares about — for a security team, the control plane that produces and closes findings.*

The vocabulary of a design round. Each block below is a thing you *place* on
the whiteboard, with a reason and a cost.

---

## In brief

- **Draw the subset you need, not the whole chain** — the full
  clients→CDN→LB→gateway→services→cache→DB→replicas→queue→workers→object-
  store diagram is most designs' superset. Opening with all of it leaves
  nowhere to go in the deep dive.
- **Health checks trade two failure modes against each other**: shallow
  checks miss grey failure (up but malfunctioning); deep checks that
  actually exercise dependencies can cascade, draining every instance when
  one shared dependency wobbles. The usual split is shallow for liveness,
  deep for readiness, with hysteresis.
- **An API gateway can only do coarse authorization** (valid token, correct
  audience) — only the owning service knows ownership, tenancy, and state.
  Treating the gateway as the *only* check turns the internal network into
  an implicit trust zone.
- **Choose a database from access patterns, not data shape** — "how is
  this read?" decides more than "what does it look like?" It's normal and
  not indecisive to use several stores for one system: Postgres for core
  entities, Redis for sessions, Elasticsearch for search.
- **The read and write paths in an auth system can be orders of magnitude
  apart** (30 RPS writes vs. 30,000 RPS reads) and deserve genuinely
  different designs — the write path bumps a cache version so stale reads
  become unreachable, which is where the real correctness risk lives: a
  cached "allow" for a just-removed role is a security bug, not a stale
  read.
- **Every cache layer (CDN, in-process, shared, database-level) has a
  different invalidation problem** — decide the invalidation strategy
  *before* adding the cache, not after, and use versioned keys for
  anything security-relevant.

---

## The standard architecture

```mermaid
flowchart TD
  C["clients"] --> CDN["CDN"] --> LB["load balancer"] --> GW["API gateway"]
  GW --> S["services"]
  S --> CA[("cache")]
  CA --> DB[("primary DB")]
  DB --> RR[("read replicas")]
  S --> Q["queue / log"] --> W["workers"]
  S --> OS[("object store")]
```
*Most designs are a subset of this. Start with the subset you need — opening with the whole chain leaves you nowhere to go in the deep dive.*

The full chain, top to bottom: **clients → CDN → load balancer → API gateway →
services**, with services reading through a **cache** to a **primary DB** that
replicates to **read replicas**, pushing side effects onto a **queue/log** for
**workers**, and putting blobs in an **object store**.

Most designs are a subset of that. Start with the subset you need and add
under pressure — starting complex leaves nowhere to go in the deep dive.

---

## The blocks

### Load balancer

**L4** routes on IP/port — fast, protocol-agnostic. **L7** understands HTTP, so
it can route on path, terminate TLS, and retry. Most API traffic wants L7.

Algorithms: round-robin (simple), least-connections (better with uneven request
costs), consistent hashing (session affinity, cache locality).

**Health checks are the interesting part.** Shallow checks miss grey failure;
deep checks can cascade, draining every instance when one shared dependency
wobbles. The usual answer is shallow for liveness, deep for readiness, with
hysteresis.

### API gateway

The cross-cutting layer: authentication, rate limiting, routing, request
shaping. Putting these here avoids reimplementing them per service.

**The caution for your domain**: the gateway can do *coarse* authorization —
valid token, correct audience — but only the owning service knows ownership,
tenancy and state. A gateway as the *only* check makes the internal network an
implicit trust zone.

### Cache

Covered in depth in [caching at scale](28-caching-at-scale.md).
For design rounds, know where to place one and be ready for "how do you
invalidate it?"

### Databases

| Type | Model | Fits |
| --- | --- | --- |
| **Relational** | Tables, joins, ACID | Relationships, transactions, ad-hoc queries |
| **Document** | JSON documents | Nested data, flexible schema, one-document reads |
| **Key-value** | Hash | Sessions, caches, simple lookups |
| **Wide-column** | Rows with dynamic columns | Huge write volume, time series |
| **Graph** | Nodes and edges | Traversals — social, permissions graphs |
| **Search** | Inverted index | Full text, faceting |

**Choose from access patterns, not from data shape.** "How is this read?"
decides more than "what does it look like?" And it's normal to use several —
Postgres for core entities, Redis for sessions, Elasticsearch for search.

### Queue / log

Decouples in time, absorbs spikes, fans out. Queue for work distribution, log
for event streams and replay. See
[messaging streams](27-messaging-streams.md).

### CDN

Caches static and cacheable content at the edge. For anything media-heavy the
CDN hit rate is the number that determines both origin load and cost.

### Object storage

Blobs — images, video, backups, logs. Cheap, effectively unlimited, with
lifecycle tiering. Never store blobs in your database; store a reference.

---

## Diagrams to draw fast

**1. Request path** — clients → LB → service → cache → DB. The default opener.

```mermaid
flowchart LR
  subgraph W["Write path — ~30 RPS"]
    direction TB
    AD["admin changes a role"] --> PR[("primary")]
    PR --> BV["bump the tenant's<br/>cache version"]
    BV --> RP[("replicate")]
  end
  subgraph R["Read path — ~30,000 RPS"]
    direction TB
    SVC["can this user…?"] --> CH[("cache")]
    CH -->|rare miss| RE[("read replica")]
  end
  W ~~~ R
```
*Three orders of magnitude apart, so they get different designs. The version bump on the left is where the correctness risk lives: a cached allow for a role you just removed is a security bug, not a stale read.*

**2. Read vs write path split** — worth drawing when they differ, which for an
auth system they dramatically do. The **write path** (an admin changes a role)
is ~30 RPS: hit the primary, bump the tenant's cache version so stale keys
become unreachable, replicate. The **read path** (every product service asking
"can this user…?") is ~30,000 RPS: served from cache, falling through to a read
replica only on a rare miss.

Three orders of magnitude apart, so they get different designs. The version
bump on write is where the correctness risk lives — a cached *allow* for a role
you just removed is a security bug, not a stale read.

**3. Sharding** — how keys map to nodes, and what happens when you add one.

**4. Failure** — what happens when each component dies. Interviewers love this
and candidates rarely volunteer it.


## Reference stack

The concrete technology behind each block, worth naming instead of the
generic term when the interviewer asks "with what":

| Block | Name this |
| --- | --- |
| Load balancer | Nginx, an AWS ALB, or Envoy |
| API gateway | Kong, or a hand-rolled Express/NestJS layer for a smaller system |
| Cache | Redis (`ioredis` client) — see [caching-at-scale](28-caching-at-scale.md) |
| Primary DB | PostgreSQL for anything relational and consistent; MongoDB when the shape is document-first |
| Queue / log | SQS for simple work queues, Kafka (`kafkajs`) when replay and multiple consumer groups matter |
| CDN | CloudFront, Fastly |
| Object storage | S3 |

Naming a real product signals you've operated one of these, not just drawn
the box.

---

## Interview Q&A

### Q: How do you choose a database for a system?
**Level:** intermediate · **Tags:** databases, design

<details><summary>Model answer</summary>

From access patterns rather than data shape, which is the mistake people make.
The question isn't "what does this data look like" but "how will it be read and
written".

The things I'd establish: read/write ratio; whether queries are known ahead of
time or ad-hoc; whether there are relationships to traverse; what consistency
each operation needs; and the scale, since that decides whether one node is
viable.

Then the fit. Relational when there are relationships, transactions, and
queries you can't fully predict — and it's the right default, because it's
flexible and well understood. Document when data is naturally nested and
usually read as one unit. Key-value for sessions and caches. Wide-column for
very high write volumes with known query patterns. Graph when traversals are
the workload. Search when it's full text.

Two things I'd add. It's normal to use several — Postgres for entities, Redis
for sessions, Elasticsearch for search — and that's not indecision, it's
matching the tool to the pattern. And I'd default to Postgres unless there's a
specific reason not to: it does JSON, full text and geospatial adequately, and
"boring, well-understood, and one system to operate" is worth a lot.

</details>

**Follow-ups:**

1. Q: When would you actually need NoSQL rather than Postgres?
   <details><summary>Answer</summary>

   Fewer situations than people assume, and the honest version is that Postgres
   scales further than its reputation suggests.

   Genuine cases: write volume beyond what one primary can take, where you need
   horizontal write scaling and the data partitions cleanly — Cassandra-shaped
   workloads like metrics or event streams. A schema that genuinely varies per
   record. Very large scale with simple, known access patterns, where DynamoDB's
   operational model is worth the query limitations. Or a workload that's
   basically graph traversal.

   What isn't a reason: "we might need flexibility later", or read scale, which
   replicas and caching handle. Choosing a distributed database before you need
   one buys operational complexity and gives up joins, transactions and ad-hoc
   queries — usually a bad trade made early.

   I'd also note you can defer: Postgres with JSONB handles semi-structured data
   well, so you can keep flexibility without leaving relational.

   </details>

### Q: Where would you put a cache, and what breaks?
**Level:** senior · **Tags:** caching, architecture

<details><summary>Answer</summary>

Several layers, and each has a different invalidation problem, which is really
the question.

**CDN** for static and public cacheable content — the biggest win for media,
invalidated by versioned URLs rather than purging.

**In-process** in the application — fastest, no network. The cost is that every
instance has its own copy, so invalidation must reach all of them, and they're
the invisible layer that makes "immediate" revocation not immediate.

**Shared cache**, Redis or Memcached — one copy, survives restarts, one network
hop. The usual home for sessions and computed results.

**Database-level** — query cache, materialised views.

What breaks: **stampede** when a hot key expires and every request misses at
once; **hot keys** saturating one shard; **stale reads**, which for content is
cosmetic and for authorization is a security bug; and **invalidation
complexity**, which grows fast once you have several layers.

The design rule I'd state: cache the thing that's expensive to compute, at the
layer closest to where it's consumed, with an invalidation strategy decided
*before* you add the cache — not after. And for anything security-relevant, use
versioned keys so a change invalidates everything derived at once.

</details>

---

## Quiz

### MCQ: Why does the chapter recommend drawing only the subset of the standard architecture you actually need, rather than the full chain?
- [ ] The full chain is too complex to draw correctly
- [x] Opening with the whole chain leaves nowhere to go when the interviewer pushes for a deep dive — adding complexity under pressure is the stronger structure
- [ ] Interviewers only ask about one component anyway
- [ ] The full chain is only relevant for read-heavy systems
**Why:** Starting simple and adding pieces as bottlenecks are identified demonstrates the same forced-progression reasoning as the scaling ladder — starting complex wastes the deep-dive time you'll need later.

### MCQ: What's the trade-off between shallow and deep health checks?
- [ ] Shallow checks are always sufficient; deep checks are unnecessary
- [x] Shallow checks miss grey failure (a node that's up but malfunctioning); deep checks that exercise real dependencies can cascade, draining every instance when one shared dependency wobbles
- [ ] Deep checks are faster to execute
- [ ] Shallow checks require more infrastructure to implement
**Why:** Neither extreme is safe alone — the usual answer splits liveness (shallow) from readiness (deep), with hysteresis to avoid overreacting to a blip.

### MCQ: Why can't an API gateway alone provide fine-grained authorization?
- [ ] Gateways don't support authentication at all
- [x] Only the owning service knows ownership, tenancy, and state — the gateway can only do coarse checks like valid token and correct audience
- [ ] Gateways are too slow for authorization checks
- [ ] Fine-grained authorization requires a database the gateway can't access
**Why:** Treating the gateway as the *only* authorization check makes the internal network an implicit trust zone — defense in depth means the owning service still enforces its own rules.

### MCQ: What should primarily drive the choice of database type for a given piece of data?
- [ ] The data's shape (how nested or flat it is)
- [x] Access patterns — how the data will actually be read and written
- [ ] Whichever database the team has used before
- [ ] The total data volume alone
**Why:** "How is this read?" decides more than "what does it look like?" — two datasets with identical shape can need very different databases depending on their query patterns.

### MCQ: Is using multiple different databases within one system (Postgres for entities, Redis for sessions, Elasticsearch for search) a sign of poor decision-making?
- [ ] Yes, a well-designed system should use exactly one database
- [x] No — it's normal and reflects matching the tool to the specific access pattern, not indecision
- [ ] Only acceptable in microservices architectures
- [ ] Only acceptable if each database is managed by a different team
**Why:** Different data has different access patterns; using the datastore that fits each one is a sign of deliberate design, not a failure to commit to a single technology.

### MCQ: In an auth system, why might the write path (role changes) and read path (permission checks) deserve genuinely different designs?
- [ ] They should always use identical infrastructure for consistency
- [x] They can differ by orders of magnitude in volume (e.g. ~30 RPS writes vs ~30,000 RPS reads), which changes what's worth optimizing for on each side
- [ ] Write paths are always more important to optimize
- [ ] Read paths never need any caching
**Why:** At three orders of magnitude apart, the write path can afford to bump a cache version synchronously while the read path needs to be served almost entirely from cache — a single unified design would be wrong for one side or the other.

### MCQ: In an authorization system, why is a cached "allow" for a role that was just removed treated as a security bug rather than an ordinary stale read?
- [ ] Because caches should never be used for authorization data
- [x] Because the user retains access they should no longer have — unlike stale content, this has a real security consequence, not just a freshness inconvenience
- [ ] Because it always causes a system crash
- [ ] Because it violates HTTP caching standards
**Why:** This is why write-path role changes bump a versioned cache key rather than relying on TTL alone — the correctness risk on this specific path is qualitatively different from ordinary staleness.

### MCQ: Why does each layer of caching (CDN, in-process, shared cache, database-level) have a "different invalidation problem"?
- [ ] They all use the exact same invalidation mechanism, so this isn't actually true
- [x] Each layer has different scope and visibility — e.g. in-process caches are per-instance and invisible to other instances, while a shared Redis cache is one copy that all instances see
- [ ] Only the database-level cache needs invalidation
- [ ] CDN caches never need invalidation
**Why:** An in-process cache requires reaching every instance to invalidate, which is easy to forget or delay; a shared cache is one target — understanding which layer you're at changes what "immediate" invalidation actually requires.

### MCQ: According to the design rule stated in this chapter, when should a cache's invalidation strategy be decided?
- [ ] After the cache is added, once invalidation bugs start appearing
- [x] Before the cache is added — invalidation strategy should be part of the initial design, not a reactive fix
- [ ] Invalidation strategy is optional if the TTL is short enough
- [ ] Only for caches storing authorization data
**Why:** Treating invalidation as an afterthought is how stampedes and stale-data bugs get discovered in production — deciding it upfront is part of deliberately placing the cache, not a follow-on task.

### MCQ: Why does naming a specific product (e.g. "Kafka" or "an AWS ALB") signal more than naming the generic block ("load balancer" or "queue")?
- [ ] Specific product names are required by interview scoring rubrics
- [x] It signals that you've actually operated the technology, not just drawn a generic box on a diagram
- [ ] Generic terms are considered incorrect answers
- [ ] Product names are always more technically precise
**Why:** A candidate who names "an AWS ALB" and can speak to its specific behavior demonstrates real operational familiarity beyond knowing the category of tool that belongs in that slot.

---

## Glossary

- **L4 / L7 load balancing** — transport-level / application-level routing.
- **API gateway** — cross-cutting authn, rate limiting and routing.
- **Read replica** — a copy serving reads; lags the primary.
- **Object storage** — blob storage with lifecycle tiering.
- **CDN** — edge caching; the hit rate drives origin load and cost.
- **Materialised view** — a precomputed query result, refreshed on a schedule.
- **Sidecar** — a helper process alongside a service; keeps calls on localhost.
- **Blast radius** — how much breaks when one thing fails.
