# Pipelines and GitOps

A pipeline is a design problem, not a YAML file. The design question is: what
is the cheapest sequence of checks that makes you confident enough to put this
in front of users, and what happens automatically when it turns out you were
wrong? GitOps is the answer to the second half of the delivery problem — who
is allowed to change production, and how you know what is running.

---

## In brief

- **Build the artefact once and promote it.** Rebuild per environment and what
  you tested is not what you shipped.
- **Cheap checks first.** A lint error should fail in 30 seconds, not after a
  ten-minute suite.
- **Deploy and release are different things.** A feature flag separates "the
  code is live" from "the behaviour is on", which is the biggest single
  improvement to deployment safety most teams can make.
- **Canary with automatic rollback on error rate is the mature answer** for a
  tier-0 service, because production traffic is the one thing staging cannot
  reproduce.
- **Migrations that "can't be rolled back" usually were not split** into
  backward-compatible steps: add, dual-write, backfill, read-new, drop-old.
- **GitOps inverts the direction of deployment.** Nothing pushes to the
  cluster; an agent inside it pulls the declared state from git and reconciles
  — so no CI system needs production credentials, and drift is corrected rather
  than discovered.
- **The pipeline is a supply chain and an attack surface.** It holds the
  credentials that can change production, so OIDC rather than stored keys,
  pinned actions, signed images and a generated SBOM.

---

## The pipeline as a design problem

```mermaid
flowchart TD
  C["commit"] --> F["lint · types · unit tests<br/><i>cheap: fail in 30s</i>"]
  F --> B["<b>build the artefact ONCE</b><br/><i>immutable tag = git sha</i>"]
  B --> SEC["scan: deps · image · secrets<br/>sign + SBOM"]
  SEC --> I["integration tests<br/><i>real DB in a container</i>"]
  I --> ST["deploy staging → smoke"]
  ST --> CAN["production canary<br/><i>5% of traffic</i>"]
  CAN --> W{"error rate + p99<br/>vs the old version"}
  W -->|holds| FULL["progressive rollout to 100%"]
  W -->|degrades| RB["automatic rollback"]
```
*Each stage is paid for by the failures it catches. Ordering by cost is why a typo fails in half a minute, and the comparison gate at the end is the only stage that can catch what staging structurally cannot: real traffic.*

The ordering principle is **cost ascending, confidence ascending**. What makes
this a design discussion rather than a template:

- **Which checks block, and which only report?** A failing unit test blocks. A
  new low-severity dependency advisory should probably open a ticket, because a
  gate that fires constantly for things nobody can act on today trains people
  to bypass gates.
- **What is the slowest stage, and is the feedback loop acceptable?** If the
  full pipeline is 40 minutes, people batch changes, and batching makes every
  deploy riskier. Pipeline duration is a reliability property.
- **What is flaky?** A test that fails 2% of the time in a 30-step pipeline
  fails often enough that re-running becomes a reflex, and then a real failure
  gets re-run too. Flaky tests are worse than missing tests because they
  destroy the signal.

**Build once, promote the same artefact.** The artefact is an immutable image
tagged with the git sha — never `latest`, never a rebuild per environment.
Everything downstream refers to that digest, so "what is in production" has a
single answer that points at a single commit.

### Deployment strategies

```mermaid
flowchart TD
  subgraph R["Rolling"]
    direction TB
    R1["replace instances gradually"] --> R2["<i>both versions live; cheap; no comparison</i>"]
  end
  subgraph B["Blue / green"]
    direction TB
    B1["stand up the new stack whole"] --> B2["flip traffic<br/><i>instant rollback, double the cost</i>"]
  end
  subgraph C["Canary"]
    direction TB
    C1["a small slice of real traffic"] --> C2["compare metrics, then widen<br/><i>catches what staging cannot</i>"]
  end
  R ~~~ B ~~~ C
```
*The distinguishing question is not how traffic moves but whether anything is compared. Rolling and blue-green are traffic mechanics; a canary is a hypothesis test, and the comparison is the part that has value.*

| Strategy | How | Trade |
| --- | --- | --- |
| **Rolling** | Replace instances gradually | Simplest; both versions live at once, so changes must be backward compatible |
| **Blue-green** | Two full environments, switch traffic | Instant rollback; double the capacity, and shared state (the database) does not switch |
| **Canary** | Small share of traffic, compare, widen | Safest; needs trustworthy per-version metrics |
| **Shadow / mirror** | Copy traffic to the new version, discard the responses | Zero user risk; only safe if the shadow has no side effects |

