# Caching at scale

The theory under your 13s→200ms story. This is the chapter most likely to be
probed hard, because your resume claims a Redis caching redesign and every
follow-up lives here.

---

## In brief

- **Caching is a trade of freshness for speed — every failure mode in this
  chapter follows from that one trade.** Cache-aside is the default
  pattern: on write, **invalidate, don't update** — updating the cache
  creates a race where two concurrent writers can leave it holding the
  older value permanently; deleting is safe because the next read
  repopulates from the source of truth.
- **Cache stampede (thundering herd)**: a hot key expires, every concurrent
  request misses at once, and the origin — sized for cache-hit load — takes
  the full uncached load simultaneously. The three mitigations to know:
  request coalescing (first miss fetches, others wait on it), probabilistic
  early expiry (refresh before the TTL, with jitter), and
  stale-while-revalidate (serve old, refresh behind it — must be bounded
  for authorization data, since stale there means a revoked permission
  still works).
- **Hot keys are a distribution problem, not an expiry problem** — one key
  saturates a single shard while the rest idle, and no TTL strategy
  helps. Fixes are about spreading load (replicate the key with a suffix,
  an in-process cache for just that key) or isolating a hot tenant.
- **For authorization data, a cached "allow" for a revoked permission is a
  vulnerability, not a stale read.** TTL-only invalidation means you've
  *decided* revocation takes up to N seconds; versioned keys (bump a
  per-user/tenant counter, include it in the cache key) are usually the
  right answer because there's nothing to enumerate and nothing to miss.
- **Cache the decision, not the inputs** — keyed on
  `(principal, tenant, permission, resource, version)`. Re-evaluating from
  cached inputs still pays the evaluation cost, which for a policy engine
  is most of the cost you were trying to avoid.
- **In-process caches are the invisible layer that makes "immediate" not
  immediate** — fastest because there's no network hop, but every instance
  has its own copy, so invalidation must reach all of them and doesn't
  clear on deploy boundaries the way people assume.

---

## Foundations

Caching is a trade: you get speed, and you give up freshness. Every problem in
this chapter comes from that one trade.

### Where caches live

```
browser → CDN → API gateway → application (in-process) → Redis → database
   │        │                        │                      │
 private  shared,                local, fastest,       shared, survives
          edge                  N copies to invalidate  restarts, one hop
```

**In-process caches are the invisible ones.** They're the fastest — no network
— but every instance has its own copy, so invalidation must reach all of them,
and they don't clear on deploy boundaries in the way people assume. When
someone says "revocation takes 30 seconds", per-instance caches are usually the
reason it's actually longer.

### Cache strategies

| Pattern | Reads | Writes | Note |
| --- | --- | --- | --- |
| **Cache-aside** | App checks cache, misses → DB → populate | App writes DB, invalidates cache | Most common; app owns the logic |
| **Read-through** | Cache fetches on miss | — | Cache library owns it |
| **Write-through** | — | Write cache and DB together | Consistent, slower writes |
| **Write-behind** | — | Write cache, flush to DB async | Fast, **can lose data** |

**Cache-aside is the default.** Note the write path: **invalidate, don't
update**. Updating the cache on write creates a race — two concurrent writers
can leave the cache holding the older value permanently. Deleting is safe; the
next read repopulates.

---

## The failure modes

### Cache stampede (thundering herd)

```mermaid
flowchart TD
  E["A hot key expires"] --> M["Every concurrent request misses at once"]
  M --> O["Origin takes the full uncached load"]
  O --> F1["<b>Coalescing</b><br/>first miss fetches,<br/>the rest wait on it"]
  O --> F2["<b>Early expiry</b><br/>refresh before the TTL,<br/>with jitter"]
  O --> F3["<b>Stale-while-revalidate</b><br/>serve the old value,<br/>refresh behind it"]
```
*Knowing all three is the senior answer — and knowing that the third one must be bounded for authorization data, because stale there means a revoked permission still works.*

A hot key expires. Every concurrent request misses simultaneously and hits the
origin at once — which was never sized for uncached load.

Three mitigations, and knowing all three is the senior answer:

1. **Request coalescing / single-flight** — the first miss fetches; concurrent
   misses for the same key wait on that one result. Directly caps origin load
   at one request per key.
2. **Probabilistic early expiry** — refresh slightly *before* the TTL, with
   jitter, so the refresh happens while the old value is still servable and
   keys don't expire in lockstep.
