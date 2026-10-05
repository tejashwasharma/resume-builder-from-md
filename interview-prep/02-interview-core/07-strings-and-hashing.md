# Strings — arrays with sharp edges

A string is an array of characters, so nearly every array technique transfers.
What makes strings their own chapter is that they are **immutable** in
JavaScript, they have a **bounded alphabet** you can exploit, and they carry a
set of encoding traps that will bite you on exactly the input an interviewer
picks to test you.

*In the interview: strings are where sliding windows get asked — longest substring with some property, then minimum window with multiplicity — and the follow-up twist is Unicode, streaming input, or "return all of them".*

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

## Worked problems

### Q: Longest substring without repeating characters — length of the longest run with all-distinct characters
**Level:** intermediate · **Tags:** coding, sliding-window, hash-map, strings

<details><summary>Model answer</summary>

**Problem.** `"abcabcbb"` → `3` (`"abc"`). `"bbbbb"` → `1`. `"pwwkew"` → `3`
(`"wke"`, not `"pwke"` — that is a subsequence).

**Clarify first.** Character set — ASCII or full Unicode? (Assume any UTF-16
code unit; a `Map` handles it, a 128-slot array would not.) Return the length
or the substring? (Length.) Empty string? (0.)

**Brute force.** Check every substring for distinctness with a `Set`: O(n³), or
O(n²) if you extend one end and stop at the first repeat. Say it, move on.

**The insight.** A window `[l, r]` with all-distinct characters can be extended
one character at a time. When `s[r]` repeats a character already inside the
window, the window cannot be valid until `l` moves past the *previous
occurrence* of `s[r]`. A map from character to its last index lets `l` jump
there in one step instead of creeping.

**Algorithm.**
1. `last = Map`, `l = 0`, `best = 0`.
2. For `r` over the string: if `last.get(s[r]) >= l`, set `l = last.get(s[r]) + 1`.
   Record `last.set(s[r], r)`. `best = max(best, r − l + 1)`.
3. Return `best`.

```js
function lengthOfLongestSubstring(s) {
  const last = new Map();       // char → most recent index
  let l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    if (last.has(c) && last.get(c) >= l) l = last.get(c) + 1;  // jump past the repeat
    last.set(c, r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}
```

The `>= l` check is the subtle line: a character seen *before* the window
started is not a repeat inside it. Without that guard, `l` can move backwards.

**Complexity.** O(n) time — `r` advances once per character, `l` only moves
forward. O(min(n, alphabet)) space.

**Test it.**
- `"abcabcbb"` → 3. `"pwwkew"` → 3.
- `"abba"` → 2 — at the final `a`, `last.get('a') = 0`, which is `< l = 2`, so
  `l` must not jump backwards. This is the case that breaks the naive version.
- `""` → 0; `"a"` → 1.

**What the interviewer is checking.** That the window never shrinks the wrong
way, and that you call out `"abba"` yourself.

</details>

**Follow-ups:**

1. Q: Longest substring with at most k distinct characters.
   <details><summary>Answer</summary>

   Same window, different invariant. Keep a `Map` of counts inside the
   window; while `map.size > k`, decrement `s[l]` and delete it at zero, then
   `l++`. Track the max width. O(n).

   </details>

2. Q: Return the substring itself, and handle the case where several have the same length.
   <details><summary>Answer</summary>

   Record `bestStart` whenever `best` strictly improves, and return
   `s.slice(bestStart, bestStart + best)`. Strict improvement gives the
   leftmost; `>=` would give the rightmost — ask which they want.

   </details>

### Q: Minimum window substring — shortest substring of s containing every character of t, with multiplicity
**Level:** senior · **Tags:** coding, sliding-window, frequency-count, strings

<details><summary>Model answer</summary>

**Problem.** `s = "ADOBECODEBANC"`, `t = "ABC"` → `"BANC"`. If no window
exists, return `""`.

