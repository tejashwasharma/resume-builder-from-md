---
name: linkedin-search
description: Run a fast, LinkedIn-only job sweep for a recency window (default the last 24 hours), surfacing at least 20 roles never reported in a previous run (deduped against a local ledger) that the resume qualifies for on experience - the posting minimum read from the posting body, not the LinkedIn seniority label - and rank them by BOTH a Fit % (resume-to-role match) and a Shortlist % (realistic chance of clearing screening, discounted by applicant count and hiring friction). Lighter and quicker than the full job-search skill - no Naukri/Seek/Indeed crawl, no Google Sheet write, no visa pass unless asked. Use when the user says "search LinkedIn", "jobs posted today", "what's new in the last 24 hours", or invokes this skill directly.
---

# LinkedIn search

**Input:** optionally a recency window, location, and role slant. Defaults:
last 24 hours, India, remote-preferred, mid-senior.

**Reads fresh every run** (never from memory):

- `../../designs/design-2/resume.md` — the source of truth for role,
  skills, and the experience band to match against.
- `config.local.json` in this skill directory — query themes, filters, and
  the recency map.
- `seen_jobs.local.json` in this skill directory — job ids reported in
  any previous run. Loaded before the sweep and used to exclude repeats;
  appended to at the end of every run. Create it as `{"ids": []}` if
  missing.

**Output:** a ranked shortlist printed in chat. Nothing is written to the
tracking sheet — that is the `job-search` skill's job. If the user wants a
shortlisted role tracked or a CV tailored for it, hand off to
`job-search` / `resume-tailor`.

## Prerequisites

Needs an authenticated LinkedIn session in the user's Chrome, driven
through the `mcp__claude-in-chrome__*` tools. Load them in ONE ToolSearch
call:

```
select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__tabs_close_mcp
```

Then `tabs_context_mcp{createIfEmpty:true}` once, and reuse that one tab
for every query. Close it at the end.

If a search page renders a login wall instead of results, stop and ask the
user to sign in to LinkedIn in Chrome — do not try to authenticate.

## Step 0 — confirm scope (one question, then go)

Ask once, in a single `AskUserQuestion`, only if the user did not already
say: recency window (24h / 7 days), and location slant (India remote /
India any / worldwide remote). If they gave any of it in the prompt, skip
the question entirely and use what they said.

## Step 1 — volume target and dedupe

**Every run must surface at least 20 jobs that were not reported before.**
Two rules make that achievable:

- Load `seen_jobs.local.json` first and exclude every id in it. A job that
  appeared in any previous run is never reported again, even if it still
  ranks well. Ids only — the ledger is not a cache of job content.
- Keep widening until the count is met, in this order: more pages
  (`start=10,20,…`), then more keyword themes, then drop the remote-only
  restriction (Bengaluru/Pune/Hyderabad hybrid is acceptable), then widen
  recency to `r604800`. Say in the report which widenings were needed.

If 20 is genuinely not reachable for the window, report what there is and
state the shortfall plus what was tried — never pad with roles that fail
the gate or repeat the ledger.

## Step 2 — sweep with the guest search endpoint

Do **not** drive the logged-in search UI card by card. From any page on
the `linkedin.com` origin, the guest search endpoint returns 10
server-rendered cards per request and paginates cleanly, so a whole
multi-theme sweep is a few `javascript_tool` calls instead of a navigate +
lazy-scroll per query. In practice this is the difference between ~14
candidates and ~160.

Navigate once to `https://www.linkedin.com/jobs/`, then:

```js
window.__parse = (h) => {
  const strip = s => s ? s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#\d+;/g,'').replace(/\s+/g,' ').trim() : '';
  return h.split('<li>').slice(1).map(b => ({
    id:    (b.match(/jobPosting:(\d+)/)||[])[1] || '',
    title: strip((b.match(/base-search-card__title"[^>]*>([\s\S]*?)<\//)||[])[1]),
    co:    strip((b.match(/base-search-card__subtitle"[^>]*>([\s\S]*?)<\/h4>/)||[])[1]),
    loc:   strip((b.match(/job-search-card__location"[^>]*>([\s\S]*?)<\//)||[])[1]),
    date:  (b.match(/datetime="([\d-]+)"/)||[])[1] || ''
  })).filter(j => j.id);
};

window.__search = async (kw, extra, pages) => {
  const out = [];
  for (let p = 0; p < (pages||3); p++) {
    const u = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords='
      + encodeURIComponent(kw) + '&location=India&f_TPR=r86400' + (extra||'') + '&start=' + (p*10);
    const r = await fetch(u, { credentials: 'omit' });
    if (r.status !== 200) break;
    const rows = window.__parse(await r.text());
    if (!rows.length) break;
    out.push(...rows);
    await new Promise(x => setTimeout(x, 200));
  }
  return out;
};

window.__pool = new Map();
for (const q of QUERIES) {
  (await window.__search(q, '', 3)).forEach(j => { if (!window.__pool.has(j.id)) window.__pool.set(j.id, j); });
}
[...window.__pool.values()].filter(j => !window.__seen.has(j.id)).length
```

Seed `window.__seen = new Set([...])` from the ledger before the sweep.

**Parsing gotchas — all three cost real time to rediscover:**

- LinkedIn's own pages enforce Trusted Types, so `el.innerHTML = html`
  silently yields nothing, and `DOMParser` drops the bare top-level `<li>`
  elements this endpoint returns (HTML foster parenting). **Regex
  extraction is the only reliable parse here** — hence `__parse` above.
- `javascript_tool` truncates long returns, and a return containing
  URL-ish or cookie-ish strings can be blocked outright. Keep results in
  `window.__pool` / `window.__lines` on the page and pull them out in
  slices of 10–15 plain lines. Strip exotic characters before returning.
- The card anchors carry no usable href. Build the canonical URL from the
  id: `https://www.linkedin.com/jobs/view/<id>/`.

Then cut the pool down by title before spending fetches on the gate. This
title filter is a **hard gate**, same rule and same allowlist as the
`job-search` skill's `title_keywords` (keep them in sync if either
changes) — a title with none of the allowed role-noun phrases is dropped
here regardless of stack overlap, seniority word, or applicant count:

```js
const bad   = /intern|fresher|trainee|graduate|associate engineer|sde[ -]?1\b|recruit|sales|marketing|qa engineer|test engineer|support|manual|architect|director|\bmanager\b|head of|vice president|\bvp\b|consultant/i;
const good  = /software engineer|backend engineer|back[ -]?end engineer|full ?stack engineer|software developer|backend developer|back[ -]?end developer|full ?stack developer|node\.?js developer|iam engineer|security engineer|platform engineer|staff engineer|principal engineer|lead engineer|tech ?lead|engineering lead/i;
const stack = /node|nest|backend|full ?stack|platform|micro ?service|api|typescript|javascript|identity|iam|auth|saas|distributed|cloud/i;
const candidates = pool.filter(j => !bad.test(j.title) && good.test(j.title) && stack.test(j.title + ' ' + j.co));
```

