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
| PassportJS, strategies, `session: false` | ✅ [frameworks](04-backend/02-frameworks.md) §Passport.js |

## 02 — Distributed Systems *(all written)*

| Topic / keyword | File |
| --- | --- |
| what is a distributed system, scale up vs out, stateless, beginner start | ✅ [start here](02-distributed-systems/00-start-here-what-and-why.md) |
| which technology for which problem, Nginx, Envoy, Kubernetes, etcd, Prometheus, what to learn first | ✅ [the technology landscape](02-distributed-systems/00b-the-technology-landscape.md) |
| failure modes, fallacies of distributed computing | ✅ [foundations and failure modes](02-distributed-systems/01-foundations-failure-modes.md) |
| CAP, PACELC, consistency models, read-your-writes | ✅ [cap pacelc consistency](02-distributed-systems/02-cap-pacelc-consistency.md) |
| replication, leader-follower, quorum, partitioning, sharding, hot keys | ✅ [replication and partitioning](02-distributed-systems/03-replication-partitioning.md) |
| consensus, Raft, leader election, distributed locks, Redlock | ✅ [consensus and coordination](02-distributed-systems/04-consensus-coordination.md) |
| clocks, ordering, idempotency, exactly-once, 2PC, sagas, outbox | ✅ [idempotency and transactions](02-distributed-systems/05-idempotency-transactions.md) |
| queues, logs, Kafka, delivery semantics, backpressure, DLQ | ✅ [messaging and streams](02-distributed-systems/06-messaging-streams.md) |
| caching, invalidation, stampede, thundering herd | ✅ [caching at scale](02-distributed-systems/07-caching-at-scale.md) |
| timeouts, retries, circuit breakers, bulkheads, rate limiting, noisy neighbour | ✅ [resilience and rate limiting](02-distributed-systems/08-resilience-rate-limiting.md) |

## 03 — System Design *(all written)*

| Topic / keyword | File |
| --- | --- |
| what a design round is, one server → 10M users, beginner start | ✅ [start here](03-system-design/00-start-here-thinking-in-systems.md) |
| Postgres vs Mongo vs Dynamo, Kafka vs SQS, REST vs gRPC, SSE vs WebSockets, monolith vs microservices | ✅ [the technology toolbox](03-system-design/00b-the-technology-toolbox.md) |
| the method, how to run 45 minutes | ✅ [the method](03-system-design/01-the-method.md) |
| estimation, capacity, back-of-envelope, RPS | ✅ [estimation](03-system-design/02-estimation.md) |
| building blocks, reference architectures to draw | ✅ [building blocks](03-system-design/03-building-blocks.md) |
| design auth service, 2–3B req/day | ✅ [design auth service](03-system-design/04-design-auth-service.md) |
| design multi-tenant RBAC, SSO/SCIM, session revocation | ✅ [design rbac sso sessions](03-system-design/05-design-rbac-sso-sessions.md) |
| URL shortener, notifications, feed, rate limiter | ✅ [classics](03-system-design/06-classics.md) |

## 04 — Backend *(all written)*

| Topic / keyword | File |
| --- | --- |
| Node.js, event loop, async, memory, clustering | ✅ [nodejs internals](04-backend/01-nodejs-internals.md) |
| Express, NestJS, Fastify, DI, middleware, guards, PassportJS | ✅ [frameworks](04-backend/02-frameworks.md) |
| Golang, goroutines, channels ⚠️ RISK AREA | ✅ [golang](04-backend/03-golang.md) |
| REST, GraphQL, gRPC, Protobuf, WebSockets, Socket.io | ✅ [api styles](04-backend/04-api-styles.md) |
| microservices, boundaries, service mesh | ✅ [microservices](04-backend/05-microservices.md) |

## 05 — Data & Cache *(all written)*

| Topic / keyword | File |
| --- | --- |
| MongoDB, PostgreSQL, SQL, indexes, transactions | ✅ [databases](05-data-cache/01-databases.md) |
| Redis, ioredis, Mongoose, Sequelize, Firebase | ✅ [redis and orms](05-data-cache/02-redis-and-orms.md) |

## 06 — Testing *(all written)*

| Topic / keyword | File |
| --- | --- |
| Jest, TDD, coverage strategy, testing auth | ✅ [testing and coverage](06-testing/01-testing-and-coverage.md) |
| test automation, CI stages, flaky tests, coverage gate | ✅ [testing and coverage](06-testing/01-testing-and-coverage.md) §Test automation |

