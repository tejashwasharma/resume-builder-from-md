# Binary search and bit tricks — halving the problem, and the tricks below the integers

Binary search is the one algorithm everyone claims to know and most people
get wrong under pressure. The off-by-one on `hi`, the infinite loop on `lo =
mid`, the wrong answer on a rotated array — those cost more rounds than any
hard algorithm does, because the interviewer knows you *should* have it cold.

*In the Google round: binary search appears as "sorted but rotated", "find
the boundary", or — the real test — "binary search on the answer" where
nothing in the input is sorted at all; bit problems are short warm-ups whose
follow-ups probe whether you understand two's complement and masks rather
than having memorised `n & (n - 1)`.*

The bigger idea is that binary search is not about sorted arrays. It's about
any **monotonic predicate**: if `f(x)` is false…false…true…true over some
range, you can find the boundary in O(log range) evaluations. Sorted arrays
are the special case where `f(i) = a[i] >= target`.

---

## The costs

| Technique | Time | Space | Answers |
| --- | --- | --- | --- |
| Binary search, sorted array | **O(log n)** | O(1) | Is it there? Where's the boundary? |
| Binary search on the answer | **O(log(range) · check)** | O(1) | Smallest x that satisfies a monotonic condition |
| Rotated-array search | O(log n) | O(1) | Same, when the sort has a pivot |
| Median of two sorted arrays | **O(log min(m, n))** | O(1) | Partition search |
| Bit tricks (`&`, `|`, `^`, shifts) | **O(1)** per op | O(1) | Parity, powers of two, sets as masks |
| Counting bits for 0..n | O(n) | O(n) | DP over bit structure |

**O(log n) is a small number.** For n = 10⁹ it's 30 steps. If your solution
to a "find x" problem is O(n) and the input is sorted or the predicate is
monotonic, you've missed the point.

---

## How it actually works

```mermaid
flowchart TD
  Q{"Is there a monotonic<br/>predicate over a range?"}
  Q -->|"Yes, over array<br/>indices"| A["Classic binary search<br/>on the array"]
  Q -->|"Yes, over the<br/>answer's value"| B["Binary search<br/>on the answer"]
  Q -->|"Sorted, but<br/>rotated"| R["Find which half is<br/>sorted, then decide"]
  Q -->|"Two sorted arrays,<br/>need the kth"| P["Partition search on<br/>the shorter one"]
  Q -->|"No monotonicity"| N["Not binary search —<br/>hashing, two pointers, DP"]
```
*Binary search is a decision about a predicate, not a data structure. Find the monotonic yes/no question first; the array, if any, comes second.*

### Who's who

| Term | Meaning |
| --- | --- |
| **Monotonic predicate** | A yes/no function that flips at most once across the range — `F F F T T T` |
| **Boundary** | The first index where it flips. Almost every binary search is "find the boundary" |
| **`lo`, `hi`** | The search interval. Decide up front whether `hi` is inclusive — and never change your mind mid-function |
| **`mid`** | `lo + ((hi - lo) >> 1)`. The overflow-safe form; say why even in JS |
| **Rotated array** | Sorted, then cut and swapped: `[4,5,6,7,0,1,2]`. One half is always sorted |
| **Binary search on the answer** | The answer is a number; checking a candidate is cheap; larger candidates make the check easier — so search over candidates |
| **Two's complement** | How negative integers are stored: `-x = ~x + 1`. Why `x & -x` isolates the lowest set bit |
| **Mask** | An integer used as a set of booleans. Bit `i` set ⇔ element `i` present |

### The one template to memorise

Learn one shape and derive every variant from it. This one finds the **first
index where a predicate is true** over `[lo, hi)` — a half-open interval. It
cannot infinite-loop and it handles "not found" cleanly (returns `hi`).

```js
// First index i in [lo, hi) such that pred(i) is true; returns hi if none.
// Invariant: pred is false for everything before lo, true for everything at/after hi.
function lowerBound(lo, hi, pred) {
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (pred(mid)) hi = mid;        // mid might be the answer; keep it in range
    else lo = mid + 1;              // mid is definitely not; exclude it
  }
  return lo;
}
```

Every problem below is this function with a different `pred`. "Find target"
is `pred(i) = a[i] >= target` then check `a[lo] === target`. "Last true" is
"first false minus one". "Smallest speed that works" is `pred(speed) =
canFinish(speed)`.

**Why half-open?** Because `hi = mid` and `lo = mid + 1` are the only two
moves, they're asymmetric by design, and the interval always shrinks. The
closed-interval version needs `hi = mid - 1` and a `<=` loop condition and
that's where the off-by-ones live.

---

## The techniques, in the order you should learn them

### 1. Classic search, then boundaries

Find-the-target is the warm-up. The real skill is boundaries: first
occurrence, last occurrence, first element ≥ x, insertion point. All are
`lowerBound` with the right predicate.

### 2. Rotated sorted array

At any `mid`, at least one of `[lo, mid]` and `[mid, hi]` is sorted. Check
which (compare `a[lo]` with `a[mid]`), see whether the target lies inside the
sorted half, and discard the other half. Still O(log n), one extra comparison
per step.

### 3. Binary search on the answer

The input isn't sorted; the *answer space* is. "Minimum speed to finish in
time", "minimum capacity to ship in d days", "smallest largest-subarray-sum
with k splits". If a feasibility check is O(n) and feasibility is monotonic
in the candidate, search candidates: O(n log range).

### 4. Partition search

Median of two sorted arrays. You're not searching for a value — you're
searching for a *cut position* in the shorter array such that everything
left of both cuts is ≤ everything right. O(log min(m, n)).

### 5. Bits

Ten tricks, all O(1), all built on two's complement:

| Trick | Does | Why |
| --- | --- | --- |
| `n & (n - 1)` | Clears the lowest set bit | Subtracting 1 flips the lowest set bit and everything below it |
| `n & -n` | Isolates the lowest set bit | `-n = ~n + 1`; only the lowest set bit survives the `&` |
| `n & (n - 1) === 0` | Power of two (for n > 0) | Exactly one bit set |
| `x ^ y ^ y === x` | XOR cancels | Finding the single non-duplicated number |
| `n >> k`, `n << k` | Divide / multiply by 2ᵏ | Shifts; beware 32-bit in JS |
| `(n >> i) & 1` | Read bit i | |
| `n \| (1 << i)` | Set bit i | |
| `n & ~(1 << i)` | Clear bit i | |
| `mask` over `2^k` values | Enumerate subsets | `for (let m = 0; m < 1 << k; m++)` |
| `popcount` | Count set bits | Loop with `n &= n - 1`, one iteration per set bit |

**JS caveat, say it out loud:** bitwise operators work on **32-bit signed
integers**. `1 << 31` is negative; `1 << 32` is `1`. For anything beyond 31
bits use `BigInt` or `Math.floor(n / 2)` arithmetic. Interviewers who know JS
will ask.

---

## The bugs that actually cost you the round

| Bug | Fix |
| --- | --- |
| **`lo = mid` in a loop** | Infinite loop when `hi - lo === 1`. Use `lo = mid + 1`, or bias `mid` upward |
| **Mixing inclusive and exclusive `hi`** | Pick half-open `[lo, hi)` and never write `hi = mid - 1` |
| **`(lo + hi) / 2` without floor** | Fractional index. `lo + ((hi - lo) >> 1)` |
| **Checking `a[mid] === target` and returning early** in a boundary search | Returns *an* occurrence, not the first |
| **Rotated array with duplicates** | `a[lo] === a[mid]` tells you nothing about which half is sorted; shrink `lo++` and accept O(n) worst case |
| **Non-monotonic predicate** | Binary search silently returns garbage. Prove monotonicity before searching |
| **Search range too narrow on "answer" problems** | `hi` must be a value that definitely works — often `max(a)` or `sum(a)`, not `n` |
| **32-bit bit ops on large numbers** | `1 << 31` is negative in JS |
| **`n & (n - 1)` on `n = 0`** | Returns 0, which looks like "power of two". Guard `n > 0` |

---

## Practice ladder

| # | Problem | What it teaches |
| --- | --- | --- |
| 1 | Binary search (find target) | The template, half-open |
| 2 | First and last position of target | Boundaries via two predicates |
| 3 | Search insert position | `lowerBound` directly |
| 4 | Find minimum in rotated sorted array | Which half is sorted |
| 5 | Search in rotated sorted array | Same, plus the target check |
| 6 | Koko eating bananas | Binary search on the answer |
| 7 | Capacity to ship packages in D days | Same pattern, different feasibility check |
| 8 | Split array largest sum | Same pattern; the check is a greedy count |
| 9 | Median of two sorted arrays | Partition search |
| 10 | Single number / single number II | XOR; then per-bit counting mod 3 |
| 11 | Counting bits | DP: `bits[i] = bits[i >> 1] + (i & 1)` |
| 12 | Power of two, hamming distance, reverse bits | The trick table |

