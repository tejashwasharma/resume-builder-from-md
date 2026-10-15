# Go from zero

Go, from the syntax up, for building services. The language is deliberately
small — you can hold all of it in your head, which is most of the point — so
this chapter covers essentially the whole thing you need, and the runtime
chapter that follows covers the part that makes Go *Go*.

If you come from TypeScript or Python, the three things that will feel
strangest: errors are values you check, there are no exceptions, and there is
no inheritance.

---

## In brief

- **The language is small on purpose.** No classes, no inheritance, no
  exceptions, no generics until recently and still used sparingly. Reading
  unfamiliar Go is unusually easy, which is a real operational property.
- **Errors are values, returned alongside results**, and checking them is
  explicit. `if err != nil` everywhere is not a wart — it is the language
  refusing to let a failure path be invisible.
- **Composition, not inheritance.** Interfaces are satisfied implicitly: any
  type with the right methods implements them, with no `implements` keyword and
  no dependency from the implementation to the interface.
- **The zero value is always valid and always defined** — `0`, `""`, `nil`,
  and a struct with all fields zeroed. Designing so the zero value is useful is
  idiomatic Go.
- **`nil` is not one thing.** A nil map reads fine and panics on write; a nil
  slice appends fine; a nil pointer dereference panics; and a nil interface is
  not the same as an interface holding a nil pointer.
- **Formatting is settled.** `gofmt` is not configurable, so nobody argues
  about it, and the toolchain — build, test, vet, modules — ships with the
  compiler.
- **It compiles to one static binary**, which is why a Go container image can be
  a few megabytes with no runtime inside it.

---

## Setting up

```bash
mkdir links-api && cd links-api
go mod init github.com/you/links-api     # creates go.mod: module path + Go version
go get github.com/go-chi/chi/v5          # adds a dependency, updates go.mod and go.sum
go build ./...                           # compile everything
go test ./...                            # run every test
go vet ./...                             # catch suspicious constructs
gofmt -l .                               # list unformatted files (CI gate)
go run .                                 # build and run
```

`go.mod` declares the module and its dependencies; `go.sum` pins their
checksums. Both are committed. There is no separate package manager, no
lockfile tool, and no virtual environment — the module *is* the isolation.

**Project layout**, by convention rather than enforcement:

```
cmd/api/main.go        # the binary's entry point; one directory per binary
internal/              # importable only by this module — the compiler enforces it
  http/                # handlers, middleware, router
  links/               # the domain
  store/               # database access
go.mod
```

`internal/` is a real language feature: packages under it cannot be imported by
other modules, which makes "this is not public API" a compiler guarantee rather
than a comment.

---

## The language

### Values, types and the zero value

```go
package main

import "fmt"

func main() {
    var port int = 3000        // explicit
    name := "links-api"        // short declaration, type inferred — the common form
    var ready bool             // zero value: false
    var count int              // 0
    var text string            // ""
    var items []string         // nil slice — but append works on it
    var lookup map[string]int  // nil map — reads work, writes PANIC

    lookup = make(map[string]int)   // maps must be made before writing
    items = append(items, "a")      // slices need not

    fmt.Println(port, name, ready, count, text, items, lookup)
}
```

**Every type has a zero value and it is always valid.** `int` is 0, `string` is
`""`, pointers, slices, maps, channels and interfaces are `nil`. A struct's
zero value is every field zeroed. Good Go design makes the zero value useful —
`var buf bytes.Buffer` is immediately usable with no constructor.

**The nil map trap is the one to remember**: reading a missing key from a nil
map returns the zero value quietly; writing to it panics.

### Slices and maps

```go
ids := []string{"a", "b", "c"}       // slice literal
ids = append(ids, "d")               // append returns a new slice header — assign it
sub := ids[1:3]                      // [b c] — shares the SAME backing array

counts := map[string]int{"a": 1}
counts["b"]++                        // missing key reads as 0, then increments
v, ok := counts["c"]                 // the comma-ok idiom: v=0, ok=false
delete(counts, "a")

for i, id := range ids { fmt.Println(i, id) }   // index, value
for key := range counts { fmt.Println(key) }   // map iteration order is RANDOM
```

