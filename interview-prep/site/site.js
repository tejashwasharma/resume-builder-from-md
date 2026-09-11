/* =========================================================================
   The Interview Book

   Renders from window.__DATA__ (built by build_site.py). Reads as a book:
   contents page -> chapters -> sections you tick off as you go.

   Two runtime capabilities are optional and resolve asynchronously:
     sample -> drilling and mock rounds (grades what you type)
     db     -> reading progress and drill history, across devices

   Either can be null. Nothing here waits on them at load — the book is a
   complete reference on its own, and the extras light up if they arrive.
   ========================================================================= */

const DATA = window.__DATA__;
const CONTENT = DATA.content;
const QUESTIONS = DATA.questions;
const SPINE = DATA.stats.spine;
const PARTS = DATA.stats.parts;

const state = {
  tab: 'book',
  chapter: null,        // null = contents page
  query: '',
  read: {},             // "chapterId::anchor" -> true
  progress: {},         // chapterId -> drill record
  drill: null,
  mock: null,
};

let sample = null;
let db = null;

const $ = (s) => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Chapter HTML -> readable text, for search and for what the Ask chat
   retrieves over. Diagram source is markup, not prose: left in, chunks of
   `sequenceDiagram participant -->>` land in search snippets and compete with
   real passages in retrieval. The <figcaption> survives the strip, so a
   diagram is still findable by what it is captioned. */
const plain = (html) => html
  .replace(/<pre class="mermaid">[\s\S]*?<\/pre>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ');

const secKey = (cid, anchor) => `${cid}::${anchor}`;
const allSections = () => SPINE.flatMap((cid) => (CONTENT[cid].sections || []).map((s) => secKey(cid, s.anchor)));
const readCount = () => allSections().filter((k) => state.read[k]).length;

function chapterDone(cid) {
  const secs = CONTENT[cid].sections || [];
  return secs.length > 0 && secs.every((s) => state.read[secKey(cid, s.anchor)]);
}

/* ------------------------------------------------------------ sidebar --- */

function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = '';

  for (const part of PARTS) {
    const g = el('div', 'nav-group');
    g.appendChild(el('h4', null, esc(part.name)));
    for (const cid of part.chapters) {
      const c = CONTENT[cid];
      const done = chapterDone(cid);
      const p = state.progress[cid];
      let cls = '';
      if (done) cls = 'solid';
      else if (p && p.weak > p.strong) cls = 'weak';
      const a = el('a', 'nav-item' + (state.chapter === cid && state.tab === 'book' ? ' active' : ''),
        `<span class="dot ${cls}"></span><span>${esc(c.title)}</span>` +
        (c.questions ? `<span class="count">${c.questions}</span>` : ''));
      a.href = '#' + cid;
      a.onclick = (e) => { e.preventDefault(); openChapter(cid); };
      g.appendChild(a);
    }
    nav.appendChild(g);
  }

  if (DATA.stats.pending && DATA.stats.pending.length) {
    const g = el('div', 'nav-group');
    g.appendChild(el('h4', null, 'Not yet written'));
    for (const m of DATA.stats.pending) {
      g.appendChild(el('div', 'nav-item pending', `<span class="dot"></span><span>${esc(m.name)}</span>`));
    }
    nav.appendChild(g);
  }

  const total = allSections().length;
  const done = readCount();
  const pct = total ? Math.round((done / total) * 100) : 0;
  $('#bar').style.width = pct + '%';
  $('#read-pct').textContent = total ? `${pct}% read` : '';
  $('#brand-sub').textContent = state.chapter && state.tab === 'book'
    ? `Chapter ${CONTENT[state.chapter].number}` : 'Contents';
}

/* ------------------------------------------------------------ contents --- */

function renderContents() {
  const total = allSections().length;
  const done = readCount();

  let html = `
    <div class="book-title">
      <h1>The Interview Book</h1>
      <div class="sub">Senior Software Engineer · Identity &amp; Platform Engineering</div>
      <div class="stats">
        <span><b>${PARTS.length}</b> parts</span>
        <span><b>${SPINE.length}</b> chapters</span>
        <span><b>${total}</b> sections</span>
        <span><b>${DATA.stats.questions}</b> questions</span>
        <span><b>${done}</b> read</span>
      </div>
    </div>`;

  PARTS.forEach((part, pi) => {
    const secs = part.chapters.flatMap((cid) => (CONTENT[cid].sections || []).map((s) => secKey(cid, s.anchor)));
    const pdone = secs.filter((k) => state.read[k]).length;
    html += `<div class="part">
      <div class="part-head">
        <span class="pnum">Part ${romanize(pi + 1)}</span>
        <h2>${esc(part.name)}</h2>
        <span class="pdone">${pdone}/${secs.length} sections</span>
      </div>`;
    for (const cid of part.chapters) {
      const c = CONTENT[cid];
      html += `<a class="chapter-row ${chapterDone(cid) ? 'done' : ''}" data-ch="${cid}">
          <span class="cnum">${c.number}</span>
          <span class="ctitle">${esc(c.title)}</span>
          <span class="cmeta">${c.sections.length} sections${c.questions ? ` · ${c.questions} Q` : ''}</span>
        </a>
        <div class="sec-list">${c.sections.map((s) => {
          const k = secKey(cid, s.anchor);
          return `<div class="sec-row ${state.read[k] ? 'read' : ''}" data-ch="${cid}" data-anchor="${s.anchor}">
            <span class="dot ${state.read[k] ? 'solid' : ''}"></span>${esc(s.title)}</div>`;
        }).join('')}</div>`;
    }
    html += `</div>`;
  });

  if (DATA.stats.pending && DATA.stats.pending.length) {
    html += `<div class="part pending">
      <div class="part-head"><span class="pnum">Still to come</span>
      <h2>Not yet written</h2></div>
      ${DATA.stats.pending.map((m) => `<a class="chapter-row"><span class="cnum">–</span>
        <span class="ctitle">${esc(m.name)}</span>
        <span class="cmeta">planned</span></a>`).join('')}</div>`;
  }

  $('#view').innerHTML = html;
  $('#view').querySelectorAll('[data-ch]').forEach((n) => {
    n.onclick = () => openChapter(n.dataset.ch, n.dataset.anchor);
  });
}