**Exit test:** you can write `lowerBound` from memory without an off-by-one,
explain in one sentence why a rotated array still admits binary search, and
turn "minimum X such that Y" into a predicate and a range within a minute.

---

## Data structures

Nothing beyond the array — that's the point of the pattern. The structure is
the *invariant*, not a container.

| Need | Use | Note |
| --- | --- | --- |
| The search space | Two integers `lo`, `hi` | Half-open. Nothing else |
| Predicate | A closure | `(i) => a[i] >= target`; `(speed) => canFinish(speed)` |
| Bit sets up to 31 elements | A `number` as a mask | `1 << i` for element i |
| Bit sets beyond 31 | `BigInt`, or an `Array` of 32-bit words | Say which and why |
| Counting set bits | Loop with `n &= n - 1` | One iteration per set bit, not per bit position |

**Pseudocode — binary search on the answer, the skeleton for problems 6–8**

```js
// Smallest candidate in [lo, hi] for which feasible(candidate) is true.
// Requires: feasible is monotonic (false...false true...true) over the range,
// and hi is a candidate that is guaranteed feasible.
function minFeasible(lo, hi, feasible) {
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (feasible(mid)) hi = mid;      // works: maybe something smaller works too
    else lo = mid + 1;                // doesn't: everything at/below mid is out
  }
  return lo;
}
```

The whole art is choosing `lo`, `hi` and `feasible`. `lo` is the smallest
value that could possibly work (often 1 or `max(a)`), `hi` the value that
trivially works (often `sum(a)` or `max(a)`), and `feasible` is a greedy
O(n) pass.

---

## Worked problems

### Q: Search in rotated sorted array — find a target in a sorted array that was rotated at an unknown pivot
**Level:** intermediate · **Tags:** google-coding, binary-search, rotated-array

<details><summary>Model answer</summary>

**Problem.** `nums` was sorted ascending with distinct values, then rotated:
`[4,5,6,7,0,1,2]`. Return the index of `target` or -1, in O(log n). Example:
`target = 0 → 4`; `target = 3 → -1`.

**Clarify first.** Distinct values? (Yes — duplicates change the complexity;
follow-up.) Could the rotation be zero, i.e. the array is simply sorted?
(Yes; the algorithm must handle it.) Empty array → -1.

**Brute force.** Linear scan, O(n). Or find the pivot with one binary search
then binary search the correct half — two searches, O(log n), perfectly
acceptable; the single-pass version below is what most interviewers want to
see because it shows you understand the invariant.

**The insight.** Split at `mid`. Because the array is one sorted run cut in
two, **at least one of `[lo..mid]` and `[mid..hi]` is sorted** — you can tell
which by comparing `nums[lo]` with `nums[mid]`. If the target lies inside the
sorted half's range, search there; otherwise search the other half. Either
way you discard half the array.

**Algorithm.**
1. `lo = 0, hi = n - 1` (closed, because we compare against `nums[hi]`).
2. If `nums[mid] === target`, return `mid`.
3. If `nums[lo] <= nums[mid]`, the left half is sorted: if `nums[lo] <=
   target < nums[mid]` go left, else go right.
4. Otherwise the right half is sorted: if `nums[mid] < target <= nums[hi]`
   go right, else go left.

```js
function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {                        // left half sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {                                            // right half sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}
```

**Complexity.** O(log n) time, O(1) space.

**Test it.**
- `[4,5,6,7,0,1,2], 0` → mid=3 (7); left sorted; 0 not in [4,7) → right;
  lo=4, mid=5 (1); `nums[4]=0 <= 1` left sorted; 0 in [0,1) → hi=4; mid=4 → 0.
  Returns 4.
- `[4,5,6,7,0,1,2], 3` → -1.
- Not rotated `[1,2,3], 3` → 2.
- Single element `[1], 1` → 0; `[1], 0` → -1.
- Two elements `[3,1], 1` → mid=0 (3); `nums[0] <= nums[0]` left "sorted";
  1 not in [3,3) → lo=1; mid=1 → 1. Returns 1. The `<=` in the sorted check
  is what makes `lo === mid` work.

**What the interviewer is checking.** The "one half is always sorted"
invariant stated clearly, the `<=` versus `<` at each boundary, and that you
notice why closed intervals are used here (you compare against `nums[hi]`).

</details>

**Follow-ups:**

1. Q: The array may contain duplicates.
   <details><summary>Answer</summary>

   When `nums[lo] === nums[mid] === nums[hi]` you can't tell which half is
   sorted — `[1,1,1,2,1]` and `[1,2,1,1,1]` look identical at those three
   points. The fix is to shrink both ends by one (`lo++; hi--`) in that case
   and continue. Worst case degrades to O(n) (all duplicates), which is
   provably unavoidable; average stays O(log n). Say the degradation
   explicitly rather than hoping the interviewer doesn't ask.

   </details>

2. Q: Find the minimum element instead (equivalently, the rotation count).
   <details><summary>Answer</summary>

   Binary search where the predicate is `nums[mid] <= nums[hi]` — "is mid in
   the second sorted run?" That's monotonic (false for the first run, true for
   the second), so `lowerBound` over indices finds the first true, which is
   the minimum. O(log n); the rotation count is that index.

   ```js
   function findMin(nums) {
     let lo = 0, hi = nums.length - 1;
     while (lo < hi) {
       const mid = lo + ((hi - lo) >> 1);
       if (nums[mid] <= nums[hi]) hi = mid;   // min is at mid or left of it
       else lo = mid + 1;
     }
     return nums[lo];
   }
   ```

   </details>

### Q: Find first and last position — the range of indices where a target appears in a sorted array, in O(log n)
**Level:** intermediate · **Tags:** google-coding, binary-search, boundaries

<details><summary>Model answer</summary>

**Problem.** Sorted `nums` with duplicates; return `[first, last]` indices of
`target`, or `[-1, -1]`. Example: `[5,7,7,8,8,10], 8 → [3, 4]`; `6 → [-1,-1]`.

**Clarify first.** Ascending? (Yes.) Can the array be empty? (Return
`[-1,-1]`.) Do they want O(log n) *strictly* — i.e. is a linear expand-from-
mid acceptable? (No: with all-equal elements that's O(n). Two boundary
searches.)

**Brute force.** Binary search to any occurrence, then expand left and right.
O(n) worst case when the array is all `target`. It's the answer that looks
right and fails the "why is this O(log n)?" question.

**The insight.** "First position of target" is the first index where `a[i] >=
target`. "Last position" is one less than the first index where `a[i] >
target`. Both are `lowerBound` with a different predicate — two independent
O(log n) searches, and the same helper.

**Algorithm.**
1. `first = lowerBound(0, n, i => nums[i] >= target)`.
2. If `first === n` or `nums[first] !== target`, return `[-1,-1]`.
3. `last = lowerBound(0, n, i => nums[i] > target) - 1`.

```js
function searchRange(nums, target) {
  const n = nums.length;
  const first = lowerBound(0, n, i => nums[i] >= target);
  if (first === n || nums[first] !== target) return [-1, -1];
  const last = lowerBound(0, n, i => nums[i] > target) - 1;
  return [first, last];
}
```

**Complexity.** O(log n) time, O(1) space.

**Test it.**
- `[5,7,7,8,8,10], 8` → first: 3; last: first index > 8 is 5, minus 1 → 4.
- `6` → first index >= 6 is 1 (`7`), which isn't 6 → `[-1,-1]`.
- All equal `[2,2,2], 2` → `[0, 2]`.
- Target beyond the end `[1,2], 5` → first === n → `[-1,-1]`.

**What the interviewer is checking.** That you reduce both bounds to the same
primitive rather than writing two subtly different loops, and that you handle
`first === n` before indexing.

</details>

**Follow-ups:**

1. Q: Count occurrences of every distinct value in the array, in better than O(n) per query.
   <details><summary>Answer</summary>

   Each count is `upperBound - lowerBound`, O(log n) per query, so `q` queries
   cost O(q log n) with no preprocessing. If you'll query many times, a single
   O(n) pass into a `Map` of counts makes queries O(1) — say which you'd
   choose depends on the query-to-size ratio.

   </details>

2. Q: The array is sorted but you can only access it through a `get(i)` that's expensive and you don't know `n`.
   <details><summary>Answer</summary>

   Exponential (galloping) search first: probe `get(1), get(2), get(4), …`
   until the value exceeds the target or the accessor signals out-of-range;
   that finds a bound in O(log position) probes. Then binary search inside
   `[2ᵏ⁻¹, 2ᵏ]`. Total O(log p) where `p` is the answer's position — the
   "unbounded binary search" pattern.

   </details>

