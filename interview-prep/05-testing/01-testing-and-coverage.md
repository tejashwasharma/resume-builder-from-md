# Testing, TDD and defending "85%+ coverage"

Your resume cites 85%+ coverage twice and 80%+ once. Any number on a resume is
fair game, and this one has a trap built into it.

---

## In brief

- **Coverage is a floor, not a target** — it tells you what's definitely
  not tested, nothing about whether what's covered is tested well. A test
  that executes every line without asserting anything gets 100% coverage
  and catches nothing. Used as a target, people write assertion-free tests
  to move the number.
- **Mutation testing measures what coverage only gestures at**: it changes
  the code deliberately (flip `>` to `>=`) and checks whether tests fail —
  if they don't, that line executes without being actually verified.
- **Test behaviour, not implementation, and mock at boundaries, not inside
  your own code.** A test asserting internal structure breaks on every
  refactor, teaching the team tests are a tax; mocking three of your own
  classes just verifies you called your mocks in the expected order, which
  passes while the real system is broken.
- **A flaky test is worse than no test** — it trains the team to re-run
  the pipeline instead of reading it, and once that habit forms, a real
  failure gets re-run too. Quarantine flakes out of the gate immediately
  rather than leaving them to erode the suite's authority.
- **Sustaining a coverage number across releases requires enforcement in
  the pipeline, not periodic measurement** — a threshold that fails the
  build (applied to changed files, not the whole repo, and as a
  never-decreases ratchet rather than a hard "85% or fail" gate) is what
  makes the number a floor instead of a report.
- **In authorization testing specifically, negative cases matter more than
  positive ones** — auth bugs are almost always wrongly-*permitted*, not
  wrongly-denied, and fail silently. A decision table (role, permission,
  resource, tenant → expected outcome) plus a dedicated cross-tenant suite
  are the concrete tools; shadow comparison in production is the
  highest-value technique for a migration, catching cases nobody thought
  to write a test for.

---

## The pyramid, and what it's really saying

```
        ╱╲        E2E — few
       ╱  ╲       slow, brittle, but tests what users actually do
      ╱────╲
     ╱      ╲     Integration — some
    ╱        ╲    your code + real database/queue
   ╱──────────╲
  ╱            ╲  Unit — many
 ╱______________╲ fast, isolated, cheap to run
```

The point isn't the exact ratio. It's that **slow, brittle tests should be
rare** and fast, reliable ones should be plentiful — because a suite people
skip because it takes 20 minutes protects nothing.

- **Unit** — one function or class, dependencies mocked. Milliseconds.
- **Integration** — real database, real queue. Catches the things unit tests
  mock away, which is where a lot of bugs actually live.
- **E2E** — the whole system through the UI or API. Highest confidence, highest
  cost, flakiest.

---

## Coverage: the trap in your own number

**Coverage tells you what is definitely *not* tested. It says nothing about
whether what's covered is tested well.**

```js
// 100% coverage of add(). Tests nothing.
test('add', () => {
  add(2, 2);          // executes every line — and asserts nothing
});
```

So when asked "how do you maintain 85% without writing meaningless tests", the
answer is to be clear that coverage is a **floor, not a target**:

- Used as a floor, it catches whole areas nobody tested. Useful.
- Used as a target, people write assertion-free tests to make the number go up.
  Actively harmful — now you have a suite that passes when the code is broken.

**Where to spend the effort:** business logic, auth and permissions, money,
data integrity — including the failure paths and edge cases. **Where not to:**
generated code, trivial getters, framework glue.

**Mutation testing** is the better measure if you want one: it changes your
code deliberately (flipping `>` to `>=`, say) and checks whether tests fail. If
they don't, the tests execute that line without actually verifying it. That
measures what coverage only gestures at.

---

## Jest, practically

Jest is what you'd use in a Node/TypeScript codebase. The parts that come up:

- **`jest.mock()`** hoists above imports, which is why mocking a module
  sometimes appears not to work — the import you're trying to intercept was
  already resolved. Use `jest.spyOn` for partial mocking when you only want one
  method replaced.
