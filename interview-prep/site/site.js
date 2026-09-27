/* =========================================================================
   The Interview Book — one study flow

   Renders from window.__DATA__ (built by build_site.py):
     topics   -> chapters                       the vertical axis (the path)
     chapter  -> learn / workshop / code / quiz  the horizontal axis (stages)

   Progress is chapter-level only: not started, started, done. The Code stage
   also remembers which problems you solved, and the Quiz stage your best score.

   Optional runtime capabilities resolve asynchronously and may never arrive:
     db     -> progress, solved problems and AI-generated problems, across devices
     sample -> AI problem generation, AI code review and nudges, and the Ask chat
   Nothing waits on them: the book, the editor, Run and the quizzes all work
   without either.

   The rule for AI in the Code stage: the AI proposes, the page executes.
   Every pass/fail shown comes from running code in a Web Worker, never from
   the AI's opinion.
   ========================================================================= */

// Wrapped in its own closure so nothing here — go(), state, $, etc. — is a
// bare global. Without this, a later <script> (a dynamically-loaded library
// such as mermaid.js, injected on demand when a chapter has a diagram) can
// define its own same-named top-level helper and silently clobber ours,
// since sibling classic <script> tags all share one global scope. This bit
// us for real: our navigation function `go` got overwritten by an unrelated
// minified helper from a library loaded after it, and every click that
// called `go` afterward silently called the wrong function instead.
(function () {
const DATA = window.__DATA__;
const CONTENT = DATA.content;
const TOPICS = DATA.topics;
const QUESTIONS = DATA.questions;
const ORDER = TOPICS.flatMap((t) => t.chapters);
const TOPIC_OF = {};
TOPICS.forEach((t) => t.chapters.forEach((c) => { TOPIC_OF[c] = t; }));

const STAGES = [
  ['learn', 'Learn'],
  ['workshop', 'Workshop'],
  ['code', 'Code'],
  ['quiz', 'Quiz'],
];
const CODING_TOPICS = new Set(['coding-basics', 'coding-core']);

const state = {
  chapter: null,
  stage: 'learn',
  index: 0,
  query: '',
  status: {},        // cid -> 'started' | 'done'
  solved: {},        // exercise id -> timestamp
  quizBest: {},      // cid -> best score (0..1)
  generated: {},     // id -> AI-generated problem
  expanded: {},      // topic id -> true when open in the sidebar
  seen: {},          // "cid.stage.i" -> true, this visit only (pager dots)
  code: null,
  quiz: null,
};

let sample = null;
let db = null;
let pendingEx = null;   // a problem to open once the Code stage renders (from search)

const $ = (s) => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };

/* Bind an activation handler the same defensive way as the delegated
   listener in wireDelegatedEvents(): 'pointerup' first (immune to whatever
   swallows the synthesized 'click' in the claude.ai artifact viewer), with
   'click' as a deduplicated fallback for keyboard activation. Used for the
   handful of static, once-only bindings in init()/initAsk(); everything
   else routes through the single delegated listener instead. */
function onActivate(elmt, fn) {
  let last = 0;
  elmt.addEventListener('pointerup', (e) => { if (e.button !== 0) return; last = Date.now(); fn(e); });
  elmt.addEventListener('click', (e) => { if (Date.now() - last < 80) return; fn(e); });
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const plain = (html) => html
  .replace(/<pre class="mermaid">[\s\S]*?<\/pre>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ');

function fmtMin(m) {
  if (!m) return '0 m';
  if (m < 60) return `${Math.round(m)} m`;
  const h = m / 60;
  return `${h < 10 ? h.toFixed(1).replace(/\.0$/, '') : Math.round(h)} h`;
}

/* ------------------------------------------------------------- storage --- */

const LS_KEY = 'ib:v2';

function loadLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    Object.assign(state.status, v.status || {});
    Object.assign(state.solved, v.solved || {});
    Object.assign(state.quizBest, v.quizBest || {});
    Object.assign(state.generated, v.generated || {});
  } catch (_) {}
}

function saveLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      status: state.status, solved: state.solved, quizBest: state.quizBest, generated: state.generated,
    }));
  } catch (_) {}
}

async function dbSet(path, data) {
  if (!db) return;
  try { await db.doc(path).set(data); } catch (_) { /* local copy still holds it */ }
}

function setStatus(cid, status) {
  if (state.status[cid] === status) return;
  if (status) state.status[cid] = status; else delete state.status[cid];
  saveLocal();
  dbSet(`chapters/${cid}`, { status: status || 'none', at: Date.now() });
  renderNav();
}

function markSolved(id) {
  if (state.solved[id]) return;
  state.solved[id] = Date.now();
  saveLocal();
  dbSet(`solved/${id}`, { at: state.solved[id] });
  if (state.generated[id]) {
    state.generated[id].solved = true;
    dbSet(`generated/${id}`, state.generated[id]);
  }
}

/* ------------------------------------------------------ chapter helpers --- */

function stagesOf(c) {
  return STAGES.filter(([k]) => {
    if (k === 'learn') return c.learn.length > 0;
    if (k === 'workshop') return c.workshop.length > 0;
    if (k === 'code') return c.exercises.length > 0 || CODING_TOPICS.has(c.topic);
    return c.quiz.length > 0;
  });
}

function chapterMinutes(c, core) {
  const t = c.time;
  return t.learn + t.workshop + (core ? t.codeCore : t.code) + t.quiz;
}

function topicSummary(t) {
  const done = t.chapters.filter((cid) => state.status[cid] === 'done').length;
  const left = t.chapters.filter((cid) => state.status[cid] !== 'done')
    .reduce((s, cid) => s + chapterMinutes(CONTENT[cid]), 0);
  return { done, total: t.chapters.length, left };
}

function nextChapter() {
  return ORDER.find((cid) => state.status[cid] === 'started')
    || ORDER.find((cid) => state.status[cid] !== 'done')
    || null;
}

/* -------------------------------------------------------------- routing --- */

/* Navigation is in-memory: go() updates state and renders directly. It never
   waits on the URL, because inside the claude.ai viewer the page runs in a
   sandboxed frame where changing location.hash may not fire `hashchange` —
   which left chapter links doing nothing. The hash is still written when the
   frame allows it (history.pushState, in a try), so the back button and a
   shared `#cid` link work where they can; they are a bonus, not the mechanism.

   The hash is `cid`, `cid.stage` or `cid.stage.n` — bare tokens only, because
   that is all an artifact link passes through. */
