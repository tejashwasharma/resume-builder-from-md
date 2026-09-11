# OAuth 2.0

Your specialty, and the protocol you'll be questioned on hardest. You ran a
multi-tenant OAuth server, so expect questions to go past "explain the flow"
into operating one.

Spec: [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) ·
PKCE: [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) ·
[OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-10)

---

## Foundations

**OAuth 2.0 is a delegated authorization framework.** It lets a user grant an
application limited access to their resources on another service, without
sharing their password.

Say that precisely in an interview, because the single most common error is
calling it an authentication protocol. **OAuth 2.0 does not authenticate
users.** It issues access tokens to clients. Authentication on top of OAuth is
OpenID Connect (see [oidc](03-oidc.md)). "Log in with Google" is OIDC, not raw OAuth.

**The four roles:**

| Role | Who |
| --- | --- |
| **Resource owner** | The user who owns the data |
| **Client** | The application requesting access |
| **Authorization server** | Issues tokens — *what you built* |
| **Resource server** | Holds the API, accepts tokens |

**Client types.** A **confidential** client can keep a secret (a backend
server). A **public** client cannot (SPA, mobile app — ship the secret and it's
extractable). This distinction drives which flows are safe.

---

## How it actually works

### Authorization Code flow with PKCE — the one that matters

Every other flow is either a special case or deprecated. Know this cold.

The flow splits into two channels. The **front channel** is every step that
travels through the browser — the redirect to `/authorize`, the login and
consent, the redirect back with the code — so it lands in the URL bar, history,
referrer headers and proxy logs. The **back channel** is the direct
server-to-server call from PhotoApp's backend to `/token`, where nothing
observes it.

That split is the whole design. What comes back on the front channel is a
*code*, not a token: a code is short-lived, single-use, and worthless without
the `code_verifier`, which only PhotoApp's backend ever sends — and it sends it
on the back channel.

```mermaid
sequenceDiagram
    autonumber
    participant U as User's browser
    participant C as Client backend
    participant A as Authorization server
    participant R as Resource server

    Note over C: verifier stays in memory<br/>challenge = SHA-256(verifier)
    U->>A: GET /authorize + code_challenge + state
    A-->>U: login and consent
    A-->>U: 302 /callback?code=...
    U->>C: GET /callback?code=...
    C->>A: POST /token + code + code_verifier
    A-->>C: access_token + refresh_token
    C->>R: GET /v3/entries with Bearer token
```
*Steps 1-4 are the front channel, through the browser: only a code travels there. Step 5 is the back channel, and it is the only place the verifier appears.*

### Who's who

Before the steps, be clear on the four parties — interviewers often check this
first, and mixing up client and resource server is a common slip.

| Party | In plain terms | Concrete example |
| --- | --- | --- |
| **Resource owner** | The human who owns the data | The Contentstack user logging in |
| **Client** | The app asking for access | A dashboard SPA, a mobile app, a partner integration |
| **Authorization server** | Issues tokens. **This is what you built.** | `auth.contentstack.com` |
| **Resource server** | The API that accepts the token | `api.contentstack.com/v3/entries` |

The client is *not* the user, and the authorization server is *not* the API.
They are often different hostnames run by different teams.

### The steps, with the actual requests

**Step 1 — the client prepares a secret it never sends.**

```bash
# code_verifier: 43-128 random chars, kept in memory on the client
code_verifier="dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

# code_challenge: its SHA-256, base64url-encoded, no padding
code_challenge=$(printf '%s' "$code_verifier" \
  | openssl dgst -binary -sha256 \
  | openssl base64 -A | tr '+/' '-_' | tr -d '=')
# -> E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
```

The verifier stays on the client. Only the challenge (its hash) is sent yet.

**Step 2 — send the user to the authorization server.** This is a browser
redirect, not an API call, so there is no curl for it — that's the point of a
*front* channel:

```
GET https://auth.example.com/authorize
      ?response_type=code
      &client_id=dashboard-spa
      &redirect_uri=https://app.example.com/callback
      &scope=openid%20entries:read
      &state=af0ifjsldkj                       # CSRF protection
      &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
      &code_challenge_method=S256
```

| Parameter | Why it's there |
| --- | --- |
| `response_type=code` | Ask for a code, not a token. `token` here would be the removed implicit flow |
| `client_id` | Which app is asking. Public — not a secret |
| `redirect_uri` | Where to send the user back. Must match a registered URI **exactly** |
| `scope` | What the app wants to be allowed to do |
| `state` | Random, tied to the browser session. Checked on return — stops CSRF |
| `code_challenge` | The hash from step 1 |
| `code_challenge_method=S256` | Say it's SHA-256. `plain` exists and is useless |

**Step 3 — the user authenticates, and the server redirects back:**

```
302 Location: https://app.example.com/callback
                ?code=SplxlOBeZQQYbYS6WxSbIA
                &state=af0ifjsldkj
```

**The client's first job is to check `state` matches what it sent.** If it
doesn't, abort — someone is trying to inject their own authorization into your
session.

**Step 4 — exchange the code, over the back channel.** Here the verifier
finally travels:

```bash
curl -X POST https://auth.example.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=SplxlOBeZQQYbYS6WxSbIA" \
  -d "redirect_uri=https://app.example.com/callback" \
  -d "client_id=dashboard-spa" \
  -d "code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
```

The server recomputes `SHA256(code_verifier)` and compares it to the challenge
it stored in step 2. It also checks the code is unused and unexpired, and that
`redirect_uri` matches. On success:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImsxIn0...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "8xLOxBtZp8",
  "scope": "openid entries:read"
}
```

`expires_in: 900` is 15 minutes — short on purpose, because you cannot un-issue
it. The refresh token is the long-lived, revocable half.

**Step 5 — call the API:**

```bash
curl https://api.example.com/v3/entries \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImsxIn0..."
```

**Step 6 — refresh when the access token expires:**

```bash
curl -X POST https://auth.example.com/token \
  -d "grant_type=refresh_token" \
  -d "refresh_token=8xLOxBtZp8" \
  -d "client_id=dashboard-spa"
```

With rotation on, the response contains a **new** refresh token and the old one
is dead. Replaying the old one is what triggers family revocation.

### What each failure looks like

Worth recognising, because interviewers ask "what happens if…":

```json
{"error":"invalid_grant"}       // code reused, expired, or verifier mismatch
{"error":"invalid_client"}      // client_id unknown or secret wrong
{"error":"invalid_request"}     // redirect_uri didn't match the registered one
{"error":"invalid_scope"}       // asked for a scope the client isn't allowed
```

`invalid_grant` is the one you'll see most. It deliberately doesn't say *which*
of those went wrong — telling an attacker whether a code was valid but expired
would leak information.

**Why the code is exchanged server-side rather than returned directly:** the
authorization code travels through the browser (URL, history, referrer, logs).
It is deliberately short-lived and single-use, and exchanging it requires
either a client secret or a PKCE verifier — so interception of the code alone
is not enough.

**What PKCE actually defends against.** On mobile, a malicious app can register
the same custom URL scheme as your redirect URI, so the OS hands it the same
`?code=…` redirect that goes to the legitimate app. Both apps now hold the
code. Only the legitimate app holds the `code_verifier` — it never left that
app — so only its `POST /token` succeeds; the attacker's exchange fails with
`invalid_grant`. PKCE binds the code to whoever started the flow.

Per RFC 7636: `code_verifier` is 43–128 characters of unreserved charset;
`code_challenge` for the `S256` method is `BASE64URL(SHA256(ASCII(verifier)))`.
The `plain` method exists and should not be used — it offers no protection if
the request itself is observed.

**`state` is separate and still required.** PKCE stops code interception;
`state` stops CSRF — an attacker tricking your browser into completing *their*
authorization flow so your account gets linked to their identity. Different
attacks, both needed.

### Grant types, and their status

```mermaid
flowchart TD
  A{"Is a user present<br/>at the keyboard?"} -->|"No — machine to machine"| CC["Client Credentials"]
  A -->|"Yes, but no browser<br/>(TV, CLI)"| DC["Device Code"]
  A -->|Yes| B{"Can the client<br/>keep a secret?"}
  B -->|"Yes — backend server"| AC["Authorization Code + PKCE"]
  B -->|"No — SPA, mobile"| AC
  AC --> RT["Refresh Token to renew,<br/>rotated on every use"]