Two facts worth internalising. **A slice is a view** — header plus a pointer to
a backing array — so `sub` above shares memory with `ids`, and writing through
one is visible in the other. And **map iteration order is deliberately
randomised**, so any code depending on it is broken; sort the keys when order
matters.

### Structs, methods and interfaces

```go
type Link struct {
    ID       string    `json:"id"`              // struct tags drive encoding
    URL      string    `json:"url"`
    TenantID string    `json:"-"`               // never serialised
    Hits     int       `json:"hits"`
    Created  time.Time `json:"created_at"`
}

// A method with a value receiver gets a copy; a pointer receiver can mutate.
// Pick one per type and stay consistent.
func (l Link) IsPopular() bool { return l.Hits > 100 }
func (l *Link) Visit()         { l.Hits++ }

// An interface is a set of method signatures. Nothing declares that it
// implements this — any type with these methods satisfies it automatically.
type LinkStore interface {
    Create(ctx context.Context, l Link) (Link, error)
    Get(ctx context.Context, id string) (Link, error)
}
```

**Implicit satisfaction is the core design idea.** The implementation does not
import the interface, so interfaces are declared *by the consumer*, next to the
code that needs them — which is why idiomatic Go interfaces are tiny, often one
method, and why dependency injection needs no framework.

**Embedding** is composition, and it is not inheritance:

```go
type Base struct{ ID string }
type User struct {
    Base                 // embedded: user.ID works, promoted from Base
    Email string
}
```

### Errors

```go
import "errors"

var ErrNotFound = errors.New("not found")        // a sentinel, comparable with errors.Is

type ValidationError struct{ Field, Reason string }
func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Reason)
}

func GetLink(id string) (Link, error) {
    l, ok := store[id]
    if !ok {
        // %w wraps: the caller can still match the original with errors.Is.
        return Link{}, fmt.Errorf("get link %s: %w", id, ErrNotFound)
    }
    return l, nil
}

func handler() {
    l, err := GetLink("abc")
    if err != nil {
        if errors.Is(err, ErrNotFound) { /* 404 */ }     // match a sentinel
        var ve *ValidationError
        if errors.As(err, &ve) { /* use ve.Field */ }    // match a type
        return
    }
    _ = l
}
```

`%w` wraps and preserves the chain; `%v` formats and loses it. `errors.Is`
compares against a sentinel through the chain; `errors.As` extracts a typed
error. Wrapping with context at each layer — `fmt.Errorf("creating link: %w",
err)` — produces a message that reads like a stack trace without needing one.

**There are no exceptions.** `panic` exists for programmer errors and
unrecoverable states — a nil dereference, an impossible branch — and library
code should not panic across its API boundary. `recover` exists mainly to stop
one request's panic from killing the whole server, which is what the HTTP
middleware in the next chapter does.

### Defer

```go
func process(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return fmt.Errorf("open %s: %w", path, err)
    }
    defer f.Close()          // runs when the function returns, by any path

    mu.Lock()
    defer mu.Unlock()        // the idiomatic lock pattern — impossible to forget

    return doWork(f)
}
```

Deferred calls run LIFO when the function returns, including on a panic. The
arguments are evaluated **at the `defer` statement**, not when it runs — a
common source of surprise.

### Generics, in the dose a service needs

```go
func Map[T, U any](xs []T, f func(T) U) []U {
    out := make([]U, 0, len(xs))
    for _, x := range xs { out = append(out, f(x)) }
    return out
}

type Number interface{ ~int | ~int64 | ~float64 }
func Sum[T Number](xs []T) T { var total T; for _, x := range xs { total += x }; return total }
```

Go got generics in 1.18 and the community uses them sparingly — for containers
and small utilities, rarely for business logic. Reaching for an interface first
is still the idiom.

---

## Building it

**The toolchain, which ships with the compiler**

| Need | Command | Note |
| --- | --- | --- |
| Dependencies | `go get`, `go mod tidy` | No external package manager |
| Build | `go build ./...` | One static binary per `cmd/` directory |
| Test | `go test ./... -race` | `-race` catches data races; run it in CI |
| Vet | `go vet ./...` | Suspicious constructs the compiler allows |
| Format | `gofmt -l .` | Not configurable; a CI gate, not a debate |
| Lint | `golangci-lint run` | Aggregates the useful linters |
| Benchmark | `go test -bench=. -benchmem` | Built in, including allocation counts |

