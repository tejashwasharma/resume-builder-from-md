# Go

⚠️ **This is [WEAK-SPOTS](../WEAK-SPOTS.md) #2.** Go is on your resume's Backend
line, but every accomplishment you describe is Node/NestJS. Listing a language
invites a question in it, and "I've used it a little" *after* listing it beside
Node reads worse than not listing it.

Two honest routes: prepare it properly, or scope it clearly. Decide which before
your first interview.

> **FILL IN:** what Go have you actually written? Production service, internal
> tool, side project, or reading only? That answer decides your route.

---

## In brief

- **Confident scoping beats bluffing every time** — claiming Go depth you
  don't have gets found by the first real follow-up, and it damages
  credibility on everything else you said. Naming the actual gap ("my
  production depth is Node; I can read and modify Go comfortably") is the
  stronger answer.
- **A goroutine is scheduled by the Go runtime, not the OS** — starting at
  ~2KB of growable stack versus megabytes for an OS thread, which is why
  hundreds of thousands of goroutines are viable. The M:N scheduler
  multiplexes them onto few OS threads, moving another goroutine onto a
  thread whenever one blocks on I/O.
- **Node gives concurrency without parallelism; Go gives both** — Node's
  single thread means CPU-bound work blocks everything; Go runs CPU work in
  genuine parallel across cores. This is the honest, specific reason to
  reach for Go alongside Node, not a vague "Go is faster."
- **A goroutine leak is a goroutine blocked forever** on a channel nobody
  will ever write to or read from — silent, since nothing crashes, just a
  steadily growing memory footprint. The usual cause is a missing
  cancellation path; the fix is `context` with a `select` on `ctx.Done()`.
- **`context.Context` is the first parameter of nearly every Go function
  doing I/O** — it carries cancellation, deadlines, and request-scoped
  values through a call chain, giving deadline propagation for free:
  `context.WithTimeout` at the top means every layer below inherits the
  *remaining* budget, not a fresh timer.
- **Go has no exceptions — errors are values, returned and checked
  explicitly**, wrapped with `%w` to preserve the chain for `errors.Is`/
  `errors.As`. `panic` exists only for genuinely unrecoverable situations,
  never for control flow.

---

## If you're scoping it honestly

A good version sounds like:

> *"I've used Go for [X]. My production depth is in Node — that's where the
> auth platform work was. I can read and modify Go comfortably and I'd be
> productive in a Go codebase within a few weeks, but I wouldn't claim the same
> depth as Node."*

Confident scoping beats bluffing every time. What sinks people is claiming
parity and then failing a basic goroutine question.

Consider moving Go to a clearly secondary position on the resume if it's the
weakest item there.

---

## The basics worth knowing either way

### Goroutines

A goroutine is a function running concurrently, managed by Go's runtime rather
than the OS. They start at ~2KB of stack and grow, so hundreds of thousands are
fine — OS threads would die long before.

```go
go doSomething()        // starts a goroutine, returns immediately
```

The runtime multiplexes many goroutines onto few OS threads (the M:N
scheduler). That's why Go handles concurrency well without callbacks or async
syntax.

**Compared to Node:** Node has one thread and an event loop, so concurrency is
cooperative and CPU work blocks everything. Go has real parallelism across
cores, so CPU-bound work is genuinely a different story — which is the honest
reason to reach for Go alongside Node.

Both handle high concurrency; only Go gets parallelism for free. That's why Go
is the usual answer for CPU-bound services and Node is fine for I/O-bound ones.

When a goroutine blocks on I/O the scheduler puts another one on that thread,
so the thread is never idle. That plus the tiny growable stack is why hundreds
of thousands of goroutines are fine where OS threads would die.

### Channels

Typed pipes for passing values between goroutines.

```go
ch := make(chan int)      // unbuffered — send blocks until someone receives
ch := make(chan int, 10)  // buffered — send blocks only when full

ch <- 42                  // send
v := <-ch                 // receive
```

The slogan: **"Don't communicate by sharing memory; share memory by
communicating."** Pass ownership of data through a channel instead of guarding
it with a mutex.

`select` waits on several channels at once — this is how timeouts and
cancellation are done:

```go
select {
case v := <-ch:
    use(v)
case <-time.After(time.Second):
    return errors.New("timeout")
}
```

### Context

`context.Context` carries cancellation, deadlines and request-scoped values
through a call chain. **It's the first parameter of essentially every
Go function that does I/O**, and using it correctly is a strong signal.

```go
func GetUser(ctx context.Context, id string) (*User, error)
```

When a request is cancelled, the context cancels, and every downstream call
using it stops. That's deadline propagation built into the language.

### The common bugs

**Goroutine leaks** — a goroutine blocked forever on a channel nobody will
write to. It never exits, and its memory is never freed. The usual cause is
forgetting a cancellation path.

**Data races** — two goroutines touching the same variable without
synchronisation. Go ships a race detector (`go test -race`); use it.

**The loop variable gotcha** — in Go before 1.22, `for i := range x { go f(i) }`
shared one variable across iterations, so goroutines often saw the last value.
Go 1.22 changed loop variables to be per-iteration, which fixed it. Knowing
both the bug and that it was fixed is a nice signal.

### Error handling

No exceptions. Errors are values you return and check:

```go
user, err := GetUser(ctx, id)
if err != nil {
    return fmt.Errorf("getting user: %w", err)   // %w wraps, preserving the chain
}
```

Verbose, and deliberately so — every failure is visible at the call site rather
than jumping to some distant handler. `panic` exists but is for genuinely
unrecoverable situations, not for control flow.


## Building it

Consistent with "If you're scoping it honestly": don't reach for a library
list here you can't back up. The standard library covers most of what
gets asked (`net/http`, `context`, `sync`) — naming a third-party router
(`gin`, `chi`) only if the interviewer asks how you'd structure a larger
service, not unprompted.

**Pseudocode — a goroutine leak, and the fix from "The common bugs"**

```go
// leaks: nothing ever reads from ch if the caller stops waiting
func fetch() <-chan int {
    ch := make(chan int)
    go func() { ch <- expensiveCall() }()
    return ch
}

// fixed: buffered channel, or a context that cancels the goroutine
func fetch(ctx context.Context) <-chan int {
    ch := make(chan int, 1)
    go func() {
        select {
        case ch <- expensiveCall():
        case <-ctx.Done():
        }
    }()
    return ch
}
```

---

## Interview Q&A

### Q: What's the difference between a goroutine and a thread?
**Level:** intermediate · **Tags:** golang, concurrency

<details><summary>Model answer</summary>

A goroutine is managed by the Go runtime, not the operating system. It starts
with about 2KB of stack that grows as needed, where an OS thread reserves
megabytes. So you can run hundreds of thousands of goroutines, which you
absolutely could not do with threads.

The runtime multiplexes them onto a smaller number of OS threads — an M:N
scheduler. When a goroutine blocks on I/O, the scheduler moves another one onto
that thread rather than leaving it idle.

Switching between goroutines is also much cheaper, because it happens in user
space and doesn't need a kernel context switch.

The comparison I'd draw to what I know best: Node gives you concurrency on one
thread through an event loop, so CPU-bound work blocks everything. Go gives you
real parallelism across cores with cheap concurrency on top. That's the honest
reason to pick Go for CPU-heavy services even in a mostly-Node stack.

</details>

**Follow-ups:**

1. Q: What's a goroutine leak?
   <details><summary>Answer</summary>

   A goroutine that never finishes — usually blocked forever sending to or
   receiving from a channel that nothing will ever touch again.

   It's a leak because the goroutine and everything it references stay alive,
   so memory grows steadily. And unlike a crash it's silent: the service just
   gets slowly heavier until it's restarted or dies.

   The usual cause is a missing cancellation path — you start a goroutine to do
   some work, the caller returns early on an error, and nobody tells the
   goroutine to stop.

   The fix is `context`: pass a context in, and have the goroutine `select` on
   `ctx.Done()` alongside its real work, so cancellation always has a route
   out. Buffered channels also help where a send might otherwise block with no
   receiver.

   You can spot them by watching the goroutine count over time — if it only
   ever goes up, something isn't exiting.

   </details>

2. Q: When would you pick Go over Node?
   <details><summary>Answer</summary>

   CPU-bound work is the clearest case. Node runs your code on one thread, so
   heavy computation blocks everything; Go runs it in parallel across cores
   without any special handling.

   Also: services where predictable latency matters, since Go's GC pauses are
   short and tuned for that; single-binary deployment, which makes containers
   tiny and removes runtime dependencies; and long-lived connection handling at
   very high counts, where goroutines-per-connection is a genuinely simple
   model.

   Node stays better for I/O-heavy services where the ecosystem matters, for
   sharing code and types with a TypeScript frontend, and simply where the team
   is already fluent — team familiarity is a real engineering factor, not a
   cop-out.

   I'd be straightforward that my production depth is in Node; the auth
   platform work was all Node and NestJS. I can work in Go, and I'd want a bit
   of ramp-up time before claiming otherwise.

   </details>

### Q: What is `context` used for?
**Level:** intermediate · **Tags:** golang, context, cancellation

<details><summary>Model answer</summary>

It carries cancellation, deadlines and request-scoped values through a call
chain, and it's conventionally the first argument to any function that does
I/O.

The main use is cancellation. When an HTTP request is cancelled — the client
disconnected, or a deadline passed — the context cancels, and every downstream
call that received it can stop immediately. Without that, work carries on
producing a result nobody will read, which under load is a meaningful waste.

`context.WithTimeout` gives you deadline propagation for free: set a budget at
the top, and every layer below inherits the *remaining* time rather than
starting a fresh timer. That's exactly the deadline-propagation pattern you'd
otherwise have to build by hand.

It also carries request-scoped values like a trace id or the authenticated
user — though the convention is to use that sparingly, for things genuinely
scoped to the request, not as a general-purpose bag.

The rule people repeat: don't store a context in a struct, pass it explicitly.
That keeps the cancellation path visible.

</details>

---

## What a weak answer sounds like

- **"Goroutines are lightweight threads"** and nothing more. Say *why* —
  user-space scheduling, small growable stacks.
- **Not knowing about `context`.** It's in every real Go codebase.
- **Claiming Go depth you don't have.** The follow-up finds it, and it damages
  everything else you said.
- **Not knowing the loop variable gotcha**, or that Go 1.22 fixed it.

---

## Quiz

### MCQ: What's the main structural difference between a goroutine and an OS thread?
- [ ] Goroutines can only run on a single CPU core
- [x] A goroutine starts with a tiny (~2KB) growable stack managed by the Go runtime, versus megabytes reserved for an OS thread — enabling hundreds of thousands of goroutines
- [ ] Goroutines require explicit thread pool configuration
- [ ] OS threads are managed by the Go runtime as well
**Why:** This size difference plus user-space scheduling (no kernel context switch) is why goroutine-per-connection scales to numbers that would exhaust OS threads.

### MCQ: What does Go's M:N scheduler actually do?
- [ ] It limits the program to exactly N goroutines at a time
- [x] It multiplexes many goroutines (M) onto a smaller number of OS threads (N), moving another goroutine onto a thread whenever one blocks on I/O
- [ ] It creates one OS thread per goroutine
- [ ] It's a memory allocation strategy, unrelated to concurrency
**Why:** This is what lets Go handle massive goroutine counts efficiently — a blocked goroutine doesn't leave its OS thread idle, since the scheduler moves other work onto it.

### MCQ: What's the key difference between how Node and Go handle CPU-bound work?
- [ ] They handle it identically; both block on CPU work
- [x] Node's single thread means CPU-bound work blocks everything else; Go can run CPU-bound work genuinely in parallel across multiple cores
- [ ] Go is single-threaded like Node but with a faster JIT compiler
- [ ] Node handles CPU-bound work better than Go
**Why:** This is the honest, specific reason to reach for Go for CPU-heavy services alongside a Node stack — not a vague "faster," but genuine multi-core parallelism versus a single JS thread.

### MCQ: What is a "goroutine leak"?
- [ ] A goroutine that runs too many times
- [x] A goroutine blocked forever on a channel operation that will never complete, keeping it and everything it references alive indefinitely
- [ ] A memory allocation that exceeds the configured heap size
- [ ] A goroutine that panics without being recovered
**Why:** Unlike a crash, this is silent — the process just gets steadily heavier as leaked goroutines accumulate, usually because a cancellation path (via `context`) was never wired in.

### MCQ: How does `context.WithTimeout` give "deadline propagation" for free?
- [ ] It automatically retries failed operations with backoff
- [x] A budget set at the top of a call chain is inherited by every downstream call as the *remaining* time, rather than each layer starting a fresh independent timer
- [ ] It converts all errors into timeouts automatically
- [ ] It only affects the top-level function, not downstream calls
**Why:** This is exactly the deadline-propagation pattern that has to be built by hand in many other languages — passing a context through the call chain gives it automatically.

### MCQ: Why is passing `context.Context` explicitly as a function parameter preferred over storing it in a struct?
- [ ] Structs in Go cannot hold interface values
- [x] Explicit passing keeps the cancellation path visible at every call site, rather than hidden inside object state
- [ ] Storing context in a struct causes a compile error
- [ ] It's purely a stylistic preference with no functional difference
**Why:** The convention exists specifically so a reader can see, at each function signature, that cancellation and deadlines flow through — hiding it in a struct obscures that.

### MCQ: How does Go handle errors, in contrast to languages with exceptions?
- [ ] Go has exceptions but discourages their use
- [x] Errors are ordinary return values that must be explicitly checked at each call site — there's no automatic propagation to a distant handler
- [ ] Go automatically logs and swallows all errors
- [ ] Errors can only be handled via `panic`/`recover`
**Why:** This is deliberate: every failure is visible where it occurs rather than jumping to a handler elsewhere, which is more verbose but keeps failure handling explicit.

### MCQ: What does wrapping an error with `%w` (e.g. `fmt.Errorf("getting user: %w", err)`) preserve that using `%v` would not?
- [ ] The original error's stack trace
- [x] The error chain, so `errors.Is` and `errors.As` can still identify or unwrap the original underlying error
- [ ] The error's exact formatting in logs
- [ ] Nothing — `%w` and `%v` behave identically
**Why:** `%w` specifically marks the wrapped error as unwrappable, letting callers programmatically check "is this ultimately a not-found error?" even after several layers of wrapping.

### MCQ: Before Go 1.22, what was the "loop variable gotcha" with code like `for i := range x { go f(i) }`?
- [ ] `f` would never actually be called
- [x] All goroutines shared the same loop variable, so they often ended up seeing its final value rather than the value at the time each goroutine was launched
- [ ] The loop would run infinitely
- [ ] This was never actually a bug — it's a common misconception
**Why:** Go 1.22 changed loop variables to be scoped per-iteration, fixing this — knowing both the historical bug and that it's fixed is a useful, specific signal of real Go experience.

### MCQ: What should trigger `panic` in idiomatic Go code, according to this chapter?
- [ ] Any error that a caller should handle
- [x] Only genuinely unrecoverable situations — not ordinary control flow, which should use returned error values instead
- [ ] Input validation failures
- [ ] Any function that might fail
**Why:** Using `panic` for expected failure conditions (bad input, not-found, etc.) misuses the mechanism — Go's idiom is that ordinary, expected errors are values returned and checked, not exceptions thrown.

---

## Glossary

- **Goroutine** — a runtime-scheduled concurrent function; ~2KB to start.
- **Channel** — a typed pipe between goroutines.
- **`select`** — wait on several channels; how timeouts are written.
- **`context.Context`** — cancellation, deadlines and request values.
- **M:N scheduler** — many goroutines onto few OS threads.
- **Race detector** — `go test -race`, finds unsynchronised access.
- **Goroutine leak** — one blocked forever; memory grows silently.
- **`%w`** — wraps an error, preserving the chain for `errors.Is`/`As`.