function parseHash(hash) {
  const [cid, stage, n] = decodeURIComponent(String(hash || '').replace(/^#/, '')).split('.');
  if (!cid || !CONTENT[cid]) return { chapter: null };
  const valid = stagesOf(CONTENT[cid]).map(([k]) => k);
  return {
    chapter: cid,
    stage: valid.includes(stage) ? stage : valid[0],
    index: Math.max(0, parseInt(n, 10) || 0),
  };
}

function hashFor(cid, stage, index) {
  return cid ? [cid, stage, index].filter((x) => x !== undefined && x !== null && x !== '').join('.') : '';
}

function go(cid, stage, index) {
  state.query = '';
  const box = $('#search');
  if (box) box.value = '';
  const h = hashFor(cid, stage, index);
  try {
    if (('#' + h) !== location.hash) history.pushState(null, '', h ? '#' + h : location.pathname + location.search);
  } catch (_) { /* sandboxed frame: navigation still works, the URL just doesn't follow */ }
  route(parseHash(h));
}

function route(r) {
  r = r || parseHash(location.hash);
  const changedChapter = r.chapter !== state.chapter;
  state.chapter = r.chapter;
  state.stage = r.stage || 'learn';
  state.index = r.index || 0;
  if (state.chapter) {
    if (!state.status[state.chapter]) setStatus(state.chapter, 'started');
    const t = TOPIC_OF[state.chapter];
    if (t) state.expanded[t.id] = true;
  }
  if (changedChapter) { state.code = null; state.quiz = null; }
  closeSidebar();
  render();
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------- sidebar --- */

function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = TOPICS.map((t) => {
    const s = topicSummary(t);
    const open = state.expanded[t.id];
    const rows = t.chapters.map((cid) => {
      const c = CONTENT[cid];
      const st = state.status[cid] || '';
      return `<li><a class="nav-ch${cid === state.chapter ? ' active' : ''}" href="#${cid}" data-go="${cid}">
          <span class="status ${st}" title="${st || 'not started'}"></span>
          <span class="t">${esc(c.title)}</span>
          <span class="m">${fmtMin(chapterMinutes(c))}</span></a></li>`;
    }).join('');
    return `<div class="nav-topic${open ? '' : ' collapsed'}">
        <button type="button" data-topic="${t.id}" aria-expanded="${open ? 'true' : 'false'}">
          <span class="tname">${esc(t.title)}</span>
          <span class="tmeta">${s.done}/${s.total}</span>
        </button>
        <ul>${rows}</ul></div>`;
  }).join('');

  // Clicks are handled by the single delegated listener wired in init() —
  // see "click routing" below. Per-node .onclick assignments on freshly
  // inserted nodes are not reliably delivered inside the claude.ai artifact
  // sandbox, which is why the sidebar and every other dynamic control route
  // through that one listener instead.
  const done = ORDER.filter((cid) => state.status[cid] === 'done').length;
  $('#brand-sub').textContent = `${done} of ${ORDER.length} chapters done`;
}

/* ---------------------------------------------------------------- home --- */

function renderHome() {
  const view = $('#view');
  const done = ORDER.filter((cid) => state.status[cid] === 'done').length;
  const left = ORDER.filter((cid) => state.status[cid] !== 'done')
    .reduce((s, cid) => s + chapterMinutes(CONTENT[cid]), 0);
  const leftCore = ORDER.filter((cid) => state.status[cid] !== 'done')
    .reduce((s, cid) => s + chapterMinutes(CONTENT[cid], true), 0);
  const next = nextChapter();
  const nc = next ? CONTENT[next] : null;

  view.innerHTML = `<div class="home">
    <div class="home-head">
      <h1>Your path to the Google loop</h1>
      <p>Work top to bottom. Each chapter moves left to right: read it in <b>Learn</b>,
        go deeper in <b>Workshop</b>, write and run solutions in <b>Code</b>, then check
        yourself in <b>Quiz</b>. ${done} of ${ORDER.length} chapters done — about
        ${fmtMin(leftCore)} left on the core problems, ${fmtMin(left)} doing every one.</p>
    </div>
    ${nc ? `<div class="resume">
      <div class="what">
        <div class="eyebrow">${state.status[next] === 'started' ? 'Continue' : 'Start'} · ${esc(TOPIC_OF[next].title)}</div>
        <div class="title">${esc(nc.title)}</div>
        <div class="sub">${stageLine(nc)}</div>
      </div>
      <button class="primary" type="button" data-go="${next}">${state.status[next] === 'started' ? 'Continue' : 'Start'} →</button>
    </div>` : `<div class="resume"><div class="what"><div class="title">Every chapter is done.</div>
      <div class="sub">Revisit the Code stage — Random problem and New problem keep the practice going.</div></div></div>`}
    ${TOPICS.map((t) => {
      const s = topicSummary(t);
      return `<section class="topic-card">
        <header><h2>${esc(t.title)}</h2><span class="chip">${esc(levelLabel(t.level))}</span>
          <span class="tsum">${s.done} / ${s.total} chapters · ${s.left ? fmtMin(s.left) + ' left' : 'done'}</span></header>
        <p class="blurb">${esc(t.blurb)}</p>
        <div class="bar"><span style="width:${(100 * s.done / s.total).toFixed(0)}%"></span></div>
        ${t.chapters.map((cid) => {
          const c = CONTENT[cid];
          return `<a class="ch-row" href="#${cid}" data-go="${cid}">
            <span class="status ${state.status[cid] || ''}"></span>
            <span class="t">${esc(c.title)}</span>
            <span class="stages">${stageLine(c, true)}</span></a>`;
        }).join('')}
      </section>`;
    }).join('')}
  </div>`;

  $('#topbar-title').textContent = 'Your path';
}

function levelLabel(level) {
  return ({
    process: 'How it works', basic: 'In brief', core: 'Patterns', advanced: 'Zero to one',
    reference: 'Reference', behavioural: 'Behavioural',
  })[level] || level;
}

function stageLine(c, compact) {
  const parts = [];
  if (c.learn.length) parts.push([`Learn ${fmtMin(c.time.learn)}`, false]);
  if (c.workshop.length) parts.push([`Workshop ${fmtMin(c.time.workshop)}`, true]);
  if (c.exercises.length) parts.push([`Code ${c.exercises.length}`, false]);
  else if (CODING_TOPICS.has(c.topic)) parts.push(['Code', true]);
  if (c.quiz.length) parts.push([`Quiz ${c.quiz.length}`, true]);
  if (!compact) return parts.map(([s]) => s).join(' · ');
  // On a phone the optional parts (and their separators) drop out.
  return parts.map(([s, opt], i) => `<span${opt ? ' class="opt"' : ''}>${i ? '&nbsp;·&nbsp;' : ''}${s}</span>`).join('');
}

/* ------------------------------------------------------------- chapter --- */

function renderChapter() {
  const c = CONTENT[state.chapter];
  const t = TOPIC_OF[state.chapter];
  const stages = stagesOf(c);
  const view = $('#view');
  const wide = state.stage === 'code';
  const st = state.status[c.id];

  view.innerHTML = `<article class="chapter${wide ? ' wide' : ''}">
    <header class="ch-head">
      <div class="eyebrow">${esc(t.title)} · Chapter ${c.n}</div>
      <h1>${esc(c.title)}</h1>
    </header>
    <nav class="stages-strip" aria-label="Stages">
      ${stages.map(([k, label]) => `<button type="button" class="stage-tab${k === state.stage ? ' active' : ''}" data-stage="${k}">
        <span class="n">${label}</span><span class="m">${stageMeta(c, k)}</span></button>`).join('')}
      <span style="flex:1"></span>
      <button type="button" class="ghost small" id="toggle-done" title="Chapter status">${st === 'done' ? 'Done ✓' : 'Mark done'}</button>
    </nav>
    <div id="stage"></div>
  </article>`;

  $('#topbar-title').textContent = c.title;

  if (state.stage === 'learn' || state.stage === 'workshop') renderPager(c, state.stage);
  else if (state.stage === 'code') renderCode(c);
  else renderQuiz(c);
}

function stageMeta(c, k) {
  if (k === 'learn') return `${c.learn.length} screens · ${fmtMin(c.time.learn)}`;
  if (k === 'workshop') return `${c.workshop.length} screens · ${fmtMin(c.time.workshop)}`;
  if (k === 'code') {
    const solved = c.exercises.filter((e) => state.solved[e.id]).length;
    return c.exercises.length ? `${solved}/${c.exercises.length} solved` : 'AI problems';
  }
  const best = state.quizBest[c.id];
  return `${c.quiz.length} questions${best != null ? ` · best ${Math.round(best * 100)}%` : ''}`;
}

/* The stage after this one, or null at the end of the chapter. */
function nextStage(c, stage) {
  const ks = stagesOf(c).map(([k]) => k);
  const i = ks.indexOf(stage);
  return i >= 0 && i < ks.length - 1 ? ks[i + 1] : null;
}

function doneBox(c) {
  const i = ORDER.indexOf(c.id);
  const next = ORDER[i + 1];
  const isDone = state.status[c.id] === 'done';
  return `<div class="done-box">
    <p>${isDone ? 'This chapter is marked done.' : 'That’s the end of this chapter.'}</p>
    ${isDone ? '' : '<button class="primary" type="button" id="mark-done">Mark chapter done</button>'}
    ${next ? `<button type="button" data-go="${next}">Next: ${esc(CONTENT[next].title)} →</button>` : ''}
  </div>`;
}

// #mark-done and the done-box's [data-go] "Next" button are both handled by
// the delegated listener in init() — nothing to bind per node here.
function bindDoneBox() {}

/* ------------------------------------------------ learn / workshop pager --- */

/* Two ways to read a stage, the viewer's choice (remembered per device):
   screens — one section at a time, the default, less on screen at once;
   one page — every section of the stage in order, like the old book.
   Either way the "Jump to" menu reaches any section directly. */
function onePage() {
  try { return localStorage.getItem('ib:onepage') === '1'; } catch (_) { return false; }
}

function renderPager(c, stage) {
  const items = c[stage];
  const i = Math.min(state.index, items.length - 1);
  const whole = onePage();
  const root = $('#stage');
  const ns = nextStage(c, stage);
  const nsLabel = ns ? STAGES.find(([k]) => k === ns)[1] : null;
  const item = items[i];
  if (!whole) state.seen[`${c.id}.${stage}.${i}`] = true;

  const jump = `<label class="sr-only" for="jump">Jump to a section</label>
    <select id="jump" class="jump">${items.map((it, j) =>
      `<option value="${j}"${j === i ? ' selected' : ''}>${j + 1}. ${esc(it.title)} · ${fmtMin(it.min)}</option>`).join('')}</select>`;
  const modeBtn = `<button type="button" class="ghost small" id="mode">${whole ? 'Show as screens' : 'Show as one page'}</button>`;

  const stageEnd = ns
    ? `<button type="button" class="next primary" data-stage-go="${ns}"><span class="dir">Next stage →</span><span class="t">${nsLabel}</span></button>`
    : '';

  if (whole) {
    root.innerHTML = `
      <div class="pager-top">${jump}<span class="count">${items.length} sections · ${fmtMin(items.reduce((s, x) => s + x.min, 0))}</span><span style="flex:1"></span>${modeBtn}</div>
      ${items.map((it, j) => `<section class="doc${it.brief ? ' brief' : ''}" id="sec-${j}">${it.html}</section>${j < items.length - 1 ? '<hr class="sec-rule">' : ''}`).join('')}
      <div class="pager-nav">${stageEnd}</div>
      ${!ns ? doneBox(c) : ''}`;
  } else {
    const prev = i > 0 ? `<button type="button" data-i="${i - 1}"><span class="dir">← Previous</span><span class="t">${esc(items[i - 1].title)}</span></button>` : '';
    const next = i < items.length - 1
      ? `<button type="button" class="next" data-i="${i + 1}"><span class="dir">Next →</span><span class="t">${esc(items[i + 1].title)}</span></button>`
      : stageEnd;
    root.innerHTML = `
      <div class="pager-top">${jump}
        <span class="pager-steps">${items.map((it, j) => `<button type="button" aria-label="${esc(it.title)}" title="${esc(it.title)}"
          class="${j === i ? 'on' : state.seen[`${c.id}.${stage}.${j}`] ? 'seen' : ''}" data-i="${j}"></button>`).join('')}</span>
        <span style="flex:1"></span>${modeBtn}
      </div>
      <div class="doc${item.brief ? ' brief' : ''}" id="doc">${item.html}</div>
      <div class="pager-nav">${prev}${next}</div>
      ${!ns && i === items.length - 1 ? doneBox(c) : ''}`;
  }

  // #jump, #mode, [data-i], [data-stage-go] and a[data-nav] are all handled
  // by the delegated listeners in init().
  renderDiagrams(root);
}

// a[data-nav] (in-content chapter links) is handled by the delegated
// listener in init() — nothing to bind per node here.
function bindContentLinks() {}

/* ------------------------------------------------------------ diagrams --- */

const MERMAID_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.15.0/mermaid.min.js';
let mermaidLoad = null;

function loadMermaid() {
  if (mermaidLoad) return mermaidLoad;
  mermaidLoad = new Promise((resolve, reject) => {
    if (window.mermaid) return resolve(window.mermaid);
    const s = document.createElement('script');
    s.src = MERMAID_SRC;
    s.onload = () => resolve(window.mermaid);
    s.onerror = () => reject(new Error('mermaid unavailable'));
    document.head.appendChild(s);
  });
  return mermaidLoad;
}

function mermaidTheme() {
  const v = getComputedStyle(document.documentElement);
  const c = (name, fallback) => (v.getPropertyValue(name) || fallback).trim();
  const ink = c('--ink', '#1b1b19');
  const line = c('--line', '#e2e2dd');
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    fontFamily: 'inherit',
    theme: 'base',
    flowchart: { useMaxWidth: false, wrappingWidth: 400 },
    sequence: { useMaxWidth: false },
    state: { useMaxWidth: false },
    themeVariables: {
      background: c('--surface', '#fff'),
      primaryColor: c('--accent-soft', '#eeeafe'),
      primaryTextColor: ink,
      primaryBorderColor: c('--accent', '#6a4df0'),
      secondaryColor: c('--surface-2', '#f0f0ed'),
      tertiaryColor: c('--surface-2', '#f0f0ed'),
      lineColor: c('--muted', '#6e6e68'),
      textColor: c('--text', '#3a3a36'),
      mainBkg: c('--surface-2', '#f0f0ed'),
      nodeBorder: c('--accent', '#6a4df0'),
      clusterBkg: c('--surface', '#fff'),
      clusterBorder: line,
      actorBkg: c('--accent-soft', '#eeeafe'),
      actorBorder: c('--accent', '#6a4df0'),
      actorTextColor: ink,
      signalColor: c('--text', '#3a3a36'),
      signalTextColor: c('--text', '#3a3a36'),
      labelBoxBkg: c('--surface-2', '#f0f0ed'),
      labelBoxBorderColor: line,
      labelTextColor: ink,
      loopTextColor: c('--text', '#3a3a36'),
      noteBkgColor: c('--warn-soft', '#fcf0de'),
      noteBorderColor: c('--warn', '#a8620c'),
      noteTextColor: ink,
    },
  };
}

function pendingDiagrams(root) {
  return Array.from((root || document).querySelectorAll('pre.mermaid'))
    .filter((n) => !n.dataset.processed && !n.querySelector('svg'));
}

function renderDiagrams(root) {
  const nodes = pendingDiagrams(root);
  if (!nodes.length) return;
  nodes.forEach((n) => { if (!n.dataset.src) n.dataset.src = n.textContent; });
  loadMermaid().then((m) => {
    m.initialize(mermaidTheme());
    return m.run({ nodes: pendingDiagrams(root) });
  }).catch(() => { /* offline: the source stays readable as text */ });
}

function redrawDiagrams() {
  if (!window.mermaid) return;
  document.querySelectorAll('pre.mermaid').forEach((n) => {
    if (!n.dataset.src) return;
    n.textContent = n.dataset.src;
    delete n.dataset.processed;
    n.removeAttribute('data-processed');
  });
  renderDiagrams(document);
}

/* ================================================================ CODE === */

const TS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/typescript/5.6.3/typescript.min.js';
let tsLoad = null;

function loadTS() {
  if (tsLoad) return tsLoad;
  tsLoad = new Promise((resolve, reject) => {
    if (window.ts) return resolve(window.ts);
    const s = document.createElement('script');
    s.src = TS_SRC;
    s.onload = () => (window.ts ? resolve(window.ts) : reject(new Error('TypeScript failed to load')));
    s.onerror = () => { tsLoad = null; reject(new Error('Could not load the TypeScript compiler — check your connection and run again.')); };
    document.head.appendChild(s);
  });
  return tsLoad;
}

/* TS -> JS. Only syntax errors are reported (transpile, not a full type check),
   which is what a whiteboard-style round needs. `export` is stripped: the code
   runs as a plain script. */
function transpile(src) {
  const ts = window.ts;
  const out = ts.transpileModule(src.replace(/^(\s*)export\s+(default\s+)?/gm, '$1'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
    reportDiagnostics: true,
  });
  const diags = (out.diagnostics || []).map((d) => {
    const pos = d.file && d.start != null ? d.file.getLineAndCharacterOfPosition(d.start) : null;
    return { line: pos ? pos.line + 1 : null, msg: ts.flattenDiagnosticMessageText(d.messageText, '\n') };
  });
  return { js: out.outputText, diags };
}

/* The worker's source is built per run: the shared runner, then your code and
   the reference solution compiled in as plain script, then the harness. No
   eval anywhere — the page's content-security policy may forbid it, and blob
   workers are allowed. Your code runs inside a function so its top-level names
   can't collide with the runner's. */
const IDENT = /^[A-Za-z_$][\w$]*$/;

function workerSourceFor({ code, ref, name, cases }) {
  const runner = $('#runner-src').textContent;
  const gens = cases.map((c, i) => (c.gen ? `${i}: () => (${c.gen})` : null)).filter(Boolean).join(',\n');
  const load = (js) => `(function () {\n${js}\n;return typeof ${name} === 'function' ? ${name} : undefined;\n})()`;
  return `${runner}
;const __R = makeRunner();
self.ListNode = __R.ListNode;
self.TreeNode = __R.TreeNode;
const __logs = [];
const __fmt = (x) => { try { return typeof x === 'string' ? x : JSON.stringify(__R.norm(x)); } catch (_) { return String(x); } };
console.log = console.info = console.warn = console.error = (...a) => { if (__logs.length < 60) __logs.push(a.map(__fmt).join(' ')); };
let __fn, __ref = null, __err = null;
try { __fn = ${load(code)}; } catch (e) { __err = String((e && e.message) || e); }
${ref ? `try { __ref = ${load(ref)}; } catch (_) { __ref = null; }` : ''}
const __gens = {${gens}};
self.onmessage = (e) => {
  if (__err) { postMessage({ type: 'error', error: __err, logs: __logs }); return; }
  if (!__fn) { postMessage({ type: 'error', error: 'Define a function named ${name}.', logs: __logs }); return; }
  const cases = e.data.cases.map((c, i) => (c.gen ? Object.assign({}, c, { gen: __gens[i] }) : c));
  const results = __R.run(__fn, cases, Object.assign({}, e.data.opts, { ref: __ref }), (i) => postMessage({ type: 'start', i }));
  postMessage({ type: 'done', results, logs: __logs });
};`;
}

/* Run cases in a fresh worker with a watchdog. An infinite loop or an O(n²)
   solution on a large input can't freeze the page: the worker is terminated
   and the case it was on is reported as timed out. */
function runInWorker(payload, timeoutMs) {
  return new Promise((resolve) => {
    if (!IDENT.test(payload.name || '')) { resolve({ type: 'error', error: 'The problem names an invalid function.' }); return; }
    let current = -1;
    const url = URL.createObjectURL(new Blob([workerSourceFor(payload)], { type: 'text/javascript' }));
    const w = new Worker(url);
    const finish = (v) => { clearTimeout(timer); w.terminate(); URL.revokeObjectURL(url); resolve(v); };
    const timer = setTimeout(() => finish({ timedOutAt: current }), timeoutMs);
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'start') { current = m.i; return; }
      finish(m);
    };
    w.onerror = (e) => {
      e.preventDefault();
      finish({ type: 'error', error: (e.message || 'The code crashed before it could run.').replace(/^Uncaught /, '') });
    };
    w.postMessage({ cases: payload.cases, opts: payload.opts });
  });
}

