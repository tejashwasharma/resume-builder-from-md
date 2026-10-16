# Index

Topic → file map. The skills read this to locate material; use it yourself to
jump straight to a concept.

Sections mirror the topics in `curriculum.json`, which is the study order.
`✅` written · `⏳` planned, not yet written. Never send someone to a `⏳` file.

## Auth & identity

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
| PassportJS, strategies, `session: false` | ✅ [frameworks](11-backend-nodejs/03-building-the-server.md) §Passport.js |

## Interview core — the loop, coding, distributed systems, design

`02-interview-core/` is numbered `01`–`48` in reading order: `01` the process,
`03`–`19` coding, `20`–`30` and `44`–`46` distributed-systems foundations, `31`–`39`
system design, `40`–`41` and `48` security, `42` behavioural, `43` the schedule,
`47` the hybrid round. The sidebar
groups them into topics; the numbers are the reading order within a topic.

### A. The process

| Topic / keyword | File |
| --- | --- |
| stages, phone screen, onsite, hiring committee, team match, the four attributes (problem solving, role knowledge, leadership, collaboration), mid-level vs senior, what to ask the recruiter | ✅ [the interview process](02-interview-core/01-the-interview-process.md) |
| hybrid round, domain knowledge plus coding in one slot, 45-minute split, compressed coding half, domain question ladder, one-sentence brute force, answering in 90 seconds, not knowing an answer, domain-flavoured problems, RRK and GCA in one write-up | ✅ [the hybrid round](02-interview-core/47-the-hybrid-round.md) |

### B. Coding — Big-O to 60+ solved problems

