# Multi-region and geo-distribution

One region is a single point of failure and a latency floor for everyone far
from it. Going multi-region fixes both and introduces the hardest problem in
this part of the book: two places accepting writes for the same data.

Most systems should not be multi-region. The value of this chapter is being
able to say *why* for a given system, and then design it properly when the
answer is yes.

---

## In brief

- **Three different reasons produce three different designs**, and conflating
  them is the most common mistake: surviving a region loss, serving users with
  lower latency, and keeping data inside a jurisdiction. Ask which one is
  driving the requirement before drawing anything.
- **Cross-region round trips are 60–150ms** and no amount of engineering
  removes them. A synchronous cross-region write is that expensive *before*
  any work happens, which is why most "active-active" designs are actually
  partitioned by region.
- **Active-passive is a decision, not a mechanism.** Replication is
  asynchronous, so failover means choosing to lose the lag — your RPO — and
  choosing when, because failing over automatically on a network blip gives you
  split brain.
- **Active-active means accepting write conflicts.** There are only three
  honest answers: give every key one home region, accept last-write-wins and
  the data loss that comes with it, or put the few things that truly need
  agreement behind consensus and pay the round trips.
- **Geo-partitioning is the answer to residency**, not replication: the
  tenant's region becomes part of the key, data never leaves, and the cost is
  that cross-region queries stop being possible.
- **Read-local, write-home** is the pragmatic default — cheap reads everywhere,
  one authority per key — and it reintroduces read-your-own-writes, which needs
  an explicit answer.
- **The hard part is never the compute.** Stateless services are trivial to run
  in five regions; the data is the entire problem.

---

## Start with why

| Driver | What it actually requires | What it does *not* require |
| --- | --- | --- |
| **Survive losing a region** | A second region with current-enough data and a tested failover procedure | Serving traffic from both regions at once |
| **Lower latency for distant users** | Reads served locally; writes can still go home | Multi-master writes |
| **Data residency / regulation** | Data for a jurisdiction physically stays there | Global replication — in fact it forbids it |
| **Scale beyond one region's capacity** | Genuine sharding by region | (Rarely the real reason; one region is very large) |

Each of these is satisfiable without the others. "We want multi-region" that
turns out to mean "the EU customers complain about latency" is solved by a CDN
and regional read replicas, not by multi-master writes.

**The honest default:** multiple availability zones within one region. Zones are
separate failure domains with sub-millisecond links between them, so you get
machine, rack and datacentre failure tolerance and synchronous replication
without the distance. A very large number of systems need exactly this and
nothing more.

---

## The latency budget

| Hop | Typical RTT | What it rules out |
| --- | --- | --- |
| Same availability zone | 0.2–0.5ms | Nothing |
| Across zones, one region | ~1–2ms | Nothing; synchronous replication is fine here |
| US east ↔ US west | ~60–70ms | A synchronous write on the request path |
| US ↔ Europe | ~80–90ms | Two sequential cross-region calls in one request |
| US ↔ Asia-Pacific | ~120–180ms | Almost any synchronous cross-region dependency |

Hold one number: a single synchronous cross-continent round trip is most of a
typical API latency budget. A design that crosses the ocean twice per request
has already failed, whatever else it does well.

---

## Active-passive

One region takes all writes. The other has a replica, kept current by
asynchronous replication (the WAL stream from
[storage engines](45-storage-engines-and-transactions.md)), and serves nothing —
or serves reads that tolerate lag.

**The two numbers that define it:**

- **RPO (recovery point objective)** — how much data you accept losing. With
  asynchronous replication it equals the replication lag at the moment of
  failure, usually seconds.
- **RTO (recovery time objective)** — how long recovery takes: detecting the
  failure, deciding, promoting the replica, repointing traffic, and warming
  caches and connection pools in a region that has been idle.

**Failover is a decision, and should usually be a human one.** Automatic
failover on a health check means a network partition between your monitoring
and the primary promotes the replica while the primary is still happily taking
writes — **split brain**, and two divergent copies that must be reconciled by
hand afterwards. The protections are a quorum of observers rather than one,
fencing (the old primary is actively demoted or cut off before the new one is
promoted), and in most organisations a human pressing the button.

**Repointing traffic** is where DNS disappoints: resolvers cache for the TTL,
so a DNS-based failover is minutes, not seconds (see
[networking](44-networking.md) §DNS). A global load balancer with health checks
is the mechanism that moves traffic quickly; DNS is the mechanism for the
planned, coarse move.