- **Fake timers** (`jest.useFakeTimers()`) let you test timeouts and intervals
  without waiting. Essential for retry and backoff logic.
- **`--runInBand`** disables parallelism. Jest runs test files in parallel
  workers by default, which is fast until two tests share a database and
  interfere with each other. The better fix is isolating state per test rather
  than serialising everything.
- **Snapshot tests** are seductive and mostly a trap: they pass by being
  updated, so a snapshot nobody reads is a test that asserts nothing. Useful
  for stable serialised output, bad for component trees that change often.
- **`--coverage`** produces the report; `--changedSince` runs only tests
  affected by a diff, which is what makes coverage gates on changed files
  practical.

For integration tests, containerised dependencies (Testcontainers) beat mocking
the database, because mocked database behaviour diverges from real behaviour in
exactly the ways that cause bugs.

## Writing tests that survive refactoring

**Test behaviour, not implementation.** A test asserting *how* something works
internally breaks every time you tidy the code, and the team learns that tests
are a tax rather than a safety net.

```js
// Brittle — breaks if you rename or restructure internals
expect(service._cache.get('key')).toBe(...);

// Durable — asserts what the caller actually experiences
expect(await service.getUser('123')).toEqual({ id: '123', name: 'Ada' });
```

**Mock at boundaries, not inside your own code.** Mock the HTTP client, the
clock, the payment provider. Don't mock your own internal classes, or you're
testing your mocks.

**Over-mocking** is the common failure: a test with five mocks verifies that
the mocks were called in the order you said they would be. It'll pass while the
real system is broken.

---

## TDD

Red → green → refactor. Write a failing test, make it pass simply, then clean
up.

The genuine benefits: it forces you to design the interface before the
implementation, it guarantees the test actually fails when the code is wrong
(a test written afterwards might pass regardless), and it keeps scope tight.

**Be honest in an interview.** Strict TDD everywhere is rare in practice. A
credible answer: "I use it where the logic is complex or the rules are
well-defined — permission evaluation, parsers, anything with edge cases. For
exploratory work I usually write the code first and tests immediately after."
That reads as experience; claiming religious TDD often doesn't.

---

## Test automation: where the suite actually runs

A suite nobody runs is documentation. **Test automation** is the discipline of
making it run without anyone deciding to — and the interview question behind
your "Test Automation" line is usually *what runs when*, because that reveals
whether you designed a pipeline or inherited one.

The standard split, and the reasoning for it:

| Stage | What runs | Why there |
| --- | --- | --- |
| Pre-commit hook | Lint, types, changed-file unit tests | Seconds. Catches the trivial before it costs a CI minute |
| Pull request | Full unit + integration | The gate. Must be fast enough that people wait for it — past ~10 minutes they start merging around it |
| Post-merge / nightly | Full E2E, cross-browser, load | Too slow for the PR gate, still needs to run |
| Post-deploy | Smoke tests against the real environment | The only stage that proves the thing you actually shipped works |

Three points worth making unprompted, because they are what separates running
tests from automating them:

- **A flaky test is worse than no test.** It trains the team to re-run the
  pipeline instead of reading it, and once that habit forms a real failure gets
  re-run too. Quarantine flakes out of the gate immediately and fix them on
  their own track — leaving them in the gate is how a suite loses authority.
- **The gate has to be fast or it gets bypassed.** Parallelise across workers,
  shard by file, run only affected projects in a monorepo. Speed is a
  correctness property of the pipeline, because a slow gate is a disabled one.
- **Determinism is a design requirement.** No shared mutable database between
  parallel workers, no dependence on wall-clock time or test ordering, no live
  third-party calls. Seed and tear down per test; freeze time; stub the
  network at the boundary.

The connection to your own numbers: sustaining 85%+ coverage across releases is
only possible if coverage is *enforced in the pipeline* rather than measured
occasionally. A coverage threshold that fails the build is what makes the
number a floor instead of a report — and it is the honest answer to "how did
you sustain it".

