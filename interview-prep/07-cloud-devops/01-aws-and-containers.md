# AWS, Docker and Nginx

Breadth matters more than depth here for a backend/IAM role. Know what each
service is for and the one or two gotchas per thing.

---

## AWS, the services on your resume

### EC2

Virtual machines. Know the shape of the offering rather than instance names:
compute-optimised, memory-optimised, general purpose.

**On-demand** (pay per hour), **reserved** (commit for a discount), **spot**
(cheap, can be reclaimed with two minutes' notice — good for batch and stateless
workers, bad for anything holding state).

**Auto Scaling Groups** add and remove instances based on a metric. The
practical trap: scaling on CPU when the real constraint is something else —
connection pool, memory, downstream latency. Scale on the thing that's actually
saturating.

### S3

Object storage. Effectively unlimited, very durable, cheap.

- **Storage classes** — Standard, Infrequent Access, Glacier. **Lifecycle
  rules** move objects between them automatically, which is usually the biggest
  cost lever you have.
- **Pre-signed URLs** — the pattern worth knowing: instead of proxying an
  upload or download through your servers, generate a time-limited signed URL
  and let the client talk to S3 directly. Saves bandwidth and load.
- **Never make a bucket public** unless you genuinely mean to. Public buckets
  are one of the most common cloud breaches.

### Lambda

Run a function without a server. Good for event-driven work, glue, scheduled
jobs and spiky traffic.

The gotchas:

- **Cold starts** — an idle function pays initialisation cost on first
  invocation. Worse for large bundles and JVM-style runtimes. Matters on a
  latency-sensitive path.
- **Time limit** (15 minutes) — not for long jobs.
- **No persistent state or connections.** Database connection pooling is
  genuinely awkward, because each concurrent invocation is its own environment.
  Thousands of concurrent Lambdas can exhaust a database's connection limit —
  RDS Proxy exists specifically for this.
- **Cost** at sustained high volume can exceed a plain server; Lambda is
  cheapest for spiky or low-volume work.

### CloudFront

AWS's CDN. Caches at edge locations near users, so requests don't travel to
your origin.

The number that matters is the **cache hit rate** — it directly determines both
origin load and egress cost, and egress is usually the larger bill.

The things that decide it:

- **The cache key.** CloudFront caches per unique key, so including a header or
  cookie that varies per user means every user gets a miss — you have a CDN
  that costs money and caches nothing. Forward only what genuinely varies the
  response.
- **`Cache-Control` from the origin** drives TTLs. Set `max-age` deliberately
  rather than relying on defaults.
- **Invalidation is slow and rate-limited**, so the standard practice is
  **versioned URLs** (`app.a3f9c1.js`) instead of purging. New content gets a
  new URL, and the old one simply stops being requested.
- **Origin Access Control** lets CloudFront read a private S3 bucket, so the
  bucket never has to be public.

It also terminates TLS at the edge and can run small functions there
(CloudFront Functions, Lambda@Edge) for things like adding security headers or
doing lightweight auth checks close to the user.

### AWS IAM

Worth being precise about, given your background.

- **Users, roles, policies.** A **role** is assumed temporarily and issues
  short-lived credentials; a **user** has long-lived keys.
- **Prefer roles over users.** Long-lived access keys leak — into git, into
  logs, into laptop backups. Roles with temporary credentials remove that
  entire class of problem.
- **Policy evaluation:** explicit deny beats everything, then explicit allow,
  and the default is deny. Worth knowing because it's the same evaluation model
  as any policy engine.
- **Least privilege** — start with nothing and add. The common failure is
  `Action: "*"` because it was quicker.

A nice connection to make: AWS IAM is policy-as-data authorization at cloud
scale — the same shape as the RBAC/OPA model you built, with resources,
actions, principals and conditions.

### CloudWatch

AWS's built-in metrics, logs and alarms. Worth knowing precisely, because "we
used CloudWatch" and "we used Datadog" invite the same follow-up: what did you
alert on, and why that threshold?

