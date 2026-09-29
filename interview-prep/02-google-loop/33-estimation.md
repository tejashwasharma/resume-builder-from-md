# Estimation — including your own 2–3B

*In the Google round: a senior candidate estimates before being asked. Say the numbers out loud in the first five minutes, then use them to justify every later choice.*

Back-of-envelope numbers, worked on the figure from your own resume. If you
claim 2–3B daily requests, you must be able to turn that into RPS, storage and
cache size on a whiteboard without hesitating.

---

## In brief

- **The one shortcut worth memorizing**: divide daily requests by 100,000
  (since a day ≈ 10⁵ seconds) to get average RPS, error under 15%. Apply a
  2-3x peak multiplier on top.
- **State the number's implication, not just the number** — "30k RPS, so
  this won't fit on one database, we need caching and probably read-path
  sharding" is worth ten times the bare figure. A senior candidate
  estimates before being asked, in the first five minutes.
- **The read/write split is usually the most consequential number in the
  whole design** — at 2-3B daily requests for an auth layer (~30k RPS
  average), a 1000:1 read/write ratio means the write path is trivial and
  can stay strongly consistent, while the read path is the entire
  engineering problem, justifying aggressive caching and read replicas.
- **The hot working set is often small even when the request rate is
  huge** — 1M active sessions at ~1KB each is ~1GB, comfortably in memory
  on one Redis node. Auth data is tiny compared to content; it's the *rate*
  that's large, not the data — which is exactly why caching pays off so
  dramatically there.
- **Round aggressively and sanity-check** — 86,400 → 100,000, 1.3M → 1M.
  Precision wastes the interviewer's time; if you compute 50M RPS for a
  mid-size system, you've slipped a decimal, and catching that in the room
  matters more than the arithmetic itself.
- **Retention policy is the lever for audit-log storage, not the storage
  technology** — logging every request (2.5B/day) versus logging only
  denials (0.1% of traffic) is the difference between a 450TB/year system
  and a manageable 450GB/year one; deciding what's worth logging is the
  actual design decision.

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

## Quiz

### MCQ: What's the fastest way to convert "daily requests" into average requests per second?
- [ ] Divide by 24
- [x] Divide by 100,000 (since a day is approximately 10⁵ seconds), with under 15% error
- [ ] Multiply by 3
- [ ] Divide by 1,000,000
**Why:** 86,400 seconds in a day rounds cleanly to 10⁵, making "daily requests ÷ 100,000" the standard mental-math shortcut for average RPS.

### MCQ: Why is stating the *implication* of an estimate considered more valuable than the number itself?
- [ ] Interviewers don't actually check the arithmetic
- [x] "30k RPS, so this won't fit on one database and needs caching" demonstrates design reasoning; the bare number alone shows only that you can do arithmetic
- [ ] Implications are required by the interview rubric
- [ ] Numbers without implications are considered incorrect
**Why:** The estimation exercise exists to test whether you can reason about scale and its consequences, not whether you can compute a precise figure.

### MCQ: For a system doing 2.5 billion requests/day with a 1000:1 read/write ratio, roughly how does the load split?
- [ ] Reads and writes are roughly equal at ~15,000 RPS each
- [x] About 30,000 RPS of reads and about 30 RPS of writes
- [ ] About 30 RPS of reads and 30,000 RPS of writes
- [ ] All traffic is reads; there are no writes
**Why:** At ~30,000 RPS average total traffic, a 1000:1 read/write split puts nearly all of it on the read side — this asymmetry is what justifies aggressive caching and stateless validation on reads while writes stay simple and strongly consistent.

### MCQ: Why does a heavily-cached auth system's "hot working set" often turn out to be surprisingly small?
- [ ] Auth systems don't actually need much data per user
- [x] Even at very high request rates, the actual data (e.g. 1M sessions × 1KB) can total only ~1GB — it's the request *rate* that's large, not the volume of data itself
- [ ] Redis automatically compresses session data
- [ ] Most requests are for the same single session
**Why:** This is the insight behind why caching auth decisions is so effective — a small, memory-resident working set can absorb an enormous request rate at very low latency.