| Topic / keyword | File |
| --- | --- |
| the 45-minute shape, speaking script, what gets written down, senior-level downgrades, JS in a plain doc, mock transcript, data structures without a library, heap/union-find/trie from scratch, compressed round | ✅ [the coding round](02-interview-core/03-the-coding-round.md) |
| patterns, complexity, auth-flavoured problems, counting loop iterations, Big-O rules, TLE from constraints, space complexity, overflow, count factors, prime check, sieve, integer sqrt, AP/GP sums, modular arithmetic, N! mod p, number mod p, divisibility rules | ✅ [patterns and complexity](02-interview-core/04-patterns-and-complexity.md) |
| how to pick a technique, prefix sum, forward/backward passes, monotonic stack, cyclic sort, binary search on answer, union-find, greedy vs DP, signal→pattern table | ✅ [choosing the approach](02-interview-core/05-choosing-the-approach.md) |
| arrays, two pointers, sliding window, prefix sums, Kadane's, subarray sum k, trapping rain water, first missing positive, merge intervals, reverse/rotate array, range-sum queries, equilibrium index, special index, leaders, carry forward, contribution technique, sum of all subarray sums, min swaps, frequency queries, distinct in window, zero-sum subarray, equal 0s and 1s, noble integers, elements removal, comparator sort, majority element (Boyer–Moore), max consecutive ones, increasing triplets | ✅ [arrays and two pointers](02-interview-core/06-arrays-and-two-pointers.md) |
| strings, hashing, frequency counts, longest substring without repeats, minimum window, group anagrams, palindromes, toggle case, reverse words, counting sort, count 'ag' pairs, count palindromic substrings, HashMap vs HashSet | ✅ [strings and hashing](02-interview-core/07-strings-and-hashing.md) |
| linked lists, dummy head, fast/slow pointers, reverse in k-groups, merge k lists, random pointer copy, cycle start, build/traverse/search, insert at head/tail/k, delete head/tail/k/value, print in reverse | ✅ [linked lists](02-interview-core/08-linked-lists.md) |
| stacks, queues, monotonic stack/deque, largest rectangle, sliding window maximum, min stack, calculator | ✅ [stacks, queues, monotonic](02-interview-core/09-stacks-queues-monotonic.md) |
| trees, BST, traversals, LCA, serialize/deserialize, validate BST, max path sum | ✅ [trees and BST](02-interview-core/10-trees-and-bst.md) |
| heaps, priority queues, MinHeap from scratch, kth largest in stream, top-k frequent, median from stream, meeting rooms II | ✅ [heaps and top-k](02-interview-core/11-heaps-and-top-k.md) |
| graphs, BFS vs DFS, topological sort, course schedule, union-find, word ladder, Dijkstra, network delay | ✅ [graphs](02-interview-core/12-graphs.md) |
| matrices, grids, multi-source BFS, rotten oranges, rotate image, search 2-D matrix, grid DP, row/column sums, diagonals, anti-diagonals, transpose, rotate anticlockwise, boundary, spiral order | ✅ [matrices and grids](02-interview-core/13-matrices-and-grids.md) |
| recursion, backtracking, subsets, permutations, combination sum, N-Queens, generate parentheses, the three steps of recursion, sum/factorial/Fibonacci, recursion complexity, fast power, a^n mod m, Josephus, subarray vs subsequence vs subset, count subsequences with sum K, bitmask enumeration | ✅ [recursion and backtracking](02-interview-core/14-recursion-and-backtracking.md) |
| dynamic programming, memoisation vs tabulation, house robber, coin change, LIS, LCS, edit distance, knapsack, word break | ✅ [dynamic programming](02-interview-core/15-dynamic-programming.md) |
| binary search, rotated array, first/last position, binary search on the answer, koko, median of two sorted arrays, bit tricks, XOR, decimal↔binary, add binary, bitwise operators, check/set/unset/toggle i-th bit, count set bits, two's complement | ✅ [binary search and bits](02-interview-core/16-binary-search-and-bits.md) |
| trie, autocomplete, intervals, insert interval, LRU cache, LFU cache, rate limiter, consistent hashing, iterators | ✅ [tries, intervals, design structures](02-interview-core/17-tries-intervals-and-design-structures.md) |
| IAM policy evaluation, permission inheritance, secret scanning, dependency resolution, SBOM diff, audit-log dedup, path traversal, CIDR match, top-k offenders, OAuth scope reachability, privilege escalation path, host allowlist wildcards, certificate chain validation, token-bucket rate limiter, dependency confusion | ✅ [security-flavoured problems](02-interview-core/18-security-flavoured-problems.md) |
| drill, the pattern problem banks: every standard problem type, with algorithm + TypeScript | ✅ `## Problem bank` sections in [04](02-interview-core/04-patterns-and-complexity.md), [06](02-interview-core/06-arrays-and-two-pointers.md), [07](02-interview-core/07-strings-and-hashing.md), [08](02-interview-core/08-linked-lists.md), [13](02-interview-core/13-matrices-and-grids.md), [14](02-interview-core/14-recursion-and-backtracking.md), [16](02-interview-core/16-binary-search-and-bits.md) |
| what to practise, the ladder, time-boxing, mistake log, exit tests, the 30-problem mock pool | ✅ [the drill plan](02-interview-core/19-the-drill-plan.md) |

### C. Distributed-systems foundations

