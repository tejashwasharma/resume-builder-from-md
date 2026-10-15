# Python from zero

Python for building services, starting from the syntax and stopping where a
backend engineer stops caring. If you already write Python, skim to *Typing*
and *Errors* — those are the two places backend Python differs most from the
Python people learn first.

The reason Python keeps turning up in backend work is the ecosystem: data
tooling, ML, scripting and glue all live here, so a service that has to talk to
any of that is often easiest to write in Python too.

---

## In brief

- **Indentation is the block structure.** There are no braces; a consistent four
  spaces is not a style preference, it is the syntax.
- **Everything is an object and names are references.** Assignment never copies,
  which is why a mutable default argument is the classic Python bug.
- **Type hints are optional, unenforced at runtime, and still worth writing.**
  They are checked by `mypy` or `pyright` in CI and used by frameworks like
  FastAPI and Pydantic to generate validation — which is where they stop being
  documentation and start doing work.
- **Exceptions are the error mechanism**, used for control flow far more than in
  Go or TypeScript — `try/except` around the specific exception, never a bare
  `except:`.
- **A virtual environment per project is not optional.** Python installs
  packages globally by default and that way lies a machine where two projects
  cannot both run.
- **The standard library is unusually good** — `dataclasses`, `pathlib`,
  `datetime`, `json`, `logging`, `unittest` — and reaching for it first keeps
  the dependency list short.

---

## Setting up

```bash
mkdir links-api && cd links-api
python3 -m venv .venv            # an isolated interpreter + packages for this project
source .venv/bin/activate        # (Windows: .venv\Scripts\activate)
python -m pip install --upgrade pip
pip install fastapi uvicorn pydantic
pip freeze > requirements.txt    # or use pyproject.toml, below
```

**The packaging landscape, honestly:** `pip` + `venv` + `requirements.txt` is
the baseline and works everywhere. `pyproject.toml` is the modern metadata
standard, and tools like **uv** (fast, increasingly the default choice) or
Poetry manage dependencies and lockfiles on top of it. For a service, what
matters is that you have a **lockfile** so builds are reproducible.

```toml
# pyproject.toml
[project]
name = "links-api"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["fastapi>=0.115", "uvicorn[standard]>=0.32", "pydantic>=2.9"]

[project.optional-dependencies]
dev = ["pytest>=8", "httpx>=0.27", "mypy>=1.11", "ruff>=0.6"]
```

**Use Python 3.11 or newer.** 3.11 brought a large speed improvement and
`asyncio.TaskGroup`; 3.12 and 3.13 continue both. Anything on 3.8 is on a
version that reached end of life.

---

## The language

### Values, names and the one real gotcha

```python
port: int = 3000
name = "links-api"            # str
ratio = 0.95                  # float
ready = False                 # bool
nothing = None                # the absence value

ids = ["a", "b"]              # list: ordered, mutable
pair = ("hits", 42)           # tuple: ordered, immutable
counts = {"a": 1}             # dict: the workhorse
seen = {"a", "b"}             # set: membership and dedup
```

Names are **references**. Assignment binds a name to an object; it never
copies. The consequence that bites every Python programmer once:

```python
def add_tag(tag: str, tags: list[str] = []) -> list[str]:   # WRONG
    tags.append(tag)
    return tags

add_tag("a")   # ['a']
add_tag("b")   # ['a', 'b']  — the default list is created ONCE, at definition

def add_tag(tag: str, tags: list[str] | None = None) -> list[str]:   # right
    tags = [] if tags is None else tags
    tags.append(tag)
    return tags
```

The default value is evaluated once, when the function is defined, and shared by
every call. Never use a mutable default.

### Control flow and comprehensions

