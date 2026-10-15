# Testing, structure and production

What stands between a FastAPI app that runs locally and one that other people
depend on: pytest, a layout that keeps the rules testable, a container that
shuts down cleanly, and the handful of things to watch once it is live.

---

## In brief

- **pytest with fixtures is the whole testing story.** Plain `assert`, fixtures
  for setup, and `dependency_overrides` to swap the database and the user for
  fakes — no mocking framework needed for most tests.
- **Most tests go through the ASGI transport**, not a real port: `httpx` with
  `ASGITransport` runs the real middleware, dependencies and error handlers in
  process, in milliseconds.
- **`dependency_overrides` is Python's unfair advantage here.** Injection is
  built into the framework, so a test swaps a session or a user with one line
  and no monkeypatching.
- **Keep FastAPI out of `domain/`.** If the rules import the framework they
  cannot be called from a Celery worker or a management command, and they
  cannot be tested without constructing a request.
- **One Uvicorn worker per container**, scaled with replicas — not four workers
  inside one container, which hides failures from the orchestrator.
- **`--timeout-graceful-shutdown` plus readiness-fails-first** is what stops
  deploys dropping requests.
- **Watch event-loop lag, pool wait time and worker restarts.** CPU and memory
  will not tell you a blocking call is stalling the loop.

---

## Testing

### Fixtures, and the shape of a test suite

```python
# conftest.py — fixtures here are available to every test file.
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.deps import db_session, current_user
from app.domain.models import User

@pytest.fixture
def repo():
    return InMemoryLinkRepo()

@pytest.fixture
async def client(repo):
    app.dependency_overrides[db_session] = lambda: repo
    app.dependency_overrides[current_user] = lambda: User(
        id="u1", tenant_id="t1", scopes=["links:write", "links:read"])
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()        # or the next test inherits them
```

```python
# tests/test_links.py
async def test_creates_and_reads_back(client, repo):
    created = (await client.post("/links", json={"url": "https://example.com"})).json()
    fetched = await client.get(f"/links/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["url"] == "https://example.com/"

async def test_rejects_bad_url_with_field_detail(client):
    r = await client.post("/links", json={"url": "nope"})
    assert r.status_code == 422
    assert r.json()["detail"][0]["loc"][-1] == "url"

async def test_without_scope_is_403_and_writes_nothing(client, repo):
    app.dependency_overrides[current_user] = lambda: User(id="u1", tenant_id="t1", scopes=[])
    r = await client.post("/links", json={"url": "https://example.com"})
    assert r.status_code == 403
    assert repo.saved == []          # proves the dependency ran before the handler
```

The third test is the valuable one. Asserting only the 403 would pass even if
the handler had already written; asserting that **nothing reached the
repository** is what tests the ordering, which is exactly what a refactor
breaks silently.

### Parametrising, instead of copy-paste

```python
@pytest.mark.parametrize("url,status", [
    ("https://example.com", 201),
    ("http://example.com", 201),
    ("javascript:alert(1)", 422),
    ("ftp://example.com", 422),
    ("", 422),
])
async def test_url_validation(client, url, status):
    assert (await client.post("/links", json={"url": url})).status_code == status
```

### Integration, sparingly

```python
# Real Postgres in a container. Few of these; their job is to prove the SQL and
# the migrations, not to re-test the handlers.
@pytest.fixture(scope="session")
async def database():
    with PostgresContainer("postgres:16") as pg:
        await run_migrations(pg.get_connection_url())
        yield pg.get_connection_url()

async def test_repo_round_trips(database):
    repo = SqlLinkRepo(create_async_engine(database))
    link = await repo.create(Link(id="abc", url="https://example.com", tenant_id="t1"))
    assert (await repo.get("abc")).url == "https://example.com"
```

### Determinism

| Flake | Cause | Fix |
| --- | --- | --- |
| Passes alone, fails in the suite | `dependency_overrides` not cleared, module-level state | Clear in the fixture teardown; avoid module globals |
| Fails at month end | Real `datetime.now()` | Inject a clock, or `freezegun` |
| Fails randomly | Real ids, real network | Inject an id factory; no network in unit or handler tests |
| Async tests not running | Missing `asyncio_mode` | `asyncio_mode = "auto"` in `pyproject.toml` |

---

## Structure

```
app/
  main.py              # create_app(), include routers, lifespan — no logic
  config.py            # Settings; raises at import on a bad env
  api/
    deps.py            # current_user, require_scope, db_session
    middleware.py      # request id, logging — the order in one list
    errors.py          # exception types and handlers
    routes/links.py    # HTTP shape only
  domain/
    models.py          # dataclasses; no FastAPI, no SQLAlchemy
    links.py           # the rules, as plain functions
  db/
    models.py          # SQLAlchemy tables
    links_repo.py      # queries; the only module that knows the schema
  lib/logging.py
tests/
  conftest.py
pyproject.toml
```

**The import rule:** `api` may import `domain`; `domain` imports neither `api`
nor `db` — it declares `Protocol` interfaces and takes implementations as
arguments; `db` implements those protocols. Dependencies point inwards.

