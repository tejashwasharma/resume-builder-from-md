# Gyrix TechnoLabs — experience stories

**Software Engineer** · Feb 2019 – Sep 2020 (incl. 2-month internship)

Your first role. Three stories covering all 5 resume bullets, every follow-up
answered.

Interviewers rarely dig hard into a first job seven years on — but two bullets
carry hard numbers, and any number on your resume is fair game.

---

## Story 1 — CI/CD automation

*Covers bullet 1.*

**Situation.** Deployments took 2–3 hours, were manual, and were therefore
error-prone.

**Action.** Built CI/CD pipelines to automate the release path.

**Result.** 2–3 hours → **under 30 minutes**; manual deploy errors eliminated.

### Where the time goes

```
  BEFORE (2-3 hrs, manual)              AFTER (<30 min, automated)
  ────────────────────────              ──────────────────────────
  build locally         ~20m            ┌─ commit ─┐
  run tests by hand     ~30m            │          ▼
  copy artifacts        ~15m            │   build + test (parallel)   ~8m
  config by hand        ~20m            │          ▼
  deploy, watch         ~30m            │   artifact + config baked   ~4m
  smoke test manually   ~20m            │          ▼
  fix what broke        ~???            │   deploy + smoke (scripted) ~10m
                                        └─ rollback on failure ───────┘
  ↑ each step a chance to               ↑ same steps, but repeatable,
    forget or mistype                     and failure is automatic
```

The insight worth saying: automation didn't make the steps faster so much as
it removed waiting, context-switching, and the rework caused by mistakes.

### Q: What was taking 2–3 hours?
**Level:** foundation · **Tags:** cicd, automation

<details><summary>Model answer</summary>

Not one slow step — a chain of manual ones, each with waiting and
context-switching around it: building locally, running tests by hand and
waiting to read them, copying artifacts to the server, editing config by hand,
restarting services, then manually clicking through to check it worked.

The real cost wasn't the wall-clock of each step, it was that a human had to
be present and attentive throughout, and any mistake meant restarting. Manual
config editing in particular is where errors came from — a typo'd environment
variable that isn't discovered until the smoke test.

Automating it compressed the mechanical parts, parallelised build and test,
and — the actual win — made the process repeatable, so it stopped consuming a
person's afternoon and stopped failing for avoidable reasons.

</details>

**Follow-ups:**

1. Q: How did you handle rollbacks?
   <details><summary>Answer</summary>

   Automating deploys without automating rollback is half a solution — you've
   made it easy to ship a bad release quickly.

   The approaches: **redeploy the previous artifact**, which requires versioned
   immutable artifacts rather than building from a branch, so you can always
   name the exact thing that was running. **Blue-green** — the old version
   stays up, you switch traffic back instantly, which is the fastest but needs
   double capacity. **Canary** — route a small percentage first, so a bad
   release is caught while most users are unaffected.

   The part people forget is **database migrations**, which usually can't be
   rolled back safely. The discipline is backward-compatible migrations
   deployed separately from code: add a column, deploy code that writes both
   old and new, backfill, then remove the old — so at every point you can roll
   the *code* back without the schema being wrong.

   </details>

2. Q: What was still manual afterwards?
   <details><summary>Answer</summary>

   Honest scoping, and it's a better answer than claiming full automation.

   Typically remaining: production release *approval* — deliberately manual as
   a gate, not an oversight. Database migrations, often run deliberately.
   Infrastructure provisioning, if it predated infrastructure-as-code. And
   rollback decisions, which are usually a human call even when the mechanism
   is scripted.

   Distinguishing "still manual because we hadn't got to it" from
   "deliberately manual as a control" is the difference —
   they're different kinds of incomplete.

   > **FILL IN:** which tool — Jenkins or GoCD? Both are on your resume; know
   > which was here. And what the pipeline stages actually were.

   </details>

3. Q: How would you build this today?
   <details><summary>Answer</summary>

   Tests whether you've kept current rather than repeating what you did in
   2019.

   The shape now: **containerised builds** so the build environment is
   identical everywhere, removing "works on the build agent". **A managed CI
   runner** — GitHub Actions, GitLab CI — rather than a Jenkins box someone
   maintains. **Infrastructure as code** so environments are reproducible.
   **Immutable artifacts** promoted through environments rather than rebuilt
   per environment, so what you tested is literally what ships. **Progressive
   delivery** — canary or blue-green with automated rollback on error-rate
   thresholds, so rollback doesn't wait for a human to notice.

   And the deeper change: deploy and release become separate. Feature flags
   mean shipping code and enabling behaviour are different decisions, which
   makes deploys boring and frequent — which is the actual goal.

   </details>