- **Metrics** are namespaced time series at **1-minute granularity by
  default**; sub-minute needs *detailed monitoring*, which costs more. That
  granularity is the reason a spike shorter than a minute can be invisible —
  worth saying, because it is a real limitation people miss.
- **Logs** land in log groups; you query them with **Logs Insights**. Retention
  defaults to *never expire*, and an unbounded log group is one of the more
  common surprise bills.
- **Alarms** watch a metric against a threshold for N evaluation periods.
  Requiring several consecutive breaches is what stops a single noisy datapoint
  paging someone at 03:00.
- **Custom metrics** are how application-level numbers (policy evaluation
  latency, tokens issued) get in. **Cardinality is the cost driver** —
  a dimension per tenant on a multi-tenant platform multiplies your bill by the
  number of tenants.

The honest comparison, since your resume lists Datadog and Observe alongside
it: CloudWatch is the default that is already there, integrated with every AWS
service and with IAM. Datadog and friends win on cross-service correlation,
tracing and query ergonomics. Teams commonly run CloudWatch for
infrastructure-level signals and a vendor for application observability, which
is why both appear on the same resume.

Connect it to your own work: the logging redesign that cut Datadog/Observe
consumption cost is exactly the same decision as CloudWatch retention and
metric cardinality — **what you emit is a cost decision, not just an
engineering one.**

### Route 53

DNS, plus health checks and routing policies. The parts that come up:

- **Records:** `A` to an IP, `CNAME` to another name, and AWS's **alias**
  record, which points at an AWS resource (ALB, CloudFront, S3 site). Alias is
  the one to know — it works at the zone apex, where `CNAME` is illegal, and
  it's free to query.
- **TTL is the thing that bites you.** A record cached at a resolver for its
  TTL means a failover doesn't take effect until it expires. Lowering TTL
  *before* a planned migration is the standard move; doing it after you need it
  is too late.
- **Routing policies** — weighted (send 10% to the new stack), latency-based,
  failover (primary with a health-checked standby), geolocation (data residency
  for enterprise tenants), and multivalue.
- **Health checks** watch an endpoint and take an unhealthy target out of
  rotation, which is what makes failover routing automatic.

The senior point: **DNS is a coarse, slow load balancer.** Route 53 weighted
routing is
a legitimate way to shift traffic between stacks, but because clients cache,
you cannot pull traffic back instantly — so for a canary you want a load
balancer or service mesh doing the split, and DNS for the region-level or
whole-stack move. Getting that distinction right is what the question is
usually testing.

---

### Jenkins and GoCD

Both are self-hosted CI/CD servers, and both predate the managed runners most
teams use now.

**Jenkins** is the ubiquitous one — enormous plugin ecosystem, `Jenkinsfile`
pipelines as code, and an equally enormous maintenance burden. Plugin version
conflicts and a snowflake controller nobody dares upgrade are the classic
problems.

**GoCD** (from ThoughtWorks) is less common but better designed for one thing:
**first-class pipeline modelling**. Its **value stream map** shows a commit's
journey across every pipeline and stage as a graph, and **fan-in/fan-out**
dependencies between pipelines are native rather than bolted on. If you need to
model "this deploy depends on these three upstream builds of exactly these
revisions", GoCD expresses it directly where Jenkins needs plugins and glue.

The trade is ecosystem size: Jenkins has a plugin for everything, GoCD doesn't.

Worth being able to say what you'd choose *now*: a managed runner (GitHub
Actions, GitLab CI) for almost anything new, because you get containerised
builds, no server to maintain, and config living beside the code. Self-hosted
Jenkins or GoCD is justified by strict compliance, air-gapped environments, or
existing heavy investment.

## Docker

Package an application with its dependencies so it runs the same everywhere.

**Containers are not VMs.** They share the host kernel and isolate with
namespaces and cgroups — that's why they start in milliseconds and a VM takes
tens of seconds.

