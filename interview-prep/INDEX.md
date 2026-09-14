# Index

Topic → file map. The skills read this to locate material; use it yourself to
jump straight to a concept.

`✅` written · `⏳` planned, not yet written. Never send someone to a `⏳` file.

## 00 — Experience *(all written)*

| Topic / keyword | File |
| --- | --- |
| RBAC 0→1, permission model, multi-org onboarding | ✅ [contentstack](00-experience/contentstack.md) §1 |
| OAuth unification, SSO, SCIM, Okta, Entra marketplace | ✅ [contentstack](00-experience/contentstack.md) §2 |
| security audit, remediation, 150→10 findings | ✅ [contentstack](00-experience/contentstack.md) §3 |
| auth npm package, gRPC, platform, 9 teams | ✅ [contentstack](00-experience/contentstack.md) §4 |
| latency, 13s→200ms, Rego/OPA, Redis caching | ✅ [contentstack](00-experience/contentstack.md) §5 |
| session governance, timeouts, 2FA, zero findings | ✅ [contentstack](00-experience/contentstack.md) §6 |
| incidents, on-call, RCA, SLA | ✅ [contentstack](00-experience/contentstack.md) §7 |
| AI adoption, AGENT.md, prompt library | ✅ [contentstack](00-experience/contentstack.md) §8 |
| leadership, Agile, monolith split, Xtensio, Pinzon, Clipboard | ✅ [bestpeers](00-experience/bestpeers.md) |
| CI/CD, AngularJS→React, client demos | ✅ [gyrix](00-experience/gyrix.md) |
| why leaving, tell me about yourself, weakness, conflict, failure, salary, questions to ask | ✅ [hard questions](00-experience/hard-questions.md) |

## 01 — Auth & Identity *(all written)*

| Topic / keyword | File |
| --- | --- |
| authn vs authz, sessions vs tokens, trust boundaries | ✅ [foundations](01-auth-identity/01-foundations.md) |
| OAuth 2.0, grants, PKCE, refresh rotation, scopes | ✅ [oauth2](01-auth-identity/02-oauth2.md) |
| OIDC, ID token, UserInfo, discovery | ✅ [oidc](01-auth-identity/03-oidc.md) |
| SAML, assertions, bindings, IdP/SP-initiated | ✅ [saml sso](01-auth-identity/04-saml-sso.md) |
| SCIM, provisioning, deprovisioning | ✅ [scim](01-auth-identity/05-scim.md) |
| JWT, signing, validation, revocation | ✅ [jwt](01-auth-identity/06-jwt.md) |
| MFA, TOTP, SMS weakness, recovery | ✅ [mfa totp](01-auth-identity/07-mfa-totp.md) |
| RBAC, ABAC, ReBAC, role explosion, multi-tenancy | ✅ [rbac abac](01-auth-identity/08-rbac-abac.md) |
| OPA, Rego, policy evaluation, decision caching | ✅ [opa rego](01-auth-identity/09-opa-rego.md) |
| Zero Trust, Okta, Entra ID, Ping Identity | ✅ [zero trust idps](01-auth-identity/10-zero-trust-idps.md) |
| PassportJS, strategies, `session: false` | ✅ [frameworks](03-backend/02-frameworks.md) §Passport.js |

## 02 — Google Loop *(the whole Senior SWE loop, zero to onsite)*

One self-contained part, numbered `01`–`43` in reading order: `01`–`02` the process and the roles,
`03`–`19` coding, `20`–`30` distributed-systems foundations, `31`–`40` system
design, `41`–`43` the security round, Googleyness & Leadership, the schedule.

### A. The loop and the roles

| Topic / keyword | File |
| --- | --- |
| stages, phone screen, onsite, hiring committee, team match, the four attributes (GCA, RRK, Leadership, Googleyness), L4 vs L5, what to ask the recruiter | ✅ [the loop](02-google-loop/01-the-loop.md) |
| Safe Coding, Cloud & Third-Party Platform Security, the two JDs line by line, Singapore hub, questions to ask, team match | ✅ [the two roles](02-google-loop/02-the-two-roles.md) |