```python
for link in links:
    if link.hits > 100:
        print(f"{link.id}: {link.hits}")      # f-string: the only formatting you need
    elif link.hits == 0:
        continue
    else:
        pass

# A comprehension is the idiomatic map/filter, and is faster than a loop with
# .append() because the list growth is handled internally.
hot = [l.id for l in links if l.hits > 100]
by_id = {l.id: l for l in links}
urls = {l.url for l in links}                  # set comprehension, dedupes

# A generator expression streams instead of materialising — important when the
# source is large, because the list version holds everything in memory.
total = sum(l.hits for l in links)
```

### Functions

```python
def shorten(url: str, length: int = 7) -> str:
    """Docstrings are the convention; tools and editors read them."""
    return hashlib.sha256(url.encode()).hexdigest()[:length]

# *args and **kwargs collect positional and keyword arguments.
def log_event(name: str, *tags: str, **fields: object) -> None: ...

log_event("created", "link", "api", tenant="t1", ms=12)

# Keyword-only arguments after a bare *, which is how you stop a call site
# becoming an unreadable row of booleans.
def fetch(url: str, *, timeout: float = 2.0, retries: int = 0) -> bytes: ...
fetch("https://x.com", timeout=0.5)
```

### Classes, dataclasses and protocols

```python
from dataclasses import dataclass, field
from datetime import datetime, UTC

@dataclass(frozen=True, slots=True)   # frozen: immutable; slots: smaller and faster
class Link:
    id: str
    url: str
    tenant_id: str
    hits: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    @property
    def is_popular(self) -> bool:      # accessed as link.is_popular, no parentheses
        return self.hits > 100
```

`@dataclass` generates `__init__`, `__repr__` and `__eq__`, which is the 90%
case for data in a service. Use a plain `class` when there is real behaviour and
state to manage.

**Protocols** are Python's structural interfaces — the thing to reach for
instead of inheritance, and the basis of testable dependency injection:

```python
from typing import Protocol

class LinkRepo(Protocol):
    async def create(self, link: Link) -> Link: ...
    async def get(self, link_id: str) -> Link | None: ...

# Any class with these methods satisfies it. No base class, no registration —
# which is why a test can pass an in-memory fake with no ceremony.
```

### Typing

Hints are not enforced at runtime; a checker enforces them in CI.

```python
from typing import Protocol, TypedDict, Literal

Status = Literal["pending", "active", "expired"]   # a closed set, checked statically

def label(s: Status) -> str:
    match s:                              # structural pattern matching (3.10+)
        case "pending": return "Pending"
        case "active":  return "Active"
        case "expired": return "Expired"

links: list[Link] = []
index: dict[str, Link] = {}
maybe: Link | None = None                 # modern union syntax (3.10+)
```

Run `mypy --strict src/` or `pyright` in CI. Untyped Python is fine for a
script and a liability in a service that several people change.

### Errors

```python
class AppError(Exception):
    """Base for errors this service raises deliberately."""
    def __init__(self, message: str, status: int = 500, code: str = "internal") -> None:
        super().__init__(message)
        self.status, self.code = status, code

class NotFoundError(AppError):
    def __init__(self, what: str) -> None:
        super().__init__(f"{what} not found", status=404, code="not_found")

try:
    link = await repo.get(link_id)
except TimeoutError as e:
    # Chain with `from e` or the original traceback is lost — the Python
    # equivalent of dropping `cause`.
    raise AppError("store unavailable", status=503, code="upstream") from e
except Exception:
    raise                      # re-raise what you cannot handle
else:
    ...                        # ran only if no exception
finally:
    ...                        # always runs; cleanup
```

**Never write a bare `except:`** — it catches `KeyboardInterrupt` and
`SystemExit` too, so it swallows the signals that are trying to stop your
process. `except Exception:` is the broad-but-sane version.

**Exceptions are normal control flow in Python** in a way they are not in Go:
asking forgiveness rather than permission (`try: d[k] except KeyError:`) is
idiomatic, not a smell.

### Context managers and iteration

