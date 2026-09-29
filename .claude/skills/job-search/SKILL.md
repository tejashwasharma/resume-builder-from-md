---
name: job-search
description: Two modes, chosen in Step 0. Quick mode is a fast LinkedIn-only sweep (default the last 24 hours) surfacing at least 20 roles never reported before, ranked by both a Fit % (resume-to-role match) and a Shortlist % (realistic chance of clearing screening) - no Sheet write, no other sites. Full mode asks which of 9 configured countries to cover (India via Naukri plus a company-directory sweep, LinkedIn for every selected country, Australia/New Zealand via Seek, Singapore via MyCareersFuture, UK/Canada/Germany/Netherlands/UAE via Indeed), scores every result by match % against the resume, screens overseas roles for visa-sponsorship signal, and appends new postings to the matching per-country tab of the tracking Google Sheet. Use when the user asks to find matching jobs, run the job search, search LinkedIn, or asks what's new today/in the last 24 hours - Step 0 infers the mode from phrasing like this when it can, and only asks when it can't. They run full mode daily in the evening and quick mode any time they want a faster same-day check.
---

# Job search

**Two modes, one skill.** Both read the current resume fresh and never
trust memory for query themes or gate rules:

- **Quick** — LinkedIn only, a few minutes, nothing written anywhere but
  chat. Ranks by Fit % and Shortlist %. Good for "what's new today."
- **Full** — every selected country/site, scored by Match %, appends new
  rows to the tracking Google Sheet. The daily evening run.

**Reads fresh every run, never from memory:**

- `../../designs/design-2/resume.md` — the source of truth for role,
  skills, and the experience band to match against, in both modes.