```
*Both answers to the secret question lead to the same place: OAuth 2.1 wants PKCE on confidential clients too, not just public ones.*

| Grant | Use | Status |
| --- | --- | --- |
| **Authorization Code + PKCE** | Web, SPA, mobile | The default. PKCE mandatory in OAuth 2.1 for *all* clients, not just public ones |
| **Client Credentials** | Machine-to-machine, no user | Current, correct |
| **Refresh Token** | Get new access tokens | Current; rotation required in 2.1 |
| **Device Code** | TVs, CLIs, input-constrained | Current ([RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628)) |
| **Implicit** | Returned token in URL fragment | **Removed in OAuth 2.1** |
| **Resource Owner Password** | App collects the password directly | **Removed in OAuth 2.1** |

**Be precise on status.** OAuth 2.1 is still an IETF Internet-Draft, not a
published RFC, though its substance is widely adopted. Saying "OAuth 2.1 is the
standard now" is wrong; saying "OAuth 2.1 consolidates current best practice —
PKCE everywhere, no implicit, no password grant, exact redirect URI matching,
refresh token rotation — and it's still in draft" is exactly right and signals
you follow the working group.

### Refresh token rotation

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Authorization server
    participant T as Attacker with a stolen RT1

    C->>A: POST /token grant_type=refresh_token, RT1
    A-->>C: new access token + RT2
    Note over A: RT1 is now dead.<br/>RT1 and RT2 are one family.
    T->>A: POST /token with RT1
    A--xT: invalid_grant
    Note over A: a dead token was replayed —<br/>revoke the entire family
    C->>A: POST /token with RT2
    A--xC: invalid_grant — re-authenticate
```
*The server never learns which party is the thief, only that one token was used twice — so it kills the chain and makes the real user log in again.*

Each refresh issues a new refresh token and invalidates the old one. If an old
token is ever replayed, the server knows the family is compromised and revokes
the entire chain — this is **reuse detection**, and it's what makes rotation
worth the complexity.

The server can't tell *which* party is the attacker — only that the token was
used twice. So it kills the whole chain: the legitimate user re-authenticates
(mild annoyance), the attacker is locked out (the point).

> **In your own work.** You ran a multi-tenant OAuth server, so expect: how
> were clients isolated per tenant, could a token issued for tenant A be
> replayed against tenant B, and how did you scope `audience`. See
> [contentstack](../00-experience/contentstack.md) §2.


## Building it

**Libraries**

| Need | Library | Why |
| --- | --- | --- |
| Consuming OAuth as a client | `openid-client` | Handles discovery, PKCE, state, and the token exchange — don't hand-roll the redirect dance |
| Being the authorization server | `oidc-provider` | Spec-compliant AS you configure (grants, PKCE enforcement, token lifetimes) rather than implement from RFC 6749 yourself |
| Refresh token storage | `ioredis` | Tracking token families for reuse detection needs a fast keyed store, not the primary DB |

**Setting it up — registering a client**

Using Okta as the reference IdP (as elsewhere in this book):

1. Okta admin → **Applications → Create App Integration** → OIDC, and pick
   **Web Application** for a confidential client or **Single-Page App** for a
   public one — this choice is what forces PKCE and rules out a client secret.