### MCQ: Why should estimation numbers be rounded aggressively (e.g. 86,400 → 100,000) rather than computed precisely?
- [ ] Precise numbers are considered dishonest
- [x] The goal is establishing the correct order of magnitude for design decisions, not precision — computing exact figures wastes time that should go toward reasoning
- [ ] Calculators aren't allowed in system design interviews
- [ ] Rounding always produces more accurate results
**Why:** Whether the true answer is 28,935 or 30,000 RPS makes no difference to whether you need sharding — the order of magnitude is what actually drives architectural decisions.

### MCQ: If your back-of-envelope math produces something like "50 million RPS" for a mid-size consumer app, what should that trigger?
- [ ] Immediately designing for that scale
- [x] A sanity check — that figure is almost certainly the result of a slipped decimal or a wrong unit conversion
- [ ] Assuming the interviewer gave inflated numbers
- [ ] Switching to a completely different estimation method
**Why:** Sanity-checking your own arithmetic against intuition (is this plausible for the stated user count?) catches errors before they propagate into an absurd design.

### MCQ: Why is "retention policy" described as the real lever for audit-log storage cost, rather than the choice of storage technology?
- [ ] Storage technology choices don't affect cost at all
- [x] Logging every request (2.5B/day) versus logging only denials (a small fraction of traffic) is the difference between a ~450TB/year system and a ~450GB/year one — deciding what's worth logging dominates the cost equation
- [ ] All storage technologies cost the same per byte
- [ ] Retention policy only affects compliance, not cost
**Why:** The order-of-magnitude difference between "log everything" and "log what's actually needed" dwarfs any storage-engine optimization — the design decision that matters most is what gets logged at all.

### MCQ: What should you do when an interviewer doesn't give you specific scale numbers for a design?
- [ ] Refuse to proceed until numbers are provided
- [x] State a reasonable assumption explicitly (e.g. "I'll assume 10M DAU") so the design has stated constraints that can be corrected
- [ ] Design without any numbers at all
- [ ] Ask to skip the estimation phase entirely
**Why:** A stated assumption can be checked and corrected by the interviewer; designing with no numbers means designing without any real constraints at all.

### MCQ: A photo-sharing estimate produces 66 PB/year of storage. What does that figure alone immediately tell you about the design?
- [ ] The exact number of servers needed
- [x] This is fundamentally an object-storage problem with lifecycle tiering, not something a traditional database can handle
- [ ] The application needs to switch to a NoSQL database
- [ ] The CDN is unnecessary at this scale
**Why:** An estimate's value is in what it forces architecturally — a PB-scale storage figure rules out relational databases as the storage layer and points directly at object storage with tiering.

### MCQ: In a storage or bandwidth estimate, why does read/write ratio matter as much as the total request volume?
- [ ] It doesn't — total volume is what determines architecture
- [x] The same total traffic can demand wildly different designs depending on whether it's read-heavy (favoring caching, read replicas) or write-heavy (favoring sharding, strong consistency on the write path)
- [ ] Read/write ratio only matters for database selection, not overall architecture
- [ ] Write-heavy and read-heavy systems always need the same caching strategy
**Why:** A 1000:1 read-heavy system and a balanced 1:1 system at the same total RPS lead to very different architectural priorities — which is why the ratio, not just the raw number, drives design.

---

## Glossary

- **DAU/MAU** — daily / monthly active users.
- **RPS / QPS** — requests / queries per second.
- **Peak multiplier** — peak over average, typically 2–3×.
- **Read/write ratio** — usually the most consequential number in a design.
- **Working set** — the data actually accessed often; sizes your cache.
- **Egress** — outbound bandwidth; the CDN's economic justification.