**Canary with automatic rollback on error rate is the mature answer** for
anything tier-0, and the detail that makes it work is that the comparison is
**against the old version on the same traffic at the same time**, not against
a static threshold — which controls for a spike that would have happened
anyway. In Kubernetes this is usually Argo Rollouts or Flagger driving a mesh
or ingress weighting, with an analysis template that queries Prometheus and
aborts the rollout on its own.

**Shadow mode deserves a mention** because it is the right answer for one
specific and important case: a change to authorisation or pricing logic, where
being *wrongly permissive* produces no errors at all. You cannot catch that
with an error rate. Running the new logic alongside the old without enforcing
it, and comparing the decisions on real traffic, is the only thing that does.

### Deploy ≠ release

Feature flags separate shipping code from enabling behaviour. The consequences
are larger than they look: you can deploy twenty times a day while a feature is
half-finished; you can enable something for 1% of users or one internal tenant;
and you can turn it off in seconds without a rollback, a rebuild or a pipeline
run. Turning a behaviour off is a config change, and that is the fastest
mitigation that exists.

The cost is real and worth stating: every flag is a branch in production, flags
multiply into untested combinations, and a flag nobody removed is technical debt
with a blast radius. So flags need owners and expiry dates, and "remove the
flag" belongs in the same PR series as "add the flag".

### Database migrations

The part that genuinely cannot be rolled back — unless you make it not need to.

```mermaid
flowchart TD
  A["1. add the new column<br/><i>old code ignores it</i>"] --> B["2. deploy code that<br/>writes BOTH"]
  B --> C["3. backfill in batches<br/><i>resumable</i>"] --> D["4. deploy code that<br/>reads the new"] --> E["5. drop the old"]
```
*Five deploys instead of one, and at every point the live schema is correct for the code that is running — so a code rollback is always safe. That property is the entire reason for the extra steps.*

The expand/contract discipline: **add** the new column (old code ignores it);
**dual-write** old and new; **backfill** existing rows in resumable batches;
**read** the new; **drop** the old. The rules that make it work in practice:
every schema change is additive and backward compatible; backfills are batched
so they do not lock a large table and are resumable because they *will* be
interrupted; and the destructive final step waits days, not minutes.

For genuinely destructive changes the protection is a tested restore path, not
a careful hand — see [running it on call](12-running-it-on-call.md). But most
migrations are only destructive because they were done in one step.

---

## GitOps: inverting the deployment direction

```mermaid
flowchart LR
  subgraph CI["CI (no cluster credentials)"]
    A["build + test"] --> B["push image<br/>registry"]
    B --> C["commit new tag to<br/>config repo"]
  end
  subgraph CL["cluster"]
    D["GitOps agent<br/><i>Argo CD / Flux</i>"] --> E["apply + reconcile"]
    E --> F["actual state"]
    F -.-> D
  end
  C --> G[("config repo<br/>desired state")]
  G -.->|"agent PULLS"| D
  D -->|"drift detected"| E
```
*The arrow into the cluster comes from inside it. CI never holds cluster credentials — it only writes to a git repository — and the agent continuously corrects drift instead of deploying once and hoping.*

Classic CI/CD **pushes**: the pipeline holds cluster credentials and runs
`kubectl apply`. GitOps **pulls**: an agent in the cluster watches a git
repository and reconciles the cluster toward it, continuously. It works because
[Kubernetes is already a reconciliation
engine](07-kubernetes-objects.md) — GitOps just moves the source of desired
state into git.

What that buys, in the order that matters:

- **No cluster credentials in CI.** The pipeline's most dangerous permission
  disappears. CI can only write to a git repo, and the agent's credentials
  never leave the cluster.
- **Git is the audit log and the inventory.** "What is running in production"
  is a `git log`, with an author, a reviewer and a timestamp per change.
- **Drift is corrected, not discovered.** Someone's manual `kubectl edit` is
  reverted on the next reconciliation, which is the behaviour you want in
  production and the thing to be aware of during an incident.
- **Recovery and new environments are a repository.** Point an agent at the
  repo and a cluster rebuilds itself.
- **Rollback is `git revert`.** The same mechanism as any other change, with
  the same review trail.

**The repository split** is the part people get wrong: the application repo
holds code; a **separate config repo** holds the rendered manifests. CI's last
act is to commit a new image tag to the config repo, which keeps a deploy
auditable and stops a code PR from accidentally also being an infrastructure
change. The same config repo holds all environments as directories, so
promotion from staging to production is literally a pull request moving a tag.