---

## Testing auth specifically

Worth having ready, since it's your domain:

- **Negative cases matter more than positive ones.** An authorization bug is
  almost always *wrongly permitted*, not wrongly denied — and it fails
  silently, because nothing errors when a check is missing.
- **Cross-tenant tests deserve their own suite.** User in org A attempting
  every action in org B, expecting denial across the board.
- **A decision table** — (role, permission, resource, tenant) → expected
  outcome — is a compact way to cover a permission model thoroughly.
- **Shadow comparison in production** is the highest-value technique for a
  migration: run old and new authorization side by side without enforcing the
  new one, and compare. It catches the cases nobody thought to write a test
  for, which is most of the interesting ones.


## Building it

**Libraries**

| Need | Library | Why |
| --- | --- | --- |
| Test runner | `jest` | Already the assumed runner throughout this chapter |
| HTTP endpoint tests | `supertest` | Drives your Express/NestJS app in-process — no server to spin up |
| Real DB in integration tests | `testcontainers` | Spins up a real Postgres/Redis in Docker for the test run — the "real DB in a container" step in the CI/CD pipeline |

**Pseudocode — testing auth specifically, with supertest**

```ts
it('rejects a request with an expired token', async () => {
  const res = await request(app)
    .get('/entries/42')
    .set('Authorization', `Bearer ${expiredToken}`);
  expect(res.status).toBe(401);
});

it('denies cross-tenant access even with a valid token', async () => {
  const res = await request(app)
    .get('/orgs/acme/entries/42')
    .set('Authorization', `Bearer ${tokenForGlobex}`);
  expect(res.status).toBe(403);   // not 404 — don't leak existence either
});
```

---

## Interview Q&A

### Q: You mention 85% coverage. How do you keep that without writing meaningless tests?
**Level:** intermediate · **Tags:** testing, coverage

<details><summary>Model answer</summary>

By treating it as a floor rather than a target, because optimising the number
directly produces exactly the meaningless tests the question is about.

Coverage tells you what's definitely not tested. It doesn't tell you whether
what's covered is tested well — a test that executes a line without asserting
anything counts toward coverage and catches nothing.

So I'd spend effort where a bug is expensive: business logic, authorization,
anything touching money or data integrity — including the failure paths and
edge cases, which is where bugs actually live. I wouldn't chase coverage on
generated code, trivial getters or framework glue.

I'd also write tests against behaviour rather than implementation, so they
survive refactoring. A test that breaks whenever you tidy the code teaches the
team to resent tests.

If I could measure one thing instead of coverage it'd be **mutation score** —
deliberately break the code and see whether the tests notice. That measures
whether tests actually verify behaviour, which is what coverage only
approximates.

</details>

**Follow-ups:**

1. Q: Would you block a deploy on a coverage threshold?
   <details><summary>Answer</summary>

   As a ratchet, yes; as a hard target, no.

   What works: coverage must not *decrease*. New code comes with tests, and you
   can't quietly erode the suite. That catches the real problem — untested code
   sneaking in — without inviting gaming.

   What doesn't work: a hard "85% or the build fails" gate. People hit it by
   writing tests that execute code without asserting anything, and now the
   number is meaningless *and* you have a slower suite.

   I'd also apply the threshold to changed files rather than the whole
   repository. A legacy area at 40% shouldn't block an unrelated fix, but the
   code you just wrote should be covered.

   And I'd pair it with something qualitative — code review asking "does this
   test fail if the logic is wrong?", which is the question coverage can't ask.

   </details>

2. Q: What do you actually mock?
   <details><summary>Answer</summary>

   Boundaries — things outside my control or that make tests slow and
   non-deterministic. HTTP clients and third-party APIs, the clock and random
   number generators, the file system, email and payment providers.

   What I don't mock is my own internal code. If a test mocks three of my own
   classes, it's verifying that I called my mocks in the order I said I would,
   which passes happily while the real system is broken.

   For databases I lean toward the real thing in integration tests —
   containerised Postgres — because mocked database behaviour diverges from
   real behaviour in exactly the ways that cause bugs: constraints, transaction
   semantics, concurrency.

   The heuristic I use: if the mock has to encode meaningful behaviour, I'm
   probably mocking at the wrong level and should use the real dependency.

   </details>

