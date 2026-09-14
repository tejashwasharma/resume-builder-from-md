# The drill plan — how to practise, and what to practise

[Patterns and complexity](04-patterns-and-complexity.md) is the framework and
[choosing the approach](05-choosing-the-approach.md) is how to pick a
technique. Neither of them is practice. This chapter is the practice: the
ladder through chapters 06–18, a rule for when to stop struggling, a rule for
when a block is actually finished, and the 30-problem mock pool that
`/mock-interview coding` draws from.

The ladder for this part is fixed: **04 → 05 → 06–13 (structures) → 14–17
(techniques) → 18 (the security-flavoured set, last)**. Each chapter has a
**Worked problems** section with the full solution, approach and follow-ups;
the tables below name the problems, and the chapter is where you go after
the time-box expires.

| Block | Chapter | What it teaches |
| --- | --- | --- |
| 1 | [arrays and two pointers](06-arrays-and-two-pointers.md) | Hash map, prefix sums, sliding window, two pointers, cyclic sort |
| 2 | [strings and hashing](07-strings-and-hashing.md) | Counting, windows over characters, expand around centre |
| 3 | [linked lists](08-linked-lists.md) | Pointer surgery, fast/slow, dummy heads |
| 4 | [stacks, queues, monotonic](09-stacks-queues-monotonic.md) | Monotonic stack/deque, amortised analysis |
| 5 | [trees and BST](10-trees-and-bst.md) | Recursion shape, return vs record, BST invariants |
| 6 | [heaps and top-k](11-heaps-and-top-k.md) | k-largest inversion, two heaps, streams |
| 7 | [graphs](12-graphs.md) | BFS/DFS, topological sort, union-find, Dijkstra |
| 8 | [matrices and grids](13-matrices-and-grids.md) | Implicit graphs, multi-source BFS, in-place rotation |
| 9 | [recursion and backtracking](14-recursion-and-backtracking.md) | Choose/explore/unchoose, pruning |
| 10 | [dynamic programming](15-dynamic-programming.md) | State, transition, base case, 1-D → 2-D |
| 11 | [binary search and bits](16-binary-search-and-bits.md) | Binary search on the answer, XOR tricks |
| 12 | [tries, intervals, design structures](17-tries-intervals-and-design-structures.md) | LRU/LFU, rate limiter, consistent hashing, trie |
| 13 | [security-flavoured problems](18-security-flavoured-problems.md) | The same patterns in the shape of the two roles — do this block last |

It's adapted from a 15-day guided plan, deliberately loosened. **Days are the
wrong unit.** Some blocks take an evening and some take three, and a schedule
that says "Tuesday is graphs" makes you either rush past something you haven't
got or sit around after something you have. Blocks with exit tests fix that.

> **If you only change one thing** about how you currently practise, make it the
> time-box in the next section. Not the problem list. Unbounded struggling is
> what turns a two-week plan into a six-week one.

---

## The rules that matter more than the list

### 1. Time-box every problem

```mermaid
flowchart TD
  A["Read problem<br/>0:00"] --> B["Think + plan<br/>to 0:10"]
  B --> C{"Do I know<br/>the pattern?"}
  C -->|Yes| D["Code it<br/>to 0:30"]
  C -->|No| E["Reread constraints,<br/>try 11b's 3 questions<br/>to 0:20"]
  E --> F{"Now?"}
  F -->|Yes| D
  F -->|No| G["Read the solution.<br/>Log it. Move on."]
  D --> H{"Working<br/>by 0:35?"}
  H -->|No| G
  H -->|Yes| I["Done — note the<br/>signal that gave it away"]
```
*Thirty-five minutes, then you read the solution regardless. Reading a solution is not failure; spending ninety minutes not reading it is.*

The whole rule: **10 minutes to find the approach, 25 to implement, then stop.**
A real round is 35–45 minutes including the conversation, so anything longer
isn't practising the thing you're being tested on.

When you do read the solution, the work isn't finished — see rule 3.