**What GitOps does not solve**, and saying so is the senior answer:

- **Secrets.** You cannot commit them in plain text, so you need Sealed
  Secrets, SOPS, or an operator that syncs from a real secrets manager
  (External Secrets Operator). This is the first real problem every adoption
  hits.
- **Ordering and dependencies.** "Migrate the database, then deploy" is not
  naturally expressible in a declarative pull model; you get sync waves and
  hooks, which are more awkward than a pipeline step.
- **Progressive delivery** needs an extra component (Argo Rollouts, Flagger) —
  the agent on its own just applies.
- **The git repo becomes production.** Its access controls, review rules and
  branch protection are now production access controls, and a compromised repo
  is a compromised cluster.
- **Debugging gains a layer.** "Why is this not deployed" now has three
  candidate answers — CI, the repo, the agent's sync status — and `kubectl` no
  longer tells the whole story.

---

## The pipeline is a supply chain

The pipeline holds credentials that can change production, runs third-party
code on every commit, and produces the artefacts you trust by definition. That
makes it a target, and this is increasingly where interviews go.

The practices, in rough order of payoff:

- **OIDC federation instead of stored credentials.** CI exchanges a
  short-lived identity token for a cloud role. No long-lived keys in secrets,
  nothing to leak or rotate, and the trust policy can be scoped to one repo and
  even one branch.
- **Pin third-party actions to a commit sha**, not a tag. A tag is mutable, so
  `@v3` means "whatever the maintainer points it at today", and that is an
  arbitrary code-execution path into your pipeline. This is not theoretical;
  it has happened.
- **Least privilege per job.** Read-only by default; the one job that can write
  to production gets its own narrow role, as in
  [infrastructure as code](09-infrastructure-as-code.md).
- **Never run untrusted code with secrets in scope.** A fork's pull request
  must not get access to the secret store — the specific trap is a workflow
  trigger that runs the fork's code in the base repository's context.
- **Dependency and image scanning** at build time, with the output triaged
  rather than printed. Fail on high-severity and on new findings; report the
  rest.
- **Sign the image and generate an SBOM**, then verify the signature at
  admission. This is what makes "only artefacts our pipeline built can run
  here" enforceable rather than assumed, and it is the answer to a dependency
  compromise: an SBOM makes "are we affected" a query rather than an
  archaeology project.
- **Protect the branch that deploys.** Required review, no force push, no
  self-approval. In GitOps this branch *is* the production control plane.

---

## Building it

**A pipeline with the properties above**

```yaml
# .github/workflows/deliver.yml
permissions:
  contents: read
  id-token: write            # OIDC, so no cloud keys are stored
  packages: write

jobs:
  verify:                    # cheap checks first, in one fast job
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde6 # v4.1.1 — pinned to a sha, not a tag
      - uses: actions/setup-node@60edb5d # v4.0.2
        with: { node-version: '20.11', cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck     # seconds
      - run: npm test -- --coverage                # ~1 minute
      - run: npm audit --audit-level=high

  build:                     # build ONCE; everything downstream uses the digest
    needs: verify
    runs-on: ubuntu-latest
    outputs:
      digest: ${{ steps.push.outputs.digest }}
    steps:
      - uses: actions/checkout@b4ffde6
      - id: push
        uses: docker/build-push-action@2cdde99 # v5.3.0
        with:
          push: true
          tags: ghcr.io/acme/links-api:${{ github.sha }}   # immutable tag
          provenance: true
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - uses: aquasecurity/trivy-action@062f2f6 # v0.19.0
        with:
          image-ref: ghcr.io/acme/links-api@${{ steps.push.outputs.digest }}
          severity: HIGH,CRITICAL
          exit-code: '1'                                   # this one blocks
      - run: |                                             # sign + SBOM
          cosign sign --yes ghcr.io/acme/links-api@${{ steps.push.outputs.digest }}
          syft ghcr.io/acme/links-api@${{ steps.push.outputs.digest }} \
            -o spdx-json > sbom.json
      - uses: actions/upload-artifact@26f96df # v4.3.1
        with: { name: sbom, path: sbom.json }

  integration:
    needs: build
    runs-on: ubuntu-latest
    services:                                              # a real database
      postgres:
        image: postgres:16.2
        env: { POSTGRES_PASSWORD: test }
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-retries 10
    steps:
      - uses: actions/checkout@b4ffde6
      - run: npm ci && npm run migrate && npm run test:integration
        env: { DATABASE_URL: postgres://postgres:test@localhost:5432/postgres }

  release:                   # GitOps: commit the tag, do NOT touch the cluster
    needs: integration
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde6
        with:
          repository: acme/config            # the separate config repo
          token: ${{ secrets.CONFIG_REPO_TOKEN }}   # write to git only
      - run: |
          cd envs/staging/links-api
          yq -i '.image.digest = "${{ needs.build.outputs.digest }}"' values.yaml
          git commit -am "links-api: ${{ github.sha }} → staging"
          git push
      # Promotion to production is a pull request in the config repo, reviewed
      # by a human. CI has no production cluster credentials at all.
```