**The passive region must be exercised.** A standby that has never served
production traffic is a hypothesis, not a plan: capacity that was never scaled,
a security group nobody updated, a certificate that expired, a deploy pipeline
that only ever targeted one region. Run real traffic there periodically, or
accept that the failover will be the first test.

---

## Active-active, and the write-conflict problem

```mermaid
sequenceDiagram
    participant U1 as User (EU)
    participant EU as EU region
    participant US as US region
    participant U2 as User (US)
    U1->>EU: set display_name = "Ada"
    U2->>US: set display_name = "Grace"
    EU-->>US: replicate "Ada"
    US-->>EU: replicate "Grace"
    Note over EU,US: both accepted; the two regions now disagree
```
*Nothing here is a bug — both writes were accepted and acknowledged. Any design where two regions accept writes for the same key must say, in advance, which one survives.*

Both regions take writes. Replication between them is asynchronous, because
synchronous replication over that distance would put the round trip on every
request. So two users can write the same record at the same time, in different
places, and both are told it succeeded.

There are exactly three honest resolutions.

### 1. Partition by region — give every key one home

The best answer when it fits. A record belongs to a region (usually the
tenant's or the user's home), and **writes for that record always go to that
region**, wherever the request arrives. Other regions hold a read-only copy.

Conflicts cannot happen because two regions never accept writes for the same
key. The costs: a user who moves needs a migration path, and a request arriving
in the wrong region pays a cross-region hop for writes — which is acceptable
precisely because writes are the rarer path.

This is what most production "active-active" systems actually are, and saying
so is a senior answer.

### 2. Last-write-wins — accept the loss

Both regions write; the later timestamp wins. Simple, and it quietly discards
data: Grace's update above disappears with no error to anyone. It also depends
on clocks agreeing, and clocks across regions do not agree perfectly, so "later"
is approximate.

Acceptable for a user's theme preference. Not acceptable for a balance, an
inventory count, or anything where the lost write was a decision.

### 3. Consensus for the few things that need it

Put the small set of data that genuinely cannot diverge — uniqueness
constraints, counters that must be exact, leases — behind a consensus system
(see [consensus and coordination](25-consensus-coordination.md)), and accept
that those operations pay a cross-region round trip. Spanner-class databases do
this for you with synchronised clocks and a majority quorum per write.

The design skill is keeping that set small. A system where 1% of operations
need consensus and 99% do not is workable; one where everything does is a
single-region system with extra latency.

**What about merging?** Some data types can merge without a winner — a set of
tags, a counter that only increments, collaborative text. Those are CRDTs, and
where the data fits one, the conflict disappears. This book does not cover them
in depth; know the name and that they are a real option for a narrow class of
data.

---

## Geo-partitioning for residency

Regulation ("EU personal data stays in the EU") is not a replication problem —
it is a *partitioning* problem, and replicating globally is precisely what you
must not do.

The shape:

- **Region is part of the identity.** A tenant is created in a region, and that
  is a property of the tenant, not a routing hint. Keys look like
  `eu/tenant-42/...`.
- **The edge routes by tenant**, so a request for an EU tenant arriving in the
  US is proxied to the EU rather than served locally from a copy that should
  not exist.
- **A global, non-personal layer** holds only what may cross borders: the
  tenant directory that maps tenant → region, feature flags, billing plans.
  Keeping this layer small and boring is the whole trick.
- **Cross-region queries stop existing.** "How many active users across all
  regions" becomes an aggregate computed per region and summed, with no
  row-level data leaving. Say this out loud in a design round — it is the cost
  people forget.

---

## Read-local, write-home

The pragmatic middle, and the right default for most systems that need any
geographic spread:

- **Reads** are served from the nearest region's replica. Fast everywhere.
- **Writes** go to the key's home region. Slower, and rarer.

It buys most of the latency win with none of the conflict problem. What it
reintroduces is **read-your-own-writes**: a user in Sydney writes to the US
home region, then immediately reads from the Sydney replica, which has not
received the change yet, and sees their edit vanish.

The standard fixes, in increasing cost:

1. **Read from the home region for a short window after a write** — simple,
   and the window can be per user rather than global.
2. **Carry a version from the write** and require the read to be at least that
   fresh, falling back to the home region if the local replica is behind. This
   is the same mechanism as the versioned cache key in
   [caching at scale](28-caching-at-scale.md) and the zookie in
   [the identity subsystem](../10-design-cases/06-design-identity-subsystem.md).
3. **Pin the session to the home region** entirely — simplest to reason about,
   and gives up the local-read benefit for that user.

---

## What else has to be multi-region

The database gets all the attention; these are what actually break during a
real failover:

- **Object storage** — cross-region replication is a setting, and it is
  asynchronous, so a just-uploaded file may not exist in the failover region.
- **Caches** — a cold cache in the failover region means the database takes
  full load exactly when it is least able to.
- **Queues and streams** — a regional queue holds messages that the other
  region cannot see. Either the queue is regional and drains to a regional
  consumer, or it is global and pays the latency.
- **Scheduled jobs** — must run in exactly one region, or every nightly job
  runs twice. A lease in a consensus store is the usual answer.
- **Secrets, config and certificates** — replicated, and rotated in both.
- **The deploy pipeline** — if it only knows one region, the failover region
  drifts until it is a different system.

---

## Building it

**Decide in this order**

1. Which driver? (Survival, latency, residency.) Write it down — it determines
   everything below.
2. Can multi-AZ in one region satisfy it? If yes, stop here.
3. What is the RPO and RTO the business actually wants, in numbers?
4. Which data is global, which is regional, and which is personal and must not
   move?
5. For anything regional: what is the home region of a key, and how does a
   request find it?
6. What is the conflict policy for anything that can be written in two places —
   and if the answer is "that cannot happen", what enforces it?

**A tenant directory, which is the piece every design needs**

```ts
// The one global table: tenant -> home region. Small, read constantly, written
// almost never — so it is cached everywhere and replicated globally, and it
// holds no personal data, which is what makes global replication legal.
type TenantRouting = { tenantId: string; homeRegion: 'eu-west-1' | 'us-east-1'; residency: 'eu' | 'global' };

// Edge middleware: route the request, don't serve it locally from data that
// should not be here. A read may be served by the local replica; a write is
// always proxied home, which is what makes "no conflicts" true rather than
// hopeful.
async function route(req: Request): Promise<Response> {
  const t = await routingCache.get(req.tenantId);        // ~0ms, cached
  const isWrite = req.method !== 'GET';

  if (t.residency === 'eu' && CURRENT_REGION !== t.homeRegion) {
    return proxyTo(t.homeRegion, req);                   // residency: never serve locally
  }
  if (isWrite && CURRENT_REGION !== t.homeRegion) {
    return proxyTo(t.homeRegion, req);                   // one home per key = no conflicts
  }
  return handleLocally(req);                             // local read: the latency win
}
```

**Read-your-own-writes, the cheap version**

```ts
// After a write, pin this user's reads to the home region briefly. The pin is
// per user and short, so the cost is paid only by someone who just wrote —
// not by every reader everywhere.
await writeHome(change);
await pinSession(userId, { region: homeRegion, untilMs: Date.now() + 10_000 });
```

**What to verify, on a schedule rather than during an incident**

- A game-day failover with real traffic, timed against the stated RTO.
- Replication lag alerting, with a threshold tied to the RPO you promised.
- The failover region serving a share of production traffic routinely, so its
  capacity, certificates and deploys are real rather than assumed.

---

## Interview Q&A

### Q: A product owner asks for "multi-region". What do you ask before designing anything?
**Level:** senior · **Tags:** multi-region, requirements, design

<details><summary>Model answer</summary>

Which problem it is solving, because three different problems hide behind that
phrase and they produce different designs.

If it is surviving the loss of a region, I need an RPO and an RTO in numbers,
and the answer is a warm standby with asynchronous replication and a tested,
probably human-triggered failover. Nobody has to serve traffic from two places
at once.

If it is latency for distant users, the answer is usually a CDN for the static
and cacheable paths plus regional read replicas, with writes still going to one
home region. That is most of the benefit for a fraction of the complexity.

If it is data residency, it is not a replication problem at all but a
partitioning one — the data for a jurisdiction must stay in it, so the design is
region-as-part-of-the-key with a small global layer holding only non-personal
routing data.

And I would check whether multiple availability zones in one region already
satisfies it, because zones are separate failure domains a millisecond apart,
which gives you synchronous replication and datacentre-failure tolerance
without any of the distance problems. A lot of "multi-region" requirements are
met there.

</details>

**Follow-ups:**

1. Q: They say it is all three. Where do you start?
   <details><summary>Answer</summary>

   Residency first, because it constrains the others: it decides what data may
   exist where, and a replication design that violates it has to be thrown
   away. So partition by region first, then within each region use multi-AZ for
   survival, then add read replicas where the latency complaints are — which by
   then is a smaller problem, because residency already put EU users' data in
   the EU.

   </details>

### Q: Why is automatic failover to a standby region dangerous, and what makes it safe?
**Level:** senior · **Tags:** multi-region, failover, split-brain

<details><summary>Model answer</summary>

