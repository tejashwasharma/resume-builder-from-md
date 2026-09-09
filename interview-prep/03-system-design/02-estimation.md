# Estimation — including your own 2–3B

Back-of-envelope numbers, worked on the figure from your own resume. If you
claim 2–3B daily requests, you must be able to turn that into RPS, storage and
cache size on a whiteboard without hesitating.

---

## The numbers to memorise

**Time:**
```
1 day        = 86,400 s   ≈ 10⁵ s     ← use this
1 month      ≈ 2.6 × 10⁶ s
1 year       ≈ 3.2 × 10⁷ s
```

**Powers of two:**
```
2¹⁰ = 1 thousand    KB
2²⁰ = 1 million     MB
2³⁰ = 1 billion     GB
2⁴⁰ = 1 trillion    TB
```

**Latency:**
```
Memory read           ~100 ns
SSD random read       ~150 μs
Datacentre round trip ~500 μs
Disk seek              ~10 ms
Cross-continent       ~150 ms
```

**Rules of thumb:**
```
1M requests/day    ≈ 12 RPS
100M requests/day  ≈ 1,200 RPS
1B requests/day    ≈ 12,000 RPS
Peak               ≈ 2–3× average (higher for consumer, spikier for B2B)
```

**The one shortcut worth memorising:** divide daily requests by 100,000 to get
average RPS. `86,400 ≈ 10⁵`, and the error is under 15%.

---

## Worked: your 2–3B daily requests

This is the calculation to have ready.

**Average RPS**
```
2.5B / 86,400 s  ≈  29,000 RPS   (call it ~30k)
```

**Peak.** For a B2B platform, traffic follows business hours in each region —
peaks are sharper than consumer social but flatter than an event-driven
consumer app. At 3× average:
```
peak ≈ 90,000 RPS
```

> **FILL IN:** the actual peak-to-average ratio, and the read/write split on
> auth requests. Two numbers you'd want ready — see
> [WEAK-SPOTS](../WEAK-SPOTS.md) #3.

**What that means for auth specifically.** Almost all of it is token validation
and authorization checks — reads. Assume 1000:1 read/write:
```
reads   ≈ 30,000 RPS
writes  ≈ 30 RPS         ← logins, role changes, revocations
```

That asymmetry is the most important design fact. **The write path is trivial;
the read path is everything.** It justifies: aggressive caching, stateless
token validation with no lookup, read replicas, and accepting bounded staleness
on reads while writes stay strongly consistent.

**Cache sizing.** Say 1M active sessions, ~1KB of cached decision data each:
```
1M × 1KB = 1 GB     ← comfortably in memory on one Redis node
```

That's the punchline worth stating: **the hot working set is small.** Auth data
is tiny compared to content; it's the request *rate* that's large, not the
data. That's why caching works so well here and why the 13s→200ms fix was
available.

**Bandwidth**, if tokens are ~1KB:
```
30,000 RPS × 1 KB ≈ 30 MB/s ≈ 240 Mbps
```
Unremarkable — this is a CPU and round-trip problem, not a bandwidth one.

---

## The method

1. **Start from users, not requests.** 10M DAU × 20 actions = 200M actions/day.
2. **Convert to RPS** — divide by 100,000.
3. **Apply a peak multiplier** — 2–3× typically; state which you're using.
4. **Split reads and writes.** Usually the most consequential number.
5. **Storage** = objects/day × size × retention. Add replication (×3) and
   indexes (~×1.3).
6. **Sanity check.** If you compute 50M RPS, you've slipped a decimal.

**Round aggressively.** 86,400 → 100,000. 1.3M → 1M. You want the order of
magnitude; precision here is a waste of the interviewer's time.

**State the number's implication, not just the number.** "30k RPS — so this
won't fit on one database, we need caching and probably sharding on the read
path" is worth ten times "30k RPS".


## Reference stack

