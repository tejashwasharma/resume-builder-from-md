# Google-scale vocabulary — the systems worth naming, and how not to name-drop

Google publishes its infrastructure. The interviewer has read the papers,
and several of the systems below are the direct ancestors of the tools in
[the technology landscape](21-the-technology-landscape.md). Citing one
correctly says "I know where this idea comes from and what it costs";
citing one loosely says the opposite. Each entry below has three parts:
what it is (from the paper or the official spec), when to cite it, and the
one sentence that proves you understand it.

Everything here is from public sources — the papers, slsa.dev, sigstore.dev,
in-toto.io, Google Cloud documentation. Nothing about how these are run
internally today.

---

## Zanzibar — authorization

**What it is.** *Zanzibar: Google's Consistent, Global Authorization System*
(Pang et al., USENIX ATC 2019). A single service that stores access control
as **relation tuples** — `object#relation@user`, where `user` can be a
concrete user or another object's userset such as `group:eng#member` — and
answers `check`, `read`, `write` and `expand` for Calendar, Cloud, Drive,
Maps, Photos, YouTube and others. Namespace configs define **userset
rewrites** (editor implies viewer; a document inherits its folder's viewers).
The paper reports trillions of tuples, millions of authorization requests per
second, p95 latency under 10 ms and availability above 99.999% over three
years of production use.

Its defining problem is the **new enemy**: an ACL change and a content
change on different systems must be observed in causal order, or a
just-removed user sees just-added content. Zanzibar's answer is external
consistency via **zookies** — opaque tokens returned from writes and stored
with content, which force later checks to be evaluated at a snapshot at
least that fresh. See [38](38-design-rbac-sso-sessions.md) for the full
model.

**When to cite it.** Any design with fine-grained, relationship-based
permissions (sharing, nested groups, folder inheritance), and any time an
interviewer asks how you keep a permission cache correct under revocation.

**The sentence.** "Zanzibar models permissions as a graph of relation
tuples and solves the revoke-then-share race with a zookie that pins a check
to a snapshot at least as fresh as the write that created the content."

---

## BeyondCorp — zero trust

**What it is.** Google's enterprise security model, described in a series
of articles in USENIX *;login:* from 2014 to 2018, beginning with
*BeyondCorp: A New Approach to Enterprise Security* (Ward and Beyer, 2014).
The premise: the corporate network is not trusted. Every request to an
internal application goes through an **access proxy** that authenticates the
user (SSO), identifies the **device** against a device inventory, and applies
an access policy combining user, group, device state and the sensitivity of
the application. No VPN; an employee on a coffee-shop network and one at
their desk are treated identically. Google Cloud sells the model as
BeyondCorp Enterprise.

**When to cite it.** Any design where you are tempted to say "internal
services trust each other because they are on the same network" — that is
the assumption BeyondCorp exists to remove. Also when asked about
third-party or contractor access, where the device-trust component does the
work.

**The sentence.** "BeyondCorp moves the trust decision from the network
perimeter to a per-request policy over user identity, device identity and
device state, enforced at an access proxy."

---

## Borg and Kubernetes — cluster scheduling

**What it is.** *Large-scale cluster management at Google with Borg*
(Verma et al., EuroSys 2015). A cluster manager that runs hundreds of
thousands of jobs across **cells** of up to tens of thousands of machines,
packing production and batch work onto the same hardware, restarting tasks
that fail, and exposing every job via a naming service. Its lessons — jobs
and tasks, resource requests and limits, priorities and preemption, health
checks and automatic restart — were carried into Kubernetes, which the paper
itself discusses as the open-source successor.

**When to cite it.** When you say "the service is stateless and the
platform restarts it" — say what the platform does: schedules by resource
request, preempts lower priority, restarts on failure, and needs your
service to be genuinely restartable.

**The sentence.** "Borg's model is that machines are interchangeable, tasks
are restartable, and the scheduler bin-packs by declared resources with
priority-based preemption — which is why a design that stores state on a
local disk cannot run on it."

---

## Spanner and TrueTime — global consistency

**What it is.** *Spanner: Google's Globally-Distributed Database*
(Corbett et al., OSDI 2012). Synchronously replicated across datacenters
using Paxos per tablet; supports general read-write transactions across
shards; and provides **external consistency**: if T1 commits before T2
starts, T1's commit timestamp is smaller. The enabler is the **TrueTime**
API, which returns a time *interval* guaranteed to contain true time,
backed by GPS receivers and atomic clocks; Spanner waits out the
uncertainty before making a commit visible so that timestamps are globally
meaningful. Snapshot reads at a timestamp need no locks. Google Cloud
Spanner is the external product.

**When to cite it.** When asked whether strong consistency across regions
is possible and what it costs (a cross-region round trip per write, and the
commit wait), or when you choose a consistent store for a small critical
table and eventual consistency for the rest.

**The sentence.** "Spanner gets global external consistency by exposing
clock uncertainty as an interval and waiting it out at commit, so it pays
latency for consistency on every write and serves lock-free snapshot reads
in exchange."

---

## Bigtable — wide-column storage

**What it is.** *Bigtable: A Distributed Storage System for Structured
Data* (Chang et al., OSDI 2006). A sparse, sorted, multi-dimensional map
from (row key, column, timestamp) to bytes. Row ranges are split into
**tablets**, each served by one tablet server; tablets split and migrate as
they grow; the data lives in GFS (now Colossus); Chubby holds the master
lock and the tablet-server directory. Writes go to a commit log and a
memtable, then to immutable SSTables that are compacted — the LSM design
now in HBase, Cassandra, RocksDB and LevelDB. Cloud Bigtable is the
external product.

**When to cite it.** Wide, sparse, time-series or key-sorted data; any
"design a key-value / wide-column store" prompt; and the shard-key
discussion, since the row key *is* the partitioning.

**The sentence.** "Bigtable partitions by sorted row key into tablets that
split online, which means the key you choose is your partitioning scheme —
a monotonically increasing key makes every write hit the last tablet."

---

## GFS and Colossus — distributed file storage

**What it is.** *The Google File System* (Ghemawat, Gobioff, Leung —
SOSP 2003): large files in 64 MB chunks, three replicas across chunk
servers, one master holding metadata in memory, an append-optimised
workload, and the assumption that component failure is normal. Colossus
is its successor; there is no paper, but a 2021 Google Cloud blog post
(*Colossus under the hood*) describes distributed metadata (stored in
Bigtable, removing the single master) and a mix of replication and erasure
coding across many disks. It sits under Bigtable, Spanner, Cloud Storage
and most other Google storage.

**When to cite it.** Blob storage, the "where does the actual data live"
question under any database, and the "why not one big machine" question.

**The sentence.** "GFS separated metadata from data and assumed disks and
machines fail constantly, so the design replicates chunks and treats a lost
replica as routine — Colossus keeps that shape but shards the metadata."

---

## Chubby — coordination

**What it is.** *The Chubby lock service for loosely-coupled distributed
systems* (Burrows, OSDI 2006). A small Paxos-replicated store — five
replicas, one elected master — exposing a file-system-like namespace with
coarse-grained locks, small files and event notifications. Used for leader
election and configuration by GFS and Bigtable. The paper's argument: a
lock *service* is easier to adopt than a consensus *library*, and locks
carry a **sequencer** so downstream systems can reject actions from a
client whose lock has lapsed. *Paxos Made Live* (PODC 2007) is the same
team's account of building it. ZooKeeper and etcd are its open-source
equivalents.

**When to cite it.** Leader election, distributed locks, and small,
rarely-changing configuration. Never for request-path data.

**The sentence.** "Chubby is a small consensus-backed store for locks and
leader election, kept deliberately slow-changing, and its sequencer is the
fencing token that stops a client with an expired lock from corrupting
state."

---

## Pub/Sub — messaging

**What it is.** Google Cloud Pub/Sub, the external messaging service; the
public documentation defines the semantics. Delivery is **at least once**
by default; unacknowledged messages are redelivered after the ack deadline;
ordering is guaranteed only for messages sharing an **ordering key**
published from the same region; an exactly-once delivery option exists for
a single-region subscription and still requires the subscriber to ack. It
is the reference for the consumer discipline in
[27](27-messaging-streams.md).

**When to cite it.** Any asynchronous pipeline, to name the semantics you
are building on: "at-least-once, so the consumer is idempotent; ordered per
key, so I partition on the key whose order matters."

**The sentence.** "Pub/Sub gives me at-least-once delivery with per-key
ordering, so every consumer is idempotent and the ordering key is the
thing I actually need in order — not global order, which nobody offers."

---

## SLSA — supply-chain levels

**What it is.** Supply-chain Levels for Software Artifacts, an OpenSSF
specification (slsa.dev). Version 1.0 defines a **Build track** with three
levels. **L1**: the build produces **provenance** — a signed or unsigned
statement of how the artifact was built (builder, source, parameters).
**L2**: provenance is generated and signed by a **hosted build platform**,
so forging it requires an explicit attack rather than a misconfiguration.
**L3**: the build platform is hardened — builds are isolated from one
another and signing keys are inaccessible to user-defined build steps. The
provenance format is an in-toto attestation with a SLSA predicate. Later
versions add further tracks; cite v1.0 for the levels and say "build
track".

**When to cite it.** Any supply-chain design — [40](40-design-security-systems.md)
prompt 3 — and any answer about "how do I know this artifact came from this
source through this pipeline".

**The sentence.** "SLSA's build levels are about how much you can trust
provenance: L1 it exists, L2 a hosted platform signed it, L3 the platform is
hardened so a malicious build step cannot forge it."

---

## Sigstore — signing without long-lived keys

**What it is.** An OpenSSF project (sigstore.dev) with three parts.
**Cosign** signs and verifies container images, blobs and attestations.
**Fulcio** is a certificate authority that issues **short-lived** signing
certificates bound to an OpenID Connect identity (a person's account or a
CI job's workload identity) — "keyless" signing, because the private key is
ephemeral. **Rekor** is an append-only **transparency log** of signing
events with inclusion proofs; because the signature and certificate are
recorded with a timestamp, a verifier can confirm the signature was valid
when made even though the certificate has long expired.

**When to cite it.** Artifact signing, attestation storage, and "how do I
verify provenance at deploy time without managing signing keys".

**The sentence.** "Sigstore replaces long-lived signing keys with a
short-lived certificate tied to an OIDC identity and an append-only
transparency log, so trust comes from *who* signed and *when*, publicly
recorded, rather than from a key nobody rotates."

---

## SBOM and in-toto — what is inside, and who did what

**What it is.** A **software bill of materials** lists an artifact's
components and dependencies; the two mainstream formats are **SPDX** (Linux
Foundation, an ISO standard) and **CycloneDX** (OWASP). **in-toto** is the
attestation framework: a signed **statement** binds a subject (the artifact,
by digest) to a **predicate** of some type — SLSA provenance, an SBOM, a
vulnerability scan result, a test run. Cosign attaches in-toto attestations
to images in the registry, indexed by digest. The combination lets a policy
engine at deploy time ask "does this exact digest have signed provenance
from a trusted builder, an SBOM with no critical CVEs, and a passing scan?"

**When to cite it.** The CVE-to-dependency question ("a new CVE drops —
which of our 4,000 services are affected?"), and admission control at
deploy time.

**The sentence.** "An in-toto attestation is a signed claim about an
artifact digest; SLSA provenance and an SBOM are two predicate types, and
an admission policy verifies the set of attestations before a digest is
allowed to run."

---

## How to use this in the room

Cite once, correctly, at the moment the idea is load-bearing. "I'd keep the
revocation table strongly consistent — this is the small-critical-table
pattern, the Spanner trade — and let the rest be regional." Then move on.
Three citations in a 45-minute round is plenty; ten is a candidate reciting.

---

## Interview Q&A

### Q: What problem does Zanzibar solve that a role-based permission table does not, and what is a zookie?
**Level:** senior · **Tags:** google-design, zanzibar, authorization

<details><summary>Model answer</summary>

A role table answers "does this user hold this role in this tenant". It
cannot easily answer "can this user view this document", where the answer
depends on a chain: the user is in a group, the group is an editor of the
folder, the folder's editors are viewers of every document inside it.
Zanzibar's data model is that chain — relation tuples of
`object#relation@user` where user can be another object's userset, plus
rewrite rules that say editor implies viewer and a document inherits from
its parent. A check is a graph walk, and `expand` shows the whole path,
which is what an auditor needs.

A zookie is Zanzibar's answer to the consistency race. When you write a
permission change, you get a zookie back — an opaque token encoding the
write's timestamp. You store it with the content. Every later check passes
it in, and Zanzibar evaluates the check at a snapshot at least that fresh.
So a user removed *before* content was added can never see the content,
even though checks are served from caches and replicas that are otherwise
allowed to be stale. It makes consistency something the caller can demand
exactly when causality requires it.

</details>

**Follow-ups:**

1. Q: How would you cache Zanzibar-style checks safely?
   <details><summary>Answer</summary>

   Key the cache on the check *and* the snapshot timestamp. A cached result
   at snapshot T is correct for any request whose zookie is at or before T,
   and simply a miss for a request demanding something fresher. That is what
   makes the cache safe without invalidation: freshness is part of the key,
   not a property you have to maintain.

   </details>

### Q: Explain the three SLSA build levels and what each one defends against.
**Level:** intermediate · **Tags:** google-design, slsa, supply-chain

<details><summary>Model answer</summary>

SLSA v1.0's build track has three levels, and each is about how much you
can trust the provenance — the record of how an artifact was built.

Level 1: provenance exists. The build produces a statement of what source,
what builder and what parameters made the artifact. It may be unsigned. It
defends against nothing on its own, but it makes the supply chain
*visible*, which is the prerequisite for everything else.

Level 2: provenance is generated and signed by a hosted build platform. Now
faking it requires attacking the platform rather than editing a file. It
defends against a developer or a compromised laptop claiming an artifact
was built from a source it was not.

Level 3: the build platform is hardened — each build runs isolated from
others, and the signing key is out of reach of any user-defined build step.
It defends against a malicious build script or a compromised dependency
inside the build forging the provenance of its own artifact.

The practical point: verification at deploy time is only as strong as the
level, so an admission policy should require the level the risk demands —
L3 for anything that ships to production with privileges.

</details>

**Follow-ups:**

1. Q: What does SLSA not cover?
   <details><summary>Answer</summary>

   The source itself. Provenance proves an artifact was built from a given
   commit by a given builder; it does not prove the commit was reviewed, the
   dependency was benign, or the builder's own dependencies were safe. Those
   are separate controls — source review requirements, dependency policy,
   and the build platform's own supply chain — and a senior answer says
   where SLSA stops.

   </details>

### Q: How does keyless signing work in Sigstore, and why is a transparency log necessary?
**Level:** intermediate · **Tags:** google-design, sigstore, supply-chain

<details><summary>Model answer</summary>

The signer authenticates with an OIDC identity — a person's account or a CI
job's workload identity — and generates an ephemeral key pair. Fulcio, the
certificate authority, verifies the identity token and issues a short-lived
certificate binding that identity to the ephemeral public key. Cosign signs
the artifact with the ephemeral private key and then discards it. The
signature, the certificate and the artifact digest are recorded in Rekor,
the append-only transparency log, which returns an inclusion proof and a
timestamp.

The log is necessary precisely because the certificate is short-lived. A
verifier later sees an expired certificate; what makes the signature still
trustworthy is the Rekor entry proving the signature was made while the
certificate was valid, and that the entry has not been altered since. So
trust moves from "a key that must be protected forever" to "an identity, at
a time, publicly recorded". It also means every signing event is auditable:
if an identity signs something it should not have, the log shows it.

</details>

**Follow-ups:**

1. Q: What is the risk in keyless signing?
   <details><summary>Answer</summary>

   The identity provider becomes the root of trust. Compromise the OIDC
   account or the CI job's identity and you can sign as it. So the controls
   move to identity: hardware-backed MFA for humans, tightly scoped workload
   identities for CI, and verification policies that require the *expected*
   identity — "signed by this repository's release workflow", not "signed by
   anyone with a valid certificate".

   </details>

### Q: What is TrueTime, and why does Spanner wait before committing?
**Level:** senior · **Tags:** google-design, spanner, consistency

<details><summary>Model answer</summary>

TrueTime is an API that, instead of returning a single timestamp, returns
an interval [earliest, latest] that is guaranteed to contain the true
current time. The bound comes from GPS and atomic clock references in each
datacenter and from measuring each machine's clock drift.

Spanner assigns each transaction a commit timestamp inside that interval
and then **waits** — the commit wait — until the latest bound of the
interval has passed before making the write visible. After the wait, any
transaction that starts anywhere in the world will get a TrueTime interval
that is entirely after the commit timestamp. That is what gives external
consistency: if T1 committed before T2 started, T1's timestamp is smaller,
globally, without any coordination between them.

The cost is that wait, typically a few milliseconds, on every write, plus
the cross-datacenter Paxos round. The benefit is that reads at a timestamp
are consistent without locks, so the heavy read traffic never pays for
consistency. It is the cleanest example of paying latency for consistency
deliberately, which is the PACELC point in
[23](23-consistency-cap-pacelc.md).

</details>

**Follow-ups:**

1. Q: Could you build this without atomic clocks?
   <details><summary>Answer</summary>

   You can build strongly consistent transactions without them —
   CockroachDB uses hybrid logical clocks and a different set of
   trade-offs — but you cannot get Spanner's *external* consistency across
   independent transactions with no coordination unless the clock
   uncertainty is small and bounded. With commodity NTP the uncertainty is
   large, so the commit wait would be hundreds of milliseconds, or you fall
   back to coordination.

   </details>

### Q: What does BeyondCorp change about how you design access to an internal service?
**Level:** intermediate · **Tags:** google-design, beyondcorp, zero-trust

<details><summary>Model answer</summary>

It removes the network as a trust signal. In a perimeter model, an internal
service assumes a caller on the corporate network is legitimate. Under
BeyondCorp every request reaches the service through an access proxy that
authenticates the user via SSO, identifies the device against an inventory,
evaluates device state — managed, patched, disk encrypted — and applies a
policy that combines user, group, device and the service's sensitivity. No
VPN, and a request from the office and one from a café are treated the same.

For a design this means: the service itself trusts the proxy's asserted
identity, not the source IP; authorization is per request and explicit;
device trust is a first-class input, which is how contractors and
third-party access get scoped; and every access is logged with user and
device. It also means the proxy and the device inventory are critical
infrastructure with their own SLOs.

</details>

**Follow-ups:**

1. Q: How does this apply to service-to-service calls, not just people?
   <details><summary>Answer</summary>

   Same principle, different identity: each workload gets a cryptographic
   identity (a certificate or a signed token issued by the platform), calls
   are mutually authenticated, and authorization is per calling service, not
   per network segment. Whether the tool is a service mesh with mTLS or a
   platform-issued token, the design point is identical — the network
   location proves nothing.

   </details>

### Q: A critical CVE is announced in a popular library. How do you find which of thousands of services are affected, and how does SBOM plus attestation make that possible?
**Level:** senior · **Tags:** google-design, sbom, in-toto, vulnerability-management

<details><summary>Model answer</summary>

If every build emitted an SBOM as a signed in-toto attestation attached to
the artifact digest, then the question is a query, not an investigation:
join the CVE's affected package and version range against the SBOMs of the
digests currently deployed. The deployment inventory gives me the set of
running digests; the attestation store gives me each digest's dependency
list; the match gives me the affected services and their owners, in
minutes.

Without that, the answer is scanning source repositories for a manifest
line, which misses transitive dependencies, vendored copies, and anything
built from a different branch than is deployed. The gap between "what the
repo says" and "what is actually running" is exactly what the SBOM attached
to the deployed digest closes.

The two things that make it trustworthy are that the SBOM is signed by the
build platform (so a build cannot lie about its contents) and keyed by the
artifact digest (so it describes what is running, not what was intended).
Then the admission policy at deploy time can also refuse new deployments of
affected digests, which stops the problem growing while the fix rolls out.

</details>

**Follow-ups:**

1. Q: The SBOM says a vulnerable version is present but the vulnerable function is never called. Is the service affected?
   <details><summary>Answer</summary>

   Present is not the same as exploitable, and a mature answer says the
   SBOM gives you the candidate set, not the verdict. Reachability analysis
   — does any code path reach the vulnerable function — narrows it, and a
   VEX statement (Vulnerability Exploitability eXchange) is the standard
   way for the owner to record "not affected, because". The operational
   point: without the SBOM you cannot even start; with it, the remaining
   work is triage, and triage should be recorded as an attestation too so
   the next person does not repeat it.

   </details>

---

## Glossary

| Term | Meaning |
| --- | --- |
| **Relation tuple** | Zanzibar's unit of permission: `object#relation@user` |
| **Userset rewrite** | A namespace rule computing one relation from others (editor implies viewer) |
| **Zookie** | An opaque token from a Zanzibar write that forces later checks to a snapshot at least that fresh |
| **New enemy problem** | A stale permission check letting a just-removed user see just-added content |
| **Access proxy** | BeyondCorp's enforcement point: authenticates user and device per request |
| **TrueTime** | Spanner's clock API returning a bounded interval, backed by GPS and atomic clocks |
| **Commit wait** | Spanner's pause after choosing a commit timestamp until it is definitely in the past |
| **Tablet** | Bigtable's unit of partitioning: a contiguous row range served by one server |
| **Sequencer** | Chubby's fencing token attached to a lock |
| **Ordering key** | Pub/Sub's scope for guaranteed message order |
| **Provenance** | A signed statement of how an artifact was built (SLSA) |
| **Attestation** | A signed in-toto statement binding a predicate to an artifact digest |
| **SBOM** | Software bill of materials — an artifact's component list (SPDX or CycloneDX) |
| **Fulcio / Rekor / Cosign** | Sigstore's certificate authority, transparency log, and signing tool |
| **VEX** | A statement of whether a listed vulnerability actually affects a product |