2. Set the **Sign-in redirect URI** to exactly match what your app sends at
   `/authorize`. Okta rejects a mismatch — that's the control, not a
   formality: it's what stops an attacker registering their own redirect.
3. **Grant type:** Authorization Code, with **Require PKCE** checked.
4. Assign scopes deliberately (`entries:read`, not everything) — least
   privilege starts in the console, not in code.
5. Copy the **Client ID**. A confidential client's **Client Secret** goes in a
   secret manager; it never ships to a public client.

**Pseudocode — the exchange, client side**

```ts
import { generators, Issuer } from 'openid-client';

const issuer = await Issuer.discover('https://auth.example.com');
const client = new issuer.Client({
  client_id: CLIENT_ID,
  redirect_uris: [REDIRECT_URI],
  response_types: ['code'],
});

// Step 1 (see the diagram above) — the verifier never leaves this process
const code_verifier = generators.codeVerifier();
const code_challenge = generators.codeChallenge(code_verifier);

// Step 2 — front channel: send the browser, not a request, here
const authUrl = client.authorizationUrl({
  scope: 'openid entries:read',
  code_challenge,
  code_challenge_method: 'S256',
  state,
});

// Step 5 — back channel, at /callback
const tokenSet = await client.callback(REDIRECT_URI, params, { code_verifier, state });
```

Building the *authorization server* side is the harder half of this story —
that's where `oidc-provider` earns its place instead of hand-rolling
`/authorize` and `/token`.

---

## Interview Q&A

### Q: What problem does OAuth 2.0 solve?
**Level:** foundation · **Tags:** oauth2, basics

<details><summary>Model answer</summary>

Delegated authorization without credential sharing. Before OAuth, letting an
app act on your behalf on another service meant giving it your password — which
grants unlimited, un-revocable, un-scoped access.

OAuth lets the user authorise a *specific* application for a *specific* set of
capabilities (scopes) for a *limited* time, revocable independently, without
the application ever seeing the password.

The important precision: it's an authorization framework, not authentication.
It answers "may this app do this on the user's behalf", not "who is this user".
That's OIDC's job, layered on top.

</details>

**Follow-ups:**
1. Q: So why do people call it "login with Google"?
   <details><summary>Answer</summary>

   Because OIDC is built on OAuth 2.0 and the flow looks identical from the
   outside. OIDC adds the `openid` scope and returns an **ID token** — a JWT
   about the *user*, with issuer, audience and expiry — alongside the access
   token.

   The classic vulnerability is treating an OAuth access token as proof of
   identity: access tokens are opaque to the client and have no audience
   binding to it, so a token obtained for a different app could be replayed.
   That's the confused-deputy problem OIDC's ID token audience check prevents.

   </details>
2. Q: Is an access token meant to be readable by the client?
   <details><summary>Answer</summary>

   No. The access token is opaque *to the client* — it's issued for the
   resource server. The client shouldn't parse it or depend on its format,
   even when it happens to be a JWT, because the auth server may change it at
   any time. If the client needs user information, that's the ID token or the
   UserInfo endpoint.

   </details>

### Q: Walk me through the Authorization Code flow with PKCE.
**Level:** intermediate · **Tags:** oauth2, pkce, flows

<details><summary>Model answer</summary>

The client generates a random `code_verifier` and derives
`code_challenge = BASE64URL(SHA256(verifier))`. It redirects the user to the
authorization server's `/authorize` endpoint with `client_id`, `redirect_uri`,
`scope`, a random `state`, the challenge, and `code_challenge_method=S256`.

The user authenticates and consents. The auth server redirects back to the
registered `redirect_uri` with a short-lived, single-use authorization code and
the original `state`, which the client verifies to prevent CSRF.

The client then POSTs to `/token` with the code and the original
`code_verifier`. The server hashes the verifier and compares it to the stored
challenge; on match it returns an access token and usually a refresh token.

The code goes through the browser, so it's exposed to history and logs — which
is exactly why it's useless on its own. The token exchange happens over a
direct back-channel call, and PKCE binds the code to whoever initiated the
flow.

