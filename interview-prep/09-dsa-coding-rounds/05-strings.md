# Strings — arrays with sharp edges

A string is an array of characters, so nearly every array technique transfers.
What makes strings their own chapter is that they are **immutable** in
JavaScript, they have a **bounded alphabet** you can exploit, and they carry a
set of encoding traps that will bite you on exactly the input an interviewer
picks to test you.

---

## The costs

| Operation | Cost | Note |
| --- | --- | --- |
| `s[i]` / `s.charCodeAt(i)` | **O(1)** | Index access is cheap |
| `s.length` | **O(1)** | Stored, not counted |
| **Concatenation** `s += c` | **O(n)** | Strings are immutable — this builds a whole new string |
| Building a string in a loop | **O(n²)** if you `+=` | Push into an array and `join('')` at the end: O(n) |
| `s.slice(i, j)` / `substring` | **O(j - i)** | It copies. A "free" slice inside a loop is a hidden O(n²) |
| `s.includes` / `indexOf` | **O(n × m)** worst case | Naive search. KMP is O(n + m) if you're asked |
| Sorting the characters | **O(n log n)** | Or O(n) with counting sort over a fixed alphabet |
| Comparing two strings | **O(n)** | Not O(1) — they compare character by character |

**The two that decide your complexity:** building with `+=` in a loop is O(n²),
and slicing inside a loop is O(n²). Both look innocent. Both are the reason an
otherwise correct solution times out.

```js
// O(n²) — every += allocates a new string and copies everything so far
let out = '';
for (const c of s) out += transform(c);

// O(n) — the standard fix
const parts = [];
for (const c of s) parts.push(transform(c));
const out = parts.join('');
```

---

## How it actually works

```mermaid
flowchart TD
  A["String = immutable<br/>sequence of UTF-16 code units"]
  A --> B["s[i] is O(1)<br/>→ all array techniques apply"]
  A --> C["Immutable → every 'edit'<br/>allocates a new string"]
  C --> D["Build with an array + join,<br/>never += in a loop"]
  A --> E["Bounded alphabet<br/>→ a 26- or 128-slot count array<br/>replaces a hash map"]
```
*Three properties drive every string technique: indexable like an array, immutable so edits are expensive, and drawn from a small alphabet so counting is cheap.*

### Who's who

| Term | Meaning |
| --- | --- |
| **Substring** | **Contiguous.** `"ell"` in `"hello"` |
| **Subsequence** | In order, gaps allowed. `"hlo"` in `"hello"` |
| **Anagram** | Same characters, any order — so equal character *counts* |
| **Palindrome** | Reads the same both ways |
| **Prefix / suffix** | A run from the start / from the end |
| **Alphabet** | The set of possible characters. Usually 26 lowercase, or 128 ASCII |
| **Code unit** | What JS indexes. **Not** always a whole character — see below |

**Substring vs subsequence is the same trap as subarray vs subsequence**, and it
picks your technique the same way: substrings are sliding windows, subsequences
are DP.

### The bounded alphabet is a free optimisation

If the input is "lowercase English letters", you have 26 possible characters. A
fixed 26-slot array replaces a hash map: no hashing, better cache behaviour, and
comparing two frequency arrays is a fixed 26-step loop rather than a map
traversal.

```js
// Frequency of 'a'..'z' with no Map at all
const count = new Array(26).fill(0);
for (const c of s) count[c.charCodeAt(0) - 97]++;   // 97 is 'a'
```

Say "the problem says lowercase letters, so I'll use a 26-element count array
rather than a map" out loud. It's a small thing that reads as fluency.

---

## The techniques

### 1. Frequency counting

The workhorse. Anagrams, permutations, "can we rearrange into a palindrome",
character-replacement windows — all frequency-count problems.

**Anagram check:** count characters in the first, decrement for the second, and
everything must land at zero. O(n), and better than the sort-both-and-compare
answer at O(n log n) — say both, then pick.

**Palindrome-rearrangeable check:** at most one character may have an odd count.
That one sentence is the whole problem.

### 2. Sliding window with counts

Substring problems with a constraint. Grow the right edge, shrink the left when
invalid, maintain a count map as you go.

```js
// Longest substring with at most k distinct characters
const count = new Map();
let left = 0, best = 0;
for (let right = 0; right < s.length; right++) {
  count.set(s[right], (count.get(s[right]) ?? 0) + 1);
  while (count.size > k) {                      // invalid — shrink from the left
    const c = s[left++];
    const n = count.get(c) - 1;
    if (n === 0) count.delete(c); else count.set(c, n);  // delete, or size lies
  }
  best = Math.max(best, right - left + 1);
}
```

