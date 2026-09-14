# Security-flavoured problems — the same patterns, wearing the role's clothes

Google's coding questions are pattern questions. A security-team interviewer
asks the same patterns, but dressed in the vocabulary of the job: policies
instead of intervals, dependency graphs instead of course prerequisites,
audit logs instead of arrays. The disguise is the only extra difficulty —
and it's real, because under pressure a familiar problem in unfamiliar
clothes reads as a new problem.

*In the Google round: for the Safe Coding and Cloud & Third-Party Platform
Security roles, expect at least one coding question phrased in the domain —
policy evaluation, dependency resolution, log processing — and expect the
follow-up to be the production version: "now it's 10⁸ records", "now it
streams", "now it must be exact".*

This chapter takes nine problems shaped like the work described in both job
postings and strips the costume off each one. Where a problem models the
real thing a team like that builds, it says so — but nothing here claims to
describe how Google actually implements anything. The point is recognition:
"IAM policy with wildcards" → trie; "install order" → topological sort;
"secrets in a stream" → sliding window plus a pattern set.

---

## The costs

| Problem | Pattern underneath | Time | Space |
| --- | --- | --- | --- |
| Evaluate an IAM policy | Trie over path segments; deny-overrides | O(P · L) build, O(L) per query | O(P · L) |
| Permission inheritance in a hierarchy | Tree walk + set union; precompute for online queries | O(N · perms) precompute, O(1) query | O(N · perms) |
| Detect secrets in a stream | Sliding window + pattern set + entropy | O(n · patterns) naive → O(n) with an automaton | O(window) |
| Resolve dependency versions | Topological sort + cycle report | O(V + E) | O(V + E) |
| Diff two SBOMs | Hash map join → sort-merge when streaming | O(n + m) → O(n log n + m log m) | O(n) → O(1) |
| Dedupe near-duplicate audit events | Sliding window + hash of a canonical form | O(n) | O(window) |
| Normalise a path / detect traversal | Stack over segments | O(L) | O(L) |
| CIDR longest-prefix match | Binary trie over bits | O(32) per lookup | O(rules · 32) |
| Top-k abusive clients per window | Hash map + size-k heap; sketch when streaming | O(n log k) | O(distinct) → O(k + sketch) |

**Every one of these is a chapter you've already read.** The complexity
targets are the ones from those chapters; the interviewer will check that
you name them.

---

## How it actually works

```mermaid
flowchart TD
  Q{"Strip the vocabulary.<br/>What is it really?"}
  Q -->|"Match against many<br/>patterns / prefixes"| T["Trie — string,<br/>segment, or bit"]
  Q -->|"Order under<br/>dependencies"| G["Topological sort"]
  Q -->|"Effective X for a node<br/>in a hierarchy"| H["Tree walk, then<br/>precompute"]
  Q -->|"Join two big sets"| J["Hash map, or<br/>sort-merge if streaming"]
  Q -->|"Recent-window<br/>property of a stream"| W["Sliding window +<br/>hash / heap"]
  Q -->|"Resolve `.` and `..`"| S["Stack"]
```
*Read the problem, delete the nouns, and what's left is one of six shapes. Naming the shape aloud in the first minute is what the interviewer is listening for.*

### Who's who

| Term | Meaning |
| --- | --- |
| **Policy statement** | `{effect: allow \| deny, action, resource}` — resource may end in `*` |
| **Deny-overrides** | The evaluation rule where any matching deny beats any matching allow. Standard in cloud IAM models |
| **Resource hierarchy** | Organisation → folder → project → resource. Permissions granted at a level apply below it |
| **Effective permissions** | The union of everything granted on a node and all its ancestors |
| **Secret pattern** | A regex-shaped signature (a known key prefix and length) or a high-entropy token |
| **Shannon entropy** | Bits of randomness per character; real keys sit high, English sits low |
| **Semver constraint** | `^1.2.0`, `~1.2.0`, `>=1.0 <2.0` — a range a dependency accepts |
| **SBOM** | Software Bill of Materials — a list of components (name, version, identifier) in a build |
| **purl** | Package URL — `pkg:npm/lodash@4.17.21` — a canonical component identifier |
| **Canonical form** | A normalised representation so that "the same" events hash identically |
| **Path traversal** | Using `..` to escape a root directory: `/var/www/../../etc/passwd` |
| **CIDR** | `10.0.0.0/8` — an IP prefix; the `/n` is how many leading bits must match |
| **Longest prefix match** | Among CIDRs containing an IP, the most specific (largest `/n`) wins |
| **Heavy hitter** | A key whose frequency in a stream exceeds a threshold |

---

## The techniques, in the order you should learn them

1. **Segment tries** — a trie whose "characters" are path segments (`iam`,
   `users`, `*`), not letters. Same structure, bigger alphabet.
2. **Bit tries** — a trie over the 32 bits of an IPv4 address. Longest-prefix
   match is "walk as deep as you can, remember the last node that had a
   rule".
3. **Precompute on a hierarchy** — when queries are online and the tree is
   static, push effective values down once (DFS) so each query is a lookup.
4. **Canonicalise before hashing** — sort keys, lowercase, drop volatile
   fields; then a hash *is* an identity.
5. **Sort-merge when it doesn't fit** — the hash-join fallback: sort both
   sides externally, walk them together.
6. **Sketch when exact doesn't fit** — Count-Min for frequencies, Misra-Gries
   for top-k; know what guarantee you give up.

---

## The bugs that actually cost you the round

| Bug | Fix |
| --- | --- |
| **Allow-overrides** in policy evaluation | Collect all matches; a single deny wins |
| **Wildcard matches only the last segment** | Decide: `*` matches one segment, `**` matches the rest. Ask |
| **Walking up the hierarchy per query** | O(depth) per query is fine for 100 queries, not 10⁷. Precompute |
| **Regex for every pattern on every line** | O(n · patterns). Anchor with a prefix set, or build one automaton |
| **Entropy on the whole line** | Windows of ~20–40 chars; a line of prose with one key inside averages low |
| **Topological sort that silently drops the cycle** | Report which packages are stuck |
| **SBOM diff by name only** | Key by `purl` (name + version + ecosystem); "changed" is same name, different version |
| **Dedup by exact string** | Timestamps and request IDs differ on real duplicates; canonicalise first |
| **Path stack that pops past root** | `..` at root is either a no-op or a traversal alert — decide, and detect it |
| **CIDR match by string prefix** | `10.1` matches `10.10.x`; compare bits, not characters |
| **Top-k with a full sort** | O(d log d) when O(d log k) is available; and streaming needs a sketch |

---

## Practice ladder

| # | Problem | The pattern to see |
| --- | --- | --- |
| 1 | Evaluate an IAM policy | Segment trie + deny-overrides |
| 2 | Effective permissions in a hierarchy | Tree DFS + set union; precompute |
| 3 | Detect secrets in a stream | Prefix set + entropy windows |
| 4 | Resolve dependency install order | Kahn's + cycle report |
| 5 | Diff two SBOMs | Hash join → sort-merge |
| 6 | Dedupe near-duplicate audit events | Canonical hash + sliding window |
| 7 | Normalise a path, flag traversal | Stack |
| 8 | CIDR longest-prefix match | Bit trie |
| 9 | Top-k abusive clients per window | Map + heap → sketch |

**Exit test:** given a fresh security-flavoured prompt, you can name the
underlying pattern within a minute and state its complexity from the chapter
it came from.

---

## Data structures

