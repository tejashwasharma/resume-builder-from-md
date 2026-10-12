# Requirements playbook

The panel's first complaint was that the candidate "did not evaluate the requirements before starting the design." This chapter is the fix: a repeatable way to turn a vague prompt into a written requirements list in five to seven minutes.

## In brief

- **Functional requirements** say what the system does. **Non-functional requirements** say how well: scale, latency, availability, consistency, durability, cost, compliance.
- **Ask in six groups**, in order: users, core features, scale, behavior at limits, guarantees, and out of scope.
- **The most valuable questions are about limits.** What happens when the quota is exceeded? When the provider is down? When the queue is full? These decide the architecture.
- **Always write the answers down**, then restate them as a list and get a nod.
- **If the interviewer will not answer, assume and say so** with a number.

## The six question groups

| Group | Questions | What it decides |
| --- | --- | --- |
| Users and use cases | Who calls this? Internal or external? Transactional or bulk? | Priority lanes, auth, SLAs |
| Core features | What is the smallest useful version? Templates? Scheduling? Status tracking? | Scope, number of services |
| Scale | Users, requests per day, peak per second, data size, growth | Storage, sharding, cache, queue sizing |
| Behavior at limits | Quota exceeded: reject, queue or delay? Provider down? Rate limit hit? | Queues, backpressure, policies |
| Guarantees | At-least-once or exactly-once? Ordering? Can we lose data? Strong or eventual consistency? | Idempotency, DB choice, transactions |
| Out of scope | Analytics? Billing? Multi-region? Compliance? | What you will deliberately not build |

## Turning answers into requirements

Write two lists and one line.

**Functional (what).** Short imperative sentences: "A tenant can send an email through an API." "The system enforces a daily quota per tenant." "A tenant can query an email's status."

**Non-functional (how well).** Each with a number: "Accept a request in under 100 ms at p99." "Deliver transactional email within 30 seconds at p95." "99.9% availability on the send API." "No acknowledged email is lost." "Duplicates are rare and tolerated; losing an email is not."

**Out of scope.** "No marketing campaign builder, no billing, single region in v1."

## Non-functional checklist

| Quality | Prompt to yourself | Example number |
| --- | --- | --- |
| Scale | Peak and average load | 580 per second average, 2,000 at peak |
| Latency | Where does a user wait? | API accept under 100 ms |
| Availability | What downtime is acceptable? | 99.9% |
| Consistency | Can a stale read hurt? | Quota counting must not oversell |
| Durability | Can we lose accepted work? | No |
| Isolation | Can one tenant hurt another? | No |
| Cost | Which dimension grows fastest? | Per-email cost |
| Compliance | PII, retention, regions | Retain status 90 days |

## Worked example: email service

Prompt: "Design an email-sending service for multiple tenants with daily quotas."

| Question | Answer to assume | Why it matters |
| --- | --- | --- |
| Transactional or bulk? | Both; transactional is priority | Separate queues |
| Quota unit and window | Emails per tenant per day, UTC | Counter keyed by date |
| When exceeded | Configurable: reject or defer | Defer needs a backlog store |
| Delivery guarantee | At-least-once, avoid duplicates | Idempotency |
| Scale | 1,000 tenants, 50M emails per day | Sizing and queue design |
| Provider | SES with a send-rate limit | Token bucket |
| Status | Tenants poll status and receive webhooks | Event path |

## What a weak answer sounds like

Asking one or two shallow questions ("how many users?") and moving on, or asking nothing and saying "I'll assume standard requirements." Another weak sign is never asking what happens at the limits, which is where the real design lives.

## Interview Q&A

### Q: How many clarifying questions is the right number?
**Level:** foundation · **Tags:** requirements

<details><summary>Model answer</summary>

Enough to cover the six groups, usually eight to twelve, in about five minutes. The goal is not volume. Each question should change the design. Stop when you can write the requirements and out-of-scope lists confidently.
</details>

### Q: The interviewer refuses to answer a question. What now?
**Level:** intermediate · **Tags:** requirements, assumptions

<details><summary>Model answer</summary>

State an assumption with a number, say the design would change if it were wrong, and continue. Example: "I'll assume quota exceeded means reject with 429, since that is simplest. If you want deferral, I'd add a backlog table and a dispatcher."
</details>

## Quiz

### MCQ: Which question most changes the architecture of a quota system?
- [ ] What language is it written in?
- [x] What happens when the quota is exceeded: reject, queue or delay?
- [ ] What colour is the dashboard?
- [ ] How many engineers will maintain it?
**Why:** The over-limit policy decides whether you need a backlog store and dispatcher.

### MCQ: Which is a well-formed non-functional requirement?
- [ ] The system should be fast
- [x] Accept a send request in under 100 ms at p99
- [ ] The system uses Redis
- [ ] The system is scalable
**Why:** It is measurable and independent of implementation.

## Reference stack

| Need | Typical choice |
| --- | --- |
| Capture answers | Whiteboard list: functional, non-functional, out of scope |
| Quota or limit semantics | Counters in Redis, state in a relational DB |
| Provider limits | Token bucket in workers |