**Multi-stage builds** are the thing to know:

```dockerfile
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci                    # cached unless package files change
COPY . .
RUN npm run build

FROM node:20-slim             # final image: no build tools, no source
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node                     # don't run as root
CMD ["node", "dist/main.js"]
```

Why it matters: smaller images deploy faster and have less to attack. Build
tools and source code don't belong in production.

**Layer caching** — order matters. Copy `package.json` and install *before*
copying your source, so a code change doesn't reinstall every dependency.

**Other basics:** don't run as root; use `.dockerignore`; pin base image
versions rather than `latest`; one process per container.

---

## Nginx

Reverse proxy, load balancer, TLS terminator, static file server.

The jobs it does in front of an app:

- **TLS termination** — handle HTTPS so your app doesn't have to
- **Load balancing** across app instances
- **Static files** served directly, far faster than through Node
- **Rate limiting** and connection limiting at the edge
- **Buffering** slow clients so they don't tie up application workers

That last one is genuinely useful with Node: Nginx absorbs a slow client's
request and hands it over complete, so your single-threaded app isn't waiting
on someone's bad mobile connection.


## Building it

**Libraries**

| Need | Library | Why |
| --- | --- | --- |
| AWS SDK | `@aws-sdk/client-s3`, `@aws-sdk/client-lambda`, etc. | v3 is modular — import only the client you use, not the whole SDK |
| Infrastructure as code | Terraform, or AWS CDK if you want it in TypeScript | CDK lets IAM roles and Lambda config live in the same language as the app |

**Setting it up — creating an IAM role for a Lambda**

1. IAM console → **Roles → Create role** → trusted entity: **AWS service →
   Lambda**.
