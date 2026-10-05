# Low-level design — start here

Not part of the interview-core part (`02-interview-core/`), which folds "design a class
for X" into the coding round rather than running it as its own 45-minute
slot. This is here for companies that do run a dedicated round — Amazon,
Uber, most product and service-based companies — where the prompt is
"design me an object model," not "design me a distributed system."

---

## In brief

- **The test is modeling, not memorizing a solution.** The interviewer has
  seen "design a parking lot" fifty times; what they're grading is whether
  you turn a vague prompt into classes, interfaces and relationships in
  front of them, out loud.
- **Nouns become classes, verbs become methods, adjectives become state.**
  It sounds trivial and it is the entire first pass: read the prompt back
  slowly and pull out every noun and verb before touching a keyboard.
- **Interfaces before implementations.** Naming the seam ("a `PricingStrategy`
  interface, because pricing will change") before writing a concrete class
  is what separates a senior answer from a junior one that hardcodes a
  `switch` statement and calls it done.
- **Composition beats inheritance almost everywhere here.** A `Vehicle` that
  *has* a `ParkingSpotSize` beats a `Car extends Vehicle` hierarchy that
  breaks the moment a hybrid requirement shows up. Default to composition;
  justify inheritance when you reach for it.
- **A pattern is a name for a shape you already needed, not a goal.** Naming
  Strategy or Observer when it genuinely fits reads as senior. Bolting one
  on to look sophisticated reads as the opposite — see
  [OOP, SOLID and patterns](02-oop-solid-and-patterns.md).
- **Concurrency is the differentiator at senior level.** "Two customers book
  the last seat at the same second" is the follow-up that separates mid-level from
  senior — see how the worked problems in
  [classic LLD problems](03-classic-lld-problems.md) handle it.

---

## How this differs from the system-design (HLD) round

| | HLD (`02-interview-core/31`–`40`) | LLD (here) |
| --- | --- | --- |
| Unit of design | Services, data stores, queues | Classes, interfaces, methods |
| Scale question | "How many requests per second?" | "How many concurrent callers on this object?" |
| The diagram | Boxes and arrows between systems | A class diagram — fields, methods, relationships |
| The deliverable | An architecture that survives 10x traffic | A model that survives the third feature request |
| Failure mode | Missing a bottleneck or an estimate | A `God` class, or a `switch` that grows forever |

Both rounds share a method — clarify, then design, then extend — but LLD
trades RPS and replication for cardinality and mutability: how many of this
object exist, who can change it, and what happens when two callers touch it
at once.

---

## The method

### 1. Clarify requirements and scope

Don't design "a parking lot." Design *this* parking lot: multiple floors?
Multiple vehicle types (motorcycle, car, bus) with different spot sizes?
Multiple entry/exit points needing separate ticket dispensers? A pricing
model, and is it flat-rate or tiered by duration? Payment at exit or at a
kiosk? Say the scope out loud and write down 4-6 functional requirements
before anything else — an interviewer who wanted you to assume something
will correct you now, cheaply, instead of at the end.

Two non-functional questions are always worth asking even when the prompt
doesn't mention them: **is this single-threaded or does it need to handle
concurrent access**, and **what's likely to change** (a new vehicle type, a
new pricing tier, a new payment method) — because "what's likely to change"
is what tells you where an interface belongs.

### 2. Identify the core objects — nouns and verbs

Read the requirements back and underline every noun (`ParkingSpot`,
`Vehicle`, `Ticket`, `PaymentProcessor`) and every verb (`park`, `unpark`,
`calculateFee`, `findAvailableSpot`). Nouns become candidate classes; verbs
become candidate methods on whichever class owns the responsibility. This
is deliberately mechanical — it gives you a first draft without having to
be clever, and cleverness is what produces a design you can't defend under
follow-up.

### 3. Assign responsibilities — one job per class

For every candidate class, ask "whose job is this?" A `ParkingSpot` knows
whether it's occupied; it does not know how to charge a card. A
`ParkingLot` coordinates finding a spot and issuing a ticket; it does not
know the pricing formula. If a class's description needs "and," it's
probably two classes — this is the Single Responsibility Principle from
[SOLID](02-oop-solid-and-patterns.md), applied as a design step rather than
recited as a definition.

