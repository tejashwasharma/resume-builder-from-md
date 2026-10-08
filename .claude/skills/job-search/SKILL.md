---
name: job-search
description: Searches LinkedIn and Naukri (both logged in) plus a registry-driven company career-page watchlist for product-company India roles matching the resume in designs/design-2 - Senior/Staff/Principal backend & platform engineer (Node.js/TypeScript) and applied-AI roles, IAM titles excluded. Scores each role on Fit %, Shortlist % and Career-path alignment, prints a ranked table in chat and inserts new rows (newest on top) into the India tab of the tracking Google Sheet via Composio. Report only - never applies. Use when the user asks to find matching jobs, run the job search, search LinkedIn/Naukri, or asks what's new today.
---

# Job search

Process finalised with the user on 2026-10-08. **All rules live in
`config.local.json` (this directory) - read it fresh every run, never from
memory. Read `../../designs/design-2/resume.md` fresh too.** Do not assume
anything the config or the user hasn't stated; if something is unclear, ask.

Local files (all gitignored - this repo is public, never commit them or put
their contents in this file): `config.local.json`, `seen_jobs.local.json`
(URL ledger, sheet dedupe), `linkedin_quick_seen.local.json` (LinkedIn job-id
ledger), `../company-registry.local.json`. If any is missing, stop and ask.

**Boundary: report only.** Never click Apply / Easy Apply / Save / Follow,
message recruiters, or sign in for the user. If a site shows a login wall,
stop and ask the user to sign in; do not work around it. After reporting,
offer a `resume-tailor` handoff for roles the user picks.

## The filters (in the order they run)

1. **Title gate.** Title must contain a phrase in `roles.include_title_phrases`
   and must not match `exclude_title_regex` (Lead/Manager/Architect/etc.) or
   `exclude_iam_regex` (IAM/SSO/CIAM/SAML/SCIM/RBAC - hard drop even if it also
   matches an include phrase). Match the full title, not its first words.
2. **Company gate (product companies only).** Check
   `../company-registry.local.json` first: in `product_companies` keep, in
   `non_product_companies` drop. Unknown company -> classify by the rule in
   `company_gate`: keep an owner of its own software product, or the India GCC
   of an *approved* big-tech product company; drop staffing, IT services,
   agencies, aggregators, and GCCs/internal tech teams of banks, retail,
   energy, PE and other non-tech firms. **Do not add to the registry silently -
   ask the user which list a new company belongs on**, batching questions at
   the end of the run. The big-tech GCC list is not yet approved: on the first
   run propose one and wait for approval.
3. **Stack gate.** Non-AI roles: Node.js/TypeScript must be named in the
   posting. Java/Go count only as secondary beside Node/TS, never alone;
   Python-only, .NET-only, Go-only or Java-only non-AI roles are dropped. AI/LLM
   engineering roles are exempt (Python allowed there only). Full-stack titles
   pass only when backend-heavy with Node primary. Read the body, not just the
   title.
4. **Experience gate.** Resume = 7.5 years. Compare against the posting's stated
   *minimum*: keep 5-10; drop <5 or >10; no figure -> keep, flag `min NA`.
5. **Location gate.** Remote only if open to India-based candidates (drop remote
   roles needing US/EU work authorisation). Otherwise Pune, Bangalore,
   Hyderabad, Mumbai, Delhi/Noida/Gurugram. Anything else dropped. India only.
6. **Pay gate.** Drop only when pay is listed and under 30 LPA. Unlisted pay is
   kept. Show listed pay.
7. **Closed postings** ("No longer accepting applications") are dropped and
   reported.

Log every drop with its gate in the report (`Company - Role, gate, reason`).

## Run

**Step 0 - recency.** If `recency.first_run_done` is false, use 7 days
(`r604800`) and set it true after the run; afterwards use 24h (`r86400`).
The user may override in the prompt.

**Step 1 - load.** Resume, config, both ledgers, registry. Seed
`window.__seen` from the LinkedIn ledger.

**Step 2 - LinkedIn** (logged-in Chrome via `mcp__claude-in-chrome__*`; load
the tools in one ToolSearch call; reuse one tab, close at the end). Navigate
once to `https://www.linkedin.com/jobs/`, then use the guest endpoint from that
origin - it returns 10 server-rendered cards per request:

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
window.__search = async (kw, tpr, pages) => {
  const out = [];
  for (let p = 0; p < pages; p++) {
    const u = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords='
      + encodeURIComponent(kw) + '&location=India&f_TPR=' + tpr + '&f_E=4,5&start=' + (p*10);
    const r = await fetch(u, { credentials: 'omit' });
    if (r.status !== 200) break;
    const rows = window.__parse(await r.text());
    if (!rows.length) break;
    out.push(...rows);
    await new Promise(x => setTimeout(x, 200));
  }
  return out;
};
```

Run every `keyword_themes` entry (re-derive against the current resume rather
than trusting them verbatim), `sources.linkedin.pages_per_query` pages each.
Gotchas: use regex parsing (Trusted Types blocks `innerHTML`; `DOMParser` drops
the bare `<li>`s); `javascript_tool` truncates long returns and blocks
URL-ish strings, so keep results on `window` and pull them in slices of 10-15
plain lines; build links as `https://www.linkedin.com/jobs/view/<id>/` (never
keep tracking query strings). Do not use `sortBy=DD` - it floods results with
off-target roles. Drop ids already in the ledger, apply the title gate, then
fetch each survivor once via
`jobs-guest/jobs/api/jobPosting/<id>` (same origin, `credentials:'omit'`) to
read the body for stack, years (ignore "founded N years ago" boilerplate),
closed flag, applicant count and workplace type, then apply gates 2-7. If the
guest endpoint returns empty, fall back to the logged-in
`/jobs/search/` UI with a lazy scroll.