function romanize(n) {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n - 1] || String(n);
}

/* ------------------------------------------------------------- chapter --- */

function openChapter(cid, anchor) {
  if (!CONTENT[cid]) return;
  state.chapter = cid;
  state.tab = 'book';
  state.query = '';
  $('#search').value = '';
  syncTabs(); renderNav(); render();
  if (anchor) {
    setTimeout(() => {
      const t = document.getElementById(anchor);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  } else window.scrollTo(0, 0);
  if (window.innerWidth <= 860) closeSidebar();
}

/* ---------------------------------------------------------------------------
   Diagrams

   Chapters carry Mermaid flow charts above the prose that walks them. Mermaid
   is ~3MB, so it is never on the critical path: it loads the first time a
   chapter with a diagram is opened, and never at all for a reader who only
   uses the Q&A. Chapters are injected dynamically, so rendering is driven per
   chapter render rather than by mermaid's own startOnLoad.

   Some hosts render <pre class="mermaid"> natively. Anything already carrying
   an <svg> or data-processed is left alone, so we never double-render.
--------------------------------------------------------------------------- */

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

/* Mermaid bakes colours into the SVG it emits, so it has to be told the
   current palette and re-run when the theme changes. Read the values off the
   same CSS custom properties the rest of the page uses — one source of truth
   for the palette, in site.css. */
function mermaidTheme() {
  const v = getComputedStyle(document.documentElement);
  const c = (name, fallback) => (v.getPropertyValue(name) || fallback).trim();
  const line = c('--line', '#e4e4e0');
  const ink = c('--ink', '#1a1a18');
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    fontFamily: 'inherit',
    theme: 'base',
    /* Emit a real pixel width rather than width="100%". CSS can then shrink a
       wide diagram to fit the column on a desktop, and let it keep its natural
       size and scroll on a phone — a percentage width can do only the first,
       and shrinking a sequence diagram to a phone column makes it unreadable. */
    /* Mermaid wraps node labels at 200px by default, which turns a five-step
       chain into a narrow 300x800 ribbon. Wider labels mean shorter, wider
       diagrams — the shape that actually fits a page. */
    flowchart: { useMaxWidth: false, wrappingWidth: 400 },
    sequence: { useMaxWidth: false },
    state: { useMaxWidth: false },
    themeVariables: {
      background: c('--surface', '#fff'),
      primaryColor: c('--accent-soft', '#efeaff'),
      primaryTextColor: ink,
      primaryBorderColor: c('--accent', '#7a5cff'),
      secondaryColor: c('--surface-2', '#f4f4f2'),
      tertiaryColor: c('--surface-2', '#f4f4f2'),
      lineColor: c('--muted', '#71716b'),
      textColor: c('--text', '#3a3a36'),
      mainBkg: c('--surface-2', '#f4f4f2'),
      nodeBorder: c('--accent', '#7a5cff'),
      clusterBkg: c('--surface', '#fff'),
      clusterBorder: line,
      actorBkg: c('--accent-soft', '#efeaff'),
      actorBorder: c('--accent', '#7a5cff'),
      actorTextColor: ink,
      signalColor: c('--text', '#3a3a36'),
      signalTextColor: c('--text', '#3a3a36'),
      labelBoxBkg: c('--surface-2', '#f4f4f2'),
      labelBoxBorderColor: line,
      labelTextColor: ink,
      loopTextColor: c('--text', '#3a3a36'),
      noteBkgColor: c('--warn-soft', '#fdf1e0'),
      noteBorderColor: c('--warn', '#b4690e'),
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
  loadMermaid().then((m) => {
    m.initialize(mermaidTheme());
    return m.run({ nodes: pendingDiagrams(root) });
  }).catch(() => {
    /* Offline, or the CDN is blocked. The source stays visible as text, which
       is readable and still says what the flow is. Not worth an error box. */
  });
}

/* A theme flip has to redraw: the old SVG carries the old palette. Restore the
   source we kept on the element and run again. */
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

function renderChapter() {
  const c = CONTENT[state.chapter];
  const i = SPINE.indexOf(state.chapter);
  const prev = i > 0 ? CONTENT[SPINE[i - 1]] : null;
  const next = i < SPINE.length - 1 ? CONTENT[SPINE[i + 1]] : null;

  $('#view').innerHTML = `
    <div class="chapter-head">
      <div class="eyebrow">${esc(c.module)} · Chapter ${c.number}</div>
      <h1>${esc(c.title)}</h1>
    </div>
    ${c.sections.length > 1 ? `<div class="chapter-toc"><h4>IN THIS CHAPTER</h4>
      ${c.sections.map((s) => `<a href="#${s.anchor}" data-jump="${s.anchor}">${esc(s.title)}</a>`).join('')}
    </div>` : ''}
    <article class="doc" id="doc">${c.html}</article>
    <div class="chapter-nav">
      ${prev ? `<a data-ch="${prev.id}"><span class="dir">← Previous</span><span class="t">${esc(prev.title)}</span></a>`
             : '<a class="spacer-slot"></a>'}
      ${next ? `<a class="next" data-ch="${next.id}"><span class="dir">Next →</span><span class="t">${esc(next.title)}</span></a>`
             : '<a class="spacer-slot"></a>'}
    </div>`;

  injectSectionMarkers(c);

  $('#view').querySelectorAll('pre.mermaid').forEach((n) => {
    if (!n.dataset.src) n.dataset.src = n.textContent;
  });
  renderDiagrams($('#view'));

  $('#view').querySelectorAll('a[data-nav]').forEach((a) => {
    a.onclick = (e) => { e.preventDefault(); openChapter(a.dataset.nav); };
  });
  $('#view').querySelectorAll('[data-ch]').forEach((a) => {
    a.onclick = (e) => { e.preventDefault(); openChapter(a.dataset.ch); };
  });
  $('#view').querySelectorAll('[data-jump]').forEach((a) => {
    a.onclick = (e) => {
      e.preventDefault();
      const t = document.getElementById(a.dataset.jump);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}

/* A tick box above each H2, so a section can be marked read where you finish
   reading it rather than only from the contents page. */
function injectSectionMarkers(c) {
  const doc = $('#doc');
  if (!doc) return;
  for (const s of c.sections) {
    const h = doc.querySelector(`h2#${CSS.escape(s.anchor)}`) || document.getElementById(s.anchor);
    if (!h || h.tagName !== 'H2') continue;
    const k = secKey(c.id, s.anchor);
    const mark = el('div', 'sec-mark' + (state.read[k] ? ' on' : ''),
      `<span class="box">${state.read[k] ? '✓' : ''}</span><span>${state.read[k] ? 'Read' : 'Mark as read'}</span>`);
    mark.onclick = () => toggleSection(c.id, s.anchor, mark);
    h.parentNode.insertBefore(mark, h);
  }
}

function toggleSection(cid, anchor, node) {
  const k = secKey(cid, anchor);
  if (state.read[k]) delete state.read[k]; else state.read[k] = Date.now();
  const on = !!state.read[k];
  if (node) {
    node.className = 'sec-mark' + (on ? ' on' : '');
    node.innerHTML = `<span class="box">${on ? '✓' : ''}</span><span>${on ? 'Read' : 'Mark as read'}</span>`;
  }
  renderNav();
  saveRead();
}

let saveTimer = null;
function saveRead() {
  if (!db) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await db.doc('reading/sections').set({ read: state.read, at: Date.now() }); } catch (_) {}
  }, 600);
}

/* -------------------------------------------------------------- search --- */

function renderSearch() {
  const q = state.query.toLowerCase();
  const out = [];
  for (const cid of SPINE) {
    const c = CONTENT[cid];
    const text = plain(c.html);
    const i = text.toLowerCase().indexOf(q);
    if (i === -1) continue;
    const from = Math.max(0, i - 70);
    const snip = (from ? '…' : '') + text.slice(from, i + 180).trim() + '…';
    out.push({ c, snip: esc(snip).replace(new RegExp(esc(q), 'ig'), (m) => `<mark>${m}</mark>`) });
  }
  const qs = QUESTIONS.filter((x) => x.question.toLowerCase().includes(q) || x.tags.some((t) => t.includes(q)));

  $('#view').innerHTML =
    `<h2 style="margin-top:0">${out.length + qs.length} results for "${esc(state.query)}"</h2>` +
    (qs.length ? `<div class="panel"><h3 style="margin-top:0">Questions</h3>` + qs.slice(0, 12).map((x) =>
      `<div class="result" data-ch="${x.file}"><div class="rtitle">${esc(x.question)}</div>
       <div class="rpath">Ch ${CONTENT[x.file] ? CONTENT[x.file].number : '?'} · ${esc(CONTENT[x.file] ? CONTENT[x.file].title : x.file)} · ${x.level}</div></div>`).join('') + `</div>` : '') +
    out.map((r) => `<div class="result" data-ch="${r.c.id}">
       <div class="rtitle">Ch ${r.c.number} · ${esc(r.c.title)}</div>
       <div class="rsnip">${r.snip}</div></div>`).join('');

  $('#view').querySelectorAll('[data-ch]').forEach((n) => { n.onclick = () => openChapter(n.dataset.ch); });
}

/* --------------------------------------------------------------- drill --- */

function renderDrill() {
  const v = $('#view');
  if (!sample) {
    v.innerHTML = `<div class="banner">Drilling needs the AI capability, which isn't available in this view.
      The book is fully readable, and every answer is in a collapsible block.</div>`;
    return;
  }
  const d = state.drill;
  if (!d) return renderDrillPicker();
  const q = d.queue[d.i];
  if (!q) return renderDrillSummary();

  v.innerHTML = `
    <div class="panel">
      <div class="qcard">
        <div class="qtext">${esc(q.question)}</div>
        <div class="meta">
          <span class="chip ${q.level}">${q.level}</span>
          ${q.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}
          <span class="chip">${d.i + 1} of ${d.queue.length}</span>
        </div>
      </div>
      ${q.needsInput ? `<div class="banner">This one turns on a detail only you have —
        there's a <strong>FILL IN</strong> marker on it in the book. Answer as best you can.</div>` : ''}
      <textarea id="answer" placeholder="Type your answer. Don't look it up — the point is what you can produce cold."></textarea>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="primary" id="submit">Submit answer</button>
        <button class="ghost" id="skip">Skip</button>
        <span class="spacer"></span>
        <button class="ghost" id="quit">End session</button>
      </div>
      <div id="grade"></div>
    </div>`;

  $('#answer').focus();
  $('#submit').onclick = gradeAnswer;
  $('#skip').onclick = () => { d.i++; render(); };
  $('#quit').onclick = () => { d.i = d.queue.length; render(); };
  $('#answer').onkeydown = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') gradeAnswer(); };
}

function renderDrillPicker() {
  const byCh = new Map();
  for (const q of QUESTIONS) {
    if (!byCh.has(q.file)) byCh.set(q.file, []);
    byCh.get(q.file).push(q);
  }
  const rows = [...byCh.entries()].map(([cid, qs]) => {
    const c = CONTENT[cid]; const p = state.progress[cid];
    return `<div class="prog-item">
      <span class="name">Ch ${c ? c.number : '?'} · ${esc(c ? c.title : cid)}</span>
      <span class="when">${qs.length} questions${p ? ` · ${p.attempts} attempts` : ''}</span>
      <button data-drill="${cid}">Drill</button></div>`;
  }).join('');

  $('#view').innerHTML = `
    <div class="panel">
      <h3 style="margin-top:0">Drill a chapter</h3>
      <p style="color:var(--muted);font-size:14.5px">One question at a time. You answer first,
      then it tells you what you missed. The model answer stays hidden until you've tried.</p>
      ${rows || '<p class="empty">No questions yet.</p>'}
    </div>
    <div class="panel">
      <h3 style="margin-top:0">Or mix it up</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button data-drill="__all">Random across the book</button>
        <button data-drill="__senior">Senior-level only</button>
        <button data-drill="__weak">What I've struggled with</button>
      </div>
    </div>`;
  $('#view').querySelectorAll('[data-drill]').forEach((b) => { b.onclick = () => startDrill(b.dataset.drill); });
}

function startDrill(key) {
  let pool;
  if (key === '__all') pool = [...QUESTIONS];
  else if (key === '__senior') pool = QUESTIONS.filter((q) => q.level === 'senior');
  else if (key === '__weak') {
    const weak = new Set(Object.keys(state.progress).filter((k) => (state.progress[k].weak || 0) > 0));
    pool = QUESTIONS.filter((q) => weak.has(q.file));
    if (!pool.length) pool = [...QUESTIONS];
  } else pool = QUESTIONS.filter((q) => q.file === key);

  pool = pool.slice().sort(() => Math.random() - 0.5).slice(0, 6);
  if (key !== '__senior') {
    const ord = { foundation: 0, intermediate: 1, senior: 2 };
    pool.sort((a, b) => (ord[a.level] ?? 1) - (ord[b.level] ?? 1));
  }
  state.drill = { key, queue: pool, i: 0, results: [] };
  state.tab = 'drill'; syncTabs(); render();
}

async function gradeAnswer() {
  const d = state.drill, q = d.queue[d.i];
  const answer = $('#answer').value.trim();
  if (!answer) { $('#answer').focus(); return; }
  $('#submit').disabled = true; $('#skip').disabled = true;
  const box = $('#grade');
  box.innerHTML = '<div class="grade"><p class="thinking">Reading your answer…</p></div>';

  const prompt = [
    'You are a senior engineer interviewing a candidate for a Senior Software Engineer role',
    'specialising in identity and access management. Grade the candidate\'s answer.', '',
    'QUESTION: ' + q.question, 'LEVEL: ' + q.level, '',
    'MODEL ANSWER (what a strong response covers):', q.answer, '',
    'CANDIDATE ANSWER:', answer, '',
    'Reply in markdown, under 220 words, in this shape:',
    '**Verdict:** `strong` / `passable` / `would concern an interviewer`',
    '**Got right:** one or two sentences, brief, no flattery.',
    '**Missed:** what was absent. This is the useful part — be specific.',
    '**Wrong:** anything incorrect, corrected plainly. Omit if nothing is wrong.', '',
    'Be honest. If it would not pass at senior level, say so — false reassurance costs',
    'them a real offer. Do not restate the model answer wholesale.',
  ].join('\n');

  try {
    const res = await sample(prompt, {
      modelTier: 'default',
      onText: ({ text }) => { box.innerHTML = `<div class="grade">${mdLite(text)}</div>`; },
    });
    const text = res.text || '';
    const verdict = /verdict:\s*`?strong/i.test(text) ? 'strong'
      : /verdict:\s*`?passable/i.test(text) ? 'passable' : 'weak';
    box.innerHTML = `<div class="grade ${verdict}">${mdLite(text)}</div>`;
    d.results.push({ q, verdict });
    recordAttempt(q, verdict);

    const foot = el('div', null, `<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="primary" id="next">${d.i + 1 < d.queue.length ? 'Next question' : 'Finish'}</button>
      <button class="ghost" id="reveal">Show model answer</button>
      ${q.followups.length ? `<button class="ghost" id="follow">Follow-up (${q.followups.length})</button>` : ''}
      <button class="ghost" id="tochap">Read the chapter</button></div>`);
    box.appendChild(foot);

    $('#next').onclick = () => { d.i++; render(); };
    $('#tochap').onclick = () => openChapter(q.file);
    $('#reveal').onclick = () => {
      foot.insertAdjacentHTML('afterend',
        `<div class="grade" style="margin-top:12px"><div class="verdict">Model answer</div>${mdLite(q.answer)}</div>`);
      $('#reveal').disabled = true;
    };
    if (q.followups.length) {
      let fi = 0;
      $('#follow').onclick = () => {
        const f = q.followups[fi++];
        if (!f) return;
        foot.insertAdjacentHTML('afterend',
          `<div class="grade" style="margin-top:12px"><div class="verdict">Follow-up</div>
           <p>${esc(f.q)}</p><details><summary>Answer</summary>${mdLite(f.a)}</details></div>`);
        if (fi >= q.followups.length) $('#follow').disabled = true;
      };
    }
  } catch (err) {
    const code = err && err.code;
    box.innerHTML = `<div class="grade weak"><p>${
      code === 'rate_limited' ? 'Rate limited — wait a moment and try again.'
      : code === 'not_granted' ? 'AI grading is not available in this view.'
      : 'Grading failed. Your answer is still in the box.'}</p></div>`;
    $('#submit').disabled = false; $('#skip').disabled = false;
  }
}

function renderDrillSummary() {
  const d = state.drill;
  const strong = d.results.filter((r) => r.verdict === 'strong').length;
  const weak = d.results.filter((r) => r.verdict === 'weak').length;
  $('#view').innerHTML = `
    <div class="panel">
      <h3 style="margin-top:0">Session complete</h3>
      <div class="stat-row">
        <div class="stat"><div class="n">${d.results.length}</div><div class="l">answered</div></div>
        <div class="stat"><div class="n">${strong}</div><div class="l">strong</div></div>
        <div class="stat"><div class="n">${weak}</div><div class="l">need work</div></div>
      </div>
      ${weak ? `<p><strong>Reread:</strong> ${[...new Set(d.results.filter((r) => r.verdict === 'weak')
        .map((r) => `Ch ${CONTENT[r.q.file].number} · ${CONTENT[r.q.file].title}`))].map(esc).join(', ')}</p>` : ''}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="primary" id="again">Drill again</button>
        <button class="ghost" id="back">Back to chapters</button>
      </div>
    </div>`;
  $('#again').onclick = () => startDrill(d.key);
  $('#back').onclick = () => { state.drill = null; render(); };
}

/* ---------------------------------------------------------------- mock --- */

function renderMock() {
  const v = $('#view');
  if (!sample) { v.innerHTML = `<div class="banner">Mock rounds need the AI capability, unavailable here.</div>`; return; }
  const m = state.mock;
  if (!m) {
    v.innerHTML = `<div class="panel">
      <h3 style="margin-top:0">Mock interview</h3>
      <p style="color:var(--muted);font-size:14.5px">A full round, in character. No grading between
      questions — a real interviewer doesn't do that. Feedback comes at the end, with a hire /
      no-hire read.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button data-mock="auth">Auth &amp; identity</button>
        <button data-mock="design">System design</button>
        <button data-mock="distributed">Distributed systems</button>
        <button data-mock="behavioral">Behavioural</button>
      </div></div>`;
    v.querySelectorAll('[data-mock]').forEach((b) => {
      b.onclick = () => { state.mock = { mode: b.dataset.mock, turns: [], done: false }; render(); };
    });
    return;
  }

  v.innerHTML = `<div class="panel">
      <div class="meta"><span class="chip senior">${esc(m.mode)} round</span>
        <span class="chip">${m.turns.length} exchanges</span></div>
      <div id="transcript" style="margin-top:16px"></div>
      ${m.done ? '' : `<textarea id="mockin" placeholder="Your answer…"></textarea>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="primary" id="msend">Send</button>
        <button class="ghost" id="mend">End &amp; get feedback</button></div>`}
    </div>`;

  $('#transcript').innerHTML = m.turns.map((x) =>
    `<div class="grade" style="margin-bottom:10px;${x.role === 'you' ? 'background:var(--surface-2)' : ''}">
       <div class="verdict">${x.role === 'you' ? 'You' : 'Interviewer'}</div>${mdLite(x.text)}</div>`).join('');

  if (!m.turns.length) { mockTurn(''); return; }
  if (m.done) return;
  $('#msend').onclick = () => { const v2 = $('#mockin').value.trim(); if (v2) mockTurn(v2); };
  $('#mend').onclick = mockFeedback;
  $('#mockin').focus();
}

async function mockTurn(userText) {
  const m = state.mock;
  if (userText) m.turns.push({ role: 'you', text: userText });

  const pool = QUESTIONS.filter((q) =>
    m.mode === 'behavioral' ? q.module === 'Experience'
      : m.mode === 'auth' ? q.module === 'Auth & Identity'
      : m.mode === 'design' ? q.kind === 'design' || q.module === 'System Design'
      : q.module === 'Distributed Systems');
  const bank = (pool.length ? pool : QUESTIONS).slice(0, 25).map((q) => `- ${q.question} (${q.level})`).join('\n');
  const weak = CONTENT['weak-spots'] ? plain(CONTENT['weak-spots'].html).slice(0, 2500) : '';

  const turns = [{ role: 'user', content: [
    `You are conducting a ${m.mode} interview round for a Senior Software Engineer role in`,
    'identity and platform engineering. Stay in character as the interviewer.', '',
    'Ask ONE question and stop. Never answer your own question. No coaching, no praise —',
    'real interviewers are pleasant and unreadable. Escalate on a strong answer, redirect on',
    'a weak one. Keep each message under 90 words.', '',
    'Questions you may draw on:', bank, '',
    weak ? 'Known soft spots — work at least one in as a curveball:\n' + weak : '', '',
    m.turns.length ? '' : 'Open the round: one line introducing yourself, then ask them to tell you about themselves.',
  ].join('\n') }];
  for (const t of m.turns) turns.push({ role: t.role === 'you' ? 'user' : 'assistant', content: t.text });
  if (m.turns.length && m.turns[m.turns.length - 1].role !== 'you') {
    turns.push({ role: 'user', content: '(no answer given — move on)' });
  }

  m.turns.push({ role: 'them', text: '' });
  render();
  const idx = m.turns.length - 1;
  try {
    const res = await sample(turns, { onText: ({ text }) => {
      m.turns[idx].text = text;
      const t = $('#transcript');
      if (t && t.lastElementChild) t.lastElementChild.innerHTML = `<div class="verdict">Interviewer</div>${mdLite(text)}`;
    } });
    m.turns[idx].text = res.text;
  } catch (e) { m.turns[idx].text = '_(connection lost — try again)_'; }
  render();
}

async function mockFeedback() {
  const m = state.mock;
  m.done = true; render();
  const transcript = m.turns.map((t) => `${t.role === 'you' ? 'CANDIDATE' : 'INTERVIEWER'}: ${t.text}`).join('\n\n');
  const box = $('#transcript');
  box.insertAdjacentHTML('beforeend', '<div class="grade"><p class="thinking">Writing feedback…</p></div>');
  const node = box.lastElementChild;
  try {
    const res = await sample([
      `Transcript of a ${m.mode} interview round for a Senior Software Engineer role in`,
      'identity/platform engineering. Give the candidate honest feedback.', '', transcript, '',
      'Reply in markdown:',
      '**Verdict:** Strong hire / Hire / Lean no / No hire (against a senior bar)',
      '**What worked:** specific, quoting what they said',
      '**What didn\'t:** the gap, and what a strong candidate would have said',
      '**What an interviewer would privately conclude:** the honest read',
      '**Fix before the next round:** one highest-impact thing', '',
      'Be straight. A comfortable mock that produces a real rejection has failed.',
    ].join('\n'), { onText: ({ text }) => { node.innerHTML = mdLite(text); } });
    node.innerHTML = `<div class="verdict">Feedback</div>${mdLite(res.text)}`;
    if (db) { try { await db.doc(`mocks/${Date.now()}`).set({ mode: m.mode, feedback: res.text.slice(0, 4000), at: Date.now() }); } catch (_) {} }
  } catch (e) { node.innerHTML = '<p>Could not generate feedback.</p>'; }
}

/* ------------------------------------------------------------ progress --- */

function renderProgress() {
  const total = allSections().length;
  const done = readCount();
  const drilled = Object.keys(state.progress);
  const attempts = drilled.reduce((n, k) => n + (state.progress[k].attempts || 0), 0);
  const weak = drilled.filter((k) => (state.progress[k].weak || 0) > (state.progress[k].strong || 0));
  const unread = SPINE.filter((cid) => !chapterDone(cid));

  $('#view').innerHTML = `
    ${db ? '' : '<div class="banner">Progress isn\'t being saved in this view — the storage capability is unavailable. What follows is this session only.</div>'}
    <div class="stat-row">
      <div class="stat"><div class="n">${done}/${total}</div><div class="l">sections read</div></div>
      <div class="stat"><div class="n">${SPINE.filter(chapterDone).length}</div><div class="l">chapters finished</div></div>
      <div class="stat"><div class="n">${attempts}</div><div class="l">answers graded</div></div>
      <div class="stat"><div class="n">${weak.length}</div><div class="l">weak chapters</div></div>
    </div>

    <div class="panel">
      <h3 style="margin-top:0">Chapters</h3>
      ${SPINE.map((cid) => {
        const c = CONTENT[cid], p = state.progress[cid];
        const secs = c.sections.length;
        const r = c.sections.filter((s) => state.read[secKey(cid, s.anchor)]).length;
        const stale = p && Date.now() - (p.lastAt || 0) > 30 * 864e5;
        const cls = chapterDone(cid) ? 'solid' : p && p.weak > p.strong ? 'weak' : stale ? 'stale' : '';
        return `<div class="prog-item">
          <span class="dot ${cls}"></span>
          <span class="name">Ch ${c.number} · ${esc(c.title)}</span>
          <span class="when">${r}/${secs} read${p ? ` · ${p.strong || 0}✓ ${p.weak || 0}✗` : ''}${stale ? ' · stale' : ''}</span>
          <button class="ghost" data-open="${cid}">Read</button>
          <button class="ghost" data-reset="${cid}">Reset</button>
        </div>`;
      }).join('')}
    </div>

    <div class="panel">
      <h3 style="margin-top:0">Start over</h3>
      <p style="color:var(--muted);font-size:14.5px">Clears reading marks and drill history — a
      fresh pass before a specific interview.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="reset-read">Reset reading marks</button>
        <button id="reset-drill">Reset drill history</button>
        <button id="reset-all">Reset everything</button>
      </div>
    </div>`;

  $('#view').querySelectorAll('[data-open]').forEach((b) => { b.onclick = () => openChapter(b.dataset.open); });
  $('#view').querySelectorAll('[data-reset]').forEach((b) => { b.onclick = () => resetChapter(b.dataset.reset); });
  $('#reset-read').onclick = () => { if (confirm('Clear every reading mark?')) { state.read = {}; saveRead(); renderNav(); render(); } };
  $('#reset-drill').onclick = async () => {
    if (!confirm('Clear all drill history?')) return;
    for (const k of Object.keys(state.progress)) { if (db) { try { await db.doc(`progress/${k}`).delete(); } catch (_) {} } }
    state.progress = {}; renderNav(); render();
  };
  $('#reset-all').onclick = async () => {
    if (!confirm('Reset reading marks AND drill history? This cannot be undone.')) return;
    for (const k of Object.keys(state.progress)) { if (db) { try { await db.doc(`progress/${k}`).delete(); } catch (_) {} } }
    state.progress = {}; state.read = {}; saveRead(); renderNav(); render();
  };
}

async function resetChapter(cid) {
  const c = CONTENT[cid];
  if (!confirm(`Reset chapter ${c.number} — "${c.title}"?`)) return;
  for (const s of c.sections) delete state.read[secKey(cid, s.anchor)];
  delete state.progress[cid];
  if (db) { try { await db.doc(`progress/${cid}`).delete(); } catch (_) {} }
  saveRead(); renderNav(); render();
}

async function recordAttempt(q, verdict) {
  const k = q.file;
  const p = state.progress[k] || { attempts: 0, strong: 0, weak: 0, weakAreas: [] };
  p.attempts++;
  if (verdict === 'strong') p.strong++; else p.weak++;
  if (verdict !== 'strong' && !p.weakAreas.includes(q.question)) p.weakAreas = [...p.weakAreas.slice(-9), q.question];
  p.lastAt = Date.now();
  state.progress[k] = p;
  renderNav();
  if (db) { try { await db.doc(`progress/${k}`).set(p); } catch (_) {} }
}

/* ---------------------------------------------------------------- ask --- */
/* A chat grounded in the book. It finds the chapters most relevant to the
   question, sends those as context, and links to them in the answer — so it
   answers from this material rather than general knowledge, and you can jump
   to the source. */

const ask = { open: false, turns: [], busy: false };

let SEARCH_TEXT = null;
function searchText() {
  if (SEARCH_TEXT) return SEARCH_TEXT;
  SEARCH_TEXT = {};
  for (const id of SPINE) {
    SEARCH_TEXT[id] = plain(CONTENT[id].html);
  }
  return SEARCH_TEXT;
}

/* Retrieval index. Two kinds of source:
     - prose passages, ~500 chars cut at sentence boundaries
     - the book's 99 question/answer pairs
   The Q&A pairs matter most: they are purpose-written answers to exactly the
   questions someone asks, so a match there beats any prose chunk. */
let PASSAGES = null;
function passages() {
  if (PASSAGES) return PASSAGES;
  PASSAGES = [];
  const text = searchText();

  for (const id of SPINE) {
    const sents = text[id].split(/(?<=[.!?])\s+/);
    let buf = [], len = 0;
    for (const s of sents) {
      buf.push(s); len += s.length + 1;
      if (len > 500) {
        PASSAGES.push({ kind: 'prose', id, text: buf.join(' ').trim() });
        buf = buf.slice(-1); len = buf[0] ? buf[0].length : 0;   // 1 sentence overlap
      }
    }
    if (buf.length) PASSAGES.push({ kind: 'prose', id, text: buf.join(' ').trim() });
  }

  for (const q of QUESTIONS) {
    PASSAGES.push({
      kind: 'qa', id: q.file, question: q.question, level: q.level,
      tags: q.tags || [],
      text: `Q: ${q.question}\nA: ${q.answer}`,
    });
  }
  return PASSAGES;
}

/* Stop words include generic verbs and nouns as well as grammar words.
   Without them "how does PKCE work" scores "How do you handle CPU-heavy work
   in Node?" as highly as the PKCE question, because "work" matches both. */
const STOP = new Set(['the','a','an','of','to','in','is','it','and','or','for','on',
  'how','what','why','do','does','i','my','me','you','with','that','this','be','are',
  'can','should','would','when','which','from','at','as','if','about','tell',
  'work','works','working','use','uses','using','used','need','needs','make','makes',
  'get','gets','way','ways','thing','things','good','better','best','help','tell',
  'mean','means','happen','happens','give','gives','know','see','say','handle','handles',
  'explain','walk','through','difference','between','vs','versus','one','some','any']);

/* Crude stemmer: enough that caching/cache, tokens/token and
   revoked/revocation match each other. */
function stem(w) {
  return w.replace(/(ations?|ation|ising|izing|ing|ise|ize|ed|es|s)$/, '')
          .replace(/(.)\1$/, '$1');           // cach -> cach, runn -> run
}
function queryTerms(q) {
  return [...new Set((q.toLowerCase().match(/[a-z0-9.+-]{3,}/g) || [])
    .filter(w => !STOP.has(w)).map(stem).filter(w => w.length >= 3))];
}

/* Best sources for a question. Q&A entries are weighted above prose, and a
   question-title match above a body match. */
function relevantPassages(q, maxItems) {
  const words = queryTerms(q);
  if (!words.length) return [];
  return passages().map(p => {
    const body = stem(p.text.toLowerCase());
    const title = stem((p.question || CONTENT[p.id].title).toLowerCase());
    const tags = (p.tags || []).join(' ');
    let score = 0;
    for (const w of words) {
      if (body.includes(w)) score += 3;
      if (title.includes(w)) score += 6;                  // a matching question title is strong
      if (tags.includes(w)) score += 4;
      if (CONTENT[p.id].title.toLowerCase().includes(w)) score += 2;
    }
    if (p.kind === 'qa' && score > 0) score += 5;         // prefer a written answer
    return { ...p, score };
  }).filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);
}

/* How much to spend on this question. Most are lookups and stay cheap; only
   the ones that need reasoning escalate. */
function askIntent(q) {
  const s = q.toLowerCase();
  if (/\b(weak|weakest|study|next|progress|ready|prepare|where am i|what should)\b/.test(s))
    return { kind: 'coach', tier: 'default', words: 160, items: 2 };
  if (/^(explain|compare|why|walk me|how would|how do i design|design|what.s the difference|trade)/.test(s)
      || /\b(vs\.?|versus|trade-?off|compare|design)\b/.test(s))
    return { kind: 'deep', tier: 'default', words: 180, items: 7 };
  return { kind: 'lookup', tier: 'quick', words: 90, items: 5 };
}

/* What the coach mode needs: real progress, not guesses. */
function progressBrief() {
  const drilled = Object.keys(state.progress);
  const lines = [];
  if (!drilled.length) lines.push('No drills done yet.');
  for (const k of drilled) {
    const p = state.progress[k];
    lines.push(`${CONTENT[k] ? CONTENT[k].title : k}: ${p.strong || 0} strong, ${p.weak || 0} weak` +
      (p.weakAreas && p.weakAreas.length ? `; struggled with: ${p.weakAreas.slice(-3).join('; ')}` : ''));
  }
  const unread = SPINE.filter(cid => !chapterDone(cid)).map(cid => CONTENT[cid].title);
  lines.push(`Chapters not finished (${unread.length}): ${unread.slice(0, 12).join(', ')}`);
  const ws = CONTENT['weak-spots'];
  if (ws) lines.push('\nKNOWN WEAK SPOTS:\n' + plain(ws.html).slice(0, 2000));
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
  const here = state.chapter && state.tab === 'book' ? CONTENT[state.chapter] : null;
  $('#ask-ctx').textContent = here ? `Reading: ${here.title}`
    : `${SPINE.length} chapters · ${QUESTIONS.length} questions`;

  if (!ask.turns.length) {
    log.innerHTML = `<div class="ask-empty">
        Ask about anything in the book — a concept, a trade-off, or how to answer
        something about your own experience. Answers come from these chapters and
        cite where they came from.
      </div>` +
      [ here ? `Explain "${here.title}" simply` : 'What should I study first?',
        'What are my weakest areas?',
        'Why is a stale authorization cache a security bug?',
        'How do I answer "why did you leave"?'
      ].map(s => `<button class="ask-chip" data-q="${esc(s)}">${esc(s)}</button>`).join('');
    log.querySelectorAll('[data-q]').forEach(b => {
      b.onclick = () => { $('#ask-input').value = b.dataset.q; askSend(); };
    });
    return;
  }

  log.innerHTML = ask.turns.map(t => t.role === 'you'
    ? `<div class="ask-msg you">${esc(t.text)}</div>`
    : `<div class="ask-msg bot">${t.text ? mdLite(t.text) : '<p class="thinking">Reading the book…</p>'}${
        t.sources && t.sources.length && t.text
          ? `<div class="ask-src">${t.sources.map(s => {
              const c = CONTENT[s.id];
              return `<a class="${s.kind}" data-goto="${s.id}" title="${esc(s.label)}">` +
                (s.kind === 'qa'
                  ? `Q · ${esc(s.label.length > 46 ? s.label.slice(0, 46) + '…' : s.label)}`
                  : `Ch ${c.number} · ${esc(c.title)}`) + `</a>`;
            }).join('')}</div>`
          : ''}</div>`).join('');

  log.querySelectorAll('[data-goto]').forEach(a => {
    a.onclick = () => { askClose(); openChapter(a.dataset.goto); };
  });
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

  // Whatever chapter is open is always relevant to "this"/"here" questions.
  const here = state.chapter && state.tab === 'book' ? state.chapter : null;
  if (here && !hits.some(h => h.id === here)) {
    hits.unshift({ kind: 'prose', id: here, text: searchText()[here].slice(0, 400) });
  }

  const context = hits.map(h => h.kind === 'qa'
    ? `[${CONTENT[h.id].title} — model answer]\n${h.text}`
    : `[${CONTENT[h.id].title}] ${h.text}`).join('\n\n');

  // Cite questions specifically; they are the most useful thing to jump to.
  const sources = [];
  for (const h of hits) {
    const key = h.kind === 'qa' ? 'q:' + h.question : 'c:' + h.id;
    if (!sources.some(s2 => s2.key === key) && sources.length < 4) {
      sources.push({ key, id: h.id, kind: h.kind, label: h.kind === 'qa' ? h.question : CONTENT[h.id].title });
    }
  }

  ask.turns.push({ role: 'bot', text: '', sources });
  renderAsk();
  const idx = ask.turns.length - 1;

  const rules = [
    'You are helping a senior engineer prepare for identity/access-management interviews.',
    'Their prep book is below. Answer from it.',
    '',
    `Answer in under ${intent.words} words. Be direct — no preamble, no "great question".`,
    'Use the book\'s own framing and vocabulary; it is what they will say in the room.',
    'If an extract is marked "model answer", prefer it over re-deriving the point.',
    'If the book does not cover something, say so in one line, then answer briefly',
    'from your own knowledge and flag that you are doing so.',
    'Details only they know are marked FILL IN. Point at those; never invent their history.',
  ];
  if (intent.kind === 'coach') {
    rules.push('', 'Be specific and prescriptive: name chapters and say what to do next.',
                   'Use the progress data below — do not guess at what they have done.');
  }

  const framing = rules.join('\n') + '\n\nBOOK:\n' + context +
    (intent.kind === 'coach' ? '\n\nTHEIR PROGRESS:\n' + progressBrief() : '');

  // Replay only the last two exchanges so the prompt stops growing.
  const prior = ask.turns.slice(0, -2).slice(-4);
  const turns = [{ role: 'user', content: framing + '\n\nQ: ' + (prior.length ? prior[0].text : q) }];
  for (let i = 1; i < prior.length; i++) {
    turns.push({ role: prior[i].role === 'you' ? 'user' : 'assistant', content: prior[i].text });
  }
  if (prior.length) turns.push({ role: 'user', content: q });

  try {
    const res = await sample(turns, {
      modelTier: intent.tier,    // 'quick' for lookups, 'default' when reasoning is needed
      cache: false,
      onText: ({ text }) => { ask.turns[idx].text = text; renderAsk(); },
    });
    ask.turns[idx].text = res.text;
  } catch (e) {
    const code = e && e.code;
    ask.turns[idx].text = code === 'rate_limited' ? '_Rate limited — wait a moment and try again._'
      : code === 'not_granted' ? '_Asking is not available in this view._'
      : '_Something went wrong. Try again._';
    ask.turns[idx].sources = [];
  }
  ask.busy = false;
  renderAsk();
}

function initAsk() {
  $('#ask-fab').onclick = () => askOpen();
  $('#ask-close').onclick = askClose;
  $('#ask-send').onclick = askSend;
  $('#ask-input').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askSend(); }
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ask.open) askClose();
    if (e.key === '/' && !ask.open && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault(); askOpen();
    }
  });
}

/* ---------------------------------------------------------------- misc --- */

function mdLite(t) {
  if (!t) return '';
  let h = esc(t);
  h = h.replace(/```([\s\S]*?)```/g, (m, c) => `<pre>${c.trim()}</pre>`);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  return h.split(/\n{2,}/).map((p) => /^<(ul|pre|h\d)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function syncTabs() {
  for (const t of ['book', 'drill', 'mock', 'progress']) {
    $('#tab-' + t).className = state.tab === t ? 'primary' : '';
  }
}

function render() {
  if (state.tab === 'book') {
    if (state.query) renderSearch();
    else if (state.chapter) renderChapter();
    else renderContents();
  } else if (state.tab === 'drill') renderDrill();
  else if (state.tab === 'mock') renderMock();
  else renderProgress();
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  const s = document.querySelector('.scrim');
  if (s) s.remove();
}

function init() {
  const hash = location.hash.slice(1);
  state.chapter = CONTENT[hash] ? hash : null;

  $('#go-contents').onclick = (e) => {
    e.preventDefault();
    state.chapter = null; state.tab = 'book'; state.query = '';
    $('#search').value = ''; syncTabs(); renderNav(); render(); window.scrollTo(0, 0);
  };

  for (const t of ['book', 'drill', 'mock', 'progress']) {
    $('#tab-' + t).onclick = () => {
      state.tab = t;
      if (t === 'drill') state.drill = null;
      if (t === 'mock') state.mock = null;
      if (t === 'book') state.chapter = null;
      syncTabs(); render(); window.scrollTo(0, 0);
    };
  }

  $('#search').oninput = (e) => {
    state.query = e.target.value.trim();
    state.tab = 'book'; syncTabs(); render();
  };

  $('#menu').onclick = () => {
    $('#sidebar').classList.add('open');
    const scrim = el('div', 'scrim');
    scrim.onclick = closeSidebar;
    document.body.appendChild(scrim);
  };

  $('#theme').onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
    if (next) document.documentElement.setAttribute('data-theme', next);
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('theme', next); } catch (_) {}
    redrawDiagrams();
  };
  try {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (_) {}

  // local fallback so marks survive a refresh even without db
  try {
    const cached = JSON.parse(localStorage.getItem('read') || '{}');
    if (cached && typeof cached === 'object') state.read = cached;
  } catch (_) {}
  const origSave = saveRead;
  window.addEventListener('beforeunload', () => {
    try { localStorage.setItem('read', JSON.stringify(state.read)); } catch (_) {}
  });

  initAsk();
  renderNav(); syncTabs(); render();
}

init();

/* Capabilities resolve later — possibly never. The book above is already
   complete; these only add grading and cross-device persistence. */
(async () => {
  if (!window.claude || !window.claude.use) return;

  try {
    db = await claude.use('db');
    if (db) {
      try {
        const doc = await db.doc('reading/sections').get();
        const val = doc && (doc.data ? doc.data() : doc);
        if (val && val.read) state.read = { ...state.read, ...val.read };
      } catch (_) {}
      try {
        const snap = await db.collection('progress').get();
        for (const d of (snap.docs || snap || [])) {
          const id = d.id || d._id;
          const val = d.data ? d.data() : d;
          if (id) state.progress[id] = val;
        }
      } catch (_) {}
      renderNav();
      if (state.tab === 'progress' || !state.chapter) render();
    }
  } catch (_) {}

  try {
    sample = await claude.use('sample');
    if (sample) {
      $('#ask-fab').hidden = ask.open;      // the book can be asked now
      if (state.tab === 'drill' || state.tab === 'mock') render();
    }
  } catch (_) {}
})();
