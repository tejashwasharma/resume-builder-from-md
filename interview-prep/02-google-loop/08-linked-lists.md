# Linked lists — pointer surgery under time pressure

Linked lists are rare in production JavaScript and common in interviews, for a
specific reason: they test whether you can hold a mutable pointer structure in
your head and not corrupt it. There is very little cleverness. There is a lot of
careful order-of-operations.

*In the Google round: a linked-list problem is a pointer-discipline check — reverse in groups, merge k, copy with random pointer — and the follow-up is almost always "now in O(1) space" or "now without modifying the input".*

The good news is that the whole topic is about **four idioms**. Learn those and
almost every linked-list problem is an assembly of them.

---

## The costs

| Operation | Singly linked | Array | Why the difference |
| --- | --- | --- | --- |
| Access the i-th element | **O(n)** | O(1) | You must walk from the head |
| Insert/delete at the head | **O(1)** | O(n) | No shifting |
| Insert/delete **given the node** | **O(1)** | O(n) | Just rewire two pointers |
| Insert/delete by value | **O(n)** | O(n) | Finding it dominates |
| Search | **O(n)** | O(n) | Same, but arrays win on cache |
| Memory per element | Higher | Lower | Every node stores a pointer too |

**The distinction that matters:** deletion is O(1) *given the node*, and O(n) if
you have to find it first. That caveat is why linked lists are almost never the
right production choice on their own — and why they're perfect in an **LRU
cache**, where a hash map hands you the node directly and the list only ever
does O(1) rewiring.

---

## How it actually works

```mermaid
flowchart LR
  H["head"] --> A["1 | next"]
  A --> B["2 | next"]
  B --> C["3 | next"]
  C --> N["null"]
```
*A chain of nodes, each holding a value and a reference to the next. `null` marks the end, and losing your only reference to a node loses the rest of the list with it.*

### Who's who

| Term | Meaning |
| --- | --- |
| **Node** | `{ val, next }` — a value plus a reference |
| **Head** | The first node. Lose it and you've lost the list |
| **Tail** | The last node; its `next` is `null` |
| **Singly linked** | Each node points forward only |
| **Doubly linked** | Each node has `prev` and `next` — needed for O(1) removal without the predecessor |
| **Circular** | The tail points back into the list rather than to `null` |
| **Dummy / sentinel node** | A fake node before the head, so the head needs no special case |

### The one thing that makes them hard

There is no going back and no random access. If you overwrite `node.next`
before you've saved it, the rest of the list is unreachable and gone. Every
linked-list bug is some version of that.

**So: draw it.** Three or four boxes with arrows, on paper or the whiteboard,
and physically move the arrows as you write each line. Everyone who is good at
these draws them. Trying to hold it purely in your head is how you produce code
that looks right and loses half the list.

---

## The four idioms

Almost every problem is these, combined.

### 1. The dummy head — kill the special case

Any problem where the head itself might be removed or replaced. Instead of
`if (head === null)` and `if (removing the head)` branches scattered through
your code, put a fake node in front and return `dummy.next` at the end.

```js
// Remove all nodes with a given value — no head special case anywhere
function removeElements(head, val) {
  const dummy = { val: 0, next: head };   // the whole trick
  let prev = dummy;
  while (prev.next) {
    if (prev.next.val === val) prev.next = prev.next.next;   // skip it
    else prev = prev.next;                                   // only advance if we kept it
  }
  return dummy.next;    // works even if the original head was removed
}
```

The `else` matters: if you advance `prev` after a deletion you skip the node you
just linked in, and consecutive matches survive.

**Use a dummy whenever the head can change.** Merging two lists, removing nodes,
partitioning, inserting in sorted order. It removes roughly half the bugs in the
topic.

### 2. Fast and slow pointers

One pointer moves one step, the other two. Three problems fall out of it.

**Find the middle** — when fast reaches the end, slow is at the middle.

```js
let slow = head, fast = head;
while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
// slow is now the middle (the second middle if the length is even)
```

The `fast && fast.next` guard is the whole correctness argument: it handles both
odd and even lengths without a null dereference. Getting that condition wrong is
the most common crash in the topic.