**Step 3 - Naukri** (logged in). Build keyword URLs
`https://www.naukri.com/<hyphenated-keywords>-jobs-in-india` plus the
product filter `?industryTypeIdGid=110` (Naukri's Software Product industry
facet); also open page 2 of each seed with the site's pagination control. The
JSON endpoint `jobapi/v3/search` requires a recaptcha token - never try to
route around it; use real page navigation. Naukri result lists are virtualized:
scroll in ~10-15 tick increments and `read_page` after each. Open every
candidate's detail page before scoring (cards are teasers). Naukri cards show
an explicit `N-M Yrs` range: keep when 7.5 falls inside, or the minimum is
5-10 (apply the same experience gate). Apply gates 1-7.

**Step 4 - Career pages.** Take `product_companies` from the registry (plus the
approved big-tech GCC list once it exists), restricted to whichever companies
the user has kept (`sources.career_pages`). Open each company's careers page,
filter to India + engineering, and run the same gates. If the watchlist has not
been confirmed by the user, skip this step and say so.

**Step 5 - Score** every survivor (rubric in `config.local.json` `scoring`):

- **Fit %** (0-100): core stack 35, domain 25 (platform/distributed systems/
  scale, or applied AI), seniority 15, workplace 10 (remote and Pune 10, other
  top cities 8, NCR 6), company signal 15 (known product brand or funded
  product startup highest).
- **Shortlist %** = Fit % x competition x friction, rounded to 5, clamped
  10-90. Competition from the applicant count (<30: 1.0, 30-70: 0.8, 71-150:
  0.6, >150 or the capped 200: 0.45). Friction: top-tier hiring bar 0.8,
  non-Node primary on a non-AI role 0.6, posted <12h 1.1 (cap 90). Always show
  the applicant count so the number is auditable.
- **Career alignment** (0-100): how far the role moves the user toward deeper
  backend/platform/distributed-systems work or applied AI at a product
  company. AI roles are scored as a growth fit (the user is learning AI), not
  as proof of LLM experience. Say in one phrase why.

Drop anything under `volume.min_fit_percent` (55).

**Step 6 - Report.** Print a ranked table sorted by **Shortlist %**
descending (max `volume.max_reported`): Fit % | Shortlist % | Career % | Role |
Company | Location / mode | Req. exp. | Pay | Applicants | Source | Link.
The Link column must show the **full URL** in every row (never a label like
"Open" or a bare id), so it can be clicked or copied straight from chat.
Follow with two or three lines per top pick (why it fits, one reservation),
the dropped-and-why list, the queries used, any `min NA` / title-only flags,
and which sources ran or were skipped (e.g. unauthenticated session) with
anything that broke. Never silently produce zero rows - say why.

**Step 7 - Sheet** (written through the Composio Google Sheets tools, not by
typing in the browser; load them with `COMPOSIO_SEARCH_TOOLS` /
`COMPOSIO_MULTI_EXECUTE_TOOL`, session per call). Target: `India` tab
(sheetId 0) of `sheet_url`; spreadsheet id is in the URL. Flat table, one row
per job, **newest on top**, no heading rows. Header (row 1, frozen, bold):

`Date Found | Status | Company | Role | Link | Location | Work Mode | Exp Required | Pay (LPA) | Fit % | Shortlist % | Career % | Applicants | Source | Stack Matched | Notes`

Per run: (1) sort the new rows by Shortlist % descending; (2) `GOOGLESHEETS_INSERT_DIMENSION`
ROWS start_index 1, end_index 1+N (inserts below the header, existing rows shift
down); (3) one `GOOGLESHEETS_VALUES_UPDATE` on `India!A2:P<N+1>` with
`USER_ENTERED`; (4) read back `India!A1:P3` with `GOOGLESHEETS_BATCH_GET` to
confirm placement. Rate limit is 60 writes/minute - always write the whole
block in one call. Field rules: Date Found = ISO `2026-10-08`; Status = `New`
(never overwrite an existing row's Status); Link = the **full canonical URL as visible plain text** (never an "Open"
label or HYPERLINK formula), e.g. `https://www.linkedin.com/jobs/view/<id>/`,
formatted blue/underlined, no wrap; Work Mode = Remote / Hybrid / Onsite; Exp Required as
stated (`6+`, `5-8`, or `min NA`); Pay (LPA) listed pay or blank; Fit,
Shortlist and Career % as plain integers; Applicants a number or `<25` / `200+`;
Source = LinkedIn / Naukri / Career page; Stack Matched = comma list of the
resume skills the posting names; Notes = one line on why plus any flags
(`min NA`, `AI growth fit`, `title-only JD`). The "Old" tab is archived - never
touch it. Dedupe uses the ledger, not the sheet.

**Step 8 - Ledgers and registry.** Append every reported LinkedIn id to
`linkedin_quick_seen.local.json` (sorted; bump `runs` and `last_run`) and
every row written to the sheet to `seen_jobs.local.json` (URL, title, company,
date; canonical LinkedIn form). Registry: only write entries the user has
approved (ask first, per the company gate), then bump `last_updated`.

## Non-interactive runs

If nobody can answer a question (a scheduled trigger), run with the config as
is, skip the career-page step and any unapproved registry additions, and list
the unresolved company questions at the end of the report.
