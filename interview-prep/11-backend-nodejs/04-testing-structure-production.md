# Testing, structure and production

The service runs. This chapter is what stands between that and running it for
other people: how it is tested, how it is laid out so it stays changeable, and
what has to be true before it takes real traffic.

---

## In brief

- **Test at the handler level for most of your coverage.** A test that runs the
  real middleware chain against a fake repository covers routing, validation,
  auth and error mapping at once, in milliseconds — far more value per test
  than either pure unit tests or full integration tests.
- **Node has a built-in test runner** (`node --test`), and for a service it is
  enough. Reach for Vitest when you want watch mode, a richer assertion
  library, or to share config with a frontend.
- **Dependency injection without a framework is a function parameter.**
  `buildApp({ repo, clock, log })` makes every test trivial and needs no
  container, no decorators and no magic.
- **Fake the clock and ids, never the thing under test.** A test that asserts
  on a real `Date.now()` or a random id is a test that fails on a Tuesday.
- **Containerise multi-stage**: build with the toolchain, ship a slim runtime
  image with no compilers and no source. Run as a non-root user.
- **One process per container, no PM2.** The orchestrator already supervises
  and restarts; a supervisor inside the container means two things disagree
  about what "healthy" means.
- **The production checklist is short and nobody does all of it**: timeouts on
  every outbound call, bounded pools, graceful shutdown, structured logs with a
  request id, a health and a readiness endpoint, resource limits, and an alert
  on something a user would notice.

---

## Testing

### The shape

```
       /\        a few integration tests  — real database, real SQL, slow
      /  \
     /----\      a solid layer of handler tests — real middleware, fake repo
    /      \
   /--------\    many unit tests — pure rules, no I/O
```

The middle layer is the one people under-use and it carries the most weight:
it exercises the pipeline a user actually hits, without the cost of real
infrastructure.

### Unit: the rules

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('a link id is url-safe and short enough to type', () => {
  const id = makeId();
  assert.match(id, /^[A-Za-z0-9_-]{7}$/);
});

test('rejects a non-http scheme', () => {
  assert.throws(() => CreateLink.parse({ url: 'javascript:alert(1)' }));
});
```

No HTTP, no database, no mocks — if a "unit" test needs three mocks, the thing
under test is doing too much.

### Handler level: the real chain, a fake repository

```ts
// The app is a function of its dependencies. This one line is the entire
// dependency-injection story for a service of this size.
export function buildApp(deps: { repo: LinkRepo; clock: Clock; log: Logger }) { /* … */ }

test('POST /links validates, authorises and returns 201', async (t) => {
  const repo = inMemoryRepo();
  const app = buildApp({ repo, clock: fixedClock('2026-01-01T00:00:00Z'), log: silentLog });

  const res = await request(app)
    .post('/links')
    .set('authorization', `Bearer ${testToken({ tenant: 't1', scope: 'links:write' })}`)
    .send({ url: 'https://example.com' });

  assert.equal(res.status, 201);
  assert.equal(repo.saved.length, 1);
  assert.equal(repo.saved[0].tenantId, 't1');     // tenancy came from the token, not the body
});

test('POST /links without a token is 401 and does not reach the repo', async () => {
  const repo = inMemoryRepo();
  const res = await request(buildApp({ repo, clock, log })).post('/links').send({ url: 'https://x.com' });
  assert.equal(res.status, 401);
  assert.equal(repo.saved.length, 0);             // the valuable half of the assertion
});