### 2. Solve out loud, from the first block

The doc this is adapted from saves interview simulation for the last day. That's
too late: you find out on day 15 that narration is your weak point, with no time
left to fix it.

So from block 1, on **at least one problem per session**: say the constraints,
say the target complexity, say the brute force, then say why you're picking the
pattern you're picking — out loud, before typing. It feels ridiculous alone in a
room. It is also the single highest-return habit here, because narration is what
the round actually grades.

### 3. Keep a mistake log, and re-solve from it

One file, one line per problem you didn't get:

```
Rain water trapped — saw it as a stack problem, missed that it's two
  precomputed passes. Signal I missed: "depends on both sides of i".
```

The important column is **the signal you missed**, not the solution. You are
training pattern recognition, and the recognisable thing is the signal.

Then: **re-solve every logged problem from scratch two days later.** Not
re-read — re-solve, blank editor. This is the step that converts recognition
into recall, and skipping it is why people finish a plan and still freeze.

### 4. Exit tests, not day counts

Each block below ends with a specific test. Pass it and move on, whether that
took one evening or four. Fail it and repeat the block's weakest topic rather
than pressing ahead — a shaky foundation compounds, because later blocks reuse
earlier patterns.

---

## The blocks

Six sittings that group the chapter ladder above, ordered so each one reuses
the last. The **pattern** column points at the section in
[choosing the approach](05-choosing-the-approach.md) that explains why the
technique applies — read that section *before* attempting the block, not
after. The chapters' own **Worked problems** tables are the canonical list;
these sittings are the order to take them in.

### Block 1 — Arrays, and the three techniques that hide in them

The largest and most important block. Most interview problems are array
problems wearing a costume, and three techniques cover most of them.