3. **Stale-while-revalidate** — serve the expired value and refresh in the
   background. Excellent for availability; **must be bounded for authorization
   data**, because serving stale means serving a possibly-revoked permission.

**TTL jitter matters generally.** If a thousand keys are populated in the same
second with the same TTL, they expire in the same second. Randomise TTLs by
±10% and the load spreads.

### Hot keys

One key taking disproportionate traffic saturates a single Redis shard while
the rest idle. No TTL strategy helps — the problem is distribution, not expiry.

Fixes: replicate the hot key across shards with a suffix and read a random one;
put a small in-process cache in front of just that key; or, if it's a hot
*tenant*, treat it as the sharding problem it is (see
[replication partitioning](24-replication-partitioning.md)).

### Cache penetration and avalanche

**Penetration** — requests for keys that don't exist bypass the cache every
time and always hit the DB. If attacker-controlled, it's a denial of service.
Fix: cache the negative result with a short TTL, or use a Bloom filter to
reject known-absent keys cheaply.

**Avalanche** — many keys expire at once, or the cache tier restarts empty and
the origin takes full production load cold. Fix: TTL jitter, and warm the cache
before taking traffic.

---

## Invalidation — the hard part

> There are only two hard things in computer science: cache invalidation and
> naming things.

For authorization data this stops being a correctness nicety and becomes a
security requirement: **a cached "allow" for a revoked permission is a
vulnerability, not a stale read.**

| Strategy | Speed | Risk |
| --- | --- | --- |
| **TTL only** | Bounded by TTL | You've *decided* revocation takes up to N seconds |
| **Explicit invalidation** | Immediate | Must know every affected key — inheritance makes fan-out easy to get wrong; a missed key is a silent hole |
| **Versioned keys** | Immediate | Include a per-user/tenant version in the key; bump it and every derived entry becomes unreachable at once |
| **Cache bypass** | Always fresh | Costs latency; reserve for the most sensitive operations |

**Versioned keys are usually the right answer** and the one worth reaching for
without being asked. There's nothing to enumerate and nothing to miss — old entries
simply become unreachable and expire naturally.

### The three mitigations, written out

**Single-flight** — one fetch serves every concurrent miss:

```js
const inflight = new Map();

async function getOrLoad(key, load) {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);

  if (inflight.has(key)) return inflight.get(key);   // wait on the one in progress

  const p = load()
    .then(async (val) => {
      await redis.set(key, JSON.stringify(val), 'EX', 60 + Math.floor(Math.random() * 12));
      return val;                                    // ↑ jittered TTL
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}
```

Note the **jittered TTL**. A thousand keys written in the same second with an
identical TTL expire in the same second.

**Probabilistic early refresh** — refresh *before* expiry, so it happens while
the old value is still servable:

```js
// XFetch: the closer to expiry and the slower the recompute, the likelier
const shouldRefreshEarly = (ttlLeftMs, computeCostMs, beta = 1.0) =>
  ttlLeftMs - computeCostMs * beta * -Math.log(Math.random()) <= 0;
```

**Versioned keys** — the invalidation strategy that can't miss anything:

```js
const cacheKey = async (tenant, user, perm, resource) => {
  const v = await redis.get(`ver:user:${user}`) ?? '0';
  return `authz:v${v}:${tenant}:${user}:${perm}:${resource}`;
};

// A role change makes every previously-derived key unreachable, atomically.
await redis.incr(`ver:user:${user}`);
```

Nothing to enumerate, nothing to forget. Old entries become unreachable at once
and expire on their own — which is why this is the right answer when a stale
`allow` is a security bug rather than a stale read.

### What to cache

Cache the **decision**, not the inputs. Don't cache the policy document and
re-evaluate per request — cache the boolean outcome keyed on
`(principal, tenant, permission, resource, version)`. Re-evaluating from cached
inputs pays the evaluation cost every time, which for policy engines is most of
the cost.

> **In your own work.** This is [contentstack](../00-experience/contentstack.md)
> §5 in full. The likely questions: what was the original key design, what's
> your hit rate, what happens on a miss storm, and how does a role change
> invalidate. Have the invalidation answer ready — it's the one that separates
> "I added a cache" from "I own a cache".


## Building it

**Libraries**