`good` is the allowlist itself — Engineer/Developer IC titles, the
IAM-specific engineer variants (IAM/Security/Platform Engineer), and the
senior IC growth track the resume now targets (Staff Engineer, Principal
Engineer, Lead Engineer/Tech Lead/Engineering Lead) — so a seniority
prefix like "Senior"/"Sr." still passes as long as the role noun after it
is one of those phrases ("Senior Backend Engineer" matches on "backend
engineer"), and "Staff Engineer" / "Principal Engineer" / "Tech Lead" now
match directly on their own phrase rather than needing a role-noun suffix.
`bad` still excludes Architect/Director/Manager/VP/Consultant titles
outright, even when `good` would otherwise match on a stack keyword
elsewhere in the string — only that narrower set (not Staff/Principal/
Lead) is off-track for this resume.

**Backend-major check (manual, on top of the regex above):** the `stack`
regex only confirms *some* backend/JS-adjacent keyword is present — it
can't tell which language is actually primary. The resume's backend
major is **Node.js / TypeScript / NestJS**, full stop, regardless of what
else the resume lists (Golang included — see the Node.js→Golang service
migration bullet in design-1/resume.md; that makes Golang a real
secondary skill, never the primary one for job matching). After the
regex gate, read each surviving candidate's title by hand: a posting
whose backend major is Golang-only, Python-only, or Java-only — with no
Node.js/TypeScript/NestJS named — gets dropped even though it cleared the
regex (e.g. "Senior Software Engineer - Golang - API Gateway" at
FactSet, or "...Java Backend With Kafka" at CGI). A posting naming
Node/TS/NestJS *alongside* another language (e.g. "must-haves: NodeJS,
Java, MySQL, MongoDB, Docker") is kept. See `config.local.json`'s
`stack_policy` for the full rationale and drop examples — that file is
gitignored and has been lost once already, so this paragraph is the
durable copy of the rule.

**Product-company check (hard gate, runs right after the backend-major
check):** every surviving candidate's employer must be a genuine product
engineering company — a company that builds and owns the software it
sells or runs internally. Drop the row entirely, before it ever reaches
Step 3, if the employer is any of:

- A staffing / recruiting / body-shop firm posting on a client's behalf
  (titles or company names like "TalentXO", "Applicantz", "VOLTO
  Consulting", "Zigsaw", "Uplers", agency-style "Hiring for our client"
  postings, or a company whose LinkedIn page describes it as a staffing/
  recruitment agency).
- A pure IT services / outsourcing / consulting shop (TCS, Infosys, Wipro,
  Accenture, Cognizant, Capgemini, YASH Technologies, and similarly-shaped
  vendors) — these build software for other companies under contract
  rather than owning a product, even when the specific req reads like a
  normal engineering role.
- An aggregator or job-board relist with no identifiable direct employer.

When the company's nature isn't obvious from the name alone, check the
posting body and/or the company's LinkedIn "About" blurb (already fetched
in the years/applicants pass, or one extra lightweight fetch if not) for
language like "IT services", "staffing solutions", "client engagements",
"deployed at our client's site" — that language is the tell. A company
that sells its own SaaS/platform/app, or is a well-known consumer or
enterprise product brand, passes even if it also does some platform
consulting on the side. This is a hard drop, same weight as the title and
backend-major gates — a strong stack/domain match at a staffing or
services company no longer buys its way into the report or the ledger.
Log each drop in the "dropped and why" section (Step 5) same as any other
gate, e.g. `TalentXO — product-company gate, staffing agency`.

The logged-in UI (`/jobs/search/?...&f_E=4,5&f_WT=2` plus a lazy-scroll
scrape) still works and is the fallback if the guest endpoint starts
returning empty. Its filters — `f_TPR=r86400`, `f_E=4,5`, `f_WT=2` — are
worth knowing, but note `sortBy=DD` wrecks broad keyword queries: LinkedIn
loosens matching under date sort and floods the list with ops and sales
roles. Leave it off.

## Step 3 — the experience gate (hard filter, runs on EVERY result)

The resume is at **7.4 years**. The gate keeps roles the user *qualifies
for*, which means comparing against the posting's stated **minimum**:

| Posting's stated minimum | Action |
| --- | --- |
| 4–9 years (`5+`, `6+`, `7+`, `8+`, `8–10`) | **Keep.** 7.4 satisfies anything up to 7, and 8–9 is a reasonable stretch for a senior with this depth |
| ≤ 3 years, or a junior title (SDE-1, Associate, Trainee, Graduate) | **Drop** — below the band |
| ≥ 10 years minimum (`10+`, `14–20`) | **Drop** — over-band; the resume reads junior against it |
| No figure stated | **Keep as `min NA`** and rank on title seniority instead — do not discard, most good postings never name a number |

A "6+ years" posting is a **pass**, not a fail: 7.4 is more than 6. Only
the minimum matters — for "6–8 years" the minimum is 6, so it passes.

`f_E=4` ("Mid-Senior level") is LinkedIn's own label and is not evidence —
it spans postings asking for 2 to 20 years. The gate is decided by the
posting body.

Check the whole batch in one call via the guest endpoint (see Step 2 for
why this beats opening tabs):

```js
window.__years = async (jobs) => {
  const res = [];
  for (const j of jobs) {
    let mins = [], raw = 'none', wt = '', closed = false;
    try {
      const t = await (await fetch('https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/' + j.id, { credentials: 'omit' })).text();
      const txt = t.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ');
      closed = /no longer accepting applications/i.test(txt);
      const hits = [...txt.matchAll(/\b(\d{1,2})\s*(?:\+|-|–|to)?\s*(\d{0,2})\s*\+?\s*(?:years?|yrs?)\b(?![^.]{0,25}(?:ago|founded|old|history))/gi)];
      hits.forEach(m => { const n = parseInt(m[1]); if (n >= 1 && n <= 25) mins.push(n); });
      raw = hits.slice(0, 2).map(m => m[0].trim()).join(' / ') || 'none';
      wt = /remote/i.test(txt.slice(0, 3000)) ? 'Remote' : (/hybrid/i.test(txt.slice(0, 3000)) ? 'Hybrid' : '');
    } catch (e) { raw = 'ERR'; }
    res.push({ ...j, min: mins.length ? Math.min(...mins) : null, raw, wt, closed });
  }
  return res;
};
const checked = await window.__years(candidates);
checked.filter(j => !j.closed && (j.min === null || (j.min >= 4 && j.min <= 9)))
```

**Closed postings:** `f_TPR=r86400` filters by post date, not by whether
the role is still open — a job posted yesterday can already read "No
longer accepting applications" (high-volume postings, or ones a company
pulled early). The `closed` flag above is checked in the same fetch pass
that reads years/applicants, so it costs nothing extra, and the final
filter drops it alongside the experience-gate failures. Report closed
postings in the "dropped and why" section same as any other gate, not
silently — a job the user could have applied to yesterday but can't today
is useful information, not noise.