### Q: How would you test an authorization system?
**Level:** senior · **Tags:** testing, authz

<details><summary>Model answer</summary>

The most important shift is that **negative cases matter more than positive
ones**. Authorization bugs are almost always wrongly-permitted rather than
wrongly-denied, and they fail silently — nothing errors when a check is
missing, it just allows.

I'd build a **decision table** as the core: combinations of role, permission,
resource and tenant mapped to expected allow or deny, driven as parameterised
tests. That covers a permission model compactly and makes gaps visible.

Then a dedicated **cross-tenant suite**: a user in org A attempting every
action in org B, expecting denial throughout. In multi-tenant systems that's
the failure class that ends up in an incident report, so it deserves its own
tests rather than being folded into general authz tests.

Then coverage of inheritance and edge cases — what happens with no role, an
unmapped group, a deleted resource, a revoked user with a valid token.

And for a migration, the highest-value technique is **shadow comparison**: run
the new authorization path alongside the old in production without enforcing
it, and compare decisions on real traffic. That catches the cases nobody
thought to write a test for, which is most of the interesting ones — and it's
what I'd want in place before switching a permission system over.

</details>

---

## What a weak answer sounds like

- **"We have 85% coverage"** with no view on what that does and doesn't tell
  you.
- **Coverage as a target.** Produces assertion-free tests.
- **Mocking everything.** Tests the mocks.
- **Only testing happy paths** — especially in authorization.
- **Claiming strict TDD always.** Rarely true, and interviewers can tell.

---

## Quiz

### MCQ: What does 100% code coverage actually guarantee?
- [ ] That every code path is tested for correctness
- [x] Only that every line was executed during the test run — it says nothing about whether the assertions actually verify correct behavior
- [ ] That no bugs exist in the covered code
- [ ] That mutation testing would also pass
**Why:** A test that calls a function and asserts nothing gets full coverage on that function while verifying nothing — coverage measures execution, not correctness.

### MCQ: What happens when coverage is used as a hard target ("must be 85% or the build fails") rather than a floor?
- [ ] Teams naturally write higher-quality tests to hit the number
- [x] People write assertion-free tests that execute code without verifying behavior, just to make the number increase — producing a suite that passes when the code is broken
- [ ] The build becomes slower but more reliable
- [ ] It has no real effect on test-writing behavior
**Why:** This is the core trap in citing a coverage number — optimizing the metric directly produces exactly the meaningless tests the metric was meant to prevent.

### MCQ: How does mutation testing measure something coverage cannot?
- [ ] It runs tests faster than a coverage tool
- [x] It deliberately alters the code (e.g. flipping `>` to `>=`) and checks whether any test fails — if none do, that code is executed but never actually verified
- [ ] It automatically generates new test cases
- [ ] It measures code complexity instead of test quality
**Why:** A line can be 100% covered yet have no test that would catch a real bug in it — mutation testing directly exposes that gap by injecting an actual defect and checking whether tests notice.

### MCQ: Why is asserting on internal implementation details (e.g. `expect(service._cache.get('key')).toBe(...)`) considered a brittle test?
- [ ] It runs slower than testing the public interface
- [x] It breaks whenever the internals are refactored, even if the externally observable behavior is unchanged — training the team to see tests as a tax rather than a safety net
- [ ] Private fields can't be accessed in JavaScript tests
- [ ] It only works with certain testing frameworks
**Why:** Testing behavior (what a caller actually experiences) rather than implementation lets the test survive refactors that don't change observable outcomes — which is the whole point of having a safety net.