</details>

**Follow-ups:**
1. Q: Why isn't a client secret enough for a mobile app?
   <details><summary>Answer</summary>

   Because a mobile app is a public client — the binary ships to the device
   and anything embedded in it can be extracted by decompiling. A "secret" that
   every installation shares isn't a secret.

   PKCE replaces a static shared secret with a per-request dynamic one: the
   verifier is generated fresh for each authorization, never leaves the app,
   and is useless afterwards.

   </details>
2. Q: PKCE protects the code. What still protects against CSRF?
   <details><summary>Answer</summary>

   `state`. They defend different attacks and you need both.

   PKCE stops an attacker who *intercepts your code* from exchanging it.
   `state` stops an attacker who *injects their own code* into your session —
   tricking your browser into completing their flow so your account gets bound
   to their identity. The client generates `state`, ties it to the user's
   session, and rejects a callback where it doesn't match.

   </details>
3. Q: Should PKCE be used for confidential clients that already have a secret?
   <details><summary>Answer</summary>

   Yes — and OAuth 2.1 makes it mandatory for all clients. The secret
   authenticates the *client*; PKCE binds the *authorization request* to the
   token exchange. They protect different things, and code injection attacks
   are possible against confidential clients too.

   </details>

### Q: How do you handle refresh tokens securely?
**Level:** senior · **Tags:** oauth2, refresh, rotation

<details><summary>Answer</summary>

Refresh tokens are long-lived, which makes them the highest-value credential
in the system. Three controls:

**Rotation** — every refresh issues a new refresh token and invalidates the
old one, so a stolen token has a short useful life.

**Reuse detection** — the real payoff of rotation. If an already-used refresh
token is presented, either the legitimate client is replaying or an attacker
stole it; you can't distinguish, so you revoke the entire token family. The
legitimate user re-authenticates, and the attacker's access dies with it.

**Binding and storage** — bind to the client and, where possible, to the
device or a DPoP key so a stolen token can't be used elsewhere. In browsers,
store in httpOnly, Secure, SameSite cookies, never localStorage, which is
readable by any XSS.

Beyond that: absolute lifetimes on top of rotation so a family can't live
forever, and revocation on password change or privilege downgrade.

</details>

**Follow-ups:**
1. Q: Rotation breaks with concurrent requests — two tabs refresh at once, one gets revoked. How do you fix it?
   <details><summary>Answer</summary>

   Real and common. Options:

   A short grace window where the previous token stays valid (a few seconds)
   — pragmatic, slightly weakens reuse detection. Or return the *same* new
   token for duplicate refreshes of the same old token within that window, so
   concurrent callers converge. Or fix it client-side: a mutex so only one
   refresh is in flight and other callers await it — the cleanest fix, though
   it doesn't help across tabs without shared storage or a service worker.

   Most production systems use a short server-side grace window plus a
   client-side single-flight lock.

   </details>
2. Q: Access token in memory or a cookie for a SPA?
   <details><summary>Answer</summary>

   The modern answer is a backend-for-frontend: tokens never reach the browser
   at all: the BFF holds them and the browser gets an httpOnly session cookie.
   That removes the XSS exfiltration path entirely.

   If tokens must be in the browser: access token in memory (lost on refresh,
   but not readable by injected script from storage), refresh token in an
   httpOnly `SameSite=Strict` cookie. Never localStorage — one XSS and both
   tokens are gone.

   </details>

### Q: What's changed in OAuth 2.1?
**Level:** senior · **Tags:** oauth2.1, standards

<details><summary>Model answer</summary>

It consolidates OAuth 2.0 plus the security BCPs into one document, removing
what's no longer considered safe:

- **Implicit grant removed** — returned tokens in the URL fragment, exposing
  them to history, referrers and logs.
- **Resource owner password grant removed** — the app handling the user's
  password defeats the purpose of OAuth, and it's incompatible with MFA and
  federation.