The negative lookahead matters — postings are full of "founded 15+ years
ago" and "2+ years industry experience" boilerplate that otherwise poisons
the minimum.

## Step 4 — two numbers per job: Fit % and Shortlist %

Report **both**. They answer different questions and routinely disagree —
a perfect-fit role with 200+ applicants is a worse use of an evening than a
decent-fit role posted three hours ago with 25.

### Fit % — how well the resume matches the role (0–100)

| Weight | Dimension |
| --- | --- |
| 35 | Core stack overlap (Node.js/NestJS, Golang, GraphQL/gRPC, microservices, Mongo/Postgres/Redis, AWS) |
| 25 | Domain overlap (IAM, authN/authZ, RBAC, OAuth/SAML/OIDC/SCIM, platform/infra, enterprise SaaS) |
| 20 | Seniority fit — a stated minimum of 7–8 is the sweet spot against 7.4; 4–6 scores well but risks reading over-qualified; 9 is a stretch |
| 10 | Workplace fit — see location priority below |
| 10 | Company tier signal — every surviving row already cleared the product-company hard gate above, so this scores *within* that set: a well-known product brand or funded product startup scores highest, a smaller/less-established product company scores a little lower, nothing here scores a staffing/services employer since none reach this step |

**Location priority** (added 2026-09-17, since the user is in Agra and has
no single home-city constraint): remote scores the full 10 regardless of
city. Onsite/hybrid scores by where the city falls in this ordered list —
**Pune, Bangalore, Mumbai, Hyderabad** (top 4, score 8), then **Delhi,
Noida, Gurugram/Gurgaon, Indore** (score 6) — Gurugram and Gurgaon are the
same city, just old/new name. Anywhere else onsite scores 3. This also
drives the `onsite_outside_priority_cities` friction factor below — it now
checks the full 9-city list, not just Pune/Bengaluru.

