# Coding rounds: patterns and complexity

You have a Scaler DSA certification on your resume, and senior loops still run
coding rounds. This isn't about grinding hundreds of problems — it's about
recognising which of a small number of patterns applies.

---

## Complexity, quickly

| Notation | Meaning | Typical source |
| --- | --- | --- |
| O(1) | Constant | Hash lookup, array index |
| O(log n) | Halving each step | Binary search, balanced tree |
| O(n) | One pass | Single loop |
| O(n log n) | Sort, or divide and conquer | Sorting, heap operations |
| O(n²) | Nested loop over the same data | Comparing all pairs |
| O(2ⁿ) | Try every subset | Naive recursion without memoisation |

**Space matters too**, and interviewers ask about it after you've solved the
problem. Recursion costs stack space — a recursive solution is O(depth) space
even if it allocates nothing.

**The practical rule:** if `n` is up to ~10⁶, you need O(n) or O(n log n). If
you've written a nested loop over a large input, look for a hash map.

---

## The patterns worth knowing

Most interview problems are one of these, and the skill is recognising which
from the shape of the problem:

| The problem looks like… | Reach for |
| --- | --- |
| "have I seen this?", counting, pairs | Hash map (O(n²) → O(n)) |
| a contiguous run in an array/string | Sliding window |
| sorted input, or working in-place from both ends | Two pointers |
| nodes and edges, trees, reachability | BFS (shortest, unweighted) / DFS (explore, cycles, topo) |
| top-k, running min/max | Heap |
| "count the ways", "minimum cost" | DP — recursion + memoisation |
| a monotonic yes/no over a range | Binary search (including on the answer) |

The most common miss is the first row: if you're writing a nested loop to
search for something, a hash map almost certainly removes the inner one.

> **Per-structure depth** — costs, idioms, bugs and a practice ladder for each:
> [arrays](04-arrays.md), [strings](05-strings.md),
> [linked lists](06-linked-lists.md), [matrices](07-matrices.md),
> [stacks and queues](08-stacks-and-queues.md), [trees](09-trees.md),
> [heaps](10-heaps.md), [graphs](11-graphs.md).
>
> **The harder question — how do you know *which* of these applies?**
> [Choosing the approach](02-choosing-the-approach.md) covers the full
> catalogue (prefix sums, forward/backward passes, monotonic stacks, cyclic
> sort, binary search on the answer, union-find) and the three questions that
> narrow twenty techniques to two.

### 1. Hash map for lookups

Turns "have I seen this?" from O(n) into O(1). The single most useful pattern —
whenever you're about to write a nested loop searching for something, ask
whether a map removes the inner one.

```js
// Two-sum: O(n) rather than O(n²)
const seen = new Map();
for (let i = 0; i < nums.length; i++) {
  if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
  seen.set(nums[i], i);
}
```

### 2. Two pointers

For sorted arrays or in-place work. Move from both ends, or fast and slow.

Use for: pair sums in a sorted array, removing duplicates in place, detecting a
cycle in a linked list (fast/slow pointers), palindrome checks.

### 3. Sliding window

For contiguous subarrays or substrings. Expand the right edge, shrink the left
when a constraint is violated. Turns O(n²) into O(n).

Use for: longest substring without repeats, maximum sum of size k, smallest
window containing all of something. **Rate limiting is a sliding window** —
which is a nice connection to make if the problem comes up.

### 4. BFS / DFS

Graphs and trees. **BFS for shortest path** in an unweighted graph, level-order
traversal. **DFS for exploring fully**, cycle detection, topological sort.

Both O(V + E). BFS uses a queue and more memory; DFS uses recursion or a stack
and can blow the stack on deep graphs.

Worth knowing that **permission inheritance is graph traversal** — "does this
user have access through any role or group?" is a reachability question. That's
a genuinely good connection to draw from your background.

### 5. Heap / priority queue

When you need the top-k or a running minimum/maximum. O(log n) insert and
extract.