**Detect a cycle (Floyd's)** — if there is a loop, fast laps slow and they meet.
If there isn't, fast hits `null`.

**Find the cycle's start** — this is the part worth memorising, because it isn't
derivable in the moment. Once they meet, reset one pointer to the head and
advance both one step at a time; where they meet again is the entry to the loop.

```js
function detectCycleStart(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next; fast = fast.next.next;
    if (slow === fast) {                      // a cycle exists
      let p = head;
      while (p !== slow) { p = p.next; slow = slow.next; }
      return p;                               // the entry node
    }
  }
  return null;
}
```

**Find the k-th from the end** — the same idea with a fixed gap: advance one
pointer k steps, then move both together until the leader hits the end.

### 3. Reversal — the three-pointer dance

The single most important linked-list skill. Half the harder problems contain a
reversal.

```js
function reverse(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;   // 1. SAVE first — everything after depends on this
    curr.next = prev;         // 2. flip the arrow backwards
    prev = curr;              // 3. advance prev
    curr = next;              // 4. advance curr
  }
  return prev;                // curr is null; prev is the new head
}
```

Those four lines in that order, every time. **Line 1 is the one people drop**,
and dropping it severs the list at `curr` — you lose everything downstream on
the very first iteration.

Say the loop out loud as "save, flip, advance, advance". Practise it until you
can write it without thinking, because in a harder problem it'll be a subroutine
and you won't have attention to spare for it.

### 4. Merging two sorted lists

The building block for merge-sorting a list, and a dummy-head problem.

```js
function merge(a, b) {
  const dummy = { next: null };
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else                { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a ?? b;    // one list is exhausted; attach the rest wholesale
  return dummy.next;
}
```

The last line is the neat part: you don't loop over the remainder, you attach
it. Missing it and looping instead is correct but reads as less fluent.

---

## Putting the idioms together

The harder problems are compositions, and recognising that is the skill.

| Problem | = |
| --- | --- |
| Palindrome linked list, O(1) space | find middle + **reverse** second half + compare |
| Reorder list (`L0→Ln→L1→Ln-1…`) | find middle + **reverse** second half + **merge** alternately |
| Sort a linked list, O(n log n) | find middle + recurse + **merge** |
| Remove the n-th node from the end | **dummy** + fast/slow with a gap of n |
| Reverse in groups of k | **reverse** as a subroutine, k nodes at a time |
| Rotate right by k | find length, connect into a circle, walk to the new tail, break |

**Say the decomposition out loud** before you write anything: "this is find the
middle, reverse the second half, then compare — three pieces I know". That is a
much stronger opening than starting to type.

---

## The bugs

| Bug | Fix |
| --- | --- |
| **Losing the rest of the list** | Save `next` before you overwrite it. Always |
| **Null dereference on `fast.next.next`** | Guard with `while (fast && fast.next)` |
| **Head special cases everywhere** | Use a dummy node |
| **Advancing after a deletion** | Only advance `prev` when you *didn't* delete |
| **Off-by-one on "k-th from the end"** | Test on a two-node list; that's where it breaks |
| **Not restoring a mutated list** | If you reverse half a list to check a palindrome, some interviewers want it restored. Ask |
| **Infinite loop on a cycle** | Any traversal on possibly-cyclic input needs Floyd's or a visited `Set` |
| **Returning `head` after a dummy** | Return `dummy.next` — `head` may no longer be the head |

---

## Practice ladder

| # | Problem | What it teaches |
| --- | --- | --- |
| 1 | Reverse a linked list, iteratively | The three-pointer dance. Everything else needs it |
| 2 | Middle of a linked list | Fast/slow, and the `fast && fast.next` guard |
| 3 | Merge two sorted lists | Dummy head; attach-the-remainder |
| 4 | Remove n-th node from the end | Dummy + a fixed-gap two-pointer |
| 5 | Linked list has a cycle | Floyd's detection |
| 6 | Find where the cycle starts / remove the loop | The reset-to-head step |
| 7 | Palindrome linked list, O(1) space | Composition: middle + reverse + compare |
| 8 | Reorder list | Composition: middle + reverse + alternate merge |
| 9 | LRU cache | Doubly linked list + hash map. The one that's genuinely used in production |
| 10 | Reverse nodes in k-groups | Reversal as a subroutine with bookkeeping |
| 11 | Merge k sorted lists | Merge + a heap. Bridges to [heaps](11-heaps-and-top-k.md) |

**Exit test:** write `reverse` from memory in under two minutes, correct first
time, and then solve palindrome-linked-list by decomposing it out loud. If
reversal isn't automatic, nothing above rung 6 will be.

---

## Data structures

| Need | Use | Note |
| --- | --- | --- |
| A node | A plain object `{ val, next }` | No class needed. Interviewers usually supply the definition |
| A doubly linked node | `{ val, prev, next }` | Required for O(1) removal when you don't have the predecessor |
| Avoiding head special cases | A dummy node | `{ next: head }`, return `dummy.next` |
| Cycle detection | Two pointers | O(1) space. A `Set` of visited nodes also works but costs O(n) |
| LRU cache | `Map` + doubly linked list | The map gives O(1) find, the list gives O(1) reorder |

**Pseudocode — the LRU cache, since it's the one that shows up most**

```js
// O(1) get and put. The hash map finds the node; the list keeps the order.
// Sentinel head and tail remove every edge case at the boundaries.
class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.map = new Map();                       // key -> node
    this.head = { };                            // sentinel: most-recent side
    this.tail = { };                            // sentinel: least-recent side
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  #remove(node) {                               // O(1) — needs prev, hence doubly linked
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  #addFront(node) {                             // insert just after head
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) return -1;
    this.#remove(node);                         // touching it makes it most-recent
    this.#addFront(node);
    return node.val;
  }

  put(key, val) {
    if (this.map.has(key)) this.#remove(this.map.get(key));
    const node = { key, val };
    this.#addFront(node);
    this.map.set(key, node);

    if (this.map.size > this.cap) {
      const lru = this.tail.prev;               // the node just before the tail sentinel
      this.#remove(lru);
      this.map.delete(lru.key);                 // node stores `key` SO we can do this
    }
  }
}
```

Two details are the whole design. The node stores its own `key` — without it you
couldn't delete the evicted entry from the map, because you'd have the node but
not its key. And the list must be **doubly** linked: eviction removes the node
before the tail, and removing a node in O(1) requires knowing its predecessor.

---

## Worked problems

Node shape used throughout: `{ val, next }`, with `random` where stated.

### Q: Reverse nodes in k-groups — reverse every consecutive block of k nodes, leaving a short tail alone
**Level:** senior · **Tags:** google-coding, linked-list, reversal, dummy-head

<details><summary>Model answer</summary>

**Problem.** `1→2→3→4→5, k=2` → `2→1→4→3→5`. `k=3` → `3→2→1→4→5`.

**Clarify first.** In place, O(1) extra space? (Yes.) What happens to a
trailing group shorter than `k`? (Left as-is.) `k = 1` or `k > length`?
(Return the list unchanged.)

**Brute force.** Copy to an array, reverse slices, rebuild. O(n) time but O(n)
space and it dodges the pointer work the question exists to test.

**The insight.** Reversing a group is the standard three-pointer reversal; the
difficulty is stitching. Keep a `prevTail` pointing at the node *before* the
group. Before reversing, walk `k` ahead to confirm the group is full. After
reversing `k` nodes, the old group head is the new tail, so link
`prevTail.next` to the new head and the new tail to whatever comes next.

**Algorithm.**
1. `dummy → head`; `prevTail = dummy`.
2. Loop: check there are `k` nodes after `prevTail`; if not, stop.
3. Reverse exactly `k` nodes starting at `prevTail.next`, remembering
   `groupHead` (becomes the tail).
4. `prevTail.next = newHead`; `groupHead.next = nodeAfterGroup`;
   `prevTail = groupHead`.

```js
function reverseKGroup(head, k) {
  const dummy = { val: 0, next: head };
  let prevTail = dummy;

  while (true) {
    // 1. Is there a full group ahead?
    let probe = prevTail;
    for (let i = 0; i < k && probe; i++) probe = probe.next;
    if (!probe) break;                        // fewer than k nodes remain

    // 2. Reverse k nodes starting at prevTail.next
    const groupHead = prevTail.next;          // will become the group's tail
    let prev = probe.next;                    // node after the group — reversal ends here
    let cur = groupHead;
    for (let i = 0; i < k; i++) {
      const nxt = cur.next;
      cur.next = prev;
      prev = cur;
      cur = nxt;
    }
    // 3. Stitch: prev is the new head, groupHead the new tail
    prevTail.next = prev;
    prevTail = groupHead;
  }
  return dummy.next;
}
```

Starting `prev` at `probe.next` instead of `null` is what makes the stitch
one line: the reversed tail already points at the rest of the list.

**Complexity.** O(n) time — each node is visited by the probe once and
reversed once. O(1) space.

**Test it.**
- `1→2→3→4→5, k=2` → `2→1→4→3→5`.
- `k=3` → `3→2→1→4→5`; the tail `4→5` is untouched.
- `k=1` → unchanged; `k=5` on 5 nodes → fully reversed.
- Single node, `k=2` → unchanged.

**What the interviewer is checking.** That you check the group is full
*before* touching pointers, and that you never lose the reference to the rest
of the list.

</details>

**Follow-ups:**

1. Q: Reverse the trailing short group too.
   <details><summary>Answer</summary>

   Drop the probe check's early `break`: on the last iteration set `k` to the
   remaining count and reverse that. Equivalent: when `probe` is null,
   compute how many nodes remain and reverse them with the same loop.

   </details>

2. Q: Do it recursively — what's the trade-off?
   <details><summary>Answer</summary>

   Reverse the first `k`, then set the group's tail `next` to
   `reverseKGroup(rest, k)`. Cleaner to read, but O(n/k) stack depth, which
   for `k = 1` on a million-node list overflows. In an interview say that
   trade-off out loud and stay iterative.

   </details>

### Q: Merge k sorted lists — combine k sorted linked lists into one sorted list
**Level:** intermediate · **Tags:** google-coding, linked-list, heap, divide-and-conquer

<details><summary>Model answer</summary>

**Problem.** `[[1,4,5],[1,3,4],[2,6]]` → `1→1→2→3→4→4→5→6`.

**Clarify first.** Total nodes `N`, list count `k`? (Both large.) Can lists be
empty or `k = 0`? (Yes.) Stable — for ties, does order across lists matter?
(No.)

**Brute force.** Collect every value, sort, rebuild: O(N log N), O(N) space.
Or merge lists one at a time into an accumulator: O(N · k), because early
nodes are re-walked in every merge.

**The insight.** Only the current head of each list can be the next output
node, so a min-heap of `k` heads gives the next node in O(log k). Alternative
with the same bound: merge pairs of lists, halving `k` each round —
`log k` rounds of O(N) work. The divide-and-conquer version needs no heap
class, which matters in JavaScript, where there isn't one built in.

**Algorithm.** (Divide and conquer.)
1. While more than one list remains, merge lists `i` and `i + 1` pairwise into
   a new array.
2. `mergeTwo` is the standard dummy-head merge.
3. Return the single remaining list.

```js
function mergeTwo(a, b) {
  const dummy = { val: 0, next: null };
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else                { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a ?? b;              // whichever list still has nodes
  return dummy.next;
}

function mergeKLists(lists) {
  if (lists.length === 0) return null;
  while (lists.length > 1) {
    const next = [];
    for (let i = 0; i < lists.length; i += 2) {
      next.push(i + 1 < lists.length ? mergeTwo(lists[i], lists[i + 1]) : lists[i]);
    }
    lists = next;
  }
  return lists[0];
}
```

**Complexity.** O(N log k) time — each node participates in `log k` merges.
O(1) extra beyond the output (O(k) for the round array).

**Test it.**
- The example → `1→1→2→3→4→4→5→6`.
- `[]` → `null`; `[null]` → `null`; `[null, 1→2]` → `1→2`.
- Odd `k` — the last list carries over unmerged for a round.

**What the interviewer is checking.** That you reject the O(N·k) sequential
merge with a reason, and that you know the heap bound even if you write the
pairwise version.

</details>

**Follow-ups:**

1. Q: Write the heap version. What does it cost, and when would you prefer it?
   <details><summary>Answer</summary>

   Push each non-null head into a min-heap keyed on `val`; pop the min, append
   it, push its `next` if any. O(N log k) time, O(k) heap. Prefer it when the
   lists are *streams* — you cannot pairwise-merge inputs you have not fully
   received, but a heap of current heads works incrementally. In JS you write
   a small binary heap (see [heaps](11-heaps-and-top-k.md)).

   </details>

2. Q: Merge k sorted arrays instead — does anything change?
   <details><summary>Answer</summary>

   Heap entries become `(value, arrayIndex, position)` and you advance the
   position instead of following `next`. Same O(N log k). External-sort merge
   phases are exactly this with disk-backed runs.

   </details>

### Q: Copy list with random pointer — deep-copy a list where each node also points to an arbitrary node
**Level:** senior · **Tags:** google-coding, linked-list, hash-map, interleaving

<details><summary>Model answer</summary>

**Problem.** Each node has `next` and `random` (any node or `null`). Return a
deep copy: new nodes, with `next` and `random` wired to the *copies*.

**Clarify first.** Can `random` point to the node itself? (Yes.) O(n) extra
space acceptable, or O(1) required? (Start with the map; offer O(1).) Must the
original be left intact? (Yes — so the O(1) trick must restore it.)

**Brute force.** For each node, find the index of its `random` target by
walking from the head, then set the copy's `random` by index: O(n²).

**The insight.** Two passes with a `Map` from original → copy: first create
all copies (so every target exists), then wire `next` and `random` through the
map. The O(1)-space version replaces the map with the list itself: interleave
each copy directly after its original (`A → A' → B → B'`), so `A'.random` is
simply `A.random.next`. Then unweave.

**Algorithm.** (Interleaving.)
1. Insert a copy after every node.
2. For each original `n`: `n.next.random = n.random ? n.random.next : null`.
3. Separate the two lists, restoring the original's `next` pointers.

```js
function copyRandomList(head) {
  if (!head) return null;

  // 1. Interleave copies: A → A' → B → B' ...
  for (let n = head; n; n = n.next.next) {
    n.next = { val: n.val, next: n.next, random: null };
  }
  // 2. Wire random on the copies via the original's random.next
  for (let n = head; n; n = n.next.next) {
    if (n.random) n.next.random = n.random.next;
  }
  // 3. Unweave, restoring the original
  const copyHead = head.next;
  for (let n = head; n; n = n.next) {
    const copy = n.next;
    n.next = copy.next;                 // restore original's next
    copy.next = copy.next ? copy.next.next : null;
  }
  return copyHead;
}
```

Step 3 must read `copy.next.next` *before* the original list is fully
restored — the loop above does that correctly because it restores `n.next`
first, then uses the original's (now-correct) `next` to find the next copy.

**Complexity.** O(n) time, O(1) extra space (the copies themselves are the
required output).

**Test it.**
- `1(random→3) → 2(random→1) → 3(random→null)`: copies' randoms point to
  the copies of 3, 1 and null respectively; original unchanged afterward.
- Single node whose `random` is itself → copy's `random` is the copy.
- `null` → `null`.

**What the interviewer is checking.** That the map version comes out cleanly
first, and that the interleave version leaves the original intact — walk the
original afterward and show it.

</details>

**Follow-ups:**

1. Q: Write the map version and compare.
   <details><summary>Answer</summary>

   ```js
   const m = new Map();
   for (let n = head; n; n = n.next) m.set(n, { val: n.val, next: null, random: null });
   for (let n = head; n; n = n.next) {
     m.get(n).next = m.get(n.next) ?? null;
     m.get(n).random = m.get(n.random) ?? null;
   }
   return m.get(head) ?? null;
   ```
   O(n) time, O(n) space, and the original is never touched — safer if the
   list is shared with other readers while you copy.

   </details>

2. Q: Generalise: deep-copy an arbitrary graph.
   <details><summary>Answer</summary>

   The map version *is* graph cloning: BFS/DFS from a start node, `Map`
   original → clone, and for each edge wire the clone's neighbour to the
   clone of the neighbour, creating it on first sight. The interleave trick
   is list-specific — a graph has no spare `next` slot to hide a copy in.

   </details>

### Q: Linked list cycle II — return the node where the cycle begins, or null
**Level:** intermediate · **Tags:** google-coding, linked-list, fast-slow-pointers, floyd

<details><summary>Model answer</summary>

**Problem.** Given the head, return the first node of the cycle if one exists;
otherwise `null`. O(1) space.

**Clarify first.** May we mark nodes (mutate)? (No.) Is a `Set` of visited
nodes acceptable as a first answer? (Yes, but O(n) space — the ask is O(1).)

**Brute force.** Walk with a `Set`; the first repeated node is the answer.
O(n) time, O(n) space.

**The insight.** Floyd's: a slow pointer moving 1 and a fast pointer moving 2
meet inside the cycle if one exists. Let the tail before the cycle be length
`a`, the cycle length `c`, and the meeting point `b` steps into the cycle.
Slow has walked `a + b`; fast `2(a + b)`. Fast's extra `a + b` is a whole
number of laps, so `a + b ≡ 0 (mod c)`, i.e. `a ≡ c − b (mod c)`. So from the
meeting point, `a` more steps lands at the cycle start — the same distance the
head is from it. Reset one pointer to the head and advance both by 1.

**Algorithm.**
1. `slow = fast = head`. Advance until they meet or `fast` hits null.
2. If null → no cycle.
3. `p = head`; advance `p` and `slow` by one each until equal. That node is the
   start.

```js
function detectCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {                    // met inside the cycle
      let p = head;
      while (p !== slow) { p = p.next; slow = slow.next; }
      return p;
    }
  }
  return null;
}
```

**Complexity.** O(n) time, O(1) space.

**Test it.**
- `3→2→0→−4→(back to 2)` → node `2`.
- `1→2→(back to 1)` → node `1`.
- `1` alone, no cycle → `null`; empty → `null`.
- Cycle from the head itself: the meeting point may equal the head; the
  second loop exits immediately.

**What the interviewer is checking.** The modular argument. Most candidates
know the trick; senior candidates can prove it in three sentences.

</details>

**Follow-ups:**

1. Q: Return the cycle length.
   <details><summary>Answer</summary>

   From the meeting point, advance one pointer until it returns to that
   node, counting steps. O(c).

   </details>

2. Q: Same idea, different disguise: find the duplicate in an array of n+1 integers in 1..n without modifying it.
   <details><summary>Answer</summary>

   Treat `i → nums[i]` as a linked list; a duplicate value means two indices
   point to the same node, i.e. a cycle, and the cycle entry is the
   duplicate. Run exactly this algorithm on `nums` with `next = nums[i]`.
   O(n) time, O(1) space, input untouched.

   </details>

---


## Interview Q&A

### Q: Reverse a linked list. Then explain why the order of operations matters.
**Level:** foundation · **Tags:** dsa, linked-lists, pointers

<details><summary>Model answer</summary>

Three pointers: `prev` starting at null, `curr` at the head, and a temporary
`next` inside the loop. Each iteration: save `curr.next` into `next`, point
`curr.next` at `prev`, move `prev` to `curr`, move `curr` to `next`. When `curr`
is null, `prev` is the new head.

The order matters because the moment I write `curr.next = prev` I have destroyed
my only reference to the rest of the list. Nothing else points to it — that's
what a singly linked list means. So saving `next` first isn't tidiness, it's the
difference between reversing the list and truncating it to one node.

That's really the general lesson for the whole topic: in a singly linked list
every node is reachable through exactly one pointer, so overwriting a pointer
before saving it loses everything downstream permanently.

It's O(n) time and O(1) space. There's a recursive version that's arguably
prettier, but it's O(n) stack space and will overflow on a long list, so I'd
write the iterative one and mention the recursive one exists.

</details>

**Follow-ups:**

1. Q: How would you check whether a linked list is a palindrome in O(1) space?
   <details><summary>Answer</summary>

   Three steps, all of which are idioms I already have.

   Find the middle with fast and slow pointers. Reverse the second half in
   place. Then walk one pointer from the head and one from the new head of the
   reversed half, comparing values until one runs out. If every pair matched,
   it's a palindrome.

   O(n) time, O(1) space. The naive alternative — copy the values into an array
   and use two pointers — is much easier to write but O(n) space, so I'd offer
   it as the baseline and then do this if O(1) is required.

   The thing I'd raise unprompted is that this mutates the input. Some
   interviewers care, and it's a legitimate objection if other code holds a
   reference to that list. If it matters, I reverse the second half back before
   returning, which is another O(n/2) pass and keeps the same complexity.

   </details>

2. Q: When would you use a linked list over an array in real code?
   <details><summary>Answer</summary>

   Rarely on its own, and I'd say that directly, because arrays win on random
   access and cache locality and those dominate most workloads.

   The genuine case is when you have O(1) access to the node already and need
   O(1) structural change. LRU cache is the canonical one: a hash map maps key
   to node, so finding is O(1), and then moving that node to the front is
   pointer rewiring rather than shifting an array. That combination is why every
   real LRU implementation is a hash map plus a doubly linked list.

   The other case is splicing — moving a run of elements between structures
   without copying, which is why intrusive lists show up in kernels and
   allocators.

   What people usually cite — "insertion is O(1)" — is misleading, because
   finding the position is still O(n), so insert-by-value is O(n) either way.
   The array often wins in practice even then, because shifting contiguous
   memory is extremely fast compared to chasing pointers across the heap.

   </details>

### Q: How do you detect a cycle in a linked list, and find where it starts?
**Level:** intermediate · **Tags:** dsa, linked-lists, two-pointers

<details><summary>Model answer</summary>

Floyd's cycle detection — two pointers, one moving a step at a time and one
moving two.

For detection: if there's no cycle, the fast pointer reaches null and I'm done.
If there is one, the fast pointer enters the loop and gains on the slow one by
one node per iteration, so it must eventually land on it. They meet, and that
proves a cycle exists. O(n) time, O(1) space.

Finding the entry point is the part I'd say up front I know rather than derive:
once they meet, reset one pointer to the head and advance both one step at a
time. Where they meet the second time is the start of the cycle.

The reason it works is a distance argument. If the distance from head to the
cycle entry is `a`, and from the entry to the meeting point is `b`, and the
cycle length is `c`, then when they meet the slow pointer has travelled `a + b`
and the fast one has travelled twice that. The difference is a whole number of
loops, and the algebra reduces to `a` being congruent to the remaining distance
from the meeting point back round to the entry. So a pointer from the head and a
pointer from the meeting point, both moving one step, arrive at the entry
together.

The alternative is a `Set` of visited nodes, which is O(n) space but takes ten
seconds to write and is honestly fine if nobody has asked for O(1). I'd mention
both and let the constraint decide.

</details>

**Follow-ups:**

1. Q: How do you actually remove the loop once you've found it?
   <details><summary>Answer</summary>

   Find the entry node as above, then find the node whose `next` points at it
   and set that to null.

   Concretely: once I have the cycle entry, walk round the loop from the entry
   until I find the node whose `next` is the entry again — that's the last node
   of the loop. Setting its `next` to null breaks the cycle and leaves a proper
   null-terminated list.

   The edge case worth naming is a loop back to the head itself, where the entry
   is the head. The walk still works — I go all the way round and find the tail
   — but a naive implementation that starts from `head.next` and assumes the
   entry is somewhere in the middle will miss it.

   </details>

---

## What a weak answer sounds like

- **Overwriting `next` before saving it.** The defining bug of the topic.
- **`while (fast.next && fast)`** — wrong order, and it crashes. Null-check the
  thing before you dereference it.
- **Head special cases scattered through the code** instead of a dummy node.
- **Recursive reversal with no mention of stack depth.** It's O(n) space and
  overflows on a long list.
- **"Linked lists are better for insertion"** with no caveat that finding the
  position is still O(n).
- **Not drawing it.** Everyone who is reliably good at these draws three boxes
  and moves the arrows. Trying to hold it in your head is how the bugs get in.
- **Traversing possibly-cyclic input with a plain `while (node)`** — that's an
  infinite loop.

---

## Glossary

- **Node** — `{ val, next }`; a value and a reference.
- **Head / tail** — first and last nodes.
- **Singly / doubly linked** — forward pointers only, versus `prev` and `next`.
- **Circular list** — the tail points back into the list.
- **Dummy (sentinel) node** — a fake node before the head, removing head special cases.
- **Fast/slow pointers** — one step versus two; finds middles, cycles and k-from-end.
- **Floyd's cycle detection** — the fast/slow meeting argument, plus the reset-to-head step for the entry.
- **Three-pointer reversal** — save, flip, advance, advance.
- **Splice** — moving nodes between structures by rewiring rather than copying.
- **Intrusive list** — the list pointers live inside the payload object, avoiding a wrapper allocation.