### B. Coding — Big-O to 60+ solved problems

| Topic / keyword | File |
| --- | --- |
| the 45-minute shape, speaking script, what gets written down, L5 downgrades, JS in a plain doc, mock transcript | ✅ [the coding round](02-google-loop/03-coding-round-how-google-runs-it.md) |
| patterns, complexity, auth-flavoured problems | ✅ [patterns and complexity](02-google-loop/04-patterns-and-complexity.md) |
| how to pick a technique, prefix sum, forward/backward passes, monotonic stack, cyclic sort, binary search on answer, union-find, greedy vs DP, signal→pattern table | ✅ [choosing the approach](02-google-loop/05-choosing-the-approach.md) |
| arrays, two pointers, sliding window, prefix sums, Kadane's, subarray sum k, trapping rain water, first missing positive, merge intervals | ✅ [arrays and two pointers](02-google-loop/06-arrays-and-two-pointers.md) |
| strings, hashing, frequency counts, longest substring without repeats, minimum window, group anagrams, palindromes | ✅ [strings and hashing](02-google-loop/07-strings-and-hashing.md) |
| linked lists, dummy head, fast/slow pointers, reverse in k-groups, merge k lists, random pointer copy, cycle start | ✅ [linked lists](02-google-loop/08-linked-lists.md) |
| stacks, queues, monotonic stack/deque, largest rectangle, sliding window maximum, min stack, calculator | ✅ [stacks, queues, monotonic](02-google-loop/09-stacks-queues-monotonic.md) |
| trees, BST, traversals, LCA, serialize/deserialize, validate BST, max path sum | ✅ [trees and BST](02-google-loop/10-trees-and-bst.md) |
| heaps, priority queues, MinHeap from scratch, kth largest in stream, top-k frequent, median from stream, meeting rooms II | ✅ [heaps and top-k](02-google-loop/11-heaps-and-top-k.md) |
| graphs, BFS vs DFS, topological sort, course schedule, union-find, word ladder, Dijkstra, network delay | ✅ [graphs](02-google-loop/12-graphs.md) |
| matrices, grids, multi-source BFS, rotten oranges, rotate image, search 2-D matrix, grid DP | ✅ [matrices and grids](02-google-loop/13-matrices-and-grids.md) |
| recursion, backtracking, subsets, permutations, combination sum, N-Queens, generate parentheses | ✅ [recursion and backtracking](02-google-loop/14-recursion-and-backtracking.md) |
| dynamic programming, memoisation vs tabulation, house robber, coin change, LIS, LCS, edit distance, knapsack, word break | ✅ [dynamic programming](02-google-loop/15-dynamic-programming.md) |
| binary search, rotated array, first/last position, binary search on the answer, koko, median of two sorted arrays, bit tricks, XOR | ✅ [binary search and bits](02-google-loop/16-binary-search-and-bits.md) |
| trie, autocomplete, intervals, insert interval, LRU cache, LFU cache, rate limiter, consistent hashing, iterators | ✅ [tries, intervals, design structures](02-google-loop/17-tries-intervals-and-design-structures.md) |
| IAM policy evaluation, permission inheritance, secret scanning, dependency resolution, SBOM diff, audit-log dedup, path traversal, CIDR match, top-k offenders | ✅ [security-flavoured problems](02-google-loop/18-security-flavoured-problems.md) |
| what to practise, the ladder, time-boxing, mistake log, exit tests, the 30-problem mock pool | ✅ [the drill plan](02-google-loop/19-the-drill-plan.md) |

### C. Distributed-systems foundations