The shape to notice: this pipeline's final act is a **git commit**, not a
`kubectl apply`. Nothing here can reach the cluster, which is the entire point.

**A canary that decides for itself**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: links-api }
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 5m }        # soak at 5% while analysis runs
        - setWeight: 25
        - pause: { duration: 10m }
        - setWeight: 50
        - pause: { duration: 10m }
      analysis:
        templates: [{ templateName: error-rate-and-latency }]
        startingStep: 1                  # abort and roll back automatically
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: { name: error-rate-and-latency }
spec:
  metrics:
    - name: error-rate
      interval: 1m
      failureLimit: 2                    # two bad readings, not one blip
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          # Compare the CANARY against itself over time, and keep the
          # threshold tied to the SLO rather than to a round number.
          query: |
            sum(rate(http_requests_total{service="links-api",canary="true",status=~"5.."}[2m]))
            /
            sum(rate(http_requests_total{service="links-api",canary="true"}[2m]))
      successCondition: result[0] <= 0.01
```

**The expand/contract migration, as actual steps**

```sql
-- Deploy 1: additive only. Old code does not know this column exists.
ALTER TABLE links ADD COLUMN owner_id uuid;
CREATE INDEX CONCURRENTLY idx_links_owner ON links(owner_id);  -- no table lock
```

```ts
// Deploy 2: write both, read the old one. Rollback-safe in both directions.
await db.query(
  'INSERT INTO links (slug, user_email, owner_id) VALUES ($1, $2, $3)',
  [slug, email, ownerId],
);

