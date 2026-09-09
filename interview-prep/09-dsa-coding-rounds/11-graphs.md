# Graphs — everything else, generalised

A tree is a graph with no cycles and one path between any two nodes. A grid is a
graph where the neighbours are implied by coordinates. A linked list is a graph
where every node has one neighbour. Once you see that, graph problems stop being
a separate topic and become the general case of things you already know.

The intimidating part is the vocabulary and the setup. The algorithms themselves
are a short list, and **BFS and DFS cover most of what gets asked**.

---

## The costs

For V vertices and E edges:

| Algorithm | Time | Space | Answers |
| --- | --- | --- | --- |
| BFS | **O(V + E)** | O(V) | Shortest path, **unweighted** |
| DFS | **O(V + E)** | O(V) | Reachability, cycles, components, ordering |
| Topological sort | **O(V + E)** | O(V) | A valid order under dependencies |
| Union-Find | **~O(1)** per op | O(V) | Connectivity, as edges arrive |
| Dijkstra | **O((V + E) log V)** | O(V) | Shortest path, **non-negative weights** |
| Bellman-Ford | O(V × E) | O(V) | Shortest path with **negative** weights |
| Floyd–Warshall | O(V³) | O(V²) | **All-pairs** shortest paths |

**O(V + E) is the anchor.** BFS and DFS both touch every vertex once and every
edge once, and most graph problems are one of them with bookkeeping. If your
solution is worse than O(V + E) and isn't Dijkstra or all-pairs, look again.

---

## How it actually works

```mermaid
flowchart TD
  Q{"What does the<br/>question ask for?"}
  Q -->|"Shortest path,<br/>unweighted"| B["BFS"]
  Q -->|"Shortest path,<br/>weighted"| D["Dijkstra"]
  Q -->|"Reachable? Cycle?<br/>Components?"| F["DFS"]
  Q -->|"Valid order under<br/>dependencies"| T["Topological sort"]
  Q -->|"Connected? Edges<br/>arriving over time"| U["Union-Find"]
```
*Five questions, five algorithms. Nearly every graph problem in an interview is one of these, and the question type — not the graph — picks it.*

### Who's who

| Term | Meaning |
| --- | --- |
| **Vertex / node** | A thing |
| **Edge** | A connection between two things |
| **Directed** | Edges have a direction — a one-way street. `u → v` |
| **Undirected** | Edges go both ways — a friendship |
| **Weighted** | Edges carry a cost: distance, latency, price |
| **Degree** | How many edges touch a vertex. In-degree / out-degree when directed |
| **Path** | A sequence of vertices connected by edges |
| **Cycle** | A path that returns to its start |
| **DAG** | Directed acyclic graph — directed, no cycles. What makes topological sort possible |
| **Connected component** | A maximal set of mutually reachable vertices |
| **Dense / sparse** | E close to V² / E close to V. Decides the representation |

### Representing a graph

Almost always an **adjacency list**, and building it from an edge list is the
first thing you write.

```js
// Edges [[0,1],[1,2],...] → adjacency list. Undirected: push both directions.
function buildGraph(n, edges, directed = false) {
  const adj = Array.from({ length: n }, () => []);   // NOT new Array(n).fill([])
  for (const [u, v] of edges) {
    adj[u].push(v);
    if (!directed) adj[v].push(u);                   // the line people forget
  }
  return adj;
}
```

| Representation | Space | "Is u adjacent to v?" | Iterate u's neighbours | Use when |
| --- | --- | --- | --- | --- |
| **Adjacency list** | O(V + E) | O(degree) | **O(degree)** | Almost always — real graphs are sparse |
| **Adjacency matrix** | O(V²) | **O(1)** | O(V) | Dense graphs, or constant-time edge lookup |
| **Edge list** | O(E) | O(E) | O(E) | Input format; Kruskal's, which sorts edges |

`new Array(n).fill([])` gives every vertex the **same array**, so pushing one
neighbour appears on all of them. It's a silent, baffling bug. Use
`Array.from({length: n}, () => [])`.

---

## BFS — shortest path, unweighted

BFS expands in rings, so the first time it reaches a vertex it has done so in
the fewest edges. That guarantee only holds when every edge costs the same.

```js
function bfs(adj, start) {
  const dist = new Array(adj.length).fill(-1);
  dist[start] = 0;
  const q = [start];
  let head = 0;                        // index pointer — never shift(), it's O(n)

  while (head < q.length) {
    const u = q[head++];
    for (const v of adj[u]) {
      if (dist[v] !== -1) continue;    // already reached, and by a SHORTER path
      dist[v] = dist[u] + 1;
      q.push(v);                       // mark on PUSH, not on pop
    }
  }
  return dist;
}
```