| Topic / keyword | File |
| --- | --- |
| what is a distributed system, scale up vs out, stateless, beginner start | ✅ [start here](02-google-loop/20-distributed-start-here.md) |
| which technology for which problem, Nginx, Envoy, Kubernetes, etcd, Prometheus, what to learn first | ✅ [the technology landscape](02-google-loop/21-the-technology-landscape.md) |
| failure modes, fallacies of distributed computing | ✅ [failure modes and fallacies](02-google-loop/22-failure-modes-and-fallacies.md) |
| CAP, PACELC, consistency models, read-your-writes, Spanner, TrueTime | ✅ [consistency, CAP, PACELC](02-google-loop/23-consistency-cap-pacelc.md) |
| replication, leader-follower, quorum, partitioning, sharding, hot keys, Bigtable | ✅ [replication and partitioning](02-google-loop/24-replication-partitioning.md) |
| consensus, Raft, Paxos, Chubby, leader election, distributed locks, Redlock | ✅ [consensus and coordination](02-google-loop/25-consensus-coordination.md) |
| clocks, ordering, idempotency, exactly-once, 2PC, sagas, outbox | ✅ [idempotency and transactions](02-google-loop/26-idempotency-transactions.md) |
| queues, logs, Kafka, Pub/Sub, delivery semantics, backpressure, DLQ | ✅ [messaging and streams](02-google-loop/27-messaging-streams.md) |
| caching, invalidation, stampede, thundering herd | ✅ [caching at scale](02-google-loop/28-caching-at-scale.md) |
| timeouts, retries, circuit breakers, bulkheads, rate limiting, noisy neighbour | ✅ [resilience and rate limiting](02-google-loop/29-resilience-rate-limiting.md) |
| SLI, SLO, error budget, golden signals, alerting, canary, rollback, incidents, postmortems, load shedding | ✅ [observability, SLOs, operations](02-google-loop/30-observability-slos-and-operations.md) |

### D. System design

| Topic / keyword | File |
| --- | --- |
| what a design round is, one server → 10M users, beginner start | ✅ [start here](02-google-loop/31-design-round-start-here.md) |
| the method, how to run 45 minutes, how Google runs the design round, the L5 bar | ✅ [the method](02-google-loop/32-the-method.md) |
| estimation, capacity, back-of-envelope, RPS | ✅ [estimation](02-google-loop/33-estimation.md) |
| Postgres vs Mongo vs Dynamo, Kafka vs SQS, REST vs gRPC, SSE vs WebSockets, monolith vs microservices | ✅ [the technology toolbox](02-google-loop/34-the-technology-toolbox.md) |
| building blocks, reference architectures to draw | ✅ [building blocks](02-google-loop/35-building-blocks.md) |
| Zanzibar, BeyondCorp, Borg, Spanner, Bigtable, Colossus, Pub/Sub, SLSA, Sigstore, in-toto, SBOM — what to cite and how | ✅ [Google-scale vocabulary](02-google-loop/36-google-scale-vocabulary.md) |
| design auth service, 2–3B req/day, multi-region, revocation, key rotation | ✅ [design auth service](02-google-loop/37-design-auth-service.md) |
| design multi-tenant RBAC, SSO/SCIM, session revocation, the Zanzibar model, new enemy, zookies | ✅ [design rbac sso sessions](02-google-loop/38-design-rbac-sso-sessions.md) |
| URL shortener, notifications, feed, rate limiter, key-value store, log pipeline, job scheduler | ✅ [classics](02-google-loop/39-design-classics.md) |
| cloud security posture, third-party access inventory, supply-chain integrity, authorization service, secrets detection, package registry proxy, agentic-AI guardrails | ✅ [design security systems](02-google-loop/40-design-security-systems.md) |

### E. The security round, Googleyness & Leadership, the schedule

| Topic / keyword | File |
| --- | --- |
| threat modelling, STRIDE, CWE classes, secure by design, Safe Coding, memory safety, SLSA, Sigstore, SBOM, xz, cloud IAM misconfig, CSPM, third-party risk, prompt injection, OWASP LLM Top 10 | ✅ [security domain knowledge](02-google-loop/41-security-domain-knowledge.md) |
| Googleyness, emergent leadership, ambiguity, new hub 0→1, mentoring, pushed back, failure, conflict, why Google | ✅ [Googleyness and leadership](02-google-loop/42-googleyness-and-leadership.md) |
| week-by-week schedule, mock pool, day-before checklist, hiring committee wait, team match, offer basics | ✅ [the schedule](02-google-loop/43-the-schedule.md) |