Because the signal that the primary is gone and the signal that you cannot
reach the primary are the same signal. A partition between your health checks
and the primary looks exactly like a dead primary, so an automatic system
promotes the standby while the primary is still alive and still accepting
writes. Now two regions take writes for the same data, diverge, and someone has
to reconcile them by hand — which, for anything financial, may not be possible.

What makes it safer: a quorum of observers in different places rather than one
checker, so a single network path cannot trigger it. Fencing, so promotion
includes actively demoting or cutting off the old primary — revoking its
credentials, taking it out of the load balancer — rather than assuming it is
gone. A threshold that requires sustained failure, not one missed check. And
for most organisations, a human in the loop, because the cost of a minute of
downtime is almost always lower than the cost of divergence.

The other half is the thing people forget: RTO is not just promotion. It is
detection, decision, promotion, repointing traffic — which is slow if it is
DNS-based, because of TTL caching — and then a cold region with empty caches
and unwarmed pools taking full production load.

</details>

### Q: Two regions accept writes for the same record. What are your options?
**Level:** senior · **Tags:** multi-region, conflicts, consistency

<details><summary>Model answer</summary>

Three, and I would say which I was choosing and what it costs.

Give every key one home region, and route writes there no matter where the
request lands. Conflicts become impossible rather than resolved, reads stay
local and fast, and the price is a cross-region hop on writes plus a migration
path when a user moves. This is what most systems calling themselves
active-active actually do, and it is usually the right answer.

Accept last-write-wins. Both regions write, the later timestamp survives, and
the other write is silently discarded — with no error to the user whose change
vanished. It also leans on clocks agreeing across regions, which they only
approximately do. Fine for a display preference, never for a balance or an
inventory count.

Put the things that genuinely cannot diverge behind consensus, and pay the
cross-region round trip for them. Uniqueness, exact counters, leases. The skill
is keeping that set tiny, because if everything needs consensus you have built
a single-region system with added latency.

There is a fourth case worth naming when it fits: data that merges without a
winner — a grow-only set, an increment-only counter, collaborative text. CRDTs
make the conflict disappear for that narrow class.

</details>

**Follow-ups:**

1. Q: With "one home region per key", a user in Sydney writes to a US home and immediately reads locally. What do they see?
   <details><summary>Answer</summary>

   Potentially the old value, because the local replica has not received the
   change yet — read-your-own-writes broken, and it looks to the user like the
   save failed.

   The cheap fix is to pin that user's reads to the home region for a few
   seconds after a write; the cost is paid only by someone who just wrote. The
   more precise fix is to return a version from the write, store it with the
   session, and require reads to be at least that fresh — falling back to the
   home region when the local replica is behind. Same mechanism as a versioned
   cache key.

   </details>

### Q: How do you design for "EU customer data must stay in the EU"?
**Level:** senior · **Tags:** multi-region, residency, partitioning

<details><summary>Model answer</summary>

By partitioning rather than replicating, and by making region a property of the
tenant rather than a routing hint.

A tenant is created in a region and that is part of its identity, so keys carry
it. The edge looks up tenant → region in a small global directory and proxies
the request to the home region if it arrived elsewhere — it does not serve it
locally, because serving it locally means the data is there, which is the thing
being prohibited.

The global layer holds only what may legally cross borders: the tenant
directory, feature flags, billing plans. Keeping that layer small and free of
personal data is the whole design.

The cost I would name unprompted is that cross-region queries stop existing.
Any global number becomes a per-region aggregate, computed in-region and summed
centrally, with no row-level data leaving. Analytics, support tooling and admin
dashboards all have to be rebuilt around that, and they are usually the things
that quietly violate residency later.

Backups, logs and the data warehouse count too — a compliant primary database
with logs shipped to a US bucket is not compliant.

</details>

---

## What a weak answer sounds like

- **"We'd go active-active"** with no answer for what happens when two regions
  write the same record.
- **Not asking which problem** multi-region is solving — survival, latency or
  residency.
- **Proposing synchronous cross-region writes** without naming the 60–150ms
  they put on every request.
- **Treating failover as automatic and instant**, with no mention of split
  brain, fencing, or DNS TTLs.
- **Only moving the database.** Forgetting object storage, caches, queues,
  scheduled jobs and the deploy pipeline.
- **A standby that has never taken traffic**, described as a plan.
- **Solving residency with replication**, which is the one thing it forbids.

---

## Quiz

