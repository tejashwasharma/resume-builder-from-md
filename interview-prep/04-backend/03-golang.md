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

## Glossary

- **Goroutine** — a runtime-scheduled concurrent function; ~2KB to start.
- **Channel** — a typed pipe between goroutines.
- **`select`** — wait on several channels; how timeouts are written.
- **`context.Context`** — cancellation, deadlines and request values.
- **M:N scheduler** — many goroutines onto few OS threads.
- **Race detector** — `go test -race`, finds unsynchronised access.
- **Goroutine leak** — one blocked forever; memory grows silently.
- **`%w`** — wraps an error, preserving the chain for `errors.Is`/`As`.