| Topic / keyword | File |
| --- | --- |
| IP, packets, latency vs bandwidth, TCP handshake, congestion, head-of-line blocking, TIME_WAIT, port exhaustion, DNS resolution and TTL, TLS handshake, certificate expiry, mTLS, HTTP/1.1 vs 2 vs 3, QUIC, keep-alive, connection pooling, timeout budgets, L4 vs L7 | ✅ [networking](02-interview-core/44-networking.md) |
| pages, buffer pool, B-tree, LSM, SSTable, compaction, bloom filter, covering index, composite key order, selectivity, write-ahead log, fsync, group commit, checkpoint, ACID, isolation levels, dirty/non-repeatable/phantom read, write skew, MVCC, vacuum, optimistic vs pessimistic locking, deadlocks | ✅ [storage engines and transactions](02-interview-core/45-storage-engines-and-transactions.md) |
| multi-region, RPO, RTO, active-passive, active-active, split brain, fencing, home region, last-write-wins, CRDT, geo-partitioning, data residency, read-local write-home, inter-region latency | ✅ [multi-region](02-interview-core/46-multi-region.md) |
| Kafka, RabbitMQ, SQS, SNS, EventBridge, partitions, consumer groups, offsets, idempotent producer, exchanges, visibility timeout, DLQ | ✅ [messaging in practice](03-backend/06-messaging-in-practice.md) |
| what is a distributed system, scale up vs out, stateless, beginner start | ✅ [start here](02-interview-core/20-distributed-start-here.md) |
| which technology for which problem, Nginx, Envoy, Kubernetes, etcd, Prometheus, what to learn first | ✅ [the technology landscape](02-interview-core/21-the-technology-landscape.md) |
| failure modes, fallacies of distributed computing | ✅ [failure modes and fallacies](02-interview-core/22-failure-modes-and-fallacies.md) |
| CAP, PACELC, consistency models, read-your-writes, Spanner, TrueTime | ✅ [consistency, CAP, PACELC](02-interview-core/23-consistency-cap-pacelc.md) |
| replication, leader-follower, quorum, partitioning, sharding, hot keys, Bigtable | ✅ [replication and partitioning](02-interview-core/24-replication-partitioning.md) |
| consensus, Raft, Paxos, Chubby, leader election, distributed locks, Redlock | ✅ [consensus and coordination](02-interview-core/25-consensus-coordination.md) |
| clocks, ordering, idempotency, exactly-once, 2PC, sagas, outbox | ✅ [idempotency and transactions](02-interview-core/26-idempotency-transactions.md) |
| queues, logs, Kafka, Pub/Sub, delivery semantics, backpressure, DLQ | ✅ [messaging and streams](02-interview-core/27-messaging-streams.md) |
| caching, invalidation, stampede, thundering herd | ✅ [caching at scale](02-interview-core/28-caching-at-scale.md) |
| timeouts, retries, circuit breakers, bulkheads, rate limiting, noisy neighbour | ✅ [resilience and rate limiting](02-interview-core/29-resilience-rate-limiting.md) |
| SLI, SLO, error budget, golden signals, alerting, canary, rollback, incidents, postmortems, load shedding | ✅ [observability, SLOs, operations](02-interview-core/30-observability-slos-and-operations.md) |

### D. System design

| Topic / keyword | File |
| --- | --- |
| what a design round is, one server → 10M users, beginner start | ✅ [start here](02-interview-core/31-design-round-start-here.md) |
| the method, how to run 45 minutes, how the design round runs, the senior bar | ✅ [the method](02-interview-core/32-the-method.md) |
| estimation, capacity, back-of-envelope, RPS | ✅ [estimation](02-interview-core/33-estimation.md) |
| Postgres vs Mongo vs Dynamo, Kafka vs SQS, REST vs gRPC, SSE vs WebSockets, monolith vs microservices | ✅ [the technology toolbox](02-interview-core/34-the-technology-toolbox.md) |
| building blocks, when to add each and when not to, load balancer, gateway, CDN, cache, replicas, partitioning, object store, queue, stream, worker pool, DLQ, scheduler, idempotency store, rate limiter, search index, pub/sub, service discovery, feature flags, secrets store | ✅ [building blocks](02-interview-core/35-building-blocks.md) |
| Zanzibar, BeyondCorp, Borg, Spanner, Bigtable, Colossus, Pub/Sub, SLSA, Sigstore, in-toto, SBOM — what to cite and how | ✅ [Hyperscale vocabulary](02-interview-core/36-scale-vocabulary.md) |
| design auth service, multi-region, revocation, key rotation, alternatives and why not | ✅ [design auth service](10-design-cases/05-design-auth-service.md) |
| design multi-tenant RBAC, SSO/SCIM, session revocation, the Zanzibar model, new enemy, zookies | ✅ [design identity subsystem](10-design-cases/06-design-identity-subsystem.md) |
| URL shortener, notifications, feed, rate limiter, key-value store, log pipeline, job scheduler | ✅ [classics](02-interview-core/39-design-classics.md) |
| cloud security posture, third-party access inventory, supply-chain integrity, authorization service, secrets detection, package registry proxy, agentic-AI guardrails | ✅ [design security systems](02-interview-core/40-design-security-systems.md) |
| requirements gathering, functional vs non-functional, clarifying questions, panel feedback, why design rounds fail | ✅ [requirements playbook](10-design-cases/01-requirements-playbook.md), [panel feedback and practice plan](10-design-cases/02-panel-feedback-and-practice-plan.md) |
| design email service, multi-tenant quotas, daily quota reset, over-quota policy, idempotency, token bucket, DLQ, deferred dispatcher, why not cron or Step Functions, notification service, webhook delivery | ✅ [design email service](10-design-cases/03-design-email-service.md) |
| design e-commerce platform, service decomposition, purchase flow, catalog and search, search index sync, outbox, reindex, cart, checkout, idempotent order, inventory, overselling, reservation TTL, hot SKU, flash sale, order saga, compensation, payments, double charge, webhooks, reconciliation, fulfillment, sale-day scaling, marketplace | ✅ [design e-commerce platform](10-design-cases/04-design-ecommerce-platform.md) |