### MCQ: Why is mocking your own internal classes (rather than external boundaries) considered over-mocking?
- [ ] It makes tests run more slowly
- [x] A test with several internal mocks ends up verifying that the mocks were called in the expected order, which can pass even while the real, unmocked system is broken
- [ ] Internal mocks aren't supported by most test frameworks
- [ ] It violates most style guides
**Why:** Mocking should happen at true boundaries (HTTP clients, the clock, payment providers) — mocking your own code means you're testing your assumptions about your own code, not the code itself.

### MCQ: Why is a flaky test described as "worse than no test"?
- [ ] Flaky tests take longer to write than reliable ones
- [x] It trains the team to re-run the pipeline instead of investigating failures — and once that habit forms, a genuine failure gets reflexively re-run too, rather than caught
- [ ] Flaky tests always indicate a bug in the test framework
- [ ] They consume more CI compute than passing tests
**Why:** This is why flaky tests should be quarantined out of the blocking gate immediately rather than left in — leaving them erodes the whole suite's authority to signal real problems.

### MCQ: What makes a coverage number a "floor" rather than just "a report," according to this chapter?
- [ ] Reporting it in the README instead of a dashboard
- [x] Enforcing it in the CI pipeline — a threshold that fails the build (applied to changed files, ideally as a never-decreases ratchet) — rather than just measuring it occasionally
- [ ] Running the coverage tool with `--verbose`
- [ ] Using a specific coverage measurement tool
**Why:** Sustaining a coverage number across releases is only possible if it's actively enforced in the pipeline — otherwise it drifts as untested code sneaks in unnoticed.

### MCQ: In authorization testing, why do negative test cases (verifying denial) deserve more weight than positive cases (verifying access is granted)?
- [ ] Negative cases are technically easier to write
- [x] Authorization bugs are almost always cases of wrongly *permitting* access rather than wrongly denying it, and they fail silently — nothing errors when a check is missing, it just allows
- [ ] Positive cases can't be automated
- [ ] Most authorization frameworks only support negative assertions
**Why:** A missing or broken check doesn't throw an exception — it just lets something through that shouldn't be — which is exactly the failure mode a suite weighted toward "prove this correctly denies" is designed to catch.

### MCQ: Why does a multi-tenant system need a dedicated cross-tenant test suite, separate from general authorization tests?
- [ ] Cross-tenant tests are required by most compliance frameworks
- [x] A user in one org accessing another org's resources is a specific, high-severity failure class that's easy to overlook in general authz tests but ends up in incident reports when missed
- [ ] It's the only way to test role-based permissions
- [ ] General authorization tests can't cover multiple tenants at all
**Why:** Explicitly testing "user in org A attempting every action in org B, expecting denial throughout" targets exactly the failure class most likely to cause a real security incident in a multi-tenant system.

### MCQ: What makes "shadow comparison" (running new authorization logic alongside old in production without enforcing it) the highest-value technique for a migration?
- [ ] It's faster to set up than writing new unit tests
- [x] It catches divergences on real production traffic that nobody thought to write a test for — exactly the cases that are hardest to anticipate in advance
- [ ] It automatically fixes any discrepancies it finds
- [ ] It replaces the need for a decision table entirely
**Why:** Unit tests and decision tables cover cases you thought of; shadow comparison surfaces the cases you didn't, by comparing real decisions against real traffic before the new logic is trusted to enforce anything.

---

## Glossary

- **Test pyramid** — many fast unit tests, fewer slow E2E ones.
- **Coverage** — lines executed by tests; a floor, not a target.
- **Mutation testing** — break the code deliberately, see if tests fail.
- **Test double** — mock, stub, spy, fake.
- **Flaky test** — passes and fails without code changes; worse than no test.
- **Test automation** — the suite running on its own trigger (hook, PR,
  merge, deploy) rather than because someone remembered.
- **Quarantine** — moving a flaky test out of the blocking gate so it stops
  training people to ignore failures.
- **Coverage gate** — a threshold that fails the build; what makes a
  coverage number a floor rather than a report.
- **Decision table** — inputs mapped to expected outcomes, run as parameters.
- **Shadow comparison** — run new logic alongside old, compare, don't enforce.