// Deploy 3 (a job, not a migration): backfill in resumable batches.
// Batched so we never hold a long lock; keyed so a restart resumes.
let cursor = await loadCursor();
for (;;) {
  const { rows } = await db.query(
    `UPDATE links SET owner_id = u.id
       FROM users u
      WHERE links.user_email = u.email
        AND links.owner_id IS NULL
        AND links.id > $1
      ORDER BY links.id LIMIT 1000
    RETURNING links.id`, [cursor]);
  if (rows.length === 0) break;
  cursor = rows[rows.length - 1].id;
  await saveCursor(cursor);              // interrupted backfills are normal
  await sleep(100);                      // leave room for production traffic
}
```

```sql
-- Deploy 4: read the new column only (code change, no schema change).
-- Deploy 5, days later, once nothing reads it: the destructive step.
ALTER TABLE links DROP COLUMN user_email;
```

`CREATE INDEX CONCURRENTLY` in step 1 is the detail that separates someone who
has done this from someone who has read about it: a plain `CREATE INDEX` takes
a write lock on the table for the duration, which on a large table is an
outage.

---

## The tooling you will be asked to name

Four names that are easy to list and easy to be caught out on. Each has one
question an interviewer actually asks.

### Argo CD and Flux

The two GitOps agents. **Argo CD** has a strong UI showing the diff between git
and the cluster per application, an app-of-apps pattern for managing many
applications, and sync waves for ordering. **Flux** is a set of controllers with
no UI, is more composable, and integrates image automation natively. Either is
a defensible choice; the interesting questions are the ones above about
secrets, ordering and the repo becoming production.

### Jenkins and GoCD

Both are self-hosted CI/CD servers predating managed runners. **Jenkins** is the
ubiquitous one: an enormous plugin ecosystem, `Jenkinsfile` pipelines as code,
and an equally enormous maintenance burden — plugin version conflicts and a
snowflake controller nobody dares upgrade are the classic problems. **GoCD** is
less common and better at one thing: first-class pipeline modelling, with a
**value stream map** showing a commit's journey across every pipeline and
stage, and native fan-in/fan-out between pipelines where Jenkins needs plugins
and glue.

What would you choose *now*: a managed runner (GitHub Actions, GitLab CI) for
almost anything new — containerised builds, no server to maintain, config
beside the code. Self-hosted is justified by strict compliance, air-gapped
environments, or existing heavy investment.

### PM2

A Node process manager: keeps processes alive, restarts on crash, runs one
worker per core in cluster mode, handles log rotation and zero-downtime reload.

**The question you get is "why PM2 if you're on containers?"** — and mostly you
should not, for the reasons in [containers](06-containers.md): two supervisors,
and PM2 restarting a broken process forever so the orchestrator never notices.
PM2 belongs on a long-lived VM, where it earns its keep. The detail worth
knowing is that **cluster mode gives you processes, not threads** (see [the Node
runtime](../11-backend-nodejs/02-runtime-and-event-loop.md)), so anything in
process memory — a session cache, a rate-limit counter — is now per-worker and
wrong, and has to move to Redis.

### Jira

Issue tracking, and the substrate for the ceremonies most teams run.

**Vocabulary:** epic → story → sub-task; bug; sprint; backlog; board.
**Estimation** in story points is about relative size and uncertainty, not
hours — the point people get wrong. **Velocity is a planning input, not a
performance metric**; the moment it is used to compare people or teams it gets
gamed, and both the estimates and the plan stop being useful. Saying that
unprompted is a leadership signal.

The link that matters technically is **commit/PR → issue key**, so a release has
a changelog and an incident has a trail back to why a change was made. A Jira
key in the branch name is the cheapest way to get that for free, and it is what
makes [a postmortem timeline](12-running-it-on-call.md) reconstructable.

### Postman

API client and collection runner. **Collections** are the shared, versioned
definition of an API's requests, with environments carrying base URLs and
tokens. **Newman** is the CLI runner, which is what makes a collection a CI
artefact rather than a personal scratchpad. Auth flows are where it earns its
place: OAuth 2.0 grants and token refresh are painful by hand, and a saved
collection makes an SSO or SCIM flow reproducible for the whole team.

State the boundary before it is asked: a Postman collection **is not a test
suite**. It is an integration smoke check against a deployed environment, and
treating it as coverage is how you get a green pipeline over untested logic.

---

## Interview Q&A

### Q: Design the deployment pipeline for a tier-0 service.
**Level:** senior · **Tags:** cicd, deployment, design

<details><summary>Model answer</summary>

Tier-0 means a bad deploy is a platform outage rather than a degraded feature,
so I bias heavily toward safety and toward automatic reaction rather than human
reaction.

**Build the artefact once**, tagged with the git sha, and promote that exact
digest through every environment — so what was tested is literally what ships,
and "what is in production" resolves to one commit.

**Order checks by cost**: lint and types in seconds, unit tests in a minute,
then build, then scanning, then integration tests against a real database in a
container, then staging with smoke tests.

**Deploy with a canary** — a small share of traffic on the new version, with
automatic comparison of error rate and p99 against the old version on the same
traffic, and automatic rollback if it degrades. The comparison matters more
than the traffic split: a static threshold cannot tell a bad deploy from a
spike that was going to happen anyway.

**Backward-compatible changes only**, because you cannot deploy every consumer
at once, so both versions are live during any rollout and the contract has to
hold for the old one.

**Feature flags**, so a behaviour change can be switched off in seconds without
a rollback — which is a faster mitigation than any pipeline.

And **shadow mode for anything that changes an authorisation decision**: run
the new logic beside the old without enforcing it and compare the answers on
real traffic. That is the one I would insist on, because a change that is
wrongly *permissive* produces no errors at all — it produces a breach later.
An error-rate canary cannot catch it; a decision diff can.

For deploys themselves: `maxUnavailable: 0`, a `PodDisruptionBudget`, graceful
shutdown that fails readiness before draining, and the pipeline watching
`rollout status` so a stalled rollout fails the job rather than hanging.

</details>

**Follow-ups:**

1. Q: How do you handle a migration that cannot be rolled back?
   <details><summary>Answer</summary>

   You make it not need rolling back, by splitting it into backward-compatible
   steps — expand/contract. Instead of renaming a column in one migration: add
   the new column; deploy code that writes both and reads the old; backfill
   existing rows; deploy code that reads the new; and only then, days later,
   drop the old one.

   At every point the live schema is correct for the code that is running, so a
   code rollback is always safe. That property is the entire reason for the
   extra deploys.

   Backfills need their own care: batched, so you never hold a long lock on a
   large table; resumable, because they will be interrupted; and throttled, so
   they do not starve production traffic. And index creation has to be
   concurrent, because a plain `CREATE INDEX` locks writes for its duration,
   which on a big table is the outage you were trying to avoid.

   For the genuinely destructive final step, the protection is a tested restore
   path and ideally a short window where the old column still exists but is
   unused — so "we need it back" is a code deploy, not a restore.

   </details>

2. Q: What would you alert on for this service?
   <details><summary>Answer</summary>

   Symptoms users feel, not resource numbers: error rate, p99 latency, and
   availability against the SLO, with the alert tied to burning the error
   budget rather than to crossing a raw threshold.

   Then service-specific leading indicators. For an auth service, login
   success rate — a drop there often means a customer's IdP certificate
   expired rather than anything being wrong with us; authorisation denial rate,
   where a spike suggests a policy misconfiguration locking people out and a
   *drop* suggests something wrongly permitting; and cache hit rate, whose
   collapse precedes a latency problem.

   All of it sliced by tenant, because "it is slow" and "it is slow for one
   customer" need completely different responses and aggregates cannot tell
   them apart.

   During a deploy specifically, I want the canary analysis watching the
   per-version error rate, which is a different query from the service-level
   alert — and automatic rollback wired to it, because a human reacting in five
   minutes is five minutes of errors.

   What I would not page on: CPU or memory in isolation. They are diagnostic
   context.

   </details>

### Q: What is GitOps, and what does it actually buy you?
**Level:** senior · **Tags:** gitops, cicd, security

<details><summary>Answer</summary>

It is inverting the direction of deployment. Instead of CI holding cluster
credentials and pushing with `kubectl apply`, an agent inside the cluster —
Argo CD or Flux — watches a git repository of declared state and continuously
reconciles the cluster toward it.

What it buys, in order. **CI stops holding production credentials**, which
removes the pipeline's most dangerous permission; the pipeline's last act is a
git commit, and the agent's credentials never leave the cluster. **Git becomes
the audit log and the inventory** — "what is running" is a `git log` with an
author and a reviewer per change, which is usually also what an auditor wants.
**Drift is corrected rather than discovered**, because reconciliation is
continuous, so a manual `kubectl edit` is reverted rather than surviving until
it confuses someone. And **rollback is `git revert`**, with the same review
trail as any change.

It works because Kubernetes is already a reconciliation engine. GitOps just
moves the source of desired state out of the cluster and into git.

What it does not solve, which I would raise myself: secrets, since you cannot
commit them — you need SOPS, Sealed Secrets or an external secrets operator,
and that is the first problem every adoption hits. Ordering, because "migrate
then deploy" is awkward in a declarative pull model and you end up with sync
waves and hooks. Progressive delivery, which needs Argo Rollouts or Flagger on
top. And the repo becomes production, so its branch protection and review rules
are now production access controls.

</details>

### Q: How do you secure the pipeline itself?
**Level:** senior · **Tags:** cicd, security, supply-chain

<details><summary>Answer</summary>

Start from what it is: a system that runs third-party code on every commit,
holds the credentials that can change production, and produces the artefacts
everything downstream trusts by definition. So it is a high-value target with a
large attack surface.

**Remove the standing credentials.** OIDC federation so the pipeline exchanges
a short-lived token for a cloud role, with the trust policy scoped to one
repository and ideally one branch. Nothing stored, nothing to rotate, nothing
replayable from elsewhere. With GitOps, the cluster credential disappears
entirely.

**Pin third-party actions to a commit sha, not a tag.** A tag is mutable, so
`@v3` means whatever the maintainer points it at today — that is arbitrary code
execution in a context holding your secrets, and it has actually happened.

**Least privilege per job**, read-only by default, with one narrow role for the
single job that can write to production.

**Never give untrusted code access to secrets.** The specific trap is a
workflow trigger that runs a fork's code in the base repository's context;
fork PRs get no secret access, and anything that needs them runs after review.

**Then the artefact side**: scan dependencies and images with a blocking gate
on high severity and a reporting gate below it; sign the image and verify the
signature at admission, so only artefacts your pipeline built can run; and
generate an SBOM, which is what makes "are we affected by this CVE" a query
instead of an investigation.

And **branch protection on the branch that deploys** — required review, no
force push, no self-approval. In GitOps that branch is literally the production
control plane.

</details>

### Q: Your pipeline takes 45 minutes and people have stopped trusting it. What do you do?
**Level:** senior · **Tags:** cicd, process

<details><summary>Answer</summary>

Two separate problems, and I would name them separately: duration, and trust.

**Trust first, because it is worse.** Loss of trust almost always means
flakiness — tests that fail a few percent of the time. In a long pipeline that
is frequent enough that re-running becomes a reflex, and then a *real* failure
gets re-run too and shipped. So I would measure flakiness per test, quarantine
the worst offenders out of the blocking path immediately, and fix or delete
them. A flaky test is worse than a missing one, because it destroys the signal
the rest of the suite provides.

**Then duration.** Measure where the time goes before optimising anything, then
the usual wins: parallelise independent jobs rather than running one long
sequence; cache dependencies and use layer caching for images; split the test
suite and shard it; and move anything that is not a gate out of the blocking
path — a nightly full end-to-end suite rather than on every commit.

The structural question is which checks genuinely need to block. A test suite
that must pass before merge is a gate; a slow end-to-end suite that catches
something once a month is probably better as a post-merge signal with good
alerting, especially if canary analysis is already protecting production.

And I would treat pipeline duration as a reliability property, not a developer
convenience: slow pipelines make people batch changes, and bigger batches mean
riskier deploys and slower diagnosis when one breaks. The pipeline's speed is
part of the production risk profile.

</details>

---

## What a weak answer sounds like

- **Rebuilding per environment**, so what shipped is not what was tested.
- **Expensive checks first**, so a typo costs ten minutes.
- **A canary with no comparison** — a traffic split alone decides nothing.
- **No feature flags**, so every behaviour change is a deploy and a rollback.
- **Treating a rolling update as a safety net** for logic bugs.
- **"The migration can't be rolled back"**, with no expand/contract discipline.
- **`CREATE INDEX` without `CONCURRENTLY`** on a large production table.
- **Storing cloud or cluster credentials in CI** instead of OIDC federation.
- **Third-party actions pinned to mutable tags.**
- **Tolerating flaky tests**, then re-running failures by reflex.
- **Claiming GitOps while CI still runs `kubectl apply`.**
- **Not knowing what GitOps leaves unsolved** — secrets, ordering, progressive
  delivery.

---

## Quiz

### MCQ: Why build the artefact once and promote the same one through every environment?
- [ ] It reduces CI storage costs
- [x] Rebuilding per environment means what was tested earlier is not exactly what reaches production — a different dependency resolution or build-time config can slip in
- [ ] Different environments need different compiled binaries
- [ ] It is required in order to use canary deployments
**Why:** Promotion of an immutable digest makes "what is in production" resolve to one artefact and one commit. A rebuild silently breaks the chain between the thing that passed the tests and the thing serving users.

### MCQ: What distinguishes a canary deployment from a rolling update?
- [ ] A canary replaces instances more slowly
- [x] A canary *compares* the new version's metrics against the old version on live traffic and can abort automatically; a rolling update is only traffic mechanics with no hypothesis being tested
- [ ] A canary requires two complete environments
- [ ] A rolling update cannot be rolled back
**Why:** The comparison is the value. A traffic split without automated analysis decides nothing, and comparing against the old version concurrently controls for spikes that would have happened regardless.

### MCQ: Why is shadow mode the right tool for a change to authorisation logic specifically?
- [ ] It is faster than a canary
- [x] A wrongly *permissive* change produces no errors at all, so no error-rate gate can detect it — only comparing the new logic's decisions against the old on real traffic can
- [ ] Authorisation changes cannot be rolled back
- [ ] It avoids needing a feature flag
**Why:** Error-based gates detect failures, not silently-wrong successes. This is the one deployment case where the signal has to be a decision diff rather than a failure rate.

### MCQ: In the expand/contract migration, why can code be rolled back safely at every step?
- [ ] Because each migration step is automatically reversible
- [x] Because the schema at every point is valid for both the old and new code — it is never in a state only one version can read
- [ ] Because backfills complete atomically
- [ ] Because rollbacks only affect application code and never the schema
**Why:** A single-step destructive migration leaves no safe intermediate state. The extra deploys exist precisely to guarantee that the currently-running code always matches the currently-live schema.

### MCQ: Why use `CREATE INDEX CONCURRENTLY` when adding an index during a migration?
- [ ] It builds the index faster
- [x] A plain `CREATE INDEX` holds a write lock on the table for its duration, which on a large production table is an outage
- [ ] It is required for indexes on nullable columns
- [ ] It allows the index to be created inside a transaction
**Why:** Concurrent index creation trades a longer build and the possibility of an invalid index on failure for not blocking writes — the correct trade on a live table.

### MCQ: What is the primary security benefit of GitOps over a pipeline that runs `kubectl apply`?
- [ ] Manifests in git are encrypted at rest
- [x] CI no longer holds cluster credentials — its last act is a git commit, and the agent's credentials never leave the cluster
- [ ] The agent validates manifests more strictly than `kubectl`
- [ ] It removes the need for RBAC inside the cluster
**Why:** It eliminates the pipeline's most dangerous permission. The corollary is that the config repository's branch protection becomes a production access control.

### MCQ: What problem does GitOps specifically *not* solve?
- [ ] Reverting a bad deploy
- [x] Secrets — they cannot be committed in plain text, so SOPS, Sealed Secrets or an external secrets operator is required, and it is the first problem every adoption hits
- [ ] Knowing what is currently deployed
- [ ] Correcting manual changes made with `kubectl edit`
**Why:** The other three are exactly what GitOps does well. Secrets, ordering and progressive delivery are the three genuine gaps, and naming them unprompted is what distinguishes experience from familiarity.

### MCQ: Why pin third-party CI actions to a commit sha rather than a version tag?
- [ ] Sha references resolve faster
- [x] A tag is mutable, so `@v3` means whatever the maintainer points it at today — which is an arbitrary code-execution path into a job holding your credentials
- [ ] Tags are not supported for private actions
- [ ] It is required for OIDC federation to work
**Why:** The pipeline runs third-party code with access to production credentials. Immutable references are the only way to know that what ran today is what was reviewed.

### MCQ: Why are flaky tests described as worse than missing tests?
- [ ] They consume more CI minutes
- [x] They train people to re-run failures by reflex, so a genuine failure also gets re-run and shipped — destroying the signal the whole suite provides
- [ ] They cannot be quarantined
- [ ] They always indicate a race condition in production code
**Why:** A missing test provides no signal; a flaky test provides a false one and erodes trust in every other test. Quarantining out of the blocking path is the immediate mitigation, not a permanent fix.

### MCQ: Why does the chapter call pipeline duration a reliability property rather than a convenience?
- [ ] Long pipelines time out and leave deployments half-applied
- [x] Slow feedback makes people batch changes, and larger batches mean riskier deploys and harder diagnosis when one breaks
- [ ] CI runners become less reliable over long runs
- [ ] It prevents canary analysis from completing in time
**Why:** Batch size is the hidden variable. Anything that discourages small, frequent deploys pushes teams toward the deployment shape that is hardest to verify and hardest to debug.

---

## Glossary

- **CI / CD** — automated build and test / automated delivery to staging or deployment to production.
- **Promote the artefact** — ship the one immutable digest that passed the tests, never a rebuild.
- **Fail fast** — order checks by cost so cheap failures surface in seconds.
- **Rolling / blue-green / canary / shadow** — gradual replacement / two stacks and a switch / compared traffic slice / mirrored traffic with discarded responses.
- **Progressive delivery** — automated, metric-gated widening of a release (Argo Rollouts, Flagger).
- **Analysis template** — the metric query and threshold that decides whether a canary proceeds or aborts.
- **Feature flag** — separates deploying code from releasing behaviour; the fastest mitigation available.
- **Expand/contract** — add, dual-write, backfill, read-new, drop-old: a migration that is always rollback-safe.
- **`CREATE INDEX CONCURRENTLY`** — building an index without holding a write lock.
- **GitOps** — an in-cluster agent pulling declared state from git and reconciling continuously.
- **Config repo** — the separate repository of rendered manifests that CI commits to and the agent watches.
- **Sync wave** — Argo CD's ordering mechanism, the declarative stand-in for pipeline steps.
- **OIDC federation** — CI exchanging a short-lived token for a cloud role, with no stored keys.
- **SBOM** — a machine-readable inventory of an artefact's components; turns "are we affected" into a query.
- **Image signing / admission verification** — proving an artefact came from your pipeline, and enforcing it at deploy.
- **Newman** — Postman's CLI runner; what makes a collection a CI artefact rather than a scratchpad.
- **PM2 cluster mode** — one Node process per core: processes, not threads, so in-process state becomes per-worker.