### Shortlist % — realistic chance of clearing screening

`Shortlist% = Fit% × competition × friction`, then round to the nearest 5.

**competition** — from the applicant count, which the guest posting
endpoint carries. Grab it in the same pass as the years check:

```js
const a = (txt.match(/([\d,]+)\s+applicants?/i)||[])[1]
       || (/Be among the first 25 applicants/i.test(txt) ? '<25' : '?');
```

| Applicants | Factor |
| --- | --- |
| under 30 (or "be among the first 25") | 1.0 |
| 30–70 | 0.8 |
| 71–150 | 0.6 |
| over 150, or the capped "200" value | 0.45 |

LinkedIn caps the displayed figure at 200 — treat a flat `200` as "200+",
not as a precise count.

**friction** — multiply the applicable ones:

| Situation | Factor |
| --- | --- |
| Top-tier hiring bar (Okta, LinkedIn, Atlassian, GitLab, big tech) | 0.8 |
| Primary language is not the resume's (Java-only, .NET, SAP) | 0.6 |
| Staffing agency or aggregator listing | 0.95 |
| On-site outside the 9-city location priority list, no remote option | 0.9 |
| Posted under 12 hours ago | 1.1 (cap the result at 90) |

Never print a Shortlist % above 90 or below 10 — neither is honest at this
resolution. State the applicant count in the table so the number is
auditable rather than asserted.

## Step 5 — report

Print a ranked table of **at least 20 rows**, sorted **descending by
Shortlist %** (highest realistic chance of clearing screening first — this
is the primary sort key, not Fit %; the two routinely disagree, and
Shortlist % is the number that should drive which role gets applied to
first) —
Fit % | **Shortlist %** | Role | Company | Location | Req. exp. |
Applicants | Link. The requirement and applicant columns are
mandatory — they are the evidence behind the gate and behind the Shortlist
%, which is otherwise just an assertion. Follow with two or three lines per top pick on
**why it fits** and the **one reservation**, then a short list of what the
gates dropped and why — both the step 3 experience gate (`Wingify — 6+
years`) and the step 2 title filter (`Acme Corp — Solution Architect,
title filter`) — and the queries used.

**Then append every reported job id to `seen_jobs.local.json`** (merge into
the existing `ids`, keep it sorted, bump `runs` and `last_run`). Do this
before finishing — skipping it means tomorrow's run repeats today's list.
State the new ledger size in the report.

## Known LinkedIn quirks

- Broad keywords + `sortBy=DD` returns operations, sales, and manager roles
  with no relation to the query. Relevance sort with tight filters is
  strictly better for this skill.
- Generic IAM keywords in the India market return security-consulting and
  identity-administration roles (IBM, UST, Wipro), not product engineering.
  Pair IAM terms with `Software Engineer` / `Backend` and expect a low
  yield; the platform-engineering queries carry the run.
- The "retiring classic job search" banner is noise — the classic
  `/jobs/search/` URL form still works.
- `f_E=4` maps to "Mid-Senior level", which in practice returns postings
  asking for anything from 2 to 20 years. Treat the level filter purely as
  noise reduction and let step 3 do the actual filtering.
- The `jobs-guest/jobs/api/jobPosting/<id>` endpoint works same-origin with
  `credentials:'omit'` and is far cheaper than opening each job in a tab —
  a full batch of 25 checks in one call. It does not work cross-origin, so
  stay on a `linkedin.com` page while calling it.
- Skip Golang/microservices as a standalone query theme — the user asked
  for it to be dropped, and it returned nothing the backend and platform
  themes did not already cover.
- The remote-only filter (`f_WT=2`) costs roughly 90% of the pool. With a
  24-hour window it cannot reach 20 new jobs on its own, so expect most
  runs to include Bengaluru/Pune/Hyderabad hybrid and on-site roles and to
  flag workplace type per row instead.