| Need | Use | Note |
| --- | --- | --- |
| Segment / bit trie | Nested `Map`s, or `{zero, one}` for bits | See [tries](17-tries-intervals-and-design-structures.md) |
| Permission sets | `Set<string>` | Union by iterating the smaller into a copy of the larger |
| Pattern prefixes | `Set` of known key prefixes, then a regex per prefix | Filters most lines before any regex runs |
| Dependency graph | Adjacency `Array` + in-degree `Array` | See [graphs](12-graphs.md) |
| Join | `Map<purl, component>` | Key on the canonical identifier |
| Recent window | `Array` + head index, or a `Map<hash, lastSeen>` | Evict by timestamp |
| Path segments | `Array` as a stack | `..` pops; `.` and empty are skipped |
| Top-k | `MinHeap` of size k from [heaps](11-heaps-and-top-k.md) | |
| Streaming frequencies | Count-Min sketch: `d` rows × `w` counters | Say the error bound if asked |

**Pseudocode — canonicalise, then hash, the step under problems 5 and 6**

```js
// Turn an object into a stable string so that equal-in-meaning objects hash
// equal. Sort keys recursively; drop fields that vary between duplicates.
function canonical(obj, volatile = new Set(['timestamp', 'requestId'])) {
  if (Array.isArray(obj)) return '[' + obj.map(x => canonical(x, volatile)).join(',') + ']';
  if (obj && typeof obj === 'object') {
    const keys = Object.keys(obj).filter(k => !volatile.has(k)).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(obj[k], volatile)).join(',') + '}';
  }
  return JSON.stringify(obj);
}
```

`JSON.stringify` alone isn't canonical — key order follows insertion order,
so `{a:1,b:2}` and `{b:2,a:1}` differ. Sorting keys is the whole fix.

---

## Worked problems

### Q: Evaluate an IAM policy — given allow/deny statements with `*` wildcards on resource paths, decide whether an action on a resource is permitted
**Level:** senior · **Tags:** google-coding, security, trie, policy

<details><summary>Model answer</summary>

**Problem.** Statements look like `{effect: 'allow', action: 'read',
resource: 'projects/p1/buckets/*'}`. `*` matches exactly one path segment.
Evaluate `isAllowed(action, resource)`: allowed if at least one allow
matches and no deny matches (deny-overrides); denied by default. Example:
with `allow read projects/p1/buckets/*` and `deny read
projects/p1/buckets/secret`, `read projects/p1/buckets/logs → true`, `read
projects/p1/buckets/secret → false`, `write projects/p1/buckets/logs →
false`.

This models the core of a cloud-authorisation check — the kind of evaluation
a "remediate security gaps across public cloud usage" system has to reason
about — though real policy languages have more constructs.

**Clarify first.** Does `*` match one segment or any suffix (`**`)? (One
segment; I'll add `**` as a follow-up.) Is action matching exact, or can it
wildcard too? (Exact; say `*` on actions is the same trick.) How many
statements vs queries? (Thousands of statements, millions of queries — so
precompute a structure.) Default deny? (Yes.)

**Brute force.** For each query, loop over every statement, split both
resource paths, compare segment by segment honouring `*`. O(P · L) per
query. With a few thousand statements and millions of queries that's
billions of segment comparisons — and it's the answer that works and gets
you asked "can you do better".

**The insight.** Build a **trie over path segments** where `*` is just
another child key. A query walks the trie following its own segments, and at
each node it may branch into the literal child *and* the `*` child — a small
DFS. Nodes that end a statement carry `{action → effect}` maps. Collect
every effect reached; if any is `deny`, deny; else allow if any `allow`.
Per-query cost is O(L · branching), where branching is the number of
wildcard paths that also match — usually 1 or 2.

**Algorithm.**
1. `addStatement`: walk/create children by segment; at the end, `node.rules.set(action, effect)` (a deny should overwrite an allow at the same node — or store both and let evaluation decide; simplest is to store a `Set` of effects per action).
2. `isAllowed`: DFS `(node, i)`: at `i === segments.length`, read `node.rules.get(action)`; else recurse into `children.get(segments[i])` and `children.get('*')`.
3. Deny if any deny seen; else allow if any allow.

```js
class PolicyTrie {
  constructor() { this.root = this.node(); }
  node() { return { children: new Map(), rules: new Map() }; }   // rules: action -> Set(effects)

  addStatement({ effect, action, resource }) {
    let n = this.root;
    for (const seg of resource.split('/')) {
      if (!n.children.has(seg)) n.children.set(seg, this.node());
      n = n.children.get(seg);
    }
    if (!n.rules.has(action)) n.rules.set(action, new Set());
    n.rules.get(action).add(effect);
  }

  isAllowed(action, resource) {
    const segs = resource.split('/');
    let sawAllow = false, sawDeny = false;
    const walk = (n, i) => {
      if (sawDeny) return;                                  // deny-overrides: nothing can rescue it
      if (i === segs.length) {
        const effects = n.rules.get(action);
        if (!effects) return;
        if (effects.has('deny')) sawDeny = true;
        if (effects.has('allow')) sawAllow = true;
        return;
      }
      const literal = n.children.get(segs[i]);
      if (literal) walk(literal, i + 1);
      const star = n.children.get('*');
      if (star) walk(star, i + 1);
    };
    walk(this.root, 0);
    return sawAllow && !sawDeny;
  }
}
```

**Complexity.** Build: O(P · L). Query: O(L · w) where `w` is the number of
wildcard-compatible paths — typically small; worst case exponential in the
number of `*` levels, which is why real systems bound wildcard depth. Space
O(P · L).

**Test it.**
- The example: `read projects/p1/buckets/logs` → literal path has no rules;
  `*` path has `{read: allow}` → true. `.../secret` → literal has `{read:
  deny}`, `*` has allow → deny wins → false. `write .../logs` → no rules for
  write → false.
- A resource with more segments than any statement → walk falls off →
  false.
- Two statements on the same node, allow and deny, same action → deny.
- Empty policy → everything false.

**What the interviewer is checking.** Deny-overrides stated up front, the
trie as the precomputed structure, and that you notice the wildcard branch
means the walk is a small DFS rather than a single path.

</details>

**Follow-ups:**

1. Q: Add `**` — matches any number of trailing segments.
   <details><summary>Answer</summary>

   Treat a `**` child as a terminal that matches from this point to the end:
   when the walk reaches a node with a `**` child, immediately evaluate that
   child's rules regardless of remaining segments (and also continue the
   normal walk). One extra branch in `walk`. Say that `**` in the *middle* of
   a pattern needs the DFS to try consuming 0..k segments, which is where
   these systems get expensive.

   </details>