**A complete, runnable program** — the same shape as the TypeScript and Python
versions, so the three are directly comparable:

```go
// main.go — run: go run main.go
package main

import (
    "crypto/rand"
    "encoding/base64"
    "errors"
    "fmt"
    "net/url"
    "time"
)

type Link struct {
    ID      string
    URL     string
    Hits    int
    Created time.Time
}

var ErrInvalidURL = errors.New("invalid url")

var store = map[string]*Link{}

func makeID() string {
    b := make([]byte, 5)
    rand.Read(b)
    return base64.RawURLEncoding.EncodeToString(b)
}

func create(raw string) (*Link, error) {
    u, err := url.ParseRequestURI(raw)
    if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
        return nil, fmt.Errorf("create %q: %w", raw, ErrInvalidURL)
    }
    l := &Link{ID: makeID(), URL: raw, Created: time.Now().UTC()}
    store[l.ID] = l
    return l, nil
}

func visit(id string) (*Link, error) {
    l, ok := store[id]
    if !ok {
        return nil, fmt.Errorf("visit %s: not found", id)
    }
    l.Hits++
    return l, nil
}

func main() {
    a, err := create("https://example.com/docs")
    if err != nil {
        panic(err)                       // top of main: nothing above to handle it
    }
    visit(a.ID)
    visit(a.ID)
    fmt.Printf("%s -> %s (%d hits)\n", a.ID, a.URL, store[a.ID].Hits)

    if _, err := create("not-a-url"); errors.Is(err, ErrInvalidURL) {
        fmt.Println("rejected:", err)
    }
}
```

---

## Interview Q&A

### Q: How does Go handle errors, and what do you think of it?
**Level:** intermediate · **Tags:** golang, errors

<details><summary>Model answer</summary>

Errors are ordinary values returned alongside results, and the caller checks
them explicitly. There are no exceptions, so there is no invisible control flow
— every place a function can fail is visible at the call site.

The machinery that makes it work at scale is wrapping. `fmt.Errorf("creating
link: %w", err)` adds context while preserving the original, so a caller can
still match it with `errors.Is` against a sentinel like `ErrNotFound`, or
extract a typed error with `errors.As`. Using `%v` instead of `%w` formats the
message and breaks that chain, which is a subtle and common bug.

My honest view: the verbosity is real, and `if err != nil` is a third of the
lines in some functions. What you get for it is that no failure path is
invisible and no function can throw past you — in a service, where most bugs
are unhandled failure paths, that trade is worth it. The thing to avoid is
treating it as ceremony and writing `if err != nil { return err }` everywhere
without adding context, because then you get the verbosity with none of the
diagnostic benefit.

`panic` is for programmer errors and genuinely unrecoverable states, not for
expected failures, and a library should not panic across its API boundary.

</details>

### Q: What makes Go's interfaces different from interfaces in Java or TypeScript?
**Level:** intermediate · **Tags:** golang, interfaces, design

<details><summary>Model answer</summary>

They are satisfied implicitly. A type implements an interface by having the
right methods — there is no `implements` keyword and no registration, so the
implementation has no dependency on the interface at all.

The practical consequence is that interfaces are declared by the *consumer*,
next to the code that needs them, rather than shipped with the implementation.
So they stay small — one or two methods is typical, and `io.Reader` with its
single method is the canonical example — and you can define an interface
describing exactly what your function needs from a dependency you do not own.

That is also why dependency injection in Go needs no framework: a constructor
takes an interface, production passes the real implementation, and a test
passes a struct with the same methods. No container, no decorators, no mocking
library required.

The related idiom is "accept interfaces, return structs": take the narrowest
interface you need as a parameter, return a concrete type so callers keep all
the information.

</details>

### Q: What's the difference between a nil slice and a nil map?
**Level:** foundation · **Tags:** golang, gotchas

<details><summary>Answer</summary>

A nil slice is usable: `append` works on it and returns a real slice, `len` is
0, and ranging over it does nothing. So `var items []string` followed by
`append` is perfectly idiomatic and needs no initialisation.