/* Every problem the Code stage can show: the book's, and AI-generated ones. */
function allProblems() {
  const out = [];
  for (const cid of ORDER) for (const ex of CONTENT[cid].exercises) out.push({ ...ex, chapter: cid });
  for (const g of Object.values(state.generated)) out.push(g);
  return out;
}

function findProblem(id) {
  if (state.generated[id]) return state.generated[id];
  for (const cid of ORDER) {
    const ex = CONTENT[cid].exercises.find((e) => e.id === id);
    if (ex) return { ...ex, chapter: cid };
  }
  return null;
}

function chapterProblems(cid) {
  const book = CONTENT[cid].exercises.map((e) => ({ ...e, chapter: cid }));
  book.sort((a, b) => (b.core - a.core));
  const gen = Object.values(state.generated).filter((g) => g.chapter === cid)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return { book, gen };
}

function defaultCode() {
  return {
    exId: null, random: false, hideTopic: false, filter: 'all', scope: 'chapter', diff: 'medium',
    hint: 0, nudge: null, results: null, running: false, review: null, reviewing: false,
    solutionStep: 0, generating: false, genNote: '', error: null,
  };
}

let editor = null;
let draftTimer = null;

function renderCode(c) {
  if (!state.code) state.code = defaultCode();
  const s = state.code;
  if (pendingEx) { s.exId = pendingEx; s.random = false; pendingEx = null; }
  const { book, gen } = chapterProblems(c.id);
  const filtered = book.filter((p) => s.filter === 'all' ? true
    : s.filter === 'core' ? p.core : s.filter === 'scaler' ? p.source === 'scaler' : !state.solved[p.id]);
  if (!s.exId || !findProblem(s.exId)) {
    const first = book.find((p) => !state.solved[p.id]) || book[0] || gen[0];
    s.exId = first ? first.id : null;
  }
  const p = s.exId ? findProblem(s.exId) : null;
  const root = $('#stage');

  const item = (q) => `<li><button type="button" class="${q.id === s.exId && !s.random ? 'on' : ''}" data-ex="${q.id}">
      <span class="tick${state.solved[q.id] ? ' solved' : ''}"></span>
      <span><span class="pt">${esc(q.title)}</span>
        <span class="pm"><span class="chip ${q.level}">${q.level}</span>${q.core ? '<span class="chip core">core</span>' : ''}${q.source === 'scaler' ? '<span class="chip">scaler</span>' : ''}</span></span>
    </button></li>`;

  root.innerHTML = `<div class="code-layout">
    <aside class="plist">
      <div class="plist-head">
        <div class="row filters">${['all', 'core', 'unsolved', 'scaler'].map((f) =>
          `<button type="button" class="${s.filter === f ? 'on' : ''}" data-filter="${f}">${f}</button>`).join('')}</div>
        <div class="row">
          <label class="sr-only" for="rand-scope">Random from</label>
          <select id="rand-scope">
            ${[['chapter', 'This chapter'], ['topic', 'This topic'], ['coding', 'All coding'], ['scaler', 'Scaler set']].map(([v, l]) =>
              `<option value="${v}"${s.scope === v ? ' selected' : ''}>${l}</option>`).join('')}
          </select>
          <button type="button" class="small" id="rand">Random problem</button>
        </div>
        <div class="row" id="gen-row"${sample ? '' : ' hidden'}>
          <label class="sr-only" for="gen-diff">Difficulty</label>
          <select id="gen-diff">${['easy', 'medium', 'hard'].map((d) => `<option${s.diff === d ? ' selected' : ''}>${d}</option>`).join('')}</select>
          <button type="button" class="small" id="gen" ${s.generating ? 'disabled' : ''}>${s.generating ? 'Writing a problem…' : 'New problem (AI)'}</button>
        </div>
        ${s.genNote ? `<div class="note${s.genNote.startsWith('!') ? ' err-text' : ''}">${esc(s.genNote.replace(/^!/, ''))}</div>` : ''}
      </div>
      <ul>
        ${filtered.map(item).join('') || (book.length ? '<li class="note" style="padding:8px">Nothing matches this filter.</li>' : '<li class="note" style="padding:8px">No book problems here yet — generate one with AI.</li>')}
        ${gen.length ? `<li class="gen-label">Generated for you</li>${gen.map(item).join('')}` : ''}
      </ul>
    </aside>
    <section class="problem" id="problem">${p ? problemHtml(p) : '<p class="note">Pick a problem.</p>'}</section>
  </div>
  ${nextStage(c, 'code') ? `<div class="pager-nav"><button type="button" class="next primary" data-stage-go="${nextStage(c, 'code')}"><span class="dir">Next stage →</span><span class="t">${STAGES.find(([k]) => k === nextStage(c, 'code'))[1]}</span></button></div>` : doneBox(c)}`;

  // [data-filter], [data-ex], #rand-scope, #rand, #gen-diff, #gen and
  // [data-stage-go] are all handled by the delegated listeners in init().
  if (p) mountProblem(c, p);
}

