# The Interview Book

Study material for Senior Software Engineer / IAM-platform roles, built from
the skills and experience on `../tejashwasharma_resume.md`.

Reads as a book: a contents page, numbered chapters grouped into parts, and
sections you tick off as you go. The published artifact adds AI drilling and
cross-device progress; the Markdown here is the source of truth for both.

Two halves that work together:

- **Guides** (`00-` … `10-`) — the knowledge, written basic → hero. Readable
  anywhere: on GitHub, on a phone, offline. Each mechanism opens with a flow
  chart, then walks the same steps as real requests. Answers sit inside
  collapsible blocks so you can attempt before revealing.
- **Skills** (`.claude/skills/`) — Claude drives the practice. It asks one
  question at a time, waits for *your* answer, tells you what you missed, and
  escalates like a real interviewer.

Reading alone produces recognition, not recall. You will feel prepared and not
be. The drills are where the actual preparation happens.

## Two ways to use it

**In the browser** — the published book: https://claude.ai/code/artifact/d4c0a041-fd0a-469d-a77d-bcb6679f9610
(private, sign in as the owner to open it) — contents page, chapter navigation,
per-section progress, search, drilling and mock rounds. Works on a phone.

There's also an **Ask** button (bottom right, or press `/`). It answers from
the book's own chapters rather than from general knowledge: it picks the
chapters most relevant to your question — plus whichever one you're currently
reading — sends those as context, and links to them under the answer so you
can jump to the source. If a question needs a detail only you have, it says so
instead of inventing one.

**In the terminal**, from inside this directory:

```
/drill oauth2              one topic, escalating questions
/mock-interview design     a full round, then feedback
/prep-status               what's weak, what's untouched, what's next
```

Rebuild the book after editing any guide:

```
python3 build_site.py      # regenerate site/index.html
python3 check_coverage.py  # does the prep still cover the resume?
```

## Modules

| Module | What it covers | Why it matters |
| --- | --- | --- |
| `00-experience/` | Every resume bullet as a STAR story + the follow-ups that probe it | Needed in every loop; entirely specific to you |
| `01-auth-identity/` | OAuth2, OIDC, SAML, SCIM, JWT, MFA, RBAC, OPA, Zero Trust | Your specialty — expect the deepest questioning here |
| `02-distributed-systems/` | Starts from zero, then consistency, replication, sharding, consensus, caching, resilience | Underpins every claim you make about scale |
| `03-system-design/` | Starts from zero, then the method, estimation, and worked designs from your own domain | Usually one or two dedicated rounds; the ones people fail |
| `04-backend/` | Node internals, NestJS, Go, API styles, microservices | Core implementation round |
| `05-data-cache/` | MongoDB, PostgreSQL, Redis, ODMs, Firebase | Data-modelling and trade-off questions |
| `06-testing/` | Jest, TDD, and defending "85%+ coverage" | Comes up whenever you cite the number |
| `07-cloud-devops/` | AWS, Docker, Nginx, CI/CD, Datadog | Usually breadth, not depth |
| `08-ai-tooling/` | Agent docs, prompt libraries, caching and model routing | Your differentiator — expect curiosity and skepticism |
| `09-dsa-coding-rounds/` | Patterns, how to pick one, a drill plan, then a chapter per structure (arrays → graphs) | Senior loops still screen on this |
| `10-frontend/` | React, Redux, TypeScript, styling | Lightest, for a backend-leaning loop |

## Read these first

- **[WEAK-SPOTS](WEAK-SPOTS.md)** — an honest list of where you are most likely to get
  caught. It is uncomfortable on purpose, and it should shape what you study.
- **`STUDY-PLAN.md`** — a sequenced schedule, so this is repetition over time
  rather than one read-through.
- **[INDEX](INDEX.md)** — topic → file map. The skills use it to find material; you
  can use it to jump straight to a concept.

## New to distributed systems or system design?

Both parts open with a chapter that assumes no prior knowledge, defines every
term before using it, and names the technologies worth learning and in what
order. Start there rather than at chapter 01:

- [What a distributed system is, and why anyone bothers](02-distributed-systems/00-start-here-what-and-why.md)
- [The technology landscape](02-distributed-systems/00b-the-technology-landscape.md) — what to learn, and why
- [What system design actually is](03-system-design/00-start-here-thinking-in-systems.md) — one server to ten million users
- [The technology toolbox](03-system-design/00b-the-technology-toolbox.md) — Postgres vs Mongo, Kafka vs SQS, and how to defend a choice

## How the pieces fit

```
Guides (knowledge)  ->  INDEX.md (navigation)  ->  Skills (execution)
                              |
                    progress/log.md (what you got wrong, over time)
                              |
                        /prep-status (what to do next)
```

Questions live exactly once — in the guides. The skills hold the *procedure*
for drilling, never the content. Same architecture as the agent-navigation
docs and prompt/playbook library described on your resume.

## Coverage

`python3 check_coverage.py` verifies every technology named in the resume's
Technical Skills section has real material here, and fails if any is missing or
only mentioned in passing. Distributed systems and system design are reported
separately: they are not on the resume, but they are expected at this level.