**The `count.delete(c)` is the bug people ship.** Leaving a zero-count entry in
the map means `count.size` keeps counting a character that's no longer in the
window, and the window never shrinks correctly.

### 3. Two pointers from the ends

Palindromes, reversal, comparing from both sides.

```js
// Valid palindrome, ignoring non-alphanumerics and case
let l = 0, r = s.length - 1;
while (l < r) {
  while (l < r && !isAlnum(s[l])) l++;      // skip junk from the left
  while (l < r && !isAlnum(s[r])) r--;      // and the right
  if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;
  l++; r--;
}
return true;
```

The inner `l < r` guards matter: without them a string of pure punctuation walks
the pointers past each other and off the end.

### 4. Expand around centre

For palindromic substrings. Every palindrome has a centre, so try all 2n-1 of
them — n single characters and n-1 gaps between characters — and expand outward
while the ends match.

**The gaps are the part people forget**, and forgetting them silently loses
every even-length palindrome. O(n²) time, O(1) space, and it beats the DP
solution on space while being easier to write.

### 5. Build with an array, join at the end

Any time you're constructing output. Covered above, and it's the difference
between passing and timing out.

### 6. Encode state as a canonical key

Group anagrams by sorted characters, or by a frequency signature. The move is
turning "are these equivalent?" into "do these produce the same key?", which
makes a hash map applicable.

```js
// Group anagrams. The key IS the technique.
const groups = new Map();
for (const word of words) {
  const key = [...word].sort().join('');   // or a 26-slot count, joined
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(word);
}
```

### 7. Trie, for prefix work

