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
> [arrays](06-arrays-and-two-pointers.md), [strings](07-strings-and-hashing.md),
> [linked lists](08-linked-lists.md), [matrices](13-matrices-and-grids.md),
> [stacks and queues](09-stacks-queues-monotonic.md), [trees](10-trees-and-bst.md),
> [heaps](11-heaps-and-top-k.md), [graphs](12-graphs.md).
>
> **The harder question — how do you know *which* of these applies?**
> [Choosing the approach](05-choosing-the-approach.md) covers the full
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

## Problem bank — complexity and the maths every round assumes

Before any data structure: can you cost a loop, tell from the constraints
whether your idea will pass, and do the number theory that turns up inside
other problems? This bank covers the Scaler track's problem-solving,
time-complexity and modular-arithmetic lectures.

| Group | Problems |
| --- | --- |
| Costing code | count the iterations of loop snippets, Big-O rules, will it TLE, space complexity, overflow from constraints |
| Number theory | count factors, primality, integer square root, sums and counts (Gauss, AP, GP, log) |
| Modular arithmetic | the mod rules, N! mod m, a huge number mod p, divisibility rules |

Fast exponentiation (aⁿ mod m) is in the
[recursion bank](14-recursion-and-backtracking.md#problem-bank-recursion-fundamentals);
bit-level facts are in the [bits bank](16-binary-search-and-bits.md#problem-bank-bit-manipulation-fundamentals).

---

### Costing code

**The rule of thumb:** a judge (and an interviewer's intuition) allows about
**10⁸ simple operations per second** — call it 10⁷–10⁸ to be safe. Read the
constraints, plug n into your complexity, and compare before you write code.

### Q: How many times does each of these loops run?
**Level:** foundation · **Tags:** coding, complexity, iterations, scaler

<details><summary>Model answer</summary>

Count iterations as a function of N, then drop constants and lower-order terms.

| # | Loop | Iterations | Big-O |
| --- | --- | --- | --- |
| 1 | `for (i = 1; i <= N; i++)` | N | O(N) |
| 2 | `for (i = 1; i <= N; i += 2)` | ⌈N/2⌉ | O(N) |
| 3 | `for (i = 0; i < 100; i++)` | 100 | O(1) |
| 4 | `for (i = 1; i * i <= N; i++)` | ⌊√N⌋ | O(√N) |
| 5 | `for (i = N; i > 1; i = i / 2)` | ⌊log₂N⌋ | O(log N) |
| 6 | `for (i = 1; i < N; i = i * 2)` | ⌈log₂N⌉ | O(log N) |
| 7 | `for (i = 0; i >= 0; i++)` | forever (until overflow) | — |
| 8 | Two **separate** loops of N and M | N + M | O(N + M) |
| 9 | `for i < 10` → `for j < N` | 10N | O(N) |
| 10 | `for i < N` → `for j < N` | N² | O(N²) |
| 11 | `for i < N` → `for j <= i` | 1 + 2 + … + N = N(N+1)/2 | O(N²) |
| 12 | `for i < N` → `for (j = 1; j < N; j *= 2)` | N·log N | O(N log N) |
| 13 | `for (i = 1; i <= N; i *= 2)` → `for j < i` | 1 + 2 + 4 + … + N ≈ 2N | O(N) |
| 14 | `for i < N` → `for (j = 1; j <= 2^i; j++)` | 2⁰ + … + 2ᴺ⁻¹ = 2ᴺ − 1 | O(2ᴺ) |

**The two series behind rows 11, 13 and 14.**
- **Arithmetic progression:** `a, a+d, a+2d, …`; nth term `a + (n−1)d`;
  sum of n terms `n/2 · (2a + (n−1)d)`. Row 11 is `1..N`.
- **Geometric progression:** `a, ar, ar², …`; sum of n terms
  `a(rⁿ − 1)/(r − 1)`. Rows 13 and 14 are GPs with r = 2 — and a doubling GP's
  sum is about twice its last term, which is why row 13 is O(N), not O(N log N).

**Why halving is log N:** after k halvings N becomes N/2ᵏ; it reaches 1 when
`k = log₂N`.

</details>

**Follow-ups:**
1. Q: Why is row 13 O(N) and not O(N log N)?
   <details><summary>Answer</summary>

   The inner loop's length depends on i. There are log N outer iterations, but
   the inner work is 1, 2, 4, …, N, a geometric series summing to < 2N.
   "Multiply the loop counts" only works when the inner count doesn't depend on
   the outer variable.

   </details>

### Q: Why drop constants and lower-order terms — and when does Big-O mislead you?
**Level:** foundation · **Tags:** coding, complexity, big-o, asymptotic-analysis, scaler

<details><summary>Model answer</summary>

**Why not compare execution time.** It depends on the machine, the language,
the load — the same algorithm runs faster on a better laptop. Iteration counts
don't.

**Why drop lower-order terms.** Their share of the total vanishes as N grows.
For `N² + 10N`: at N = 10 the `10N` term is half the total; at N = 10⁴ it is
0.1%; at N = 10⁸ it is noise.

**Why drop constants.** Asymptotically, an O(N) algorithm beats an O(N²) one
for *some* large N whatever the constants — `100·N·log N` loses to `N²/10`
for small N, but wins from a few thousand onwards. Big-O asks "how does it
scale", and constants don't change the shape.

**Where it misleads.**
- **Equal Big-O ≠ equal speed.** `2N` and `100N` are both O(N). For a hot loop
  at scale, the constant — and cache behaviour — decides.
- **Small N.** An O(N²) insertion sort beats O(N log N) merge sort for
  N ≈ 16, which is why real sorts switch to it on small ranges.
- **Best vs worst case.** Linear search for k is O(1) if `a[0] === k` and O(N)
  if k is absent. Big-O quotes the **worst case** unless you say otherwise —
  always cost the worst case in an interview.

</details>

**Follow-ups:**
1. Q: What's the difference between O, Ω and Θ?
   <details><summary>Answer</summary>

   O is an upper bound, Ω a lower bound, Θ both (tight). In interviews "O"
   is used loosely to mean the tight bound of the worst case — fine, but know
   that saying merge sort is O(N²) is technically true and useless.

   </details>

### Q: N ≤ 10⁵. Which complexities pass in about one second? What about N ≤ 10⁹?
**Level:** foundation · **Tags:** coding, complexity, constraints, tle, scaler

<details><summary>Model answer</summary>

**The method.** Substitute N into each complexity and compare with ~10⁸.

| Complexity | N = 10⁵ | Passes? | N = 10⁹ | Passes? |
| --- | --- | --- | --- | --- |
| O(N²) | 10¹⁰ | ✗ TLE | 10¹⁸ | ✗ |
| O(N√N) | ~3·10⁷ | ✓ | — | ✗ |
| O(N log N) | ~1.7·10⁶ | ✓ | ~3·10¹⁰ | ✗ |
| O(N) | 10⁵ | ✓ | 10⁹ | ✗ (borderline at best) |
| O(√N) | ~316 | ✓ | ~3·10⁴ | ✓ |
| O(log N) | 17 | ✓ | 30 | ✓ |

**Read it backwards — the constraints tell you the intended solution:**

| N up to | Aim for |
| --- | --- |
| 10–12 | O(N!) — permutations |
| 20–25 | O(2ᴺ) — subsets, bitmasks |
| 100–500 | O(N³) |
| 10³–5·10³ | O(N²) |
| 10⁵–10⁶ | O(N log N) or O(N) |
| 10⁹–10¹⁸ | O(√N), O(log N) or O(1) — maths, binary search |

**Complexity.** This is a 30-second check that prevents writing a solution
that can't pass. Do it out loud before coding.

</details>

**Follow-ups:**
1. Q: N ≤ 10⁵ and Q ≤ 10⁵ queries, each over a range. What does that rule out?
   <details><summary>Answer</summary>

   O(N) per query — that's O(N·Q) = 10¹⁰. You need O(1) or O(log N) per query
   after preprocessing: prefix sums, a sparse table, or a segment tree.

   </details>

### Q: What is the space complexity of a function, and what counts?
**Level:** foundation · **Tags:** coding, complexity, space-complexity, scaler

<details><summary>Model answer</summary>

**Space complexity = the extra memory the algorithm allocates,** as a function
of input size. By convention **the input itself is not counted** (and usually
the output isn't either — say which convention you're using).

| Code | Extra space |
| --- | --- |
| A few scalar variables (`let max = a[0]`) | O(1) |
| `new Array(n)` | O(N) |
| `new Array(n)` of arrays of size n | O(N²) |
| A `Map` holding up to n keys | O(N) |
| Recursion n levels deep | O(N) — each frame is memory |
| Recursion that halves n | O(log N) |

`maxOfArray(a)`: time O(N), space O(1). Building a prefix-sum array: O(N).

**Time vs space.** When forced to trade, interviews and product teams usually
prefer the faster solution — memory is cheaper than a user waiting — unless a
constraint says otherwise (embedded device, 10⁹ items).

</details>

**Follow-ups:**
1. Q: Is an in-place sort O(1) space?
   <details><summary>Answer</summary>

   Heapsort, yes. Quicksort uses O(log N) stack on average (O(N) worst case).
   `Array.prototype.sort` in V8 is TimSort, which uses O(N) auxiliary space.
   "In place" and "O(1) space" aren't the same claim.

   </details>

### Q: Sum all elements when N ≤ 10⁵ and each a[i] ≤ 10⁹. What type do you use?
**Level:** foundation · **Tags:** coding, overflow, constraints, scaler

<details><summary>Model answer</summary>

**The check.** Worst-case sum = 10⁵ × 10⁹ = 10¹⁴.

- **Java / C++ `int`** (max ~2.1·10⁹): overflows — use `long` (max ~9.2·10¹⁸).
- **JS/TS `number`**: exact up to `Number.MAX_SAFE_INTEGER` = 2⁵³ − 1 ≈
  9·10¹⁵, so 10¹⁴ is fine.
- **A product** of two such values (10¹⁸) is *not* exact in a JS number —
  use `BigInt`, or reduce mod m with a BigInt multiply.

```ts
function sumArray(a: number[]): number {
  let s = 0;
  for (const x of a) s += x;          // ≤ 1e14 < 2^53: exact
  return s;
}
```

**Complexity.** O(N) time, O(1) space.

**The habit.** Before writing an accumulator, multiply the maximum count by
the maximum value and compare with your type's limit. Overflow bugs pass every
small test and fail the hidden big one.

</details>

**Follow-ups:**
1. Q: How do you detect that a JS number result is no longer exact?
   <details><summary>Answer</summary>

   `Number.isSafeInteger(x)`. Past 2⁵³, consecutive integers can't all be
   represented — `2 ** 53 + 1 === 2 ** 53` is `true`.

   </details>

---

### Number theory

### Q: Count the factors of N
**Level:** foundation · **Tags:** coding, math, factors, sqrt, scaler

<details><summary>Model answer</summary>

**Problem.** `N = 24` → 8 (1, 2, 3, 4, 6, 8, 12, 24). `N = 36` → 9.
N up to 10⁹.

**Brute force.** Test every `i` in 1..N: O(N) — 10⁹ iterations, ~10 seconds.

**The insight.** Factors come in **pairs** `(i, N / i)`, and the smaller of
each pair is ≤ √N. So loop `i` while `i * i <= N`; each divisor `i` accounts
for two factors — unless `i === N / i` (N is a perfect square), which is one.

```ts
function countFactors(n: number): number {
  let count = 0;
  for (let i = 1; i * i <= n; i++) {     // i*i <= n avoids sqrt() rounding
    if (n % i === 0) count += i === n / i ? 1 : 2;
  }
  return count;
}
```

**Complexity.** O(√N) time — ~3·10⁴ iterations for 10⁹. O(1) space.

**Test it.** 1 → 1. A prime → 2. 36 → 9 (6 counted once). 24 → 8.

</details>

**Follow-ups:**
1. Q: Count factors for every number up to 10⁶.
   <details><summary>Answer</summary>

   Sieve-style: for each `i`, add 1 to every multiple `i, 2i, 3i, …`. Total
   work N/1 + N/2 + … + N/N = O(N log N).

   </details>

### Q: Is N prime?
**Level:** foundation · **Tags:** coding, math, primes, sieve, scaler

<details><summary>Model answer</summary>

**Definition.** A prime has exactly two factors, 1 and itself. **1 is neither
prime nor composite** — the edge case to name.

**The insight.** If N has any factor other than 1 and N, it has one ≤ √N. So
test divisors 2..√N and stop at the first hit — faster than counting all
factors, which is the lecture's first version (`countFactors(n) === 2`).

```ts
function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) {   // odd divisors only
    if (n % i === 0) return false;
  }
  return true;
}
```

**Complexity.** O(√N) time, O(1) space.

</details>

**Follow-ups:**
1. Q: Q queries asking "is x prime?" with x ≤ 10⁶.
   <details><summary>Answer</summary>

   Sieve of Eratosthenes once: mark multiples of each prime starting from p²;
   O(N log log N) time, O(N) space; then each query is O(1).

   ```ts
   const sieve = (n: number) => {
     const prime = new Array<boolean>(n + 1).fill(true);
     prime[0] = prime[1] = false;
     for (let p = 2; p * p <= n; p++)
       if (prime[p]) for (let m = p * p; m <= n; m += p) prime[m] = false;
     return prime;
   };
   ```

   </details>

### Q: Integer square root — floor(√N) without Math.sqrt
**Level:** foundation · **Tags:** coding, math, sqrt, binary-search, scaler

<details><summary>Model answer</summary>

**Problem.** `25` → 5, `49` → 7, `30` → 5 (floor), `60` → 7.

**Linear.** The answer is the last `i` with `i * i <= N`: O(√N).

**The insight.** `i * i <= N` is monotonic in i — true, true, …, true, false,
false. That's exactly the shape binary search on the answer finds in
O(log N).

```ts
function isqrtLinear(n: number): number {
  let i = 1;
  while ((i + 1) * (i + 1) <= n) i++;
  return n === 0 ? 0 : i;
}

function isqrt(n: number): number {
  let lo = 0, hi = n, ans = 0;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (mid * mid <= n) { ans = mid; lo = mid + 1; }   // mid works; try bigger
    else hi = mid - 1;
  }
  return ans;
}
```

**Complexity.** Linear O(√N); binary search O(log N). O(1) space.

**Test it.** 0 → 0. 1 → 1. 2 → 1. A perfect square → exact root.
For N near 10¹⁸, `mid * mid` loses precision in JS — use BigInt or bound
`hi` by `min(n, 3e9)`.

</details>

**Follow-ups:**
1. Q: "Given a perfect square N, return √N, else −1."
   <details><summary>Answer</summary>

   Compute `r = isqrt(n)` and return `r * r === n ? r : -1`.

   </details>

### Q: Sums and counts you should do in your head — 1..N, [a, b], and "how many halvings"
**Level:** foundation · **Tags:** coding, math, series, log, scaler

<details><summary>Model answer</summary>

| Question | Answer | Why |
| --- | --- | --- |
| Sum of 1..N | N(N + 1)/2 | Gauss: pair 1 with N, 2 with N−1 — N/2 pairs of N+1 |
| Sum of 0..N−1 (whole numbers below N) | N(N − 1)/2 | Same, shifted |
| How many integers in [a, b] | b − a + 1 | Both ends included; the "+1" is the classic off-by-one |
| How many times can N be halved before reaching 1 | ⌊log₂N⌋ | N/2ᵏ ≥ 1 ⇔ k ≤ log₂N |
| log₂(1024) | 10 | 2¹⁰ = 1024 ≈ 10³ — so log₂(10⁹) ≈ 30 |

**log rules worth knowing.** `log(ab) = log a + log b`,
`log(aᵇ) = b·log a`, `log_b(a) = log a / log b`.

```ts
const sumToN = (n: number) => (n * (n + 1)) / 2;
const countInRange = (a: number, b: number) => b - a + 1;
function halvings(n: number): number {
  let k = 0;
  while (n > 1) { n = Math.floor(n / 2); k++; }
  return k;
}
```

**Complexity.** The formulas are O(1); `halvings` is O(log N).

</details>

**Follow-ups:**
1. Q: Sum of the first N odd numbers?
   <details><summary>Answer</summary>

   N². An AP with a = 1, d = 2: `N/2 · (2 + 2(N − 1)) = N²`.

   </details>

---

### Modular arithmetic

`a % m` is the remainder: `a = m·q + r` with `0 ≤ r < m` — mathematically.
**JS, Java and C++ return a negative remainder for a negative `a`**
(`-7 % 3 === -1`); Python returns 2. Normalise with `((a % m) + m) % m`.

**Why 10⁹ + 7?** It's prime (so modular inverses exist), fits in int32, and
two values below it multiply to below 2⁶³ — safe in a 64-bit long.

**The rules** (m > 0):

| Rule | |
| --- | --- |
| `(a + b) % m = ((a % m) + (b % m)) % m` | Reduce as you add |
| `(a − b) % m = ((a % m) − (b % m) + m) % m` | The `+ m` keeps it non-negative |
| `(a · b) % m = ((a % m) · (b % m)) % m` | Reduce as you multiply |
| `(a / b) % m` ≠ `(a % m) / (b % m)` | Division needs the modular inverse — Fermat: `b^(m−2) mod m` for prime m |

"When in doubt, take the mod" — after every addition and multiplication.

### Q: N! mod 10⁹ + 7
**Level:** foundation · **Tags:** coding, math, modular-arithmetic, factorial, scaler

<details><summary>Model answer</summary>

**Problem.** N ≤ 10⁵. 20! already has 19 digits; 10⁵! has ~456,000. Return
it modulo `M = 10⁹ + 7`.

**The insight.** `N! mod M = ((N − 1)! mod M) · N mod M` — reduce after every
multiply. In JS the product `acc * i` is below `(10⁹ + 7) · 10⁵ ≈ 10¹⁴`, which
is exact; but if both factors could approach M, the product (~10¹⁸) is not —
then multiply in `BigInt`.

```ts
const MOD = 1_000_000_007;

function factorialMod(n: number): number {
  let acc = 1;
  for (let i = 2; i <= n; i++) acc = (acc * i) % MOD;   // acc < MOD, i ≤ 1e5 → < 2^53
  return acc;
}

// Safe for any two operands below MOD:
const mulMod = (a: number, b: number) => Number((BigInt(a) * BigInt(b)) % BigInt(MOD));
```

**Complexity.** O(N) time, O(1) space.

</details>

**Follow-ups:**
1. Q: Answer nCr mod p for many queries.
   <details><summary>Answer</summary>

   Precompute `fact[i]` and `invFact[i]` mod p (invFact via Fermat:
   `fact[n]^(p−2)`, then walk down `invFact[i−1] = invFact[i]·i`). Then
   `nCr = fact[n]·invFact[r]·invFact[n−r] mod p`, O(1) per query.

   </details>

### Q: An array of digits represents a huge number. Compute it modulo P
**Level:** intermediate · **Tags:** coding, math, modular-arithmetic, horner, scaler

<details><summary>Model answer</summary>

**Problem.** `[1, 8, 2, 3, 4, 3]` is the number 182343. N ≤ 10⁵ digits, so
the number itself can't be stored. `P = 11` → `182343 mod 11 = 7`.

**The insight.** Build the number left to right, Horner-style:
`num = num × 10 + digit`. Taking the mod at each step keeps `num < P`, and the
mod rules guarantee the final remainder is the same.

```ts
function digitsMod(digits: number[], p: number): number {
  let r = 0;
  for (const d of digits) r = (r * 10 + d) % p;   // r < p, so r*10+d stays small
  return r;
}
```

The lecture's right-to-left version keeps a running power
`mult = 10ⁱ mod p` and adds `digit · mult` — same result, one more variable.

**Complexity.** O(N) time, O(1) space.

**Test it.** `[0]` → 0. `[1, 0]` with p = 3 → 1. A single digit ≥ p →
digit mod p.

</details>

**Follow-ups:**
1. Q: The number is given as a string. Is it divisible by 3? By 4? By 9?
   <details><summary>Answer</summary>

   **3 and 9:** because `10 ≡ 1 (mod 3)` and `(mod 9)`, a number is congruent
   to its digit sum — divisible iff the digit sum is. **4:** because 100 is
   divisible by 4, only the last two digits matter — check that two-digit
   number. (And 8 → last three digits; 5 and 10 → last digit.) All O(N) or
   O(1) and none needs big integers.

   </details>

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

---

## Exercises

The maths that turns up inside other problems. Watch the constraints: several of
these have inputs up to 10⁹–10¹², where O(N) is already too slow. Problems
marked **core** are the must-solve set.

### Exercise: Count the factors of N
**Level:** foundation · **Topic:** factor pairs up to √N · **Hint:** Factors come in pairs (i, N / i); the smaller one is at most √N.
**Function:** `countFactors(n: number): number`
**Core:** true · **Source:** scaler

Return the number of positive factors of `n` (1 ≤ n ≤ 10¹²). `24` → `8`; `36` → `9`.

```tests
[{"args": [24], "expected": 8},
 {"args": [36], "expected": 9},
 {"args": [1], "expected": 1},
 {"args": [13], "expected": 2},
 {"args": [1000000007], "expected": 2},
 {"args": [1000000000000], "expected": 169, "label": "n = 10\u00b9\u00b2 \u2014 O(N) won't finish"}]
```

<details><summary>Solution</summary>

```ts
function countFactors(n: number): number {
  let count = 0;
  for (let i = 1; i * i <= n; i++) if (n % i === 0) count += i * i === n ? 1 : 2;
  return count;
}
```
</details>

### Exercise: Is N prime?
**Level:** foundation · **Topic:** trial division up to √N · **Hint:** Any factor other than 1 and N has a partner ≤ √N.
**Function:** `isPrime(n: number): boolean`
**Core:** true · **Source:** scaler

Return whether `n` is prime (1 ≤ n ≤ 10¹²). 1 is not prime.

```tests
[{"args": [1], "expected": false},
 {"args": [2], "expected": true},
 {"args": [9], "expected": false},
 {"args": [97], "expected": true},
 {"args": [1000000007], "expected": true},
 {"args": [999999999989], "expected": true, "label": "n \u2248 10\u00b9\u00b2"}]
```

<details><summary>Solution</summary>

```ts
function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}
```
</details>

### Exercise: Count primes below N (sieve)
**Level:** intermediate · **Topic:** sieve of Eratosthenes · **Hint:** Cross out multiples of each prime, starting from p².
**Function:** `countPrimes(n: number): number`
**Source:** scaler

Return how many primes are strictly less than `n` (n ≤ 5·10⁶). `10` → `4`.

```tests
[{"args": [10], "expected": 4},
 {"args": [0], "expected": 0},
 {"args": [2], "expected": 0},
 {"args": [3], "expected": 1},
 {"args": [100], "expected": 25},
 {"args": [5000000], "expected": 348513, "label": "n = 5,000,000"}]
```

<details><summary>Solution</summary>

```ts
function countPrimes(n: number): number {
  if (n < 3) return 0;
  const composite = new Uint8Array(n);
  let count = 0;
  for (let p = 2; p < n; p++) {
    if (composite[p]) continue;
    count++;
    for (let m = p * p; m < n; m += p) composite[m] = 1;
  }
  return count;
}
```
</details>

### Exercise: Integer square root
**Level:** foundation · **Topic:** binary search on the answer · **Hint:** i·i ≤ N is true, true, …, false — find the last true.
**Function:** `isqrt(n: number): number`
**Core:** true · **Source:** scaler

Return ⌊√n⌋ without `Math.sqrt`, for 0 ≤ n ≤ 10¹⁵. `30` → `5`.

```tests
[{"args": [25], "expected": 5},
 {"args": [30], "expected": 5},
 {"args": [0], "expected": 0},
 {"args": [1], "expected": 1},
 {"args": [2], "expected": 1},
 {"args": [1000000000000000], "expected": 31622776, "label": "n = 10\u00b9\u2075"}]
```

<details><summary>Solution</summary>

```ts
function isqrt(n: number): number {
  let lo = 0, hi = Math.min(n, 1e8), ans = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (mid * mid <= n) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
```
</details>

### Exercise: N! mod 10⁹ + 7
**Level:** foundation · **Topic:** reduce after every multiplication · **Hint:** (a · b) mod m = ((a mod m) · (b mod m)) mod m.
**Function:** `factorialMod(n: number): number`
**Core:** true · **Source:** scaler

Return n! mod 1,000,000,007 for 0 ≤ n ≤ 10⁶. `5` → `120`.

```tests
[{"args": [5], "expected": 120},
 {"args": [0], "expected": 1},
 {"args": [20], "expected": 146326063},
 {"args": [1000000], "expected": 641102369, "label": "n = 1,000,000"}]
```

<details><summary>Solution</summary>

```ts
function factorialMod(n: number): number {
  const MOD = 1_000_000_007;
  let acc = 1;
  for (let i = 2; i <= n; i++) acc = (acc * i) % MOD;   // acc < 1e9+7, i ≤ 1e6: product < 2^53
  return acc;
}
```
</details>

### Exercise: A huge number mod p
**Level:** intermediate · **Topic:** Horner's rule with the modulus · **Hint:** Build the number digit by digit, reducing at every step.
**Function:** `digitsMod(digits: number[], p: number): number`
**Source:** scaler

`digits` (up to 10⁵ of them) spell a number, most significant first. Return that number mod `p` (p ≤ 10⁹).
`[1, 8, 2, 3, 4, 3], 11` → `7`.

```tests
[{"args": [[1, 8, 2, 3, 4, 3], 11], "expected": 7},
 {"args": [[1, 8, 2, 3, 4, 3], 7], "expected": 0},
 {"args": [[0], 5], "expected": 0},
 {"args": [[1, 0], 3], "expected": 1},
 {"args": [[9, 9, 9], 1000], "expected": 999},
 {"gen": "[Array.from({length: 100000}, (_, i) => i % 10), 1000000007]", "perf": true, "label": "100,000 digits"}]
```

<details><summary>Solution</summary>

```ts
function digitsMod(digits: number[], p: number): number {
  let r = 0;
  for (const d of digits) r = (r * 10 + d) % p;
  return r;
}
```
</details>

### Exercise: Divisible by 3, 4 or 9?
**Level:** foundation · **Topic:** divisibility rules · **Hint:** 3 and 9: the digit sum. 4: only the last two digits matter.
**Function:** `divisibleBy(s: string, d: number): boolean`
**Source:** scaler

`s` is a non-negative integer with up to 10⁵ digits; `d` is 3, 4 or 9. Return whether `s` is divisible by `d`.

```tests
[{"args": ["285", 3], "expected": true},
 {"args": ["2853", 4], "expected": false},
 {"args": ["2856", 4], "expected": true},
 {"args": ["123456789", 9], "expected": true},
 {"args": ["10", 3], "expected": false},
 {"args": ["0", 9], "expected": true},
 {"args": ["4", 4], "expected": true}]
```

<details><summary>Solution</summary>

```ts
function divisibleBy(s: string, d: number): boolean {
  if (d === 4) return Number(s.slice(-2)) % 4 === 0;
  let sum = 0;
  for (const ch of s) sum += ch.charCodeAt(0) - 48;
  return sum % d === 0;
}
```
</details>

---

### Exercise: GCD of two numbers
**Level:** foundation · **Topic:** Euclidean algorithm · **Hint:** gcd(a, b) = gcd(b, a mod b) — the pair shrinks fast.
**Function:** `gcd(a: number, b: number): number`
**Core:** true · **Source:** scaler

`gcd(0, x) = x`, and `a mod b` is always smaller than `b`, so the pair reaches `(g, 0)` in O(log(min(a, b))) steps — far faster than counting down from `min(a, b)`.
`gcd(48, 18) = 6`.

```tests
[{"args": [48, 18], "expected": 6},
 {"args": [7, 13], "expected": 1},
 {"args": [0, 5], "expected": 5},
 {"args": [100, 75], "expected": 25},
 {"args": [17, 17], "expected": 17},
 {"gen": "[999999937, 999999999]", "perf": true, "label": "two large near-coprime numbers"}]
```

<details><summary>Solution</summary>

```ts
function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}
```
</details>

---

### Exercise: GCD of the array after removing one element
**Level:** intermediate · **Topic:** prefix/suffix gcd · **Hint:** For each index, the best you can do without it is gcd(everything before it, everything after it).
**Function:** `maxGcdAfterRemoveOne(a: number[]): number`
**Core:** true · **Source:** scaler

You must remove exactly one element, then take the GCD of what's left. Return the largest GCD achievable. `a.length ≥ 2`.
`[24, 16, 18, 30, 15]` → `3` (remove `16`: `gcd(24, 18, 30, 15) = 3`, better than `gcd` of the whole array, which is `1`).
Build prefix-GCD and suffix-GCD arrays once, then for each index combine the GCD to its left with the GCD to its right — O(N), not O(N²) re-scanning the array per candidate removal.

```tests
[{"args": [[24, 16, 18, 30, 15]], "expected": 3},
 {"args": [[2, 4, 8, 3]], "expected": 2},
 {"args": [[5, 5, 5]], "expected": 5},
 {"args": [[7, 11]], "expected": 11},
 {"args": [[6, 12, 18, 9]], "expected": 6},
 {"gen": "[Array.from({length: 100000}, (_, i) => 2 * (i + 1))]", "perf": true, "label": "N = 100,000"}]
```

<details><summary>Solution</summary>

```ts
function maxGcdAfterRemoveOne(a: number[]): number {
  const gcdOf = (x: number, y: number): number => {
    while (y) { [x, y] = [y, x % y]; }
    return x;
  };
  const n = a.length;
  const prefix = new Array<number>(n);
  const suffix = new Array<number>(n);
  prefix[0] = a[0];
  for (let i = 1; i < n; i++) prefix[i] = gcdOf(prefix[i - 1], a[i]);
  suffix[n - 1] = a[n - 1];
  for (let i = n - 2; i >= 0; i--) suffix[i] = gcdOf(suffix[i + 1], a[i]);

  let best = 0;
  for (let i = 0; i < n; i++) {
    const left = i > 0 ? prefix[i - 1] : 0;
    const right = i < n - 1 ? suffix[i + 1] : 0;
    best = Math.max(best, gcdOf(left, right));
  }
  return best;
}
```
</details>

---

### Exercise: Modular inverse
**Level:** intermediate · **Topic:** Fermat's little theorem · **Hint:** When m is prime, a⁻¹ mod m = a^(m−2) mod m — one fast-power call.
**Function:** `modInverse(a: number, m: number): number`
**Core:** true · **Source:** scaler

`m` is prime. Return `b` in `[0, m − 1]` such that `(a × b) mod m = 1` — the value that makes division work under a modulus, since `(a / b) mod m` is never `(a mod m) / (b mod m)` directly. By Fermat's little theorem, `a^(m−1) mod m = 1` when `m` is prime, so `a^(m−2)` is exactly that inverse; compute it with fast exponentiation, not a loop trying every candidate.
`modInverse(12, 5) = 3`, since `12 × 3 = 36 ≡ 1 (mod 5)`.

```tests
[{"args": [12, 5], "expected": 3},
 {"args": [3, 11], "expected": 4},
 {"args": [1, 7], "expected": 1},
 {"args": [2, 1000000007], "expected": 500000004},
 {"args": [5, 13], "expected": 8}]
```

<details><summary>Solution</summary>

```ts
function modInverse(a: number, m: number): number {
  const powmod = (base: bigint, exp: bigint, mod: bigint): bigint => {
    base %= mod;
    let result = 1n;
    while (exp > 0n) {
      if (exp & 1n) result = (result * base) % mod;
      base = (base * base) % mod;
      exp >>= 1n;
    }
    return result;
  };
  // bigint, not number: intermediate squares can exceed Number.MAX_SAFE_INTEGER
  // once m is around 10⁹.
  return Number(powmod(BigInt(a), BigInt(m - 2), BigInt(m)));
}
```
</details>

---

### Exercise: nCr mod p
**Level:** senior · **Topic:** factorials + modular inverse · **Hint:** nCr = n! / (r! × (n−r)!) — turn the division into a multiplication by the modular inverse.
**Function:** `nCrModP(n: number, r: number, p: number): number`
**Core:** true · **Source:** scaler

`p` is prime and larger than `n`. Precompute `i! mod p` for `i` from `0` to `n` once (O(n)), then answer as `n! × inverse(r!) × inverse((n−r)!) mod p` — the naive `n! / (r! × (n−r)!)` doesn't work under a modulus, division isn't defined the same way, which is exactly why the modular-inverse exercise above exists.
`nCrModP(5, 2, 10⁹+7) = 10`.

```tests
[{"args": [5, 2, 1000000007], "expected": 10},
 {"args": [10, 3, 1000000007], "expected": 120},
 {"args": [0, 0, 1000000007], "expected": 1},
 {"args": [5, 10, 1000000007], "expected": 0},
 {"args": [5, 0, 1000000007], "expected": 1},
 {"gen": "[1000, 500, 1000000007]", "perf": true, "label": "n = 1,000"}]
```

<details><summary>Solution</summary>

```ts
function nCrModP(n: number, r: number, p: number): number {
  if (r < 0 || r > n) return 0;
  const P = BigInt(p);
  const powmod = (base: bigint, exp: bigint): bigint => {
    base %= P;
    let result = 1n;
    while (exp > 0n) {
      if (exp & 1n) result = (result * base) % P;
      base = (base * base) % P;
      exp >>= 1n;
    }
    return result;
  };
  const fact: bigint[] = [1n];
  for (let i = 1; i <= n; i++) fact.push((fact[i - 1] * BigInt(i)) % P);
  const denom = (fact[r] * fact[n - r]) % P;
  const invDenom = powmod(denom, P - 2n);
  return Number((fact[n] * invDenom) % P);
}
```
</details>

---

## In brief

- **Budget ~10⁸ simple operations per second.** Plug N into your complexity before coding: N ≤ 10⁵ rules out O(N²).
- **Count iterations, then drop constants and lower-order terms.** Halving a range is log N; a loop to √N is √N; a doubling inner loop sums to ~2N.
- **Space complexity is the extra memory** — not the input. Recursion depth counts.
- **Factors pair up around √N**, so counting factors and testing primality are O(√N); many queries → a sieve.
- **Take the mod after every + and ×.** 10⁹ + 7 is prime and keeps products under 2⁶³ — but in JS, products past 2⁵³ need `BigInt`.
- **Read the constraints backwards:** n ≤ 20 invites 2ⁿ, n ≤ 10⁵ wants O(n log n), n ≤ 10¹² means maths or binary search.

## Quiz

### MCQ: How many times does `for (let i = 1; i < n; i *= 2)` run?
- [ ] n
- [ ] n / 2
- [x] about log₂ n
- [ ] √n
**Why:** i doubles each step, so it reaches n after log₂ n steps.

### MCQ: `for i in 0..n-1: for j in 0..i` runs how many times in total?
- [ ] n
- [ ] n log n
- [x] n(n+1)/2 ≈ O(n²)
- [ ] 2n
**Why:** The inner loop runs 1, 2, …, n times — an arithmetic series summing to n(n+1)/2.

### MCQ: `for (i = 1; i <= n; i *= 2) for (j = 0; j < i; j++)` is…
- [ ] O(n log n)
- [x] O(n)
- [ ] O(log n)
- [ ] O(n²)
**Why:** Inner work is 1 + 2 + 4 + … + n, a geometric series under 2n. Multiplying loop counts only works when the inner count doesn't depend on the outer variable.

### MCQ: With N ≤ 10⁵ and a ~1 s limit, which complexity will NOT pass?
- [ ] O(N log N)
- [ ] O(N √N)
- [x] O(N²)
- [ ] O(N)
**Why:** N² = 10¹⁰ operations — about 100× over a 10⁸/s budget.

### MCQ: Constraints say n ≤ 20. What does that usually signal?
- [ ] An O(n³) DP
- [x] Enumerating all 2ⁿ subsets is intended
- [ ] A greedy algorithm
- [ ] O(log n) search
**Why:** 2²⁰ ≈ 10⁶ — exhaustive subset or bitmask enumeration fits comfortably.

### MCQ: Why do we drop lower-order terms in Big-O?
- [ ] They're always zero
- [x] Their share of the total vanishes as n grows
- [ ] The compiler removes them
- [ ] They only matter in space complexity
**Why:** For n² + 10n, the 10n term is half the total at n = 10 but 0.1% at n = 10⁴.

### MCQ: What does space complexity usually NOT count?
- [ ] A hash map you build
- [ ] The recursion stack
- [x] The input itself
- [ ] A prefix-sum array
**Why:** By convention it measures the extra memory the algorithm allocates; say which convention you use.

### MCQ: To count the factors of N ≤ 10¹², the right bound for the loop is…
- [ ] i ≤ N
- [ ] i ≤ N / 2
- [x] i · i ≤ N
- [ ] i ≤ log N
**Why:** Factors pair as (i, N / i) with the smaller ≤ √N; i·i ≤ N also avoids floating-point sqrt.

### MCQ: In JavaScript, `-7 % 3` evaluates to…
- [ ] 2
- [x] -1
- [ ] 1
- [ ] -2
**Why:** JS `%` takes the dividend's sign; normalise with ((a % m) + m) % m.

### MCQ: Why is `(a * b) % MOD` unsafe in JS when a and b are both near 10⁹?
- [ ] % is slow
- [x] The product exceeds 2⁵³ and loses precision before the %
- [ ] MOD isn't prime
- [ ] JS has no integer type for %
**Why:** 10¹⁸ can't be represented exactly in a double; multiply in BigInt or split the multiplication.

### MCQ: A string of 10⁵ digits — how do you test divisibility by 9?
- [ ] Convert to Number and use %
- [ ] Check the last two digits
- [x] Sum the digits and test the sum
- [ ] It can't be done without BigInt
**Why:** 10 ≡ 1 (mod 9), so a number is congruent to its digit sum mod 9 (and mod 3).
