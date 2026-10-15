# Testing, structure and production

Go's answers here are unusually self-contained: the test runner, the
benchmarking tool, the race detector and the profiler all ship with the
compiler, and the deployment artefact is one static binary. This chapter is
what to do with them.

---

## In brief

- **Table-driven tests are the idiom.** One test function, a slice of cases, a
  subtest per case — it is how the standard library tests itself, and it makes
  adding a case a one-line change.
- **`httptest` makes handler tests trivial**: a recorder captures the response
  in memory, so there is no server, no port and no network.
- **`-race` is not optional in CI.** The race detector finds data races that are
  invisible until a specific interleaving happens in production.
- **Interfaces declared by the consumer are the whole mocking story.** A fake is
  a struct with the right methods; no mocking library is required or idiomatic.
- **`go test -bench` and `pprof` are built in**, so "it got slower" is a
  measurable question rather than an argument.
- **A static binary in a scratch or distroless image** is a container measured
  in megabytes with no runtime, no shell and almost no attack surface.
- **In a container, set `GOMAXPROCS` from the CPU limit and `GOMEMLIMIT` under
  the memory limit.** Both default to the machine, not the cgroup, and both
  cause bad production behaviour.

---

## Testing

### Table-driven tests

```go
func TestShorten(t *testing.T) {
    cases := []struct {
        name    string
        url     string
        wantErr error
    }{
        {"https", "https://example.com", nil},
        {"http", "http://example.com", nil},
        {"javascript scheme", "javascript:alert(1)", ErrInvalidURL},
        {"empty", "", ErrInvalidURL},
        {"too long", "https://x.com/" + strings.Repeat("a", 3000), ErrTooLong},
    }

    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {       // a named subtest per case
            _, err := Shorten(tc.url)
            if !errors.Is(err, tc.wantErr) {
                t.Errorf("Shorten(%q) error = %v, want %v", tc.url, err, tc.wantErr)
            }
        })
    }
}
```

Note the error message style: Go's convention is `got X, want Y` with the input
included, because a failing test should tell you what happened without you
opening the file.

### Handler tests

```go
func TestGetLink(t *testing.T) {
    store := &fakeStore{links: map[string]links.Link{
        "abc": {ID: "abc", URL: "https://example.com", TenantID: "t1"},
    }}
    srv := NewServer(store, slog.New(slog.NewTextHandler(io.Discard, nil)))

    req := httptest.NewRequest(http.MethodGet, "/links/abc", nil)
    req.Header.Set("Authorization", "Bearer "+testToken(t, "t1", "links:read"))
    rec := httptest.NewRecorder()

    srv.ServeHTTP(rec, req)

    if rec.Code != http.StatusOK {
        t.Fatalf("got %d, want 200; body=%s", rec.Code, rec.Body)
    }
    var got links.Link
    if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
        t.Fatalf("decoding response: %v", err)
    }
    if got.URL != "https://example.com" {
        t.Errorf("got url %q, want %q", got.URL, "https://example.com")
    }
}
```

### Fakes, without a mocking library

```go
// The interface is declared in the domain package by the consumer, so a fake
// is just a struct with the right methods. No codegen, no mock framework.
type fakeStore struct {
    links map[string]links.Link
    saved []links.Link
    err   error              // make it fail, to test the error path
}

func (f *fakeStore) Get(ctx context.Context, id string) (links.Link, error) {
    if f.err != nil { return links.Link{}, f.err }
    l, ok := f.links[id]
    if !ok { return links.Link{}, links.ErrNotFound }
    return l, nil
}

func (f *fakeStore) Create(ctx context.Context, l links.Link) (links.Link, error) {
    if f.err != nil { return links.Link{}, f.err }
    f.saved = append(f.saved, l)
    return l, nil
}
```

`gomock` and `testify/mock` exist, and plenty of teams use them, but a hand-
written fake is usually shorter than the mock setup it replaces and reads
better in the failure.

### The race detector

```bash
go test ./... -race          # in CI, always
go run -race .               # locally, when chasing something intermittent
```

```go
// This test fails under -race and passes without it, which is precisely why
// the flag matters: the bug exists either way.
func TestCounterIsRacy(t *testing.T) {
    c := Counter{}
    var wg sync.WaitGroup
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func() { defer wg.Done(); c.n++ }()   // unsynchronised write
    }
    wg.Wait()
}
```

