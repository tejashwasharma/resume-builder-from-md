/* =========================================================================
   Test runner for Code exercises.

   One file, two users:
     - the page runs it inside a Web Worker to test your solution;
     - build_site.py runs it under node to prove every reference solution
       passes its own tests before the site is written.
   Keeping one copy is the point: if the build says a solution passes, the
   page will say the same thing.

   Plain JS, no modules, no DOM. `makeRunner()` returns the helpers.
   ========================================================================= */

function makeRunner() {
  class ListNode {
    constructor(val, next = null) { this.val = val; this.next = next; }
  }

  const toList = (a) => {
    let head = null;
    for (let i = a.length - 1; i >= 0; i--) head = new ListNode(a[i], head);
    return head;
  };

  // Guarded walk: a solution that accidentally makes a cycle must not hang
  // the comparison after the solution itself has returned.
  const fromList = (head) => {
    const out = [];
    let n = 0;
    while (head && n++ < 200000) { out.push(head.val); head = head.next; }
    return out;
  };

  const isNode = (v) => v !== null && typeof v === 'object' && 'val' in v && 'next' in v;

  class TreeNode {
    constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
  }

  // Level-order with nulls for missing children — the LeetCode convention:
  // [3, 9, 20, null, null, 15, 7].
  const toTree = (a) => {
    if (!a.length || a[0] === null) return null;
    const root = new TreeNode(a[0]);
    const q = [root];
    let head = 0, i = 1;
    while (head < q.length && i < a.length) {
      const n = q[head++];
      if (i < a.length && a[i] !== null) { n.left = new TreeNode(a[i]); q.push(n.left); }
      i++;
      if (i < a.length && a[i] !== null) { n.right = new TreeNode(a[i]); q.push(n.right); }
      i++;
    }
    return root;
  };

  const fromTree = (root) => {
    const out = [];
    const q = [root];
    let head = 0, guard = 0;
    while (head < q.length && guard++ < 400000) {
      const n = q[head++];
      if (n) { out.push(n.val); q.push(n.left, n.right); } else out.push(null);
    }
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  };

  const isTree = (v) => v !== null && typeof v === 'object' && 'val' in v && 'left' in v && 'right' in v;

  /* Normalise a value into plain JSON so expected and actual compare the same
     way: undefined -> null (a JS function "returning nothing" vs a JSON null),
     bigint -> string (JSON has no bigint), -0 -> 0, Sets/Maps -> arrays/objects,
     object keys sorted. */
  function norm(v) {
    if (v === undefined) return null;
    if (typeof v === 'bigint') return v.toString();
    if (typeof v === 'number') return Object.is(v, -0) ? 0 : v;
    if (Array.isArray(v)) return v.map(norm);
    if (v instanceof Set) return [...v].map(norm);
    if (v instanceof Map) return Object.fromEntries([...v].map(([k, x]) => [String(k), norm(x)]));
    if (v !== null && typeof v === 'object') {
      const o = {};
      for (const k of Object.keys(v).sort()) o[k] = norm(v[k]);
      return o;
    }
    return v;
  }

  const stable = (v) => JSON.stringify(v);

  function equal(actual, expected, mode) {
    if (mode === 'unordered' && Array.isArray(actual) && Array.isArray(expected)) {
      const sa = actual.map(stable).sort();
      const se = expected.map(stable).sort();
      return stable(sa) === stable(se);
    }
    if (mode === 'float') {
      const close = (a, b) => {
        if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
        if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => close(x, b[i]));
        return stable(a) === stable(b);
      };
      return close(actual, expected);
    }
    return stable(actual) === stable(expected);
  }

  // Deep copy so a solution that mutates its input can't corrupt the next case
  // (or the reference's view of the same input).
  const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

  /* Adapters turn JSON test data into the structures a problem takes:
       'linked-list'   every array argument becomes a ListNode list
       'linked-lists'  the first argument is an array of lists (merge k lists)
       'tree'          the first argument is a level-order array -> TreeNode
       'tree-out'      only the result is a tree (e.g. build a tree from traversals)
     and a returned list or tree (or null) comes back as an array. */
  function prepArgs(args, adapter) {
    const a = clone(args);
    if (adapter === 'linked-list') return a.map((x) => (Array.isArray(x) ? toList(x) : x));
    if (adapter === 'linked-lists' && Array.isArray(a[0])) a[0] = a[0].map(toList);
    if (adapter === 'tree' && Array.isArray(a[0])) a[0] = toTree(a[0]);
    return a;
  }

  function output(value, adapter) {
    if ((adapter === 'linked-list' || adapter === 'linked-lists') && (value === null || isNode(value))) return fromList(value);
    if ((adapter === 'tree' || adapter === 'tree-out') && (value === null || isTree(value))) return fromTree(value);
    return value;
  }

  // A generated case: `gen` evaluates to the args array. In the page it arrives
  // as a function (compiled into the worker's source — the page never uses
  // eval); under node it's the expression string from the tests fence.
  const generate = (g) => (typeof g === 'function' ? g() : (new Function('return (' + g + ');'))());

  /* Run every case against `fn`.
       opts.adapter  'linked-list' | 'linked-lists' — see prepArgs
       opts.check    'arg0' compares the (mutated) first argument instead of the return value
       opts.compare  'unordered' | 'float' | undefined
       opts.ref      reference solution — required for `gen` and `fromRef` cases,
                     whose expected value is computed rather than written down
       onStart(i)    called before each case, so a watchdog knows which case hung */
  function run(fn, cases, opts, onStart) {
    opts = opts || {};
    const results = [];
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      if (onStart) onStart(i);
      let expected;
      try {
        const args = c.gen ? generate(c.gen) : c.args;
        // `gen` (a generated input) and `fromRef` (an input someone proposed,
        // e.g. the AI reviewer) have no written-down answer: the reference
        // solution computes it.
        if (c.gen || c.fromRef) {
          if (!opts.ref) { results.push({ i, skipped: true, perf: !!c.perf, label: c.label }); continue; }
          const ra = prepArgs(args, opts.adapter);
          let rr;
          try { rr = opts.ref(...ra); } catch (e) {
            // The reference itself rejects this input — it's outside the
            // problem's constraints, so it says nothing about your code.
            results.push({ i, skipped: true, invalid: true, perf: !!c.perf, label: c.label, args: c.gen ? null : norm(c.args) });
            continue;
          }
          expected = norm(output(opts.check === 'arg0' ? ra[0] : rr, opts.adapter));
        } else {
          expected = norm(c.expected);
        }
        const a = prepArgs(args, opts.adapter);
        const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
        const r = fn(...a);
        const ms = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
        const actual = norm(output(opts.check === 'arg0' ? a[0] : r, opts.adapter));
        results.push({
          i, pass: equal(actual, expected, opts.compare), actual, expected, ms,
          perf: !!c.perf, label: c.label,
          args: c.gen ? null : norm(c.args),
        });
      } catch (e) {
        results.push({
          i, pass: false, error: String((e && e.message) || e), expected,
          perf: !!c.perf, label: c.label, args: c.gen ? null : norm(c.args),
        });
      }
    }
    return results;
  }

  return { run, ListNode, TreeNode, toList, fromList, toTree, fromTree, norm, equal };
}

if (typeof module !== 'undefined') module.exports = { makeRunner };