---

## Story 2 — AngularJS → React micro-frontend migration

*Covers bullet 2.*

**Situation.** A legacy AngularJS UI with poor load performance.

**Action.** Migrated to a React micro-frontend architecture.

**Result.** Load time **3–4s → under 1.5s**.

### Strangler fig, not big bang

A router sits in front on the same URL the user always used. Per route, it
decides: not migrated yet → serve the legacy AngularJS shell; migrated → serve
the React app. Routes move across one at a time, and when the last one has
moved the AngularJS shell is deleted.

At no point is there a big-bang cutover — every one of those steps ships to
production on its own, and the user never sees which side served them. Every
intermediate state is shippable. That is the entire argument.

### Q: Why micro-frontends rather than a straight rewrite?
**Level:** intermediate · **Tags:** migration, architecture, frontend

<details><summary>Model answer</summary>

Because a big-bang rewrite means a long period with no shippable product, and
the business keeps needing features throughout. You end up either freezing
feature work — which nobody will agree to — or maintaining two codebases in
parallel and implementing everything twice.

Incremental migration lets you move one route at a time. Each step is
releasable, the risk per step is small, and if priorities change you stop with
a working system rather than a half-finished rewrite. It's the strangler fig
pattern: the new implementation grows around the old until the old can be
removed.

It also de-risks the bet. If React turned out to be the wrong choice, you'd
have found out after one route rather than after a year.

</details>

**Follow-ups:**

1. Q: How did AngularJS and React coexist during the migration?
   <details><summary>Answer</summary>

   Two integration levels, and which you pick shapes everything else.

   **Route-level split** is the simpler one: the router decides which
   framework owns a page, and they never coexist on screen. Clean separation,
   no interop, but a full page load when crossing the boundary.

   **Component-level** means mounting React components inside AngularJS
   templates — real interop, and the hard part is state and lifecycle. Two
   frameworks each thinking they own the DOM subtree and the digest cycle
   fighting React's render cycle is where the bugs live.

   Shared state is the other question. Options: keep it in the URL, which is
   crude but robust; a shared store outside both frameworks that each
   subscribes to; or an event bus. The URL approach is underrated during a
   migration precisely because it doesn't couple the frameworks.

   The cost either way is bundle size — you're shipping both frameworks during
   the transition, so the migration period is temporarily *heavier*, which is
   worth acknowledging.

   </details>

2. Q: Where did the load-time improvement actually come from?
   <details><summary>Answer — be careful</summary>

   Careful here: **React is not naturally faster than AngularJS**, and
   claiming the framework change caused the improvement is the answer an
   interviewer will push on.

   The real sources in a migration like this: **code splitting and lazy
   loading**, so the initial bundle carries only what the first route needs
   rather than the whole app — usually the single biggest factor. **A smaller
   framework runtime**, since AngularJS's digest cycle and two-way binding
   carry real cost. **Dropping accumulated legacy weight** — old dependencies,
   dead code, polyfills for browsers nobody uses. And **build tooling**,
   because modern bundling with tree-shaking and modern output targets produces
   substantially smaller bundles regardless of framework.

   The honest framing: the rewrite was the *opportunity* to fix loading
   strategy, and most of the win came from that rather than from React itself.
   Saying so is a stronger answer than crediting the framework.

   > **FILL IN:** which of these it actually was. "We used React" is not an
   > answer to "why did it get faster".

   </details>

3. Q: What are the downsides of micro-frontends?
   <details><summary>Answer</summary>

   Every architecture question wants the cost, not just the benefit.

   **Duplicate dependencies** — each micro-frontend bundling its own copy of
   shared libraries, so total payload grows. Module federation or shared
   externals help, at the price of coupling versions.

   **Version skew** — two parts of the same page running different versions of
   a shared library or design system, which produces visual inconsistency and
   subtle bugs.

   **Harder shared state** — anything genuinely global (auth, user, theme)
   needs a mechanism outside the frameworks.

   **Operational complexity** — more builds, more deploys, more to reason about.

   **Inconsistent UX** if teams diverge on patterns.

   And the honest one: micro-frontends solve an *organisational* problem —
   letting independent teams ship independently. If you're one team, you're
   paying that cost for no benefit, and a well-structured single app is better.
   For a migration they're justified as a transitional architecture, which is
   a different argument from adopting them permanently.

   </details>