The race detector instruments memory access, so it is roughly 10× slower and
uses more memory — fine for CI, not for production.

### Benchmarks

```go
func BenchmarkShorten(b *testing.B) {
    for i := 0; i < b.N; i++ {
        _, _ = Shorten("https://example.com/some/long/path")
    }
}
```

```bash
go test -bench=. -benchmem ./...
# BenchmarkShorten-8   2451234   487 ns/op   128 B/op   3 allocs/op
```

`allocs/op` is the number to watch: allocations drive GC pressure, and removing
one in a hot path is usually worth more than micro-optimising the logic.

---

## Structure

```
cmd/
  api/main.go            # the binary: wire everything, start, shut down
internal/
  http/                  # handlers, middleware, router, error mapping
  links/                 # domain: types, rules, and the interfaces it needs
  store/                 # Postgres implementation of links' interfaces
  config/
go.mod
```

**`internal/` is enforced by the compiler**: no other module can import
anything under it, so "this is not public API" is a guarantee rather than a
convention.

**Dependencies point inwards.** `http` imports `links`; `links` imports
neither `http` nor `store`, and declares the interfaces it needs; `store`
implements them. `main` is the only place that knows all three exist:

```go
func main() {
    cfg := mustLoadConfig()
    pool := mustConnect(cfg.DatabaseURL)
    defer pool.Close()

    store := store.NewPostgres(pool)        // implements links.Store
    svc := links.NewService(store, idGen)   // domain, knows nothing of HTTP
    srv := httpapi.NewServer(svc, logger)   // transport

    run(srv, cfg)
}
```

This is also the dependency injection story in full: constructors take
interfaces, `main` wires concrete types, tests pass fakes. Wire and similar
tools exist for large dependency graphs; for a service of this size, explicit
wiring in `main` is clearer than any generated container.

---

## Packaging

```dockerfile
# Build stage: the toolchain, producing one static binary.
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download                      # cached unless the module files change
COPY . .
# CGO off makes it fully static, so it runs in an image with no libc at all.
# -trimpath removes local paths; the ldflags strip debug info and stamp a version.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=$(git rev-parse --short HEAD)" \
    -o /out/api ./cmd/api

# Runtime stage: nothing but the binary and certificates.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/api"]
```

The result is typically 10–20MB with no shell, no package manager and no
interpreter — a very small attack surface, and the main reason Go is popular
for infrastructure services. `distroless/static` still provides CA
certificates and timezone data, which `scratch` does not; if you use
`scratch`, copy `ca-certificates.crt` in or every outbound TLS call fails.

**The two container settings that matter:**

```yaml
env:
  - name: GOMAXPROCS          # or use go.uber.org/automaxprocs
    valueFrom: { resourceFieldRef: { resource: limits.cpu } }
  - name: GOMEMLIMIT          # a little under the memory limit
    value: "450MiB"
resources:
  limits: { cpu: "1", memory: "512Mi" }
```

Without the first, the runtime sees every core on the node and creates that
many logical processors on a fraction of a core — context switching and CFS
throttling. Without the second, the GC targets a heap the container is not
allowed to have, and the kernel OOM-kills the process instead.

---

## Running it

**Profiling, which is unusually good:**

```go
import _ "net/http/pprof"            // registers handlers on the default mux

// Expose it on a separate, internal-only port — never on the public listener.
go func() { log.Println(http.ListenAndServe("localhost:6060", nil)) }()
```

```bash
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30   # CPU
go tool pprof http://localhost:6060/debug/pprof/heap                 # memory
curl http://localhost:6060/debug/pprof/goroutine?debug=1 | head -40  # goroutine leak
go tool trace trace.out                                              # scheduler detail
```

The goroutine profile is the one to reach for first when memory climbs steadily:
a leak usually shows as thousands of goroutines parked on the same channel
receive, with the stack naming the function that forgot a cancellation path.

**What to watch:**

| Signal | Why |
| --- | --- |
| **Goroutine count** | Steady growth is a leak; it is Go's clearest memory-leak signal |
| **GC pause and frequency** | Rising frequency means allocation pressure, not necessarily a leak |
| **Heap in use vs `GOMEMLIMIT`** | Approaching the limit means the GC is working hard to avoid an OOM kill |
| **p99 by endpoint** | Averages hide the tail that users feel |
| **Open connections / file descriptors** | Growth without bound means something is not being closed |

