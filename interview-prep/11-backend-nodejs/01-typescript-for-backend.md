# TypeScript for backend services

The book's code is TypeScript, and this chapter is what you need to read it and
write it — not the whole language, but the parts a backend service uses every
day. If you are coming from Python or Go, this is the orientation; if you write
TypeScript already, skim to *Types that pay for themselves* and *Errors*.

TypeScript is JavaScript plus a type checker that runs at build time and
disappears at runtime. **No types exist when the program runs.** That single
fact explains most of what is strange about it: validation at the boundary is
still your job, because the compiler checked the code and nobody checked the
JSON.

---

## In brief

- **Types are erased.** `tsc` checks and then strips them, so a value arriving
  from the network is whatever it actually is, not what you declared. Every
  boundary — HTTP body, env var, database row, third-party response — needs
  runtime validation, which is why `zod` appears in every chapter here.
- **`strict` is not optional.** Without it `null` and `undefined` are assignable
  to everything and the checker is barely working. Turn it on in a new project
  before writing a line.
- **`any` disables the checker for everything it touches**; `unknown` is the
  honest version — you must narrow it before use, which is exactly what you
  want for incoming data.
- **Async is single-threaded and cooperative.** `await` yields; it does not
  create a thread. Two awaited calls run in sequence unless you explicitly use
  `Promise.all`, which is the most common accidental latency in a handler.
- **Errors are untyped.** A `catch` block receives `unknown`, anything can be
  thrown, and an unhandled rejection crashes the process by default. Typed
  error classes plus one handler at the edge is the pattern that holds.
- **Prefer `type` aliases and unions** to class hierarchies for data. Discriminated
  unions plus exhaustive `switch` is the idiomatic way to model states.

---

## Setting up a project

```bash
mkdir links-api && cd links-api
npm init -y
npm i -D typescript tsx @types/node
npx tsc --init
```

The `tsconfig.json` settings that matter, with the reason for each:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",          // modern Node: top-level await, .at(), Error.cause
    "module": "NodeNext",        // match Node's own module resolution
    "moduleResolution": "NodeNext",
    "strict": true,              // the whole point; everything below is inside it
    "noUncheckedIndexedAccess": true,  // arr[0] is T | undefined — because it is
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "outDir": "dist",
    "sourceMap": true            // stack traces that point at your source
  },
  "include": ["src"]
}
```

`tsx` runs TypeScript directly in development (`npx tsx watch src/main.ts`);
`tsc` compiles to `dist/` for production. Running the compiled output in
production is worth the extra step: startup is faster and the type check is a
build gate rather than a runtime surprise.

**Modules.** Node supports CommonJS (`require`) and ES modules (`import`). New
code uses ES modules: `"type": "module"` in `package.json`, and relative imports
carry the extension (`import { makeLink } from './links.js'` — yes, `.js`, even
from a `.ts` file, because that is what exists at runtime).

---

## The language, as a backend engineer meets it

### Values and types

```ts
const port: number = 3000;            // number covers ints and floats
const name = 'links-api';             // inferred as string — let inference work
let ready = false;                    // boolean
const nothing = null;                 // explicit absence
let maybe: string | undefined;        // absence by omission

const ids: string[] = ['a', 'b'];
const pair: [string, number] = ['hits', 42];        // tuple: fixed length, typed per position
const counts: Record<string, number> = { a: 1 };    // object used as a map
const seen = new Set<string>();                     // when you need membership, not order
const index = new Map<string, Link>();              // when keys are not strings, or order matters
```

`const` prevents rebinding, not mutation: a `const` array can still be pushed
to. For real immutability, `readonly` and `as const`.

### Shapes

```ts
type Link = {
  id: string;
  url: string;
  tenantId: string;
  hits: number;
  createdAt: Date;
  note?: string;              // optional: string | undefined
};

// A union of literals is the cheapest state machine in the language.
type Status = 'pending' | 'active' | 'expired';

// A discriminated union models "one of these shapes", and `switch` on the tag
// is checked for exhaustiveness.
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError };

function render(r: Result<Link>): string {
  switch (r.ok) {
    case true:  return r.value.url;      // TS knows `value` exists here
    case false: return r.error.message;  // and `error` here
  }
}
```

`interface` and `type` overlap; `interface` can be reopened and is conventional
for public object contracts, `type` does unions and intersections. Either is
fine — pick one per codebase.

### Functions, and async

```ts
function shorten(url: string, len = 7): string { /* … */ }

// An async function always returns a Promise. `await` yields the event loop —
// it does not start a thread. See the runtime chapter for what that means.
async function fetchTitle(url: string): Promise<string | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(2_000) });
  return res.ok ? extractTitle(await res.text()) : null;
}

// The most common accidental latency in a handler: these run one after the
// other, so the handler takes a + b milliseconds.
const user = await getUser(id);
const links = await getLinks(id);

// Independent work should overlap. Now it takes max(a, b).
const [user2, links2] = await Promise.all([getUser(id), getLinks(id)]);

// When one failure should not lose the other results:
const settled = await Promise.allSettled([getUser(id), getLinks(id)]);
```

### Generics, in the dose a service needs

```ts
// "Whatever you put in, you get out" — not abstraction for its own sake.
function first<T>(xs: readonly T[]): T | undefined { return xs[0]; }

// Constrained: T must have an id. This is 90% of the generics in a service.
function byId<T extends { id: string }>(xs: readonly T[]): Map<string, T> {
  return new Map(xs.map((x) => [x.id, x]));
}
```

### Errors

JavaScript lets you throw anything, so `catch` gives you `unknown`:

```ts
class AppError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = new.target.name;         // so stack traces say NotFoundError
  }
}
class NotFoundError extends AppError {
  constructor(what: string) { super(`${what} not found`, 404, 'not_found'); }
}

try {
  await mightFail();
} catch (e: unknown) {                    // not `any` — you must narrow
  if (e instanceof AppError) log.warn({ code: e.code }, e.message);
  else if (e instanceof Error) log.error({ err: e }, 'unexpected');
  else log.error({ thrown: String(e) }, 'threw a non-Error');
  throw e;                                // rethrow unless you can handle it
}

// Preserve the cause when wrapping, or you lose the real stack:
throw new AppError('could not load link', 500, 'upstream', { cause: e });
```

Two process-level rules, because they are how Node services die quietly:

```ts
process.on('unhandledRejection', (reason) => { log.fatal({ reason }); process.exit(1); });
process.on('uncaughtException',  (err)    => { log.fatal({ err }); process.exit(1); });
```

Crash deliberately rather than continue in an unknown state — the orchestrator
restarts you, which is the correct outcome (see
[containers, properly](../06-cloud-devops/06-containers.md)).

---

## Types that pay for themselves

Not all typing is equally useful. Three patterns earn their keep in a service:

**1. Parse at the boundary, trust inside.** The compiler cannot check JSON, so
validate once at the edge and let the type flow inwards.

```ts
import { z } from 'zod';

const CreateLink = z.object({
  url: z.string().url(),
  note: z.string().max(280).optional(),
});
type CreateLink = z.infer<typeof CreateLink>;   // the type comes FROM the schema

const body = CreateLink.parse(await req.json()); // throws on bad input; typed after
```

One declaration produces both the runtime check and the compile-time type, so
they cannot drift. This is the single highest-value TypeScript pattern in
backend code.

**2. Branded ids**, so a tenant id cannot be passed where a user id belongs:

```ts
type TenantId = string & { readonly __brand: 'TenantId' };
const asTenantId = (s: string) => s as TenantId;
function listLinks(t: TenantId) { /* … */ }
listLinks('user_123');            // compile error — exactly the bug you want caught
```

**3. Exhaustiveness**, so adding a state breaks the build rather than
production:

```ts
function label(s: Status): string {
  switch (s) {
    case 'pending': return 'Pending';
    case 'active':  return 'Active';
    case 'expired': return 'Expired';
    default: { const _never: never = s; return _never; }  // new state → compile error
  }
}
```

---

## Building it

**The toolchain, and what each piece is for**

| Need | Reach for | Why |
| --- | --- | --- |
| Run TS in dev | `tsx watch src/main.ts` | No build step in the edit loop |
| Build for production | `tsc` to `dist/` | Fast startup, type check as a gate |
| Validate input | `zod` | One declaration gives a runtime check and a type |
| Lint | `eslint` + `@typescript-eslint` | Catches `any` creep and floating promises |
| Format | `prettier` | Ends the argument |
| Test | `node --test`, or `vitest` | Node's built-in runner is enough for a service |
| Logs | `pino` | Structured JSON, fast; see the production chapter |

**A complete, runnable 30-line program** — the vocabulary above, doing
something:

```ts
// src/demo.ts — run with: npx tsx src/demo.ts
import { z } from 'zod';