test('a bad url is 400 with field-level detail', async () => {
  const res = await request(app).post('/links').set(auth).send({ url: 'nope' });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'validation_failed');
  assert.equal(res.body.details[0].path, 'url');
});
```

The second test is the one worth copying: asserting that an unauthorised
request **did not reach the repository** tests the ordering of the middleware
chain, which is the thing most likely to be broken by a refactor.

### Integration: prove the SQL

```ts
// One container, started once for the file. Few of these — they are slow, and
// their job is only to prove the queries and migrations are right.
test('createLink persists and reads back', async (t) => {
  const db = await startPostgresContainer();
  t.after(() => db.stop());
  await migrate(db.url);

  const repo = sqlRepo(new Pool({ connectionString: db.url }));
  const link = await repo.create({ url: 'https://example.com' }, 'tenant-1');
  assert.equal((await repo.get(link.id))?.url, 'https://example.com');
});
```

### The things that make tests flaky

| Flake | Cause | Fix |
| --- | --- | --- |
| Passes alone, fails in the suite | Shared state between tests | A fresh fake per test; truncate between integration tests |
| Fails at midnight or month end | Real `Date.now()` | Inject a clock |
| Fails randomly | Real random ids, real network | Inject an id generator; no network in unit or handler tests |
| Fails on CI only | Timing assumptions, slower machine | Await events rather than sleeping |
| Fails after unrelated changes | Asserting on a whole response object | Assert the fields you mean |

**On coverage**: it measures which lines ran, not whether anything was checked.
It is a floor worth enforcing to catch untested files, not a target to optimise.
The full argument, and how to defend a number out loud, is in
[testing and TDD](../05-testing/01-testing-and-coverage.md).

---

## Structure that survives

```
src/
  main.ts              # compose and listen; no logic
  config.ts            # validated env, exits on failure
  http/
    server.ts          # middleware order, in one readable list
    middleware/        # requestId, logging, auth, validate, errors
    routes/links.ts    # HTTP shape only: parse, call, respond
  domain/links.ts      # the rules; no req, no SQL, no framework imports
  db/links.repo.ts     # SQL; the only file that knows the schema
  lib/                 # logger, ids, errors, clock
test/
```

**The dependency rule, which is the whole point:** `http` may import `domain`,
`domain` may import nothing from `http` or `db` (it takes interfaces), and `db`
implements what `domain` declares. Dependencies point inwards, towards the
rules.

Two checks that tell you it is holding:

- Can a domain function be called from a background worker or a CLI with no
  HTTP in sight? If not, HTTP concerns have leaked into the rules.
- Can a handler be tested without a database? If not, SQL has leaked upwards.

**Dependency injection** is a parameter. `buildApp({ repo, clock, log })` beats
any container at this size: it is explicit, type-checked, and a test supplies a
different object. NestJS's DI earns its keep when there are many modules and
many teams; below that it is ceremony.

**What goes in `main.ts`** and nowhere else: reading config, constructing the
pool and the logger, wiring them into the app, listening, and registering the
shutdown handler. If `main.ts` has business logic, it is a file nobody can test.

---

## Packaging

```dockerfile
# Build stage: full toolchain, dev dependencies, type check and compile.
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci                       # cached unless the lockfile changes
COPY . .
RUN npm run build && npm prune --omit=dev