### Q: Koko eating bananas — the minimum eating speed to finish all piles within h hours
**Level:** intermediate · **Tags:** google-coding, binary-search, search-on-answer

<details><summary>Model answer</summary>

**Problem.** `piles[i]` bananas in pile `i`; Koko eats `k` bananas per hour
from one pile at a time (if a pile has fewer than `k`, the hour is spent
anyway). Find the minimum integer `k` such that all piles are finished in `h`
hours. Example: `[3,6,7,11], h = 8 → 4`.

**Clarify first.** `h >= piles.length`? (Must be, or it's impossible — each
pile takes at least an hour.) Integer speeds only? (Yes.) Pile sizes up to
10⁹? (Assume yes — rules out per-banana simulation.)

**Brute force.** Try `k = 1, 2, 3, …` until one works. Each check is O(n),
and `k` can be up to `max(piles)`, so O(n · max) — 10⁹ × n. Out.

**The insight.** Feasibility is monotonic in `k`: if speed `k` finishes in
time, any faster speed does too. So the answer space `[1, max(piles)]` is
`F…F T…T` and binary search over *speeds* finds the first `T` in O(log max)
checks, each an O(n) sum of `ceil(pile / k)`.

**Algorithm.**
1. `lo = 1`, `hi = max(piles)` (which always works).
2. `feasible(k) = sum(ceil(p / k)) <= h`.
3. `minFeasible(lo, hi, feasible)`.

```js
function minEatingSpeed(piles, h) {
  const feasible = k => {
    let hours = 0;
    for (const p of piles) hours += Math.ceil(p / k);
    return hours <= h;
  };
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (feasible(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
```

**Complexity.** O(n log M) where M = max pile. O(1) space.

**Test it.**
- `[3,6,7,11], h=8`: k=4 → 1+2+2+3 = 8 ✓; k=3 → 1+2+3+4 = 10 ✗. Answer 4.
- `[30,11,23,4,20], h=5` → must be `max` = 30 (one pile per hour).
- Single pile `[1000000000], h=2` → 500000000.
- `h` equal to number of piles → `max(piles)`; the search converges there.

**What the interviewer is checking.** That you articulate *why* the predicate
is monotonic, choose `hi = max` (not `sum`, which also works but wastes
iterations), and use `Math.ceil` rather than integer division plus a fix-up.

</details>

**Follow-ups:**

1. Q: Same pattern, different story: ship packages within D days with minimum capacity; split an array into k parts minimising the largest sum.
   <details><summary>Answer</summary>

   Identical skeleton. Ship-within-D: `lo = max(weights)`, `hi = sum(weights)`,
   feasible = greedy pass counting how many days a capacity needs. Split
   array: same `lo`/`hi`, feasible = greedy count of subarrays whose sum stays
   under the candidate, compare to `k`. Recognising that all three are one
   pattern is the senior signal; writing the greedy check correctly (reset the
   running sum *after* counting a new bucket) is the intermediate one.

   ```js
   function splitArray(nums, k) {
     const feasible = cap => {
       let parts = 1, run = 0;
       for (const x of nums) {
         if (run + x > cap) { parts++; run = x; } else run += x;
       }
       return parts <= k;
     };
     let lo = Math.max(...nums), hi = nums.reduce((s, x) => s + x, 0);
     while (lo < hi) {
       const mid = lo + ((hi - lo) >> 1);
       if (feasible(mid)) hi = mid; else lo = mid + 1;
     }
     return lo;
   }
   ```

   </details>

2. Q: Speeds can be real numbers and you need the answer to 6 decimal places.
   <details><summary>Answer</summary>

   Binary search on a real interval: loop a fixed number of iterations
   (~100, or until `hi - lo < 1e-7`) with `mid = (lo + hi) / 2` and `hi = mid`
   / `lo = mid` — no `+1`, since there's no integer step. Precision, not
   termination on equality, is the stopping rule.

   </details>

### Q: Median of two sorted arrays — in O(log(min(m, n)))
**Level:** senior · **Tags:** google-coding, binary-search, partition

<details><summary>Model answer</summary>

**Problem.** Two sorted arrays `A` (length m) and `B` (length n). Return the
median of the combined sorted sequence without merging. Example: `[1,3],
[2] → 2.0`; `[1,2], [3,4] → 2.5`.

**Clarify first.** Both non-empty, or can one be empty? (Either may be empty;
the combined length is ≥ 1.) Is O(m + n) acceptable? (The interviewer wants
log — say the merge is the baseline and move on.) Integers? (Assume numbers;
the median may be fractional.)

**Brute force.** Merge until you've passed half the elements: O(m + n) time,
O(1) space with two pointers. It's a good answer and you should say it in one
sentence before the real one.

**The insight.** The median splits the combined sequence into a left half and
a right half of known sizes. Choose a cut `i` in `A` (taking `A[0..i)` on the
left); the cut in `B` is then forced: `j = half - i`. The cut is correct when
`A[i-1] <= B[j]` and `B[j-1] <= A[i]` — every left element ≤ every right
element. If `A[i-1] > B[j]`, `i` is too big; if `B[j-1] > A[i]`, `i` is too
small. That's a monotonic condition on `i`, so binary search `i` over the
**shorter** array.

**Algorithm.**
1. Ensure `A` is the shorter array.
2. `half = floor((m + n + 1) / 2)` — the left side gets the extra element
   when the total is odd.
3. Binary search `i` in `[0, m]`; `j = half - i`.
4. Use `±Infinity` for out-of-range neighbours.
5. When the cut is valid: odd total → `max(leftA, leftB)`; even → average of
   `max(lefts)` and `min(rights)`.

```js
function findMedianSortedArrays(A, B) {
  if (A.length > B.length) [A, B] = [B, A];          // search the shorter one
  const m = A.length, n = B.length;
  const half = (m + n + 1) >> 1;
  let lo = 0, hi = m;
  while (lo <= hi) {
    const i = lo + ((hi - lo) >> 1);                 // elements of A on the left
    const j = half - i;                              // elements of B on the left
    const leftA  = i === 0 ? -Infinity : A[i - 1];
    const rightA = i === m ?  Infinity : A[i];
    const leftB  = j === 0 ? -Infinity : B[j - 1];
    const rightB = j === n ?  Infinity : B[j];
    if (leftA <= rightB && leftB <= rightA) {        // correct partition
      if ((m + n) % 2 === 1) return Math.max(leftA, leftB);
      return (Math.max(leftA, leftB) + Math.min(rightA, rightB)) / 2;
    }
    if (leftA > rightB) hi = i - 1;                  // too many from A on the left
    else lo = i + 1;                                 // too few
  }
  throw new Error('inputs not sorted');
}
```

**Complexity.** O(log min(m, n)) time, O(1) space.

**Test it.**
- `[1,3], [2]`: m=2, n=1, half=2. i=1, j=1: leftA=1, rightA=3, leftB=2,
  rightB=∞ → valid; odd → max(1,2) = 2. ✓
- `[1,2], [3,4]`: half=2. i=1, j=1: leftA=1, rightA=2, leftB=3, rightB=4 →
  `leftB(3) > rightA(2)` → lo=2. i=2, j=0: leftA=2, rightA=∞, leftB=-∞,
  rightB=3 → valid; even → (2 + 3)/2 = 2.5. ✓
- `[], [1]` → m=0, i=0, j=1: leftB=1 → odd → 1.
- `[1,1], [1,1]` → 1.

**What the interviewer is checking.** Whether you can explain the partition
invariant before touching code, why you search the shorter array (so `j` is
never negative), and the `±Infinity` sentinels instead of four special cases.

</details>

**Follow-ups:**

1. Q: Generalise to the kth smallest of two sorted arrays.
   <details><summary>Answer</summary>

   Same partition idea with `half = k`: find `i` such that `A[0..i)` and
   `B[0..k-i)` are exactly the k smallest. The answer is `max(A[i-1], B[j-1])`.
   Bounds on `i` become `[max(0, k - n), min(k, m)]` so `j` stays valid.
   O(log min(m, n, k)).

   </details>

2. Q: There are `t` sorted arrays, not two.
   <details><summary>Answer</summary>

   The pairwise partition trick doesn't generalise cleanly. Binary search on
   the *value* instead: pick a candidate median value, count how many
   elements across all arrays are ≤ it (one `upperBound` per array, O(t log
   L)), and adjust. O(t · log L · log range). Or a heap-based k-way merge to
   the middle at O(N log t). The value-search is the elegant answer; say
   both.

   </details>