| Problem | Pattern |
| --- | --- |
| Two sum | Hash map |
| Equilibrium index of an array | Prefix sum |
| Longest subarray with zero sum | Prefix sum + hash map |
| Subarray sum equals k *(count, not existence)* | Prefix sum + hash map |
| Max sum contiguous subarray *(Kadane's)* | DP in one variable |
| Subarray with given sum and length | Sliding window |
| Longest substring without repeating characters | Sliding window |
| Rain water trapped | Forward + backward passes |
| Product of array except self | Forward + backward passes |
| Move zeroes / remove duplicates in place | Two pointers |
| First missing positive integer | Cyclic sort |

**Exit test:** given a new contiguous-subarray problem, you can say within thirty
seconds whether it's a sliding window or a prefix sum, **and say why**. The
answer is about negative values and whether you need a count — if that isn't
instant, redo the four prefix-sum problems.

> **Added to the original plan:** the prefix-sum group and *product of array
> except self*. The source plan had rain water on day 1 with no build-up, which
> is why it's most people's first wall — it needs the forward/backward idea and
> nothing before it teaches that.

---

### Block 2 — Strings

Absent as a topic from the original plan, and heavily represented in real
screens. Mostly the same techniques as block 1, which is why it goes here.

| Problem | Pattern |
| --- | --- |
| Valid palindrome *(ignoring non-alphanumerics)* | Two pointers |
| Group anagrams | Hash map with a sorted or counted key |
| Longest palindromic substring | Expand around centre |
| Minimum window substring | Sliding window + counts |
| Longest repeating character replacement | Sliding window |
| String compression / run-length encode | Two pointers, in place |

**Exit test:** minimum window substring, working, in under 35 minutes. It's the
hardest sliding window in common rotation, and passing it means the pattern is
solid rather than memorised.

---

### Block 3 — Searching, sorting and bit tricks

Short block, high yield. Binary search on the answer is the piece that most
distinguishes a prepared candidate.

| Problem | Pattern |
| --- | --- |
| Binary search, written from scratch | Binary search |
| Search in a rotated sorted array | Binary search, modified |
| Painter's partition problem | **Binary search on the answer** |
| Aggressive cows | **Binary search on the answer** |
| Merge sort, written from scratch | Divide and conquer |
| K closest points to origin | Heap + custom comparator |
| Top-k frequent elements | Hash map + heap |
| Sort a nearly-sorted array *(k places apart)* | Min-heap of size k+1 |
| Single number I, II and III | XOR / bit counting |
| Count set bits, check/flip a bit | Bit manipulation |

**Exit test:** you can explain, unprompted, the two conditions that make binary
search on the answer legal — a cheap feasibility check, and monotonic
feasibility — and identify them in painter's partition.

> **Added:** top-k frequent elements and the nearly-sorted array. The original
> plan has no heap day at all, despite "k closest points" appearing on its
> sorting day; top-k is where the min-heap-for-k-largest inversion becomes
> obvious, and the nearly-sorted array is the cleanest "why a heap rather than
> just sorting" problem there is — a size k+1 heap gives O(n log k) where a
> sort gives O(n log n).

---

### Block 4 — Linked lists, stacks and queues

| Problem | Pattern |
| --- | --- |
| Middle of a linked list | Fast/slow pointers |
| Detect and remove a loop | Floyd's cycle detection |
| Reverse a linked list *(iterative)* | Three-pointer reversal |
| Merge two sorted lists | Dummy head |
| LRU cache | Hash map + doubly linked list |
| Balanced parentheses | Stack |
| Queue using two stacks | Amortised analysis |
| Nearest smaller element | **Monotonic stack** |
| Largest rectangle in a histogram | **Monotonic stack** |
| Daily temperatures | **Monotonic stack** |

**Exit test:** largest rectangle in a histogram, and you can explain why it's
O(n) despite the while-inside-for — each element is pushed once and popped once.

> **Added:** reverse a linked list, merge two sorted lists, and daily
> temperatures. Reversal is a building block for half of the harder list
> problems and the original plan skips straight to LRU cache. The extra
> monotonic-stack problem is there because one exposure to that pattern is not
> enough, and histogram is brutal as a first contact.

---

### Block 5 — Trees and graphs

| Problem | Pattern |
| --- | --- |
| All four traversals, from scratch | Recursion / BFS |
| Zigzag level order | BFS with alternating direction |
| Diameter of a binary tree | Tree DP — return vs record |
| Lowest common ancestor | Postorder |
| Build a tree from inorder + preorder | Recursion + index map |
| Validate a BST | Inorder is sorted |
| Number of islands | DFS/BFS flood fill |
| Rotten oranges | **Multi-source** BFS |
| Cycle in a directed graph | DFS, three-colour |
| Course schedule / build order | Topological sort |
| Dijkstra, from scratch | Heap-based shortest path |
| Number of provinces *(or redundant connection)* | **Union-Find** |

**Exit test:** you can state, without hesitating, when BFS is required rather
than merely convenient — shortest path in an unweighted graph — and why rotten
oranges is BFS specifically (the answer is a number of levels).

> **Added:** validate a BST, course schedule, and a union-find problem.
> Union-Find is the clearest gap in the original plan: near-O(1) connectivity,
> ~15 lines, and it shows up often enough that not having it is noticeable. The
> implementation is in [choosing the approach](05-choosing-the-approach.md#data-structures).

---

### Block 6 — Recursion, backtracking, greedy and DP

Last because it's hardest, and because it reuses everything above.

| Problem | Pattern |
| --- | --- |
| Implement `pow(x, n)` | Divide and conquer |
| Subsets / permutations | Backtracking |
| Generate all parentheses | Backtracking + pruning |
| N-Queens | Backtracking + pruning |
| Fractional knapsack | **Greedy** |
| Interval scheduling *(sort by end time)* | **Greedy** |
| Merge intervals / insert interval | **Sort + sweep** |
| Distribute candies | Greedy, two passes |
| Climbing stairs / Fibonacci | DP, 1-D |
| House robber *(max sum, no adjacent)* | DP, 1-D |
| Minimum number of squares | DP, unbounded |
| 0-1 knapsack | **DP, 2-D** |
| Longest common subsequence | DP, 2-D |
| Coin change | DP, unbounded |

**Exit test:** you can explain the fractional-vs-0-1 knapsack split as the
difference between greedy and DP, in your own words, without looking. That one
comparison is the most reliable way to tell the two apart under pressure, and
it's why both sit in the same block here rather than a day apart.

> **Added:** merge intervals. Intervals are a whole problem family — sort by
> start, then sweep — and the original plan has none of them, despite meeting
> rooms and interval merging being near-universal in screens.

---

## The mock pool

`/mock-interview coding` and any scheduled practice round draw from these 30
problems. Every one is worked in full in its chapter's **Worked problems**
section, so a miss has an immediate place to go. The weighting mirrors what
Google screens ask at the senior level — graphs, DP and design structures
are not optional here.

| # | Problem | Chapter | Pattern |
| --- | --- | --- | --- |
| 1 | Subarray sum equals k | [06 arrays](06-arrays-and-two-pointers.md) | Prefix sum + hash map |
| 2 | Trapping rain water | [06 arrays](06-arrays-and-two-pointers.md) | Forward + backward passes |
| 3 | First missing positive | [06 arrays](06-arrays-and-two-pointers.md) | Cyclic sort |
| 4 | Merge intervals | [06 arrays](06-arrays-and-two-pointers.md) | Sort + sweep |
| 5 | Longest substring without repeats | [07 strings](07-strings-and-hashing.md) | Sliding window |
| 6 | Minimum window substring | [07 strings](07-strings-and-hashing.md) | Window + counts |
| 7 | Group anagrams | [07 strings](07-strings-and-hashing.md) | Counted key |
| 8 | Longest palindromic substring | [07 strings](07-strings-and-hashing.md) | Expand around centre |
| 9 | Reverse in k-groups | [08 linked lists](08-linked-lists.md) | Reversal |
| 10 | Merge k sorted lists | [08 linked lists](08-linked-lists.md) | Heap |
| 11 | Copy list with random pointer | [08 linked lists](08-linked-lists.md) | Interleaving |
| 12 | Cycle start | [08 linked lists](08-linked-lists.md) | Floyd's |
| 13 | Largest rectangle in a histogram | [09 stacks](09-stacks-queues-monotonic.md) | **Monotonic stack** |
| 14 | Sliding window maximum | [09 stacks](09-stacks-queues-monotonic.md) | Monotonic deque |
| 15 | Min stack · Basic calculator | [09 stacks](09-stacks-queues-monotonic.md) | Paired stack · stack of signs |
| 16 | Lowest common ancestor | [10 trees](10-trees-and-bst.md) | Postorder |
| 17 | Serialize / deserialize · Validate BST | [10 trees](10-trees-and-bst.md) | Preorder with nulls · bounds |
| 18 | Max path sum | [10 trees](10-trees-and-bst.md) | Return vs record |
| 19 | Kth largest in a stream · Top-k frequent | [11 heaps](11-heaps-and-top-k.md) | Size-k min-heap · map + heap |
| 20 | Median from a stream · Meeting rooms II | [11 heaps](11-heaps-and-top-k.md) | Two heaps · end-time heap |
| 21 | Course schedule | [12 graphs](12-graphs.md) | **Topological sort** |
| 22 | Number of islands · Word ladder | [12 graphs](12-graphs.md) | Flood fill · BFS on an implicit graph |
| 23 | Network delay time | [12 graphs](12-graphs.md) | Dijkstra |
| 24 | Rotten oranges · Rotate image · Search a 2-D matrix | [13 matrices](13-matrices-and-grids.md) | Multi-source BFS · transpose + reverse · flattened binary search |
| 25 | Subsets · Permutations · Combination sum · N-Queens · Generate parentheses | [14 backtracking](14-recursion-and-backtracking.md) | Choose / explore / unchoose, pruning |
| 26 | Coin change · Longest increasing subsequence | [15 DP](15-dynamic-programming.md) | Unbounded · 1-D |
| 27 | Edit distance · 0-1 knapsack · Word break | [15 DP](15-dynamic-programming.md) | 2-D · rolling row · string DP |
| 28 | Search rotated array · Koko eating bananas · Median of two sorted arrays | [16 binary search](16-binary-search-and-bits.md) | Modified · **on the answer** · partition |
| 29 | LRU cache · LFU cache · Rate limiter · Consistent hashing · Trie | [17 design](17-tries-intervals-and-design-structures.md) | Map + DLL · frequency buckets · token bucket · hash ring · nested maps |
| 30 | IAM policy evaluation · Permission inheritance · Secret scanning · Dependency resolution · SBOM diff · Audit-log dedup · Path traversal · CIDR match · Top-k offenders | [18 security](18-security-flavoured-problems.md) | Deny-overrides fold · DFS on a hierarchy · pattern sets · topological sort with constraints · set diff · window dedup · stack normalisation · bit trie · heap |

Rows 1–23 are one problem each; rows 24–30 group a chapter's set so the
table stays readable — the chapters list them individually. Sixty-plus
worked problems in total.

### What the list tells you

**Graphs and DP are in.** The 15-day plan this was adapted from had no
graph problems in its mock pool; Google's screens ask them constantly.
Course schedule (topological sort) and coin change (unbounded DP) are the
two problems most worth being fluent in.

**Design structures are a whole block.** LRU cache is the single most-asked
"design a data structure" question in the industry; the rate limiter and
consistent hashing are what a security-infrastructure team asks because
they are what the team builds.

**Chapter 18 comes last for a reason.** Every problem in it is an earlier
pattern wearing the costume of the role — IAM policy evaluation is a fold
over rules, dependency resolution is topological sort with constraints,
CIDR matching is a binary trie. It is the exit test for the whole ladder:
if the costume hides the pattern, the pattern isn't solid yet.

### Priority order for a scheduled mock

1. **Sliding window and prefix sum + map** — the highest-frequency patterns.
2. **BFS / DFS / topological sort** — course schedule, islands, word ladder.
3. **Monotonic stack** — largest rectangle; unsolvable in time without it.
4. **1-D and 2-D DP** — coin change, edit distance, knapsack.
5. **Heap patterns** — top-k, two-heap median, meeting rooms II.
6. **LRU cache** — the design-structure question everyone gets once.
7. **Binary search on the answer** — Koko; mechanical once seen.
8. **The rest** — all worked, all in the chapters.

---

## Sequencing, and what to do when time is short

The blocks assume you have a couple of weeks. If you don't:

| You have | Do this |
| --- | --- |
| **Six to eight weeks** *(the realistic window to a Google onsite)* | The full ladder 12 → 24 as sequenced in [the schedule](43-the-schedule.md); two mock rounds a week from week 3 |
| **A week** | Chapters 12, 18, 21 and 23, plus binary search on the answer from 22. Skip 14 and 19 |
| **Three days** | Chapter 12 entirely, then course schedule, coin change, LRU cache and Koko |
| **Tomorrow** | Reread [choosing the approach](05-choosing-the-approach.md)'s three questions and the signal → pattern table. Solve two-sum, longest substring without repeats, number of islands, and climbing stairs. Then sleep |

Interleave rather than blocking, if you can. Doing all eleven array problems
consecutively means problem four is easy because you're still primed from
problem three — which feels like progress and isn't. Mixing two or three blocks
per session is measurably better for recall, and it's also what an interview
does to you: no warning about which pattern is coming.

**Two rest points**, roughly after chapter 11 and after chapter 15. Not days off — use
them to re-solve everything in the mistake log from blank. That's the spacing
that makes the earlier blocks stick.

---

## Data structures

Before block 1, implement these from scratch once each. They take an evening
total, and a DSA round is explicitly testing that you reach for the right
structure rather than a dependency.

| Structure | Why implement it | Where it's needed |
| --- | --- | --- |
| **Binary heap** | JS has no built-in. You *will* need it and you can't install one | [11 heaps](11-heaps-and-top-k.md), [12 graphs](12-graphs.md) (Dijkstra) |
| **Union-Find** | ~15 lines, and near-O(1) connectivity is otherwise unavailable | [12 graphs](12-graphs.md) |
| **Trie** | Nested maps; 20 lines | [17 design structures](17-tries-intervals-and-design-structures.md), CIDR matching in [18](18-security-flavoured-problems.md) |
| **Deque** | `array.shift()` is O(n); know the ring-buffer answer if asked | BFS in [12](12-graphs.md) and [13](13-matrices-and-grids.md) |

Everything else is a `Map`, a `Set`, or array indices — see
[patterns and complexity](04-patterns-and-complexity.md#data-structures-not-libraries) and
[choosing the approach](05-choosing-the-approach.md#data-structures) for the per-pattern
tables.

**Pseudocode — the min-heap you'll need from chapter 17 onward**

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }

  push(v) {
    this.a.push(v);
    let i = this.a.length - 1;
    // Sift up: swap with the parent while it's larger. Parent of i is (i-1)>>1.
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.a[i], this.a[p]) >= 0) break;
      [this.a[i], this.a[p]] = [this.a[p], this.a[i]];
      i = p;
    }
  }

  pop() {
    const top = this.a[0], last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      // Sift down: swap with the SMALLER child, otherwise the heap property
      // breaks on the other side.
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l;
        if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r;
        if (m === i) break;
        [this.a[i], this.a[m]] = [this.a[m], this.a[i]];
        i = m;
      }
    }
    return top;
  }

  get size() { return this.a.length; }
}
```

For **k largest**, push everything and `pop()` whenever `size > k`. The min-heap
keeps the weakest of your current best k on top, so that's exactly what gets
evicted — the inversion that catches people out.

---

## Tracking it

Copy this into your own notes and fill the last two columns. The mistake log is
the column that matters; the tick is just momentum.

Track [the mock pool](#the-mock-pool) separately — it's 30 rows and the
chapters cover all of them.

| Chapter | Worked problems | Done | Logged mistakes | Re-solved |
| --- | --- | --- | --- | --- |
| 12 — Arrays | 4+ | | | |
| 13 — Strings | 4+ | | | |
| 14 — Linked lists | 4+ | | | |
| 15 — Stacks and queues | 4+ | | | |
| 16 — Trees | 4+ | | | |
| 17 — Heaps | 4+ | | | |
| 18 — Graphs | 4+ | | | |
| 19 — Matrices | 3+ | | | |
| 20 — Backtracking | 5 | | | |
| 21 — DP | 5 | | | |
| 22 — Binary search, bits | 3+ | | | |
| 23 — Design structures | 5 | | | |
| 24 — Security-flavoured | 9 | | | |

**You are ready when** you can look at an unseen problem and name the likely
pattern in under a minute with a reason attached — not when the ticks are all
filled in. Those are different things, and only the first one is being tested.

---

## Interview Q&A

### Q: How do you prepare for a coding round when you haven't done DSA in a while?
**Level:** foundation · **Tags:** dsa, preparation, process

<details><summary>Model answer</summary>

Pattern coverage over problem volume, and I'd time-box everything.

The realisation that changes how you practise is that interview problems are a
fairly small number of patterns in different costumes — maybe fifteen. So I'd
work in blocks by pattern rather than by problem count: arrays with the three
techniques that hide in them, strings, search and bit tricks, linked structures
with monotonic stacks, trees and graphs, then recursion and DP last because it
reuses everything. Roughly sixty problems, not six hundred.

The rule I'd hold to is 35 minutes per problem — ten to find the approach,
twenty-five to implement — and then read the solution regardless. Unbounded
struggling feels virtuous and it's the main reason a two-week plan becomes six.
A real round is 35 to 45 minutes anyway, so practising longer isn't practising
the thing being tested.

Two habits matter more than the list. First, solve at least one problem per
session out loud — constraints, target complexity, brute force, then why this
pattern — because narration is what's actually graded and you don't want to
discover that in the round. Second, keep a log of what I missed, recording the
*signal* I failed to spot rather than the solution, and re-solve those from
blank two days later. That last step is what converts recognition into recall.

And I'd measure readiness by whether I can name a likely pattern on an unseen
problem within a minute, with a reason. Not by how many problems I've ticked
off.

</details>

**Follow-ups:**

1. Q: How long should you spend on a problem before looking at the answer?
   <details><summary>Answer</summary>

   About 35 minutes total, split ten and twenty-five. Ten minutes to identify
   the approach, and if I haven't got it by then I reread the constraints and
   run the shape/return-type/budget questions deliberately. Twenty-five to
   implement. Then I read the solution regardless of where I am.

   The reason for a hard cap is that the marginal value drops off sharply.
   Struggling for two hours and getting there teaches you slightly more than
   struggling for thirty minutes and reading it — but it costs four times the
   time, and the interview is time-limited anyway. Practising a ninety-minute
   grind is practising something that never happens.

   The important part is what comes after reading it. I write down the signal I
   missed, not the solution — "depends on both sides of i, so it's two
   precomputed passes" — and then re-solve it from a blank editor two days
   later. Reading a solution and moving on produces recognition, which feels
   like knowing and disappears under pressure.

   </details>

2. Q: You've got three days before a coding screen. What do you actually do?
   <details><summary>Answer</summary>

   Triage hard, and accept that coverage is now the goal rather than depth.

   Day one is arrays, because most problems are array problems in disguise:
   hash map for lookups, sliding window, prefix sum, and the forward/backward
   pass. That's the highest-density block by a distance.

   Day two is binary search — including binary search on the answer, which is
   the piece that most distinguishes a prepared candidate — plus BFS and DFS
   with one flood-fill problem and one shortest-path problem.

   Day three is one 0-1 knapsack for DP, one backtracking problem, and then
   stop adding new material. I'd spend the last part of it re-solving whatever
   I got wrong on days one and two, out loud, timed.

   What I'd deliberately skip: tries, union-find, advanced DP, anything exotic.
   And I'd make sure I can talk through the process cleanly — restate,
   constraints, brute force with complexity, then optimise — because that
   structure earns credit even on a problem I don't finish, and in three days
   it's a more reliable investment than one more pattern.

   </details>

---

## What a weak answer sounds like

- **"I've done 400 problems."** Volume without pattern vocabulary. The follow-up
  — "what kind of problem is this?" — exposes it immediately.
- **Grinding without a time-box.** Produces a small number of deeply learned
  problems and no breadth.
- **Reading solutions and moving on.** That builds recognition, which collapses
  the moment you face a blank editor.
- **Practising silently, then narrating for the first time in the round.**
  Narration is a separate skill and it needs its own reps.
- **Treating a day plan as the goal.** Ticking day 9 while trees are still shaky
  means block 5 will fail, because later patterns build on earlier ones.
- **Skipping the boring reps** — writing binary search, merge sort and a heap
  from scratch once each. These show up as sub-steps everywhere.

---

## Glossary

- **Time-box** — a fixed cap per problem (35 min here), after which you read the solution.
- **Mistake log** — a running record of missed problems, keyed by the *signal* you failed to spot.
- **Re-solve from blank** — reattempting a logged problem days later with no notes; the step that builds recall.
- **Exit test** — the specific check that a block is finished, replacing a day count.
- **Interleaving** — mixing topics within a session rather than blocking one topic, which improves recall.
- **Spacing** — revisiting material after a gap, which is why the two rest points are re-solve sessions.
- **Recognition vs recall** — being able to follow a solution vs being able to produce one. Only the second is tested.