| Need | Library | Why |
| --- | --- | --- |
| Redis client | `ioredis` | Cluster support, pipelining, and `defineCommand` for the Lua scripts this chapter's mitigations need |
| Request coalescing | `p-memoize` (in-process) or a Redis `SET NX` as a "fetching" lock (cross-instance) | In-process only coalesces within one server; cross-instance coalescing needs the lock in the shared cache |

**Pseudocode — single-flight, cross-instance**

```ts
async function getWithCoalescing(key: string, fetcher: () => Promise<unknown>) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const gotLock = await redis.set(`lock:${key}`, '1', 'NX', 'PX', 2000);
  if (!gotLock) {                              // someone else is already fetching
    await sleep(50);
    return getWithCoalescing(key, fetcher);    // wait, then re-check the cache
  }
  const value = await fetcher();
  await redis.set(key, JSON.stringify(value), 'PX', ttlWithJitter());
  return value;
}
```

The `NX` lock is what caps origin load to one request per key during a
stampede — everyone else waits on the cache, not on the origin.

---

## At Google scale

The *Site Reliability Engineering* book (2016) discusses caching mainly as a
**risk**, which is the senior framing for this chapter. Chapter 22
(*Addressing Cascading Failures*) gives the classic scenario: a cache layer
absorbs most traffic; it fails or is restarted cold; the full load lands on a
backend sized for the cache-hit case; the backend collapses; retries make it
worse. The remedies the book names are exactly this chapter's — treat the
cache as capacity you cannot lose without planning for it, warm caches
before taking traffic, and shed load early rather than let queues grow.

On the consistency side, Zanzibar (*Zanzibar: Google's Consistent, Global
Authorization System*, USENIX ATC 2019) is the system to cite because it is
a permission cache at planetary scale that still respects causality. It
serves millions of authorization checks per second at p95 under 10 ms by
caching aggressively, and it prevents stale reads from letting a
just-removed user see content by evaluating each check at a snapshot no older
than a client-supplied token (a "zookie"). That is the direct answer to the
cache-versus-policy-store question that follows.

**The design-round question this chapter answers:** *"You cache permission
decisions. The admin revokes access. What does the user see in the next
second, and is that acceptable?"* Say the TTL, say the invalidation path,
say which is the bound on staleness, and say whether a revoke must be
immediate (then the check must go to the source, or the source must publish
invalidations) or may lag by the TTL. Then name the stampede protection when
the invalidation empties a hot key.

> **FILL IN:** the actual TTL and invalidation mechanism in the Redis
> redesign behind the 13s to 200ms claim, so the answer above is your story,
> not a generic one.

## Interview Q&A

### Q: Walk me through cache-aside, and where it goes wrong.
**Level:** intermediate · **Tags:** caching, patterns

<details><summary>Model answer</summary>

On read: check the cache; on a hit, return it; on a miss, read the database,
populate the cache, return. On write: write the database, then **invalidate**
the cache entry.

The important detail is that the write path deletes rather than updates.
Updating creates a race: two concurrent writers can interleave such that the
cache ends up holding the older value permanently, and nothing corrects it
until the TTL. Deleting is safe, because the next read repopulates from the
source of truth.

Where it goes wrong beyond that: a **stampede** when a hot key expires and
every concurrent request misses at once; **hot keys** saturating one shard;
**penetration**, where requests for non-existent keys always miss and always
hit the database; and the general problem that the cache and the database can
disagree for a window you've implicitly chosen.

The failure that matters most depends on the data — for content, staleness is
cosmetic; for authorization decisions, a stale allow is a security bug.

</details>

**Follow-ups:**

1. Q: Why invalidate rather than update the cache on write?
   <details><summary>Answer</summary>

   Because updating races and the race has no natural repair.

   Consider two writers. A writes value 1 to the database, B writes value 2,
   then B updates the cache to 2, then A updates the cache to 1. The database
   says 2, the cache says 1, and the cache is wrong until it expires — possibly
   for hours, and nothing detects it.

   Deleting doesn't have that failure: whoever deletes last leaves the cache
   empty, and the next read repopulates from the database, which is
   authoritative. The worst case is an extra miss, not a wrong value.

   There's still a narrower race — a read that misses can be populating with an
   old value at the same moment a writer invalidates — which is what versioned
   keys or a short TTL cover. But delete-on-write removes the common, durable
   inconsistency.

   </details>