Two details carry the correctness. **Mark on push**, not on pop — marking on pop
lets the same vertex be queued several times by different neighbours before it's
processed. And `dist[v] !== -1` doubles as the visited check, because in BFS the
first arrival is always the best one.

**Multi-source BFS:** seed the queue with every start vertex at distance 0. Each
vertex then gets its distance from the *nearest* source in one pass. Rotten
oranges, "nearest exit", "walls and gates" are all this.

---

## DFS — structure, not distance

```js
function dfs(adj, u, visited = new Set()) {
  visited.add(u);                                   // mark on entry
  for (const v of adj[u]) if (!visited.has(v)) dfs(adj, v, visited);
  return visited;
}
```

Use it for reachability, connected components, cycle detection and topological
ordering. **Do not use it for shortest paths** — it can reach a vertex by a long
route before the short one.

**Recursion depth is real.** A path graph of 10⁵ vertices overflows the stack.
Say so, and know the iterative version is the same code with an explicit stack.

### Cycle detection differs by graph type

This distinction gets asked directly, and answering it wrong is costly.

**Undirected:** a cycle exists if you reach an already-visited vertex that isn't
the one you came from.

```js
function hasCycleUndirected(adj, u, parent, visited) {
  visited.add(u);
  for (const v of adj[u]) {
    if (!visited.has(v)) {
      if (hasCycleUndirected(adj, v, u, visited)) return true;
    } else if (v !== parent) {
      return true;        // visited, and not where we came from → a real cycle
    }
  }
  return false;
}
```

Without the `v !== parent` check every single edge reports a cycle, because you
can always look back the way you came.

**Directed:** the parent check is meaningless. You need three colours —
**white** unvisited, **grey** on the current recursion path, **black** finished.
An edge to a **grey** vertex is a back edge and therefore a cycle. An edge to a
black vertex is merely a revisit, which is fine.

```js
const WHITE = 0, GREY = 1, BLACK = 2;
function hasCycleDirected(adj, u, colour) {
  colour[u] = GREY;                                  // on the current path
  for (const v of adj[u]) {
    if (colour[v] === GREY) return true;             // back edge → cycle
    if (colour[v] === WHITE && hasCycleDirected(adj, v, colour)) return true;
  }
  colour[u] = BLACK;                                 // finished; safe to revisit
  return false;                                      // no cycle from here
}
```

**Using a plain visited set on a directed graph reports false cycles**, because
a diamond — two paths reaching the same vertex — is not a cycle. Grey versus
black is exactly that distinction.

---

## Topological sort — ordering under dependencies

Course prerequisites, build order, task scheduling. Only possible on a **DAG**;
a cycle means no valid order exists, and detecting that is half the value.

**Kahn's algorithm** (BFS-based) is the one to write, because it detects the
cycle for free:

```js
function topoSort(n, adj) {
  const indeg = new Array(n).fill(0);
  for (let u = 0; u < n; u++) for (const v of adj[u]) indeg[v]++;

  const q = [];
  for (let u = 0; u < n; u++) if (indeg[u] === 0) q.push(u);   // no prerequisites

  const order = [];
  let head = 0;
  while (head < q.length) {
    const u = q[head++];
    order.push(u);
    for (const v of adj[u]) {
      if (--indeg[v] === 0) q.push(v);    // its last prerequisite just cleared
    }
  }
  // Fewer than n vertices emitted → the rest are stuck in a cycle.
  return order.length === n ? order : null;
}
```

That final check is the cycle detection: anything still holding a non-zero
in-degree is waiting on something inside a cycle, so it never enters the queue.

---

## Union-Find — connectivity as edges arrive

The structure most candidates don't have, and it's ~15 lines. Use it for
connectivity queries, undirected cycle detection, and Kruskal's MST.

**Why not just DFS?** DFS answers "are these connected" in O(V + E) *per query*
and has to re-run when an edge is added. Union-Find answers in near-O(1) and
handles edges arriving incrementally, which DFS structurally cannot.

```js
class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.count = n;                    // number of components
  }

  find(x) {
    // Path compression: point every node on the way up straight at the root,
    // so the next find on this branch is effectively O(1).
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(a, b) {
    const ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;       // already together — in a cycle check,
                                       // THIS is the cycle
    // Union by rank: hang the shorter tree under the taller so depth barely grows.
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[rb] < this.rank[ra]) this.parent[rb] = ra;
    else { this.parent[rb] = ra; this.rank[ra]++; }
    this.count--;
    return true;
  }
}
```