function selectProblem(c, id, random) {
  const s = state.code;
  s.exId = id; s.random = random; s.hideTopic = random;
  s.hint = 0; s.nudge = null; s.results = null; s.review = null; s.solutionStep = 0; s.error = null;
  renderCode(c);
  const pr = $('#problem');
  if (pr && window.innerWidth < 1100) pr.scrollIntoView({ block: 'start' });
}

function randomProblem(c) {
  const s = state.code;
  const pool = allProblems().filter((p) => {
    if (s.scope === 'chapter') return p.chapter === c.id;
    if (s.scope === 'topic') return TOPIC_OF[p.chapter] && TOPIC_OF[p.chapter].id === c.topic;
    if (s.scope === 'scaler') return p.source === 'scaler';
    return CODING_TOPICS.has(CONTENT[p.chapter] ? CONTENT[p.chapter].topic : '');
  });
  if (!pool.length) { s.genNote = '!Nothing in that scope yet.'; renderCode(c); return; }
  const unsolved = pool.filter((p) => !state.solved[p.id] && p.id !== s.exId);
  const from = unsolved.length ? unsolved : pool;
  const pick = from[Math.floor(Math.random() * from.length)];
  s.genNote = '';
  selectProblem(c, pick.id, true);
}

function problemHtml(p) {
  const s = state.code;
  const statement = p.statement || mdLite(p.statementMd || '');
  const where = CONTENT[p.chapter] ? CONTENT[p.chapter].title : '';
  const topicShown = !s.hideTopic || s.hint > 0;
  return `
    <div class="problem-head">
      <h2>${esc(p.title)}</h2>
      <span class="chip ${p.level}">${p.level}</span>
      ${p.core ? '<span class="chip core">core</span>' : ''}
      ${p.source === 'ai' ? '<span class="chip">AI-generated</span>' : ''}
      ${s.random ? `<span class="chip">random${topicShown && where ? ' · ' + esc(where) : ''}</span>` : ''}
    </div>
    <div class="doc">${statement}</div>
    ${s.hint > 0 ? `<div class="hint-box"><b>Topic:</b> ${esc(p.topic)} — ${esc(p.hint)}${s.nudge ? `<br><b>Nudge:</b> ${esc(s.nudge)}` : ''}</div>` : ''}
    <div class="editor-wrap">
      <div class="editor-bar"><span class="sig">${esc(p.signature)}</span>
        <button type="button" class="ghost small" id="reset-code" title="Start over from the empty function">Reset</button></div>
      <div id="editor"></div>
      <div class="editor-actions">
        <button type="button" class="primary" id="run" ${s.running ? 'disabled' : ''}>${s.running ? 'Running…' : 'Run tests'}</button>
        <button type="button" id="review" ${sample ? '' : 'hidden'} ${s.reviewing || !s.results ? 'disabled' : ''}
          title="${s.results ? 'AI proposes edge cases; the page runs them' : 'Run your code first'}">${s.reviewing ? 'Reviewing…' : 'Check with AI'}</button>
        <button type="button" id="hint">${s.hint === 0 ? 'Hint' : s.hint === 1 && sample ? 'Nudge me (AI)' : 'Hint shown'}</button>
        <span class="spacer"></span>
        <button type="button" class="ghost" id="solution">${s.solutionStep === 0 ? 'Show solution' : s.solutionStep === 1 ? 'Sure? I’ve attempted it' : 'Hide solution'}</button>
      </div>
    </div>
    <div id="results">${resultsHtml()}</div>
    <div id="review-out">${reviewHtml()}</div>
    ${s.solutionStep === 2 ? `<div class="solution"><h3>Reference solution</h3><pre>${esc(p.solution)}</pre></div>` : ''}`;
}

function mountProblem(c, p) {
  const s = state.code;
  const key = 'ib:draft:' + p.id;
  let initial = p.starter || starterFor(p);
  try { initial = localStorage.getItem(key) || initial; } catch (_) {}
  const host = $('#editor');
  if (window.CodeMirror) {
    editor = window.CodeMirror(host, {
      value: initial, mode: 'text/typescript', lineNumbers: true, indentUnit: 2, tabSize: 2,
      matchBrackets: true, autoCloseBrackets: true, viewportMargin: Infinity,
      extraKeys: { 'Ctrl-Enter': () => runCode(c, p), 'Cmd-Enter': () => runCode(c, p), Tab: (cm) => cm.replaceSelection('  ') },
    });
    editor.on('change', () => {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => { try { localStorage.setItem(key, editor.getValue()); } catch (_) {} }, 400);
    });
  } else {
    // CodeMirror didn't load (offline, blocked): a plain textarea still works.
    const ta = el('textarea', 'fallback-editor');
    ta.id = 'code-fallback';
    ta.spellcheck = false;
    ta.value = initial;
    host.appendChild(ta);
    editor = { getValue: () => ta.value, setValue: (v) => { ta.value = v; }, refresh() {} };
    ta.oninput = () => { try { localStorage.setItem(key, ta.value); } catch (_) {} };
  }

  // #run, #review, #hint, #solution and #reset-code are all handled by the
  // delegated listener in init().
}

/* Re-render the problem pane while keeping what's in the editor. */
function refreshProblem(c, p) {
  const code = editor ? editor.getValue() : null;
  $('#problem').innerHTML = problemHtml(p);
  mountProblem(c, p);
  if (code != null) editor.setValue(code);
}

function starterFor(p) {
  const sig = p.signature || `${p.fn}()`;
  const i = sig.indexOf(')');
  return `function ${sig.slice(0, i + 1)}${sig.slice(i + 1)} {\n  \n}\n`;
}

async function compileBoth(p) {
  await loadTS();
  const mine = transpile(editor.getValue());
  if (!p._refJs) p._refJs = transpile(p.solution).js;
  return { mine, ref: p._refJs };
}

async function runCode(c, p) {
  const s = state.code;
  if (s.running) return;
  s.running = true; s.review = null; s.error = null; s.results = null;
  $('#run').disabled = true; $('#run').textContent = 'Running…';
  $('#results').innerHTML = `<p class="thinking">${window.ts ? 'Running your code…' : 'Loading the TypeScript compiler (first run only)…'}</p>`;
  try {
    const { mine, ref } = await compileBoth(p);
    if (mine.diags.length) {
      s.results = { compile: mine.diags };
    } else {
      const opts = { adapter: p.adapter, check: p.check, compare: p.compare };
      const normal = p.tests.filter((t) => !t.perf);
      const perf = p.tests.filter((t) => t.perf);
      const r1 = await runInWorker({ code: mine.js, ref, name: p.fn, cases: normal, opts }, 4000);
      let results = r1.results || [];
      let logs = r1.logs || [];
      if (r1.timedOutAt != null) {
        results = [{ i: Math.max(0, r1.timedOutAt), pass: false, timeout: true, args: normal[Math.max(0, r1.timedOutAt)] ? normal[Math.max(0, r1.timedOutAt)].args : null }];
      } else if (r1.type === 'error') {
        s.results = { error: r1.error, logs };
      }
      if (!s.results && perf.length && results.length && results.every((r) => r.pass)) {
        const r2 = await runInWorker({ code: mine.js, ref, name: p.fn, cases: perf, opts }, 4000);
        if (r2.timedOutAt != null) results.push({ perf: true, pass: false, timeout: true, label: perf[Math.max(0, r2.timedOutAt)].label });
        else results = results.concat(r2.results || []);
      }
      if (!s.results) s.results = { cases: results, logs, total: normal.length + perf.length };
      if (s.results.cases && s.results.cases.length && s.results.cases.every((r) => r.pass || r.skipped)
          && s.results.cases.length >= normal.length) {
        markSolved(p.id);
      }
    }
  } catch (e) {
    s.results = { error: e.message || String(e) };
  }
  s.running = false;
  refreshProblem(c, p);
  const sm = document.querySelector('.stage-tab.active .m');
  if (sm) sm.textContent = stageMeta(c, 'code');
  renderListTicks(c);
}

function renderListTicks() {
  document.querySelectorAll('.plist [data-ex]').forEach((b) => {
    const t = b.querySelector('.tick');
    if (t) t.classList.toggle('solved', !!state.solved[b.dataset.ex]);
  });
}

const show = (v) => {
  let t;
  try { t = JSON.stringify(v); } catch (_) { t = String(v); }
  if (t === undefined) t = 'undefined';
  return esc(t.length > 400 ? t.slice(0, 400) + ' …' : t);
};
const showArgs = (args) => (args ? args.map(show).join(', ') : '<i>generated input</i>');

function resultsHtml() {
  const s = state.code;
  const r = s && s.results;
  if (!r) return '';
  if (r.compile) {
    return `<div class="results"><div class="results-head"><span class="verdict fail">Doesn’t compile</span></div>
      ${r.compile.map((d) => `<div class="case fail"><div class="row"><span class="k">${d.line ? 'Line ' + d.line : 'Syntax'}</span><code>${esc(d.msg)}</code></div></div>`).join('')}</div>`;
  }
  if (r.error) {
    return `<div class="results"><div class="results-head"><span class="verdict fail">Error</span></div>
      <div class="case fail"><code>${esc(r.error)}</code></div>${logsHtml(r.logs)}</div>`;
  }
  const cases = r.cases || [];
  const failed = cases.filter((x) => !x.pass && !x.skipped);
  const passed = cases.filter((x) => x.pass);
  const verdict = failed.length === 0
    ? `<span class="verdict pass">All ${passed.length} tests pass</span>`
    : `<span class="verdict fail">${failed.length} of ${cases.length} tests fail</span>`;
  const one = (x) => {
    if (x.timeout) {
      return `<div class="case fail"><div class="row"><span class="k">${x.perf ? 'Large input' : 'Test ' + (x.i + 1)}</span>
        <span>Timed out — ${x.perf ? `too slow on ${esc(x.label || 'the large input')}. Check your complexity.` : 'an infinite loop, or far too slow.'}</span></div>
        ${x.args ? `<div class="row"><span class="k">Input</span><code>${showArgs(x.args)}</code></div>` : ''}</div>`;
    }
    const head = x.perf ? `Large input${x.label ? ' · ' + esc(x.label) : ''}` : `Test ${x.i + 1}${x.label ? ' · ' + esc(x.label) : ''}`;
    return `<div class="case ${x.pass ? 'pass' : 'fail'}">
      <div class="row"><span class="k">${head}</span><span>${x.pass ? `pass${x.perf ? ` · ${Math.round(x.ms)} ms` : ''}` : 'fail'}</span></div>
      ${!x.perf ? `<div class="row"><span class="k">Input</span><code>${showArgs(x.args)}</code></div>` : ''}
      ${x.pass ? '' : `<div class="row"><span class="k">Expected</span><code>${show(x.expected)}</code></div>
        <div class="row"><span class="k">${x.error ? 'Threw' : 'Got'}</span><code>${x.error ? esc(x.error) : show(x.actual)}</code></div>`}
    </div>`;
  };
  return `<div class="results"><div class="results-head">${verdict}<span class="note">Ctrl/⌘ + Enter runs again</span></div>
    ${failed.map(one).join('')}${passed.map(one).join('')}${logsHtml(r.logs)}</div>`;
}