### E. The security round, behavioural & leadership, the schedule

| Topic / keyword | File |
| --- | --- |
| threat modelling, STRIDE, CWE classes, secure by design, safe coding, memory safety, SLSA, Sigstore, SBOM, xz, cloud IAM misconfig, CSPM, third-party risk, prompt injection, OWASP LLM Top 10 | ✅ [security domain knowledge](02-interview-core/41-security-domain-knowledge.md) |
| third-party platform security, OAuth app governance, grant inventory, consent phishing, illicit consent grant, delegated vs application permissions, offline_access, refresh token as standing credential, publisher verification, SaaS-to-SaaS, sub-processors, browser extensions, vendor service accounts, access reviews with expiry, notify-then-revoke, vendor breach first hour, blast radius ranking | ✅ [third-party platform security](02-interview-core/48-third-party-platform-security.md) |
| emergent leadership, ambiguity, 0→1, mentoring, pushed back, failure, conflict, why this company | ✅ [behavioural and leadership](02-interview-core/42-behavioral-and-leadership.md) |
| week-by-week schedule, mock pool, day-before checklist, hiring committee wait, team match, offer basics | ✅ [the schedule](02-interview-core/43-the-schedule.md) |

## Backend: Node.js

| Topic / keyword | File |
| --- | --- |
| TypeScript, strict mode, type erasure, unknown vs any, discriminated unions, zod, z.infer, branded types, Promise.all, floating promises, error cause, ES modules, tsconfig | ✅ [typescript for backend](11-backend-nodejs/01-typescript-for-backend.md) |
| Node.js, event loop, phases, microtasks, thread pool, blocking the loop, clustering, memory and leaks | ✅ [the runtime and the event loop](11-backend-nodejs/02-runtime-and-event-loop.md) |
| building a server, node:http, routing, middleware chain and ordering, body limits, validation, error mapper, JWT auth middleware, config at startup, connection pool, graceful shutdown, project layout, Express, Fastify, NestJS, PassportJS, Express 4 async trap | ✅ [building the server](11-backend-nodejs/03-building-the-server.md) |
| testing handlers, fakes vs mocks, injected clock, multi-stage Dockerfile, exec-form CMD, one process per container, event-loop lag, production checklist | ✅ [testing, structure and production](11-backend-nodejs/04-testing-structure-production.md) |

## Backend: cross-cutting