2. Attach a policy scoped to exactly what the function touches (e.g. one S3
   bucket's `GetObject`/`PutObject`) — never `AdministratorAccess` for a
   single-purpose function.
3. Attach the role to the Lambda at creation, or via
   `aws lambda update-function-configuration --role <arn>`.

**Pseudocode — assuming a role with STS, for cross-account access**

```ts
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
const sts = new STSClient({});
const { Credentials } = await sts.send(new AssumeRoleCommand({
  RoleArn: 'arn:aws:iam::111111111111:role/CrossAccountReader',
  RoleSessionName: 'nightly-export',
}));
// use Credentials.AccessKeyId / SecretAccessKey / SessionToken to build a scoped client
```

---

## Interview Q&A

### Q: When would you use Lambda instead of a container?
**Level:** intermediate · **Tags:** aws, serverless

<details><summary>Model answer</summary>

Lambda for event-driven and spiky work: reacting to an S3 upload or a queue
message, scheduled jobs, glue between services, or anything where traffic is
low or very uneven. You pay per invocation, so idle costs nothing, and there's
no capacity to manage.

Containers for steady traffic, long-running processes, anything latency-
sensitive, and anything needing persistent connections.

The constraints that decide it: **cold starts** add latency on the first
invocation after idle, which is bad on a user-facing path; the **15-minute
limit** rules out long jobs; and **connection management** is genuinely awkward,
because each concurrent invocation is its own environment, so thousands of
Lambdas can exhaust a database's connection limit — which is what RDS Proxy
exists to solve.

Cost inverts at volume too. Lambda is cheap when idle and can be more expensive
than a plain server under sustained load.

For an auth service at 30,000 requests per second I'd use containers without
hesitating — steady high volume, latency-sensitive, and it needs connection
pooling.

</details>

**Follow-ups:**

1. Q: How would you reduce a Docker image from 1.2GB to something sensible?
   <details><summary>Answer</summary>

   Multi-stage build first, and it's usually most of the win. Build in a full
   image with all the toolchain, then copy only the built artefact into a slim
   runtime image. Compilers, dev dependencies and source code don't ship.

   Then a smaller base — `-slim` variants, or distroless, which contains only
   your app and its runtime with no shell or package manager. That also shrinks
   the attack surface, which matters as much as the size.

   Then: install production dependencies only, use `.dockerignore` so
   `node_modules` and `.git` aren't copied into the build context, and combine
   `RUN` steps that create and delete files, since each layer keeps whatever it
   added even if a later layer removes it.

   And order layers so the slow, stable steps come first — copy the lockfile
   and install before copying source — so a code change doesn't invalidate the
   dependency layer.

   Smaller images pull faster, which shows up directly in deploy time and in
   how quickly you can scale out under load.

   </details>

2. Q: How do you handle secrets in containers?
   <details><summary>Answer</summary>

   Not in the image, and not in environment variables baked at build time —
   anything in an image layer is readable by anyone who can pull it, and image
   history persists even if a later layer deletes the file.

   The options, roughly in order: a secrets manager (AWS Secrets Manager, Vault)
   fetched at startup with the container authenticating via its instance or
   task role — no long-lived credential anywhere. Or the orchestrator's secret
   mechanism, injected at runtime as a file or environment variable. Files are
   slightly better than environment variables, since env vars leak into crash
   dumps, logs and child processes.

   Whichever it is: rotate them, scope them narrowly to the service that needs
   them, and never log them — which means being careful about error handlers
   that dump configuration.

   The pattern I'd advocate is the same as AWS IAM roles generally: short-lived
   credentials fetched at runtime rather than long-lived secrets distributed
   ahead of time. It removes the whole class of "a key leaked and we didn't
   know".

   </details>

### Q: What's the difference between an IAM user and an IAM role?
**Level:** intermediate · **Tags:** aws, iam, security

<details><summary>Model answer</summary>

A user is a permanent identity with long-lived credentials — an access key and
secret. A role is a set of permissions that something *assumes* temporarily,
receiving short-lived credentials that expire.

The security difference is the important one. Long-lived access keys leak —
committed to git, printed in logs, left on laptops — and once leaked they work
until someone notices and rotates them. Temporary credentials from a role
expire on their own, so the window is small even if they escape.

So the guidance is: roles for anything programmatic. An EC2 instance gets an
instance profile, a Lambda gets an execution role, a service in another account
assumes a cross-account role. Users mainly for humans, and even then federated
through SSO rather than with static keys.

Policy evaluation is worth knowing too: explicit deny always wins, then
explicit allow, and the default with no matching statement is deny. That's the
same evaluation model as any policy engine, which is a nice parallel to the
Rego work — resources, actions, principals and conditions, evaluated
deny-by-default.

</details>

---

## What a weak answer sounds like

- **"Containers are lightweight VMs."** They share the host kernel; that's the
  whole point.
- **Long-lived IAM access keys** for services when roles exist.
- **No mention of cold starts** when advocating Lambda for user-facing traffic.
- **Secrets in the image** or baked into build-time environment variables.
- **Scaling on CPU** when CPU isn't the constraint.

---

## Glossary

- **Spot instance** — cheap, reclaimable with two minutes' notice.
- **Pre-signed URL** — time-limited direct access to an S3 object.
- **Lifecycle rule** — automatic movement between storage classes.
- **Cold start** — initialisation latency on a first invocation.
- **IAM role** — assumed temporarily; issues short-lived credentials.
- **Multi-stage build** — build in one image, ship only the artefact.
- **Layer caching** — unchanged layers are reused; order matters.
- **Distroless** — an image with no shell or package manager.
- **TLS termination** — decrypting HTTPS at the proxy.
- **CloudWatch alarm** — a metric threshold breached for N consecutive
  evaluation periods; the consecutive part is what stops 03:00 noise.
- **Metric cardinality** — distinct dimension combinations; the CloudWatch
  cost driver, and why a per-tenant dimension is expensive.
- **Alias record** — Route 53's pointer to an AWS resource; legal at the
  zone apex where `CNAME` is not, and free to query.
- **TTL** — how long a resolver caches a DNS answer; the reason failover
  is never instant.