function logsHtml(logs) {
  return logs && logs.length ? `<div class="section-label note" style="margin-top:10px">console output</div><div class="logs">${esc(logs.join('\n'))}</div>` : '';
}

/* ------------------------------------------------ AI: review and nudges --- */

function numbered(code) {
  return code.split('\n').map((l, i) => `${String(i + 1).padStart(3)}| ${l}`).join('\n');
}

function problemText(p) {
  return `${p.title}\n\n${plain(p.statement || mdLite(p.statementMd || '')).slice(0, 2500)}\n\nFunction: ${p.signature}`;
}

function resultsText() {
  const r = state.code.results;
  if (!r) return 'Not run.';
  if (r.compile) return 'Does not compile: ' + r.compile.map((d) => d.msg).join('; ');
  if (r.error) return 'Runtime error: ' + r.error;
  return (r.cases || []).map((x) => `${x.pass ? 'PASS' : 'FAIL'} ${x.perf ? 'large input' : 'input ' + JSON.stringify(x.args)}${x.pass ? '' : ` expected ${JSON.stringify(x.expected)} got ${x.error ? 'error ' + x.error : JSON.stringify(x.actual)}`}${x.timeout ? ' (timed out)' : ''}`)
    .join('\n').slice(0, 3000);
}

const NO_CODE = s => String(s || '').replace(/```[\s\S]*?```/g, '[code removed]');

async function reviewCode(c, p) {
  const s = state.code;
  if (!sample || s.reviewing) return;
  s.reviewing = true; s.review = { pending: true };
  refreshProblem(c, p);
  const prompt = [
    'You review a candidate\'s TypeScript solution in an interview-practice tool.',
    'HARD RULES: never write corrected code or code snippets; never quote or paraphrase the reference solution. Point at concepts and line numbers only.',
    '',
    'PROBLEM:', problemText(p),
    '',
    'CANDIDATE CODE (line-numbered):', numbered(editor.getValue()).slice(0, 8000),
    '',
    'TEST RESULTS SO FAR:', resultsText(),
    '',
    'REFERENCE SOLUTION — for your analysis only, never reveal it:', p.solution.slice(0, 4000),
    '',
    'Reply with only JSON of this shape:',
    '{"edgeCases":[{"args":[...],"why":"one line"}],"complexity":{"yours":"O(..) time, O(..) space","target":"O(..) time, O(..) space","note":"one line"},"issues":[{"line":3,"note":"one line"}],"summary":"one or two sentences"}',
    'edgeCases: 5-8 small inputs (at most 20 elements each) most likely to break THIS code — empty, one element, duplicates, negatives, extremes, sorted/reversed, all-equal — each a JSON array of the function\'s arguments in order, valid under the problem\'s constraints. For a linked-list argument give a plain array.',
    'issues: real bugs or risky lines only; empty list if none.',
  ].join('\n');
  try {
    const res = await sample.json(prompt, { modelTier: 'default' });
    const cases = (Array.isArray(res.edgeCases) ? res.edgeCases : [])
      .filter((e) => e && Array.isArray(e.args)).slice(0, 8)
      .map((e) => ({ args: e.args, fromRef: true, label: String(e.why || '').slice(0, 160) }));
    let ran = [];
    if (cases.length) {
      const { mine, ref } = await compileBoth(p);
      if (!mine.diags.length) {
        const out = await runInWorker({ code: mine.js, ref, name: p.fn, cases, opts: { adapter: p.adapter, check: p.check, compare: p.compare } }, 4000);
        ran = out.results || (out.timedOutAt != null ? [{ i: out.timedOutAt, pass: false, timeout: true, args: cases[out.timedOutAt] && cases[out.timedOutAt].args, label: cases[out.timedOutAt] && cases[out.timedOutAt].label }] : []);
      }
    }
    s.review = {
      ran,
      complexity: res.complexity || null,
      issues: Array.isArray(res.issues) ? res.issues.slice(0, 6) : [],
      summary: NO_CODE(res.summary),
    };
  } catch (e) {
    s.review = { error: e && e.code === 'not_granted' ? 'AI review isn’t available in this view.'
      : e && e.code === 'rate_limited' ? 'Rate limited — wait a moment, then try again.'
      : 'The review didn’t come back in a usable shape. Try again.' };
  }
  s.reviewing = false;
  refreshProblem(c, p);
}

function reviewHtml() {
  const s = state.code;
  const r = s && s.review;
  if (!r) return '';
  if (r.pending) return '<div class="review"><p class="thinking">Claude is reading your code and choosing edge cases… (usually 10–40 s)</p></div>';
  if (r.error) return `<div class="review"><p class="err-text">${esc(r.error)}</p></div>`;
  const fails = r.ran.filter((x) => !x.pass && !x.skipped);
  const held = r.ran.filter((x) => x.pass);
  const skipped = r.ran.filter((x) => x.skipped);
  const caseRow = (x) => `<div class="case ${x.pass ? 'pass' : x.skipped ? 'skip' : 'fail'}">
      <div class="row"><span class="k">Input</span><code>${showArgs(x.args)}</code></div>
      ${x.pass || x.skipped ? '' : `<div class="row"><span class="k">Expected</span><code>${show(x.expected)}</code></div>
        <div class="row"><span class="k">${x.error ? 'Threw' : x.timeout ? 'Result' : 'Got'}</span><code>${x.timeout ? 'timed out' : x.error ? esc(x.error) : show(x.actual)}</code></div>`}
      ${x.label ? `<div class="why">${esc(x.label)}</div>` : ''}</div>`;
  return `<div class="review">
    <h3>AI review</h3>
    ${r.summary ? `<p>${esc(r.summary)}</p>` : ''}
    <div class="section-label">Edge cases, actually run against your code</div>
    ${fails.length ? `<p class="err-text">${fails.length} of them break your code:</p>${fails.map(caseRow).join('')}` : r.ran.length ? '<p class="verdict pass">Your code handled every edge case Claude tried.</p>' : '<p class="note">No edge cases could be run.</p>'}
    ${held.length ? `<details><summary>${held.length} held up</summary>${held.map(caseRow).join('')}</details>` : ''}
    ${skipped.length ? `<p class="note">${skipped.length} proposed input(s) were outside the problem’s constraints and were skipped.</p>` : ''}
    ${r.complexity ? `<div class="section-label">Complexity</div>
      <p>Yours: <b>${esc(r.complexity.yours || '?')}</b> · Target: <b>${esc(r.complexity.target || '?')}</b>${r.complexity.note ? `<br><span class="note">${esc(NO_CODE(r.complexity.note))}</span>` : ''}</p>` : ''}
    ${r.issues.length ? `<div class="section-label">Worth a look</div><ul>${r.issues.map((i) =>
      `<li>${i.line ? `<b>Line ${esc(i.line)}:</b> ` : ''}${esc(NO_CODE(i.note))}</li>`).join('')}</ul>` : ''}
  </div>`;
}

async function nudge(c, p) {
  const s = state.code;
  $('#hint').disabled = true; $('#hint').textContent = 'Thinking…';
  try {
    const res = await sample.json([
      'A candidate is stuck on this interview problem. Give ONE nudge of at most two sentences about their current approach.',
      'Never write code, never state the full algorithm, never give the answer. Refer to their line numbers if useful.',
      '', 'PROBLEM:', problemText(p), '', 'THEIR CODE:', numbered(editor.getValue()).slice(0, 6000),
      '', 'RESULTS:', resultsText(),
      '', 'Reply with only JSON: {"nudge": "..."}',
    ].join('\n'), { modelTier: 'default' });
    s.nudge = NO_CODE(res && res.nudge).slice(0, 400) || null;
  } catch (e) {
    s.nudge = e && e.code === 'rate_limited' ? 'Rate limited — try again in a moment.' : null;
  }
  s.hint = 2;
  refreshProblem(c, p);
}

/* --------------------------------------------- AI: generating problems --- */