A nil map is read-only: looking up a key returns the zero value with `ok`
false, `len` is 0, and ranging does nothing — but **writing to it panics**. A
map must be created with `make` or a literal before any write.

That asymmetry catches people, usually as a nil map inside a struct that was
never initialised. The broader point is that Go's zero values are designed to
be useful where they can be, and the map is the exception — which is why
constructors for structs containing maps are worth writing.

</details>

---

## What a weak answer sounds like

- **`if err != nil { return err }`** everywhere with no added context.
- **`%v` instead of `%w`** when wrapping, breaking `errors.Is`.
- **Using panic for expected failures** like a missing record.
- **Large interfaces** declared next to the implementation, Java-style.
- **Not knowing the nil map write panics.**
- **Depending on map iteration order.**
- **Mutating a slice obtained by slicing another** and being surprised the
  original changed.

---

## Quiz

### MCQ: `var m map[string]int` — what happens on `m["a"] = 1`?
- [ ] It works; the map is created lazily
- [x] It panics — a nil map is readable but not writable, and must be created with `make` or a literal first
- [ ] It silently does nothing
- [ ] It is a compile error
**Why:** The asymmetry with slices is the point: `append` on a nil slice works fine. A nil map inside an un-initialised struct is where this usually bites.

### MCQ: What does `%w` do that `%v` does not in `fmt.Errorf`?
- [ ] It writes the error to the log
- [x] It wraps the original error so `errors.Is` and `errors.As` can still match it through the chain; `%v` only formats the text and loses the link
- [ ] It adds a stack trace
- [ ] It converts the error to a string permanently
**Why:** Wrapping with context at each layer gives a message that reads like a trace while keeping the error programmatically matchable — the whole design of Go error handling.

### MCQ: How does a type declare that it implements an interface in Go?
- [ ] With an `implements` clause in the type declaration
- [x] It does not — satisfaction is implicit and structural, so any type with the right method set satisfies the interface, and the implementation has no dependency on it
- [ ] By embedding the interface
- [ ] By registering it in an init function
**Why:** This is what lets interfaces be defined by the consumer, kept tiny, and used for dependency injection with no framework: a test just passes a struct with the same methods.

### MCQ: `sub := ids[1:3]` then `sub[0] = "x"`. What happens to `ids`?
- [ ] Nothing; slicing copies the elements
- [x] `ids[1]` becomes `"x"` — a slice is a view over a shared backing array, so writes through one are visible in the other
- [ ] A compile error, since slices are immutable
- [ ] Only if the slice is reallocated by `append`
**Why:** `copy` is what you want for an independent slice. The same sharing is why keeping a small slice of a huge array keeps the whole array alive in memory.

### MCQ: When is `panic` appropriate in idiomatic Go?
- [ ] Whenever a function fails, as the equivalent of throwing
- [x] For programmer errors and genuinely unrecoverable states — an impossible branch, a failed invariant at startup — not for expected failures, and not across a library's API boundary
- [ ] For any error that cannot be handled locally
- [ ] For validation failures in a request handler
**Why:** Expected failures are values. `recover` exists mainly at a boundary — HTTP middleware — so one request's panic does not take down the process.

---

## Glossary

- **Zero value** — the defined default of every type; designing so it is usable is idiomatic Go.
- **Short declaration (`:=`)** — declare and infer in one step, inside a function.
- **Slice** — a view (pointer, length, capacity) over a backing array; shared, not copied.
- **Nil map** — readable, panics on write; unlike a nil slice, which appends fine.
- **Struct tag** — metadata on a field (`json:"id"`) read by encoders and validators.
- **Implicit interface satisfaction** — a type implements an interface by having its methods, with no declaration.
- **Embedding** — composing a type by including another; promotes its fields and methods, and is not inheritance.
- **Sentinel error** — a package-level error value matched with `errors.Is`.
- **`%w` wrapping** — adding context while preserving the original error for `errors.Is`/`errors.As`.
- **`defer`** — schedules a call for function return, LIFO, with arguments evaluated at the defer statement.
- **`internal/`** — a directory whose packages cannot be imported by other modules; compiler-enforced privacy.
- **`go.mod` / `go.sum`** — module definition and dependency checksums; both committed.