| Topic / keyword | File |
| --- | --- |
| REST, GraphQL, gRPC, Protobuf, WebSockets, Socket.io | ✅ [api styles](03-backend/04-api-styles.md) |
| microservices, boundaries, service mesh | ✅ [microservices](03-backend/05-microservices.md) |

## Data & caching

| Topic / keyword | File |
| --- | --- |
| MongoDB, PostgreSQL, SQL, indexes, transactions | ✅ [databases](04-data-cache/01-databases.md) |
| Redis, ioredis, Mongoose, Sequelize, Firebase | ✅ [redis and orms](04-data-cache/02-redis-and-orms.md) |
| Elasticsearch, OpenSearch, inverted index, analyzers, mappings, shards, bool query, search_after, ILM, reindex with alias | ✅ [elasticsearch](04-data-cache/03-elasticsearch.md) |

## Testing & quality

| Topic / keyword | File |
| --- | --- |
| Jest, TDD, coverage strategy, testing auth | ✅ [testing and coverage](05-testing/01-testing-and-coverage.md) |
| test automation, CI stages, flaky tests, coverage gate | ✅ [testing and coverage](05-testing/01-testing-and-coverage.md) §Test automation |

## DevOps & SRE

| Topic / keyword | File |
| --- | --- |
| Linux processes, RSS vs VSZ, load average, state D, OOM killer, file descriptors, EMFILE, CLOSE_WAIT, signals, exit 137/143, systemd units | ✅ [linux for operators](06-cloud-devops/05-linux-for-operators.md) |
| strace, ss, lsof, vmstat, iostat, dmesg, tcpdump, dig, the five-minute triage | ✅ [linux for operators](06-cloud-devops/05-linux-for-operators.md) §The toolkit, by question |
| Namespaces vs cgroups, image layers, multi-stage builds, layer caching, distroless, musl vs glibc, PID 1, tini, Nginx, reverse proxy, L4 vs L7 | ✅ [containers, properly](06-cloud-devops/06-containers.md) |
| GOMAXPROCS and cgroup limits, /sys/fs/cgroup, PYTHONUNBUFFERED, container debugging | ✅ [containers, properly](06-cloud-devops/06-containers.md) §The trap |
| Kubernetes reconciliation, API server, etcd, scheduler, kubelet, Pod, Deployment, StatefulSet, DaemonSet, Service, EndpointSlice, Ingress, Gateway API, ConfigMap, Secret, ServiceAccount, IRSA, RBAC | ✅ [kubernetes: the object model](06-cloud-devops/07-kubernetes-objects.md) |
| Requests vs limits, QoS classes, taints, affinity, topology spread, PodDisruptionBudget, ResourceQuota | ✅ [kubernetes: the object model](06-cloud-devops/07-kubernetes-objects.md) §Requests, limits and QoS |
| Liveness/readiness/startup probes, rollouts, maxSurge/maxUnavailable, graceful shutdown, preStop, HPA/VPA/cluster autoscaler, CrashLoopBackOff, OOMKilled, kubectl triage | ✅ [kubernetes: operating it](06-cloud-devops/08-kubernetes-operations.md) |
| Terraform state, locking, plan/apply, drift, moved blocks, import, modules, count vs for_each, policy as code, CloudFormation vs CDK vs Pulumi, immutable infrastructure | ✅ [infrastructure as code](06-cloud-devops/09-infrastructure-as-code.md) |
| CI/CD pipeline design, build once promote, deployment strategies, canary analysis, shadow mode, feature flags, expand/contract migrations, CREATE INDEX CONCURRENTLY | ✅ [pipelines and GitOps](06-cloud-devops/10-pipelines-and-gitops.md) |
| GitOps, Argo CD, Flux, config repo, sync waves, OIDC federation, pinned actions, SBOM, image signing, supply chain | ✅ [pipelines and GitOps](06-cloud-devops/10-pipelines-and-gitops.md) §GitOps |
| Jenkins, GoCD, value stream map, managed runners, PM2, Postman, Newman, Jira, story points, velocity | ✅ [pipelines and GitOps](06-cloud-devops/10-pipelines-and-gitops.md) §The tooling you will be asked to name |
| Prometheus pull model, exporters, kube-state-metrics, counter/gauge/histogram/summary, PromQL, rate vs irate, histogram_quantile, cardinality, recording rules, burn-rate alerts, Alertmanager, Grafana | ✅ [the monitoring stack](06-cloud-devops/11-the-monitoring-stack.md) |
| Structured logs, traces, head vs tail sampling, exemplars, correlation id, OpenTelemetry | ✅ [the monitoring stack](06-cloud-devops/11-the-monitoring-stack.md) §Logs, traces and the three pillars |
| Incident command, mitigate before diagnose, blameless postmortems, detection latency, RPO/RTO, tested restores, game days, on-call load, toil, error-budget policy, cloud cost | ✅ [running it on call](06-cloud-devops/12-running-it-on-call.md) |
| AWS EC2, S3, Lambda, API Gateway, IAM, VPC, security groups, NAT, Secrets Manager, SQS/SNS/EventBridge, Route 53 | ✅ [aws ecosystem](06-cloud-devops/01-aws-ecosystem.md) |
| AWS SDK v3, credential provider chain, presigned URLs, Lambda handler types, RDS Proxy | ✅ [aws ecosystem](06-cloud-devops/01-aws-ecosystem.md) §Building it |
| CloudWatch deep dive, Logs Insights, EMF, alarms, CloudTrail, trails, data events, Lake, X-Ray, tracing, sampling, CloudFront cache key, OAC, Origin Shield, Functions vs Lambda@Edge | ✅ [cloudwatch, cloudtrail, x-ray, cloudfront](06-cloud-devops/03-cloudwatch-cloudtrail-xray-cloudfront.md) |