```python
# `with` guarantees cleanup even on an exception — the file closes, the lock
# releases, the transaction rolls back.
with open("links.json") as f:
    data = json.load(f)

async with pool.acquire() as conn:          # the async version
    await conn.execute(...)

# Generators produce lazily, which is how you process something larger than
# memory.
def read_lines(path: str):
    with open(path) as f:
        for line in f:
            yield line.rstrip("\n")
```

---

## Building it

**The toolchain**

| Need | Reach for | Why |
| --- | --- | --- |
| Environment | `venv`, or `uv` | Per-project isolation; `uv` is dramatically faster |
| Dependencies | `pyproject.toml` + a lockfile | Reproducible builds |
| Lint + format | `ruff` | Replaces flake8, isort and black, and is fast |
| Type check | `mypy --strict` or `pyright` | The thing that makes hints real |
| Test | `pytest` | Fixtures and plain `assert`; the ecosystem standard |
| Validation | `pydantic` v2 | Runtime validation from type hints; FastAPI is built on it |

**A complete, runnable program** — the same shape as the TypeScript one in the
Node track, so the two are directly comparable:

```python
# demo.py — run: python demo.py
from dataclasses import dataclass, field
from datetime import datetime, UTC
import secrets

from pydantic import BaseModel, HttpUrl, ValidationError


class NewLink(BaseModel):          # validation from type hints
    url: HttpUrl


@dataclass
class Link:
    id: str
    url: str
    hits: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


store: dict[str, Link] = {}


def create(payload: dict) -> Link:
    data = NewLink(**payload)                      # raises ValidationError if wrong
    link = Link(id=secrets.token_urlsafe(5), url=str(data.url))
    store[link.id] = link
    return link


def visit(link_id: str) -> Link:
    link = store.get(link_id)
    if link is None:
        raise KeyError(f"no link {link_id}")
    link.hits += 1
    return link


a = create({"url": "https://example.com/docs"})
visit(a.id); visit(a.id)
print(f"{a.id} -> {a.url} ({store[a.id].hits} hits)")

try:
    create({"url": "not-a-url"})
except ValidationError as e:
    print("rejected:", e.errors()[0]["msg"])
```

---

## Interview Q&A

### Q: What does `def f(x, items=[])` do, and why is it wrong?
**Level:** foundation · **Tags:** python, gotchas

<details><summary>Model answer</summary>

The default value is evaluated once, when the function is defined — not on each
call. So every call that omits `items` shares the same list object, and
mutations accumulate across calls. Call it three times and the third sees the
first two's data, which in a service means one request seeing another's.

The fix is `items: list[str] | None = None` and `items = [] if items is None
else items` inside. The same applies to any mutable default — dicts, sets, and
objects constructed in the signature.

It is worth knowing the underlying reason rather than the rule: names in Python
are references and function defaults are evaluated at definition time, so the
default is a single long-lived object. That is the same fact behind "assignment
never copies", which is where most Python aliasing surprises come from.

</details>

### Q: Type hints are not enforced at runtime. Why bother?
**Level:** intermediate · **Tags:** python, typing

<details><summary>Model answer</summary>

Two reasons, and the second is the one people miss.

The first is static checking: `mypy --strict` or `pyright` in CI catches the
class of errors that otherwise surface as an `AttributeError` in production on
an unusual branch. On a service several people change, that is the difference
between a refactor being safe and being a gamble.

The second is that frameworks read them and do real work with them. Pydantic
builds a runtime validator from the annotations, so one model declaration gives
you parsing, coercion, error messages and an OpenAPI schema. FastAPI uses the
same hints to decide what is a path parameter, what is a query parameter and
what is the body, and to generate documentation. The annotations stop being
documentation and start being behaviour.

That is also why I would not conflate them with validation: a hint alone checks
nothing at runtime, so data from the network still needs Pydantic or an
equivalent at the boundary.

</details>

### Q: When is a bare `except:` acceptable?
**Level:** intermediate · **Tags:** python, errors