```python
# domain/links.py — no framework, no I/O. Testable with no fixtures at all.
from typing import Protocol

class LinkRepo(Protocol):
    async def create(self, link: Link) -> Link: ...
    async def get(self, link_id: str) -> Link | None: ...

async def create_link(repo: LinkRepo, url: str, tenant_id: str, make_id) -> Link:
    if len(url) > 2048:
        raise ValidationError("url too long")
    return await repo.create(Link(id=make_id(), url=url, tenant_id=tenant_id))
```

Two checks that the layering holds: can `create_link` be called from a Celery
task with no HTTP in sight, and can a route be tested without a database?

**Migrations** belong in the repository and in CI: Alembic, autogenerate
reviewed by a human (it misses renames and constraints), applied as a separate
step before the new version rolls out — never by the app on startup, where
several replicas race each other.

---

## Packaging

```dockerfile
# Build stage: compile wheels, including anything with C extensions.
FROM python:3.12-slim AS build
WORKDIR /app
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml ./
RUN pip wheel --wheel-dir /wheels .      # cached unless dependencies change

# Runtime stage: no compiler, no build tools.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
COPY --from=build /wheels /wheels
RUN pip install --no-index --find-links=/wheels /wheels/*.whl && rm -rf /wheels
COPY app ./app
RUN useradd --no-create-home appuser && chown -R appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--timeout-graceful-shutdown", "20"]
```

Four details:

- **`PYTHONUNBUFFERED=1`** or your logs appear only when the buffer flushes,
  which during a crash means they never appear at all.
- **Exec-form `CMD`**, so Uvicorn is PID 1 and receives SIGTERM — the same trap
  as `npm start` in the Node track.
- **`--timeout-graceful-shutdown`** bounds the drain so a stuck request cannot
  hold a deploy open indefinitely.
- **Non-root user**, and no build toolchain in the final image.

**One worker per container.** Running `-w 4` inside a container hides three
failures from the orchestrator: a wedged worker leaves the container "up", per
worker metrics are invisible, and memory limits apply to the sum rather than
the process. Scale with replicas and let the platform do the accounting.

---

## Running it

**What to watch, beyond CPU and memory:**

| Signal | Why |
| --- | --- |
| **Event-loop lag** | The Python equivalent of Node's: schedule a callback every 100ms and record how late it fires. Rising lag means something is blocking the loop |
| **Pool wait time / checkouts** | Requests queueing for a connection before any query runs |
| **Worker restarts** | A worker killed by the OOM killer or a timeout; invisible if you only watch the service's aggregate |
| **p99 by endpoint** | Averages hide exactly the tail that users notice |
| **Unhandled exception rate** | Should be near zero; a rise is a bug reaching production, not a capacity problem |

**Profiling when it is slow:** `py-spy` is the tool worth knowing — it attaches
to a running process without restarting it or adding instrumentation, and
`py-spy dump --pid <pid>` shows what every thread is doing right now. For a
stalled event loop that is usually the whole investigation.

**The checklist before real traffic:**

- [ ] Async driver everywhere, or `def` handlers for the blocking paths — decided deliberately
- [ ] Timeouts on every outbound call, pools bounded, `pool_pre_ping` on
- [ ] Settings validated at import; the process exits on a bad value
- [ ] `/healthz` shallow, `/readyz` separate and meaningful
- [ ] Graceful shutdown: readiness fails, pause, drain, dispose the engine
- [ ] JSON logs to stdout with a request id, credentials redacted
- [ ] Migrations run as a deploy step, not at app startup
- [ ] Resource limits set, with the memory limit above real peak usage
- [ ] An alert on p99 latency and error rate, pointing at a runbook

---

## Interview Q&A

### Q: How do you test a FastAPI service?
**Level:** intermediate · **Tags:** python, testing, fastapi

<details><summary>Model answer</summary>

Mostly through the app itself, using `httpx` with the ASGI transport so
requests go in process rather than over a port. That runs the real middleware,
the real dependencies and the real exception handlers, so one test covers
routing, validation, auth and error mapping — and it takes milliseconds.

The injection story is what makes it pleasant: `app.dependency_overrides` swaps
the database session and the authenticated user for fakes with one line each,
so there is no monkeypatching and no mocking framework in most tests. I clear
the overrides in the fixture teardown, because leaking them into the next test
is the most common source of "passes alone, fails in the suite".

Below that, plain unit tests for the domain functions — they take a protocol
and some values, so they need no fixtures at all. Above it, a small number of
integration tests against a real Postgres in a container, whose only job is
proving the SQL and the migrations.

The assertion I always include is the negative one: that an unauthorised
request did not reach the repository. It tests that the dependency ran before
the handler, which is what a refactor breaks without any test failing
otherwise.

</details>

### Q: Why keep FastAPI out of your domain layer?
**Level:** senior · **Tags:** python, architecture

<details><summary>Answer</summary>

Because the rules then only work inside an HTTP request. The moment a domain
function takes a `Request` or raises `HTTPException`, you cannot call it from a
Celery task, a management command, a scheduled job or a test without
constructing a fake request — and services grow all of those.