Autocomplete, "does any word start with", dictionary matching. Covered under
[data structures](#data-structures) below.

---

## The encoding traps

Interviewers who know JavaScript reach for these deliberately.

| Trap | What happens | The fix |
| --- | --- | --- |
| **`s.length` isn't character count** | JS indexes UTF-16 code units. An emoji or a rare CJK character is a surrogate pair — two "characters" | `[...s]` or `Array.from(s)` iterates real code points |
| **`s.reverse()` doesn't exist** | Strings have no `reverse` | `[...s].reverse().join('')` |
| **Case comparison** | `'A' !== 'a'` | Normalise both sides once, up front |
| **`charCodeAt` vs `codePointAt`** | `charCodeAt` returns half a surrogate pair | `codePointAt` for non-ASCII |
| **Accents** | `"é"` can be one code point or `e` + a combining accent, and they aren't `===` | `s.normalize('NFC')` |
| **Locale sorting** | `'a' < 'B'` is false by code point, true by dictionary order | `localeCompare` if human ordering matters |

You will not usually be asked to *handle* Unicode. You will sometimes be asked
whether you *know*. "This assumes ASCII — with full Unicode I'd iterate code
points with `[...s]`, since `length` counts UTF-16 units" is the answer that
lands.

---

## The bugs

| Bug | Fix |
| --- | --- |
| `+=` in a loop | Array + `join('')` |
| `slice()` inside a loop | Track indices; slice once at the end |
| Zero-count entries left in a window map | `delete` when the count hits zero, or `size` lies |
| Forgetting even-length palindromes | Expand around gaps as well as characters |
| Off-by-one on `right - left + 1` | Window length is inclusive of both ends. Check it on a two-character example |
| Comparing case-sensitively by accident | Normalise once at the top |
| Assuming lowercase-only | Ask about the alphabet. It decides whether a 26-slot array is legal |

---

## Practice ladder

| # | Problem | What it teaches |
| --- | --- | --- |
| 1 | Reverse a string | Two pointers; the array/join idiom |
| 2 | Valid palindrome, ignoring punctuation | Two pointers with skip guards |
| 3 | Valid anagram | Frequency counting; the 26-slot array |
| 4 | First non-repeating character | Two passes with a count map |
| 5 | Group anagrams | Canonical key as a hash key |
| 6 | Longest substring without repeating characters | Sliding window with last-seen indices |
| 7 | Longest substring with at most k distinct | Sliding window with a count map, and the delete-on-zero bug |
| 8 | Longest repeating character replacement | Window validity as "length − most frequent ≤ k" |
| 9 | Longest palindromic substring | Expand around centre, including the gaps |
| 10 | Minimum window substring | The hardest common window: two maps and a satisfied-count |
| 11 | String compression, in place | Read/write pointers on a character array |
| 12 | Implement `strStr` / `indexOf` | Naive O(n×m); mention KMP exists |

**Exit test:** minimum window substring, working, in under 35 minutes. It
combines a count map, a window, and a "how many requirements are currently
satisfied" counter — if that one is solid, the pattern genuinely is.

---

## Data structures

| Need | Use | Note |
| --- | --- | --- |
| Character frequency, known alphabet | `new Array(26).fill(0)` | Index with `c.charCodeAt(0) - 97`. Faster than a `Map` and trivially comparable |
| Character frequency, unknown alphabet | `Map` | Handles any code point; `delete` on zero |
| Seen-before set of characters | `Set` | Or a bitmask integer for 26 letters, if asked to golf space |
| Building output | `Array` + `join('')` | Never `+=` in a loop |
| Working "in place" on a string | `[...s]` to a char array | JS strings are immutable; the array is the mutable stand-in |
| Prefix / dictionary lookup | **Trie** | Nested objects, one level per character |
| Substring search, optimal | KMP failure table | Know it exists; implement only if asked |

**Pseudocode — a trie, since it's the one string structure you must build yourself**

```js
class Trie {
  constructor() { this.root = {}; }

  insert(word) {
    let node = this.root;
    for (const c of word) node = (node[c] ??= {});   // create the level if absent
    node.$ = true;   // sentinel marking end-of-word. '$' can't collide with a
                     // character key, which is why it's a symbol-ish choice
  }

  // The two lookups differ by ONE line, which is the whole point of a trie:
  // walking the prefix is the shared work.
  startsWith(prefix) { return this.#walk(prefix) !== null; }
  has(word) { const n = this.#walk(word); return n !== null && n.$ === true; }

  #walk(s) {
    let node = this.root;
    for (const c of s) {
      if (!node[c]) return null;
      node = node[c];
    }
    return node;
  }
}
```

Insert and lookup are both **O(length of the word)** — independent of how many
words the trie holds, which is the property that makes it worth building.
A hash map matches whole words in O(1) but cannot answer "does anything start
with this" without scanning everything.

---

## Interview Q&A

### Q: Why is building a string in a loop with `+=` a problem, and what do you do instead?
**Level:** foundation · **Tags:** dsa, strings, complexity

<details><summary>Model answer</summary>

Because strings are immutable, so `+=` doesn't append — it allocates a brand new
string and copies everything accumulated so far into it.

That makes each concatenation O(current length), and doing it n times gives
1 + 2 + 3 + … + n, which is O(n²). It's invisible in the code — the loop looks
linear — which is exactly why it catches people out on large inputs.

The fix is to push the pieces into an array and `join('')` at the end. Array
push is amortised O(1), and the join is a single O(n) pass, so the whole thing
is O(n). Same idea as a StringBuilder in Java or `''.join()` in Python.

The related trap is slicing inside a loop. `s.slice(i, j)` copies, so it costs
O(j − i), and a slice inside a scan is another hidden O(n²). The fix is to work
with indices and only materialise the substring once you know which one you
want.

Both matter because a string problem with n up to 10⁵ will time out on the
quadratic version while looking completely correct.

</details>

**Follow-ups:**

1. Q: What's the difference between a substring and a subsequence, and how does it change your approach?
   <details><summary>Answer</summary>

   A substring is contiguous; a subsequence keeps order but allows gaps.
   "ell" is a substring of "hello", "hlo" is a subsequence.

   It decides the technique. Contiguity is what makes a sliding window legal —
   every candidate is a window with two edges, so I can grow right and shrink
   left and cover the whole space in O(n). A subsequence has no such structure:
   at every character I choose include or skip, which is a binary decision tree,
   so it's DP or backtracking.

   Concretely: "longest substring without repeating characters" is a sliding
   window, O(n). "Longest common subsequence" is 2-D DP, O(n×m). Reading one as
   the other means the technique cannot work however well I code it.

   So it's a clarifying question I'd ask if the wording is at all ambiguous — it
   has the biggest single effect on the approach of anything I could ask about a
   string problem.

   </details>

2. Q: How would you check whether two strings are anagrams?
   <details><summary>Answer</summary>

   Two answers, and I'd give both then pick.

   Sort both and compare: three lines, O(n log n), and it's what I'd write if
   clarity mattered more than speed.

   Better: count characters. One pass incrementing counts for the first string,
   one pass decrementing for the second, then check everything is zero. O(n)
   time. If the alphabet is known to be lowercase English, I'd use a 26-element
   array rather than a map — no hashing, and the final check is a fixed 26-step
   loop.

   The early exit is worth mentioning: if the lengths differ they can't be
   anagrams, so that's the first line.

   Two clarifications I'd actually ask about. Is it case-sensitive, and do
   spaces and punctuation count — because "anagram" in a puzzle sense usually
   ignores both, and in a string-processing sense usually doesn't. And if
   Unicode is in play I'd flag that `length` counts UTF-16 units rather than
   characters, so I'd iterate with the spread operator instead of by index.

   </details>

### Q: Design a data structure for autocomplete.
**Level:** intermediate · **Tags:** dsa, strings, trie, design

<details><summary>Model answer</summary>

A trie — a prefix tree, where each node is a character and each path from the
root spells a prefix.

The reason it beats the obvious alternatives is the shape of the query. A hash
map of whole words answers "is this a word" in O(1) but can't answer "what
starts with 'appl'" without scanning every key. A sorted array with binary
search can find the prefix range in O(log n × length), which is genuinely
workable — but insertion is O(n) because of the shifting.

A trie gives lookup and insertion in O(length of the word), completely
independent of how many words it holds, and prefix search is the natural
operation rather than a workaround: walk the prefix, then collect everything in
the subtree below it.

For actual autocomplete I'd extend it in two ways. Store a popularity score at
each end-of-word node, and cache the top k completions at each node so a query
is a walk plus a read rather than a walk plus a subtree traversal. That trades
memory and update cost for query latency, which is the right trade when reads
massively outnumber writes — which for autocomplete they do.

The cost to be honest about is memory: a node per character per branch is
heavy. If that mattered I'd mention a radix tree, which compresses chains of
single-child nodes into one edge, or a DAWG if the word set is static.

</details>

**Follow-ups:**

1. Q: What's the complexity of trie insert and lookup, and why is that better than a hash map here?
   <details><summary>Answer</summary>

   Both are O(L) where L is the length of the word — critically, independent of
   n, the number of words stored. Space is O(total characters) in the worst
   case, less in practice because common prefixes are shared, which is the other
   thing you're buying.

   Against a hash map: for exact lookup a hash map is O(L) too — people say O(1)
   but you still have to hash the string, which reads all L characters — so
   they're comparable, and the hash map has a better constant.

   The difference is prefix queries. A hash map has no notion of prefixes; keys
   are opaque after hashing, so "everything starting with 'appl'" means scanning
   every key, O(n × L). A trie answers it by walking four nodes and then
   traversing the subtree — proportional to the number of matches, not the size
   of the dictionary.

   So the honest summary is that a trie isn't faster for exact lookup; it's that
   it supports a query a hash map structurally cannot.

   </details>

---

## What a weak answer sounds like

- **`+=` in a loop** with no acknowledgement it's O(n²).
- **`s.reverse()`**, which doesn't exist on strings.
- **`arr.sort()` on characters with no comparator** — same string-sort trap as
  arrays, and it silently works for lowercase ASCII, which makes it worse.
- **Leaving zero-count entries in a sliding-window map**, so `size` is wrong and
  the window never shrinks properly.
- **Missing even-length palindromes** by only expanding around single characters.
- **Assuming ASCII without saying so.** Assuming it is fine; not knowing you
  assumed it isn't.
- **Reaching for a hash map when the alphabet is 26 letters.** A fixed count
  array is simpler, faster, and shows you read the constraints.

---

## Glossary

- **Immutable** — cannot be changed in place; every edit allocates a new string.
- **Substring** — contiguous run of characters.
- **Subsequence** — in order, gaps allowed.
- **Anagram** — same character counts, different order.
- **Palindrome** — reads identically forwards and backwards.
- **Alphabet** — the set of possible characters; a bounded one permits a fixed count array.
- **Code unit** — what JS indexes; UTF-16, so a non-BMP character occupies two.
- **Surrogate pair** — two code units encoding one character, which breaks naive indexing.
- **Expand around centre** — palindrome technique testing all 2n−1 centres.
- **Canonical key** — a normalised form (sorted characters, count signature) making equivalent items hash alike.
- **Trie** — prefix tree; O(length) insert and lookup, independent of dictionary size.
- **Radix tree** — a trie with single-child chains compressed into one edge.
- **KMP** — Knuth–Morris–Pratt; O(n + m) substring search using a failure table.