## 07 — Cloud & DevOps *(all written)*

| Topic / keyword | File |
| --- | --- |
| AWS EC2, S3, Lambda, CloudFront, IAM, Docker, Nginx, Jenkins, GoCD | ✅ [aws and containers](07-cloud-devops/01-aws-and-containers.md) |
| CloudWatch, metrics, alarms, log retention, cardinality | ✅ [aws and containers](07-cloud-devops/01-aws-and-containers.md) §CloudWatch |
| Route 53, DNS, alias records, TTL, failover routing | ✅ [aws and containers](07-cloud-devops/01-aws-and-containers.md) §Route 53 |
| CI/CD, deployment strategies, migrations, observability, SLO | ✅ [cicd and observability](07-cloud-devops/02-cicd-and-observability.md) |
| PM2, Postman, Newman, Jira, story points, velocity | ✅ [cicd and observability](07-cloud-devops/02-cicd-and-observability.md) §The day-to-day tooling |

## 08 — AI Tooling *(all written)*

| Topic / keyword | File |
| --- | --- |
| Claude Code, Copilot, AGENT.md/SKILLS.md, navigation index, playbooks | ✅ [ai engineering](08-ai-tooling/01-ai-engineering.md) |
| context engineering, prompt caching, model routing | ✅ [ai engineering](08-ai-tooling/01-ai-engineering.md) |
| AI code review, test generation, debugging, RCA, security analysis, GPT | ✅ [ai across the sdlc](08-ai-tooling/02-ai-across-the-sdlc.md) |

## 09 — DSA & Coding Rounds *(all written)*

| Topic / keyword | File |
| --- | --- |
| patterns, complexity, auth-flavoured problems | ✅ [patterns and complexity](09-dsa-coding-rounds/01-patterns-and-complexity.md) |
| how to pick a technique, prefix sum, forward/backward passes, monotonic stack, cyclic sort, binary search on answer, union-find, greedy vs DP, signal→pattern table | ✅ [choosing the approach](09-dsa-coding-rounds/02-choosing-the-approach.md) |
| what to practise, ~60 problems by block, time-boxing, mistake log, exit tests, heap from scratch, the 25-problem mock pool | ✅ [the drill plan](09-dsa-coding-rounds/03-the-drill-plan.md) |
| arrays, subarray vs subsequence, in-place read/write pointers, Kadane's, sort() comparator trap | ✅ [arrays](09-dsa-coding-rounds/04-arrays.md) |
| strings, immutability, frequency counts, expand around centre, trie, Unicode traps | ✅ [strings](09-dsa-coding-rounds/05-strings.md) |
| linked lists, dummy head, fast/slow pointers, reversal, Floyd's, LRU cache | ✅ [linked lists](09-dsa-coding-rounds/06-linked-lists.md) |
| 2-D arrays, matrices, grids, spiral, rotate, flood fill, multi-source BFS, grid DP | ✅ [matrices](09-dsa-coding-rounds/07-matrices.md) |
| stacks, queues, monotonic stack, monotonic deque, largest rectangle, amortised O(1) | ✅ [stacks and queues](09-dsa-coding-rounds/08-stacks-and-queues.md) |
| trees, BST, traversals, return vs record, diameter, LCA, B+ tree indexes | ✅ [trees](09-dsa-coding-rounds/09-trees.md) |
| heaps, priority queues, top-k, two-heap median, heapify, quickselect | ✅ [heaps](09-dsa-coding-rounds/10-heaps.md) |
| graphs, BFS vs DFS, cycle detection, topological sort, union-find, Dijkstra, implicit graphs | ✅ [graphs](09-dsa-coding-rounds/11-graphs.md) |

## 10 — Frontend *(all written)*

| Topic / keyword | File |
| --- | --- |
| React, Hooks, Redux, TypeScript, SCSS, Styled-Components, micro-frontends | ✅ [react and typescript](10-frontend/01-react-and-typescript.md) |

## Cross-cutting

| Need | File |
| --- | --- |
| Where I'm exposed | ✅ [WEAK-SPOTS](WEAK-SPOTS.md) |
| What I've drilled | ✅ [progress log](progress/log.md) |
| Does every resume skill have material | ✅ `python3 check_coverage.py` |
| Rebuild the study site | ✅ `python3 build_site.py` |