### MCQ: What is the RPO of an active-passive setup with asynchronous replication?
- [ ] Zero — the replica is a copy of the primary
- [x] The replication lag at the moment of failure, typically seconds; failing over means deciding to lose it
- [ ] The time it takes to promote the replica
- [ ] Equal to the backup interval
**Why:** RPO is how much data you lose, and asynchronous replication means the replica is always slightly behind. RTO — detection, decision, promotion, repointing traffic and warming a cold region — is the separate number.

### MCQ: Why is automatically promoting a standby when health checks fail dangerous?
- [ ] Promotion is slow and users notice
- [x] A network partition looks identical to a dead primary, so the standby is promoted while the primary still accepts writes — split brain, and two divergent copies to reconcile by hand
- [ ] The standby always has stale schemas
- [ ] It invalidates the TLS certificates
**Why:** The protections are a quorum of observers rather than one checker, fencing so promotion actively demotes the old primary, and — for most organisations — a human in the loop, because downtime is usually cheaper than divergence.

### MCQ: A design claims to be active-active with no write conflicts. What is it almost certainly doing?
- [ ] Using synchronous replication between regions
- [x] Partitioning by key: every record has one home region and writes are routed there, so two regions never accept a write for the same key
- [ ] Resolving conflicts with vector clocks
- [ ] Writing only to a cache in the second region
**Why:** Conflicts are made impossible rather than resolved. Reads stay local and fast; the cost is a cross-region hop on writes and a migration path when a key's home changes.

### MCQ: What does last-write-wins actually cost?
- [ ] Extra latency on every write
- [x] Silent data loss — the losing write is discarded with no error to the user who made it, and "later" depends on clocks that do not perfectly agree across regions
- [ ] A consensus round trip per write
- [ ] It prevents reads from being served locally
**Why:** That makes it fine for a display preference and wrong for a balance, an inventory count, or anything where the lost write represented a decision someone made.

### MCQ: "EU personal data must stay in the EU." Which design satisfies it?
- [ ] Replicate everything to both regions and serve users from the nearest
- [x] Partition by region: the tenant's region is part of its identity, requests are routed to the home region rather than served locally, and the global layer holds only non-personal routing data
- [ ] Encrypt the data at rest in the US region
- [ ] Use last-write-wins between the regions
**Why:** Residency forbids the replication the other options assume. The cost worth naming is that cross-region row-level queries stop existing — global numbers become per-region aggregates summed centrally.

### MCQ: Roughly how much of a 200ms API budget does one synchronous US↔Europe round trip consume?
- [ ] About 5ms
- [x] 80–90ms — most of the budget, before any work happens, which is why cross-region synchronous calls on the request path are a design decision rather than a tuning problem
- [ ] It depends only on the bandwidth between regions
- [ ] Nothing, if the connection is already open
**Why:** Distance sets a floor that connection reuse and bandwidth cannot remove. A request that crosses the ocean twice has spent its budget on physics.

### MCQ: Which of these most often breaks during a real regional failover?
- [ ] The application code, which is region-specific
- [x] Everything that is not the database — cold caches hitting the database at full load, regional queues holding invisible messages, scheduled jobs running twice, and a deploy pipeline that only ever targeted one region
- [ ] TLS, because certificates are region-bound
- [ ] The load balancer's routing algorithm
**Why:** Stateless compute is the easy part. The failure modes cluster in the stateful and operational surroundings, which is why a standby that has never served real traffic is a hypothesis rather than a plan.

---

## Glossary

- **Region / availability zone** — a geographic location, and an isolated failure domain within it; zones are ~1ms apart, regions 60–150ms.
- **RPO** — recovery point objective: how much data you accept losing, equal to replication lag under async replication.
- **RTO** — recovery time objective: how long until service is restored, including detection, decision, promotion and warm-up.
- **Active-passive** — one region takes writes, another stands by with a replica.
- **Active-active** — both regions take writes, which requires a conflict policy.
- **Split brain** — two nodes or regions both believing they are primary, accepting divergent writes.
- **Fencing** — actively demoting or cutting off the old primary as part of promotion, so it cannot keep writing.
- **Home region** — the one region allowed to accept writes for a given key; what makes "no conflicts" a fact rather than a hope.
- **Last-write-wins** — resolving a conflict by timestamp, discarding the loser silently.
- **CRDT** — a data type that merges concurrent updates without a winner; works for a narrow class of data.
- **Geo-partitioning** — making region part of the key so data for a jurisdiction never leaves it.
- **Read-local, write-home** — serve reads from the nearest replica, send writes to the key's home region.
- **Read-your-own-writes** — the guarantee that a user sees their own change immediately; the thing read-local breaks.
- **Tenant directory** — the small global map of tenant → home region; the one table that must be everywhere.