2. Q: What's your cache hit rate, and what does a bad one tell you?
   <details><summary>Answer</summary>

   The number matters less than what it implies. Below about 80% on a
   read-heavy path usually means something structural rather than a tuning
   issue.

   The usual causes: **key granularity too fine**, so keys are effectively
   unique per request and nothing is shared — caching per-user-per-resource
   when you could cache per-role gives a huge key space and almost no reuse.
   **TTL too short** relative to how often the data changes. **Eviction
   pressure** — the working set doesn't fit, so entries are evicted before
   reuse, which you'd see as rising evictions rather than expiries. Or the
   access pattern genuinely has no locality, in which case caching is the wrong
   tool.

   The diagnostic I'd reach for is comparing evictions to expirations: high
   evictions means undersized memory, high expirations with low hits means the
   TTL is wrong or there's no reuse.

   And the design insight from your own domain: caching per-role rather than
   per-user is a small key space with high reuse, because many users share a
   role. Getting the granularity right is usually worth more than any amount of
   TTL tuning.

   </details>

### Q: A hot key expires and your database falls over. What happened, and how do you prevent it?
**Level:** senior · **Tags:** stampede, resilience

<details><summary>Model answer</summary>

That's a cache stampede, or thundering herd. A single popular key expires, and
every concurrent request for it misses at the same instant. They all hit the
origin simultaneously, so the database briefly receives its full uncached load —
which it was never provisioned for, since the cache normally absorbs it.

It's particularly nasty because it doesn't self-recover: the database is
saturated, so nothing repopulates the cache, so every subsequent request also
misses, and the retry load keeps it down even after the original spike passes.

Three defences, and I'd use more than one. **Request coalescing** — the first
miss fetches while concurrent misses for the same key wait on that single
result, which caps origin load at one request per key regardless of concurrency.
**Probabilistic early refresh** — refresh shortly before expiry with jitter, so
the refresh happens while the old value is still servable and keys don't expire
in lockstep. **Stale-while-revalidate** — serve the expired value and refresh in
the background.

The caveat I'd add: for authorization data, stale-while-revalidate must be
tightly bounded, because serving stale there means serving a permission that
may have been revoked.

And more generally, TTL jitter — a thousand keys written in the same second
with identical TTLs will expire in the same second.

</details>

**Follow-ups:**

1. Q: How do you invalidate a cached authorization decision when a role changes?
   <details><summary>Answer</summary>

   The hardest correctness problem in caching, and worth naming as a security
   issue rather than a freshness one: a cached allow for a revoked user is a
   vulnerability.

   **TTL only** is simplest — bounded staleness, no invalidation code. But
   you've decided a revoked admin keeps admin for up to the TTL, so that has to
   be a deliberate choice with a number attached.

   **Explicit invalidation** on role change is precise but requires knowing
   every affected key. With permission inheritance the fan-out is large and
   easy to get wrong, and a missed key is silent.

   **Versioned keys** are what I'd choose: include a per-user or per-tenant
   version counter in the cache key. A role change bumps the counter, so
   everything derived from the old version becomes unreachable at once. Nothing
   to enumerate, nothing to miss, and old entries expire on their own.

   Plus **cache bypass** on the highest-sensitivity operations, where the
   latency cost is worth paying.

   In practice: versioned keys, a short TTL as a backstop, bypass on the
   sensitive paths — and then measure end-to-end revocation latency, because
   the real figure is the sum of every layer and it's usually larger than the
   configured TTL suggests.

   </details>

2. Q: How do you handle a hot key that saturates one Redis shard?
   <details><summary>Answer</summary>

   Recognise first that this is a distribution problem, not an expiry problem —
   no TTL strategy helps, because the traffic is concentrated on one key and
   therefore one shard.

   The options: **replicate the key** across shards with a suffix (`key:1`
   through `key:N`) and have readers pick one at random, spreading read load at
   the cost of N invalidations per write. **A small in-process cache in front of
   that key specifically**, which removes the network hop entirely for the
   hottest data — very effective, at the cost of per-instance invalidation.
   **Read replicas** in Redis for that shard.

   And if the hot key is a *tenant*, it's really the hot-partition problem, and
   the answer is isolation: a dedicated cache or shard for that customer, which
   also contains the blast radius when they spike.

   The detection point worth mentioning: hot keys are invisible in aggregate
   metrics — the cluster looks fine while one shard is at 100%. You need
   per-key or per-shard visibility to see it at all.

   </details>

---

## Workshop: cache-aside vs write-through

Same cache, same database, two different places the write goes — and a
different answer to "what does the cache say right after a write?"