**The checklist before real traffic:**

- [ ] Server timeouts set — read-header, read, write, idle
- [ ] `MaxBytesReader` on every handler that reads a body
- [ ] Recovery middleware logging the stack and returning a mapped 500
- [ ] Every outbound `http.Client` has a `Timeout` (the default has none)
- [ ] `ctx` threaded into every I/O call, including database queries
- [ ] `GOMAXPROCS` from the CPU limit, `GOMEMLIMIT` under the memory limit
- [ ] Graceful shutdown: readiness fails, pause, `srv.Shutdown`, close the pool
- [ ] `go test ./... -race` and `go vet ./...` in CI
- [ ] pprof exposed on an internal port only

---

## Interview Q&A

### Q: How do you test a Go HTTP service, and what do you mock?
**Level:** intermediate · **Tags:** golang, testing

<details><summary>Model answer</summary>

Mostly with `httptest`: build the server with its real middleware chain and a
fake store, create a request with `httptest.NewRequest`, capture the response
with `httptest.NewRecorder`, and assert on the recorder. No port, no network,
and it runs in microseconds — so these cover routing, middleware ordering,
validation and error mapping, which is where most of the value is.

Mocking in Go barely exists as a separate activity, because interfaces are
declared by the consumer and satisfied implicitly. A fake store is a struct
with the right methods and a slice recording what it was asked to save. That is
usually shorter than the setup a mocking library would need, and the failure
message is clearer. `gomock` and `testify/mock` exist and are reasonable for
large interfaces; they are not the default.

The style convention is table-driven tests — one function, a slice of cases, a
subtest per case — because adding a case becomes a single line and each subtest
is independently named and runnable.

And `-race` in CI, always. A data race is invisible until the wrong
interleaving happens in production, and the detector finds it reliably in tests
that exercise concurrency.

</details>

### Q: Why is a Go container image so small, and what do you give up?
**Level:** intermediate · **Tags:** golang, containers

<details><summary>Answer</summary>

Because the build produces one statically linked binary with the runtime inside
it, so the image needs nothing else — no interpreter, no standard library to
install, no package manager. With `CGO_ENABLED=0` and a distroless or scratch
base, the whole image is the binary plus CA certificates, typically 10–20MB.

What you give up is the ability to debug inside the container: there is no
shell, so `kubectl exec` gives you nothing, and you rely on logs, metrics and
pprof over a port instead. In Kubernetes an ephemeral debug container solves
that when you really need it.

Two details worth knowing. With `scratch` you must copy CA certificates in
yourself or every outbound HTTPS call fails with an x509 error — distroless
static includes them, which is why it is the better default. And `CGO_ENABLED=0`
changes DNS resolution to Go's pure-Go resolver, which behaves slightly
differently from libc's; that is usually fine and occasionally surprising in
unusual network setups.

</details>

### Q: Memory grows steadily in a Go service until it is OOM-killed. How do you find the cause?
**Level:** senior · **Tags:** golang, debugging, memory

<details><summary>Model answer</summary>

First I would check the goroutine count, because in Go a steadily growing heap
is very often a goroutine leak rather than a classic retained-object leak. The
goroutine profile — `/debug/pprof/goroutine?debug=1` — shows every goroutine's
stack, and a leak appears as thousands parked at the same line, usually a
channel receive or send with no cancellation path. The stack names the function
that forgot one.

If the goroutine count is flat, I would take a heap profile and compare two
snapshots a few minutes apart to see which allocation sites are growing.
Typical causes: an unbounded in-memory cache with no eviction, a slice that
keeps a reference to a much larger backing array, or a long-lived map
accumulating per-request entries.

Then I would check `GOMEMLIMIT` and the container's memory limit, because a
third case looks identical from the outside: no leak at all, but a heap target
larger than the container is allowed, so the GC never feels pressure and the
kernel kills the process. Setting `GOMEMLIMIT` just under the limit turns that
into the GC working harder rather than a hard kill.

And I would confirm whether the growth plateaus — Go returns memory to the OS
lazily, so RSS rising and then stabilising is normal behaviour, not a leak.

</details>

---

## What a weak answer sounds like