## 03 — Backend *(all written)*

| Topic / keyword | File |
| --- | --- |
| Node.js, event loop, async, memory, clustering | ✅ [nodejs internals](03-backend/01-nodejs-internals.md) |
| Express, NestJS, Fastify, DI, middleware, guards, PassportJS | ✅ [frameworks](03-backend/02-frameworks.md) |
| Golang, goroutines, channels ⚠️ RISK AREA | ✅ [golang](03-backend/03-golang.md) |
| REST, GraphQL, gRPC, Protobuf, WebSockets, Socket.io | ✅ [api styles](03-backend/04-api-styles.md) |
| microservices, boundaries, service mesh | ✅ [microservices](03-backend/05-microservices.md) |

## 04 — Data & Cache *(all written)*

| Topic / keyword | File |
| --- | --- |
| MongoDB, PostgreSQL, SQL, indexes, transactions | ✅ [databases](04-data-cache/01-databases.md) |
| Redis, ioredis, Mongoose, Sequelize, Firebase | ✅ [redis and orms](04-data-cache/02-redis-and-orms.md) |

## 05 — Testing *(all written)*

| Topic / keyword | File |
| --- | --- |
| Jest, TDD, coverage strategy, testing auth | ✅ [testing and coverage](05-testing/01-testing-and-coverage.md) |
| test automation, CI stages, flaky tests, coverage gate | ✅ [testing and coverage](05-testing/01-testing-and-coverage.md) §Test automation |

## 06 — Cloud & DevOps *(all written)*

| Topic / keyword | File |
| --- | --- |
| AWS EC2, S3, Lambda, CloudFront, IAM, Docker, Nginx, Jenkins, GoCD | ✅ [aws and containers](06-cloud-devops/01-aws-and-containers.md) |
| CloudWatch, metrics, alarms, log retention, cardinality | ✅ [aws and containers](06-cloud-devops/01-aws-and-containers.md) §CloudWatch |
| Route 53, DNS, alias records, TTL, failover routing | ✅ [aws and containers](06-cloud-devops/01-aws-and-containers.md) §Route 53 |
| CI/CD, deployment strategies, migrations, observability, SLO | ✅ [cicd and observability](06-cloud-devops/02-cicd-and-observability.md) |
| PM2, Postman, Newman, Jira, story points, velocity | ✅ [cicd and observability](06-cloud-devops/02-cicd-and-observability.md) §The day-to-day tooling |

## 07 — AI Tooling *(all written)*

| Topic / keyword | File |
| --- | --- |
| Claude Code, Copilot, AGENT.md/SKILLS.md, navigation index, playbooks | ✅ [ai engineering](07-ai-tooling/01-ai-engineering.md) |
| context engineering, prompt caching, model routing | ✅ [ai engineering](07-ai-tooling/01-ai-engineering.md) |
| AI code review, test generation, debugging, RCA, security analysis, GPT | ✅ [ai across the sdlc](07-ai-tooling/02-ai-across-the-sdlc.md) |

## 08 — Frontend *(all written)*

| Topic / keyword | File |
| --- | --- |
| React, Hooks, Redux, TypeScript, SCSS, Styled-Components, micro-frontends | ✅ [react and typescript](08-frontend/01-react-and-typescript.md) |

## Cross-cutting

| Need | File |
| --- | --- |
| Where I'm exposed | ✅ [WEAK-SPOTS](WEAK-SPOTS.md) |
| What I've drilled | ✅ [progress log](progress/log.md) |
| Does every resume skill have material | ✅ `python3 check_coverage.py` |
| Rebuild the study site | ✅ `python3 build_site.py` |