**Cache-aside — the app owns invalidation, and the cache doesn't see the
write at all:**

```js
// Read: check cache, miss falls through to DB and repopulates.
async function getPermissions(userId) {
  const cached = await redis.get(`perms:${userId}`);
  if (cached) return JSON.parse(cached);

  const perms = await db.query('SELECT * FROM permissions WHERE user_id = $1', [userId]);
  await redis.set(`perms:${userId}`, JSON.stringify(perms), 'EX', 300);
  return perms;
}

// Write: touch the database only, then DELETE — never update the cache.
async function grantPermission(userId, permission) {
  await db.query('INSERT INTO permissions (user_id, permission) VALUES ($1, $2)', [userId, permission]);
  await redis.del(`perms:${userId}`);   // next read repopulates from the DB
}
```

Between the `db.query` and the `redis.del`, or during the brief window after
delete before the next read repopulates, the cache can be **empty or briefly
stale** — a read in that gap either misses (safe, just slower) or, rarely,
repopulates from a read that started before the write committed (the
narrower race versioned keys or a short TTL cover). The cache is a pure
derived copy the app manages explicitly; if Redis is down, reads still work
by falling through to the database.

**Write-through — every write goes through the cache, which writes the
database itself, synchronously:**

```js
// A caching layer that owns both stores. The app never talks to the
// database directly for this data.
async function grantPermissionWriteThrough(userId, permission) {
  await cache.set(`perms:${userId}`, async (current) => {
    const updated = [...current, permission];
    await db.query('INSERT INTO permissions (user_id, permission) VALUES ($1, $2)', [userId, permission]);
    return updated;          // cache now holds the post-write value, guaranteed in sync
  });
}
```