<details><summary>Answer</summary>

Essentially never. A bare `except:` catches `BaseException`, which includes
`KeyboardInterrupt` and `SystemExit` — the things trying to stop your process.
A service with one in a loop cannot be shut down cleanly, which means SIGTERM
handling, graceful drain and every orderly deploy stop working.

`except Exception:` is the broad version that is sometimes right — at the top
of a request handler or a worker loop, where the job is to log the failure and
keep serving other requests. Below that, catch the specific exceptions you can
actually do something about.

And when re-raising a wrapped error, use `raise NewError(...) from e`, because
without `from` the original traceback is lost and you are debugging from the
wrapper's stack instead of the real one.

</details>

---

## What a weak answer sounds like

- **A mutable default argument**, and no idea why state leaks between calls.
- **"Type hints make Python type-safe"** — they are unenforced at runtime.
- **Bare `except:`** anywhere.
- **No virtual environment**, installing into the system interpreter.
- **`raise` without `from`** when wrapping, losing the original traceback.
- **Using a list where a set is wanted**, then complaining membership is slow.

---

## Quiz

### MCQ: Why does a function with `items=[]` as a default accumulate values across calls?
- [ ] Python caches return values for identical arguments
- [x] The default is evaluated once at definition time, so every call that omits the argument shares the same list object
- [ ] Lists are global by default
- [ ] It only happens inside async functions
**Why:** The idiom is `None` as the default with the real value created inside. The same fact — names are references, defaults are evaluated once — explains most aliasing surprises in Python.

### MCQ: What do type hints actually do at runtime in a FastAPI service?
- [ ] Nothing at all; they are stripped like TypeScript types
- [x] Nothing *by themselves*, but Pydantic and FastAPI read them to build real validators, parse request bodies and generate the OpenAPI schema
- [ ] They enforce types and raise `TypeError` on mismatch
- [ ] They are compiled into C type checks
**Why:** The interpreter ignores them; libraries introspect them. That is why one annotated model gives you validation, coercion, error messages and documentation at once.

### MCQ: What is wrong with `except:` compared to `except Exception:`?
- [ ] Nothing — they are synonyms
- [x] The bare form catches `BaseException`, including `KeyboardInterrupt` and `SystemExit`, so it swallows the signals trying to stop the process and breaks graceful shutdown
- [ ] The bare form is slower
- [ ] The bare form cannot be followed by `finally`
**Why:** `except Exception:` is the legitimate broad catch at the top of a handler or worker loop. Below that, catch what you can actually handle.

### MCQ: Which is the idiomatic way to declare an interface a test can fake?
- [ ] An abstract base class every implementation must inherit from
- [x] A `Protocol` — structural typing, so any object with the right methods satisfies it, with no base class or registration
- [ ] A dict of callables
- [ ] Duck typing with no annotation at all
**Why:** Protocols give static checking without inheritance, which is what makes passing an in-memory fake to a constructor both typed and ceremony-free.

---

## Glossary

- **Virtual environment (`venv`)** — a per-project interpreter and package set; the alternative is an unusable machine.
- **`pyproject.toml`** — the modern project metadata and dependency file.
- **Lockfile** — the pinned, resolved dependency set that makes a build reproducible.
- **Mutable default argument** — a default evaluated once at definition and shared across calls; the classic Python bug.
- **Comprehension** — the idiomatic map/filter over a sequence; a generator expression is its streaming form.
- **`dataclass`** — generated `__init__`, `__repr__` and `__eq__` for data-shaped classes.
- **`Protocol`** — structural interface; satisfied by shape rather than inheritance.
- **Type hint** — an annotation ignored at runtime, checked by mypy or pyright, and read by Pydantic and FastAPI.
- **`raise … from e`** — chains exceptions so the original traceback survives.
- **Context manager (`with`)** — guaranteed cleanup on scope exit, including on an exception.