# Runtime stage: no compiler, no source, no dev dependencies.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node                        # never root
EXPOSE 3000
CMD ["node", "dist/main.js"]     # exec form: node is PID 1 and receives SIGTERM
```

Four details that matter more than they look:

- **`CMD` in exec form, not `npm start`.** Through npm, your process is a child
  and does not receive SIGTERM — so graceful shutdown never runs and every
  deploy drops requests. This is the most common packaging bug in Node
  services.
- **Copy the lockfile and install before copying source**, so a code change does
  not reinstall every dependency.
- **`npm ci`, not `npm install`**, so the build is reproducible from the
  lockfile.
- **No secrets in the image.** Anything in a layer is readable by anyone who can
  pull it, and a later layer deleting it does not remove it from history.

**One process per container.** PM2 inside a container means two supervisors with
different opinions; the orchestrator restarts unhealthy containers and scales by
running more of them. The cluster module is for a single VM, not for a pod — and
the reasoning is in
[containers, properly](../06-cloud-devops/06-containers.md).

---

## Running it

**Observability**: structured JSON logs with the request id on every line,
RED metrics (rate, errors, duration) per endpoint, and traces that carry the
same id across services. What to alert on — symptoms a user notices, not causes
— is in [observability, SLOs and operations](../02-interview-core/30-observability-slos-and-operations.md).

**Node-specific things worth watching**, because they do not show up in CPU:

| Signal | Why it matters |
| --- | --- |
| **Event-loop lag** | The one metric unique to Node: rising lag means something is blocking the loop, and every endpoint gets slower at once |
| **Heap used vs limit** | A leak shows as a sawtooth that never returns to baseline |
| **Active handles / sockets** | Growing without bound means connections are not being released |
| **Pool wait time** | Requests queueing for a connection, before any query runs |

**The checklist before real traffic:**

- [ ] Every outbound call has a connect timeout, a request timeout and a bounded pool
- [ ] Graceful shutdown: readiness fails first, then drain, then close
- [ ] `/healthz` shallow, `/readyz` meaningful and separate
- [ ] Config validated at startup; the process exits on a bad value
- [ ] Structured logs with a request id; credentials redacted at the logger
- [ ] Resource requests and limits set, and the memory limit above the heap limit
- [ ] An alert on error rate and latency, pointing at a runbook
- [ ] A load test that found the first bottleneck rather than confirming it is fast

---

## Interview Q&A

### Q: How do you test an HTTP service, and where do most of your tests live?
**Level:** intermediate · **Tags:** nodejs, testing

<details><summary>Model answer</summary>

Most of them at the handler level: build the app with its real middleware chain
but a fake repository, and drive it with a test HTTP client. One test then
covers routing, validation, authentication, authorization and error mapping,
and it runs in milliseconds because there is no database.

Under that, unit tests for the rules — pure functions, no I/O, no mocks. If a
unit test needs three mocks, the thing it is testing is doing too much and the
test is telling me about the design.

Above it, a small number of integration tests against a real database in a
container, whose only job is proving the SQL and the migrations are right.
They are slow, so there are few of them and they do not duplicate the handler
tests.

The assertion I find most valuable is the negative one: that an unauthorised
request *did not reach the repository*. That tests middleware ordering, which
is exactly what a refactor silently breaks.

And I inject the clock and the id generator, because a test that asserts on a
real timestamp or a random id is a test that fails on a Tuesday for no reason.

</details>

**Follow-ups:**

1. Q: How do you decide what to mock?
   <details><summary>Answer</summary>

   Mock at the boundary you own — the repository interface, an email sender, a
   payment client — and not the internals of your own code. Mocking a function
   two layers down couples the test to the implementation, so a refactor that
   changes nothing observable breaks a hundred tests, which is how a suite
   becomes something people disable.

   For things you do not own, prefer a fake that behaves like the real thing (an
   in-memory repository honouring the same interface) over an assertion that a
   method was called with particular arguments. Behaviour over interaction.

   </details>

### Q: Your Node service in Kubernetes drops requests on every deploy. Walk me through the causes.
**Level:** senior · **Tags:** nodejs, operations, shutdown

<details><summary>Model answer</summary>

Three candidates, and I would check them in this order.

First, whether the process receives SIGTERM at all. If the container's command
is `npm start`, node runs as a child of npm, npm is PID 1, and the signal does
not reach node — so the shutdown handler never runs. The fix is the exec form,
`CMD ["node", "dist/main.js"]`.

Second, whether shutdown is sequenced correctly. Removal from the Service's
endpoints is eventually consistent, so a process that closes its listener the
instant it is signalled is still receiving traffic. The order has to be: fail
readiness, wait a few seconds, stop accepting new connections while in-flight
requests finish, then close the pool, then exit — with a hard timer so a stuck
request cannot hold it open.

Third, whether readiness and liveness are the same endpoint. If they are,
failing readiness to drain also tells the orchestrator the process is wedged,
and it kills it mid-drain.

The related one, if the errors are at startup rather than shutdown: no startup
probe, so traffic arrives before the app has finished booting.

</details>

### Q: Why one process per container rather than PM2 or the cluster module?
**Level:** intermediate · **Tags:** nodejs, containers, operations

<details><summary>Answer</summary>

Because the orchestrator is already the supervisor, and two supervisors
disagree. If PM2 restarts a wedged worker inside the container, the container
stays "up" from the platform's point of view, so the platform's health
accounting is now wrong — and scaling decisions are made on that accounting.

The platform's model is: one container, one process, and more replicas when you
need more capacity. That also gives you per-instance metrics, rolling updates
and bin-packing, none of which work properly when a container is secretly
several processes.

The cluster module has a legitimate home — a single VM where you want to use all
the cores of one machine and nothing else is managing processes. In a pod you
set replicas instead, and give each pod a CPU limit, because a Node process
using one core is exactly what the scheduler's accounting assumes.

</details>

---

## What a weak answer sounds like

- **"We have 90% coverage"** as the answer to how a service is tested.
- **Everything mocked**, so the tests pass and the wiring is untested.
- **No handler-level tests** — only pure units and slow end-to-end tests.
- **`npm start` as the container command**, so SIGTERM never arrives.
- **PM2 inside a pod.**
- **Business logic in `main.ts`**, or SQL in a route handler.
- **No event-loop lag metric**, and no idea why "the CPU is fine but everything
  is slow".

---

## Quiz

### MCQ: Which layer of tests gives a service the most value per test?
- [ ] Pure unit tests of individual functions
- [x] Handler-level tests that run the real middleware chain against a fake repository — one test covers routing, validation, auth and error mapping, in milliseconds
- [ ] Full end-to-end tests through a deployed environment
- [ ] Snapshot tests of response bodies
**Why:** It exercises the pipeline a user actually hits without the cost of real infrastructure. Units below it test rules; a few integration tests above it prove the SQL.

### MCQ: Why is `CMD ["npm", "start"]` a problem in a container?
- [ ] npm is not available in slim images
- [x] node runs as a child of npm, so SIGTERM goes to npm and never reaches the application — the graceful shutdown handler never runs, and every deploy drops in-flight requests
- [ ] It makes the image significantly larger
- [ ] npm rewrites the process's environment variables
**Why:** The exec form makes node PID 1 and the direct signal recipient. It is the most common packaging bug in Node services, and it looks like a load-balancer problem from the outside.

### MCQ: What does asserting "an unauthorised request did not reach the repository" actually test?
- [ ] The repository's error handling
- [x] Middleware ordering — that authentication runs before anything that touches data, which is exactly what a refactor silently breaks
- [ ] The token signing algorithm
- [ ] Database connection pooling
**Why:** Asserting the 401 alone would pass even if the handler had already written to the database before the check. The negative assertion is what makes the ordering guarantee real.

### MCQ: Which metric is unique to Node and most likely to explain "the CPU is fine but everything is slow"?
- [ ] Garbage collection count
- [x] Event-loop lag — a blocked loop delays every pending callback at once, so all endpoints degrade together while CPU may look unremarkable
- [ ] Open file descriptors
- [ ] Disk IOPS
**Why:** Node handles all requests on one loop, so anything synchronous and slow — a large JSON parse, a sync crypto call, a tight loop — becomes everyone's latency. The runtime chapter has the mechanism.

### MCQ: What is the dependency rule that keeps the layout testable?
- [ ] Every layer may import every other layer, for convenience
- [x] Dependencies point inwards: HTTP may import domain, domain imports neither HTTP nor the database, and the database layer implements interfaces the domain declares
- [ ] The database layer owns the domain model
- [ ] All code lives in one module to avoid circular imports
**Why:** The two tests of whether it holds: a domain function callable from a worker or CLI with no HTTP, and a handler testable without a database.

---

## Glossary

- **Handler-level test** — drives the real middleware chain with a fake repository; the highest-value test layer for a service.
- **Fake vs mock** — an implementation that behaves like the real thing, versus an assertion that a method was called.
- **Injected clock** — a time source passed in, so tests are deterministic.
- **Multi-stage build** — compile in a full image, ship only the artefact in a slim one.
- **Exec form `CMD`** — `["node", "dist/main.js"]`, so the app is PID 1 and receives signals.
- **Event-loop lag** — delay between a callback being scheduled and running; Node's clearest saturation signal.
- **RED metrics** — rate, errors, duration; the per-endpoint trio worth alerting on.
- **Dependency rule** — dependencies point inwards towards the rules, which is what keeps them testable.