async function generateProblem(c) {
  const s = state.code;
  if (!sample || s.generating) return;
  s.generating = true; s.genNote = 'Writing a problem and checking its tests… (usually 20–60 s)';
  renderCode(c);
  const existing = allProblems().filter((p) => p.chapter === c.id).map((p) => p.title).slice(0, 60);
  const patterns = c.learn.map((x) => x.title).filter((t) => !/^(introduction|in brief|glossary)/i.test(t)).join('; ');
  const level = { easy: 'foundation', medium: 'intermediate', hard: 'senior' }[s.diff];
  const prompt = [
    `Write ONE new coding-interview practice problem for the chapter "${c.title}" (topic: ${TOPIC_OF[c.id].title}).`,
    `Techniques this chapter teaches: ${patterns || c.title}.`,
    `Difficulty: ${s.diff} (${level}). It must not duplicate any of: ${existing.join(' | ') || 'none'}.`,
    '',
    'Reply with only JSON of this shape:',
    '{"title":"...","statement":"markdown: the task, constraints, and one worked example",',
    ' "fn":"camelCaseName","signature":"camelCaseName(nums: number[], k: number): number",',
    ' "topic":"the technique, e.g. prefix sums","hint":"one line nudging toward the technique — not the solution",',
    ' "tests":[{"args":[[1,2,3],2],"expected":3}],',
    ' "solution":"a correct TypeScript function named fn — no imports, no classes, no top-level code other than the function(s)"}',
    'Rules: the function takes and returns plain JSON values (numbers, strings, booleans, arrays, plain objects) and returns its answer (no in-place-only results).',
    '10 tests: typical cases plus edge cases (empty, single element, duplicates, negatives where allowed). "args" is the array of the function\'s arguments in order. Keep inputs small.',
  ].join('\n');

  let saved = null;
  let lastProblem = '';
  for (let attempt = 0; attempt < 3 && !saved; attempt++) {
    try {
      const g = await sample.json(prompt + (attempt ? `\n\n(A previous attempt was rejected: ${lastProblem}. Double-check every expected value.)` : ''),
        { modelTier: 'default', cache: false });
      if (!g || !g.title || !g.fn || !g.solution || !Array.isArray(g.tests)) { lastProblem = 'fields were missing'; continue; }
      await loadTS();
      const ref = transpile(String(g.solution));
      if (ref.diags.length) { lastProblem = 'the solution did not compile'; continue; }
      const tests = g.tests.filter((t) => t && Array.isArray(t.args) && 'expected' in t).slice(0, 14);
      // Validate: the hidden reference must agree with every test we keep.
      const out = await runInWorker({ code: ref.js, ref: null, name: String(g.fn), cases: tests, opts: {} }, 4000);
      const kept = (out.results || []).filter((r) => r.pass).map((r) => tests[r.i]);
      if (kept.length < 5) { lastProblem = `only ${kept.length} tests matched the reference solution`; continue; }
      const id = `gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      saved = {
        id, chapter: c.id, source: 'ai', title: String(g.title).slice(0, 120),
        statementMd: String(g.statement || '').slice(0, 6000), fn: String(g.fn),
        signature: String(g.signature || g.fn + '()').slice(0, 300),
        topic: String(g.topic || c.title).slice(0, 120), hint: String(g.hint || '').slice(0, 300),
        tests: kept, solution: String(g.solution).slice(0, 12000), level, createdAt: Date.now(), solved: false,
      };
      saved.starter = starterFor(saved);
    } catch (e) {
      if (e && (e.code === 'not_granted' || e.code === 'rate_limited')) {
        s.genNote = e.code === 'not_granted' ? '!AI generation isn’t available in this view.' : '!Rate limited — wait a moment, then try again.';
        s.generating = false; renderCode(c); return;
      }
      lastProblem = 'the reply was not valid JSON';
    }
  }
  s.generating = false;
  if (!saved) { s.genNote = `!Couldn’t produce a problem whose tests checked out (${lastProblem}). Try again.`; renderCode(c); return; }
  state.generated[saved.id] = saved;
  saveLocal();
  dbSet(`generated/${saved.id}`, saved);
  s.genNote = `New problem ready — ${saved.tests.length} tests, each checked against a hidden reference solution.`;
  selectProblem(c, saved.id, false);
}

/* ================================================================ QUIZ === */

function renderQuiz(c) {
  if (!state.quiz || state.quiz.cid !== c.id) state.quiz = newQuiz(c, c.quiz.map((_, i) => i));
  const q = state.quiz;
  const root = $('#stage');

  if (q.finished) {
    const right = q.order.filter((i) => q.answers[i] && q.answers[i].right).length;
    const missed = q.order.filter((i) => !(q.answers[i] && q.answers[i].right));
    const scoreFull = q.order.length === c.quiz.length ? right / c.quiz.length : null;
    if (scoreFull != null && (state.quizBest[c.id] == null || scoreFull > state.quizBest[c.id])) {
      state.quizBest[c.id] = scoreFull;
      saveLocal();
      dbSet(`quiz/${c.id}`, { best: scoreFull, at: Date.now() });
    }
    root.innerHTML = `<div class="quiz">
      <div class="score">${right} / ${q.order.length}</div>
      <p>${right === q.order.length ? 'Every one right.' : `${missed.length} to revisit — the “why” lines are the part to remember.`}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${missed.length ? '<button type="button" class="primary" id="retry-missed">Retry the ones I missed</button>' : ''}
        <button type="button" id="restart">Start the quiz again</button>
      </div>
      ${doneBox(c)}
    </div>`;
    // #retry-missed and #restart are handled by the delegated listener in init().
    return;
  }

  const idx = q.order[q.pos];
  const m = c.quiz[idx];
  const a = q.answers[idx];
  const perm = q.perm[idx];                 // display position -> original option index
  const letters = 'ABCDEFGH';
  root.innerHTML = `<div class="quiz">
    <div class="pager-top"><span class="count">Question ${q.pos + 1} of ${q.order.length}</span>
      <span class="pager-steps">${q.order.map((i, j) => `<button type="button" tabindex="-1" aria-hidden="true" class="${j === q.pos ? 'on' : q.answers[i] ? 'seen' : ''}"></button>`).join('')}</span></div>
    <div class="mcq-q">${inlineMd(m.q)}</div>
    ${m.multi && !a ? '<p class="note">Select every correct option, then check.</p>' : ''}
    <div class="mcq-opts">${perm.map((i, pos) => {
      let cls = '';
      if (a) cls = m.correct.includes(i) ? 'right' : a.picked.includes(i) ? 'wrong' : '';
      else if (q.multiPick && q.multiPick.includes(i)) cls = 'picked';
      return `<button type="button" class="mcq-opt ${cls}" data-o="${i}" ${a ? 'disabled' : ''}><span class="k">${letters[pos]}</span><span>${inlineMd(m.options[i])}</span></button>`;
    }).join('')}</div>
    ${m.multi && !a ? '<div style="margin-top:12px"><button type="button" class="primary" id="check-multi">Check</button></div>' : ''}
    ${a ? `<div class="mcq-why"><b>${a.right ? 'Right.' : 'Not quite.'}</b> ${inlineMd(m.why)}</div>
      <div class="pager-nav"><button type="button" class="next primary" id="q-next"><span class="dir">${q.pos < q.order.length - 1 ? 'Next →' : 'Finish'}</span><span class="t">${q.pos < q.order.length - 1 ? 'Next question' : 'See your score'}</span></button></div>` : ''}
  </div>`;

  // [data-o], #check-multi and #q-next are all handled by the delegated
  // listener in init() (see answerQuiz() there).
}

/* Shared by the [data-o] and #check-multi cases in the delegated click
   listener — kept here, by the quiz's own state shape, rather than inlined. */
function answerQuiz(c, picked) {
  const q = state.quiz;
  const idx = q.order[q.pos];
  const m = c.quiz[idx];
  const right = picked.length === m.correct.length && picked.every((x) => m.correct.includes(x));
  q.answers[idx] = { picked, right };
  q.multiPick = null;
  renderQuiz(c);
}

/* Options are shuffled per attempt, so the right answer's position teaches
   nothing — and "Retry the ones I missed" doesn't replay the same letters. */
function newQuiz(c, order) {
  const perm = {};
  for (const i of order) {
    const p = c.quiz[i].options.map((_, j) => j);
    for (let k = p.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [p[k], p[r]] = [p[r], p[k]]; }
    perm[i] = p;
  }
  return { cid: c.id, order, perm, pos: 0, answers: {}, finished: false };
}

function inlineMd(t) {
  return esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

/* ============================================================== SEARCH === */

let SECTIONS = null;
let LAST_SEARCH_HITS = [];   // read by the delegated [data-k] click handler in init()
function sectionIndex() {
  if (SECTIONS) return SECTIONS;
  SECTIONS = [];
  for (const cid of ORDER) {
    const c = CONTENT[cid];
    for (const stage of ['learn', 'workshop']) {
      c[stage].forEach((s, i) => SECTIONS.push({ cid, stage, i, title: s.title, text: plain(s.html) }));
    }
    c.exercises.forEach((e) => SECTIONS.push({ cid, stage: 'code', ex: e.id, title: 'Problem: ' + e.title, text: plain(e.statement) }));
  }
  return SECTIONS;
}

function renderSearch() {
  const q = state.query.toLowerCase();
  const terms = q.split(/\s+/).filter((w) => w.length > 1);
  const hits = sectionIndex().map((s) => {
    const hay = (s.title + ' ' + s.text).toLowerCase();
    if (!terms.every((t) => hay.includes(t))) return null;
    const score = terms.reduce((n, t) => n + (s.title.toLowerCase().includes(t) ? 5 : 0) + (CONTENT[s.cid].title.toLowerCase().includes(t) ? 2 : 0), 0);
    return { ...s, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 60);

  const snip = (text) => {
    const i = text.toLowerCase().indexOf(terms[0]);
    const s = text.slice(Math.max(0, i - 70), i + 160);
    let h = esc(s);
    for (const t of terms) h = h.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`);
    return (i > 70 ? '…' : '') + h + '…';
  };
  $('#view').innerHTML = `<div class="home"><div class="home-head"><h1>“${esc(state.query)}”</h1>
    <p>${hits.length ? `${hits.length}${hits.length === 60 ? '+' : ''} places in the book` : 'Nothing matches every word. Try fewer words.'}</p></div>
    ${hits.map((h, k) => `<a class="result" href="#" data-k="${k}"><div class="rt">${esc(h.title)}</div>
      <div class="rp">${esc(TOPIC_OF[h.cid].title)} › ${esc(CONTENT[h.cid].title)} › ${h.stage}</div>
      <div class="rs">${snip(h.text)}</div></a>`).join('')}</div>`;
  // [data-k] is handled by the delegated listener in init(), which reads
  // this same array by index.
  LAST_SEARCH_HITS = hits;
  $('#topbar-title').textContent = 'Search';
}

/* ================================================================= ASK === */

const ask = { open: false, turns: [], busy: false };

let SEARCH_TEXT = null;
function searchText() {
  if (SEARCH_TEXT) return SEARCH_TEXT;
  SEARCH_TEXT = {};
  for (const id of ORDER) {
    const c = CONTENT[id];
    SEARCH_TEXT[id] = plain(c.learn.concat(c.workshop).map((s) => s.html).join(' '));
  }
  return SEARCH_TEXT;
}

/* Retrieval index: prose passages (~500 chars, sentence-bounded) plus the
   book's question/answer pairs, which are weighted above prose — a written
   answer to exactly the question beats any chunk. */
let PASSAGES = null;
function passages() {
  if (PASSAGES) return PASSAGES;
  PASSAGES = [];
  const text = searchText();
  for (const id of ORDER) {
    const sents = text[id].split(/(?<=[.!?])\s+/);
    let buf = [], len = 0;
    for (const s of sents) {
      buf.push(s); len += s.length + 1;
      if (len > 500) {
        PASSAGES.push({ kind: 'prose', id, text: buf.join(' ').trim() });
        buf = buf.slice(-1); len = buf[0] ? buf[0].length : 0;
      }
    }
    if (buf.length) PASSAGES.push({ kind: 'prose', id, text: buf.join(' ').trim() });
  }
  for (const q of QUESTIONS) {
    if (!CONTENT[q.file]) continue;
    PASSAGES.push({ kind: 'qa', id: q.file, question: q.question, tags: q.tags || [], text: `Q: ${q.question}\nA: ${q.answer}` });
  }
  return PASSAGES;
}