The cache is never stale relative to the database, because the write isn't
acknowledged until both are updated — but every write now pays the latency
of both the cache write and the database write, on the critical path, and if
either one is down the write fails outright (there's no "fall through and
try again later").

**What to say out loud:** cache-aside is the right default because the app
already treats the database as the single source of truth and the cache as
disposable — an empty Redis is a performance problem, never a correctness
one. Write-through earns its cost only when a stale cache read is
unacceptable *and* the write path can tolerate the extra latency and the
tighter coupling — which is rare enough that cache-aside plus a fast,
well-designed invalidation strategy (versioned keys, from the section above)
usually beats write-through's guarantee for less operational cost.

---

## What a weak answer sounds like

- **"We update the cache when we write."** Races, and the wrong value persists.
- **No stampede answer.** It's the canonical caching outage.
- **Treating a stale authorization decision as a performance issue.** It's a
  security issue.
- **"We just set a TTL"** with no view on what staleness that admits.
- **Ignoring in-process caches** when reasoning about invalidation. They're the
  invisible layer that makes "immediate" not immediate.

---

## Quiz

### MCQ: In cache-aside, why should a write invalidate (delete) the cache entry rather than update it?
- [ ] Deleting is faster than updating
- [x] Updating creates a race where two concurrent writers can leave the cache holding the older value permanently; deleting is safe because the next read repopulates from the source of truth
- [ ] Redis doesn't support atomic updates
- [ ] Update operations don't support a TTL
**Why:** With two writers, the cache can end up with the wrong value and nothing detects or corrects it until expiry — deleting means the worst case is an extra cache miss, not a silently wrong value.

### MCQ: A hot key expires and every concurrent request misses simultaneously, hitting the database at once. What is this called?
- [ ] Cache penetration
- [x] Cache stampede (thundering herd)
- [ ] Cache avalanche
- [ ] Write-behind failure
**Why:** The database was sized for cache-hit load, and the sudden simultaneous full-load hit can saturate it — the three mitigations are request coalescing, probabilistic early expiry, and stale-while-revalidate.

### MCQ: How does request coalescing (single-flight) prevent a stampede?
- [ ] It increases the TTL on hot keys automatically
- [x] The first miss for a key triggers the actual fetch; concurrent misses for the same key wait on that one result instead of each hitting the origin
- [ ] It replicates the hot key across multiple cache shards
- [ ] It rejects requests during high load
**Why:** This directly caps origin load at one request per key regardless of how many concurrent requests are asking for it, which is the core defense against a stampede.

### MCQ: Why does TTL jitter (randomizing expiry by ±10%) matter even outside of a stampede scenario?
- [ ] It reduces memory usage in the cache
- [x] A thousand keys populated in the same second with an identical TTL all expire in the same second, creating a synchronized load spike
- [ ] It's required for Redis cluster mode
- [ ] It improves compression of cached values
**Why:** Without jitter, keys written together expire together, recreating a stampede-like spike even without a single obviously "hot" key.

### MCQ: Why is stale-while-revalidate dangerous to use unboundedly for authorization data specifically?
- [ ] It's slower than other stampede mitigations
- [x] Serving the stale (expired) value means potentially serving a permission that has since been revoked — a security issue, not just a freshness one
- [ ] It doesn't work with Redis
- [ ] It requires a consensus system to implement
**Why:** For content, serving something slightly stale is cosmetic; for an authorization decision, it can mean an actively revoked user still gets "allow" — the mitigation needs a tight bound in that context.

### MCQ: Why doesn't a TTL-based fix help with a "hot key" saturating one Redis shard?
- [ ] TTLs only apply to write operations, not reads
- [x] The problem is load distribution (all traffic hitting one shard), not expiry timing — no TTL strategy redistributes load across shards
- [ ] Hot keys never actually expire
- [ ] Redis shards automatically rebalance hot keys
**Why:** This is fundamentally a distribution problem — the fix is spreading the load (replicating the key with a suffix, an in-process cache for just that key) or isolating the source (a hot tenant), not adjusting expiry.

### MCQ: For a cached authorization decision, why are versioned cache keys (a per-user/tenant counter) usually preferred over explicit key-by-key invalidation?
- [ ] Versioned keys use less memory
- [x] Explicit invalidation requires knowing every affected key — with permission inheritance that fan-out is easy to get wrong, while a version bump makes everything derived from the old version unreachable at once, with nothing to enumerate
- [ ] Versioned keys don't require a TTL at all
- [ ] Explicit invalidation is not supported by Redis
**Why:** A missed key in explicit invalidation is a silent security hole; versioned keys can't miss anything because old entries simply become unreachable by construction.

### MCQ: What should actually be cached for an authorization check — the policy inputs or the decision?
- [ ] The policy document itself, re-evaluated on every request
- [x] The decision (the boolean outcome), keyed on (principal, tenant, permission, resource, version)
- [ ] Only the user's role name
- [ ] Nothing — authorization checks should never be cached
**Why:** Caching inputs and re-evaluating still pays the policy-evaluation cost on every request, which is exactly the cost caching was meant to eliminate — caching the outcome avoids re-evaluation entirely.

### MCQ: Why are in-process (per-instance) caches described as "the invisible layer that makes 'immediate' not immediate"?
- [ ] They're slower than a shared Redis cache
- [x] Each instance holds its own copy, so an invalidation must reach every instance individually, and they don't clear at deploy boundaries the way people assume
- [ ] In-process caches can't be invalidated at all
- [ ] They only exist in development environments, not production
**Why:** When someone says "revocation takes 30 seconds" and it actually takes longer, per-instance caches that weren't accounted for are usually why — they're easy to forget when reasoning about invalidation paths.

### MCQ: What's the "cache penetration" failure mode, and its typical fix?
- [ ] Too many keys expiring simultaneously; fixed with TTL jitter
- [x] Requests for keys that don't exist bypass the cache every time and always hit the database; fixed by caching the negative result with a short TTL, or a Bloom filter
- [ ] One key saturating a single shard; fixed by replicating the key
- [ ] The cache tier restarting cold; fixed by warming it before taking traffic
**Why:** Since a nonexistent key never gets cached under the normal read path, every request for it repeats the full database round trip — caching "not found" (negative caching) closes that gap, and if attacker-controlled, penetration is effectively a DoS vector.

---

## Glossary

- **Cache-aside** — app checks cache, populates on miss, invalidates on write.
- **Write-through / write-behind** — write both synchronously / flush async.
- **Stampede / thundering herd** — many simultaneous misses on one expired key.
- **Single-flight / coalescing** — one fetch serves all concurrent misses.
- **Stale-while-revalidate** — serve expired data, refresh in background.
- **TTL jitter** — randomised expiry so keys don't expire together.
- **Hot key** — one key taking disproportionate traffic.
- **Penetration** — repeated misses for keys that don't exist.
- **Avalanche** — mass expiry or a cold cache tier taking full load.
- **Versioned key** — a counter in the key; bump to invalidate a whole set.
- **Negative caching** — caching "not found" to stop penetration.