Use for: top-k frequent elements, merging k sorted lists, scheduling.

### 6. Binary search

Not only on sorted arrays — also on the **answer space**. "What's the minimum
capacity that works?" can be binary searched if feasibility is monotonic.

### 7. Dynamic programming

When subproblems repeat. Recognise it by: "count the ways", "minimum cost",
"can this be partitioned". Start with recursion plus memoisation, which is
easier to derive than a bottom-up table and usually enough.

---

## How to run the round

1. **Restate the problem.** Confirm you're solving the right thing.
2. **Ask about constraints.** Input size decides which complexity is
   acceptable. Empty input? Duplicates? Negative numbers?
3. **Give the brute force first**, with its complexity, and say you'll improve
   it. This gets a working baseline on the board and shows you understand the
   problem.
4. **Then optimise**, saying what you're trading — usually space for time.
5. **Write it**, talking as you go.
6. **Test it by hand** on a small example, plus edge cases. Finding your own
   bug is a strong signal.
7. **State the complexity**, time and space.

**Talk continuously.** A silent candidate who produces a correct solution
scores worse than one who thinks out loud and nearly finishes. They're
assessing how you reason, and silence hides it.

**If you're stuck:** say what you've tried and why it doesn't work. That's a
legitimate move and interviewers will often nudge you. Sitting silently for
five minutes is the worst outcome.


## Data structures, not libraries

A DSA round is explicitly testing that you reach for the right built-in
structure, not a dependency. What each pattern above actually uses in
JS/TS:

| Pattern | Structure | Note |
| --- | --- | --- |
| Hash map for lookups | `Map` / `Set` | Prefer over a plain object — no prototype-chain surprises, keeps insertion order |
| Two pointers / sliding window | Array indices | No structure needed — the technique *is* not allocating one |
| BFS | Array as a queue, or a real `Deque` | `array.shift()` is O(n) at scale; for a timed round it's fine, but know that a ring-buffer deque is the correct answer if asked |
| DFS | Native call stack, or an explicit `Array` as a stack | Recursion is the call stack; convert to explicit only if depth risks overflow |
| Heap / priority queue | **JS has no built-in heap** | Implement a small binary heap inline, or say so and reach for `heap-js` outside interview conditions — naming this gap unprompted is itself a signal |
| Binary search | Array indices | `lodash.sortedIndex` exists but writing the loop is the point of the round |

---

## Interview Q&A

### Q: Find the first non-repeating character in a string.
**Level:** foundation · **Tags:** dsa, hashmap

<details><summary>Model answer</summary>

Two passes with a hash map. First pass counts occurrences; second pass returns
the first character with a count of one.

```js
function firstUnique(s) {
  const counts = new Map();
  for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1);
  for (const c of s) if (counts.get(c) === 1) return c;
  return null;
}
```

O(n) time, O(k) space where k is the alphabet size — bounded, so effectively
O(1) for ASCII.

Two passes is necessary: you can't know a character is unique until you've seen
the whole string. The naive alternative is checking each character against all
others, which is O(n²).

Edge cases: an empty string, and a string where nothing is unique — both return
null here.

</details>

**Follow-ups:**

1. Q: What if the string is a stream and you can't do two passes?
   <details><summary>Answer</summary>

   Then you need to maintain the answer incrementally as characters arrive.

   Keep a hash map of character to count, plus a queue of candidates in arrival
   order. On each new character, increment its count and push it to the queue if
   it's the first sighting. Then pop from the front of the queue while the front
   character's count is greater than one — those can never be the answer again.
   The front of the queue is the current first-unique, or the queue is empty and
   there isn't one.

   Amortised O(1) per character, since each character is pushed and popped at
   most once. Space is bounded by the alphabet.

   This is the same shape as a sliding window: maintain a structure so the
   answer is available at any moment rather than recomputed.

   </details>