/* Generic verbs are stop words too: without them "how does PKCE work" matched
   "How do you handle CPU-heavy work in Node?" as strongly as the PKCE question. */
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'is', 'it', 'and', 'or', 'for', 'on',
  'how', 'what', 'why', 'do', 'does', 'i', 'my', 'me', 'you', 'with', 'that', 'this', 'be', 'are',
  'can', 'should', 'would', 'when', 'which', 'from', 'at', 'as', 'if', 'about', 'tell',
  'work', 'works', 'working', 'use', 'uses', 'using', 'used', 'need', 'needs', 'make', 'makes',
  'get', 'gets', 'way', 'ways', 'thing', 'things', 'good', 'better', 'best', 'help',
  'mean', 'means', 'happen', 'happens', 'give', 'gives', 'know', 'see', 'say', 'handle', 'handles',
  'explain', 'walk', 'through', 'difference', 'between', 'vs', 'versus', 'one', 'some', 'any']);

function stem(w) {
  return w.replace(/(ations?|ation|ising|izing|ing|ise|ize|ed|es|s)$/, '').replace(/(.)\1$/, '$1');
}
function queryTerms(q) {
  return [...new Set((q.toLowerCase().match(/[a-z0-9.+-]{3,}/g) || [])
    .filter((w) => !STOP.has(w)).map(stem).filter((w) => w.length >= 3))];
}

function relevantPassages(q, maxItems) {
  const words = queryTerms(q);
  if (!words.length) return [];
  return passages().map((p) => {
    const body = stem(p.text.toLowerCase());
    const title = stem((p.question || CONTENT[p.id].title).toLowerCase());
    const tags = (p.tags || []).join(' ');
    let score = 0;
    for (const w of words) {
      if (body.includes(w)) score += 3;
      if (title.includes(w)) score += 6;
      if (tags.includes(w)) score += 4;
      if (CONTENT[p.id].title.toLowerCase().includes(w)) score += 2;
    }
    if (p.kind === 'qa' && score > 0) score += 5;
    return { ...p, score };
  }).filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, maxItems);
}

/* Lookups stay on the cheap tier; only reasoning questions escalate. */
function askIntent(q) {
  const s = q.toLowerCase();
  if (/\b(weak|weakest|study|next|progress|ready|prepare|where am i|what should)\b/.test(s))
    return { kind: 'coach', tier: 'default', words: 160, items: 2 };
  if (/^(explain|compare|why|walk me|how would|how do i design|design|what.s the difference|trade)/.test(s)
      || /\b(vs\.?|versus|trade-?off|compare|design)\b/.test(s))
    return { kind: 'deep', tier: 'default', words: 180, items: 7 };
  return { kind: 'lookup', tier: 'quick', words: 90, items: 5 };
}

function progressBrief() {
  const lines = [];
  for (const t of TOPICS) {
    const s = topicSummary(t);
    lines.push(`${t.title}: ${s.done}/${s.total} chapters done, ~${fmtMin(s.left)} left`);
  }
  const solved = Object.keys(state.solved).length;
  lines.push(`Problems solved: ${solved}`);
  const quiz = Object.entries(state.quizBest).map(([cid, b]) => `${CONTENT[cid] ? CONTENT[cid].title : cid} ${Math.round(b * 100)}%`);
  if (quiz.length) lines.push('Quiz bests: ' + quiz.join(', '));
  const n = nextChapter();
  if (n) lines.push(`Next chapter on the path: ${CONTENT[n].title}`);
  const ws = CONTENT['weak-spots'];
  if (ws) lines.push('\nKNOWN WEAK SPOTS:\n' + searchText()['weak-spots'].slice(0, 2000));
  return lines.join('\n');
}

function askOpen(prefill) {
  ask.open = true;
  $('#ask-panel').hidden = false;
  $('#ask-fab').hidden = true;
  renderAsk();
  if (prefill) $('#ask-input').value = prefill;
  $('#ask-input').focus();
}
function askClose() {
  ask.open = false;
  $('#ask-panel').hidden = true;
  $('#ask-fab').hidden = !sample;
}

function renderAsk() {
  const log = $('#ask-log');
  const here = state.chapter ? CONTENT[state.chapter] : null;
  $('#ask-ctx').textContent = here ? `Reading: ${here.title}` : `${ORDER.length} chapters`;
  if (!ask.turns.length) {
    log.innerHTML = `<div class="ask-empty">Ask about a concept, a trade-off, or how to answer something
      about your own experience. Answers come from the book and cite the chapter.</div>` +
      [here ? `Explain "${here.title}" simply` : 'What should I study next?',
        'Why is a stale authorization cache a security bug?',
        'Kafka or RabbitMQ — how do I choose?',
      ].map((s) => `<button class="ask-chip" type="button" data-q="${esc(s)}">${esc(s)}</button>`).join('');
    // [data-q] is handled by the delegated listener in init().
    return;
  }
  log.innerHTML = ask.turns.map((t) => (t.role === 'you'
    ? `<div class="ask-msg you">${esc(t.text)}</div>`
    : `<div class="ask-msg bot">${t.text ? mdLite(t.text) : '<p class="thinking">Reading the book…</p>'}${
        t.sources && t.sources.length && t.text
          ? `<div class="ask-src">${t.sources.map((s) => `<a data-goto="${s.id}" title="${esc(s.label)}">${
              s.kind === 'qa' ? `Q · ${esc(s.label.length > 46 ? s.label.slice(0, 46) + '…' : s.label)}` : esc(CONTENT[s.id].title)}</a>`).join('')}</div>`
          : ''}</div>`)).join('');
  // [data-goto] is handled by the delegated listener in init().
  log.scrollTop = log.scrollHeight;
}

async function askSend() {
  if (ask.busy || !sample) return;
  const box = $('#ask-input');
  const q = box.value.trim();
  if (!q) return;
  box.value = '';
  ask.busy = true;
  ask.turns.push({ role: 'you', text: q });

  const intent = askIntent(q);
  const hits = relevantPassages(q, intent.items);
  const here = state.chapter;
  if (here && !hits.some((h) => h.id === here)) hits.unshift({ kind: 'prose', id: here, text: searchText()[here].slice(0, 400) });

  const context = hits.map((h) => (h.kind === 'qa'
    ? `[${CONTENT[h.id].title} — model answer]\n${h.text}`
    : `[${CONTENT[h.id].title}] ${h.text}`)).join('\n\n');
  const sources = [];
  for (const h of hits) {
    const key = h.kind === 'qa' ? 'q:' + h.question : 'c:' + h.id;
    if (!sources.some((s2) => s2.key === key) && sources.length < 4) {
      sources.push({ key, id: h.id, kind: h.kind, label: h.kind === 'qa' ? h.question : CONTENT[h.id].title });
    }
  }
  ask.turns.push({ role: 'bot', text: '', sources });
  renderAsk();
  const idx = ask.turns.length - 1;

  const rules = [
    'You are helping a senior engineer prepare for Google / identity-and-access-management interviews.',
    'Their prep book is below. Answer from it.',
    '',
    `Answer in under ${intent.words} words. Be direct — no preamble.`,
    'Use the book\'s own framing and vocabulary; it is what they will say in the room.',
    'If an extract is marked "model answer", prefer it over re-deriving the point.',
    'If the book does not cover something, say so in one line, then answer briefly from your own knowledge and flag that you are doing so.',
    'Details only they know are marked FILL IN. Point at those; never invent their history.',
  ];
  if (intent.kind === 'coach') rules.push('', 'Be specific: name chapters and say what to do next. Use the progress data below.');
  const framing = rules.join('\n') + '\n\nBOOK:\n' + context + (intent.kind === 'coach' ? '\n\nTHEIR PROGRESS:\n' + progressBrief() : '');

  const prior = ask.turns.slice(0, -2).slice(-4);
  const turns = [{ role: 'user', content: framing + '\n\nQ: ' + (prior.length ? prior[0].text : q) }];
  for (let i = 1; i < prior.length; i++) turns.push({ role: prior[i].role === 'you' ? 'user' : 'assistant', content: prior[i].text });
  if (prior.length) turns.push({ role: 'user', content: q });

  try {
    const res = await sample(turns, { modelTier: intent.tier, cache: false, onText: ({ text }) => { ask.turns[idx].text = text; renderAsk(); } });
    ask.turns[idx].text = res.text;
  } catch (e) {
    const code = e && e.code;
    ask.turns[idx].text = code === 'rate_limited' ? '_Rate limited — wait a moment and try again._'
      : code === 'not_granted' ? '_Asking is not available in this view._' : '_Something went wrong. Try again._';
    ask.turns[idx].sources = [];
  }
  ask.busy = false;
  renderAsk();
}

function initAsk() {
  onActivate($('#ask-fab'), () => askOpen());
  onActivate($('#ask-close'), askClose);
  onActivate($('#ask-send'), askSend);
  $('#ask-input').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askSend(); } };
}

/* ================================================================ MISC === */