`union` returning `false` does double duty: for Kruskal's it means "skip this
edge, it would form a cycle", and for cycle detection it *is* the detection.
`count` gives you the number of connected components for free.

---

## Dijkstra — shortest path with weights

BFS with a priority queue instead of a plain queue: always expand the
cheapest-so-far vertex.

```js
function dijkstra(adj, start, n) {           // adj[u] = [[v, weight], ...]
  const dist = new Array(n).fill(Infinity);
  dist[start] = 0;
  const pq = new MinHeap((a, b) => a[0] - b[0]);   // [distance, vertex]
  pq.push([0, start]);

  while (pq.size) {
    const [d, u] = pq.pop();
    if (d > dist[u]) continue;    // a stale entry — we already found better.
                                  // Cheaper than supporting decrease-key.
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        pq.push([d + w, v]);      // push a new entry rather than updating
      }
    }
  }
  return dist;
}
```

**The `d > dist[u]` skip is the idiomatic trick.** A textbook Dijkstra needs a
decrease-key operation that a binary heap doesn't offer; instead you push
duplicates and discard the stale ones on the way out. Same complexity, far less
code.

**Non-negative weights only.** A negative edge breaks the assumption that once
you've popped a vertex its distance is final. Negative weights need
**Bellman-Ford** at O(V × E), which also detects negative cycles. Saying that
unprompted is a good signal.

**Weights all equal? Use BFS.** Dijkstra on an unweighted graph is a heap you
didn't need.

---

## The bugs

| Bug | Fix |
| --- | --- |
| **`new Array(n).fill([])`** | Every vertex shares one array. Use `Array.from({length: n}, () => [])` |
| **Forgetting the reverse edge** | Undirected graphs need `adj[v].push(u)` too |
| **Marking visited on pop** | Mark on push, or the same vertex queues many times |
| **`shift()` for the BFS queue** | O(n) each; use an index pointer |
| **Parent check on a directed graph** | Directed cycles need three colours, not a parent |
| **No parent check on an undirected graph** | Every edge reports a false cycle |
| **DFS for a shortest path** | BFS. DFS gives no distance guarantee |
| **Dijkstra with negative weights** | Bellman-Ford |
| **Disconnected graphs** | Loop over all vertices as start points, not just vertex 0 |
| **Self-loops and duplicate edges** | Ask whether they occur; they break naive cycle checks |
| **Stack overflow on deep DFS** | Iterative with an explicit stack |

**Disconnected graphs are the most-missed edge case.** "Count the components"
and "detect a cycle anywhere" both require starting a traversal from every
unvisited vertex, not just one.

---

## Practice ladder