- `config.local.json` in this skill directory — thresholds, the tracking
  sheet's URL, `title_keywords`, one top-level `linkedin` block (full
  mode's cross-country LinkedIn source), one top-level `quick_linkedin`
  block (quick mode's query themes, gates, and scoring), and one block per
  country (full mode only).
- **Quick mode also reads/writes** `linkedin_quick_seen.local.json` — every
  LinkedIn job id reported in any previous quick-mode run. Ids only, not a
  cache of job content. Create it as `{"ids": []}` if missing. This ledger
  is separate from full mode's — quick mode dedupes by job id and never
  touches the sheet, so its ledger stays independent of the URL ledger
  below.
- **Full mode also reads/writes** `seen_jobs.local.json` (every posting URL
  already added to the sheet, tagged by country — the cross-country dedupe
  ledger), `crawl_state.local.json` (per-country crawl progress; today only
  India's company-directory sweep needs it), and
  `../company-registry.local.json` (a registry of employers already
  classified product vs. non-product, shared between full mode's step 4 and
  quick mode's product-company gate — see each mode's gate section for the
  read/write contract).

**Output:** quick mode prints a ranked table in chat and nothing else. Full
mode appends rows to each covered country's sheet tab (grouped under a bold
date-heading row) and then prints the same rows as a ranked table in chat. A
country not selected today isn't touched at all in full mode. If the user
wants a shortlisted quick-mode role tracked in the sheet or a CV tailored
for it, hand off to full mode / `resume-tailor`.

---

## Setup (once, before the first run)

All local files live under this skill's directory and are **gitignored**
(`.claude/skills/job-search/*.local.json` in `.gitignore`) — this repo is
public, and a personal sheet URL or job ledger has no business in it. If
any is missing, stop and ask the user rather than guessing.

Full mode's sheet needs one tab per country in `config.local.json`, each
with the same 13-column header (frozen, bold) as the others — see **Sheet
columns**. If the user names a country with no tab yet, create one
(duplicate the header row and formatting from an existing tab) before
writing to it, and add its block to `config.local.json`.

`config.local.json` shape (abbreviated — see the file for the real
`search_seeds` per country and the full `quick_linkedin` block):

```json
{
  "sheet_url": "https://docs.google.com/spreadsheets/d/...",
  "target_experience_years": 7.4,
  "experience_band_years": [7, 8],
  "min_match_percent": 50,
  "max_new_rows_per_run": 15,
  "quick_linkedin": { "resume_path": "...", "keyword_themes": [...], "stack_policy": {...}, "experience_gate": {...}, "scoring": {...}, "dedupe": { "ledger": "linkedin_quick_seen.local.json" }, "...": "..." },
  "title_keywords": ["software engineer", "backend engineer", "...": "..."],
  "linkedin": {
    "url_pattern": "https://www.linkedin.com/jobs/search/?keywords=<url-encoded-keywords>&location=<location>&f_E=4",
    "remote_url_pattern": ".../search/?keywords=...&location=<location>&f_E=4&f_WT=2",
    "requires_authenticated_session": true,
    "canonical_url_form": "https://www.linkedin.com/jobs/view/<id>/",
    "locations": { "India": "India", "Singapore": "Singapore", "...": "..." },
    "keyword_themes": [...],
    "overseas_sponsorship_pass": { "keywords": "senior software engineer visa sponsorship", "also_run_remote_pattern": true }
  },
  "countries": {
    "India": { "tab": "India", "job_site": "naukri", "currency": "INR", "salary_period": "annual", "search_seeds": [...], "company_directory": {...} },
    "Australia": { "tab": "Australia", "job_site": "seek", "base_domain": "https://www.seek.com.au", "currency": "AUD", "salary_period": "annual", "search_seeds": [...], "sponsorship": {...} },
    "...": "New Zealand / Singapore / United Kingdom / Canada / Germany / Netherlands / United Arab Emirates follow the same country-block shape"
  }
}
```

`title_keywords` is full mode's title allowlist (step 4). Quick mode keeps
its own regex-based allowlist inline in its section below (`good`/`bad`/
`stack`) rather than in config — it needs `bad`/`good`/`stack` as three
separate patterns, not one flat list. **Keep the two in sync by hand** when
either changes — same role-noun set, same exclusions (Architect/Manager/
Director/VP/Consultant never pass either gate).

Each full-mode `sponsorship` block: `default` (starting status when the
listing is silent — `Unknown` everywhere except UAE's `Yes`),
`exclude_if_stated_none` (true for every overseas country — an explicit "no
sponsorship" drops the row), an optional `register_url` + `register_note`
(an official sponsor registry to cross-reference the employer against), and
`query_terms` (extra keyword passes — "visa sponsorship", "relocation", the
local route name — appended to that country's searches). Quick mode never
does a visa pass; it's India-only by default.

---

## Step 0 — mode, then scope

**Infer the mode from phrasing first** — don't ask when the request already
says it:

- "search LinkedIn", "jobs posted today", "what's new in the last 24
  hours", or invoking this skill and immediately naming LinkedIn → **quick
  mode**, skip straight to its own Step 0 below.
- "run the job search", "find matching jobs", or invoking this skill with
  no LinkedIn-specific framing → **full mode**, skip straight to its own
  Step 0 below.
- Ambiguous (bare invocation, no framing either way) → ask once with
  `AskUserQuestion`:
  - **Quick — LinkedIn only (Recommended)** — fastest, no sheet write, good
    for a same-day check.
  - **Full — every configured country** — the daily sweep, writes new rows
    to the tracking sheet.

If this skill is ever invoked somewhere nobody can answer a question — a
scheduled or otherwise non-interactive trigger — default to **full mode,
all 9 countries** rather than blocking on a question with no one to answer
it.

---

## Quick mode: LinkedIn-only sweep

**Input:** optionally a recency window, location, and role slant. Defaults:
last 24 hours, India, remote-preferred, mid-senior. All thresholds, themes,
and scoring weights below live in `config.local.json`'s `quick_linkedin`
block — this section documents what that block encodes and how it's used.

### Prerequisites

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

### 0a. Confirm scope (one question, then go)

Ask once, in a single `AskUserQuestion`, only if the user did not already
say: recency window (24h / 7 days), and location slant (India remote /
India any / worldwide remote). If they gave any of it in the prompt, skip
the question entirely and use what they said.

### 1. Volume target and dedupe

**Every run must surface at least 20 jobs that were not reported before.**
Two rules make that achievable:

- Load `linkedin_quick_seen.local.json` first and exclude every id in it.
  A job that appeared in any previous quick-mode run is never reported
  again, even if it still ranks well. Ids only — the ledger is not a cache
  of job content.
- Keep widening until the count is met, in this order (`quick_linkedin.
  widen_order`): more pages (`start=10,20,…`), then more keyword themes,
  then drop the remote-only restriction (Bengaluru/Pune/Hyderabad hybrid
  is acceptable), then widen recency to `r604800`. Say in the report which
  widenings were needed.

If 20 is genuinely not reachable for the window, report what there is and
state the shortfall plus what was tried — never pad with roles that fail
the gate or repeat the ledger.

### 2. Sweep with the guest search endpoint

Do **not** drive the logged-in search UI card by card. From any page on
the `linkedin.com` origin, the guest search endpoint returns 10
server-rendered cards per request and paginates cleanly, so a whole
multi-theme sweep is a few `javascript_tool` calls instead of a navigate +
lazy-scroll per query. In practice this is the difference between ~14
candidates and ~160. **This is also the technique full mode's LinkedIn
pass should reach for** for the keyword-search leg of every country
(see Full mode step 3) — the two modes converged on the same mechanism in
practice; only the query themes, filters, and what happens to the results
differ between them.

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
`QUERIES` is `quick_linkedin.keyword_themes` re-derived against the current
resume the same way full mode re-derives its own themes.

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
title filter is a **hard gate**, same rule and same allowlist as full
mode's `title_keywords` (keep them in sync if either changes) — a title
with none of the allowed role-noun phrases is dropped here regardless of
stack overlap, seniority word, or applicant count:

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
`quick_linkedin.stack_policy` for the full rationale and drop examples —
that file is gitignored and has been lost once already, so this paragraph
is the durable copy of the rule.

**Product-company check (hard gate, runs right after the backend-major
check):** every surviving candidate's employer must be a genuine product
engineering company — a company that builds and owns the software it
sells or runs internally.

Check `../company-registry.local.json` (shared with full mode's step 4)
first, before deriving anything by hand: if the employer name matches an
entry (case-insensitive, substring) in `product_companies`, keep without
further checking; if it matches `non_product_companies`, drop without
further checking. Only fall through to the manual check below for a
company the registry doesn't yet know. After the manual check classifies
it, append the new entry to the matching array (`name`, a short
`reason`/`note`, `"source": "job-search-quick"`, `"first_seen"`: today's
date) and bump `last_updated` — do this once per run for every
newly-classified company, not per-row.

Drop the row entirely, before it ever reaches Step 3, if the employer is
any of:

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

### 3. The experience gate (hard filter, runs on EVERY result)

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

### 4. Two numbers per job: Fit % and Shortlist %

Report **both**. They answer different questions and routinely disagree —
a perfect-fit role with 200+ applicants is a worse use of an evening than a
decent-fit role posted three hours ago with 25.

#### Fit % — how well the resume matches the role (0–100)

| Weight | Dimension |
| --- | --- |
| 35 | Core stack overlap (Node.js/NestJS, Golang, GraphQL/gRPC, microservices, Mongo/Postgres/Redis, AWS) |
| 25 | Domain overlap (IAM, authN/authZ, RBAC, OAuth/SAML/OIDC/SCIM, platform/infra, enterprise SaaS) |
| 20 | Seniority fit — a stated minimum of 7–8 is the sweet spot against 7.4; 4–6 scores well but risks reading over-qualified; 9 is a stretch |
| 10 | Workplace fit — see location priority below |
| 10 | Company tier signal — every surviving row already cleared the product-company hard gate above, so this scores *within* that set: a well-known product brand or funded product startup scores highest, a smaller/less-established product company scores a little lower, nothing here scores a staffing/services employer since none reach this step |

**Location priority** (since the user is in Agra and has no single
home-city constraint): remote scores the full 10 regardless of city.
Onsite/hybrid scores by where the city falls in this ordered list —
**Pune, Bangalore, Mumbai, Hyderabad** (top 4, score 8), then **Delhi,
Noida, Gurugram/Gurgaon, Indore** (score 6) — Gurugram and Gurgaon are the
same city, just old/new name. Anywhere else onsite scores 3. This also
drives the `onsite_outside_priority_cities` friction factor below — it
checks the full 9-city list, not just Pune/Bengaluru.

#### Shortlist % — realistic chance of clearing screening

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

### 5. Report

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

**Then append every reported job id to `linkedin_quick_seen.local.json`**
(merge into the existing `ids`, keep it sorted, bump `runs` and
`last_run`). Do this before finishing — skipping it means tomorrow's run
repeats today's list. State the new ledger size in the report.

### Known LinkedIn quirks (quick mode)

- Broad keywords + `sortBy=DD` returns operations, sales, and manager roles
  with no relation to the query. Relevance sort with tight filters is
  strictly better for this mode.
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
- Skip Golang/microservices as a standalone query theme — it returned
  nothing the backend and platform themes did not already cover.
- The remote-only filter (`f_WT=2`) costs roughly 90% of the pool. With a
  24-hour window it cannot reach 20 new jobs on its own, so expect most
  runs to include Bengaluru/Pune/Hyderabad hybrid and on-site roles and to
  flag workplace type per row instead.

---

## Full mode: multi-country sweep + sheet

**Input:** nothing required besides answering which countries to cover
today (this mode's own Step 0 asks in chat before anything else runs).
Reads `../../designs/design-2/resume.md` fresh, plus this skill's local
files every run — never from memory (see the top-level list above).

### 0. Ask which countries to run today

Before doing any work, ask in chat which of the 9 configured countries
today's run should cover. Use `AskUserQuestion` — but its options are
capped at 4 per question, and there are 9 countries, so ask by group
rather than listing every country:

- **All 9 countries (Recommended)** — the full daily sweep.
- **India only** — the richest source (Naukri keyword search, the
  company-directory sweep, and LinkedIn) and the fastest to run alone.
- **Overseas only** — Singapore, Australia, New Zealand, UK, Canada,
  Germany, Netherlands, UAE; skip India for this run.
- **Let me specify** — the user names the countries in their next message;
  match their answer against `config.local.json`'s `countries` keys
  (case-insensitively, and accept "UK"/"UAE" as the obvious short forms)
  and run only those. If a name they give doesn't match any configured
  country, say so and ask whether to add it (see **Setup**) rather than
  silently skipping it.

Only run steps 1-8 for the countries the answer resolves to. If nobody can
answer this — a scheduled or otherwise non-interactive trigger — default
to **all 9** (this is also Step 0's global fallback above).

### 1. Read the current profile

Read `../../designs/design-2/resume.md` fresh. Pull the **Core Skills**
tokens, the title/summary line's target titles, and the experience figure
— if `target_experience_years` in the config looks stale against what the
resume states, use the resume's figure and flag the mismatch in the final
report.

### 2. Load the dedupe ledger

Read `seen_jobs.local.json`. Nothing whose URL is already in it gets
re-fetched, re-scored, or re-added, regardless of which country it's under.

### 3. Run each selected country

Load the browser tools in one `ToolSearch` call if deferred:
`select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__browser_batch,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__find,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp`.
None of the sites need login to browse except LinkedIn, which relies on the
session already being signed in (see the `linkedin` bullet below).

Only touch the countries step 0 resolved to — a country not selected today
gets no searches, no sheet activity, and no mention beyond confirming it
was skipped, in the step 8 report.

For each selected country's block, **re-derive the query keywords from the
resume read in step 1** rather than trusting `search_seeds` verbatim — the
seeds are proven query shapes from the first run, and the skill set they
were built from drifts (tailoring, a new cert, a dropped claim). Construct 3-4
searches spanning the IAM/identity specialty and the core backend stack
(Node.js/NestJS) — a search leg aimed at the Staff/Principal/Lead track
is worth building now too, since step 4's `title_keywords` filter keeps
those titles; don't bother building one around Architect/Manager, which
the filter still drops regardless of how a search was built to find
them — shaped per `job_site`:

- **`naukri`** (India): `https://www.naukri.com/<hyphenated-keywords>-jobs`
  (or `-jobs-in-india`). Plus **3b, the company-directory sweep** below —
  the part that goes beyond keyword search for this country specifically.
- **`linkedin`** (**every selected country**, alongside that country's
  primary site — driven by the top-level `linkedin` block, not a per-country
  `job_site`). For each selected country take its location string from
  `linkedin.locations` and fill `linkedin.url_pattern`
  (`...&location=<location>&f_E=4`). Run `linkedin.keyword_themes` re-derived
  against the current resume the same way as the other sites, **using the
  guest-endpoint sweep technique from Quick mode step 2** (server-rendered
  cards via `jobs-guest/jobs/api/seeMoreJobPostings/search`, batched years/
  applicants/closed check via `jobs-guest/jobs/api/jobPosting/<id>`) rather
  than driving the logged-in UI card by card — the two modes converged on
  the same mechanism; only the query themes and what happens to the results
  differ. **For every country except India**, also run
  `linkedin.overseas_sponsorship_pass` (`keywords` = "senior software
  engineer visa sponsorship") once through `url_pattern` and once through
  `remote_url_pattern` (`&f_WT=2`, Remote) — that pass is where sponsoring /
  relocation-friendly employers surface. `f_E=4` is LinkedIn's native
  "Mid-Senior level" experience filter, applied at search time so every
  result already passes it (no post-hoc filtering the way Seek/Indeed
  need). A card title sometimes states years directly ("… Lead (8+
  Years)") — a stronger signal than the filter tier when it's there; when
  it isn't, the tier is what step 5 relies on.

  **LinkedIn only works because the browser session is already signed into
  the user's own account** — that unlocks full results and the native
  filters; logged-out hits LinkedIn's ~25-result guest wall with no filters.
  This gates **every** country's LinkedIn pass now, not just India's: if a
  run finds the session isn't authenticated (sign-in prompt instead of a
  search page), skip LinkedIn for the whole run, say so in the chat report,
  and don't try to log in or work around the wall — the per-country primary
  sites still run.
- **`seek`** (Australia via `seek.com.au`, New Zealand via `seek.co.nz` —
  same platform, same URL shape, only the domain differs):
  `<base_domain>/<hyphenated-keywords>-jobs`. Cards show salary directly
  (annual, in the local currency) when the employer disclosed it, and
  usually a seniority word in the title rather than an explicit year
  range — see step 5 for how that changes the experience filter.
- **`mycareersfuture`** (Singapore, a government portal — treat it as an
  authoritative source, not a scraped aggregator):
  `<base_domain>/search?search=<space-separated-keywords, URL-encoded>&sortBy=relevancy&page=0`.
  Cards show a **`Monthly`** SGD salary and an explicit **`N Years Exp`**
  single figure — the cleanest experience signal of any of the sources.
- **`indeed`** (UK, Canada, Germany, Netherlands, UAE — one platform, one
  URL shape, only the country subdomain and `l=` city differ):
  `<base_domain>/jobs?q=<plus-separated-keywords>&l=<city>`. Salary, when
  disclosed, shows directly on the card in the local currency, usually
  annual. Germany's `de.indeed.com` renders its **UI and most listings in
  German** — the `q=` keyword still matches English terms like "backend"
  or "node.js" fine, but read the result before assuming it's an
  English-language posting, and say so in Notes when it isn't clear.
  Two things worth expecting the first time a country's Indeed subdomain is
  hit in a session: a **cookie-consent banner** (choose the reject/decline
  option, consistent with defaulting to the privacy-preserving choice) and,
  on some, a **"Sign in with Google" overlay** — both sit on top of results
  that are already loaded underneath; dismiss and continue, no login
  required to browse or extract listings. A first `navigate` to a indeed
  subdomain not visited yet in the session can also fail once with
  "Navigation to this domain is not allowed" — a permission grant the
  browser tool needs a moment to resolve; retrying the same `navigate`
  immediately succeeds.

**3b. India's company-directory sweep** (depth, beyond keyword search).
`companies-hiring-in-india` is a directory of ~10,000 companies, not a job
board — nothing on the page itself to score. But it's backed by a real JSON
API needing no recaptcha and no login, which makes a filtered, paginated
sweep of it fast:

```js
// Run via javascript_tool, in a tab already on any naukri.com page (same-origin fetch).
const cfg = /* countries.India.company_directory from config.local.json */;
const page = /* India.next_company_page from crawl_state.local.json */;
const industryIds = Object.keys(cfg.industry_ids).join(',');   // "109,110"
const deptId = Object.keys(cfg.dept_id)[0];                     // "5"
const url = `${cfg.api_url}&pageNo=${page}&qcount=48&qccompanyIndustry=${industryIds}&qcallDept=${deptId}`;
const r = await fetch(url, { credentials: 'include', headers: cfg.api_headers });
const j = await r.json();
// j.noOfGroups = total matching companies (for wrapping next_company_page).
// j.groupDetails = [{ groupName, groupJobsURL, hasLiveJob, rating, reviewsCount }, ...]
```

Filter to `hasLiveJob === true`, take the first `companies_per_run` (default
15). For each, navigate to `https://www.naukri.com<groupJobsURL>` (a real
page load, not another fetch) and read its listings the same way as a
keyword-search result page.

**Why not fetch each company's jobs as JSON too** (much faster): the
per-company jobs endpoint, `naukri.com/jobapi/v3/search?groupId=<id>...`,
returns `406 recaptcha required` on a raw `fetch` — Naukri gates it behind
a token their frontend generates on real page loads. That's bot-detection,
and getting past it is off the table regardless of the speed it would buy.
The company **directory** search has no such gate — that's why 3b is split
the way it is: use the API where one exists and needs no defeating, fall
back to real navigation where it doesn't. Neither Seek nor MyCareersFuture
has had an equivalent directory API found for them yet — both run on
keyword search only for now.

**After India's sweep**, advance `crawl_state.local.json`'s
`India.next_company_page` by 1, wrapping to `1` once it would start past
the last page (`noOfGroups / 48`, rounded up) — the sweep rotates through
the whole filtered directory over many days rather than re-scanning page 1
every time.

**3c. Overseas sponsorship passes** (every selected country except India).
On top of the re-derived skill searches, run one extra search per entry in
that country's `sponsorship.query_terms` — e.g. on Seek
`https://www.seek.com.au/visa-sponsorship-node-js-jobs`, on Indeed
`&q=senior+backend+engineer+visa+sponsorship`, on MyCareersFuture
`search=node.js%20Employment%20Pass`. These surface the minority of
listings that name sponsorship or relocation explicitly, which is exactly
the subset worth an application from India. Extract and score them like any
other result; the sponsorship handling in step 6 does the rest.

### 4. Extract candidates

Same extraction across every site. Every one of their result lists is
**virtualized** — cards off-screen aren't in the DOM, so `read_page` only
returns what's rendered near the current scroll position. To get real
`href`s, scroll in **small increments (~10-15 ticks)** and call
`read_page(filter: "interactive")` after each, matching link text to the
card wanted. Scrolling too far in one jump skips the cards in between —
that cost several good candidates on the first (India-only) run.

**Title filter** (the "initial relevance check" every candidate must clear
before anything else in this step) — keep only postings whose title
contains one of `config.local.json`'s `title_keywords`, case-insensitive,
anywhere in the string. This runs first, on the card title alone, across
every country and source, and it's a hard gate: a title with none of the
allowed phrases is dropped here and never reaches the detail-view read,
step 5's experience check, or step 6's scoring — no stack overlap or
sponsorship signal buys it back in. Watch for two things: a card title
truncated in the DOM (read the full string via `read_page`, not a
visually-clipped label) before deciding it doesn't match, and a title that
front-loads a level or team name before the role ("Member of Technical
Staff I - Architect", "IAM Principal Consultant") — match against the
whole title, not just its first word or two.

**Product-company filter (hard gate, runs right after the title filter,
before the detail-view read below).** Keep only postings whose employer is
a genuine product engineering company — one that builds and owns the
software it sells or runs internally.

Check `../company-registry.local.json` (shared with Quick mode, one
directory up from this skill) first, before deriving anything by hand: if
the employer name matches an entry (case-insensitive, substring) in
`product_companies`, keep without further checking; if it matches
`non_product_companies`, drop without further checking. Only fall through
to the manual check below for a company the registry doesn't yet know.
After the manual check classifies it, append the new entry to the
matching array (`name`, a short `reason`/`note`, `"source": "job-search"`,
`"first_seen"`: today's date) and bump `last_updated` — do this once per
run for every newly-classified company, not per-row, so a company seen
twice in one run is only appended once. Never delete or reclassify an
existing entry without the user asking.

Drop the row entirely, on the card alone if the company name already
gives it away, otherwise after a look at the detail view or the
employer's own listing page:

- Staffing / recruiting / body-shop firms posting on a client's behalf
  (e.g. TalentXO, Applicantz, VOLTO Consulting, Zigsaw, Uplers,
  Accelon Consulting, or any "hiring for our client" style posting).
- Pure IT services / outsourcing / consulting shops (TCS, Infosys, Wipro,
  Accenture, Cognizant, Capgemini, YASH Technologies, and similarly-shaped
  vendors) — these build software under contract for other companies
  rather than owning a product, even when the specific req reads like an
  ordinary engineering role.
- Naukri's own company-directory sweep (3b) is filtered by industry, not
  by company type — a `hasLiveJob` company can still be a staffing or
  services firm, so this gate still applies to sweep results, not just
  keyword-search ones.

This is a hard drop, same weight as the title filter — a strong stack or
sponsorship match at a staffing or services company doesn't buy it back
in, and it never reaches step 5's experience check or step 6's scoring.
Count drops here in the step 8 report the same way as title-filter drops
(e.g. "N dropped: services/staffing company").

Seek renders job details in a side panel on click; Indeed does the same
for most results but sometimes opens a full page instead depending on the
posting. **Open that detail view for every candidate that clears the
title filter, before scoring it** — not only when the card looks
borderline. The card is a teaser; the full body is where the real skill
list and the real years-of-experience requirement live, and both feed
steps 5 and 6. Treat the card-only fields as a fallback of last resort,
not the default path. LinkedIn needs the same treatment: pull the full
body via the guest-endpoint `jobPosting/<id>` fetch (see step 3's
`linkedin` bullet) — a candidate scored from the search-results card
alone, with a "title-only, full JD not rendered" note, is the exception to
flag, not a normal outcome of a run.

**India location filter.** `countries.India.allowed_locations` in
`config.local.json` restricts India rows to a fixed city list (Delhi,
Gurugram/Gurgaon, Noida, Pune, Bangalore, Hyderabad, Mumbai, Ahmedabad) —
apply it here, before scoring, on both Naukri and India's LinkedIn pass. A
posting whose location doesn't match any allowed city (and isn't Remote) is
dropped silently, the same way an overseas "no sponsorship" row is dropped
in step 6 — not scored, not added, not mentioned individually in the step 8
report beyond the aggregate count. Match case-insensitively and by
substring so "Bengaluru" clears "Bangalore" and "Gurgaon"/"NCR" clears
"Gurugram"; a multi-city posting passes if any listed city is allowed; a
Remote posting with no city passes regardless of the filter. No other
configured country has this restriction unless the user asks for one.

### 5. Filter to the experience band

Every site gives experience in a different shape. Compare the **resume's
own stated experience figure** (read fresh in step 1 — e.g. "over 7 years"
→ 7; use `target_experience_years` only if the resume itself is silent)
against whatever the *posting's full text* says, not just the card:

- **Naukri**: the card's explicit range ("7-12 Yrs") is reliable on its
  own — no need to open the posting just for this. Keep when the resume's
  figure falls inside it: `posting_min <= resume_years <= posting_max`
  (equivalent to the `experience_band_years` `[7, 8]` overlap check when
  the resume figure is itself a small range).
- **MyCareersFuture**: the card's explicit single figure ("7 Years Exp")
  is reliable on its own. Keep when it equals the resume's figure, or is
  within one year either side.
- **Seek and Indeed**: the card usually shows no figure at all — this is
  exactly why step 4 requires opening the full posting body first. Search
  that text for an explicit phrase ("5+ years", "7-10 years' experience",
  "minimum 8 years in backend development", "3-5 yrs") and use it as the
  range to check against the resume's figure. Only when the body itself
  states no figure does the title's seniority word become the fallback
  signal: "Senior", "Lead", "Principal", "Staff", "Architect" line up with
  7-8 years; a bare, unqualified title or "Junior"/"Graduate" does not.
  Record in that row's Notes which case applied — e.g. "JD states 7-10
  yrs" vs. "title-inferred, JD stated no figure" — so the user can see how
  firm the match is before applying.
- **LinkedIn**: the `f_E=4` search filter restricts results to "Mid-Senior
  level" at search time, but that tier is a coarse pre-filter, not a
  substitute for reading the posting — it covers a wider span than just
  7-8 years. Read the full description (see step 4) for a stated range or
  figure and check it the same way as Seek/Indeed. Only when LinkedIn's
  own posting states nothing does the tier + title stand in as a weaker
  signal, and that should be flagged in Notes as tier-only so it reads
  differently from a posting with a real stated range.

A stated range that misses the resume's figure by about a year (e.g.
"9-14" against 7, "5 Years Exp" against 7) is a near-miss: include it only
if the match score is otherwise strong (≥70%) and say so in Notes. A
posting whose full text states a range that doesn't reach the resume's
figure at all (e.g. "2-4 years" against 7) is excluded regardless of stack
overlap — a strong tech-stack match doesn't buy back a seniority gap that
large.

### 6. Score match %

Same rubric everywhere, so scores stay comparable across countries and
days:

- **Stack overlap** (heaviest weight) — literal token overlap between the
  resume's Technical Skills and what the posting actually names, drawn
  from the **full description body read in step 4**, not just the card's
  tag chips — a card's tags are often generic ("Backend", "Coding") even
  when the body names the real stack. Node.js/NestJS/TypeScript and the
  IAM protocols (OAuth/SAML/OIDC/SCIM/SSO/RBAC) count double; generic tags
  count once.
- **Role fit** — every candidate scored here already cleared step 4's
  `title_keywords` filter, so this is a finer distinction within that
  allowed set, not a check against the Architect/Manager track (those
  titles never reach scoring). A Staff/Principal/Lead-track or
  senior-marked title ("Senior Software Engineer", "Staff Engineer",
  "Sr. Backend Engineer") scores highest; a plain "Developer"/"Engineer"
  title with no seniority marker docks a little; a title that's really an
  operations/support role wearing an Engineer label ("Support Engineer",
  "Ops Engineer") docks more, even with strong protocol-keyword overlap.
- **Domain fit bonus** — IAM/RBAC/OAuth/SSO/SCIM specifically.
- **Seniority fit** — see step 5's per-site normalization; a figure or
  title centered near 7-8 scores higher than one that only brushes the
  band from either edge.
- **Sponsorship — a gate for overseas rows, still not a score input.** For
  every country except India, resolve a `Sponsorship` value and (where the
  listing states it) a `Work Mode` value — `Remote` / `Hybrid` / `Onsite`.
  Both go in their own columns, never into the match score.
  - Listing explicitly rules it out ("no sponsorship", "citizens/PR only",
    "must have full working rights in <country>", "UAE nationals only") **and**
    the country's `sponsorship.exclude_if_stated_none` is true → **drop the
    row entirely** — not into the sheet, not into the ledger. Count it in the
    step 8 report as "excluded: no sponsorship".
  - Listing explicitly offers it ("visa sponsorship available", "we sponsor",
    "relocation package", names the local route) → `Sponsorship = Yes`.
  - Listing is silent but the employer's legal name is on the country's
    `sponsorship.register_url` list (UK licensed sponsors, NL IND recognised
    sponsors) → `Sponsorship = Likely`; put "on <registry>" in Notes.
  - Listing is silent, no registry hit → `Sponsorship =` the country's
    `sponsorship.default` (`Unknown` everywhere except UAE's `Yes`). Still
    added — the user vets it.
  - India rows: leave `Sponsorship` and `Work Mode` blank.
  Don't guess a sponsorship policy the listing and the registry are both
  silent on beyond applying the configured `default`.
- **Source note, not a score input** (India only) — a posting found via the
  company-directory sweep came from a company confirmed `hasLiveJob` in a
  relevant industry/department today; note that in Notes ("found via active
  company sweep") as a freshness signal, but don't let it inflate the score.

Rough bands, not a rigid formula: 70%+ is worth applying to soon, 55-70% is
worth a look, below `min_match_percent` (default 50%) doesn't get added.

### 7. Append only what's new — grouped by today's date, per country tab

Cross-reference every candidate's URL against the ledger from step 2,
de-duplicating within a country across its sources too (the same posting
can surface from a keyword search and, for India, from its own company's
jobs tab).

For each country that has at least one new posting clearing the threshold,
work in that country's own tab:

1. Go to the first empty row.
2. Insert a **date-heading row**: merge that row across all 13 columns
   (A:M), bold, light-blue fill, text `<today's date> — N new matches`
   (N = how many rows follow it; no emoji prefix — it didn't survive the
   `type` action's keyboard input the one time it was tried). This is what
   makes each day's batch visually distinct without a resort — every tab
   reads top-to-bottom in the order its runs happened.
3. Below the heading, append one row per new posting for that country
   (columns below). `Date Found` still gets today's date per-row too — the
   heading is a navigation aid, the column is the actual queryable data;
   keep both.
4. Add each new posting's URL, country, title, company, and today's date
   to `seen_jobs.local.json`.

A country with nothing new this run gets **no heading and no rows** in its
tab — an empty result should be invisible there, not a heading over zero
matches (say so in the chat report instead).

Cap at `max_new_rows_per_run` **per country** (default 15). If more
candidates clear the bar in one country, keep its highest-scoring ones and
say in the chat report that the rest were dropped for the cap.

### 8. Report back in chat

Which countries ran today (from step 0) and which were skipped — one line
is enough for the skipped ones. Then, per country that ran: how many new
postings were added (split by source where there is more than one, e.g.
India's keyword search vs. company sweep vs. LinkedIn), how many were found
but already in the ledger, below threshold, dropped by the step 4 title
filter (Architect/Manager-track titles and similar), dropped by the
step 4 product-company filter (staffing/services employer), or (overseas)
dropped for stating no sponsorship. For overseas countries, a one-line
sponsorship breakdown of what was added (`N Yes / N Likely / N Unknown`).
Overall: which India company-directory page was swept (for continuity
across runs), whether LinkedIn ran or was skipped for an unauthenticated
session, and anything that broke (a search returning nothing, a site's
layout not matching what extraction expected, the sheet unreachable, a tab
still 11 columns wide) — never silently produce zero rows for a country
without saying why.

**After** every sheet write for the run is done, print every row actually
added this run (across all countries covered today, not just the top 1-2)
as one ranked table in chat — the same shape as Quick mode's Step 5 table,
so the two modes read consistently side by side:
Match % | Role | Company | Location | Experience Required | Salary/Pay |
Work Mode | Sponsorship | Link, sorted **descending by Match %**. Group by
country (a `### <Country>` heading per country with at least one new row)
rather than interleaving countries in one flat table. Omit the `Work Mode`
and `Sponsorship` columns for the India group, since those stay blank on
India rows anyway. A country with zero new rows this run gets no table and
no heading here, consistent with step 7 — just the one-line mention
already covered above.

---

## Sheet columns (identical across all tabs, full mode only)

`Company | Job Title | Match % | Matched Keywords/Skills | Experience
Required | Salary/Pay | Location | Vacancy Link | Notes | Date Found |
Status | Work Mode | Sponsorship`

Columns **L (`Work Mode`)** and **M (`Sponsorship`)** are new — add them
(header cell, same frozen/bold formatting) to every existing tab before the
next run; a run that finds a tab still 11 columns wide should say so in the
step 8 report rather than writing L/M into the wrong place.

`Salary/Pay` carries whatever period and currency that country's site uses
natively — India annual INR ("LPA"), Australia/NZ usually annual AUD/NZD,
Singapore **monthly** SGD, and UK/Canada/Germany/Netherlands/UAE annual
GBP/CAD/EUR/EUR/AED via Indeed — don't convert or annualize across tabs,
and don't compare a number in one tab to a number in another without
converting first if the user asks for that.

`Status` defaults to `New` on every row this skill appends, and is never
overwritten on an existing row — it's the user's own tracking column
(`Applied`, `Skipped`, whatever they use) once set.

`Work Mode` (`Remote` / `Hybrid` / `Onsite`, or blank if the listing
doesn't say) and `Sponsorship` (`Yes` / `Likely` / `Unknown` / `No` — see
step 6) are written by the skill on overseas rows only; both stay blank on
India rows. A row that would be `Sponsorship = No` isn't written at all
when the country's `exclude_if_stated_none` is true, so `No` should be rare
in practice — it's there for the case where a country later sets that flag
false.

## Gotchas (full mode)

- **`jobapi/v3/search` (the JSON endpoint behind Naukri's own keyword search
  and a company's jobs tab) requires a recaptcha token a raw `fetch` doesn't
  have** — it 406s with `"recaptcha required"`. Don't try to route around
  this; it's exactly the bot-detection bypass that's off-limits regardless
  of the speed win. Real page navigation is what a signed-in browser session
  does correctly that a bare fetch can't reproduce.
- **`companyapi/v1/search` (Naukri's company directory) has no such gate**
  and takes plain headers (`appid: 109`, `systemid: Naukri`) — use it freely
  for step 3b.
- That fetch's JSON result can trip this tool's own content filter
  (`[BLOCKED: Cookie/query string data]`) if you `JSON.stringify` the raw
  response — `groupJobsURL` values end in `?tab=jobs` and some label text
  contains characters that look like query-string noise. Extract only the
  specific fields needed rather than dumping the whole object, and strip
  `?...` off any URL before printing it.
- **Seek and Indeed cards rarely state years of experience, but their full
  posting bodies often do** — that's why step 4 requires opening the
  detail view for every candidate rather than scoring off the card. The
  step 5 seniority-word proxy is only the fallback for the postings whose
  body is genuinely silent too, and it's weaker than a stated figure. Say
  so in Notes on every such row so the user doesn't read it as a stated
  requirement.
- **Indeed shows a cookie-consent banner and sometimes a Google sign-in
  overlay** the first time a country subdomain loads in a session —
  dismiss both (reject/decline on the consent banner); results are already
  loaded underneath and neither blocks extraction.
- **A first `navigate` to an Indeed country subdomain not yet visited this
  session can fail once** with "Navigation to this domain is not allowed."
  Retry the same `navigate` immediately — it's a permission grant
  resolving, not a real block.
- **`de.indeed.com` renders in German** — UI chrome and most listings. The
  `q=` keyword search still matches English terms fine, but don't assume a
  result is an English-language posting; note it when it isn't obvious.
- **LinkedIn job links carry huge per-view tracking query strings**
  (`?eBP=...&refId=...&trackingId=...&trk=...`) that differ every time the
  same posting is rendered, even in the same session. **Strip everything
  after the numeric id down to `https://www.linkedin.com/jobs/view/<id>/`**
  before writing it to the sheet or the ledger — the raw `href` as an
  unbroken dedupe key will never match itself twice and the same job will
  get re-added every run. This is the same canonical form `resume-tailor`
  already uses for LinkedIn links; keep them consistent if either skill's
  handling of LinkedIn URLs changes.
- **LinkedIn depends on the browser already being signed into the user's
  own account.** Don't attempt to sign in, complete a checkpoint, or work
  around a logged-out state — that's exactly the kind of bypass that's off
  the table. If the session isn't authenticated, skip LinkedIn for that run
  and say so.
- **Google Sheets' grid is canvas-rendered, not real DOM text** —
  `get_page_text` does not reliably return cell values. Dedup uses the local
  ledger file for this reason; don't try to read the sheet back to check for
  duplicates.
- A typed URL auto-converts to a hyperlink on blur (Tab/Enter) — no separate
  formatting step.
- Typing a row via repeated Tab then a final Enter returns the cursor to the
  **starting column** of that tab sequence on the next row down. Screenshot
  after the first row of a batch to confirm before committing to a long
  sequence — a misclick early wastes the whole thing; the fix, if it
  happens, is reselecting by typing the cell reference into the Name Box
  rather than trusting a stale pixel coordinate.
- To add a country's sheet tab: right-click an existing tab → **Duplicate**,
  rename it, clear the data rows (keep the header), then update
  `config.local.json`. Duplicating keeps the frozen-row and bold-header
  formatting without having to reapply it by hand.

---

## Version control

`config.local.json`, `seen_jobs.local.json`, `linkedin_quick_seen.local.json`,
and `crawl_state.local.json` are gitignored
(`.claude/skills/job-search/*.local.json` in `.gitignore`). The shared
`../company-registry.local.json` is gitignored too (`.claude/*/*.local.json`
in `.gitignore`) — it's employer-name data derived from the same private
runs. This repo is public — never commit a sheet URL, a job ledger, crawl
progress, the company registry, or anything derived from them into
`SKILL.md` or any other tracked file, and never remove either gitignore
entry.