No library — this is mental math against memorised numbers ("The numbers to
memorise" above). The only "tool" worth having ready is those numbers
themselves; reaching for a calculator mid-interview is a bigger tell than a
slightly-off estimate.

---

## Interview Q&A

### Q: Your system handles 2–3 billion requests a day. Walk me through what that means.
**Level:** senior · **Tags:** estimation, scale

<details><summary>Model answer</summary>

Taking 2.5B as the midpoint: a day is about 10⁵ seconds, so that's roughly
**30,000 requests per second on average**. For a B2B platform following
business hours across regions I'd assume a peak of 2–3×, so call it **~90,000
RPS at peak**.

The more important number is the split. For an auth layer this is overwhelmingly
reads — token validation and authorization checks — against very few writes,
which are logins, role changes and revocations. At a 1000:1 ratio that's ~30,000
read RPS and something like 30 write RPS.

That asymmetry drives the whole design. The write path is trivial and can be
strongly consistent without cost. The read path is the entire engineering
problem, which justifies stateless token validation with no database lookup,
aggressive decision caching, and read replicas.

On sizing: a million active sessions at roughly a kilobyte of cached decision
data each is about a gigabyte — which fits comfortably in memory. That's the
thing worth noticing about auth at scale: the *data* is small, it's the request
*rate* that's large. That's why caching is so effective here.

</details>

**Follow-ups:**

1. Q: At 30k RPS, how many application servers?
   <details><summary>Answer</summary>

   Depends entirely on what each request does, so I'd reason from the work
   rather than guess a number.

   If token validation is a local signature check — no network, no database —
   a modern instance handles thousands per second, so 30k RPS might be 10–20
   instances with headroom, plus redundancy across zones.

   If each request makes a network call — to Redis, or to a central policy
   engine — throughput per instance is dominated by concurrency and round-trip
   time rather than CPU. That's the case where a central PDP becomes a real
   constraint, and it's an argument for sidecar or embedded evaluation.

   I'd size for peak, not average, plus enough headroom to lose an availability
   zone without degrading. And I'd want the number validated by load testing
   rather than arithmetic, because the real limit is usually a connection pool
   or a garbage collector, not raw CPU.

   The reasoning matters more than the figure here.

   </details>

2. Q: How much storage for a year of auth audit logs at that rate?
   <details><summary>Answer</summary>

   You wouldn't log every request — 2.5B/day of full audit records is
   impractical and mostly useless. So the first answer is: decide what's
   auditable.

   Say you log authentication events and authorization *denials* rather than
   every check. If that's 0.1% of traffic, that's 2.5M events/day. At ~500
   bytes each:

   ```
   2.5M × 500 B      ≈ 1.25 GB/day
   × 365             ≈ 450 GB/year
   × 3 (replication) ≈ 1.4 TB
   ```

   Very manageable. If instead you had to log every authorization decision:

   ```
   2.5B × 500 B ≈ 1.25 TB/day ≈ 450 TB/year before replication
   ```

   Which is a different system entirely — object storage, columnar format,
   tiered retention with recent data hot and older data in cold storage.

   The design point I'd make is that the retention *policy* is the lever, not
   the storage technology. Compliance usually dictates a period for
   authentication events; everything else can be sampled or aggregated.

   </details>

### Q: Estimate the storage for a photo-sharing service with 100M daily actives.
**Level:** intermediate · **Tags:** estimation, storage

<details><summary>Model answer</summary>

I'd state assumptions as I go.

Assume 10% of daily actives upload, and they average 2 photos: 100M × 0.1 × 2 =
**20M photos/day**.

At 2MB per original photo, plus thumbnails and a couple of resized variants —
call it 3MB stored per photo including derivatives:

```
20M × 3 MB = 60 TB/day
× 365      ≈ 22 PB/year
```

With 3× replication that's roughly **66 PB/year**, which immediately tells you
this is object storage with lifecycle tiering, not a database problem.

For read bandwidth: if each user views 50 photos a day at ~200KB for a display
size, that's 100M × 50 × 200KB = 1 PB/day egress, about 12 GB/s sustained. That
number is the reason a CDN isn't optional — serving that from origin would be
absurd both technically and financially.

The two conclusions I'd draw out loud: storage goes to object storage with
tiering, and the CDN hit rate is the single most important number in the whole
design, because it directly determines origin load and cost.

</details>

**Follow-ups:**

1. Q: How would you reduce that storage cost?
   <details><summary>Answer</summary>

   Several levers, roughly in order of impact.

   **Lifecycle tiering** — most photos are viewed heavily in the first week and
   almost never after. Move older objects to infrequent-access and then archival
   tiers, which is often a 5–10× cost reduction for the bulk of the data.

   **Generate derivatives on demand** rather than storing every variant. Store
   the original plus one common size, and resize at the edge with caching — you
   trade compute and a little latency for a large storage saving.

   **Better compression** — modern formats at equivalent perceived quality
   substantially reduce size, though you need fallbacks for older clients.

   **Deduplication** by content hash, if the same image is uploaded repeatedly,
   which for shared or forwarded content is common.

   **Reconsider replication** — object stores already provide durability
   internally, so explicit 3× replication on top is often redundant.

   The one I'd lead with is tiering, because it's the largest saving for the
   least product risk.

   </details>

---

## What a weak answer sounds like

- **Precise arithmetic.** Computing 28,935 RPS wastes time; 30k is the answer.
- **Not stating assumptions.** Numbers appearing from nowhere can't be checked.
- **Giving the number without its implication.** The point is what it forces.
- **No read/write split.** Usually the most design-relevant figure.
- **Not sanity-checking.** A slipped decimal produces absurd designs.

---

## Glossary

- **DAU/MAU** — daily / monthly active users.
- **RPS / QPS** — requests / queries per second.
- **Peak multiplier** — peak over average, typically 2–3×.
- **Read/write ratio** — usually the most consequential number in a design.
- **Working set** — the data actually accessed often; sizes your cache.
- **Egress** — outbound bandwidth; the CDN's economic justification.