### Q: Given a list of user role bindings, find all permissions a user has, including inherited ones.
**Level:** intermediate · **Tags:** dsa, graph, authz

<details><summary>Model answer</summary>

This is graph traversal. Roles can contain other roles, and permissions hang
off roles, so "all permissions for a user" means finding everything reachable
from their direct role bindings.

BFS or DFS from the user's roles, collecting permissions, with a visited set —
the visited set matters because role hierarchies can contain cycles if nobody
prevents them, and without it you loop forever.

```js
function effectivePermissions(userRoles, roleGraph, rolePerms) {
  const perms = new Set();
  const seen = new Set();
  const queue = [...userRoles];

  while (queue.length) {
    const role = queue.shift();
    if (seen.has(role)) continue;      // cycle guard
    seen.add(role);

    for (const p of rolePerms.get(role) ?? []) perms.add(p);
    for (const child of roleGraph.get(role) ?? []) queue.push(child);
  }
  return perms;
}
```

O(V + E) over roles and their relationships. Space is O(V) for the visited set.

The production consideration I'd raise: doing this per request is why
authorization gets slow, especially with deep hierarchies. You'd cache the
result keyed on the user and a version counter, so a role change invalidates it
— which is exactly the pattern from the caching work.

</details>

**Follow-ups:**

1. Q: What if the role hierarchy has a cycle?
   <details><summary>Answer</summary>

   The visited set handles it at read time — you simply stop when you reach a
   role you've already processed, so traversal terminates and the permission set
   is still correct.

   But the better answer is to **prevent cycles at write time**. When someone
   adds a parent-child relationship between roles, check whether it would create
   one — which is a reachability query: is the proposed parent already reachable
   from the child? Reject it if so.

   That's better because a cycle in a role hierarchy is almost always a
   configuration mistake, and letting it exist means every read pays for
   defensive traversal and admins see confusing behaviour. Failing at the point
   of the mistake, with a clear message, is much kinder than tolerating it
   silently.

   You'd keep the visited set anyway as a safety net, since data can arrive
   through migrations and direct writes that bypass validation.

   </details>

### Q: How do you approach a problem you don't recognise?
**Level:** intermediate · **Tags:** dsa, process

<details><summary>Model answer</summary>

Start by making sure I understand it — restate it, work through a small example
by hand, and ask about constraints. Input size tells me what complexity is
acceptable, which often points at the technique before I've thought about the
algorithm.

Then get *something* working. I'd describe the brute force, state its
complexity, and say I'll improve on it. That gives us a correct baseline to
talk about, and it's much better than staring at the problem hunting for the
clever solution.

Then look for the wasted work. Am I recomputing the same thing? — memoise. Am I
searching repeatedly? — hash map. Is it a contiguous range? — sliding window.
Is the input sorted, or would sorting help? — two pointers or binary search.
Most optimisations come from spotting repeated work.

Throughout, I'd talk. If I'm stuck I'd say what I've tried and why it doesn't
work, which usually gets a useful hint — and is far better than going silent.

And I'd test by hand before declaring it done, including edge cases: empty
input, one element, duplicates. Finding my own bug is better than the
interviewer finding it.

</details>

---

## What a weak answer sounds like

- **Jumping straight to code** without clarifying constraints.
- **Going silent while thinking.** They can only assess what you say.
- **Not stating complexity** unless asked.
- **Ignoring edge cases** — empty input, single element, duplicates.
- **Optimising prematurely** instead of getting a working baseline first.

---

## Glossary

- **Amortised** — average cost per operation across a sequence.
- **Sliding window** — a moving contiguous range; turns O(n²) into O(n).
- **Two pointers** — indices moving through a sequence, often from both ends.
- **BFS / DFS** — queue-based level-order / stack-based deep-first traversal.
- **Memoisation** — cache subproblem results in a recursive solution.
- **Topological sort** — ordering a DAG so dependencies come first.
- **Visited set** — prevents revisiting nodes; required if cycles are possible.