---

## Story 3 — Client delivery and full-stack work

*Covers bullets 3, 4, 5.*

**Situation.** Two client platforms, both Sweden-based — futureskill (edtech,
course delivery) and softwareskills (a job application platform).

**Action.** Delivered full-stack features — APIs, user management, frontend
workflows. Maintained 80%+ test coverage. Ran biweekly client demos for both
platforms across the 19-month engagement.

### Q: How do you maintain 80% coverage without writing meaningless tests?
**Level:** intermediate · **Tags:** testing, coverage, quality

<details><summary>Model answer</summary>

The trap in the question is that coverage is a proxy, not a goal — and
optimising the proxy directly produces exactly the meaningless tests it's
asking about.

Coverage tells you what is definitely *not* tested. It says nothing about
whether what's covered is tested *well*: a test that executes a line without
asserting anything meaningful contributes to coverage and catches nothing.

What I'd actually aim for: cover the code where a bug would be expensive —
business logic, auth, money, data integrity — thoroughly, including edge cases
and failure paths. Don't chase coverage on generated code, trivial getters, or
framework glue. Write tests against behaviour rather than implementation, so
they survive refactoring; a test asserting internals breaks every time you
tidy the code and teaches the team that tests are a tax.

Used as a floor to catch untested areas, 80% is a reasonable guard. Used as a
target to hit, it produces assertion-free tests that make the number go up.

If I could measure one thing instead, it'd be mutation score — does the suite
actually fail when the code is wrong — because that measures what coverage
only gestures at.

</details>

**Follow-ups:**

1. Q: Biweekly demos for 19 months — what did you learn about client communication?
   <details><summary>Answer</summary>

   That the demo cadence is a risk-control mechanism, not a reporting ritual.

   Biweekly demos surface misalignment while it's cheap. A client seeing the
   feature at week one says "that's not what I meant" when a day's work is at
   stake; a client seeing it at month three says the same sentence about three
   months of work. Most requirements misunderstandings are only visible in
   something running.

   The practical lessons: demo working software rather than describing
   progress, because "we're 80% done" means nothing and a running screen means
   everything. Show the incomplete version rather than hiding it until it's
   polished — you get correction while it's still cheap to act on. And write
   down decisions made in the demo, because verbal agreement evaporates.

   It also builds the trust that lets you push back later. A client who's seen
   steady progress for months believes you when you say something will take
   longer.

   </details>

2. Q: Tell me about a time a client didn't like what you'd built.
   <details><summary>Answer — structure to fill</summary>

   The structure that works: what they asked for, what you built, why it
   didn't match, what you did about it, and what you changed so it didn't
   recur.

   The key move is treating it as a requirements failure rather than a blame
   question. Most of these are ambiguity that was never resolved — the client
   pictured one thing, you pictured another, and nothing in the process forced
   the difference into the open early.

   What makes the answer strong is the systemic fix: earlier demos, clarifying
   questions before starting, wireframes rather than descriptions for anything
   visual.

   > **FILL IN:** your example. This is a very common question in
   > consultancy-background interviews.

   </details>

3. Q: You were early-career here — what would you do differently now?
   <details><summary>Answer</summary>

   Growth-reflection question, and an easy win if you've thought about it.

   Honest candidates usually land on: asking more questions earlier rather
   than assuming the requirement was clear; pushing back on unrealistic
   timelines instead of absorbing them silently and working late; writing
   tests as they went rather than after; and communicating problems sooner —
   the instinct early on is to hide being stuck until you've solved it, which
   is exactly backwards.

   The technical version: understanding *why* a pattern is used rather than
   copying it, and thinking about operability — logging, monitoring,
   debuggability — as part of building rather than after an incident.

   </details>

---

## A note on this era

Seven years on, these stories matter less for technical depth than for
**trajectory**. The useful framing is what this role taught you that you still
use: automate the painful thing, migrate incrementally rather than rewriting,
show stakeholders working software early.

If asked "why did you leave Gyrix?", the arc is clean: agency/services work →
product work with more ownership → platform work at Contentstack. That
progression tells itself.