**Clarify first.** Does `t` have repeated characters, and must the window
contain them with multiplicity? (Yes — `t = "AA"` needs two `A`s.) Case
sensitive? (Yes.) If several windows tie, which? (Any, or leftmost — say which
you'll return.)

**Brute force.** For each start, extend until the window satisfies `t`, check
with a frequency comparison. O(n² · alphabet). Say it.

**The insight.** Maintain a window and a count of how many *required*
characters are currently satisfied. Expanding the right edge can only help;
once the window is valid, shrink from the left as far as it stays valid,
recording the best. The `need` map plus a single `missing` counter makes the
validity check O(1) instead of comparing two maps.

**Algorithm.**
1. `need = counts(t)`, `missing = t.length`.
2. Expand `r`: if `need.get(s[r]) > 0` then `missing--`; always
   `need.set(s[r], need.get(s[r]) − 1)`.
3. While `missing === 0`: record the window if shorter; then give back `s[l]`:
   `need[s[l]]++`, and if it becomes `> 0`, `missing++`; `l++`.
4. Return the best window, or `""`.

```js
function minWindow(s, t) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
  let missing = t.length;
  let l = 0, bestStart = 0, bestLen = Infinity;

  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    if ((need.get(c) ?? 0) > 0) missing--;   // this char was still required
    need.set(c, (need.get(c) ?? 0) - 1);     // may go negative: surplus copies

    while (missing === 0) {                  // window valid → try to shrink
      if (r - l + 1 < bestLen) { bestStart = l; bestLen = r - l + 1; }
      const out = s[l];
      need.set(out, need.get(out) + 1);
      if (need.get(out) > 0) missing++;      // we just removed a required copy
      l++;
    }
  }
  return bestLen === Infinity ? "" : s.slice(bestStart, bestStart + bestLen);
}
```

Letting counts go negative is the trick: a character not in `t` sits at −1,
−2, …, and surplus copies of a needed character also sit below zero. Only a
count crossing zero changes `missing`.

**Complexity.** O(|s| + |t|) time — each index enters and leaves the window
once. O(alphabet) space.

**Test it.**
- `"ADOBECODEBANC", "ABC"` → `"BANC"`.
- `"a", "aa"` → `""` — multiplicity.
- `"aa", "aa"` → `"aa"`.
- `"ab", "b"` → `"b"` — window of length 1 at the end.

**What the interviewer is checking.** Whether you can explain the `missing`
counter without re-deriving it mid-sentence, and whether you handle
multiplicity rather than treating `t` as a set.

</details>

**Follow-ups:**

1. Q: Find all start indices where an anagram of t occurs in s.
   <details><summary>Answer</summary>

   Fixed-size window of `|t|`. Same `need`/`missing` bookkeeping, but the
   window never shrinks below `|t|`: on each step add `s[r]`, and once
   `r − l + 1 > |t|` remove `s[l]`. Whenever `missing === 0` and the window is
   exactly `|t|` wide, record `l`. O(|s|).

   </details>

2. Q: s is a stream you cannot store. Can you still find the shortest window?
   <details><summary>Answer</summary>

   You need at least the current window, which can be as long as the whole
   stream between the first and last required characters. So you can bound
   memory by the answer's length but not by a constant. If an upper bound on
   the window length `W` is given, keep a ring buffer of the last `W`
   characters and the same counters.

   </details>

### Q: Group anagrams — bucket words that are rearrangements of each other
**Level:** intermediate · **Tags:** coding, hashing, canonical-key, strings

<details><summary>Model answer</summary>

**Problem.** `["eat","tea","tan","ate","nat","bat"]` →
`[["eat","tea","ate"],["tan","nat"],["bat"]]` (group order irrelevant).

**Clarify first.** Lowercase ASCII only? (Assume yes — it decides the key
strategy.) Empty strings? (Group together.) Output order? (Any.)

**Brute force.** Compare every pair by sorting both: O(n² · k log k) for `n`
words of length `k`. Say it.

**The insight.** Two words are anagrams iff they map to the same *canonical
key*. Sorting the characters is one key (O(k log k) per word); a 26-slot
frequency count joined into a string is another (O(k) per word). Either way a
`Map` from key to bucket does the grouping in one pass.

**Algorithm.**
1. For each word, compute its key.
2. `groups.get(key).push(word)`, creating the bucket on first sight.
3. Return `[...groups.values()]`.

```js
function groupAnagrams(words) {
  const groups = new Map();
  for (const w of words) {
    const counts = new Array(26).fill(0);
    for (const ch of w) counts[ch.charCodeAt(0) - 97]++;
    const key = counts.join('#');           // '#' so "1,11" and "11,1" can't collide
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  return [...groups.values()];
}
```

The separator matters: `counts.join('')` would make `[1, 11]` and `[11, 1]`
both `"111"`.

**Complexity.** O(n · k) time with the count key (O(n · k log k) with the
sorted key). O(n · k) space for the output.

**Test it.**
- The example → three groups.
- `[""]` → `[[""]]`.
- `["a"]` → `[["a"]]`.
- `["ab","ba","abc"]` → two groups — length differs, keys differ.

**What the interviewer is checking.** That you know two keys, can say which is
cheaper and why, and notice the join-separator collision.

</details>

**Follow-ups:**

1. Q: Unicode input — the 26-slot array no longer works. What now?
   <details><summary>Answer</summary>

   Fall back to the sorted key: `[...w].sort().join('')` — spreading the string
   iterates by code point rather than UTF-16 unit, so surrogate pairs stay
   intact. Or build a `Map` of counts and serialise its entries sorted by
   key. Both are O(k log k) per word.

   </details>

2. Q: Ten billion words, distributed. How do you group?
   <details><summary>Answer</summary>

   The key is the shard key. Map phase: emit `(key, word)`. Shuffle by key so
   all anagrams land on one reducer. Reduce: collect. Skew is the risk — a
   very common key (e.g. every empty string) lands on one node; salt the key
   and merge in a second pass if that happens.

   </details>

### Q: Longest palindromic substring — the longest contiguous palindrome in s
**Level:** intermediate · **Tags:** coding, expand-around-centre, strings

<details><summary>Model answer</summary>

**Problem.** `"babad"` → `"bab"` (or `"aba"`). `"cbbd"` → `"bb"`.

**Clarify first.** Case sensitive? (Yes.) Return any longest, or the leftmost?
(Any.) Length 0 or 1 input? (Return it as-is.)

**Brute force.** Every substring, check if palindrome: O(n³). Say it.

**The insight.** A palindrome mirrors around its centre. There are `2n − 1`
centres — `n` single characters and `n − 1` gaps between characters. Expand
outward from each centre while the ends match; the longest expansion wins.
That is O(n) per centre, O(n²) total, no extra memory, and far simpler than
Manacher's, which is O(n) but nobody expects you to write it.

**Algorithm.**
1. For each `i` in `0..n−1`: expand from `(i, i)` and from `(i, i+1)`.
2. `expand(l, r)`: while in bounds and `s[l] === s[r]`, `l--, r++`. The
   palindrome is `s[l+1 .. r−1]`.
3. Track the best `(start, length)`.

```js
function longestPalindrome(s) {
  if (s.length < 2) return s;
  let bestStart = 0, bestLen = 1;

  const expand = (l, r) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
    const len = r - l - 1;                 // ends overshoot by one on each side
    if (len > bestLen) { bestLen = len; bestStart = l + 1; }
  };

  for (let i = 0; i < s.length; i++) {
    expand(i, i);        // odd length
    expand(i, i + 1);    // even length
  }
  return s.slice(bestStart, bestStart + bestLen);
}
```

**Complexity.** O(n²) time worst case (`"aaaa…"` expands fully from every
centre), O(1) extra space.

**Test it.**
- `"babad"` → `"bab"`. `"cbbd"` → `"bb"` — the even centre.
- `"a"` → `"a"`; `""` → `""`.
- `"aaaa"` → `"aaaa"` — worst case; check `r − l − 1` after overshoot.

**What the interviewer is checking.** That you count both centre types, and
that you can state the O(n) alternative exists without attempting it.

</details>

**Follow-ups:**

1. Q: Count all palindromic substrings instead.
   <details><summary>Answer</summary>

   Same expansion; every successful step of the `while` loop is one more
   palindrome, so increment a counter inside it instead of tracking the best.
   Still O(n²).

   </details>

2. Q: Longest palindromic *subsequence*.
   <details><summary>Answer</summary>

   Not contiguous, so expansion fails — it becomes 2-D DP:
   `dp[i][j] = s[i] === s[j] ? 2 + dp[i+1][j−1] : max(dp[i+1][j], dp[i][j−1])`,
   which is the LCS of `s` with its reverse. O(n²) time and space. See
   [dynamic programming](15-dynamic-programming.md).

   </details>

---


## Problem bank — every string problem type

The full sweep of string problem types from the Scaler DSA track: character
arithmetic, counting sort, carry-forward over characters, palindromes, and the
hash-map fundamentals that every string-counting problem leans on. Array-input
hashing problems (frequency queries, distinct-in-window, zero-sum subarray)
live in the [arrays bank](06-arrays-and-two-pointers.md#problem-bank-every-array-problem-type).

| Group | Problems |
| --- | --- |
| Character arithmetic | toggle case, reverse a string, reverse the word order |
| Counting | sort a lowercase string (counting sort), count "a…g" pairs |
| Palindromes | is it a palindrome, is s[l..r] a palindrome, count palindromic substrings |
| Hashing fundamentals | Map vs Set, what can be a key, cost of each operation |

**Two facts every answer below relies on.** Strings in JS/TS are
**immutable** — `s[i] = 'x'` silently does nothing, so build into an array and
`join('')` once. And `s.charCodeAt(i)` gives the UTF-16 code: `'A'` = 65,
`'Z'` = 90, `'a'` = 97, `'z'` = 122 — upper and lower case differ by exactly
32.

---

### Character arithmetic

### Q: Toggle the case of every character in a string of letters
**Level:** foundation · **Tags:** coding, strings, ascii, bits, scaler

<details><summary>Model answer</summary>

**Problem.** `"InterViewBit"` → `"iNTERvIEWbIT"`. Input has only A–Z and a–z.

**The insight.** `'a' − 'A' = 32`, and 32 is a single bit (`1 << 5`).
Upper-case letters have bit 5 clear, lower-case have it set — so XOR with 32
flips the case in one operation, no branch needed.

```ts
function toggleCase(s: string): string {
  const out: string[] = new Array(s.length);
  for (let i = 0; i < s.length; i++) {
    out[i] = String.fromCharCode(s.charCodeAt(i) ^ 32);   // flip bit 5
  }
  return out.join('');
}
```

The branching version is equally fine to say: if code is 65–90 add 32, if
97–122 subtract 32.

**Complexity.** O(n) time, O(n) for the output (strings are immutable, so you
can't do better).

**Test it.** `"a"` → `"A"`. Empty → empty. Digits would break the XOR trick
(`'1' ^ 32` is `'\x11'`) — which is why the constraint matters; ask for it.

</details>

**Follow-ups:**
1. Q: Why not `s += ch` in the loop?
   <details><summary>Answer</summary>

   Each `+=` may copy the whole string so far — O(n²) in the worst case. Engines
   optimise it with ropes sometimes, but you can't rely on that in an
   interview answer; an array plus one `join` is O(n) guaranteed.

   </details>

### Q: Reverse a string, and reverse the order of words in a sentence
**Level:** foundation · **Tags:** coding, strings, two-pointers, scaler

<details><summary>Model answer</summary>

**Problem.** `"scaler"` → `"relacs"`. Words: `"  the sky  is blue "` →
`"blue is sky the"` (one space between words, no leading/trailing spaces).

**The insight.** Reversal is the two-pointer swap from the arrays chapter, on
a character array. Word order: reverse the whole string, then reverse each
word — the same trick as array rotation. In an interview, the split/reverse
one-liner is acceptable if you then say what it costs.

```ts
function reverseString(s: string): string {
  const a = s.split('');
  for (let i = 0, j = a.length - 1; i < j; i++, j--) [a[i], a[j]] = [a[j], a[i]];
  return a.join('');
}

function reverseWords(s: string): string {
  const words: string[] = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && s[i] === ' ') i++;       // skip spaces
    let j = i;
    while (j < s.length && s[j] !== ' ') j++;       // scan a word
    if (i < j) words.push(s.slice(i, j));
    i = j;
  }
  words.reverse();
  return words.join(' ');
}
```

**Complexity.** Both O(n) time, O(n) space.

**Test it.** Multiple spaces, leading/trailing spaces, a single word, empty
string, a string of only spaces → `""`.

</details>

**Follow-ups:**
1. Q: Do the word reversal in O(1) extra space on a mutable character array.
   <details><summary>Answer</summary>

   Reverse the whole array, then reverse each word in place, then compact the
   spaces with a read/write pointer pair. Three O(n) passes, no extra array.

   </details>
2. Q: Does `s.split('').reverse().join('')` reverse every string correctly?
   <details><summary>Answer</summary>

   No — it reverses UTF-16 code units, so an emoji (a surrogate pair) or a
   letter with a combining accent is split and scrambled. `[...s].reverse()`
   fixes surrogate pairs; combining marks need `Intl.Segmenter`. Worth a
   sentence at a company that ships in every language.

   </details>

---

### Counting

The alphabet is bounded — 26 lower-case letters, 128 ASCII — so a fixed-size
count array replaces a hash map and makes "sort" O(n).

### Q: Sort a string of lower-case letters
**Level:** foundation · **Tags:** coding, strings, counting-sort, scaler

<details><summary>Model answer</summary>

**Problem.** `"dcbeaed"` → `"abcddee"`.

**Brute force.** `[...s].sort().join('')`: O(n log n).

**The insight.** Only 26 possible values. Count each letter (index
`code − 97`), then emit each letter `count` times in order: **counting sort**.

```ts
function sortLowercase(s: string): string {
  const count = new Array<number>(26).fill(0);
  for (let i = 0; i < s.length; i++) count[s.charCodeAt(i) - 97]++;
  const out: string[] = [];
  for (let c = 0; c < 26; c++) {
    if (count[c] > 0) out.push(String.fromCharCode(97 + c).repeat(count[c]));
  }
  return out.join('');
}
```

**Complexity.** O(n + 26) = O(n) time, O(26) = O(1) extra space besides the
output.

</details>

**Follow-ups:**
1. Q: When is counting sort the wrong choice?
   <details><summary>Answer</summary>

   When the value range `k` is large relative to `n` — sorting 10 numbers in
   the range 0–10⁹ would allocate a billion counters. It is O(n + k), so it
   wins only when k is small.

   </details>

### Q: Count pairs (i, j) with i < j, s[i] = 'a' and s[j] = 'g'
**Level:** foundation · **Tags:** coding, strings, carry-forward, scaler

<details><summary>Model answer</summary>

**Problem.** `"abegag"` → `3`: (0, 3), (0, 5), (4, 5).

**Brute force.** Every pair: O(n²).

**The insight — carry forward.** Every `'g'` pairs with **every `'a'` before
it**. Walk left to right carrying `countA`; on a `'g'`, add `countA` to the
answer. (Equivalently walk right to left carrying `countG` and add on each
`'a'` — the lecture's version.)

```ts
function countAGPairs(s: string): number {
  let countA = 0, pairs = 0;
  for (const ch of s) {
    if (ch === 'a') countA++;
    else if (ch === 'g') pairs += countA;   // this g closes a pair with each earlier a
  }
  return pairs;
}
```

**Complexity.** O(n) time, O(1) space.

**Test it.** `"ga"` → 0 (order matters). `"aaggg"` → 6. No 'a' → 0.

</details>

**Follow-ups:**
1. Q: Count subsequences equal to "abc" (i < j < k).
   <details><summary>Answer</summary>

   Carry three counters: `a` (count of "a"), `ab` (count of "ab"
   subsequences), `abc`. On `'a'`: `a++`. On `'b'`: `ab += a`. On `'c'`:
   `abc += ab`. The same carry-forward, one level deeper — it's a tiny DP.

   </details>

---

### Palindromes

A palindrome reads the same both ways. Two moves cover nearly everything:
**two pointers from the ends** (is this one a palindrome?) and **expand around
each centre** (find or count palindromic substrings). There are `2n − 1`
centres — n single characters for odd lengths, n − 1 gaps for even lengths.

### Q: Is the string a palindrome — and is the substring s[l..r] a palindrome?
**Level:** foundation · **Tags:** coding, strings, palindrome, two-pointers, scaler

<details><summary>Model answer</summary>

**Problem.** `"madam"` → true, `"naman"` → true, `"scaler"` → false.
`isPal("anamadamspe", 3, 7)` → `"madam"` → true.

**Algorithm.** Compare `s[l]` with `s[r]`, move inward, fail on the first
mismatch. The whole-string check is the range check on `[0, n − 1]`.

```ts
function isPalindromeRange(s: string, l: number, r: number): boolean {
  while (l < r) {
    if (s[l] !== s[r]) return false;
    l++; r--;
  }
  return true;
}
const isPalindrome = (s: string) => isPalindromeRange(s, 0, s.length - 1);
```

**Complexity.** O(r − l) time, O(1) space — no reversed copy needed.

</details>

**Follow-ups:**
1. Q: Ignore case and non-alphanumeric characters ("A man, a plan, a canal: Panama").
   <details><summary>Answer</summary>

   Same two pointers; skip `l` forward and `r` backward past characters that
   fail `/[a-z0-9]/i`, and compare `toLowerCase()`. Don't build a cleaned copy
   unless asked — skipping keeps O(1) space.

   </details>
2. Q: Can it become a palindrome by deleting at most one character?
   <details><summary>Answer</summary>

   Run the two pointers; on the first mismatch at `(l, r)` return
   `isPalindromeRange(s, l + 1, r) || isPalindromeRange(s, l, r − 1)`. O(n).

   </details>

### Q: Count the palindromic substrings
**Level:** intermediate · **Tags:** coding, strings, palindrome, expand-around-centre, scaler

<details><summary>Model answer</summary>

**Problem.** `"aaa"` → `6` (`a`, `a`, `a`, `aa`, `aa`, `aaa`). `"abc"` → 3.
The *longest* palindromic substring is the worked problem above; this is its
counting twin and uses the same expansion.

**Brute force.** Check all n²/2 substrings with the two-pointer check: O(n³).

**The insight.** Every palindrome has a centre. Expand outward from each of the
`2n − 1` centres while the ends match; each successful step is one more
palindrome.

```ts
function countPalindromicSubstrings(s: string): number {
  let count = 0;
  const expand = (l: number, r: number) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) {
      count++;          // s[l..r] is a palindrome
      l--; r++;
    }
  };
  for (let c = 0; c < s.length; c++) {
    expand(c, c);       // odd length, centred on s[c]
    expand(c, c + 1);   // even length, centred between c and c+1
  }
  return count;
}
```

**Complexity.** O(n²) time worst case (`"aaaa…"`), O(1) space. Manacher's
algorithm does it in O(n); name it, don't write it unless asked.

</details>

**Follow-ups:**
1. Q: Return the longest palindromic substring with the same expansion.
   <details><summary>Answer</summary>

   Make `expand` return the length `r − l − 1` after it stops, and track the
   best centre and length. The full worked answer is
   [above](#q-longest-palindromic-substring-the-longest-contiguous-palindrome-in-s).

   </details>

---

### Hashing fundamentals

### Q: HashMap vs HashSet — what are the operations, what do they cost, and what can be a key?
**Level:** foundation · **Tags:** coding, hashing, hash-map, hash-set, scaler

<details><summary>Model answer</summary>

**The two structures.**

| | `Map<K, V>` | `Set<K>` |
| --- | --- | --- |
| Stores | key → value pairs | keys only |
| Add | `m.set(k, v)` (overwrites) | `s.add(k)` (no-op if present) |
| Read | `m.get(k)` → `undefined` if missing | — |
| Membership | `m.has(k)` | `s.has(k)` |
| Remove | `m.delete(k)` | `s.delete(k)` |
| Size | `m.size` | `s.size` |

All are **O(1) average**, O(n) worst case (every key in one bucket). Iteration
order in JS is insertion order — unlike Java's `HashMap`, where it is
unspecified, which is why "the first non-repeating element" must iterate the
*array*, not the map, to be portable.

**Typical shapes.** Country → population: `Map<string, number>`. Country →
list of states: `Map<string, string[]>`. "Have I seen this word": `Set<string>`.

**What can be a key.** In Java/Scaler's framing: only immutable values —
primitives and strings — are safe keys. In JS, `Map` accepts anything, but
objects and arrays are compared **by reference**, so
`m.set([1, 2], 'x'); m.get([1, 2])` is `undefined`. To key by contents, build
a canonical string: `` `${r},${c}` `` for a grid cell, the sorted letters for
an anagram group.

**Why a hash map beats a direct-address array.** Direct addressing
(`bool room[1e9]`) gives O(1) too, but allocates space for every possible
key. A hash map allocates for the keys you actually store.

</details>

**Follow-ups:**
1. Q: When would you pick a sorted structure over a hash map?
   <details><summary>Answer</summary>

   When you need order: the smallest key, range queries, floor/ceiling,
   iterating in sorted order. A balanced BST (Java `TreeMap`) gives O(log n)
   for those; JS has no built-in one, so you'd use a sorted array with binary
   search, or a heap if only the min/max matters.

   </details>
2. Q: What makes the worst case O(n), and how do real implementations defend against it?
   <details><summary>Answer</summary>

   Collisions — many keys hashing to one bucket, either by bad luck or by an
   attacker choosing keys (hash-flooding DoS). Defences: randomised/seeded hash
   functions (SipHash in Python, Rust), and Java 8's switch from a bucket's
   linked list to a red-black tree once it grows past 8 entries, capping it at
   O(log n).

   </details>

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

---

## Exercises

Strings are immutable in TypeScript: build into an array and `join('')` once.
Problems marked **core** are the must-solve set.

### Exercise: Toggle the case of every letter
**Level:** foundation · **Topic:** character codes (±32, or XOR 32) · **Hint:** Upper and lower case differ by exactly one bit.
**Function:** `toggleCase(s: string): string`
**Source:** scaler

`s` contains only letters. Return it with every letter's case flipped.
`"InterViewBit"` → `"iNTERvIEWbIT"`.

```tests
[{"args": ["InterViewBit"], "expected": "iNTERvIEWbIT"},
 {"args": ["a"], "expected": "A"},
 {"args": [""], "expected": ""},
 {"args": ["ABCxyz"], "expected": "abcXYZ"}]
```

<details><summary>Solution</summary>

```ts
function toggleCase(s: string): string {
  const out: string[] = new Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = String.fromCharCode(s.charCodeAt(i) ^ 32);
  return out.join('');
}
```
</details>

### Exercise: Reverse a string
**Level:** foundation · **Topic:** two pointers on a character array · **Hint:** Strings are immutable — work on an array of characters.
**Function:** `reverseString(s: string): string`
**Source:** scaler

Return `s` reversed. `"scaler"` → `"relacs"`.

```tests
[{"args": ["scaler"], "expected": "relacs"},
 {"args": [""], "expected": ""},
 {"args": ["a"], "expected": "a"},
 {"args": ["ab"], "expected": "ba"},
 {"args": ["racecar"], "expected": "racecar"}]
```

<details><summary>Solution</summary>

```ts
function reverseString(s: string): string {
  const a = s.split('');
  for (let i = 0, j = a.length - 1; i < j; i++, j--) [a[i], a[j]] = [a[j], a[i]];
  return a.join('');
}
```
</details>

### Exercise: Reverse the words in a sentence
**Level:** foundation · **Topic:** scan words, reverse their order · **Hint:** Collect the words while skipping runs of spaces.
**Function:** `reverseWords(s: string): string`
**Core:** true · **Source:** scaler

Return the words of `s` in reverse order, separated by single spaces, with no leading or trailing spaces.
`"  the sky  is blue "` → `"blue is sky the"`.

```tests
[{"args": ["  the sky  is blue "], "expected": "blue is sky the"},
 {"args": ["hello"], "expected": "hello"},
 {"args": ["   "], "expected": ""},
 {"args": ["a b"], "expected": "b a"},
 {"args": [""], "expected": ""}]
```

<details><summary>Solution</summary>

```ts
function reverseWords(s: string): string {
  const words: string[] = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && s[i] === ' ') i++;
    let j = i;
    while (j < s.length && s[j] !== ' ') j++;
    if (i < j) words.push(s.slice(i, j));
    i = j;
  }
  return words.reverse().join(' ');
}
```
</details>

### Exercise: Sort a lowercase string
**Level:** foundation · **Topic:** counting sort over 26 letters · **Hint:** Count each letter, then emit them in order.
**Function:** `sortLowercase(s: string): string`
**Core:** true · **Source:** scaler

`s` has only `a`–`z`. Return its letters sorted, in O(n). `"dcbeaed"` → `"abcddee"`.

```tests
[{"args": ["dcbeaed"], "expected": "abcddee"},
 {"args": [""], "expected": ""},
 {"args": ["zzza"], "expected": "azzz"},
 {"args": ["abc"], "expected": "abc"},
 {"gen": "['zyxwvutsrqponmlkjihgfedcba'.repeat(20000)]", "perf": true, "label": "n = 520,000"}]
```

<details><summary>Solution</summary>

```ts
function sortLowercase(s: string): string {
  const count = new Array<number>(26).fill(0);
  for (let i = 0; i < s.length; i++) count[s.charCodeAt(i) - 97]++;
  const out: string[] = [];
  for (let c = 0; c < 26; c++) if (count[c]) out.push(String.fromCharCode(97 + c).repeat(count[c]));
  return out.join('');
}
```
</details>

### Exercise: Count 'a' … 'g' pairs
**Level:** foundation · **Topic:** carry forward a count · **Hint:** Every 'g' pairs with every 'a' seen before it.
**Function:** `countAGPairs(s: string): number`
**Core:** true · **Source:** scaler

Count index pairs `i < j` with `s[i] === 'a'` and `s[j] === 'g'`.
`"abegag"` → `3`.

```tests
[{"args": ["abegag"], "expected": 3},
 {"args": ["aaggg"], "expected": 6},
 {"args": ["ga"], "expected": 0},
 {"args": [""], "expected": 0},
 {"args": ["agag"], "expected": 3}]
```

<details><summary>Solution</summary>

```ts
function countAGPairs(s: string): number {
  let countA = 0, pairs = 0;
  for (const ch of s) {
    if (ch === 'a') countA++;
    else if (ch === 'g') pairs += countA;
  }
  return pairs;
}
```
</details>

### Exercise: Is it a palindrome?
**Level:** foundation · **Topic:** two pointers from the ends · **Hint:** Compare the ends and move inward; stop at the first mismatch.
**Function:** `isPalindrome(s: string): boolean`
**Source:** scaler

Return `true` if `s` reads the same forwards and backwards. `"madam"` → `true`, `"scaler"` → `false`.

```tests
[{"args": ["madam"], "expected": true},
 {"args": ["naman"], "expected": true},
 {"args": ["scaler"], "expected": false},
 {"args": [""], "expected": true},
 {"args": ["ab"], "expected": false},
 {"args": ["aa"], "expected": true}]
```

<details><summary>Solution</summary>

```ts
function isPalindrome(s: string): boolean {
  for (let l = 0, r = s.length - 1; l < r; l++, r--) if (s[l] !== s[r]) return false;
  return true;
}
```
</details>

### Exercise: Is a substring a palindrome?
**Level:** foundation · **Topic:** two pointers on a range · **Hint:** Same check, but start at l and r instead of the ends.
**Function:** `isPalindromeRange(s: string, l: number, r: number): boolean`
**Source:** scaler

Return `true` if `s[l..r]` (inclusive) is a palindrome. `("anamadamspe", 3, 7)` → `true` ("madam").

```tests
[{"args": ["anamadamspe", 3, 7], "expected": true},
 {"args": ["anamadamspe", 0, 3], "expected": false},
 {"args": ["abc", 1, 1], "expected": true},
 {"args": ["abba", 0, 3], "expected": true}]
```

<details><summary>Solution</summary>

```ts
function isPalindromeRange(s: string, l: number, r: number): boolean {
  for (; l < r; l++, r--) if (s[l] !== s[r]) return false;
  return true;
}
```
</details>

### Exercise: Count palindromic substrings
**Level:** intermediate · **Topic:** expand around each centre · **Hint:** There are 2n − 1 centres: every character and every gap.
**Function:** `countPalindromicSubstrings(s: string): number`
**Core:** true · **Source:** scaler

Count the substrings of `s` that are palindromes (each occurrence counts). `"aaa"` → `6`, `"abc"` → `3`.

```tests
[{"args": ["aaa"], "expected": 6},
 {"args": ["abc"], "expected": 3},
 {"args": [""], "expected": 0},
 {"args": ["abba"], "expected": 6},
 {"args": ["a"], "expected": 1}]
```

<details><summary>Solution</summary>

```ts
function countPalindromicSubstrings(s: string): number {
  let count = 0;
  const expand = (l: number, r: number) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) { count++; l--; r++; }
  };
  for (let c = 0; c < s.length; c++) { expand(c, c); expand(c, c + 1); }
  return count;
}
```
</details>

### Exercise: First non-repeating character
**Level:** foundation · **Topic:** frequency count, then scan · **Hint:** Count every character, then find the first with count 1.
**Function:** `firstUniqChar(s: string): number`

Return the **index** of the first character that appears exactly once, or `-1`.
`"leetcode"` → `0`; `"loveleetcode"` → `2`; `"aabb"` → `-1`.

```tests
[{"args": ["leetcode"], "expected": 0},
 {"args": ["loveleetcode"], "expected": 2},
 {"args": ["aabb"], "expected": -1},
 {"args": [""], "expected": -1},
 {"args": ["z"], "expected": 0}]
```

<details><summary>Solution</summary>

```ts
function firstUniqChar(s: string): number {
  const count = new Map<string, number>();
  for (const ch of s) count.set(ch, (count.get(ch) ?? 0) + 1);
  for (let i = 0; i < s.length; i++) if (count.get(s[i]) === 1) return i;
  return -1;
}
```
</details>

### Exercise: Longest substring without repeating characters
**Level:** intermediate · **Topic:** variable sliding window · **Hint:** Remember where each character was last seen; jump the left edge past it.
**Function:** `lengthOfLongestSubstring(s: string): number`
**Core:** true

Return the length of the longest substring with all-distinct characters.
`"abcabcbb"` → `3`; `"pwwkew"` → `3`.

```tests
[{"args": ["abcabcbb"], "expected": 3},
 {"args": ["bbbbb"], "expected": 1},
 {"args": ["pwwkew"], "expected": 3},
 {"args": [""], "expected": 0},
 {"args": ["abba"], "expected": 2},
 {"args": ["dvdf"], "expected": 3},
 {"gen": "['abcdefghijklmnopqrstuvwxyz'.repeat(4000)]", "perf": true, "label": "n = 104,000"}]
```

<details><summary>Solution</summary>

```ts
function lengthOfLongestSubstring(s: string): number {
  const last = new Map<string, number>();
  let best = 0, l = 0;
  for (let r = 0; r < s.length; r++) {
    const prev = last.get(s[r]);
    if (prev !== undefined && prev >= l) l = prev + 1;
    last.set(s[r], r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}
```
</details>

### Exercise: Minimum window substring
**Level:** senior · **Topic:** sliding window with counts · **Hint:** Grow until every needed count is met, then shrink while it still is.
**Function:** `minWindow(s: string, t: string): string`
**Core:** true

Return the shortest substring of `s` containing every character of `t` (with multiplicity), or `""`. The answer is unique in the tests.
`s = "ADOBECODEBANC", t = "ABC"` → `"BANC"`.

```tests
[{"args": ["ADOBECODEBANC", "ABC"], "expected": "BANC"},
 {"args": ["a", "a"], "expected": "a"},
 {"args": ["a", "aa"], "expected": ""},
 {"args": ["ab", "b"], "expected": "b"},
 {"args": ["aaflslflsldkalskaaa", "aaa"], "expected": "aaa"}]
```

<details><summary>Solution</summary>

```ts
function minWindow(s: string, t: string): string {
  const need = new Map<string, number>();
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1);
  let missing = t.length, l = 0, bestL = 0, bestLen = Infinity;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    if ((need.get(c) ?? 0) > 0) missing--;
    need.set(c, (need.get(c) ?? 0) - 1);
    while (missing === 0) {
      if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }
      const d = s[l++];
      need.set(d, need.get(d)! + 1);
      if (need.get(d)! > 0) missing++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestL, bestL + bestLen);
}
```
</details>

### Exercise: Group anagrams
**Level:** intermediate · **Topic:** canonical key in a hash map · **Hint:** Words that are anagrams share the same sorted letters.
**Function:** `groupAnagrams(words: string[]): string[][]`
**Core:** true · **Compare:** unordered

Group the words that are anagrams of each other. Inside each group keep the input order; the groups may come in any order.
`["eat","tea","tan","ate","nat","bat"]` → `[["eat","tea","ate"],["tan","nat"],["bat"]]`.

```tests
[{"args": [["eat", "tea", "tan", "ate", "nat", "bat"]], "expected": [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]},
 {"args": [[""]], "expected": [[""]]},
 {"args": [["a"]], "expected": [["a"]]},
 {"args": [["ab", "ba", "abc"]], "expected": [["ab", "ba"], ["abc"]]}]
```

<details><summary>Solution</summary>

```ts
function groupAnagrams(words: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const w of words) {
    const key = [...w].sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(w);
  }
  return [...groups.values()];
}
```
</details>

### Exercise: Longest palindromic substring
**Level:** intermediate · **Topic:** expand around centre, keep the best · **Hint:** Every palindrome has a centre — try all 2n − 1 of them.
**Function:** `longestPalindrome(s: string): string`

Return the longest palindromic substring (the tests have a unique answer). `"cbbd"` → `"bb"`; `"forgeeksskeegfor"` → `"geeksskeeg"`.

```tests
[{"args": ["cbbd"], "expected": "bb"},
 {"args": ["forgeeksskeegfor"], "expected": "geeksskeeg"},
 {"args": ["a"], "expected": "a"},
 {"args": ["abacdfgdcaba"], "expected": "aba"},
 {"args": ["racecar"], "expected": "racecar"}]
```

<details><summary>Solution</summary>

```ts
function longestPalindrome(s: string): string {
  let start = 0, len = 0;
  const expand = (l: number, r: number) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
    if (r - l - 1 > len) { len = r - l - 1; start = l + 1; }
  };
  for (let c = 0; c < s.length; c++) { expand(c, c); expand(c, c + 1); }
  return s.slice(start, start + len);
}
```
</details>

---

## In brief

- **Strings are immutable** in JS/TS: build into an array and `join('')` once — `+=` in a loop can go quadratic.
- **Character codes:** `'a'` = 97, `'A'` = 65; case differs by exactly 32 (one bit).
- **Bounded alphabet → count array** of 26 instead of a map; counting sort is O(n).
- **Carry forward over characters** — every 'g' pairs with every 'a' before it.
- **Palindromes:** two pointers to check one, expand around 2n − 1 centres to find or count them.
- **Sliding window with counts** for "substring containing / without" questions.
- **Map vs Set:** O(1) average operations; object keys compare by reference, so key by a canonical string.

## Quiz

### MCQ: Why avoid `s += ch` inside a loop over a long string?
- [ ] It's a syntax error in TS
- [x] Each += may copy the whole string, making the loop O(n²)
- [ ] It changes the string's encoding
- [ ] It only works for ASCII
**Why:** Strings are immutable; collect characters in an array and join once.

### MCQ: `String.fromCharCode('a'.charCodeAt(0) ^ 32)` gives…
- [ ] 'b'
- [x] 'A'
- [ ] ' '
- [ ] 'a'
**Why:** Upper and lower case differ only in bit 5 (value 32); XOR flips it.

### MCQ: Sorting a string of only lowercase letters can be done in…
- [ ] O(n log n) at best
- [x] O(n) with a 26-slot count array
- [ ] O(n²)
- [ ] O(26 log n)
**Why:** Counting sort: count each letter, emit them in order.

### MCQ: How many centres does expand-around-centre try for a string of length n?
- [ ] n
- [ ] n / 2
- [x] 2n − 1
- [ ] n²
**Why:** n single characters (odd lengths) plus n − 1 gaps (even lengths).

### MCQ: `new Map().set([1, 2], 'x').get([1, 2])` returns…
- [ ] 'x'
- [x] undefined
- [ ] It throws
- [ ] [1, 2]
**Why:** Objects and arrays are compared by reference — use a canonical string key like '1,2'.

### MCQ: Longest substring without repeats: when you see a repeated character, the left edge…
- [ ] Resets to 0
- [ ] Moves one step right
- [x] Jumps just past that character's previous position (if inside the window)
- [ ] Stays put
**Why:** Everything up to the earlier copy can't be in a valid window any more.

### MCQ: Group anagrams uses which key per word?
- [ ] The word's length
- [ ] The first letter
- [x] The word's sorted letters (or a 26-count signature)
- [ ] The word reversed
**Why:** All anagrams share one canonical form.

### MCQ: Why must 'first non-repeating element' scan the array, not the map, in a portable answer?
- [ ] Maps are slower
- [x] Only the array gives input order; map iteration order isn't guaranteed in every language
- [ ] Maps can't store counts
- [ ] The map is empty by then
**Why:** JS Map keeps insertion order, but Java's HashMap doesn't — the array order is the safe source.

### MCQ: What makes a hash map's worst case O(n)?
- [ ] Too few keys
- [x] Many keys colliding into one bucket
- [ ] Using string keys
- [ ] Deleting keys
**Why:** Collisions — by chance or an attacker's choice. Seeded hashing and tree-ified buckets (Java 8) defend against it.