The shape I use is: the domain declares `Protocol` interfaces for what it
needs — a repository, a clock, an id factory — and takes them as arguments. The
`db` layer implements them, the `api` layer wires them together. Dependencies
point inwards.

The practical payoff is testing: a domain function test needs no fixtures, no
client, no database. And the practical warning sign is a domain module
importing anything from `fastapi` — easy to check, and worth a lint rule.

</details>

### Q: How should a Python service be deployed and scaled?
**Level:** senior · **Tags:** python, deployment, operations

<details><summary>Model answer</summary>

One Uvicorn worker per container, scaled with replicas, not several workers
inside one container.

The reason is that the orchestrator is the supervisor. With four workers in a
container, one wedging leaves the container "up" and the platform's health
accounting wrong; per-worker metrics disappear into an aggregate; and the
memory limit applies to the sum, so one leaking worker takes the others with
it. One process per container means restarts, rolling updates and bin-packing
all work on real information.

Where a multi-worker Gunicorn setup is still right is a plain VM, where nothing
else manages processes — then roughly one worker per core, measured rather than
assumed, because the right number depends on whether handlers wait or compute.

Beyond that: CPU-heavy work goes to a queue-driven worker service rather than
the request path, because it would otherwise hold a worker and, if it is inside
an async handler, the whole loop. Migrations run as a separate deploy step so
replicas do not race. And graceful shutdown needs
`--timeout-graceful-shutdown` plus failing readiness before draining, or every
deploy drops requests.

</details>

---

## What a weak answer sounds like

- **Mocking everything**, so the wiring between layers is never tested.
- **`TestClient` against a real port** when the ASGI transport runs in process.
- **Leaving `dependency_overrides` set** between tests.
- **`HTTPException` raised from domain code.**
- **Four workers in one container**, with no account of what the orchestrator
  sees.
- **Migrations on app startup**, with several replicas racing.
- **No event-loop lag metric**, so "everything is slow and CPU is fine" has no
  explanation.

---

## Quiz

### MCQ: What makes `dependency_overrides` the preferred injection mechanism in tests?
- [ ] It is faster than constructing the app normally
- [x] The framework already resolves dependencies, so a test swaps the real session or user for a fake with one line — no monkeypatching, and the real middleware and error handlers still run
- [ ] It disables validation so tests are simpler
- [ ] It bypasses the router
**Why:** The one discipline it needs is clearing the overrides in teardown — a leaked override is the classic "passes alone, fails in the suite" flake.

### MCQ: Why run one Uvicorn worker per container rather than four?
- [ ] Four workers exceed the ASGI specification
- [x] The orchestrator is the supervisor: with several workers inside, one wedging still leaves the container "up", per-worker metrics vanish into an aggregate, and the memory limit applies to the sum
- [ ] Workers cannot share a port inside a container
- [ ] Uvicorn does not support multiple workers
**Why:** Multi-worker Gunicorn is right on a plain VM where nothing else manages processes. Under an orchestrator, replicas are the scaling unit and one process per container keeps the platform's accounting honest.

### MCQ: Why is `PYTHONUNBUFFERED=1` set in production images?
- [ ] It speeds up the interpreter
- [x] Without it stdout is block-buffered, so logs appear late — and if the process crashes, the buffered lines explaining why are lost
- [ ] It enables JSON log formatting
- [ ] It is required by ASGI
**Why:** The logs you most need are the ones written just before a crash. Buffering is exactly what loses them.

### MCQ: Which assertion proves an authorization dependency runs before the handler?
- [ ] That the response status is 403
- [x] That the fake repository recorded no writes — a status assertion alone would pass even if the handler had already written before the check
- [ ] That the handler raised `HTTPException`
- [ ] That the token was rejected by the JWT library
**Why:** Ordering is the thing refactors break silently, and only a negative assertion about side effects catches it.

### MCQ: Where should database migrations run?
- [ ] In the app's startup event, so the schema is always current
- [x] As a separate deploy step before the new version rolls out — on startup, several replicas race each other and a failure leaves the schema half-applied
- [ ] Manually, by whoever notices
- [ ] In a background thread after startup
**Why:** Migrations are a deploy concern with their own failure mode and their own rollback story. Coupling them to process startup makes replica count a correctness variable.

---

## Glossary

- **pytest fixture** — reusable setup injected by parameter name; the unit of test wiring.
- **`ASGITransport`** — drives the app in process with no network, running the real stack.
- **`dependency_overrides`** — FastAPI's built-in test seam for swapping dependencies.
- **`asyncio_mode = "auto"`** — pytest-asyncio setting that makes async tests run without a decorator.
- **Protocol-based domain** — rules depending on interfaces, with implementations passed in.
- **Alembic** — the migration tool for SQLAlchemy; autogenerate is a draft, not a result.
- **`--timeout-graceful-shutdown`** — bounds the drain period so a stuck request cannot block a deploy.
- **`py-spy`** — sampling profiler that attaches to a running process without restarting it.
- **Event-loop lag** — how late a scheduled callback fires; the clearest signal that something is blocking the loop.
