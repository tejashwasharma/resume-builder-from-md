---
name: job-search
description: Ask which of the 9 configured countries to cover today (India via Naukri plus a company-directory sweep, LinkedIn for every selected country, Australia/New Zealand via Seek, Singapore via MyCareersFuture, and UK/Canada/Germany/Netherlands/UAE via Indeed), then search each selected one for postings matching the current resume's skills and the 7-8 year experience band, score every result by match % against the resume, screen every overseas role for visa-sponsorship signal (dropping those that state no sponsorship, flagging the rest), and append new (non-duplicate) postings to the matching per-country tab of the tracking Google Sheet, grouped under a date-heading row for the day's run. Use when the user asks to find matching jobs, run the job search, or invokes this skill directly (they run it daily in the evening).
---

# Job search

**Input:** nothing required besides answering which countries to cover
today (step 0 asks in chat before anything else runs). Reads
`../../designs/design-1/resume.md` fresh (the skills, objective, and experience
to match against) and this skill's local files every run — never from
memory:

- `config.local.json` — thresholds, the tracking sheet's URL, a top-level
  `title_keywords` allowlist (see step 4's title filter), one top-level
  `linkedin` block (the cross-country LinkedIn source), and one block per
  country (its sheet tab name, job site, starter search queries, and — for
  every country except India — a `sponsorship` block: registry URL, default
  status, and whether an explicit "no sponsorship" excludes the row).
- `seen_jobs.local.json` — every posting URL already added to the sheet
  across all previous runs, tagged with which country it went to. The
  dedupe ledger.
- `crawl_state.local.json` — per-country crawl progress (today, only India
  has a company-directory sweep to track).

**Output:** new rows appended to the tab of each country covered today, in
the Google Sheet at `config.local.json`'s `sheet_url`, grouped under a bold
date-heading row. A country not selected today isn't touched at all — no
searches, no sheet activity. Nothing from a previous run is ever edited,
resorted, or removed — the user reviews and applies manually, on their own
schedule.

---

## Setup (once, before the first run)

All local files live under this skill's directory and are **gitignored**
(`.claude/skills/job-search/*.local.json` in `.gitignore`) — this repo is
public, and a personal sheet URL has no business in it. If any is missing,
stop and ask the user rather than guessing.

The sheet needs one tab per country in `config.local.json`, each with the
same 13-column header (frozen, bold) as the others — see **Sheet columns**.
If the user names a country with no tab yet, create one (duplicate the
header row and formatting from an existing tab) before writing to it, and
add its block to `config.local.json`.

`config.local.json` shape (abbreviated — see the file for the real
`search_seeds` per country):

```json
{
  "sheet_url": "https://docs.google.com/spreadsheets/d/...",
  "target_experience_years": 7.4,
  "experience_band_years": [7, 8],
  "min_match_percent": 50,
  "max_new_rows_per_run": 15,
  "title_keywords": ["software engineer", "backend engineer", "fullstack engineer", "full stack engineer", "software developer", "backend developer", "full stack developer", "node.js developer", "node js developer", "iam engineer", "security engineer", "platform engineer"],
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
    "New Zealand": { "tab": "New Zealand", "job_site": "seek", "base_domain": "https://www.seek.co.nz", "currency": "NZD", "salary_period": "annual", "search_seeds": [...], "sponsorship": {...} },
    "Singapore": { "tab": "Singapore", "job_site": "mycareersfuture", "base_domain": "https://www.mycareersfuture.gov.sg", "currency": "SGD", "salary_period": "monthly", "search_seeds": [...], "sponsorship": {...} },
    "United Kingdom": { "tab": "United Kingdom", "job_site": "indeed", "base_domain": "https://uk.indeed.com", "currency": "GBP", "salary_period": "annual", "search_seeds": [...], "sponsorship": {...} },
    "Canada": { "tab": "Canada", "job_site": "indeed", "base_domain": "https://ca.indeed.com", "currency": "CAD", "salary_period": "annual", "search_seeds": [...], "sponsorship": {...} },
    "Germany": { "tab": "Germany", "job_site": "indeed", "base_domain": "https://de.indeed.com", "currency": "EUR", "salary_period": "annual", "search_seeds": [...], "language_note": "listings render in German", "sponsorship": {...} },
    "Netherlands": { "tab": "Netherlands", "job_site": "indeed", "base_domain": "https://nl.indeed.com", "currency": "EUR", "salary_period": "annual", "search_seeds": [...], "sponsorship": {...} },
    "United Arab Emirates": { "tab": "United Arab Emirates", "job_site": "indeed", "base_domain": "https://ae.indeed.com", "currency": "AED", "salary_period": "annual", "search_seeds": [...], "sponsorship": { "default": "Yes", "exclude_if_stated_none": false } }
  }
}
```

`title_keywords` is the global title allowlist enforced in step 4 — a
case-insensitive substring match against the posting's title, applied
across every country and source. It covers the Engineer/Developer IC
track plus the IAM-specific engineer variants your resume specializes in
(IAM/Security/Platform Engineer); it deliberately does **not** include
"architect", "lead", "manager", "principal", "consultant", or "director"
— a posting whose title carries none of the listed phrases is dropped in
step 4 regardless of stack overlap or match score, even a strong IAM/
Node.js match with an Architect or Lead-track title. Edit this list
directly in `config.local.json` if the target titles change; don't infer
it fresh from the resume's objective line the way `search_seeds` are
re-derived, since the objective line still names Architect/Lead/Manager
tracks this filter intentionally excludes.

Each `sponsorship` block: `default` (starting status when the listing is
silent — `Unknown` everywhere except UAE's `Yes`), `exclude_if_stated_none`
(true for every overseas country — an explicit "no sponsorship / PR only"
drops the row), an optional `register_url` + `register_note` (an official
sponsor registry to cross-reference the employer against), and `query_terms`
(extra keyword passes — "visa sponsorship", "relocation", the local route
name — appended to that country's searches).

---

## Flow

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

Only run steps 1-8 for the countries the answer resolves to. If this skill
is ever invoked somewhere nobody can answer the question — a scheduled or
otherwise non-interactive trigger — default to **all 9** rather than
blocking on a question with no one to answer it.

### 1. Read the current profile

Read `../../designs/design-1/resume.md` fresh. Pull the **Technical Skills** tokens,
the **objective line**'s target titles, and the experience figure — if
`target_experience_years` in the config looks stale against what the resume
states, use the resume's figure and flag the mismatch in the final report.

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
(Node.js/NestJS) — don't bother building a search leg around the
Architect/Manager/Lead track the objective line names; step 4's
`title_keywords` filter drops those titles regardless of how a search was
built to find them, so a query aimed at that track alone will still get
filtered out — shaped per `job_site`:

- **`naukri`** (India): `https://www.naukri.com/<hyphenated-keywords>-jobs`
  (or `-jobs-in-india`). Plus **3b, the company-directory sweep** below —
  the part that goes beyond keyword search for this country specifically.
- **`linkedin`** (**every selected country**, alongside that country's
  primary site — driven by the top-level `linkedin` block, not a per-country
  `job_site`). For each selected country take its location string from
  `linkedin.locations` and fill `linkedin.url_pattern`
  (`...&location=<location>&f_E=4`). Run `linkedin.keyword_themes` re-derived
  against the current resume the same way as the other sites. **For every
  country except India**, also run `linkedin.overseas_sponsorship_pass`
  (`keywords` = "senior software engineer visa sponsorship") once through
  `url_pattern` and once through `remote_url_pattern` (`&f_WT=2`, Remote) —
  that pass is where sponsoring / relocation-friendly employers surface.
  `f_E=4` is LinkedIn's native "Mid-Senior level" experience filter, applied
  at search time so every result already passes it (no post-hoc filtering
  the way Seek/Indeed need). A card title sometimes states years directly
  ("… Lead (8+ Years)") — a stronger signal than the filter tier when it's
  there; when it isn't, the tier is what step 5 relies on.

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

Seek renders job details in a side panel on click; Indeed does the same
for most results but sometimes opens a full page instead depending on the
posting. **Open that detail view for every candidate that clears the
title filter, before scoring it** — not only when the card looks
borderline. The card is a teaser; the full body is where the real skill
list and the real years-of-experience requirement live, and both feed
steps 5 and 6. Treat the card-only fields as a fallback of last resort,
not the default path. LinkedIn needs the same treatment: click into the
job (or read the `currentJobId` detail pane already loaded by the search)
and pull its full body with `get_page_text` — a candidate scored from the
search-results card alone, with a "title-only, full JD not rendered" note,
is the exception to flag, not a normal outcome of a run.

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
  allowed set, not a check against the objective line's Architect/Lead/
  Manager track (those titles never reach scoring). A senior-marked title
  ("Senior Software Engineer", "Sr. Backend Engineer") scores highest; a
  plain "Developer"/"Engineer" title with no seniority marker docks a
  little; a title that's really an operations/support role wearing an
  Engineer label ("Support Engineer", "Ops Engineer") docks more, even
  with strong protocol-keyword overlap.
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
filter (Architect/Lead/Manager-track titles and similar), or (overseas)
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
as one ranked table in chat — the same shape as the `linkedin-search`
skill's Step 5 table, so the two skills read consistently side by side:
Match % | Role | Company | Location | Experience Required | Salary/Pay |
Work Mode | Sponsorship | Link, sorted **descending by Match %**. Group by
country (a `### <Country>` heading per country with at least one new row)
rather than interleaving countries in one flat table. Omit the `Work Mode`
and `Sponsorship` columns for the India group, since those stay blank on
India rows anyway. A country with zero new rows this run gets no table and
no heading here, consistent with step 7 — just the one-line mention
already covered above.

---

## Sheet columns (identical across all tabs)

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

## Gotchas

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
  get re-added every run. This is the same canonical form the
  `resume-tailor` skill already uses for LinkedIn links; keep them
  consistent if either skill's handling of LinkedIn URLs changes.
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

## Version control

`config.local.json`, `seen_jobs.local.json`, and `crawl_state.local.json`
are gitignored (`.claude/skills/job-search/*.local.json` in `.gitignore`).
This repo is public — never commit a sheet URL, a job ledger, crawl
progress, or anything derived from them into `SKILL.md` or any other
tracked file, and never remove the gitignore entry.