- **PKCE mandatory for all clients** using the authorization code flow, not
  just public ones.
- **Exact string matching on redirect URIs** — wildcard matching enabled
  open-redirect based token theft.
- **Refresh token rotation** (or sender-constraining) required.
- **No bearer tokens in query strings.**

Worth stating: it's still an Internet-Draft, not a published RFC. But the
substance is already best practice and most mature providers implement it.

</details>

**Follow-ups:**
1. Q: You have a legacy integration using the password grant. How do you migrate it?
   <details><summary>Answer</summary>

   First ask why it exists — usually a first-party mobile app from before PKCE
   was widespread, or a service-to-service integration that should have been
   client credentials.

   For machine-to-machine, migrate to **client credentials** — usually
   straightforward, no user involved. For a first-party app, migrate to
   **authorization code + PKCE** with an embedded browser or system web view.

   Run both in parallel behind a per-client flag, migrate clients individually,
   monitor usage of the old grant to zero, then disable it. The forcing
   function is usually that password grant can't support MFA or SSO — so any
   customer demanding either has to move anyway.

   </details>

---

## Worked example: per-tenant token isolation, and opaque vs. JWT

**Isolation.** In a multi-tenant OAuth server, every client registration
belongs to exactly one tenant, and every issued token carries the tenant it
was issued for — either in the `aud` claim or a dedicated `tenant_id` claim.
The resource server's job on every request is to check that the token's
tenant matches the tenant of the resource being accessed; a token minted for
tenant A presented against tenant B's resource must fail, and that check
belongs in shared middleware, not duplicated per endpoint — a per-endpoint
check is the kind of thing that gets forgotten on the twentieth new route.

**Opaque tokens over JWTs, when revocation matters more than validation
cost.** The textbook trade-off is stateless JWTs (fast to validate, no
server round-trip, but revocation before expiry needs a denylist anyway) vs.
opaque tokens looked up centrally (one round-trip per request, but
revocation is instant and total). For an enterprise product where "kick this
user out right now" is a hard requirement — a departing employee, a
compromised session — opaque tokens backed by a fast key-value store are
often the better call despite the extra hop: the lookup is one in-memory
read, cheaper in practice than the machinery (short-lived JWTs, refresh
rotation, a denylist checked on every validation) needed to approximate the
same guarantee with stateless tokens.

---

## What a weak answer sounds like

- **"OAuth is how you log in with Google."** Conflates OAuth with OIDC. This
  is the single most common error and it's disqualifying in an IAM interview.
- **"PKCE is for mobile apps."** It's *required for all clients* in 2.1.
  Naming only the mobile case suggests you learned it from a blog post rather
  than the spec.
- **"We use JWTs so we don't need sessions"** in answer to an OAuth question —
  the token *format* is orthogonal to the *flow*. Access tokens can be opaque
  or JWT; that's an independent decision.
- **Confusing `state` and PKCE**, or claiming one replaces the other.
- **"OAuth 2.1 is the current standard."** It's a draft. Precision here is
  cheap and signals you actually track the working group.

---

## Glossary

- **Authorization code** — short-lived, single-use credential exchanged for a
  token via the back channel.
- **PKCE** — Proof Key for Code Exchange; binds the authorization request to
  the token exchange with a per-request secret.
- **`code_verifier` / `code_challenge`** — the random secret and its SHA-256
  hash.
- **`state`** — opaque client value echoed back, for CSRF protection.
- **Public / confidential client** — cannot / can keep a secret.
- **Front channel** — via the browser (visible). **Back channel** — direct
  server-to-server (private).
- **Reuse detection** — revoking a token family when a rotated refresh token
  is replayed.
- **DPoP** — Demonstrating Proof of Possession; sender-constrains a token to a
  key so a stolen token is unusable elsewhere.
- **BFF** — backend-for-frontend; holds tokens server-side so the browser only
  ever has a session cookie.