| # | Problem | What it teaches |
| --- | --- | --- |
| 1 | Build an adjacency list from an edge list | The setup you'll write every time |
| 2 | Number of islands | Grid as a graph; flood fill |
| 3 | Number of connected components | Looping starts over all vertices |
| 4 | Clone a graph | DFS carrying a map from old node to new |
| 5 | Rotten oranges | **Multi-source BFS**, level counting |
| 6 | Word ladder | BFS on an implicit graph — neighbours are computed, not stored |
| 7 | Cycle in an undirected graph | The parent check |
| 8 | Cycle in a directed graph | Three colours |
| 9 | Course schedule I and II | Topological sort, then the order itself |
| 10 | Number of provinces / redundant connection | **Union-Find** |
| 11 | Network delay time | **Dijkstra** |
| 12 | Cheapest flights within k stops | Bellman-Ford, or BFS with a stop budget |
| 13 | Minimum spanning tree (Kruskal's) | Union-Find plus sorted edges |

**Exit test:** you can state, without pausing, why rotten oranges must be BFS
and course schedule must be a topological sort — and write the undirected and
directed cycle checks, explaining why they differ. Those two distinctions are
what separate having read about graphs from knowing them.

---

## Data structures

| Need | Use | Note |
| --- | --- | --- |
| The graph | `Array` of `Array`s | `Array.from({length: n}, () => [])`. Never `fill([])` |
| Non-integer vertices | `Map` node → neighbours | For strings or objects as vertex labels |
| Visited | `Array` of booleans, or a `Set` | Array when vertices are `0..n-1`; `Set` otherwise |
| BFS queue | `Array` + index pointer | Never `shift()` |
| DFS | Recursion, or an explicit `Array` stack | Explicit when depth could approach V |
| Distances | `Array` filled with `Infinity` or `-1` | `-1` doubles as "unvisited" in unweighted BFS |
| Directed cycle detection | Colour array `0/1/2` | Grey means "on the current path" |
| Priority queue | **Hand-rolled `MinHeap`** | See [heaps](10-heaps.md); JS has no built-in |
| Connectivity | `DSU` class | ~15 lines, path compression plus union by rank |
| In-degrees | `Array` of counts | For Kahn's topological sort |

**Pseudocode — BFS on an *implicit* graph, which is what word ladder really is**

```js
// The graph is never materialised. Neighbours are COMPUTED on demand, which is
// the trick: building all edges up front would be O(n²) comparisons.
function ladderLength(begin, end, wordList) {
  const words = new Set(wordList);
  if (!words.has(end)) return 0;

  let q = [begin], steps = 1;
  const seen = new Set([begin]);

  while (q.length) {
    const next = [];
    for (const word of q) {                       // one whole level per iteration
      if (word === end) return steps;
      for (let i = 0; i < word.length; i++) {
        for (let c = 97; c < 123; c++) {          // 'a'..'z'
          const cand = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
          if (!words.has(cand) || seen.has(cand)) continue;
          seen.add(cand);                          // mark on push
          next.push(cand);
        }
      }
    }
    q = next;
    steps++;                                       // one per level = the distance
  }
  return 0;
}
```

Recognising that a problem is a graph problem *without a graph in the input* is
the actual skill being tested. Word ladder, sliding puzzles, "minimum steps to
reach a number", and most state-space searches are BFS over vertices you
generate on the fly.

---

## Interview Q&A

### Q: When do you use BFS and when DFS?
**Level:** foundation · **Tags:** dsa, graphs, bfs, dfs

<details><summary>Model answer</summary>

BFS when the question is about distance; DFS when it's about structure.

BFS explores level by level, so the first time it reaches a vertex it has done
so in the fewest edges. That's a guarantee, and it's why anything phrased as
"minimum number of steps", "shortest path", or "how many moves" is BFS. The
guarantee depends on every edge costing the same — the moment weights differ,
it breaks and I need Dijkstra.

DFS goes deep and unwinds, which makes it right for questions about shape rather
than length: is this reachable, are there cycles, how many connected components,
what's a valid topological order. It's also usually shorter to write, since
recursion does the bookkeeping.

Both are O(V + E) — each vertex once, each edge once — so it's not a performance
choice, it's a correctness one. Using DFS for a shortest path gives an answer
that's simply wrong, not slow.

Two practical notes. DFS recursion is O(V) stack in the worst case, so on a long
path graph it overflows, and I'd write it iteratively if V is large. And they're
the same algorithm with a different container — take from the end of the
frontier and you get DFS, take from the front and you get BFS. That's worth
knowing because it means one implementation covers both.

</details>

**Follow-ups:**

1. Q: How does cycle detection differ between directed and undirected graphs?
   <details><summary>Answer</summary>

   They need genuinely different algorithms, and using one on the other gives
   wrong answers rather than slow ones.

   Undirected: I DFS and track the vertex I came from. If I reach an
   already-visited vertex that isn't my parent, that's a cycle. The parent check
   is essential, because every edge is traversable both ways — without it, the
   edge I just walked immediately looks like a cycle back to where I started.

   Directed: the parent check is meaningless, because reaching a visited vertex
   is often perfectly fine. A diamond — two paths from A converging on D — has
   no cycle at all, but a naive visited check flags it. So I use three states:
   white for unvisited, grey for on the current recursion path, black for fully
   finished. An edge to a grey vertex is a back edge and therefore a cycle; an
   edge to a black vertex is just a revisit.

   The alternative for directed graphs is Kahn's algorithm — repeatedly remove
   vertices with in-degree zero, and if you can't emit all V, the remainder is
   in a cycle. I often prefer that because it gives me the topological order at
   the same time, and it's iterative so there's no recursion depth risk.

   Both are O(V + E).

   </details>

2. Q: You have a weighted graph. What changes?
   <details><summary>Answer</summary>

   BFS stops being correct, because its guarantee comes from every edge costing
   the same. With weights, a path of three cheap edges can beat one expensive
   edge, and BFS would return the one-edge path.

   So it's Dijkstra: the same traversal but with a priority queue keyed by
   distance-so-far, always expanding the cheapest known vertex. Because I always
   expand the cheapest, the first time I finalise a vertex its distance is
   optimal. That's O((V + E) log V) with a binary heap.

   In JavaScript I'd note there's no built-in priority queue, so I'd write a
   min-heap. And I'd use the lazy-deletion trick rather than decrease-key: push
   a new entry when I improve a distance, and skip entries on pop whose distance
   is worse than the best I've recorded. Same complexity, much less code.

   The important caveat is non-negative weights. A negative edge breaks the
   assumption that a popped vertex is final, because a cheaper route could still
   arrive later. That needs Bellman-Ford at O(V × E), which also detects
   negative cycles — where "shortest path" stops being well-defined, since you
   could loop forever getting cheaper.

   And if all weights happen to be equal, I'd go back to BFS. Dijkstra there is
   a heap I didn't need.

   </details>

### Q: Design a course scheduler given prerequisites.
**Level:** intermediate · **Tags:** dsa, graphs, topological-sort

<details><summary>Model answer</summary>

That's a topological sort. Courses are vertices, and a prerequisite is a
directed edge from the prerequisite to the course that depends on it.

I'd use Kahn's algorithm. Compute every course's in-degree — how many
prerequisites it has. Seed a queue with everything at in-degree zero, since
those can be taken immediately. Pop a course, append it to the order, and
decrement the in-degree of everything that depended on it; when one hits zero,
its last prerequisite has cleared, so it joins the queue.

The cycle detection is free and that's why I'd pick this over DFS. If I finish
and have emitted fewer courses than exist, the remainder are all waiting on
something inside a cycle — a circular dependency — so no valid schedule exists.
That's the case the question is really about, because it's the one that has no
answer.

O(V + E) time and space.

Two extensions I'd mention if it went further. If the question asks for the
minimum number of *semesters* rather than an order, it's the same algorithm
processing one whole level per iteration — the number of levels is the answer,
which is the same level-batching idea as BFS distance. And if courses have
capacity limits or a maximum per semester, it becomes a scheduling problem where
I'd pick greedily among available courses, ordered by something like how many
things they unblock.

</details>

**Follow-ups:**

1. Q: Would Union-Find work here instead?
   <details><summary>Answer</summary>

   No, and the reason is a useful distinction: Union-Find models *undirected
   connectivity*, and prerequisites are directional.

   Union-Find can tell me two courses are in the same connected group. It can't
   tell me that A must come before B, because union is symmetric — merging A and
   B loses the direction entirely. So it can't produce an order, and it can't
   detect a *directed* cycle: A→B→C→A and a triangle of undirected edges look
   identical to it.

   Where it does belong is undirected connectivity questions — number of
   provinces, redundant connection, Kruskal's minimum spanning tree — and
   especially when edges arrive over time, since it handles incremental unions
   in near-constant time where a DFS would have to re-run.

   For anything with dependencies and direction, it's topological sort.

   </details>

---

## What a weak answer sounds like

- **DFS for a shortest path.** Wrong, not merely slow.
- **A parent check on a directed graph**, or none on an undirected one.
- **Dijkstra with negative weights** and no mention of Bellman-Ford.
- **`new Array(n).fill([])`** — one array shared by every vertex.
- **Forgetting the reverse edge** on an undirected graph.
- **Only starting from vertex 0**, so disconnected components are missed.
- **`shift()` as the BFS queue**, making an O(V + E) traversal quadratic.
- **Not recognising an implicit graph.** Word ladder and state-space searches
  don't look like graph problems until you notice the vertices are states.
- **No mention of recursion depth** on a large DFS.

---

## Glossary

- **Vertex / edge** — a node / a connection between two.
- **Directed / undirected** — one-way edges / two-way.
- **Weighted** — edges carry a cost.
- **DAG** — directed acyclic graph; a prerequisite for topological sort.
- **In-degree** — how many edges point *at* a vertex.
- **Connected component** — a maximal mutually reachable set.
- **Adjacency list / matrix** — O(V + E) neighbour lists / an O(V²) lookup table.
- **Implicit graph** — vertices generated on demand rather than stored.
- **Multi-source BFS** — seeding every start vertex, giving distance from the nearest.
- **Back edge** — an edge to a vertex on the current DFS path; the definition of a directed cycle.
- **Three-colour DFS** — white/grey/black marking for directed cycle detection.
- **Kahn's algorithm** — topological sort by repeatedly taking in-degree-zero vertices.
- **Union-Find (DSU)** — near-O(1) undirected connectivity with path compression and union by rank.
- **Path compression** — repointing nodes straight at the root during `find`.
- **Dijkstra** — shortest path with non-negative weights, using a priority queue.
- **Lazy deletion** — pushing duplicate heap entries and skipping stale ones, instead of decrease-key.
- **Bellman-Ford** — shortest path tolerating negative weights; detects negative cycles.
- **MST** — minimum spanning tree; connects all vertices at least total cost.