### Q: Single number — every element appears twice except one; find it in O(n) time, O(1) space
**Level:** intermediate · **Tags:** google-coding, bits, xor

<details><summary>Model answer</summary>

**Problem.** `nums` where every value appears exactly twice except one that
appears once. Return that one. Example: `[4,1,2,1,2] → 4`.

**Clarify first.** Exactly one singleton, and all others exactly twice?
(Yes — the follow-up changes both.) Integers within 32-bit? (Assume yes;
otherwise `BigInt` for the XOR.) O(1) space is a hard requirement? (Yes —
that's what rules out the map.)

**Brute force.** Count with a `Map`, return the key with count 1. O(n) time,
O(n) space. Sort and scan pairs: O(n log n), O(1) extra. Both fine; neither
is the answer being asked for.

**The insight.** XOR is associative, commutative, `x ^ x = 0`, and `x ^ 0 =
x`. XOR everything together: every pair cancels to 0, leaving the singleton.
One pass, one variable.

**Algorithm.** `acc = 0; for x of nums: acc ^= x; return acc`.

```js
function singleNumber(nums) {
  let acc = 0;
  for (const x of nums) acc ^= x;   // pairs cancel; the lone value survives
  return acc;
}
```

**Complexity.** O(n) time, O(1) space.

**Test it.**
- `[4,1,2,1,2]` → 4 ^ 1 ^ 2 ^ 1 ^ 2 = 4.
- `[7]` → 7.
- Negative numbers `[-3, 5, 5]` → -3 (XOR on two's complement is fine).
- A value of 0 as the singleton `[0, 9, 9]` → 0 — note the accumulator starts
  at 0 and that's not a problem.

**What the interviewer is checking.** That you can state the XOR properties
that make it work, not just the trick. Then they'll change the counts.

</details>

**Follow-ups:**

1. Q: Every element appears three times except one.
   <details><summary>Answer</summary>

   XOR alone fails — three copies don't cancel. Count per bit position: for
   each of the 32 bits, count how many numbers have it set, take that count
   mod 3; the surviving bits form the answer. O(32n) = O(n), O(1) space.
   Handle the sign bit by reconstructing with `| 0` so the result is a
   signed 32-bit integer.

   ```js
   function singleNumberIII(nums) {
     let result = 0;
     for (let bit = 0; bit < 32; bit++) {
       let count = 0;
       for (const x of nums) if ((x >> bit) & 1) count++;
       if (count % 3) result |= (1 << bit);
     }
     return result | 0;
   }
   ```

   </details>

2. Q: Two elements appear once, the rest twice. Find both.
   <details><summary>Answer</summary>

   XOR everything: the result is `a ^ b`, which is non-zero, so some bit
   differs between them. Isolate the lowest such bit with `x & -x`. Partition
   the array by that bit and XOR each partition separately — each pair lands
   in the same partition and cancels, leaving `a` in one and `b` in the other.
   Two passes, O(1) space.

   </details>

### Q: Power of two, counting bits and the trick table — show you understand the bits, not just the idioms
**Level:** intermediate · **Tags:** google-coding, bits, twos-complement

<details><summary>Model answer</summary>

**Problem.** Three short parts an interviewer strings together as a warm-up:
(a) is `n` a power of two; (b) for every `i` in `0..n`, how many set bits does
it have, in O(n) total; (c) explain `n & (n - 1)` and `n & -n`. Example: (a)
`16 → true`, `18 → false`; (b) `n = 5 → [0,1,1,2,1,2]`.

**Clarify first.** Is `n` non-negative for (a)? (Zero and negatives aren't
powers of two; guard them.) 32-bit? (Yes.) For (b), is O(n log n) acceptable?
(The follow-up is "do it in O(n)" — go there directly.)

**Brute force.** (a) Divide by 2 while even, O(log n). (b) Count bits of each
number independently, O(n log n). Both fine; the point of the question is the
bit-level reasoning.

**The insight.** Subtracting 1 from `n` flips the lowest set bit to 0 and
every bit below it to 1. So `n & (n - 1)` clears exactly the lowest set bit —
and a power of two has exactly one set bit, so that operation yields 0. For
counting bits, `i` has the same bits as `i >> 1` plus its own lowest bit:
`bits[i] = bits[i >> 1] + (i & 1)`, a one-line DP.

**Algorithm.**
(a) `n > 0 && (n & (n - 1)) === 0`.
(b) `bits[0] = 0; for i in 1..n: bits[i] = bits[i >> 1] + (i & 1)`.

```js
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;   // exactly one bit set
}

function countBits(n) {
  const bits = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
  return bits;
}

// popcount of a single number: one iteration per SET bit, not per position
function popcount(n) {
  let c = 0;
  while (n) { n &= n - 1; c++; }
  return c;
}
```

**Complexity.** (a) O(1). (b) O(n) time and space. `popcount` is O(number of
set bits).

**Test it.**
- `isPowerOfTwo(1) → true` (2⁰), `(0) → false`, `(-8) → false`, `(1 << 30) →
  true`.
- `countBits(5) → [0,1,1,2,1,2]`: `bits[4] = bits[2] + 0 = 1`, `bits[5] =
  bits[2] + 1 = 2`. ✓
- `popcount(0b1011) → 3`.
- `1 << 31` in JS is `-2147483648`; `isPowerOfTwo` returns false because `n >
  0` fails — correct behaviour for a signed 32-bit int, and worth saying.

**What the interviewer is checking.** Whether you can *derive* `n & (n - 1)`
from what subtraction does to bits, and whether you know JS bit ops are 32-bit
signed. Reciting the trick without the derivation is the weak version.

</details>

**Follow-ups:**

1. Q: What does `n & -n` give, and where would you use it?
   <details><summary>Answer</summary>

   `-n` is `~n + 1` in two's complement, which flips every bit and then
   carries through the trailing ones, leaving only the lowest set bit in
   common with `n`. So `n & -n` isolates that bit. It's the step function in a
   Fenwick tree (`i += i & -i` to walk to the parent range), and the partition
   bit in the two-singletons problem above.

   </details>

2. Q: Enumerate every subset of a set of k ≤ 20 items, and every subset of a given subset.
   <details><summary>Answer</summary>

   Subsets are the integers `0 .. 2ᵏ - 1` as masks, `for (let m = 0; m < 1 <<
   k; m++)`. Submasks of `m` come from the idiom `for (let s = m; s > 0; s =
   (s - 1) & m)` — subtracting 1 and masking walks every submask in
   descending order without repeats. The total over all `m` is 3ᵏ, which is
   the right thing to say when asked the complexity of "for every subset, for
   every sub-subset".

   </details>

---

## Problem bank — bit manipulation fundamentals

The trick table and single-number above assume you can already reason about
individual bits. This bank covers that groundwork from the Scaler track:
binary conversion, the operators and their properties, and the four
single-bit operations every bit problem is built from.

| Group | Problems |
| --- | --- |
| Number systems | decimal ↔ binary, add two binary strings |
| Operators | AND / OR / XOR / NOT / shifts and their properties, even or odd without `%` |
| Single-bit operations | check, set, unset and toggle the i-th bit; count set bits |
| Negative numbers | two's complement and the int32 range |

**JS/TS warning, once:** bitwise operators convert their operands to
**signed 32-bit integers**. `2 ** 31 | 0` is `-2147483648`, and
`(1 << 31)` is negative. For values past 2³¹ use `BigInt` (`1n << 40n`) or
arithmetic instead of bit operators.

---

### Number systems

### Q: Convert decimal to binary and binary to decimal
**Level:** foundation · **Tags:** google-coding, bits, binary, number-systems, scaler

<details><summary>Model answer</summary>

**Problem.** `45` → `"101101"`; `"101101"` → `45`.

**The insight.** Base 2 is base 10 with a different base.
- **Decimal → binary.** Repeatedly take `n % 2` (the lowest bit) and divide by
  2; the remainders, read in reverse, are the bits.
- **Binary → decimal.** Horner's rule: for each bit from the left,
  `value = value × 2 + bit`. Equivalent to Σ bitᵢ · 2ⁱ.

`45`: 45→1, 22→0, 11→1, 5→1, 2→0, 1→1 → reversed `101101`.
Check: 32 + 8 + 4 + 1 = 45.

```ts
function toBinary(n: number): string {
  if (n === 0) return '0';
  const bits: number[] = [];
  while (n > 0) {
    bits.push(n % 2);          // lowest bit
    n = Math.floor(n / 2);     // drop it
  }
  return bits.reverse().join('');
}

function fromBinary(s: string): number {
  let v = 0;
  for (const ch of s) v = v * 2 + (ch === '1' ? 1 : 0);   // shift left, add bit
  return v;
}
```

Built-ins exist — `n.toString(2)` and `parseInt(s, 2)` — and you should
mention them, but the interviewer is asking whether you know what they do.

**Complexity.** O(log n) time — one step per bit.

</details>

**Follow-ups:**
1. Q: Generalise to any base b.
   <details><summary>Answer</summary>

   Replace 2 with b in both loops; for b > 10 map digits 10..35 to `a..z`.
   A decimal number in base b has ⌊log_b n⌋ + 1 digits.

   </details>

### Q: Add two binary numbers given as strings
**Level:** foundation · **Tags:** google-coding, bits, binary, strings, carry, scaler

<details><summary>Model answer</summary>

**Problem.** `"1011" + "111"` → `"10010"` (11 + 7 = 18).

**The insight.** School addition, base 2. Walk both strings from the right with
a carry; each column's digit is `sum % 2` and the new carry is
`Math.floor(sum / 2)`. Keep going while either string has digits **or** the
carry is 1.

```ts
function addBinary(a: string, b: string): string {
  const out: number[] = [];
  let i = a.length - 1, j = b.length - 1, carry = 0;
  while (i >= 0 || j >= 0 || carry) {
    const sum = (i >= 0 ? +a[i--] : 0) + (j >= 0 ? +b[j--] : 0) + carry;
    out.push(sum % 2);
    carry = sum >> 1;
  }
  return out.reverse().join('');
}
```

**Complexity.** O(max(|a|, |b|)) time and space.

**Why not `parseInt` + `toString(2)`?** Strings of 100 bits overflow a double.
The digit-by-digit version works for any length.

</details>

**Follow-ups:**
1. Q: Add two integers without using `+`.
   <details><summary>Answer</summary>

   `a ^ b` is the sum without carries; `(a & b) << 1` is the carries. Repeat
   `[a, b] = [a ^ b, (a & b) << 1]` until `b === 0`. In JS this works within
   32-bit signed integers.

   </details>

---

### Operators

### Q: What do AND, OR, XOR, NOT and the shifts do, and which properties make XOR useful?
**Level:** foundation · **Tags:** google-coding, bits, xor, operators, scaler

<details><summary>Model answer</summary>

| a | b | a & b | a \| b | a ^ b |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 1 |
| 1 | 0 | 0 | 1 | 1 |
| 1 | 1 | 1 | 1 | 0 |

- **AND** keeps a bit only where both have it — used to **test** or **clear**
  bits.
- **OR** sets a bit where either has it — used to **set** bits.
- **XOR** is 1 where the bits differ — used to **toggle** bits and cancel
  pairs.
- **NOT** `~x` flips every bit; in two's complement `~x === −x − 1`.
- **Left shift** `x << k` multiplies by 2ᵏ (until it overflows 32 bits).
- **Right shift** `x >> k` divides by 2ᵏ, rounding toward −∞ (sign-extending);
  `>>>` fills with zeros, treating the value as unsigned.

**XOR's properties** — the reason half of bit problems are XOR problems:

| Property | Meaning |
| --- | --- |
| `x ^ 0 = x` | 0 is the identity |
| `x ^ x = 0` | Everything cancels itself |
| Commutative, associative | Order doesn't matter: `a ^ b ^ a = b` |

So XOR-ing a whole array cancels every value that appears an even number of
times — which is the entire solution to single-number (worked above).

</details>

**Follow-ups:**
1. Q: Swap two integers without a temporary variable.
   <details><summary>Answer</summary>

   `a ^= b; b ^= a; a ^= b;`. It breaks if `a` and `b` are the same memory
   location (e.g. `arr[i]` and `arr[j]` with `i === j`) — both become 0. In
   production code, just use a temp or destructuring.

   </details>

### Q: Check whether a number is even or odd without `%` or `/`
**Level:** foundation · **Tags:** google-coding, bits, scaler

<details><summary>Model answer</summary>

**The insight.** Every bit except the lowest is worth an even amount (2, 4,
8, …), so parity is decided by bit 0 alone. `n & 1` is 1 for odd, 0 for even.

```ts
const isOdd = (n: number): boolean => (n & 1) === 1;
```

It works for negative numbers too: in two's complement, `-3` is
`…11111101`, whose low bit is 1.

**Complexity.** O(1).

</details>

**Follow-ups:**
1. Q: Why is `n % 2 === 1` wrong in JS for negatives?
   <details><summary>Answer</summary>

   `%` takes the sign of the dividend, so `-3 % 2 === -1`. Use `n % 2 !== 0`
   or the bit test.

   </details>

---

### Single-bit operations

Bits are numbered from 0 at the right. `1 << i` is a **mask** with only bit
`i` set. Every single-bit operation is one operator with that mask.

### Q: Check, set, unset and toggle the i-th bit of n
**Level:** foundation · **Tags:** google-coding, bits, bitmask, scaler

<details><summary>Model answer</summary>

**Problem.** `n = 45 = 101101₂`.
- check bit 2 → set (true); check bit 1 → false
- set bit 1 → `101111₂` = 47
- unset bit 0 → `101100₂` = 44
- toggle bit 5 → `001101₂` = 13

| Operation | Expression | Why |
| --- | --- | --- |
| Check | `(n >> i) & 1` or `(n & (1 << i)) !== 0` | AND with the mask leaves only that bit |
| Set | `n \| (1 << i)` | OR with 1 forces it to 1 |
| Unset | `n & ~(1 << i)` | The inverted mask is 1 everywhere except bit i |
| Toggle | `n ^ (1 << i)` | XOR with 1 flips it |

```ts
const checkBit  = (n: number, i: number) => ((n >> i) & 1) === 1;
const setBit    = (n: number, i: number) => n | (1 << i);
const unsetBit  = (n: number, i: number) => n & ~(1 << i);
const toggleBit = (n: number, i: number) => n ^ (1 << i);
```

**The classic bug:** `n & (1 << i) === 1`. Two problems — `===` binds tighter
than `&` in JS, and even parenthesised, `n & (1 << i)` is `2ⁱ`, not 1, when
the bit is set. Compare with `!== 0` or shift down first.

**Complexity.** O(1) each.

</details>

**Follow-ups:**
1. Q: Unset the i-th bit using only check and toggle.
   <details><summary>Answer</summary>

   `checkBit(n, i) ? toggleBit(n, i) : n` — the lecture's version. The
   `& ~mask` form does it branch-free.

   </details>

### Q: Count the set bits of n
**Level:** foundation · **Tags:** google-coding, bits, popcount, scaler

<details><summary>Model answer</summary>

**Problem.** `45 = 101101₂` → 4. `12 = 1100₂` → 2.

**Three versions.**
1. Check each of the 32 bits: O(32) = O(1) for a fixed-width int, but O(log n)
   in general.
2. Shift until zero: `count += n & 1; n >>>= 1` — O(number of bits up to the
   highest set one).
3. **Brian Kernighan:** `n & (n − 1)` clears the lowest set bit, so loop until
   `n === 0`: **O(number of set bits)**.

```ts
function countSetBits(n: number): number {
  let c = 0;
  while (n !== 0) {
    n &= n - 1;     // drop the lowest set bit
    c++;
  }
  return c;
}
```

Why `n & (n − 1)` works: subtracting 1 flips the lowest set bit to 0 and all
the zeros below it to 1. AND-ing with the original clears exactly those
positions.

**Complexity.** O(k) where k = set bits; O(1) space.

**Test it.** 0 → 0. `2³¹ − 1` → 31. Negative numbers: `-1` has 32 set bits;
with `n &= n − 1` in JS that terminates because the value stays a 32-bit int
after the first `&` — but use `>>>` in the shifting version, or `>>` loops
forever on negatives.

</details>

**Follow-ups:**
1. Q: Count set bits for every number 0..n in O(n).
   <details><summary>Answer</summary>

   DP: `bits[i] = bits[i >> 1] + (i & 1)` — i has the same bits as i/2, plus
   its own low bit. Or `bits[i] = bits[i & (i − 1)] + 1`.

   </details>
2. Q: Is n a power of two?
   <details><summary>Answer</summary>

   `n > 0 && (n & (n − 1)) === 0` — a power of two has exactly one set bit.

   </details>

---

### Negative numbers

### Q: How are negative integers stored, and what is the range of a 32-bit signed int?
**Level:** foundation · **Tags:** google-coding, bits, twos-complement, overflow, scaler

<details><summary>Model answer</summary>

**Two's complement.** For an 8-bit example, the top bit is worth **−2⁷ =
−128** instead of +128; the rest are positive as usual. So `10000000` = −128,
`11111111` = −128 + 127 = −1, and `01111111` = 127.

**How to negate:** invert every bit (one's complement) and add 1.
`5 = 00000101` → invert `11111010` → add 1 → `11111011` = −128 + 123 = −5 ✓.

**Why it's used.** Addition works the same for signed and unsigned — the CPU
needs one adder — and there is only one zero.

**Range with N bits:** `−2ᴺ⁻¹ … 2ᴺ⁻¹ − 1`. For 32 bits:
`−2,147,483,648 … 2,147,483,647` (about ±2.1·10⁹). For 64 bits: about
±9.2·10¹⁸.

**What this means in the round.** A problem with values up to 10⁹ and n up to
10⁵ has sums up to 10¹⁴ — past int32, so Java/C++ need `long`. JS numbers are
doubles and exact up to 2⁵³ ≈ 9·10¹⁵, so that sum is fine in JS; a product of
two 10⁹ values (10¹⁸) is **not**, and needs `BigInt`.

</details>

**Follow-ups:**
1. Q: What is `~5` and why?
   <details><summary>Answer</summary>

   −6. Inverting all bits is `−x − 1` in two's complement, since
   `x + ~x = −1` (all ones).

   </details>

---

## Interview Q&A

### Q: What can and can't binary search be applied to?
**Level:** foundation · **Tags:** dsa, binary-search

<details><summary>Model answer</summary>

Binary search applies to any **monotonic predicate over a range** — not to
sorted arrays specifically. If I can define a yes/no question that's false up
to some point and true after (or the reverse), I can find that point in
O(log range) evaluations, regardless of what the underlying data looks like.

A sorted array is the obvious case: the predicate "is `a[i] >= target`" is
monotonic in `i`. But "can Koko finish at speed `k`" is monotonic in `k` and
the input array isn't sorted at all. "Is this version of the build broken" is
monotonic across commits — that's `git bisect`. Same algorithm.

What it can't do is search an unsorted array for a value, or find an optimum
of a function that goes up and down — those aren't monotonic, and binary
search will confidently return a wrong index. So the first thing I do is
prove monotonicity to myself, and if I can't, it's the wrong tool — hashing,
two pointers or DP instead.

The practical detail I always mention: I write one half-open `lowerBound`
helper and express every variant as a predicate, because the off-by-ones live
in the loop shape, not in the problem.

</details>

**Follow-ups:**

1. Q: Why do you insist on the half-open interval?
   <details><summary>Answer</summary>

   Because the two moves — `hi = mid` and `lo = mid + 1` — are asymmetric by
   design, the interval always shrinks, and "not found" falls out as `lo ===
   hi` with no special case. A closed interval needs `hi = mid - 1`, a `<=`
   loop, and a separate check for whether the answer exists. Both work; the
   half-open version is the one I can write correctly at a whiteboard while
   talking.

   </details>

### Q: Why should a JavaScript engineer be careful with bit operations?
**Level:** intermediate · **Tags:** dsa, bits, javascript

<details><summary>Model answer</summary>

Because JavaScript numbers are 64-bit floats, but every bitwise operator
first converts its operands to **32-bit signed integers**. `1 << 31` is
negative. `1 << 32` wraps to `1`. `2 ** 40 | 0` throws away the high bits. Any
bit trick on a value that doesn't fit in 31 bits silently gives the wrong
answer.

So in an interview I state the assumption: "I'll assume 32-bit integers, and
if the values are larger I'd use `BigInt`, which has the same operators
without the truncation, or split into 32-bit words." For bit-counting on
0..n with n up to 10⁵ it's a non-issue; for hashing or masks over large IDs
it's the first thing that breaks.

The other trap is `>>` versus `>>>`. `>>` is arithmetic — it preserves the
sign bit, so `-8 >> 1` is `-4`. `>>>` is logical and treats the number as
unsigned, so `-1 >>> 0` is `4294967295`. When I'm treating an integer as a
bag of bits I want `>>>`; when I'm halving a signed number I want `>>`.

</details>

---

## What a weak answer sounds like

- **`lo = mid`** and an infinite loop on a two-element range.
- **Mixing inclusive and exclusive bounds** halfway through the function.
- **Expanding outwards from a found element** to find the range, then claiming
  O(log n).
- **Not stating the monotonicity** before searching on the answer — or
  searching a non-monotonic predicate and getting a plausible-looking wrong
  number.
- **Searching the longer array** in the median problem, then patching negative
  indices.
- **Reciting `n & (n - 1)`** without being able to say what subtraction does to
  the bits.
- **`1 << 31` treated as positive** in JavaScript.

---

## Glossary

- **Monotonic predicate** — a boolean function that changes value at most once across its domain.
- **Lower bound / upper bound** — first index with `a[i] >= x` / first with `a[i] > x`.
- **Half-open interval** — `[lo, hi)`: includes `lo`, excludes `hi`.
- **Binary search on the answer** — searching candidate answers with a feasibility check, when the input isn't sorted.
- **Rotated sorted array** — a sorted array cut at a pivot and the halves swapped.
- **Partition search** — searching for a cut position rather than a value; the median-of-two-arrays technique.
- **Galloping search** — doubling probes to bound an unbounded sorted sequence, then binary search.
- **Two's complement** — signed-integer encoding where `-x = ~x + 1`.
- **Mask** — an integer whose bits encode set membership.
- **Popcount** — the number of set bits.
- **Submask enumeration** — `s = (s - 1) & m` to walk every subset of mask `m`.
- **`>>` vs `>>>`** — arithmetic (sign-preserving) vs logical (zero-fill) right shift.

---

## Exercises

Bitwise operators work on 32-bit signed integers in TypeScript — keep inputs in
that range or reach for `BigInt`. Problems marked **core** are the must-solve set.

### Exercise: Decimal to binary
**Level:** foundation · **Topic:** repeated division by 2 · **Hint:** The remainders, read in reverse, are the bits.
**Function:** `toBinary(n: number): string`
**Source:** scaler

Return the binary representation of a non-negative integer, without `toString(2)`. `45` → `"101101"`.

```tests
[{"args": [45], "expected": "101101"},
 {"args": [0], "expected": "0"},
 {"args": [1], "expected": "1"},
 {"args": [8], "expected": "1000"},
 {"args": [1023], "expected": "1111111111"}]
```

<details><summary>Solution</summary>

```ts
function toBinary(n: number): string {
  if (n === 0) return '0';
  const bits: number[] = [];
  while (n > 0) { bits.push(n % 2); n = Math.floor(n / 2); }
  return bits.reverse().join('');
}
```
</details>

### Exercise: Binary to decimal
**Level:** foundation · **Topic:** Horner's rule: value = value × 2 + bit · **Hint:** Read the bits left to right, doubling as you go.
**Function:** `fromBinary(s: string): number`
**Source:** scaler

Return the value of a binary string, without `parseInt`. `"101101"` → `45`.

```tests
[{"args": ["101101"], "expected": 45},
 {"args": ["0"], "expected": 0},
 {"args": ["1"], "expected": 1},
 {"args": ["11111111"], "expected": 255}]
```

<details><summary>Solution</summary>

```ts
function fromBinary(s: string): number {
  let v = 0;
  for (const ch of s) v = v * 2 + (ch === '1' ? 1 : 0);
  return v;
}
```
</details>

### Exercise: Add two binary strings
**Level:** foundation · **Topic:** column addition with a carry · **Hint:** Keep going while either string has digits or the carry is 1.
**Function:** `addBinary(a: string, b: string): string`
**Core:** true · **Source:** scaler

Add two binary strings of any length. `"1011" + "111"` → `"10010"`.

```tests
[{"args": ["1011", "111"], "expected": "10010"},
 {"args": ["0", "0"], "expected": "0"},
 {"args": ["1", "1"], "expected": "10"},
 {"args": ["1111", "1"], "expected": "10000"},
 {"args": ["100000000000000000000000000000000000000000000000000000000000000000000000000000000", "1"], "expected": "100000000000000000000000000000000000000000000000000000000000000000000000000000001", "label": "an 81-bit number"}]
```

<details><summary>Solution</summary>

```ts
function addBinary(a: string, b: string): string {
  const out: number[] = [];
  let i = a.length - 1, j = b.length - 1, carry = 0;
  while (i >= 0 || j >= 0 || carry) {
    const sum = (i >= 0 ? +a[i--] : 0) + (j >= 0 ? +b[j--] : 0) + carry;
    out.push(sum % 2);
    carry = sum >> 1;
  }
  return out.reverse().join('');
}
```
</details>

### Exercise: Even or odd without % or /
**Level:** foundation · **Topic:** the lowest bit · **Hint:** Every bit but bit 0 is worth an even amount.
**Function:** `isOdd(n: number): boolean`
**Source:** scaler

Return whether `n` is odd using only bit operations. Works for negatives. `-3` → `true`.

```tests
[{"args": [7], "expected": true},
 {"args": [4], "expected": false},
 {"args": [-3], "expected": true},
 {"args": [0], "expected": false},
 {"args": [-8], "expected": false}]
```

<details><summary>Solution</summary>

```ts
function isOdd(n: number): boolean {
  return (n & 1) === 1;
}
```
</details>

### Exercise: Check, set, unset and toggle bit i
**Level:** foundation · **Topic:** one mask: 1 << i · **Hint:** AND tests, OR sets, AND-NOT clears, XOR flips.
**Function:** `bitOps(n: number, i: number): { check: boolean; set: number; unset: number; toggle: number }`
**Core:** true · **Source:** scaler

Return all four single-bit operations on bit `i` of `n`.
`(45, 1)` → `{ check: false, set: 47, unset: 45, toggle: 47 }`.

```tests
[{"args": [45, 1], "expected": {"check": false, "set": 47, "unset": 45, "toggle": 47}},
 {"args": [45, 0], "expected": {"check": true, "set": 45, "unset": 44, "toggle": 44}},
 {"args": [45, 5], "expected": {"check": true, "set": 45, "unset": 13, "toggle": 13}},
 {"args": [0, 3], "expected": {"check": false, "set": 8, "unset": 0, "toggle": 8}}]
```

<details><summary>Solution</summary>

```ts
function bitOps(n: number, i: number): { check: boolean; set: number; unset: number; toggle: number } {
  const mask = 1 << i;
  return { check: (n & mask) !== 0, set: n | mask, unset: n & ~mask, toggle: n ^ mask };
}
```
</details>

### Exercise: Count set bits
**Level:** foundation · **Topic:** n & (n − 1) clears the lowest set bit · **Hint:** Loop once per set bit, not once per bit.
**Function:** `countSetBits(n: number): number`
**Core:** true · **Source:** scaler

Return the number of 1 bits in a 32-bit integer (negatives in two's complement). `45` → `4`; `-1` → `32`.

```tests
[{"args": [45], "expected": 4},
 {"args": [12], "expected": 2},
 {"args": [0], "expected": 0},
 {"args": [-1], "expected": 32},
 {"args": [2147483647], "expected": 31}]
```

<details><summary>Solution</summary>

```ts
function countSetBits(n: number): number {
  let c = 0;
  while (n !== 0) { n &= n - 1; c++; }
  return c;
}
```
</details>

### Exercise: Is n a power of two?
**Level:** foundation · **Topic:** exactly one set bit · **Hint:** What does n & (n − 1) do to a power of two?
**Function:** `isPowerOfTwo(n: number): boolean`

Return whether `n` is a power of two. `16` → `true`, `0` → `false`, `6` → `false`.

```tests
[{"args": [16], "expected": true},
 {"args": [1], "expected": true},
 {"args": [0], "expected": false},
 {"args": [6], "expected": false},
 {"args": [-8], "expected": false},
 {"args": [1073741824], "expected": true}]
```

<details><summary>Solution</summary>

```ts
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
```
</details>

### Exercise: Single number
**Level:** foundation · **Topic:** XOR cancels pairs · **Hint:** x ^ x = 0 and x ^ 0 = x, in any order.
**Function:** `singleNumber(nums: number[]): number`
**Core:** true · **Source:** scaler

Every element appears twice except one. Return it in O(n) time and O(1) space. `[4, 1, 2, 1, 2]` → `4`.

```tests
[{"args": [[4, 1, 2, 1, 2]], "expected": 4},
 {"args": [[1]], "expected": 1},
 {"args": [[-1, -1, -2]], "expected": -2},
 {"args": [[5, 3, 5]], "expected": 3}]
```

<details><summary>Solution</summary>

```ts
function singleNumber(nums: number[]): number {
  return nums.reduce((x, y) => x ^ y, 0);
}
```
</details>

### Exercise: Counting bits for 0..n
**Level:** intermediate · **Topic:** DP: bits[i] = bits[i >> 1] + (i & 1) · **Hint:** i has the same bits as i / 2, plus its own lowest bit.
**Function:** `countBits(n: number): number[]`

Return `ans` where `ans[i]` is the number of set bits in `i`, for 0 ≤ i ≤ n, in O(n). `5` → `[0,1,1,2,1,2]`.

```tests
[{"args": [5], "expected": [0, 1, 1, 2, 1, 2]},
 {"args": [0], "expected": [0]},
 {"args": [2], "expected": [0, 1, 1]}]
```

<details><summary>Solution</summary>

```ts
function countBits(n: number): number[] {
  const bits = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
  return bits;
}
```
</details>

### Exercise: Search in a rotated sorted array
**Level:** intermediate · **Topic:** binary search: one half is always sorted · **Hint:** Decide which half is sorted, then whether the target lies in it.
**Function:** `searchRotated(nums: number[], target: number): number`
**Core:** true

`nums` is a sorted array of distinct values rotated at an unknown pivot. Return the target's index or `-1`, in O(log n).
`[4,5,6,7,0,1,2], 0` → `4`.

```tests
[{"args": [[4, 5, 6, 7, 0, 1, 2], 0], "expected": 4},
 {"args": [[4, 5, 6, 7, 0, 1, 2], 3], "expected": -1},
 {"args": [[1], 0], "expected": -1},
 {"args": [[1], 1], "expected": 0},
 {"args": [[3, 1], 1], "expected": 1},
 {"args": [[5, 1, 3], 5], "expected": 0}]
```

<details><summary>Solution</summary>

```ts
function searchRotated(nums: number[], target: number): number {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
    }
  }
  return -1;
}
```
</details>

### Exercise: First and last position
**Level:** intermediate · **Topic:** two boundary binary searches · **Hint:** Search for the first index ≥ target, and the first index > target.
**Function:** `searchRange(nums: number[], target: number): number[]`
**Core:** true

In a sorted array, return `[first, last]` indices of `target`, or `[-1, -1]`, in O(log n).
`[5,7,7,8,8,10], 8` → `[3, 4]`.

```tests
[{"args": [[5, 7, 7, 8, 8, 10], 8], "expected": [3, 4]},
 {"args": [[5, 7, 7, 8, 8, 10], 6], "expected": [-1, -1]},
 {"args": [[], 0], "expected": [-1, -1]},
 {"args": [[2, 2], 2], "expected": [0, 1]},
 {"args": [[1], 1], "expected": [0, 0]}]
```

<details><summary>Solution</summary>

```ts
function searchRange(nums: number[], target: number): number[] {
  const lower = (x: number) => {
    let lo = 0, hi = nums.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (nums[mid] < x) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const first = lower(target);
  if (first === nums.length || nums[first] !== target) return [-1, -1];
  return [first, lower(target + 1) - 1];
}
```
</details>

### Exercise: Koko eating bananas
**Level:** intermediate · **Topic:** binary search on the answer · **Hint:** If speed k works, every faster speed works too.
**Function:** `minEatingSpeed(piles: number[], h: number): number`
**Core:** true

Koko eats up to `k` bananas per hour from one pile per hour. Return the minimum `k` to finish all piles within `h` hours.
`[3, 6, 7, 11], 8` → `4`.

```tests
[{"args": [[3, 6, 7, 11], 8], "expected": 4},
 {"args": [[30, 11, 23, 4, 20], 5], "expected": 30},
 {"args": [[30, 11, 23, 4, 20], 6], "expected": 23},
 {"args": [[1], 1], "expected": 1},
 {"args": [[1000000000], 2], "expected": 500000000}]
```

<details><summary>Solution</summary>

```ts
function minEatingSpeed(piles: number[], h: number): number {
  let lo = 1, hi = Math.max(...piles);
  const hours = (k: number) => piles.reduce((s, p) => s + Math.ceil(p / k), 0);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (hours(mid) <= h) hi = mid; else lo = mid + 1;
  }
  return lo;
}
```
</details>

### Exercise: Median of two sorted arrays
**Level:** senior · **Topic:** binary search on the partition · **Hint:** Partition the shorter array so the left halves together hold half the elements.
**Function:** `findMedianSortedArrays(a: number[], b: number[]): number`
**Compare:** float

Return the median of the two sorted arrays combined, in O(log(min(m, n))). `[1, 3], [2]` → `2`; `[1, 2], [3, 4]` → `2.5`.

```tests
[{"args": [[1, 3], [2]], "expected": 2},
 {"args": [[1, 2], [3, 4]], "expected": 2.5},
 {"args": [[], [1]], "expected": 1},
 {"args": [[2], []], "expected": 2},
 {"args": [[1, 2, 3], [4, 5, 6, 7]], "expected": 4}]
```

<details><summary>Solution</summary>

```ts
function findMedianSortedArrays(a: number[], b: number[]): number {
  if (a.length > b.length) [a, b] = [b, a];
  const m = a.length, n = b.length, half = Math.floor((m + n + 1) / 2);
  let lo = 0, hi = m;
  while (lo <= hi) {
    const i = Math.floor((lo + hi) / 2), j = half - i;
    const aL = i > 0 ? a[i - 1] : -Infinity, aR = i < m ? a[i] : Infinity;
    const bL = j > 0 ? b[j - 1] : -Infinity, bR = j < n ? b[j] : Infinity;
    if (aL <= bR && bL <= aR) {
      return (m + n) % 2 ? Math.max(aL, bL) : (Math.max(aL, bL) + Math.min(aR, bR)) / 2;
    }
    if (aL > bR) hi = i - 1; else lo = i + 1;
  }
  return 0;
}
```
</details>

---

### Exercise: Single number II
**Level:** intermediate · **Topic:** counting set bits mod 3 · **Hint:** XOR cancels pairs, not triples — count each bit position across the array instead.
**Function:** `singleNumberII(nums: number[]): number`
**Core:** true · **Source:** scaler

Every element appears exactly three times except one, which appears once. Find it in O(N) time, O(1) space — XOR alone doesn't work here (`x ^ x ^ x = x`, it doesn't cancel). For each of the 32 bit positions, count how many numbers have that bit set: if the count isn't a multiple of 3, the lone element has that bit set.
`[2, 2, 3, 2]` → `3`.

```tests
[{"args": [[2, 2, 3, 2]], "expected": 3},
 {"args": [[0, 1, 0, 1, 0, 1, 99]], "expected": 99},
 {"args": [[5, 5, 5, 9]], "expected": 9},
 {"args": [[30, 30, 30, 7]], "expected": 7},
 {"gen": "(() => { const a = []; for (let i = 0; i < 3000; i++) { a.push(i); a.push(i); a.push(i); } a.push(123456); return [a]; })()", "perf": true, "label": "9,001 elements"}]
```

<details><summary>Solution</summary>

```ts
function singleNumberII(nums: number[]): number {
  let ans = 0;
  for (let bit = 0; bit < 32; bit++) {
    let cnt = 0;
    for (const x of nums) if ((x >>> bit) & 1) cnt++;
    if (cnt % 3 !== 0) ans |= (1 << bit);
  }
  return ans >>> 0;
}
```
</details>

---

### Exercise: Two single numbers
**Level:** intermediate · **Topic:** XOR + partition by a set bit · **Hint:** XOR the whole array first — that leaves you with (unique1 XOR unique2), and any set bit in it tells them apart.
**Function:** `twoSingleNumbers(nums: number[]): number[]`
**Core:** true · **Source:** scaler

Every element appears exactly twice except two, which appear once each. Return those two, ascending. XOR-ing the whole array cancels every pair and leaves `u1 ^ u2` — call it `diff`. Any bit set in `diff` must differ between `u1` and `u2` (both can't have it, or that bit would cancel too), so splitting the array on that one bit puts `u1` and every one of its pairs on one side, `u2` and its pairs on the other; XOR each side separately.
`[3, 4, 6, 4, 3, 8]` → `[6, 8]`.

```tests
[{"args": [[3, 4, 6, 4, 3, 8]], "expected": [6, 8]},
 {"args": [[1, 2, 1, 3, 2, 5]], "expected": [3, 5]},
 {"args": [[1, 0]], "expected": [0, 1]},
 {"args": [[7, 100, 7, 15, 100, 15, 200, 9]], "expected": [9, 200]}]
```

<details><summary>Solution</summary>

```ts
function twoSingleNumbers(nums: number[]): number[] {
  let xorAll = 0;
  for (const x of nums) xorAll ^= x;
  const diffBit = xorAll & (-xorAll); // lowest set bit
  let x1 = 0, x2 = 0;
  for (const v of nums) {
    if (v & diffBit) x1 ^= v; else x2 ^= v;
  }
  return x1 < x2 ? [x1, x2] : [x2, x1];
}
```
</details>

---

### Exercise: Maximum AND of a pair
**Level:** foundation · **Topic:** bitwise AND · **Hint:** A bit survives AND only when both numbers have it — that's the whole exercise.
**Function:** `maxAndPair(nums: number[]): number`
**Core:** true · **Source:** scaler

Return the maximum value of `nums[i] & nums[j]` over every pair `i ≠ j`. `nums.length` is small enough that checking every pair is the intended solution — this is a warm-up for the bit-by-bit greedy version (build the answer from the highest bit down, keeping only numbers that could still share it) that shows up once N gets large.
`[27, 18, 20]` → `18` (`27 & 18 = 18`).

```tests
[{"args": [[27, 18, 20]], "expected": 18},
 {"args": [[4, 8, 12]], "expected": 8},
 {"args": [[1, 2, 3]], "expected": 2},
 {"args": [[0, 0]], "expected": 0},
 {"args": [[15, 15, 15]], "expected": 15},
 {"gen": "[Array.from({length: 2000}, () => Math.floor(Math.random() * (1 << 20)))]", "perf": true, "label": "N = 2,000"}]
```

<details><summary>Solution</summary>

```ts
function maxAndPair(nums: number[]): number {
  let best = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      best = Math.max(best, nums[i] & nums[j]);
    }
  }
  return best;
}
```
</details>

---

## In brief

- **Binary search needs a monotonic predicate,** not necessarily a sorted array: false…false, true…true.
- **Search on the answer** when "if k works, anything bigger works" — Koko, capacity, square root.
- **Rotated arrays:** one half is always sorted; decide which, then whether the target lies in it.
- **Bits are numbered from 0 on the right;** `1 << i` is the mask for bit i.
- **AND tests or clears, OR sets, XOR toggles;** `n & (n − 1)` drops the lowest set bit.
- **XOR cancels pairs:** x ^ x = 0, x ^ 0 = x, in any order.
- **JS bit operators work on signed 32-bit integers** — past 2³¹ use BigInt; two's complement makes −x = ~x + 1.

## Quiz

### MCQ: Which expression checks whether bit i of n is set?
- [ ] n & (1 << i) === 1
- [x] (n >> i) & 1
- [ ] n | (1 << i)
- [ ] n ^ (1 << i)
**Why:** Shift the bit down and mask it. The first option is doubly wrong: precedence, and the masked value is 2ⁱ, not 1.

### MCQ: What does `n & (n - 1)` do?
- [ ] Doubles n
- [x] Clears the lowest set bit
- [ ] Sets the lowest bit
- [ ] Toggles every bit
**Why:** Subtracting 1 flips the lowest set bit and every zero below it; AND clears exactly those.

### MCQ: XOR of every element in [4, 1, 2, 1, 2] is…
- [ ] 0
- [x] 4
- [ ] 10
- [ ] 1
**Why:** Pairs cancel (x ^ x = 0) regardless of order.

### MCQ: In two's complement, ~5 equals…
- [ ] -5
- [x] -6
- [ ] 4
- [ ] 5
**Why:** ~x = −x − 1, because x + ~x is all ones (−1).

### MCQ: `(1 << 31)` in JavaScript is…
- [ ] 2147483648
- [x] -2147483648
- [ ] 0
- [ ] Infinity
**Why:** Bitwise ops produce signed 32-bit results; bit 31 is the sign bit.

### MCQ: Which problems suit binary search on the answer?
- [ ] Any unsorted array search
- [x] Minimum speed/capacity where feasibility is monotonic
- [ ] Counting distinct elements
- [ ] Reversing a list
**Why:** If speed k works, every faster speed works — so search the smallest feasible k.

### MCQ: In a rotated sorted array, `nums[lo] <= nums[mid]` tells you…
- [ ] The array isn't rotated
- [x] The left half [lo..mid] is sorted
- [ ] The target is on the right
- [ ] mid is the pivot
**Why:** At least one half is always sorted; this comparison says it's the left.

### MCQ: Why is `(-3) % 2 === 1` a bug for testing oddness in JS?
- [ ] It's true for evens
- [x] JS % returns -1 for -3 % 2
- [ ] % doesn't work on negatives
- [ ] It's correct
**Why:** Use (n & 1) === 1 or n % 2 !== 0.

### MCQ: Dividing 6 by 2 repeatedly gives the remainders 0, 1, 1 (in that order). What is 6 in binary?
- [ ] 011
- [x] 110
- [ ] 101
- [ ] 100
**Why:** Remainders come out lowest bit first, so read them in reverse: 110 = 4 + 2.