- **A mocking framework** where a 10-line fake struct would do.
- **No `-race` in CI.**
- **`http.Client{}` with no timeout** for outbound calls.
- **Tests that start a real server on a port** instead of using `httptest`.
- **Not knowing `GOMAXPROCS` ignores the cgroup limit.**
- **Blaming the GC** for memory growth that is a goroutine leak.
- **pprof exposed on the public listener.**

---

## Quiz

### MCQ: What is the idiomatic Go test style for many similar cases?
- [ ] One test function per case, named descriptively
- [x] A table-driven test: one function, a slice of case structs, and `t.Run` for a named subtest per case
- [ ] A BDD-style framework with `Describe` and `It`
- [ ] Parameterised tests generated by `go generate`
**Why:** Adding a case becomes one line, each subtest is independently named and runnable, and it is how the standard library tests itself.

### MCQ: Why does Go need no mocking framework for most tests?
- [ ] Because interfaces can be instantiated directly
- [x] Interfaces are satisfied implicitly and declared by the consumer, so a fake is just a struct with the right methods — usually shorter than a mock's setup
- [ ] Because `httptest` generates mocks automatically
- [ ] Because the race detector replaces dependency isolation
**Why:** The same property that makes interfaces small and consumer-owned makes test doubles trivial. Mocking libraries exist and are reasonable for large interfaces, but they are not the default.

### MCQ: What makes a Go container image 10–20MB with no runtime inside?
- [ ] Aggressive layer compression
- [x] The build produces one statically linked binary containing the runtime, so with `CGO_ENABLED=0` and a distroless or scratch base the image is essentially just that binary and CA certificates
- [ ] Go images share the host's standard library
- [ ] The compiler strips the garbage collector in production builds
**Why:** The trade is no shell for debugging — logs, metrics, pprof and ephemeral debug containers instead. With `scratch` specifically you must add CA certificates yourself or outbound TLS fails.

### MCQ: A Go service's memory grows steadily. What do you check first?
- [ ] The GC's `GOGC` setting
- [x] The goroutine count and the goroutine profile — in Go a growing heap is very often a goroutine leak, visible as thousands parked at the same channel operation
- [ ] The size of the Docker image
- [ ] The number of open database connections only
**Why:** `/debug/pprof/goroutine?debug=1` names the function that forgot a cancellation path. If goroutines are flat, compare two heap profiles; and check `GOMEMLIMIT`, since a heap target larger than the container allows looks identical from outside.

### MCQ: Why run `go test -race` in CI even though it slows tests down?
- [ ] It enables parallel test execution
- [x] A data race produces wrong behaviour only on specific interleavings, so it can pass every normal test and fail in production; the detector finds it reliably by instrumenting memory access
- [ ] It is required for benchmarks to be accurate
- [ ] It checks that all goroutines have exited
**Why:** Roughly 10× slower and memory-hungry — fine in CI, not in production. It is the cheapest insurance available for concurrent code.

### MCQ: What does an `http.Client` with no explicit `Timeout` do?
- [ ] Defaults to 30 seconds
- [x] Waits indefinitely — there is no default timeout, so one unresponsive upstream can accumulate goroutines and connections until the process fails
- [ ] Inherits the server's `WriteTimeout`
- [ ] Fails immediately if the host is unreachable
**Why:** The same class of mistake as the zero-value `http.Server` having no timeouts. Both defaults are safe for a toy and dangerous in production.

---

## Glossary

- **Table-driven test** — one test function iterating a slice of cases with `t.Run` subtests.
- **`httptest.NewRecorder` / `NewRequest`** — in-memory response capture and request construction; no server needed.
- **Race detector (`-race`)** — instruments memory access to catch data races; CI-only because of the overhead.
- **`allocs/op`** — allocations per benchmark iteration; the number that drives GC pressure.
- **`internal/`** — compiler-enforced module-private packages.
- **`CGO_ENABLED=0`** — produces a fully static binary and switches to the pure-Go DNS resolver.
- **Distroless / scratch** — minimal base images; distroless static still ships CA certificates.
- **`GOMAXPROCS` / `GOMEMLIMIT`** — the two settings that must come from the container's limits, not the machine.
- **pprof** — built-in CPU, heap, goroutine and block profiling, exposed over HTTP on an internal port.
- **Goroutine profile** — the first place to look for a leak; shows every goroutine's stack.
