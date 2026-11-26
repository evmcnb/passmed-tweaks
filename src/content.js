/* global PMT_DEFAULTS, PMT_THEMES, PMT_FONTS */
(() => {
  'use strict';
  const root = document.documentElement;
  const onQuestionPage = location.pathname.includes('/question/questions.php');
  let S = { ...PMT_DEFAULTS };

  // ---------- settings ----------
  const isDark = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 140;
  };

  let setBsTheme = false;
  const marketingPage = /^\/(index\.php)?$/.test(location.pathname); // public landing page: themes break its hero
  function apply() {
    const t = marketingPage ? null : S.theme === 'custom'
      ? { dark: isDark(S.customBg), bg: S.customBg, surface: S.customSurface, text: S.customText, accent: S.customAccent }
      : PMT_THEMES[S.theme];
    const cls = {
      'pmt-theme': !!t, 'pmt-dark': !!t?.dark, 'pmt-polish': S.polish, 'pmt-wide': S.wide,
      'pmt-focus': S.focus, 'pmt-hide-ai': S.hideAi, 'pmt-hide-banner': S.hideBanner,
      'pmt-hide-scores': S.hideScores, 'pmt-hide-peer': S.hidePeer, 'pmt-font': !!PMT_FONTS[S.font],
      'pmt-cover-on': S.coverTest && onQuestionPage,
    };
    for (const [c, on] of Object.entries(cls)) root.classList.toggle(c, !!on);
    if (t) {
      root.style.setProperty('--pmt-bg', t.bg);
      root.style.setProperty('--pmt-surface', t.surface);
      root.style.setProperty('--pmt-text', t.text);
      root.style.setProperty('--pmt-accent', t.accent);
      root.style.setProperty('--pmt-accent-text', isDark(t.accent) ? '#fff' : '#111');
      root.setAttribute('data-bs-theme', t.dark ? 'dark' : 'light');
      setBsTheme = true;
    } else if (setBsTheme) {
      root.removeAttribute('data-bs-theme');
      setBsTheme = false;
    }
    root.style.setProperty('--pmt-font', PMT_FONTS[S.font] || 'inherit');
    root.style.setProperty('--pmt-scale', (S.fontScale || 100) / 100);
    resetContrast(); // theme changed: undo earlier fixes, refresh() re-checks against the new colours
  }

  // ---------- contrast safety net ----------
  // Textbook/notes HTML carries its own colours (inline styles, <font color>, highlights) written
  // for a white page. For elements that set a colour, check the text against what's actually behind
  // it and, only if unreadable, switch it to near-black/near-white. The original is kept for undo.
  const COLOURED = '[style*="color"], [style*="background"], font[color], [bgcolor], .text-white, .text-light, .text-dark, .text-black, .text-body, .text-secondary';
  // Computed colours are "rgb(r, g, b[, a])" (0-255) or, for color-mix() results, "color(srgb r g b[ / a])" (0-1).
  function rgba(s) {
    s = String(s);
    const m = (s.match(/-?[\d.]+(e-?\d+)?/g) || []).map(Number);
    const k = s.startsWith('color(') ? 255 : 1;
    return { r: (m[0] || 0) * k, g: (m[1] || 0) * k, b: (m[2] || 0) * k, a: m[3] === undefined ? 1 : m[3] };
  }
  const relLum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a, b) => { const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  function backdrop(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c.a >= 0.5) return c;
    }
    return rgba(getComputedStyle(document.body).backgroundColor);
  }
  function fixContrast() {
    if (!root.classList.contains('pmt-theme') || !document.body) return;
    document.querySelectorAll(`:is(${COLOURED}):not([data-pmt-c])`).forEach((el) => {
      if (el.closest('.pmt-own, #cap, svg')) return;
      el.dataset.pmtC = el.style.getPropertyValue('color') + '|' + el.style.getPropertyPriority('color');
      // dark themes: white/light-grey boxes are just "page" containers written for a white site;
      // drop them (coloured highlights such as yellow are kept)
      if (root.classList.contains('pmt-dark') && el.tagName !== 'IMG' && (el.style.background || el.style.backgroundColor || el.hasAttribute('bgcolor'))) {
        const own = rgba(getComputedStyle(el).backgroundColor);
        if (own.a >= 0.5 && relLum(own) > 0.8 && Math.max(own.r, own.g, own.b) - Math.min(own.r, own.g, own.b) < 24) {
          el.dataset.pmtBg = el.style.getPropertyValue('background-color') + '|' + el.style.getPropertyPriority('background-color');
          el.style.setProperty('background-color', 'transparent', 'important');
        }
      }
      if (!el.textContent.trim()) return;
      const fg = rgba(getComputedStyle(el).color), bg = backdrop(el);
      if (fg.a < 0.3 || contrast(fg, bg) >= 3) return;
      // keep the hue (red stays red): blend toward white on dark backdrops, black on light, until readable
      const to = relLum(bg) > 0.35 ? 0 : 255;
      let c = fg;
      for (let t = 0.15; t <= 1.001 && contrast(c, bg) < 3.5; t += 0.15) {
        c = { r: fg.r + (to - fg.r) * t, g: fg.g + (to - fg.g) * t, b: fg.b + (to - fg.b) * t };
      }
      el.style.setProperty('color', `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`, 'important');
      el.dataset.pmtFixed = '1';
    });
  }
  function resetContrast() {
    document.querySelectorAll('[data-pmt-c]').forEach((el) => {
      if (el.dataset.pmtFixed) {
        const [val, prio] = el.dataset.pmtC.split('|');
        if (val) el.style.setProperty('color', val, prio); else el.style.removeProperty('color');
      }
      if (el.dataset.pmtBg !== undefined) {
        const [val, prio] = el.dataset.pmtBg.split('|');
        if (val) el.style.setProperty('background-color', val, prio); else el.style.removeProperty('background-color');
      }
      delete el.dataset.pmtC;
      delete el.dataset.pmtFixed;
      delete el.dataset.pmtBg;
    });
  }

  // ---------- data from hook.js ----------
  const qdata = new Map();
  const concepts = {};
  let curIdx = null, qStart = Date.now(), qFrozen = null;
  const sessionStart = Date.now();

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.pmt !== 1) return;
    const m = e.data;
    if (m.type === 'qdata' && Array.isArray(m.data?.[0])) {
      m.data[0].forEach((d, i) => { if (d && typeof d === 'object') qdata.set(Number(m.q[i]), d); });
      if (m.data[3] && typeof m.data[3] === 'object') Object.assign(concepts, m.data[3]);
      schedule();
    } else if (m.type === 'cur' && m.idx !== curIdx) {
      curIdx = m.idx; qStart = Date.now(); qFrozen = null;
      schedule();
    }
  });

  // ---------- helpers ----------
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k);
    return el;
  }
  const visible = (el) => !!el && el.offsetParent !== null;
  const plain = (html) => new DOMParser().parseFromString(html || '', 'text/html').body.textContent.trim();

  // Site-provided HTML (concept explanations), stripped of anything executable.
  function safeNodes(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,iframe,object,embed,link,meta,form').forEach((n) => n.remove());
    doc.querySelectorAll('*').forEach((n) => [...n.attributes].forEach((a) => {
      if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name);
    }));
    return [...doc.body.childNodes];
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(refresh, 80); }

  // Structural, not timing-based: unanswered questions render radio options in #div_question_options.
  function qState() {
    const unanswered = !!document.getElementById('div_question_options');
    const answered = !unanswered && (!!document.querySelector('#div_question [id^="BOFoption"]') || visible(document.getElementById('div_post_question')));
    return { unanswered, answered };
  }
  // Questions are identified by their stem text: the site reuses DOM nodes between questions,
  // and current_question (polled) can lag the DOM.
  const qKey = () => (document.getElementById('question_only')?.textContent || '').trim().slice(0, 200);
  const optText = (i) => (document.querySelector(`#option_text_${i}, #BOFoption${i} > span`)?.textContent || '').trim();
  function curData() {
    const first = optText(1);
    const ok = (d) => d && (!first || plain(d.options?.[1]) === first);
    const d = qdata.get(curIdx);
    if (ok(d)) return d;
    for (const x of qdata.values()) if (ok(x)) return x;
    return null;
  }

  function refresh() {
    if (!document.body) return;
    if (onQuestionPage) {
      const { answered, unanswered } = qState();
      wrapExplanation(answered);
      trackBlind(answered, unanswered);
      renderCover(answered);
      markPick(answered);
      logAnswer(answered, unanswered);
      renderInsights();
      renderDock();
      enhanceCards();
    }
    enhanceTables();
    fixContrast();
    enhanceReviewList();
    const box = document.getElementById('div_discuss_question_content');
    if (box) enhanceComments(box);
  }

  // ---------- question insights ----------
  // The site marks a wrong pick with a red left border; a right pick is the green (correct) one + a tick.
  function pickEl() {
    const opts = [...document.querySelectorAll('#div_question [id^="BOFoption"]')];
    const style = (a) => a.getAttribute('style') || '';
    return opts.find((a) => /solid\s+red/i.test(style(a)))
      || (document.querySelector('#navTickCross .bi-check-lg') ? opts.find((a) => /solid\s+green/i.test(style(a))) : null);
  }
  const userPick = () => Number(pickEl()?.id.replace('BOFoption', '') || 0);

  function conceptHistory(d) {
    const raw = concepts[d.concept_id_link]?.concept_history || '';
    return [...raw.matchAll(/([A-Z]),(\d{4}-\d\d-\d\d)[^,]*,(\d)/g)].map((m) => ({ type: m[1], date: m[2], ok: m[3] === '1' }));
  }

  function renderInsights() {
    const host = document.getElementById('div_question');
    const d = curData();
    const answered = visible(document.getElementById('div_post_question'));
    let panel = document.getElementById('pmt-insights');
    const want = S.insights && host && d && (answered || S.insightsPreAnswer);
    if (!want) { panel?.remove(); return; }
    const key = `${d.question_id}|${answered}`;
    if (panel && panel.dataset.key === key && host.contains(panel)) return;
    panel?.remove();
    panel = buildInsights(d, answered);
    panel.dataset.key = key;
    const anchor = host.querySelector(':scope > .question-ai-actions');
    host.insertBefore(panel, anchor);
  }

  function stat(label, value, cls, title) {
    return h('div', { class: 'pmt-stat ' + (cls || ''), title: title || '' }, h('span', { class: 'pmt-stat-v' }, value), h('span', { class: 'pmt-stat-l' }, label));
  }

  function buildInsights(d, answered) {
    const attempts = Number(d.number_attempts) || 0;
    const avg = parseFloat(d.average_score);
    const up = Number(d.up_votes) || 0, down = Number(d.down_votes) || 0;
    const diff = isNaN(avg) ? null
      : avg >= 75 ? ['Easy', 'easy'] : avg >= 55 ? ['Moderate', 'mod'] : avg >= 35 ? ['Hard', 'hard'] : ['Very hard', 'vhard'];

    const stats = h('div', { class: 'pmt-stats' },
      stat('attempts', attempts.toLocaleString()),
      !isNaN(avg) && stat('peers correct', Math.round(avg) + '%'),
      diff && stat('difficulty', diff[0], 'pmt-d-' + diff[1]),
      up + down > 0 && stat('liked', Math.round((up / (up + down)) * 100) + '%', '', `${up} up · ${down} down`),
    );

    const lines = [];
    const guess = guesses.get(qKey());
    if (answered && guess) {
      lines.push(h('div', { class: 'pmt-guess-line' }, 'Your cover-test answer: ', h('i', {}, `"${guess}"`),
        d.correct_answer && d.options?.[d.correct_answer] ? [' · correct: ', h('b', {}, plain(d.options[d.correct_answer]))] : null));
    }
    if (answered && Number(d.question_type) === 0 && d.correct_answer) {
      const n = Number(d.num_of_options) || 0;
      const counts = (d.column_array || []).map(Number);
      const total = counts.slice(1, n + 1).reduce((a, b) => a + b, 0);
      const correct = Number(d.correct_answer);
      const pct = (i) => (total ? Math.round((counts[i] / total) * 100) : 0);
      const opt = (i) => h('b', {}, plain(d.options?.[i]) || `option ${i}`);
      const mine = userPick();
      let worst = 0;
      for (let i = 1; i <= n; i++) if (i !== correct && (counts[i] || 0) > (counts[worst] || 0)) worst = i;
      if (mine && mine === correct) lines.push(h('div', { class: 'pmt-ok' }, `✓ Correct. ${100 - pct(correct)}% of people got this wrong.`));
      else if (mine) lines.push(h('div', { class: 'pmt-bad' }, `✗ ${pct(mine)}% of people also picked `, opt(mine), '.'));
      if (worst && worst !== mine) lines.push(h('div', {}, 'Most common wrong answer: ', opt(worst), ` (${pct(worst)}%)`));
      if (total && total !== attempts) lines.push(h('div', { class: 'pmt-muted' }, `${total.toLocaleString()} answers recorded`));
    }

    const hist = answered ? conceptHistory(d) : [];
    if (hist.length) {
      lines.push(h('div', { class: 'pmt-hist' }, 'Your history with this concept: ',
        hist.map((x) => h('span', { class: 'pmt-chip ' + (x.ok ? 'pmt-chip-ok' : 'pmt-chip-bad'), title: `${x.date} (${x.type === 'Q' ? 'question' : x.type})` }, x.ok ? '✓' : '✗'))));
    }

    const extra = [];
    if (answered && S.conceptExplanation && d.concept_explanation) {
      extra.push(h('details', { class: 'pmt-explain' }, h('summary', {}, 'Concept explanation'), h('div', {}, safeNodes(d.concept_explanation))));
    }

    const idBtn = h('button', { class: 'pmt-link', title: 'Copy question ID', onclick: (e) => {
      navigator.clipboard.writeText(d.question_id); e.target.textContent = 'copied';
      setTimeout(() => { e.target.textContent = d.question_id; }, 1200);
    } }, d.question_id);

    return h('div', { id: 'pmt-insights', class: 'pmt-own' },
      h('div', { class: 'pmt-head' }, h('span', {}, 'Insights'), idBtn),
      stats, lines, extra);
  }

  // ---------- blind block: hide feedback for N questions, then review ----------
  // phase: 'blind' (counting, feedback hidden) → 'done' (N reached, still hidden) → 'review' (shown).
  // Landing on a new unanswered question while reviewing starts the next block.
  let blind = { phase: 'blind', answered: [] };
  try { blind = JSON.parse(sessionStorage.getItem('pmt-blind')) || blind; } catch (e) { /* storage blocked */ }
  const saveBlind = () => { try { sessionStorage.setItem('pmt-blind', JSON.stringify(blind)); } catch (e) { /* ignore */ } };
  const arrivedUnanswered = new Set();

  // The explanation is loose text/<b>/<br> dumped into #div_question after the options; wrap it so CSS can hide it.
  function wrapExplanation(answered) {
    const host = document.getElementById('div_question');
    const list = host?.querySelector(':scope > .list-group');
    if (!answered || !list) return;
    const skip = (n) => n.nodeType === 1 && n.matches('.pmt-own, .pmt-expl, .postquestion-concept-card, .question-ai-actions');
    const loose = [];
    for (let n = list.nextSibling; n; n = n.nextSibling) if (!skip(n)) loose.push(n);
    if (!loose.some((n) => n.nodeType === 1 || n.textContent.trim())) return;
    let wrap = host.querySelector(':scope > .pmt-expl');
    if (!wrap) { wrap = h('div', { class: 'pmt-expl' }); loose[0].before(wrap); }
    wrap.append(...loose);
  }

  function trackBlind(answered, unanswered) {
    if (!S.blindBlock) { root.classList.remove('pmt-blind'); return; }
    if (unanswered) {
      arrivedUnanswered.add(curIdx);
      if (blind.phase === 'review') { blind = { phase: 'blind', answered: [] }; saveBlind(); }
    }
    if (answered && blind.phase === 'blind' && arrivedUnanswered.has(curIdx) && !blind.answered.includes(curIdx)) {
      blind.answered.push(curIdx);
      if (blind.answered.length >= (Number(S.blindBlockSize) || 10)) blind.phase = 'done';
      saveBlind();
    }
    root.classList.toggle('pmt-blind', blind.phase !== 'review');
  }

  // Reveal in place: every question in the block is shown from wherever you are.
  function startReview() {
    blind.phase = 'review';
    saveBlind();
    root.classList.remove('pmt-blind');
    schedule();
  }
  function gotoBlockStart() {
    const first = Math.min(...blind.answered);
    if (isFinite(first) && first !== curIdx) document.querySelector(`.move_to_question[data-destination="${first}"]`)?.click();
  }

  // In blind mode the site's colours are hidden, so outline the option you picked instead.
  // (only touch classes when they change: the page observer would otherwise re-trigger forever)
  const addCls = (el, c) => { if (el && !el.classList.contains(c)) el.classList.add(c); };
  function markPick(answered) {
    const want = answered && S.blindBlock ? pickEl() : null;
    document.querySelectorAll('.pmt-picked').forEach((e) => { if (e !== want) e.classList.remove('pmt-picked'); });
    addCls(want, 'pmt-picked');
  }

  // ---------- cover test: answer before the options appear ----------
  const revealed = new Set();
  const guesses = new Map();
  let coverReveal = null;

  function renderCover(answered) {
    const opts = document.getElementById('div_question_options');
    const cover = document.getElementById('pmt-cover');
    const chip = document.getElementById('pmt-guess');
    const key = qKey();
    coverReveal = null;
    if (!S.coverTest || answered || !opts) { cover?.remove(); chip?.remove(); addCls(opts, 'pmt-revealed'); return; }
    if (revealed.has(key)) {
      cover?.remove();
      addCls(opts, 'pmt-revealed');
      const g = guesses.get(key);
      if (chip && (chip.dataset.key !== key || !g)) chip.remove();
      if (g && !document.getElementById('pmt-guess')) opts.before(h('div', { id: 'pmt-guess', class: 'pmt-own', 'data-key': key }, 'Your answer: ', h('b', {}, g)));
      return;
    }
    // new question in a reused options element: cover it again, drop the previous guess
    if (opts.classList.contains('pmt-revealed')) opts.classList.remove('pmt-revealed');
    chip?.remove();
    const idx = key;
    if (!(cover && cover.dataset.idx === idx && cover.nextElementSibling === opts)) {
      cover?.remove();
      const box = S.coverType ? h('input', { class: 'form-control', type: 'text', placeholder: 'Type your answer (optional)…', autocomplete: 'off' }) : null;
      box?.addEventListener('keydown', (e) => {
        // keep the site's shortcuts (1-6 pick, Enter submit) away from this box; arrows still navigate when empty
        if (!(/^Arrow(Left|Right)$/.test(e.key) && !box.value)) e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); coverReveal?.(); }
      });
      opts.before(h('div', { id: 'pmt-cover', class: 'pmt-own', 'data-idx': idx },
        h('div', { class: 'pmt-cover-t' }, 'Cover test: what\'s your answer?'),
        box,
        h('div', { class: 'pmt-cover-row' },
          h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => coverReveal?.() }, 'Show options'),
          h('small', {}, box ? 'Enter to reveal' : 'Space or Enter to reveal'))));
      if (box) setTimeout(() => box.focus(), 0);
    }
    const input = document.querySelector('#pmt-cover input');
    coverReveal = () => {
      revealed.add(idx);
      if (input?.value.trim()) guesses.set(idx, input.value.trim());
      renderCover(false);
    };
  }

  // While covered: Space/Enter reveals, and the site's 1-6/Enter shortcuts can't answer blind.
  document.addEventListener('keydown', (e) => {
    if (!coverReveal || e.target.closest?.('#pmt-cover')) return;
    if (!document.getElementById('pmt-cover')) return;
    if (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (!/^(Enter| |[1-6])$/.test(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Enter' || e.key === ' ') coverReveal();
  }, true);

  // ---------- local answer log (stats page, peer comparison, Anki export) ----------
  // Stored only in this browser (chrome.storage.local). Missed questions keep full text for export.
  const MAX_LOG = 50000, MAX_MISSED = 3000;
  let pending = null; // { key, t0 } for the unanswered question on screen
  let today = { n: 0, ok: 0, peer: 0 };

  const dayStart = () => new Date().setHours(0, 0, 0, 0);
  function loadToday() {
    chrome.storage.local.get({ pmtLog: [] }, ({ pmtLog }) => {
      const since = dayStart();
      today = { n: 0, ok: 0, peer: 0 };
      for (const e of pmtLog) if (e.t >= since && e.ok !== null) { today.n++; today.ok += e.ok ? 1 : 0; today.peer += e.peer || 0; }
      renderDock(true);
    });
  }

  function logAnswer(answered, unanswered) {
    if (!S.logStats) { pending = null; return; }
    const key = qKey();
    if (unanswered) { if (!pending || pending.key !== key) pending = { key, t0: Date.now() }; return; }
    if (!answered || !pending || pending.key !== key) return;
    const tick = document.querySelector('#navTickCross .bi-check-lg') ? true : document.querySelector('#navTickCross .bi-x-lg') ? false : null;
    const d = curData();
    if ((tick === null || !d) && Date.now() - (pending.answeredAt ||= Date.now()) < 5000) return; // wait for the site to finish rendering
    const p = pending;
    pending = null;
    if (!d) return;
    const entry = {
      id: d.question_id, t: Date.now(), ok: tick, ms: p.answeredAt ? p.answeredAt - p.t0 : Date.now() - p.t0,
      cat: Number(d.category) || 0, peer: parseFloat(d.average_score) || 0, title: d.title || '', concept: d.concept || '',
    };
    const n = Number(d.num_of_options) || 0;
    const missed = tick === false ? {
      id: d.question_id, t: entry.t, cat: entry.cat, title: entry.title, concept: entry.concept,
      stem: document.getElementById('question_only')?.innerText.trim() || '',
      options: Array.from({ length: n }, (_, i) => plain(d.options?.[i + 1])),
      correct: plain(d.options?.[d.correct_answer]), pick: optText(userPick()),
      explanation: plain(d.question_notes), note: plain((d.body || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/gi, '\n')),
    } : null;
    // ponytail: read-modify-write; two tabs answering in the same instant could drop one entry
    chrome.storage.local.get({ pmtLog: [], pmtMissed: [] }, ({ pmtLog, pmtMissed }) => {
      if (pmtLog.some((e) => e.id === entry.id && entry.t - e.t < 10 * 60e3)) return; // same question re-rendered
      pmtLog.push(entry);
      if (missed) pmtMissed.push(missed);
      chrome.storage.local.set({ pmtLog: pmtLog.slice(-MAX_LOG), pmtMissed: pmtMissed.slice(-MAX_MISSED) }, loadToday);
    });
  }

  // ---------- dock: timer + blind block status ----------
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  let tickStarted = false;
  function renderDock() {
    let dock = document.getElementById('pmt-dock');
    if (!document.body) return;
    if (!S.timer && !S.blindBlock && !S.peerCompare) { dock?.remove(); return; }
    if (!dock) {
      dock = h('div', { id: 'pmt-dock', class: 'pmt-own' }, h('span', { class: 'pmt-block' }),
        h('span', { class: 'pmt-today', title: 'Your accuracy today vs the average of everyone who answered the same questions' }),
        h('span', { class: 'pmt-timer', title: 'This question · this session' }));
      document.body.append(dock);
    }
    const you = today.n ? Math.round((today.ok / today.n) * 100) : 0;
    const delta = today.n ? you - Math.round(today.peer / today.n) : 0;
    dock.querySelector('.pmt-today').textContent = S.peerCompare && S.logStats && today.n
      ? `Today ${you}% · peers ${Math.round(today.peer / today.n)}% (${delta >= 0 ? '+' : ''}${delta}) · ${today.n} Q` : '';
    const answered = visible(document.getElementById('div_post_question'));
    if (answered && qFrozen === null) qFrozen = Date.now() - qStart;
    // answered within ~1.5s of arriving = it was already answered (review), no meaningful time
    const q = qFrozen === null ? fmt(Date.now() - qStart) : qFrozen < 1500 ? '–' : fmt(qFrozen);
    const tEl = dock.querySelector('.pmt-timer');
    tEl.textContent = S.timer ? `⏱ ${q} · Σ ${fmt(Date.now() - sessionStart)}` : '';
    // pace alert: amber past the limit, red past double, while the question is still unanswered
    const pace = (Number(S.paceSeconds) || 0) * 1000, el = Date.now() - qStart;
    tEl.classList.toggle('pmt-slow', !!pace && qFrozen === null && el > pace && el <= 2 * pace);
    tEl.classList.toggle('pmt-very-slow', !!pace && qFrozen === null && el > 2 * pace);

    const size = Number(S.blindBlockSize) || 10;
    const state = S.blindBlock ? `${blind.phase}|${blind.answered.length}|${size}` : '';
    const blk = dock.querySelector('.pmt-block');
    if (blk.dataset.state !== state) {
      blk.dataset.state = state;
      const btn = (label, fn, cls) => h('button', { type: 'button', class: 'pmt-dock-btn ' + (cls || ''), onclick: fn }, label);
      blk.replaceChildren(...(!S.blindBlock ? []
        : blind.phase === 'blind' ? [`Blind block ${blind.answered.length}/${size}`, btn('Reveal now', startReview)]
        : blind.phase === 'done' ? [btn(`Block of ${size} done: review answers`, startReview, 'pmt-cta')]
        : ['Reviewing block',
          blind.answered.length > 0 && btn('Block start', gotoBlockStart),
          btn('New block', () => { blind = { phase: 'blind', answered: [] }; saveBlind(); schedule(); })].filter(Boolean)));
    }
    if (!tickStarted) { tickStarted = true; setInterval(renderDock, 1000); }
  }

  // ---------- lab tables: tidy styling, reference column, high/low flags ----------
  const normName = (s) => String(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9+]/g, '');
  const LAB_ALIASES = {
    'na+': 'sodium', na: 'sodium', 'k+': 'potassium', k: 'potassium', hb: 'haemoglobin', hgb: 'haemoglobin', mcv: 'meancellvolume',
    plt: 'platelets', plts: 'platelets', wcc: 'whitebloodcells', wbc: 'whitebloodcells', whitecellcount: 'whitebloodcells',
    neuts: 'neutrophils', lymphs: 'lymphocytes', eos: 'eosinophils', cr: 'creatinine', creat: 'creatinine',
    bili: 'bilirubin', alt: 'alaninetransferase', ast: 'aspartatetransaminase', alp: 'alkalinephosphatase',
    ggt: 'gammaglutamyltransferase', gammagt: 'gammaglutamyltransferase', ygt: 'gammaglutamyltransferase', γgt: 'gammaglutamyltransferase',
    'hco3': 'bicarbonate', bicarb: 'bicarbonate', cl: 'chloride', 'cl+': 'chloride', esr: 'erythrocytesedimentationrate',
    pt: 'prothrombintime', aptt: 'activatedpartialthromboplastintime', tsh: 'thyroidstimulatinghormone',
    ft4: 'freethyroxine', freet4: 'freethyroxine', t4: 'freethyroxine', ca: 'calcium', 'ca2+': 'calcium', adjustedcalcium: 'calcium',
    correctedcalcium: 'calcium', phos: 'phosphate', po4: 'phosphate', ck: 'creatinekinase', urate: 'uricacid',
    retics: 'reticulocytes', ddimer: 'ddimer', b12: 'vitaminb12', be: 'baseexcess', tg: 'triglycerides', chol: 'totalcholesterol',
    pco2: 'pco2', po2: 'po2', pao2: 'po2', paco2: 'pco2',
  };
  // Common tests missing from the site's own list.
  const LAB_EXTRA = { albumin: '35-50 g/L', magnesium: '0.7-1.0 mmol/L', inr: '0.8-1.2', glucose: '4.0-7.8 mmol/L', lactate: '< 2 mmol/L', hba1c: '< 42 mmol/mol' };
  let refMap = null;
  function refRanges() {
    if (refMap && refMap.size > Object.keys(LAB_EXTRA).length) return refMap;
    refMap = new Map(Object.entries(LAB_EXTRA));
    document.querySelectorAll('#ref_range tr').forEach((tr) => {
      const [nameTd, rangeTd] = tr.children;
      const name = nameTd?.textContent.trim();
      if (!name || !rangeTd?.textContent.trim()) return;
      refMap.set(normName(name), rangeTd); // keep the cell so 10<sup>9</sup> survives
      const abbr = name.match(/\(([^)]+)\)/);
      if (abbr) refMap.set(normName(abbr[1]), rangeTd);
    });
    return refMap;
  }
  const lookupRef = (name) => { const k = normName(name); const m = refRanges(); return m.get(k) || m.get(LAB_ALIASES[k]) || null; };

  // "(135 - 145)", "3.5 - 5.0 mmol/L", "< 10", "> 1".
  // "Men: 135-180 Women: 115-160" → widest span, so only values abnormal for either sex get flagged.
  function parseRange(s) {
    s = String(s).replace(/[()]/g, '');
    const all = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(?:-|–)\s*(\d+(?:\.\d+)?)/g)];
    if (/men:/i.test(s)) return all.length ? { lo: Math.min(...all.map((x) => +x[1])), hi: Math.max(...all.map((x) => +x[2])) } : null;
    let m = s.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*\+?(-?\d+(?:\.\d+)?)/);
    if (m) return { lo: +m[1], hi: +m[2] };
    if ((m = s.match(/<\s*(\d+(?:\.\d+)?)/))) return { hi: +m[1] };
    if ((m = s.match(/>\s*(\d+(?:\.\d+)?)/))) return { lo: +m[1] };
    return null;
  }

  function enhanceTables() {
    if (!S.labTables) return;
    document.querySelectorAll('#question_only table, #notecontent table, .pmt-expl table, #ref_range table, #pmt-insights table, #passmedicinenotes table, #et_output table, .tb-results table').forEach((t) => {
      if (t.classList.contains('pmt-table')) return;
      t.classList.add('pmt-table');
      if (!t.closest('#question_only')) return; // only results tables in the stem get the reference column
      const rows = [...t.rows].filter((r) => r.cells.length >= 2 && /^[<>]?\s*-?\d/.test(r.cells[1].textContent.trim()));
      if (!rows.length) return;
      t.classList.add('pmt-lab');
      for (const r of rows) {
        let refCell = r.cells[2];
        if (!refCell) {
          const ref = lookupRef(r.cells[0].textContent);
          refCell = r.insertCell();
          if (ref instanceof Element) refCell.append(...[...ref.cloneNode(true).childNodes]);
          else refCell.textContent = ref || '–';
          refCell.classList.add('pmt-ref-added');
          refCell.title = 'Reference range added by Tweaks for Passmedicine';
        }
        refCell.classList.add('pmt-ref');
        if (!S.labFlags) continue;
        const range = parseRange(refCell.textContent);
        const v = parseFloat(r.cells[1].textContent.replace(/^[<>]\s*/, ''));
        if (!range || isNaN(v)) continue;
        // ponytail: assumes the question uses the same units as the reference range (true for UK SI units)
        const dir = range.hi !== undefined && v > range.hi ? 'hi' : range.lo !== undefined && v < range.lo ? 'lo' : '';
        if (dir) { r.cells[1].classList.add('pmt-' + dir); r.cells[1].append(h('span', { class: 'pmt-flag' }, dir === 'hi' ? ' ↑' : ' ↓')); }
      }
      if (!t.tHead) {
        const head = t.createTHead().insertRow();
        ['Test', 'Result', 'Reference'].forEach((x) => { const th = document.createElement('th'); th.textContent = x; head.append(th); });
      }
    });
  }

  // ---------- review list: peer % correct per question + sort by difficulty ----------
  // Row N's Review button (data-q=N) matches question N of the site's question data once the list is shown.
  // We fetch that data the same way the site does (10 at a time) and check titles match before trusting it.
  const peerCache = new Map(); // `${idx}|${title}` → peer %
  let reviewLoading = false;
  const rowTitle = (tr) => tr.querySelector('b')?.textContent.trim() || '';

  async function enhanceReviewList() {
    if (!S.reviewDifficulty || reviewLoading) return;
    const rows = [...document.querySelectorAll('#main_container tr')].filter((tr) => tr.querySelector('.review_question_link[data-q]'));
    if (!rows.length) return;
    const table = rows[0].closest('table');
    document.querySelectorAll('.pmt-rsort').forEach((s) => { if (s.nextElementSibling !== table) s.remove(); });
    if (!table.previousElementSibling?.classList.contains('pmt-rsort')) {
      rows.forEach((tr, i) => { tr.dataset.pmtOrder = i; });
      const sel = h('select', { class: 'form-select form-select-sm pmt-rsort pmt-own', title: 'Sort by how many people get it right', onchange: () => sortReview(table, sel.value) },
        h('option', { value: '' }, 'Site order'), h('option', { value: 'hard' }, 'Hardest first (peers)'), h('option', { value: 'easy' }, 'Easiest first (peers)'));
      table.before(sel);
    }
    const todo = rows.filter((tr) => !tr.querySelector('.pmt-peer'));
    const missing = todo.filter((tr) => !peerCache.has(`${tr.querySelector('.review_question_link').dataset.q}|${rowTitle(tr)}`));
    reviewLoading = true;
    try {
      for (let i = 0; i < missing.length; i += 10) {
        const batch = missing.slice(i, i + 10).map((tr) => Number(tr.querySelector('.review_question_link').dataset.q));
        const url = new URL('/question/multi_ajax_question_data.php?' + batch.map((q) => 'q%5B%5D=' + q).join('&'), location.href);
        // Firefox: content.fetch makes the request as the page (same cookies/origin as the site's own call)
        const res = await (globalThis.content?.fetch ?? fetch)(url, { credentials: 'include' });
        const data = (await res.json())?.[0] || [];
        data.forEach((d, j) => { if (d && d.title) peerCache.set(`${batch[j]}|${d.title.trim()}`, parseFloat(d.average_score)); });
      }
    } catch (e) { /* network or format change: leave rows as they are */ }
    reviewLoading = false;
    for (const tr of todo) {
      if (tr.querySelector('.pmt-peer')) continue;
      const v = peerCache.get(`${tr.querySelector('.review_question_link').dataset.q}|${rowTitle(tr)}`);
      const cls = v === undefined || isNaN(v) ? '' : v >= 75 ? 'easy' : v >= 55 ? 'mod' : v >= 35 ? 'hard' : 'vhard';
      tr.dataset.peer = isNaN(v) || v === undefined ? '' : v;
      const td = h('td', { class: 'pmt-peer pmt-own', title: 'Peers who got this right' }, cls ? h('span', { class: 'pmt-peer-badge pmt-d-' + cls }, Math.round(v) + '%') : '–');
      tr.querySelector('.review_question_link').closest('td').before(td);
    }
  }

  function sortReview(table, mode) {
    const rows = [...table.querySelectorAll('tr[data-pmt-order]')];
    const val = (tr) => (tr.dataset.peer === '' || tr.dataset.peer === undefined ? (mode === 'hard' ? 999 : -1) : +tr.dataset.peer);
    rows.sort((a, b) => (mode === 'hard' ? val(a) - val(b) : mode === 'easy' ? val(b) - val(a) : a.dataset.pmtOrder - b.dataset.pmtOrder));
    rows.forEach((tr) => tr.parentNode.append(tr));
  }

  // ---------- collapsible side boxes (Textbooks, Content Map, Links, Media, Dashboard) ----------
  let collapsed = {};
  try { collapsed = JSON.parse(localStorage.getItem('pmt-collapsed')) || {}; } catch (e) { /* storage blocked */ }
  function enhanceCards() {
    document.querySelectorAll('#div_container .card.mb-3[id]').forEach((card) => {
      const head = card.querySelector(':scope > .card-header');
      if (!head || head.querySelector('.pmt-collapse')) return;
      const set = (on) => { card.classList.toggle('pmt-card-collapsed', on); btn.setAttribute('aria-expanded', String(!on)); };
      const btn = h('button', { type: 'button', class: 'pmt-collapse pmt-own', title: 'Collapse / expand', onclick: (e) => {
        e.stopPropagation();
        const on = !card.classList.contains('pmt-card-collapsed');
        set(on);
        collapsed[card.id] = on;
        try { localStorage.setItem('pmt-collapsed', JSON.stringify(collapsed)); } catch (err) { /* ignore */ }
      } });
      head.classList.add('pmt-card-head');
      head.append(btn);
      set(!!collapsed[card.id]);
    });
  }

  // ---------- comments ----------
  const isTop = (n) => n.nodeType === 1 && n.tagName === 'DIV' && /border-left/.test(n.getAttribute('style') || '');
  const meta = (h6) => {
    const t = h6?.querySelector('i')?.textContent || '';
    const m = t.match(/^(.*?)\s*-\s*(\d{1,2} \w{3} \d{2})\s*$/);
    return { author: m ? m[1].trim() : t, date: m ? new Date(m[2].replace(/(\d{2})$/, '20$1')).getTime() || 0 : 0 };
  };

  const isAnon = (a) => !a || /^anonymous$/i.test(a);
  const hue = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  function ago(t) {
    if (!t) return '';
    const days = Math.round((t - Date.now()) / 864e5);
    return Math.abs(days) < 30 ? rtf.format(days, 'day') : Math.abs(days) < 365 ? rtf.format(Math.round(days / 30), 'month') : rtf.format(Math.round(days / 365), 'year');
  }
  // Header for a comment: avatar, name, OP/you badges, who it replies to, relative date.
  function cHeader(m, { op, mine, replyTo }) {
    const anon = isAnon(m.author);
    const initials = anon ? '?' : m.author.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return h('div', { class: 'pmt-chead pmt-own' },
      h('span', { class: 'pmt-av' + (anon ? ' pmt-av-anon' : ''), style: `--h:${anon ? 0 : hue(m.author)}` }, initials),
      h('b', { class: 'pmt-author' }, m.author || 'Anonymous'),
      op && h('span', { class: 'pmt-badge', title: 'Wrote the original comment' }, 'OP'),
      mine && h('span', { class: 'pmt-badge pmt-badge-you' }, 'you'),
      replyTo && h('span', { class: 'pmt-to' }, '↳ ', replyTo),
      h('span', { class: 'pmt-date', title: m.date ? new Date(m.date).toDateString() : '' }, ago(m.date)));
  }

  function enhanceComments(box) {
    if (!S.comments || box.querySelector(':scope > .pmt-cbar')) return;
    const nodes = [...box.childNodes];
    const first = nodes.findIndex(isTop);
    if (first < 0) return;
    const me = (document.getElementById('Qnickname')?.value || '').trim().toLowerCase();
    const list = h('div', { class: 'pmt-threads' });
    box.insertBefore(list, nodes[first]); // anchor before nodes get moved into threads

    let thread = null;
    for (const n of nodes.slice(first)) {
      if (isTop(n)) { thread = newThread(n, me); list.append(thread.el); continue; }
      if (!thread) continue;
      const isP = n.nodeType === 1 && n.tagName === 'P';
      if (isP && n.querySelector('textarea')) thread.box.append(n);
      else if (isP && n.textContent.trim()) { thread.cur = h('div', { class: 'pmt-reply' }, n); thread.replies.append(thread.cur); }
      else if (n.nodeType === 1 && n.tagName === 'H6') {
        (thread.cur || thread.el).append(n);
        if (thread.cur) {
          const m = meta(n);
          const mine = !!me && m.author.toLowerCase() === me;
          if (mine) thread.cur.classList.add('pmt-mine');
          thread.cur.prepend(cHeader(m, { mine, op: !isAnon(m.author) && m.author === thread.author, replyTo: thread.author || 'Anonymous' }));
        }
        thread.cur = null;
      } else n.remove();
    }

    for (const t of list.children) finishThread(t);

    const sort = h('select', { class: 'form-select form-select-sm', onchange: (e) => { S.commentSort = e.target.value; sortThreads(list); } },
      [['top', 'Top'], ['new', 'Newest'], ['old', 'Oldest'], ['replies', 'Most replies']].map(([v, l]) => {
        const o = h('option', { value: v }, l); if (v === S.commentSort) o.selected = true; return o;
      }));
    const search = h('input', { class: 'form-control form-control-sm', type: 'search', placeholder: 'Search comments…', oninput: () => applyCommentFilters(box) });
    const toggleAll = h('button', { class: 'btn btn-sm btn-outline-secondary', onclick: () => {
      const open = !list.querySelector('.pmt-thread:not(.pmt-collapsed)');
      list.querySelectorAll('.pmt-thread').forEach((t) => t.classList.toggle('pmt-collapsed', !open));
    } }, 'Toggle replies');
    const info = h('span', { class: 'pmt-cinfo' });
    box.insertBefore(h('div', { class: 'pmt-cbar pmt-own' }, sort, search, toggleAll, info), list);
    sortThreads(list);
    applyCommentFilters(box);
  }

  function newThread(top, me) {
    const el = h('div', { class: 'pmt-thread' }, top);
    const replies = h('div', { class: 'pmt-replies' });
    const box = h('div', { class: 'pmt-replybox' });
    el.append(replies, box);
    const m = meta(top.querySelector('h6'));
    el.dataset.score = parseInt(top.querySelector('[id^="comment_rating_"]')?.textContent, 10) || 0;
    el.dataset.date = m.date;
    const mine = !!me && m.author.toLowerCase() === me;
    if (mine) el.classList.add('pmt-mine');
    top.prepend(cHeader(m, { mine }));
    return { el, replies, box, cur: null, author: m.author };
  }

  function finishThread(t) {
    const replies = t.querySelector('.pmt-replies');
    const box = t.querySelector('.pmt-replybox');
    const n = replies.children.length;
    t.dataset.replies = n;
    if (S.collapseReplies && n) t.classList.add('pmt-collapsed');
    const tools = h('div', { class: 'pmt-ttools' });
    if (n) tools.append(h('button', { class: 'pmt-link', onclick: () => t.classList.toggle('pmt-collapsed') }, `${n} repl${n === 1 ? 'y' : 'ies'}`));
    if (box.querySelector('textarea')) {
      if (S.hideReplyBoxes) box.hidden = true;
      tools.append(h('button', { class: 'pmt-link', onclick: () => { box.hidden = !box.hidden; if (!box.hidden) box.querySelector('textarea').focus(); } }, 'Reply'));
    }
    t.insertBefore(tools, replies);
  }

  function sortThreads(list) {
    const key = { top: (t) => -t.dataset.score, new: (t) => -t.dataset.date, old: (t) => +t.dataset.date, replies: (t) => -t.dataset.replies }[S.commentSort] || (() => 0);
    [...list.children].sort((a, b) => key(a) - key(b)).forEach((t) => list.append(t));
  }

  function applyCommentFilters(box) {
    const q = (box.querySelector('.pmt-cbar input')?.value || '').toLowerCase();
    const min = Number(S.minCommentScore) || 0;
    let hidden = 0, shown = 0;
    box.querySelectorAll('.pmt-thread').forEach((t) => {
      const lowScore = !t.classList.contains('pmt-mine') && Number(t.dataset.score) < min && !t._showLow;
      const match = !q || t.textContent.toLowerCase().includes(q);
      t.hidden = lowScore || !match;
      if (lowScore && match) hidden++;
      if (!t.hidden) shown++;
    });
    const info = box.querySelector('.pmt-cinfo');
    info.replaceChildren(`${shown} thread${shown === 1 ? '' : 's'}`);
    if (hidden) info.append(' · ', h('button', { class: 'pmt-link', onclick: () => {
      box.querySelectorAll('.pmt-thread').forEach((t) => { t._showLow = true; });
      applyCommentFilters(box);
    } }, `show ${hidden} below ${min}`));
  }

  // Ctrl/Cmd+Enter submits the comment box you're typing in (the site's own submit button).
  document.addEventListener('keydown', (e) => {
    if (!S.comments || e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
    const ta = e.target;
    if (ta.id === 'Qnewqa') document.getElementById('Qsubmitnewqa')?.click();
    else if (ta.classList?.contains('Qqaresponse')) {
      ta.parentElement.querySelector(`.Qsubmitqaresponse[data-responseidlink="${ta.dataset.responseidlink}"]`)?.click();
    } else return;
    e.preventDefault();
  });

  // ---------- watch the page ----------
  const start = () => {
    new MutationObserver((muts) => {
      if (!muts.some((m) => !(m.target.nodeType === 1 ? m.target : m.target.parentElement)?.closest('.pmt-own'))) return;
      if (onQuestionPage && S.coverTest) renderCover(qState().answered); // immediately, so new options never flash
      schedule();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    schedule();
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  chrome.storage.sync.get(PMT_DEFAULTS, (s) => { S = s; apply(); schedule(); if (onQuestionPage) loadToday(); });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'sync') return;
    for (const k in ch) S[k] = ch[k].newValue;
    apply();
    document.getElementById('pmt-insights')?.remove();
    const box = document.getElementById('div_discuss_question_content');
    if (box?.querySelector('.pmt-cbar')) applyCommentFilters(box);
    schedule();
  });
})();
