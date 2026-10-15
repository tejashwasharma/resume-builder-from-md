# The Interview Book

Study material for senior software engineering interviews: the coding rounds,
distributed systems, system design, auth and identity, security, the stack
questions, and the behavioural round.

**What it assumes.** The coding, distributed-systems and design parts are
language-agnostic — the patterns and trade-offs hold wherever you work.
Everything that gets concrete (the exercises, the "Building it" sections, the
reference stacks) is **Node.js and TypeScript**, because a book has to pick one
stack to be specific in, and specificity is what makes it useful. If you
interview in another language, the theory carries and the code is a translation
exercise.

Reads as one study flow: topics down the side, chapters inside each topic, and
inside every chapter four stages left to right — **Learn** (the theory, one
short screen at a time), **Workshop** (worked solutions, implementations,
interview questions), **Code** (a TypeScript editor that runs your solution
against tests) and **Quiz** (MCQs). The Markdown here is the source of truth.

Two halves that work together:

- **Guides** (`01-` … `10-`) — the knowledge, written basic → hero. Readable
  anywhere: on GitHub, on a phone, offline. Each mechanism opens with a flow
  chart, then walks the same steps as real requests. Answers sit inside
  collapsible blocks so you can attempt before revealing.
- **Skills** (`.claude/skills/`) — Claude drives the practice. It asks one
  question at a time, waits for *your* answer, tells you what you missed, and
  escalates like a real interviewer.

Reading alone produces recognition, not recall. You will feel prepared and not
be. The drills are where the actual preparation happens.

## Two ways to use it

**In the browser** — build the study site and open it:

```
pip install markdown
python3 build_site.py        # writes site/index.html
open site/index.html
```

It gives you a path through the topics with time estimates, chapter-by-chapter
progress, search, a code editor with tests, and quizzes. It works on a phone.

Published as a claude.ai artifact — https://claude.ai/artifact/1ZyPBDDDbz7xGZSGwg57a7
(private; sign in as the owner to open it) — it gains two AI features a local
file cannot have: **Ask** (bottom left, or press `/`) and the Code stage's
problem generation and edge-case review. Ask answers from the book's own chapters
rather than from general knowledge: it picks the chapters most relevant to your
question — plus whichever one you are currently reading — sends those as
context, and links to them under the answer. If a question needs a detail only
you have, it says so instead of inventing one.

**In the terminal**, from inside this directory:

```
/drill oauth2              one topic, escalating questions
/mock-interview design     a full round, then feedback
/prep-status               what's weak, what's untouched, what's next
```

After editing any guide:

```
python3 build_site.py      # regenerate site/index.html
python3 check_coverage.py  # question blocks, diagram captions and links
```

## Topics

`curriculum.json` is the study order, and the sidebar is built from it.

| Topic | What it covers |
| --- | --- |
| **Start here** | How a senior loop works stage by stage, how to practise, and an eight-week schedule |
| **Coding basics** | The coding round itself, complexity, arrays, strings, linked lists, grids, recursion, binary search |
| **Coding core** | Picking a technique, stacks and queues, trees, heaps, graphs, DP, tries and intervals |
| **Distributed systems** | Zero to one: networking (TCP, DNS, TLS, HTTP/2 and 3, pooling), storage engines and transactions (B-tree vs LSM, the WAL, isolation levels, MVCC), then CAP, replication, multi-region, consensus, idempotency, messaging, caching, resilience and operations |
| **System design** | The method, estimation, the technology toolbox, and every building block — what it is, and when and why to use it |
| **System design cases** | Worked systems end to end: an email service, an e-commerce platform, an auth service, an identity subsystem |
| **Low-level design** | OOP, SOLID, patterns and the classic LLD problems |
| **Auth & identity** | OAuth 2.0, OIDC, SAML, SCIM, JWT, MFA/TOTP, RBAC/ABAC/ReBAC, OPA, Zero Trust and the IdPs |
| **Security engineering** | The security knowledge round, and the design prompts a security team asks |
| **Backend: Node.js** | TypeScript for services, the event loop, and building the server — routing, middleware, validation, errors, auth, config, pooling, graceful shutdown, tests, packaging |
| **Backend: Python** | Python from zero, the GIL and asyncio, the same server in FastAPI, pytest and production |
| **Backend: Go** | Go from zero, goroutines and the scheduler, the same server on `net/http`, table-driven tests and a static binary |
| **Backend: cross-cutting** | REST/GraphQL/gRPC/WebSockets, and service boundaries |
| **Data & caching** | MongoDB, PostgreSQL, Redis, ODMs, Elasticsearch |
| **DevOps & SRE** | Zero to one for the operations round: the Linux box under the container (processes, memory, descriptors, signals, the debugging toolkit), containers at the kernel level, Kubernetes' object model and how to operate it, Terraform and state, pipelines and GitOps, Prometheus and PromQL, incident command and DR — plus the AWS ecosystem and the AWS observability services |
| **Testing & quality** | Test levels, TDD, and defending a coverage number |
| **AI engineering** | Agent enablement, AI across the SDLC, RAG and LLM-backed bots |
| **Frontend** | React, Redux, TypeScript, styling |
| **Behavioural & leadership** | What the round grades, the answer shape that gets credit, and a question bank for your own stories |

## New to distributed systems or system design?

Both blocks open with a chapter that assumes no prior knowledge, defines every
term before using it, and names the technologies worth learning and in what
order. Start there rather than at the method:

- [Distributed systems: start here](02-interview-core/20-distributed-start-here.md)
- [The technology landscape](02-interview-core/21-the-technology-landscape.md) — what to learn, and why
- [System design: start here](02-interview-core/31-design-round-start-here.md) — one server to ten million users
- [The technology toolbox](02-interview-core/34-the-technology-toolbox.md) — Postgres vs Mongo, Kafka vs SQS, and how to defend a choice
- [Building blocks](02-interview-core/35-building-blocks.md) — every block, with when *not* to add it

The three language tracks build **the same service** — `POST /links`,
`GET /links/:id`, `GET /healthz` — in Node, Python and Go, covering the same
twelve steps in the same order, so you can read any two side by side and see
what is a language fact and what is universal.

## How the pieces fit

```
Guides (knowledge)  ->  INDEX.md (navigation)  ->  Skills (execution)
                              |
                    progress/log.md (what you got wrong, over time)
                              |
                        /prep-status (what to do next)
```

Questions live exactly once — in the guides. The skills hold the *procedure*
for drilling, never the content.

## Contributing to your own copy

- [INDEX](INDEX.md) is the topic → file map. Keep it updated when you add a guide.
- [AGENT.md](AGENT.md) is the contract for writing chapters: the question-block
  format, the "Building it" section, the diagram rules, and the exercise and MCQ
  formats the site parses. Read it before adding material.
- `python3 check_coverage.py` must pass; `python3 build_site.py --check` parses
  the curriculum and runs every exercise's reference solution against its own
  tests.