### 4. Define relationships

For every pair of related classes, name the relationship and say it out
loud:

- **Association** — "a `Ticket` references a `Vehicle`" (knows about, doesn't own).
- **Aggregation** — "a `ParkingFloor` has `ParkingSpot`s" (owns the collection, but a spot could theoretically outlive the floor in a redesign).
- **Composition** — "a `Vehicle` has an `Engine`" (the engine has no meaning outside this vehicle; it's created and destroyed with it).
- **Inheritance** — reach for this last, and only when subtypes are truly substitutable for the parent (Liskov). A `Car` and a `Motorcycle` sharing a `Vehicle` base for size/type is fine; a `Vehicle` hierarchy that has to `instanceof`-check itself to decide behavior is a sign you wanted composition or a strategy object instead.

### 5. Reach for interfaces at the seams that will change

Every place you said "what's likely to change" in step 1 becomes an
interface now: `PricingStrategy`, `PaymentProcessor`, `NotificationChannel`.
Concrete implementations come after — `HourlyPricingStrategy`,
`FlatRatePricingStrategy` — and the pattern names in
[OOP, SOLID and patterns](02-oop-solid-and-patterns.md) are just the common
shapes these seams take.

### 6. Walk through 2-3 use cases against the model

Before declaring done, narrate a use case end to end: "a car arrives, we
call `ParkingLot.parkVehicle`, which asks each `ParkingFloor` for an
available spot sized for a car, assigns it, creates a `Ticket`..." This is
where gaps surface — a missing field, a method on the wrong class, a case
the model can't express. Fix them live; finding your own bug here reads
better than the interviewer finding it.

### 7. Handle the concurrency follow-up if it comes

If the interviewer asks "what if two threads call this at once," the
answer is specific to *where* the race is, not a blanket "use a lock."
Locate the shared mutable state (usually "is this spot free," or "is this
seat free") and say what serializes access to it: a lock scoped to the
smallest critical section that decides it, an atomic
compare-and-swap on a status field, or a database-level unique constraint
/ row lock if the object is persisted. Naming *which* field is contended
and *why* your chosen mechanism prevents the double-booking is the answer;
"I'd add a mutex" without that is not.

---

## What a strong answer sounds like vs. a weak one

| Weak | Strong |
| --- | --- |
| Jumps straight to code | Spends 3-5 minutes on requirements and objects first, out loud |
| One `ParkingLot` class with everything in it | Responsibilities split — `ParkingLot`, `ParkingFloor`, `ParkingSpot`, `Ticket`, `PricingStrategy` |
| Hardcodes vehicle types with `if/else` | A `VehicleType` enum or a `Vehicle` hierarchy sized by an interface method |
| Adds every pattern the candidate knows | Adds exactly the patterns the requirements justify, and can say why each one is there |
| "I'd use a lock" | Names the exact shared field and the smallest scope that needs to be atomic |
| Silent about edge cases | States them unprompted: lot full, invalid ticket, spot size mismatch |
| Treats the first design as final | Revises after walking through a use case exposes a gap |

---

## Common mistakes

- **Designing the database before the objects.** LLD is about the object
  model; a persistence layer is a detail you can defer ("this would be a row
  in a `spots` table with a `status` column") rather than the first thing
  you draw.
- **A God class.** If `ParkingLot` has fields for pricing, payment,
  notifications and spot allocation, it's doing four jobs. Split it — see
  Single Responsibility in [OOP, SOLID and patterns](02-oop-solid-and-patterns.md).
- **Inheritance for code reuse alone.** `PremiumUser extends User` to reuse
  three fields, when `PremiumUser` isn't substitutable for `User` everywhere
  it's used, violates Liskov and usually means composition (a `User` that
  *has* a `Subscription`) was the right call.
- **No interfaces anywhere.** A design with zero abstractions can't take the
  "now add a new payment method without changing existing code" follow-up,
  which is almost always coming.
- **Pattern soup.** Reaching for Factory, Strategy, Observer, Decorator and
  Singleton all in one 45-minute answer signals memorization, not judgment.
  Two or three, each justified by a real requirement, reads as senior.
- **Ignoring the concurrency question until asked**, then answering it
  vaguely. If the domain obviously has contention (booking the last seat,
  reserving the last spot), flag it yourself before the interviewer has to
  ask.

---

## Interview Q&A

### Q: How is an LLD round different from a system design (HLD) round, and how do you tell which one you're in?
**Level:** foundation · **Tags:** lld, method, interview-format

<details><summary>Model answer</summary>

HLD is about services, data stores and traffic — the unit of design is a
system, and the numbers that matter are RPS, storage size, and replication
factor. LLD is about classes, interfaces and object relationships — the unit
of design is a class, and the numbers that matter are cardinality (how many
of this object exist, how many callers touch it concurrently) rather than
requests per second.

The prompt usually tells you which one you're in: "design a system that
handles 2 billion requests a day" is HLD; "design a parking lot" or "design
a class for an elevator system" is LLD. If it's ambiguous, ask — "should I
focus on the class design and object model, or the service architecture and
scale?" costs nothing and prevents 10 minutes of drawing the wrong kind of
diagram.

</details>

**Follow-ups:**

1. Q: Can a prompt ask for both?
   <details><summary>Answer</summary>

   Yes — some interviewers run a "design X" prompt and expect you to sketch
   the service boundaries first, then drop into the object model for the
   core piece. If that happens, say so explicitly ("I'll do a quick HLD
   pass, then go deep on the class design for the booking engine") so the
   interviewer can redirect you if that's not what they wanted.

   </details>

### Q: Why does composition usually beat inheritance in these designs?
**Level:** intermediate · **Tags:** oop, composition, inheritance

<details><summary>Model answer</summary>

Inheritance couples a subtype to its parent's implementation permanently —
change the parent, and every subtype changes with it, whether that's wanted
or not. It also tends to produce hierarchies that don't survive a second
requirement: a `Car extends Vehicle` hierarchy that adds `Hybrid extends
Car` works until a `HybridMotorcycle` shows up and the tree doesn't have a
slot for it.

Composition — a `Vehicle` that *has* a `FuelStrategy` — lets you combine
behaviors independently instead of needing a new class for every
combination, and it's swappable at runtime, which inheritance isn't. The
Gang-of-Four heuristic ("favor composition over inheritance") exists because
this failure mode is so common, not because inheritance is wrong — it's
right exactly when subtypes are genuinely substitutable for the parent
everywhere the parent is used (Liskov), which is a narrower case than it
first appears.

</details>

### Q: An interviewer says "now two users try to book the last available seat at the same time — what happens?" How do you answer?
**Level:** senior · **Tags:** concurrency, thread-safety, race-condition

<details><summary>Model answer</summary>

First, name exactly where the race is: two threads read "seat is available"
before either writes "seat is booked," so both proceed. The fix is making
the read-then-write atomic, not adding a lock somewhere vague.

In-memory, the smallest correct fix is a mutex scoped to that seat (or a
compare-and-swap on the seat's status field, going `AVAILABLE → LOCKED` only
if it currently reads `AVAILABLE`) — locking the whole `Theater` or
`Booking` object serializes unrelated seats for no reason and kills
throughput. If the object is persisted, the same idea maps to a database
transaction with a unique constraint on `(seat_id, status='booked')` or a
`SELECT ... FOR UPDATE` on that row, so the database enforces the
invariant even under concurrent requests from different processes.

Saying "I'd add a lock" without naming the field and the smallest scope is
the generic version of this answer; naming both is what separates it from a
guess.

</details>

**Follow-ups:**

1. Q: What if the lock needs to be held across a slow step, like calling a payment provider?
   <details><summary>Answer</summary>

   Don't hold a lock across an external call — that turns a provider outage
   into every other booking blocking too. Instead, reserve the seat
   optimistically (`AVAILABLE → RESERVED`, atomically, with a short TTL) so
   the atomic step is fast, release the lock, then call the payment provider.
   On success, move `RESERVED → BOOKED`; on failure or TTL expiry, move it
   back to `AVAILABLE`. This is the same reservation-with-timeout pattern
   used in [Rate limiting and resilience](../02-interview-core/29-resilience-rate-limiting.md)
   for holding a resource without blocking on a slow dependency.

   </details>