function mdLite(t) {
  if (!t) return '';
  let h = esc(t);
  h = h.replace(/```[a-z]*\n?([\s\S]*?)```/g, (m, c) => `<pre>${c.trim()}</pre>`);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
  return h.split(/\n{2,}/).map((p) => (/^<(ul|pre|h\d)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`)).join('');
}

function render() {
  if (state.query) renderSearch();
  else if (state.chapter) renderChapter();
  else renderHome();
  renderNav();
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  const s = document.querySelector('.scrim');
  if (s) s.remove();
}

function cycleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
  if (next) document.documentElement.setAttribute('data-theme', next);
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem('theme', next); } catch (_) {}
  $('#theme').textContent = `Theme: ${next || 'system'}`;
  redrawDiagrams();
}

/* --------------------------------------------------------- click routing ---
   Every dynamic control (sidebar links, chapter/stage nav, the Code and Quiz
   stages, search results, the Ask chips) is wired through this one listener,
   bound once here on `document`, instead of assigning .onclick to nodes
   created fresh by innerHTML on each render.

   It listens on 'pointerup', not 'click'. In the claude.ai artifact viewer,
   the browser's synthesized 'click' event does not reliably fire at all —
   confirmed with a bare diagnostic `document.addEventListener('click', ...)`
   that never once logged on a real, physical mouse click, while :hover and
   focus (which ride on 'mouseover'/'mousedown', not 'click') worked the
   whole time. 'pointerup' fires earlier in the sequence
   (pointerdown → mousedown → pointerup → mouseup → click) and is what a
   real press-and-release physically generates, so it isn't affected by
   whatever swallows the synthesized 'click' after it. 'click' stays wired
   too, deduplicated against a just-handled pointerup, purely so a
   keyboard-activated button (Tab + Enter/Space), which dispatches a 'click'
   with no preceding 'pointerup', still works. */
function routeActivation(e) {
  let t;

    if (e.target.closest('.scrim')) { closeSidebar(); return; }

    if ((t = e.target.closest('[data-topic]'))) {
      state.expanded[t.dataset.topic] = !state.expanded[t.dataset.topic];
      renderNav();
      return;
    }

    if ((t = e.target.closest('a[data-nav]'))) { e.preventDefault(); go(t.dataset.nav); return; }
    if ((t = e.target.closest('[data-goto]'))) { askClose(); go(t.dataset.goto); return; }

    if ((t = e.target.closest('[data-k]'))) {
      e.preventDefault();
      const h = LAST_SEARCH_HITS[+t.dataset.k];
      if (!h) return;
      if (h.ex) { pendingEx = h.ex; go(h.cid, 'code'); } else go(h.cid, h.stage, h.i);
      return;
    }

    // Every plain chapter link/button: sidebar, home rows, the done-box's
    // "Next" button. Safe to preventDefault on a <button> too (no href).
    if ((t = e.target.closest('[data-go]'))) { e.preventDefault(); go(t.dataset.go); return; }

    if ((t = e.target.closest('[data-stage-go]'))) { go(state.chapter, t.dataset.stageGo); return; }
    if ((t = e.target.closest('[data-stage]'))) { go(state.chapter, t.dataset.stage); return; }

    if (e.target.closest('#toggle-done')) {
      const c = CONTENT[state.chapter];
      setStatus(c.id, state.status[c.id] === 'done' ? 'started' : 'done');
      renderChapter();
      return;
    }
    if (e.target.closest('#mark-done')) {
      const c = CONTENT[state.chapter];
      setStatus(c.id, 'done');
      renderChapter();
      return;
    }

    if (e.target.closest('#mode')) {
      const c = CONTENT[state.chapter];
      const stage = state.stage;
      const items = c[stage];
      const i = Math.min(state.index, items.length - 1);
      const whole = onePage();
      try { localStorage.setItem('ib:onepage', whole ? '0' : '1'); } catch (_) {}
      renderPager(c, stage);
      if (whole) window.scrollTo(0, 0);
      else { const target = document.getElementById('sec-' + i); if (target) target.scrollIntoView({ block: 'start' }); }
      return;
    }
    if ((t = e.target.closest('[data-i]'))) { go(state.chapter, state.stage, +t.dataset.i); return; }

    if ((t = e.target.closest('[data-filter]'))) {
      state.code.filter = t.dataset.filter;
      renderCode(CONTENT[state.chapter]);
      return;
    }
    if ((t = e.target.closest('[data-ex]'))) { selectProblem(CONTENT[state.chapter], t.dataset.ex, false); return; }
    if (e.target.closest('#rand')) { randomProblem(CONTENT[state.chapter]); return; }
    if (e.target.closest('#gen')) { generateProblem(CONTENT[state.chapter]); return; }

    if (e.target.closest('#run')) {
      const p = findProblem(state.code.exId);
      if (p) runCode(CONTENT[state.chapter], p);
      return;
    }
    if (e.target.closest('#review')) {
      const p = findProblem(state.code.exId);
      if (p) reviewCode(CONTENT[state.chapter], p);
      return;
    }
    if (e.target.closest('#hint')) {
      const c = CONTENT[state.chapter];
      const p = findProblem(state.code.exId);
      const s = state.code;
      if (s.hint === 0) { s.hint = 1; refreshProblem(c, p); }
      else if (s.hint === 1 && sample) nudge(c, p);
      return;
    }
    if (e.target.closest('#solution')) {
      const p = findProblem(state.code.exId);
      state.code.solutionStep = (state.code.solutionStep + 1) % 3;
      refreshProblem(CONTENT[state.chapter], p);
      return;
    }
    if (e.target.closest('#reset-code')) {
      const p = findProblem(state.code.exId);
      if (p && editor) {
        editor.setValue(p.starter || starterFor(p));
        try { localStorage.removeItem('ib:draft:' + p.id); } catch (_) {}
      }
      return;
    }

    if ((t = e.target.closest('[data-o]'))) {
      const c = CONTENT[state.chapter];
      const q = state.quiz;
      const idx = q.order[q.pos];
      const m = c.quiz[idx];
      const o = +t.dataset.o;
      if (!m.multi) { answerQuiz(c, [o]); return; }
      q.multiPick = q.multiPick || [];
      q.multiPick = q.multiPick.includes(o) ? q.multiPick.filter((x) => x !== o) : q.multiPick.concat(o);
      renderQuiz(c);
      return;
    }
    if (e.target.closest('#check-multi')) { answerQuiz(CONTENT[state.chapter], state.quiz.multiPick || []); return; }
    if (e.target.closest('#q-next')) {
      const c = CONTENT[state.chapter];
      const q = state.quiz;
      if (q.pos < q.order.length - 1) q.pos++; else q.finished = true;
      renderQuiz(c);
      window.scrollTo(0, 0);
      return;
    }
    if (e.target.closest('#retry-missed')) {
      const c = CONTENT[state.chapter];
      const q = state.quiz;
      const missed = q.order.filter((i) => !(q.answers[i] && q.answers[i].right));
      state.quiz = newQuiz(c, missed);
      renderQuiz(c);
      return;
    }
    if (e.target.closest('#restart')) { state.quiz = null; renderQuiz(CONTENT[state.chapter]); return; }

    if ((t = e.target.closest('[data-q]'))) { $('#ask-input').value = t.dataset.q; askSend(); return; }
}

// Set by the 'pointerup' listener whenever it handles an interaction, so the
// 'click' fallback (see routeActivation's doc comment above) can skip the
// duplicate when both fire for the same physical press.
let lastPointerRoute = 0;

function wireDelegatedEvents() {
  document.addEventListener('pointerup', (e) => {
    if (e.button !== 0) return;   // primary button only — matches 'click' semantics
    lastPointerRoute = Date.now();
    routeActivation(e);
  });
  document.addEventListener('click', (e) => {
    if (Date.now() - lastPointerRoute < 80) return;   // already handled via pointerup
    routeActivation(e);
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'jump') {
      const whole = onePage();
      const j = +e.target.value;
      if (whole) {
        const target = document.getElementById('sec-' + j);
        if (target) target.scrollIntoView({ block: 'start' });
      } else go(state.chapter, state.stage, j);
      return;
    }
    if (e.target.id === 'rand-scope') { state.code.scope = e.target.value; return; }
    if (e.target.id === 'gen-diff') { state.code.diff = e.target.value; return; }
  });
}

function init() {
  wireDelegatedEvents();
  try {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    $('#theme').textContent = `Theme: ${saved || 'system'}`;
  } catch (_) {}
  loadLocal();

  onActivate($('#go-home'), (e) => { e.preventDefault(); go(null); });
  onActivate($('#theme'), cycleTheme);
  $('#search').oninput = (e) => {
    state.query = e.target.value.trim();
    if (state.query.length === 1) return;
    render();
  };
  onActivate($('#menu'), () => {
    $('#sidebar').classList.add('open');
    document.body.appendChild(el('div', 'scrim'));   // closing it is handled by the delegated listener below
  });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.closest('.CodeMirror');
    if (e.key === 'Escape' && ask.open) askClose();
    if (typing) return;
    if (e.key === '/' && sample && !ask.open) { e.preventDefault(); askOpen(); }
    if (state.chapter && (state.stage === 'learn' || state.stage === 'workshop') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const n = CONTENT[state.chapter][state.stage].length;
      const i = state.index + (e.key === 'ArrowRight' ? 1 : -1);
      if (i >= 0 && i < n) go(state.chapter, state.stage, i);
    }
  });
  // Back/forward, and a hash typed or linked by hand, where the frame reports them.
  window.addEventListener('popstate', () => route(parseHash(location.hash)));
  window.addEventListener('hashchange', () => route(parseHash(location.hash)));
  initAsk();

  // Every topic starts open, so every chapter is one click away; collapsing is
  // the viewer's choice.
  TOPICS.forEach((tp) => { state.expanded[tp.id] = true; });
  route(parseHash(location.hash));
}

init();

/* Capabilities resolve later — possibly never. */
(async () => {
  if (!window.claude || !window.claude.use) return;

  try {
    db = await claude.use('db');
    if (db) {
      const read = async (col) => {
        try {
          const snap = await db.collection(col).get();
          return (snap.docs || []).map((d) => ({ id: d.id, data: d.data() || {} }));
        } catch (_) { return []; }
      };
      for (const d of await read('chapters')) {
        if (!CONTENT[d.id]) continue;
        if (d.data.status === 'none') delete state.status[d.id];
        else if (d.data.status) state.status[d.id] = d.data.status;
      }
      for (const d of await read('solved')) state.solved[d.id] = d.data.at || 1;
      for (const d of await read('quiz')) if (typeof d.data.best === 'number') state.quizBest[d.id] = d.data.best;
      for (const d of await read('generated')) if (d.data && d.data.id) state.generated[d.id] = d.data;

      // One-time carry-over from the old book: section read-marks become a
      // chapter status for chapters that don't have one yet.
      try {
        const legacy = await db.doc('reading/sections').get();
        const marks = legacy.exists ? (legacy.data() || {}).read || {} : {};
        const counts = {};
        for (const k of Object.keys(marks)) { const cid = k.split('::')[0]; counts[cid] = (counts[cid] || 0) + 1; }
        for (const [cid, n] of Object.entries(counts)) {
          if (!CONTENT[cid] || state.status[cid]) continue;
          const c = CONTENT[cid];
          const total = c.learn.length + c.workshop.length - 1;
          const status = n >= total ? 'done' : 'started';
          state.status[cid] = status;
          dbSet(`chapters/${cid}`, { status, at: Date.now(), from: 'reading-marks' });
        }
      } catch (_) {}

      saveLocal();
      render();
    }
  } catch (_) {}

  try {
    sample = await claude.use('sample');
    if (sample) {
      $('#ask-fab').hidden = ask.open;
      if (state.stage === 'code' && state.chapter) render();
    }
  } catch (_) {}
})();
})();