type Link = { id: string; url: string; hits: number };

const NewLink = z.object({ url: z.string().url() });

const store = new Map<string, Link>();

function create(input: unknown): Link {
  const { url } = NewLink.parse(input);                  // validate at the edge
  const id = Math.random().toString(36).slice(2, 9);
  const link = { id, url, hits: 0 };
  store.set(id, link);
  return link;
}

function visit(id: string): Link {
  const link = store.get(id);
  if (!link) throw new Error(`no link ${id}`);           // narrowed to Link below
  link.hits += 1;
  return link;
}

const a = create({ url: 'https://example.com/docs' });
visit(a.id);
visit(a.id);
console.log(`${a.id} -> ${a.url} (${store.get(a.id)!.hits} hits)`);

try { create({ url: 'not-a-url' }); } catch (e) {
  console.log('rejected:', e instanceof z.ZodError ? e.issues[0]?.message : e);
}
```

Everything after this chapter builds on exactly these pieces: a validated
input, a typed record, a store, and errors that carry meaning.

---

## Interview Q&A

### Q: TypeScript types are erased at runtime. What does that mean for a service?
**Level:** intermediate · **Tags:** typescript, validation, boundaries

<details><summary>Model answer</summary>

It means the compiler checked my code, not my data. At runtime there is no type
information left, so a request body typed as `CreateLink` is simply whatever
JSON arrived — the annotation is a promise about the code, not a guarantee
about the value.

So every boundary needs runtime validation: HTTP bodies and query strings,
environment variables, database rows if the driver is loosely typed, and
third-party responses. The pattern I use is a schema library like `zod` where
the TypeScript type is *derived from* the schema with `z.infer`, so the runtime
check and the compile-time type come from one declaration and cannot drift
apart.

The anti-pattern is casting — `as CreateLink` on a parsed body — which silences
the compiler and changes nothing about the data. It turns a 400 into a 500
somewhere deeper, usually in a place that is harder to debug.

</details>

**Follow-ups:**

1. Q: What's the difference between `any` and `unknown`?
   <details><summary>Answer</summary>

   `any` switches the checker off for that value and everything derived from
   it, and it spreads silently through a codebase. `unknown` is the top type:
   you can hold it, but you cannot use it until you have narrowed it with a
   type guard or a schema parse.

   `unknown` is what you want for incoming data and for `catch` bindings,
   because it forces the check you should be doing anyway.

   </details>

### Q: Two awaited calls in a handler, and the endpoint is slow. What do you look for?
**Level:** foundation · **Tags:** typescript, async, performance

<details><summary>Answer</summary>

Whether they actually depend on each other. `await a(); await b();` runs them
in sequence, so the handler costs the sum. If `b` does not need `a`'s result,
`Promise.all([a(), b()])` makes it the maximum instead — often halving the
endpoint's latency for a one-line change.

The caveats worth saying: `Promise.all` rejects as soon as any promise rejects,
and the others keep running, so use `allSettled` when partial results are
useful. And overlapping work is bounded by what the dependency can take — ten
parallel queries against a pool of five connections just queue, so concurrency
is something to bound rather than maximise.

The related bug is the floating promise: calling an async function without
`await` or `.catch()`, so a rejection becomes an unhandled rejection that kills
the process. The `no-floating-promises` lint rule catches it.

</details>

### Q: How do you handle errors in a TypeScript service?
**Level:** intermediate · **Tags:** typescript, errors

<details><summary>Model answer</summary>

Typed error classes plus one handler at the edge.

A base `AppError` carrying a status code and a stable machine-readable `code`,
with subclasses for the cases callers care about — not found, validation
failed, conflict, upstream failure. Handlers throw those; one error-handling
middleware at the edge maps them to responses, so status-code logic lives in a
single place rather than being duplicated in every route.

Anything that is not an `AppError` is a bug, so it becomes a 500 with a generic
message to the client and the full stack in the logs with the request id — never
the internal message to the caller, because that is how stack traces and SQL
end up in a response body.

Two details that matter in JavaScript specifically. `catch` gives you `unknown`
because anything can be thrown, so narrow with `instanceof` rather than
assuming `e.message` exists. And when wrapping an error, pass the original as
`{ cause: e }` so the real stack survives — a wrapped error with the cause
dropped is a debugging dead end.

At the process level I register `unhandledRejection` and `uncaughtException`
handlers that log and exit, because continuing in an unknown state is worse
than restarting.

</details>

---

## What a weak answer sounds like

- **"TypeScript makes it type-safe"** with no mention of runtime validation at
  the boundary.
- **Casting instead of parsing** — `as SomeType` on a request body.
- **`any` as the default** for anything inconvenient.
- **Sequential awaits** for independent work, and not seeing it.
- **`catch (e) { console.log(e.message) }`** — assuming what was thrown.
- **Not knowing that an unhandled rejection terminates the process** by default.

---

## Quiz

### MCQ: A handler declares its body as `CreateLink` and a client posts `{"url": 42}`. What happens?
- [ ] The TypeScript runtime rejects it with a type error
- [x] Nothing stops it — types are erased at build time, so the value is simply `42` until something validates it, and the failure surfaces later as a confusing 500
- [ ] The field is coerced to the string `"42"`
- [ ] The request is rejected by `tsc` at startup
**Why:** The annotation is a claim about the code, not a check on the data. Deriving the type from a `zod` schema with `z.infer` gives one declaration that validates at runtime and types at compile time.

### MCQ: What does `await a(); await b();` cost when the two calls are independent?
- [ ] `max(a, b)` — the runtime overlaps them automatically
- [x] `a + b` — `await` suspends until the first finishes, so they run in sequence; `Promise.all([a(), b()])` is what overlaps them
- [ ] Nothing, because both run on separate threads
- [ ] It depends on the number of CPU cores
**Why:** `await` yields the event loop, it does not create concurrency by itself. This is the most common avoidable latency in a Node handler, and the fix is one line.

### MCQ: Why is `unknown` the right type for a `catch` binding?
- [ ] It is an alias for `any` with a clearer name
- [x] JavaScript allows throwing any value, so the binding genuinely might not be an `Error`; `unknown` forces a narrowing check before use, while `any` would let `e.message` compile and fail at runtime
- [ ] It makes the error serialisable
- [ ] It prevents the error from propagating
**Why:** Narrowing with `instanceof` is the check you should perform anyway — the type is just making you do it.

### MCQ: What is `"strict": true` actually turning on that matters most?
- [ ] Stricter formatting rules
- [x] `strictNullChecks` among others — without it `null` and `undefined` are assignable to every type, so the checker cannot catch the single most common class of runtime error
- [ ] Runtime type validation
- [ ] Automatic `any` elimination
**Why:** Without strict mode the type system is largely decorative. Turning it on later in a large codebase is painful, which is why it goes in before the first line of code.

---

## Glossary

- **Type erasure** — types exist at build time only; nothing checks values at runtime.
- **`strict`** — the tsconfig flag enabling real null checking and the rest of the useful checks.
- **`unknown` vs `any`** — the top type that must be narrowed, versus switching the checker off.
- **Discriminated union** — a union of shapes distinguished by a literal tag, checked exhaustively by `switch`.
- **`z.infer`** — deriving the TypeScript type from a runtime schema, so the two cannot drift.
- **Branded type** — a string or number tagged at the type level so ids of different kinds are not interchangeable.
- **Floating promise** — an async call whose result is never awaited or caught; a rejection crashes the process.
- **`Promise.all` / `allSettled`** — overlap independent work; fail fast, or collect every outcome.
- **`cause`** — the option that chains a wrapped error to the original, preserving the real stack.
- **ES modules vs CommonJS** — `import`/`export` with explicit extensions, versus `require`.