## AI engineering

| Topic / keyword | File |
| --- | --- |
| Claude Code, Copilot, AGENT.md/SKILLS.md, navigation index, playbooks | ✅ [ai engineering](07-ai-tooling/01-ai-engineering.md) |
| context engineering, prompt caching, model routing | ✅ [ai engineering](07-ai-tooling/01-ai-engineering.md) |
| AI code review, test generation, debugging, RCA, security analysis, GPT | ✅ [ai across the sdlc](07-ai-tooling/02-ai-across-the-sdlc.md) |
| RAG, retrieval-augmented generation, embeddings, chunking, hybrid search, reranking, vector store, pgvector, permission-aware retrieval, prompt injection, golden set, Slack support bot | ✅ [RAG and LLM-backed bots](07-ai-tooling/03-rag-and-llm-bots.md) |

## Frontend

| Topic / keyword | File |
| --- | --- |
| React, Hooks, Redux, TypeScript, SCSS, Styled-Components, micro-frontends | ✅ [react and typescript](08-frontend/01-react-and-typescript.md) |

## Low-level design — for companies that run a dedicated LLD/OOD round

| Topic / keyword | File |
| --- | --- |
| what LLD tests, method, HLD vs LLD, concurrency follow-ups | ✅ [lld start here](09-lld/01-lld-start-here.md) |
| OOP pillars, SOLID, Strategy, Factory, Observer, Singleton, Decorator, State, Command, Builder, Adapter | ✅ [oop, solid and patterns](09-lld/02-oop-solid-and-patterns.md) |
| parking lot, LRU cache, elevator, vending machine, Splitwise/expense sharing, movie ticket booking, seat locking | ✅ [classic LLD problems](09-lld/03-classic-lld-problems.md) |

## Cross-cutting

| Need | File |
| --- | --- |
| What I've drilled | ✅ [progress log](progress/log.md) |
| Are the question blocks, diagrams and links valid | ✅ `python3 check_coverage.py` |
| The contract for writing a chapter | ✅ [AGENT.md](AGENT.md) |
| Rebuild the study site | ✅ `python3 build_site.py` |