2. Q: Ten million queries per second. What breaks?
   <details><summary>Answer</summary>

   Nothing algorithmic — per-query work is tiny — but the trie lives in one
   process, so you replicate it to every evaluator and rebuild on policy
   change (policies change slowly; queries don't). Cache decisions keyed by
   `(principal, action, resource)` with a short TTL, since the same tuple
   repeats. And precompile: for the common case of no wildcards, a flat
   `Map<resource, rules>` lookup beats the walk. This is the shape of a
   decision cache in front of a policy engine — see
   [OPA and Rego](../01-auth-identity/09-opa-rego.md) for the version you've
   actually built.

   </details>

3. Q: Principals have roles, roles have policies, and there's inheritance. Where does that go?
   <details><summary>Answer</summary>

   Resolve the principal to a set of policy documents first (roles → policies
   is its own small graph, precomputed per principal), then evaluate each
   document against one shared trie *per document* or tag trie rules with
   the policy id and filter. The evaluation rule stays deny-overrides across
   all of them. The interviewer wants to hear that you separate "which
   policies apply" from "what do they say" — see
   [RBAC and ABAC](../01-auth-identity/08-rbac-abac.md).

   </details>

### Q: Effective permissions in a resource hierarchy — org → folders → projects → resources; what can a principal do on a given node?
**Level:** senior · **Tags:** google-coding, security, trees, precompute

<details><summary>Model answer</summary>

**Problem.** A tree of nodes; each node may carry grants `{principal → Set
of permissions}`. A grant at a node applies to every descendant. Query:
`effective(principal, nodeId) → Set`. Example: org grants `alice: {view}`;
project `p1` under it grants `alice: {edit}`; `effective(alice, p1) → {view,
edit}`, `effective(alice, org) → {view}`.

This is the inheritance model most cloud resource hierarchies use, and it's
what any "measure and remediate security gaps" tooling has to compute
correctly before it can say who can do what.

**Clarify first.** Is inheritance purely additive (no deny at a lower
level)? (Assume additive; denies are a follow-up.) Tree, not DAG — one
parent per node? (Yes.) How many nodes, how many queries? (Start: 10⁵ nodes,
a handful of queries; then: 10⁷ nodes, online queries — the follow-up.) Is
the tree static during queries? (Yes.)

**Brute force.** For a query, walk from the node up to the root collecting
grants for the principal and unioning them. O(depth) per query — with depth
rarely above ~10, that's actually fine for a few queries, and you should say
so. It's when queries are numerous that the walk-up becomes the bottleneck.

**The insight.** With a static tree and many queries, **push permissions
down once**: a DFS from the root carrying the accumulated `{principal → Set}`
map, storing each node's effective map. Then a query is a `Map` lookup. The
cost moves from queries to a one-time O(N · grants) pass. Memory is the
concern — every node stores every ancestor's grants — so store only the
*delta* on nodes with no local grants (point at the parent's map) and
materialise only where grants change.

**Algorithm.**
1. Build `children` adjacency and a `grants` map per node.
2. DFS from root with the inherited map; if the node has no local grants,
   reuse the parent's effective map object; else copy-and-union.
3. `effective(principal, nodeId) = effectiveMap.get(nodeId).get(principal)`.

```js
function buildEffective(nodes, rootId) {
  // nodes: Map<id, {parent, grants: Map<principal, Set<perm>>}>
  const children = new Map();
  for (const [id, n] of nodes) {
    if (n.parent === null) continue;
    if (!children.has(n.parent)) children.set(n.parent, []);
    children.get(n.parent).push(id);
  }

  const effective = new Map();                       // id -> Map<principal, Set<perm>>
  const stack = [[rootId, new Map()]];
  while (stack.length) {
    const [id, inherited] = stack.pop();
    const local = nodes.get(id).grants;
    let mine = inherited;
    if (local.size > 0) {                            // only copy where something changes
      mine = new Map();
      for (const [p, perms] of inherited) mine.set(p, new Set(perms));
      for (const [p, perms] of local) {
        if (!mine.has(p)) mine.set(p, new Set());
        for (const perm of perms) mine.get(p).add(perm);
      }
    }
    effective.set(id, mine);
    for (const c of children.get(id) ?? []) stack.push([c, mine]);
  }
  return (principal, nodeId) => effective.get(nodeId)?.get(principal) ?? new Set();
}
```

**Complexity.** Precompute O(N + G · P) where G is nodes with grants and P
the average map size at those nodes; query O(1). Space O(G · P) thanks to
sharing — not O(N · P).

**Test it.**
- The example: org `{alice: {view}}`; p1 copies and adds `edit` → `{view,
  edit}`. `effective(alice, org) → {view}`. A sibling project with no local
  grants shares the org's map object → `{view}`.
- A principal with no grants anywhere → empty set.
- A deep chain of 1000 nodes with grants only at the root → one map object,
  1000 pointers.
- Query on an unknown node → empty set (the `?.`).

**What the interviewer is checking.** Recognising the walk-up is fine until
queries dominate; the precompute-with-sharing trick; and that you don't
mutate the inherited map in place (which would leak grants to siblings — the
bug that makes this an authorisation problem, not a tree problem).

</details>

**Follow-ups:**

1. Q: The tree has 10⁷ nodes and grants change every few seconds. Precompute is stale.
   <details><summary>Answer</summary>

   Two moves. **Invalidate the subtree** on a grant change — recompute only
   the changed node's subtree, since nothing above it is affected; with
   sharing, that's proportional to the subtree's grant-bearing nodes.
   **Version the maps** so in-flight queries read a consistent snapshot while
   a rebuild lands. If changes are too frequent even for that, flip back to
   walk-up with a per-query cache — the honest trade is compute-per-query
   versus staleness, and you say which the workload favours.

   </details>

2. Q: Add explicit denies at lower levels that override inherited allows.
   <details><summary>Answer</summary>

   The effective value becomes a pair `{allow: Set, deny: Set}`; on the way
   down, a local deny is added to `deny` and *removed* from `allow`; the
   answer is `allow − deny`. Sharing still works — copy only where local
   rules exist. Order of application (allows then denies at the same node)
   must be fixed and stated.

   </details>

### Q: Detect secrets in a stream of source lines — flag known key formats and high-entropy tokens without O(lines × patterns) work
**Level:** senior · **Tags:** google-coding, security, strings, sliding-window

<details><summary>Model answer</summary>

**Problem.** Lines of source code arrive one at a time. Flag any line that
contains (a) a token matching a known secret format — say, a prefix like
`AKIA` followed by 16 uppercase alphanumerics, or `ghp_` followed by 36
word characters — or (b) any run of ≥ 20 non-space characters whose Shannon
entropy exceeds a threshold. Return `{lineNo, kind, token}`. Example: `const
key = "AKIAIOSFODNN7EXAMPLE"` → `{kind: 'aws-access-key'}`; `x =
"kj3H9!qLm2#Zp8vR1tWy7"` → `{kind: 'high-entropy'}`; `const url =
"https://example.com/docs"` → nothing.

This is the shape of a pre-commit or CI secrets scanner — the kind of
secure-by-default developer tooling a Safe Coding team ships.

**Clarify first.** How many patterns — a dozen, or thousands? (Dozens is
typical; thousands changes the approach — follow-up.) Entropy threshold and
window — do they give one? (Assume ≥ 3.5 bits/char over 20+ chars, and say
it's tunable.) Should I dedupe the same token across lines? (Return every
hit; dedupe is trivial with a `Set`.) Lines can be long (minified JS)? (Yes
— so no O(L²) over a line.)

**Brute force.** Run every regex over every line: O(lines × patterns × L).
For a dozen patterns it's fine and you should say so. Then compute entropy
over every substring of length 20 — O(L × 20) per line with naive
recomputation, or O(L²) if you consider all lengths. The interviewer wants
the structure that keeps this linear in the input.

**The insight.** Two filters, both linear. (1) Known formats all start with
a distinctive **prefix**; scan the line for those prefixes (a `Set` of
prefixes or a small trie) and only run the matching pattern's regex *at that
position* — one anchored regex test per prefix hit, not one full-line regex
per pattern. (2) Entropy over a **sliding window** of fixed width: keep
character counts in a `Map`, and update the entropy incrementally as the
window slides — add one char, remove one char, O(alphabet) per step with a
32-ish alphabet in practice. Only tokens (runs of non-space) are windowed.

**Algorithm.**
1. `PATTERNS = [{kind, prefix, regex (anchored with `^`)}]`; `prefixSet` of
   first characters or short prefixes.
2. For each line, for each position `i`: if `line.slice(i, i + k)` is a
   known prefix, test that pattern's anchored regex on `line.slice(i)`.
3. Split the line into tokens of non-space; for each token ≥ 20 chars, slide
   a 20-wide window maintaining counts; if any window's entropy ≥ threshold,
   flag it once.

```js
const PATTERNS = [
  { kind: 'aws-access-key', prefix: 'AKIA', regex: /^AKIA[0-9A-Z]{16}/ },
  { kind: 'github-token',   prefix: 'ghp_', regex: /^ghp_[A-Za-z0-9]{36}/ },
];
const PREFIX_LEN = 4;
const byPrefix = new Map(PATTERNS.map(p => [p.prefix, p]));

function entropyOf(counts, len) {           // Shannon entropy in bits per character
  let h = 0;
  for (const c of counts.values()) {
    if (!c) continue;
    const p = c / len;
    h -= p * Math.log2(p);
  }
  return h;
}

function scanLine(line, lineNo, { window = 20, threshold = 3.5 } = {}) {
  const hits = [];

  for (let i = 0; i + PREFIX_LEN <= line.length; i++) {        // (1) known formats
    const p = byPrefix.get(line.slice(i, i + PREFIX_LEN));
    if (!p) continue;
    const m = p.regex.exec(line.slice(i));                       // anchored: tests only here
    if (m) { hits.push({ lineNo, kind: p.kind, token: m[0] }); i += m[0].length - 1; }
  }

  for (const token of line.split(/\s+/)) {                       // (2) high entropy
    if (token.length < window) continue;
    const counts = new Map();
    for (let i = 0; i < window; i++) counts.set(token[i], (counts.get(token[i]) ?? 0) + 1);
    let flagged = entropyOf(counts, window) >= threshold;
    for (let i = window; i < token.length && !flagged; i++) {   // slide: add one, drop one
      counts.set(token[i], (counts.get(token[i]) ?? 0) + 1);
      counts.set(token[i - window], counts.get(token[i - window]) - 1);
      flagged = entropyOf(counts, window) >= threshold;
    }
    if (flagged) hits.push({ lineNo, kind: 'high-entropy', token });
  }
  return hits;
}
```

**Complexity.** Per line O(L · A) where A is the alphabet size inside the
window (the entropy recomputation) — effectively linear; the prefix scan is
O(L) with O(1) map lookups. Space O(window).

**Test it.**
- `AKIAIOSFODNN7EXAMPLE` → prefix hit at the `A`, regex matches 20 chars →
  `aws-access-key`.
- A 40-char random token → entropy ~4.5 → `high-entropy`.
- `https://example.com/docs` → no prefix; token is 24 chars but entropy of
  English-like text ~3.0 → nothing. (This is why the threshold matters —
  say you'd tune it on a corpus.)
- `AKIA` followed by only 10 chars → regex fails → nothing; the scan
  continues.
- A minified 10 000-char line → still one pass.

**What the interviewer is checking.** That you don't run every regex on
every line, that the entropy is windowed and incremental, and that you name
the false-positive problem (base64 blobs, hashes, UUIDs) as the real
difficulty of the tool rather than the algorithm.

</details>

**Follow-ups:**

1. Q: There are 5 000 patterns, many without a fixed prefix.
   <details><summary>Answer</summary>

   Build one **Aho–Corasick automaton** over the literal parts of all
   patterns (or use a regex engine that compiles alternations into one DFA,
   like RE2 — which is what you'd name for production). A single pass over
   the line advances the automaton once per character and reports every
   literal hit, O(L + hits) regardless of pattern count; then verify each hit
   with its full regex. That's the difference between O(L · patterns) and
   O(L).

   </details>

2. Q: Reduce false positives on the entropy check.
   <details><summary>Answer</summary>

   Layer cheap exclusions before flagging: skip tokens that decode as valid
   base64 of a known structure, that are hex of exactly 32/40/64 chars
   (MD5/SHA-1/SHA-256 — hashes, not secrets), that match UUID shape, or that
   appear in an allowlist (test fixtures, example keys). Then require the
   token to sit in an *assignment or quoted context*. And measure: track
   precision on a labelled corpus and tune the threshold; a scanner that
   cries wolf gets disabled, which is worse than one that misses a little.

   </details>

3. Q: Git history — scan every commit, not just HEAD.
   <details><summary>Answer</summary>

   Scan *diffs*, not snapshots: each commit's added lines only, so total
   work is proportional to history size rather than history × tree size.
   Dedupe by blob hash so a file that's unchanged across commits is scanned
   once. And remember that a secret removed in a later commit is still in
   history — the finding must say "rotate it", not "delete it".

   </details>

### Q: Resolve dependency install order — packages with version constraints; produce an install order or report the cycle
**Level:** intermediate · **Tags:** google-coding, security, graphs, topological-sort

<details><summary>Model answer</summary>

**Problem.** A manifest: `{name → {version, deps: {depName: constraint}}}`
where every constraint resolves to exactly one available version (so
resolution is fixed; the task is ordering). Return an install order where
every package is installed after its dependencies, or the list of packages
in a cycle. Example: `a → b, a → c, b → c` → `[c, b, a]`; `a → b, b → a` →
cycle `[a, b]`.

This is the ordering half of what a package manager does, and the graph a
software-supply-chain tool walks when it asks "what does this build pull
in".

**Clarify first.** Are constraints already resolved to single versions, or
do I need to pick versions? (Resolved — picking versions is NP-hard in
general and a different question; say that.) Same package at two versions —
two nodes? (Yes; node identity is `name@version`.) Report one cycle or all?
(One is enough.)

**Brute force.** Repeatedly scan for a package whose deps are all installed,
install it, repeat — O(V²+VE). Or DFS from every node without visited
tracking — exponential on a diamond. Both wrong-shaped.

**The insight.** It's Kahn's algorithm on `dep → dependent` edges; the
install order is the emitted sequence, and anything left with non-zero
in-degree is in or behind a cycle. To *name* the cycle, run a three-colour
DFS on the leftover nodes and record the path when a grey node is hit.

**Algorithm.**
1. Nodes = `name@version`; edges from each dep to the package.
2. Kahn's → `order`. If `order.length === V`, return it.
3. Otherwise, three-colour DFS over leftovers; on a back edge to grey node
   `g`, the cycle is the stack from `g` to the top.

```js
function resolveOrder(manifest) {
  // manifest: Map<id, {deps: Set<id>}> with id = "name@version"
  const ids = [...manifest.keys()];
  const adj = new Map(ids.map(id => [id, []]));           // dep -> dependents
  const indeg = new Map(ids.map(id => [id, 0]));
  for (const [id, { deps }] of manifest) {
    for (const d of deps) { adj.get(d).push(id); indeg.set(id, indeg.get(id) + 1); }
  }

  const q = ids.filter(id => indeg.get(id) === 0);
  const order = [];
  for (let head = 0; head < q.length; head++) {
    const u = q[head];
    order.push(u);
    for (const v of adj.get(u)) {
      indeg.set(v, indeg.get(v) - 1);
      if (indeg.get(v) === 0) q.push(v);
    }
  }
  if (order.length === ids.length) return { order };

  // Name a cycle among the stuck nodes with a three-colour DFS.
  const colour = new Map(ids.map(id => [id, 0]));          // 0 white, 1 grey, 2 black
  const stack = [];
  const dfs = (u) => {
    colour.set(u, 1); stack.push(u);
    for (const v of manifest.get(u).deps) {                 // walk dependency direction
      if (colour.get(v) === 1) return stack.slice(stack.indexOf(v));   // back edge: the cycle
      if (colour.get(v) === 0) { const c = dfs(v); if (c) return c; }
    }
    stack.pop(); colour.set(u, 2);
    return null;
  };
  for (const id of ids) {
    if (indeg.get(id) > 0 && colour.get(id) === 0) {
      const cycle = dfs(id);
      if (cycle) return { cycle };
    }
  }
  return { cycle: [] };                                     // unreachable if the graph is consistent
}
```

**Complexity.** O(V + E) for both phases; O(V + E) space.

**Test it.**
- `a→b, a→c, b→c` → in-degrees `a:2, b:1, c:0` → `[c, b, a]`.
- `a→b, b→a` → nothing emitted → DFS from `a`: a grey, b grey, b's dep `a` is
  grey → cycle `[a, b]`.
- A diamond `a→b, a→c, b→d, c→d` → `[d, b, c, a]` or `[d, c, b, a]`, no false
  cycle (black nodes are revisited, not reported).
- A self-dependency → cycle `[x]`.

**What the interviewer is checking.** Edge direction, the length check as
cycle detection, and that the cycle *report* uses grey-vs-black — a diamond
is the test case they'll trace.

</details>

**Follow-ups:**

1. Q: Now pick versions: each dep has a range, several versions are available. What changes?
   <details><summary>Answer</summary>

   It stops being a graph traversal and becomes a constraint-satisfaction
   search: choose one version per package such that every range is
   satisfied, and dependencies of the chosen versions are satisfied too.
   That's NP-hard in general (it encodes 3-SAT), so real resolvers use
   backtracking with heuristics (prefer newest, fail fast on conflicts) or
   SAT solvers. Say that clearly rather than pretending topological sort
   covers it — and note that lockfiles exist precisely so this expensive
   step runs once.

   </details>

2. Q: Flag any package in the tree with a known vulnerable version.
   <details><summary>Answer</summary>

   After resolution, it's a join: for each `name@version` node, look up a
   `Map<name, [vulnerableRanges]>` and test the version against the ranges.
   O(V · ranges). The interesting part is reporting the *path* from the root
   to the vulnerable node — walk parents (keep a `parent` map from the
   traversal) so the finding says "you depend on X via A → B → X", which is
   what makes it actionable.

   </details>

### Q: Diff two SBOMs — report components added, removed, or version-changed between two builds
**Level:** intermediate · **Tags:** google-coding, security, hashing, sort-merge

<details><summary>Model answer</summary>

**Problem.** Two lists of components, each `{purl, name, version, ...}`.
Return `{added, removed, changed}` where `changed` pairs an old and new
entry for the same package identity with a different version. Example: old
`[lodash@4.17.20, express@4.18.0]`, new `[lodash@4.17.21, helmet@6.0.0]` →
`changed: [lodash 4.17.20→4.17.21]`, `removed: [express]`, `added:
[helmet]`.

This is what a supply-chain pipeline computes to say "this deploy
introduces these new dependencies" — the diff is the alert.

**Clarify first.** What's the identity — `purl` without version (ecosystem +
name), so a version bump is "changed" rather than "removed + added"? (Yes.)
Can the same identity appear twice in one SBOM (two versions of lodash)?
(Yes in real SBOMs — treat identity as `name` plus version-set; I'll start
with one version per name and extend.) Sizes? (Thousands each; then
millions — follow-up.)

**Brute force.** For each old component, scan the new list for a match:
O(n · m). Fine for hundreds, not for tens of thousands.

**The insight.** It's a **hash join** on the identity key. Index the old
list by identity; walk the new list: absent → added, present with a
different version → changed, present and equal → unchanged; anything still
unvisited in the index → removed. O(n + m).

**Algorithm.**
1. `identity(c) = purl with the version stripped`.
2. `oldByKey = Map<identity, component>`.
3. For each new component: classify; mark the key as seen.
4. Unseen old keys → removed.

```js
function identityOf(c) {                     // pkg:npm/lodash@4.17.21 -> pkg:npm/lodash
  const at = c.purl.lastIndexOf('@');
  return at > c.purl.indexOf('/') ? c.purl.slice(0, at) : c.purl;
}

function diffSbom(oldList, newList) {
  const oldByKey = new Map(oldList.map(c => [identityOf(c), c]));
  const seen = new Set();
  const added = [], changed = [];
  for (const c of newList) {
    const k = identityOf(c);
    seen.add(k);
    const prev = oldByKey.get(k);
    if (!prev) added.push(c);
    else if (prev.version !== c.version) changed.push({ from: prev, to: c });
  }
  const removed = oldList.filter(c => !seen.has(identityOf(c)));
  return { added, removed, changed };
}
```

**Complexity.** O(n + m) time, O(n) space for the index.

**Test it.**
- The example → `changed: lodash`, `removed: express`, `added: helmet`.
- Identical lists → all empty.
- Old empty → everything added. New empty → everything removed.
- A purl with an `@` in the namespace (`pkg:npm/%40scope/pkg@1.0.0`) — the
  `lastIndexOf('@')` after the last `/` still finds the version separator;
  trace it.

**What the interviewer is checking.** Keying on identity rather than the
full string (so version bumps are "changed"), one pass, and the removed set
computed from the index rather than a second scan of the new list.

</details>

**Follow-ups:**

1. Q: Each SBOM has 50 million components and neither fits in memory.
   <details><summary>Answer</summary>

   Hash join needs one side in memory. Switch to **sort-merge**: externally
   sort both files by identity (O(n log n) each, in chunks that fit), then
   stream both with two cursors — equal keys compare versions, a smaller key
   on the old side is "removed", on the new side "added". O(1) memory
   beyond buffers. If only *one* side is huge, hash the small side and
   stream the big one. Naming which side to index is the senior signal.

   </details>

2. Q: A package can legitimately appear at two versions in one SBOM.
   <details><summary>Answer</summary>

   Make the index `Map<identity, Set<version>>`. Then per identity:
   versions in new but not old are added, in old but not new removed, and
   "changed" is reported per identity as `{identity, from: Set, to: Set}`
   when both sets are non-empty and differ. Same complexity; the report
   format is what changes, and it's worth asking the interviewer how they
   want it presented.

   </details>

### Q: Dedupe near-duplicate audit events — the same logical event arrives several times within a window with different timestamps and request IDs
**Level:** intermediate · **Tags:** google-coding, security, hashing, sliding-window

<details><summary>Model answer</summary>

**Problem.** A stream of audit events `{timestamp, requestId, actor, action,
resource, ...}`, roughly time-ordered. Two events are duplicates if they're
identical after ignoring `timestamp` and `requestId` and they arrive within
`windowMs` of each other. Emit only the first of each duplicate group.
Example: three `{alice, read, /doc/1}` events at t=0, 50, 120 with window
100 → emit the first (t=0) and the third (t=120, outside the window of the
first).

This is the kind of normalisation a security-monitoring pipeline does before
alerting — retries and multi-region delivery produce duplicates that would
otherwise triple every count.

**Clarify first.** Is the stream strictly ordered by timestamp, or roughly?
(Roughly — allow small reordering; say what "small" means, e.g. ≤ 1 s.) Which
fields are volatile? (Given: timestamp, requestId; say you'd make the list
configurable.) Window semantics — since the *first* occurrence, or since the
*last*? (Since the first — otherwise a steady drip never emits again.)
Memory — how many distinct events per window? (Assume it fits; the sketch
version is a follow-up.)

**Brute force.** For each event, compare against every event in the last
`windowMs`: O(n · w). Works for tiny windows and dies on a busy stream.

**The insight.** **Canonicalise, then hash.** Strip volatile fields, sort the
keys, serialise — equal-in-meaning events now produce equal strings, so a
`Map<canonical, firstSeenTs>` answers "seen recently?" in O(1). Evict
entries whose `firstSeenTs` has fallen out of the window with a queue in
arrival order (the same sliding-window shape as the rate limiter).

**Algorithm.**
1. `key = canonical(event)` (the helper from Data structures).
2. Evict from the front of the queue while `firstSeen < now - windowMs`,
   deleting from the map.
3. If `map.has(key)` → drop. Else `map.set(key, now)`, push to the queue,
   emit.

```js
class Deduper {
  constructor(windowMs, volatile = ['timestamp', 'requestId']) {
    this.windowMs = windowMs;
    this.volatile = new Set(volatile);
    this.firstSeen = new Map();          // canonical -> first timestamp
    this.order = [];                     // [canonical, ts] in arrival order
    this.head = 0;
  }

  offer(event) {                         // returns true if the event should be emitted
    const now = event.timestamp;
    const cutoff = now - this.windowMs;
    while (this.head < this.order.length && this.order[this.head][1] < cutoff) {
      const [k, ts] = this.order[this.head++];
      if (this.firstSeen.get(k) === ts) this.firstSeen.delete(k);   // only if not re-added later
    }
    if (this.head > 4096 && this.head * 2 > this.order.length) {      // compact occasionally
      this.order = this.order.slice(this.head); this.head = 0;
    }
    const key = canonical(event, this.volatile);
    if (this.firstSeen.has(key)) return false;
    this.firstSeen.set(key, now);
    this.order.push([key, now]);
    return true;
  }
}
```

**Complexity.** O(size of event) per offer for canonicalisation, amortised
O(1) for the window bookkeeping. O(distinct events in window) space.

**Test it.**
- The example: t=0 emit; t=50 duplicate → drop; t=120: cutoff 20, t=0 entry
  evicted → not seen → emit. ✓
- Two events differing only in `requestId` → same key → second dropped.
- Two events with identical fields in different key order → same key
  (that's the sort in `canonical`).
- An event with a nested object in a different order → still equal.
- Slightly out-of-order arrival (t=100 then t=90) — `now` goes backwards;
  the cutoff shrinks, nothing evicts, correctness holds. Say that a *large*
  reorder would need a watermark.

**What the interviewer is checking.** Canonicalisation as the real step
(not "hash the JSON"), the eviction guard `firstSeen.get(k) === ts` that
prevents deleting a key that was re-added after its old entry expired, and
that you raise ordering assumptions unprompted.

</details>

**Follow-ups:**

1. Q: 10⁷ distinct events per window; the map doesn't fit.
   <details><summary>Answer</summary>

   Replace the exact map with a **Bloom filter** per time bucket (say one
   filter per 10 s, kept for the window length): membership is O(k) hashes,
   memory is fixed, and the cost is a small false-positive rate — some
   genuinely new events get dropped as duplicates. For audit logs, dropping
   a real event is usually worse than emitting a duplicate, so you'd invert
   the guarantee: use the filter to *skip the expensive exact check* only
   when it says "definitely not seen", and fall back to exact storage for
   the "maybe seen" cases. State the asymmetry; it's the security-relevant
   judgement.

   </details>

2. Q: "Near-duplicate" also means the resource path differs only by a trailing slash or case.
   <details><summary>Answer</summary>

   That's more canonicalisation: normalise the resource field (lowercase
   where the system is case-insensitive, strip trailing slashes, resolve
   `.`/`..` with the path problem below) before hashing. The lesson is that
   dedup quality is entirely a function of the canonical form — the hash
   and the window are the easy part.

   </details>

### Q: Normalise a filesystem path and detect traversal — resolve `.` and `..`, and flag any path that escapes its root
**Level:** intermediate · **Tags:** google-coding, security, stack, strings

<details><summary>Model answer</summary>

**Problem.** `normalise(root, path)` where `path` is relative to `root`.
Return the resolved absolute path, or throw/flag if resolution would climb
above `root`. Example: `root = "/srv/app"`, `path = "static/./css/../js/app.js"
→ "/srv/app/static/js/app.js"`; `path = "../../etc/passwd"` → traversal.

Path traversal is one of the perennial vulnerability classes; the check is
simple and the bugs are in the edge cases.

**Clarify first.** Are backslashes separators? (Assume POSIX; say Windows
needs both and drive letters.) Are symlinks in scope? (No — that needs the
real filesystem; note it.) URL-encoded input (`%2e%2e`)? (Decode *before*
this step, once — double-decoding is its own bug.) Empty segments and
trailing slashes? (Collapse.)

**Brute force.** String-replace `/../` repeatedly until fixed point. It's
wrong: `/a/../../b` needs two passes and `..` at the root is silently
dropped, which hides the very thing you're supposed to detect.

**The insight.** Process segments left to right with a **stack**: a normal
segment pushes; `.` and empty are skipped; `..` pops — and if the stack is
already empty, that's the traversal. The stack's final contents joined with
`/` is the normalised path.

**Algorithm.**
1. Split on `/`.
2. For each segment: skip `''`/`.`; on `..`, pop or flag; else push.
3. Join under `root`.

```js
function normalisePath(root, path) {
  const stack = [];
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (stack.length === 0) return { ok: false, reason: 'traversal above root' };
      stack.pop();
      continue;
    }
    stack.push(seg);
  }
  const resolved = root.replace(/\/+$/, '') + '/' + stack.join('/');
  return { ok: true, path: resolved };
}
```

**Complexity.** O(L) time and space.

**Test it.**
- `static/./css/../js/app.js` → `[static, css]` → pop → `[static, js,
  app.js]` → `/srv/app/static/js/app.js`. ✓
- `../../etc/passwd` → first `..` with an empty stack → flagged.
- `a/b/../../..` → pops to empty then one more `..` → flagged; `a/b/../..` →
  resolves to root itself, which is allowed (or not — ask).
- `//a///b/` → empty segments skipped → `/srv/app/a/b`.
- `..\\etc\\passwd` on POSIX → one segment, pushed literally — correct on
  POSIX, a hole on Windows; say it.

**What the interviewer is checking.** The stack, that `..` at root is
*detected* rather than ignored, and that you raise decoding, symlinks and
platform separators as the things this function can't see.

</details>

**Follow-ups:**

1. Q: The path is user input to a web server. Where does this check sit, and what else is needed?
   <details><summary>Answer</summary>

   After percent-decoding exactly once and before touching the filesystem.
   Then, because symlinks can still escape, resolve with the OS
   (`realpath`) and verify the result still starts with the root — the
   lexical check catches `..`; the realpath check catches links. Both, in
   that order; either alone is a known bypass. Also reject NUL bytes, which
   truncate paths in C-based runtimes.

   </details>

2. Q: Do the same for URL paths in a reverse proxy that routes by prefix.
   <details><summary>Answer</summary>

   Same stack, but the failure mode is different: a request for
   `/public/../admin/users` that a naive prefix router sees as `/public/…`
   and allows, while the upstream resolves it to `/admin/users`. Normalise
   *before* routing, and reject rather than resolve when `..` appears — a
   proxy has no reason to accept it. The general rule: canonicalise once,
   early, and route on the canonical form.

   </details>

### Q: CIDR longest-prefix match — given thousands of CIDR rules, find the most specific one containing each of millions of IPs
**Level:** senior · **Tags:** google-coding, security, trie, bits, networking

<details><summary>Model answer</summary>

**Problem.** Rules like `10.0.0.0/8 → "corp"`, `10.1.0.0/16 → "corp-eu"`,
`0.0.0.0/0 → "internet"`. For an IPv4 address, return the label of the rule
with the longest matching prefix. Example: `10.1.5.5 → "corp-eu"`, `10.2.0.1
→ "corp"`, `8.8.8.8 → "internet"`.

This is the classification step behind firewall rules, allowlists and
"which of our cloud networks did this request come from" — the kind of
lookup a cloud-security control runs on every event.

**Clarify first.** IPv4 only? (Yes; IPv6 is the same trie at 128 bits.)
Rules static, lookups many? (Yes — precompute.) Overlapping rules — always
pick the longest? (Yes; ties impossible since prefixes are distinct.) Is
there always a `/0` default? (Not necessarily; return null if nothing
matches.)

**Brute force.** For each IP, test every rule: mask the IP with the rule's
netmask and compare. O(rules) per lookup — 5 000 rules × 10⁶ IPs = 5 × 10⁹
operations. Too slow, and it's the "compare as strings" trap if done
naively.

**The insight.** A **binary trie over the bits** of the address. Insert
each rule by walking its first `n` bits (creating nodes) and storing the
label at the final node. Lookup walks the IP's 32 bits, remembering the
last label seen; when the walk falls off, the last label is the longest
match. O(32) per lookup regardless of rule count.

**Algorithm.**
1. `ipToInt`: four octets → unsigned 32-bit.
2. Insert: for `i` in `0..prefixLen`, `bit = (ip >>> (31 - i)) & 1`; walk /
   create; set `node.label`.
3. Lookup: walk bits; `best = node.label ?? best`; stop when no child.

```js
function ipToInt(ip) {
  return ip.split('.').reduce((acc, o) => ((acc << 8) | Number(o)) >>> 0, 0);
}

class CidrTrie {
  constructor() { this.root = { zero: null, one: null, label: null }; }

  insert(cidr, label) {
    const [ip, lenStr] = cidr.split('/');
    const bits = ipToInt(ip), len = Number(lenStr);
    let node = this.root;
    for (let i = 0; i < len; i++) {
      const bit = (bits >>> (31 - i)) & 1;
      const key = bit ? 'one' : 'zero';
      if (!node[key]) node[key] = { zero: null, one: null, label: null };
      node = node[key];
    }
    node.label = label;                          // a /0 lands on the root
  }

  lookup(ip) {
    const bits = ipToInt(ip);
    let node = this.root, best = node.label;
    for (let i = 0; i < 32 && node; i++) {
      const bit = (bits >>> (31 - i)) & 1;
      node = bit ? node.one : node.zero;
      if (node && node.label !== null) best = node.label;   // deeper = more specific
    }
    return best;
  }
}
```

**Complexity.** Insert O(prefix length) ≤ 32; lookup O(32) = O(1); space
O(rules × 32) nodes worst case.

**Test it.**
- Rules above: `10.1.5.5` → walks the /8 (label corp), continues to /16
  (corp-eu), no deeper → `corp-eu`. ✓ `10.2.0.1` → `corp`. `8.8.8.8` → only
  the root label → `internet`.
- No `/0` rule and an unmatched IP → null.
- `255.255.255.255` — the `>>> 0` keeps the int unsigned so bit 31 reads
  correctly; without it `ipToInt` returns a negative number and `>>>` still
  works, but say why the unsigned form is safer.
- A `/32` rule (single host) — 32 levels deep, matched exactly.

**What the interviewer is checking.** Comparing bits not strings, the
"remember the last label" walk, and the JS `>>>` detail for unsigned
32-bit.

</details>

**Follow-ups:**

1. Q: Memory — 500 000 rules and the trie is huge.
   <details><summary>Answer</summary>

   Compress it: a **radix (Patricia) trie** merges single-child chains into
   one edge with a bit-span, cutting nodes to roughly the number of rules.
   Or replace the trie with **binary search over sorted prefixes** grouped
   by length (32 sorted arrays, longest first) — O(32 log n) per lookup, no
   pointers, cache-friendly. Real routers use multi-bit stride tries (walk
   8 bits at a time) for a lookup in 4 steps; name it if asked what hardware
   does.

   </details>

2. Q: Rules are added and removed at runtime.
   <details><summary>Answer</summary>

   Insert is already incremental. Delete: walk to the node, clear its label,
   then prune upwards — remove nodes that have no label and no children.
   O(32). For concurrent readers, build a new trie and swap the root pointer
   (copy-on-write), since rule changes are rare and lookups are constant.

   </details>

### Q: Top-k abusive clients per window — from a request log, the k clients with the most requests in each sliding window
**Level:** senior · **Tags:** google-coding, security, heaps, hashing, streaming

<details><summary>Model answer</summary>

**Problem.** Events `{ts, clientId}` arrive in time order. Every time a
window closes (say every 60 s, tumbling to start), report the `k` clients
with the most requests in that window. Example: k=2, window 60 s; in
`[0, 60)`: `a×5, b×3, c×1` → `[a, b]`.

The output is the input to a rate-limiting or abuse-response system — the
"identify" half of "identify and remediate".

**Clarify first.** Tumbling windows (non-overlapping) or sliding (report at
every event)? (Start tumbling; sliding is the follow-up.) Ties? (Any
order.) How many distinct clients per window — thousands, or hundreds of
millions? (Thousands first; the sketch answer for the latter.) Exact counts
required? (Yes initially.)

**Brute force.** At window close, sort all `(client, count)` pairs: O(d log
d) per window with `d` distinct clients. Correct and often fine; the
improvement is O(d log k).

**The insight.** Count into a `Map` during the window; at close, a
**min-heap of size k** over `[count, client]` extracts the top-k in O(d log
k). Then reset the map. For a *sliding* window, keep per-client counts and
a queue of events to decrement as they expire — the sliding-log shape —
and answer top-k on demand.

**Algorithm.**
1. `counts = Map<client, n>`; `windowStart`.
2. On event: if `ts >= windowStart + W`, emit top-k and reset.
3. `counts.set(c, +1)`.
4. `topK`: push `[count, client]` to a size-k min-heap; drain; reverse.

```js
class WindowTopK {
  constructor(k, windowMs, onReport) {
    this.k = k; this.windowMs = windowMs; this.onReport = onReport;
    this.counts = new Map();
    this.windowStart = null;
  }

  offer(ts, clientId) {
    if (this.windowStart === null) this.windowStart = ts;
    while (ts >= this.windowStart + this.windowMs) {          // may close several empty windows
      this.onReport(this.windowStart, this.topK());
      this.counts.clear();
      this.windowStart += this.windowMs;
    }
    this.counts.set(clientId, (this.counts.get(clientId) ?? 0) + 1);
  }

  topK() {
    const heap = new MinHeap((a, b) => a[0] - b[0]);            // smallest count on top
    for (const [client, n] of this.counts) {
      heap.push([n, client]);
      if (heap.size > this.k) heap.pop();
    }
    const out = [];
    while (heap.size) out.push(heap.pop());
    return out.reverse().map(([n, client]) => ({ client, count: n }));
  }
}
```

**Complexity.** O(1) per event; O(d log k) per window close; O(d) space.

**Test it.**
- The example → `[{a,5},{b,3}]`.
- k larger than distinct clients → all of them.
- A gap of several windows with no events → the `while` emits each (empty)
  window in turn, keeping the reports aligned to the clock.
- A single client dominating → it's first; the heap still holds k-1 others.

**What the interviewer is checking.** Size-k min-heap rather than a sort,
the `while` for multiple window closes, and that you ask tumbling vs sliding
before coding.

</details>

**Follow-ups:**

1. Q: Sliding window — the top-k over the last 60 s at any moment.
   <details><summary>Answer</summary>

   Keep the `counts` map plus a queue of `[ts, client]`; on each query (or
   each event), pop expired entries from the front and decrement their
   client's count, deleting zero entries. Then run `topK` over the live
   map. O(1) amortised per event, O(d log k) per query. If queries are as
   frequent as events, maintain a heap incrementally with lazy deletion —
   or accept that exact sliding top-k at high query rates is where you
   move to the sketch.

   </details>

2. Q: 200 million distinct clients per window. The map doesn't fit.
   <details><summary>Answer</summary>

   Exact counting is out. Use a **Count-Min Sketch** (a `d × w` array of
   counters with `d` hash functions; estimate = min over rows, never
   under-counts) to approximate frequencies in fixed memory, paired with a
   small heap of the current heavy-hitter candidates: on each event,
   update the sketch, estimate the client's count, and if it beats the
   heap's minimum, insert/replace. Or **Misra–Gries / Space-Saving** with
   `m` counters, which guarantees every client above `n/m` frequency is
   tracked. State what you give up — exactness, and possibly a few false
   heavy hitters — and why that's acceptable for abuse detection where a
   second exact check on the shortlist is cheap.

   </details>

3. Q: The log is sharded across 50 collectors.
   <details><summary>Answer</summary>

   Each collector computes local top-(k·c) with counts (or a sketch — Count-
   Min sketches merge by element-wise addition, which is the reason to use
   them); a coordinator merges. Local top-k alone is *not* sufficient — a
   client just under the threshold on every shard can be the global top —
   so either send full counts for candidates above a low threshold, or
   route by `hash(clientId)` so each client lands on exactly one collector
   and local top-k is exact. The routing answer is the clean one.

   </details>

---

## Interview Q&A

### Q: How do you approach a coding question phrased in security or infrastructure vocabulary?
**Level:** foundation · **Tags:** google-coding, security, approach

<details><summary>Model answer</summary>

I translate before I solve. The first minute is spent restating the problem
without the domain nouns: "so this is: given many patterns with wildcards
and many inputs, classify each input — a prefix-matching problem." That does
two things. It checks my understanding with the interviewer, and it maps the
problem onto a pattern whose complexity I already know.

Then I solve the pattern — trie, topological sort, sliding window, hash join
— and only at the end put the domain back: the deny-overrides rule, the
cycle report, the false-positive concern. The domain usually adds a
constraint or a follow-up, not a new algorithm.

The trap is the opposite order: getting absorbed in the domain, reasoning
about IAM semantics or semver edge cases, and running out of time before
writing the O(V + E) that was the actual question. The interviewer on a
security team knows the domain better than I do; what they're testing is
whether I can see the structure through it.

</details>

**Follow-ups:**

1. Q: When *should* the domain change the algorithm?
   <details><summary>Answer</summary>

   When it changes the correctness rule or the constraints. Deny-overrides
   changes how matches combine (collect all, then decide) — not the trie.
   "Dropping a real audit event is worse than a duplicate" flips which side
   of a Bloom filter's error you can accept. "Secrets in history, not just
   HEAD" changes what you scan. Those are real, and volunteering them is the
   senior signal — but they're adjustments to a known algorithm, and you
   should be able to say which one.

   </details>

### Q: What's the difference between exact and approximate answers in stream processing, and when is approximate acceptable?
**Level:** senior · **Tags:** google-coding, streaming, sketches

<details><summary>Model answer</summary>

Exact means a data structure whose size grows with the number of distinct
items — a map of counts, a set of seen keys. Approximate means fixed
memory with a bounded, known error: a Bloom filter for membership (false
positives only, never false negatives), a Count-Min sketch for frequencies
(over-estimates only), HyperLogLog for cardinality, Misra–Gries for heavy
hitters (guarantees every item above a threshold is tracked).

Approximate is acceptable when the error is one-sided in the direction you
can tolerate, and when a cheap exact check on the shortlist is available. For
abuse detection, over-counting a client's requests and then verifying the
top few exactly is fine. For dedup of audit events, a Bloom filter's false
positive would *drop a real event* — so I'd use it only to skip the exact
check when it says "definitely new", never to drop.

What I say in an interview: which structure, which side the error is on,
roughly how the error scales with memory (Bloom: ~10 bits per item for 1%;
Count-Min: error ε·N with width 1/ε), and whether the sketches merge — Count-
Min and HyperLogLog do, which is why they work across shards.

</details>

---

## What a weak answer sounds like

- **Solving the domain instead of the pattern** — twenty minutes on IAM
  semantics, no trie.
- **Allow-overrides**, or not stating the combination rule at all.
- **Regex per pattern per line**, and no idea what to do at 5 000 patterns.
- **Topological sort that returns "cycle" with no members.**
- **SBOM diff keyed on the full purl**, so every version bump is a remove
  plus an add.
- **Hashing raw JSON** for dedup and being surprised by key order.
- **`..` at root silently dropped.**
- **CIDR match by string prefix.**
- **Sorting all clients for top-k**, then having no answer for "doesn't
  fit in memory".
- **Claiming to know how Google does it.** You don't; the interviewer does.

---

## Glossary

- **Deny-overrides** — a policy combination rule where any matching deny wins.
- **Segment trie** — a trie whose alphabet is path segments rather than characters.
- **Effective permissions** — the union of grants on a node and all its ancestors.
- **Copy-on-change sharing** — reusing the parent's computed map at nodes with no local change.
- **Shannon entropy** — average bits of information per symbol; high for random strings.
- **Aho–Corasick** — an automaton that finds all occurrences of many patterns in one pass.
- **Kahn's algorithm** — topological sort by repeatedly removing in-degree-zero nodes.
- **Three-colour DFS** — white/grey/black marking that finds and names a directed cycle.
- **SBOM** — a manifest of software components in a build.
- **purl** — Package URL; a canonical component identifier with ecosystem, name and version.
- **Hash join / sort-merge join** — joining two sets by indexing one / by sorting both and walking.
- **Canonical form** — a normalised serialisation so equal-in-meaning values are byte-equal.
- **Path traversal** — escaping a root directory via `..`.
- **Longest prefix match** — choosing the most specific of several matching CIDRs.
- **Radix / Patricia trie** — a trie with single-child chains compressed.
- **Count-Min sketch** — fixed-memory frequency estimation that only over-counts; mergeable.
- **Misra–Gries / Space-Saving** — bounded-counter heavy-hitter algorithms.
- **Bloom filter** — fixed-memory membership with false positives but no false negatives.
- **Tumbling vs sliding window** — non-overlapping fixed buckets vs a window that moves with every event.
