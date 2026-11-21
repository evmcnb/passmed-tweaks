/* global pmtCategory */
// Pure helpers first (tested by test/stats.test.js), DOM rendering at the bottom.
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const dayKey = (t) => new Date(t).toLocaleDateString('en-CA'); // local YYYY-MM-DD
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function agg(rows) {
  return {
    n: rows.length,
    ok: rows.filter((e) => e.ok).length,
    peer: rows.reduce((s, e) => s + (e.peer || 0), 0),
    ms: rows.reduce((s, e) => s + (e.ms || 0), 0),
  };
}

function summarize(log) {
  const done = log.filter((e) => e.ok === true || e.ok === false);
  const group = (key) => {
    const m = new Map();
    for (const e of done) { const k = key(e); if (!m.has(k)) m.set(k, []); m.get(k).push(e); }
    return [...m].map(([k, rows]) => ({ k, ...agg(rows) }));
  };
  const days = new Set(done.map((e) => dayKey(e.t)));
  let streak = 0;
  for (const d = new Date(); days.has(dayKey(d)); d.setDate(d.getDate() - 1)) streak++;
  return {
    done, all: agg(done), streak,
    byCat: group((e) => e.cat), byTitle: group((e) => e.title || '(untitled)'), byDay: group((e) => dayKey(e.t)),
  };
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');

function toAnki(missed, categoryName) {
  const lines = ['#separator:tab', '#html:true', '#tags column:3'];
  for (const m of missed) {
    const front = esc(m.stem) + (m.options?.length ? '<ol type="A">' + m.options.map((o) => `<li>${esc(o)}</li>`).join('') + '</ol>' : '');
    const back = `<b>${esc(m.correct)}</b>`
      + (m.pick ? `<br><small>You picked: ${esc(m.pick)}</small>` : '')
      + (m.concept ? `<br><br><i>${esc(m.concept)}</i>` : '')
      + (m.explanation ? `<br><br>${esc(m.explanation)}` : '')
      + (m.note ? `<hr><b>${esc(m.title)}</b><br>${esc(m.note)}` : '');
    const tags = ['passmed', slug(categoryName(m.cat)), slug(m.title)].filter(Boolean).join(' ');
    lines.push([front, back, tags].join('\t'));
  }
  return lines.join('\n') + '\n';
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
function toCSV(log, categoryName) {
  const rows = [['id', 'date', 'correct', 'seconds', 'category', 'peer_correct_pct', 'topic']];
  for (const e of log) rows.push([e.id, new Date(e.t).toISOString(), e.ok === null ? '' : e.ok ? 1 : 0, Math.round((e.ms || 0) / 1000), categoryName(e.cat), e.peer, e.title]);
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

if (typeof module !== 'undefined') module.exports = { summarize, toAnki, toCSV, esc };

// ---------------- page ----------------
if (typeof document !== 'undefined') {
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const signed = (n) => (n > 0 ? '+' : '') + n;
  const download = (name, text, type) => {
    const a = el('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  function card(label, value, sub) {
    const c = el('div', 'card');
    c.append(el('div', 'v', value), el('div', 'l', label));
    if (sub) c.append(el('div', 's', sub));
    return c;
  }

  function table(head, rows) {
    const t = el('table');
    const tr = el('tr');
    head.forEach((h) => tr.append(el('th', '', h)));
    t.append(tr);
    for (const r of rows) {
      const row = el('tr');
      r.forEach((c) => { const td = el('td'); if (c instanceof Node) td.append(c); else td.textContent = c; row.append(td); });
      t.append(row);
    }
    return t;
  }

  const deltaEl = (you, peer) => el('span', you - peer >= 0 ? 'up' : 'down', signed(you - peer));

  function render(log, missed) {
    const s = summarize(log);
    const a = s.all;
    $('#overview').replaceChildren(
      card('answered', a.n.toLocaleString()),
      card('your accuracy', pct(a.ok, a.n) + '%'),
      card('peers on same Qs', pct(a.peer, a.n * 100) + '%', a.n ? signed(pct(a.ok, a.n) - pct(a.peer, a.n * 100)) + ' vs peers' : ''),
      card('avg time / Q', a.n ? Math.round(a.ms / a.n / 1000) + 's' : '–'),
      card('day streak', String(s.streak)));

    // last 14 days
    const days = new Map(s.byDay.map((d) => [d.k, d]));
    const max = Math.max(1, ...s.byDay.map((d) => d.n));
    const bars = el('div', 'bars');
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dayKey(d), x = days.get(k);
      const col = el('div', 'bar');
      const fill = el('div', 'fill');
      fill.style.height = `${x ? (x.n / max) * 100 : 0}%`;
      if (x) fill.style.background = `hsl(${Math.round(pct(x.ok, x.n) * 1.2)} 60% 50%)`;
      col.title = x ? `${k}: ${x.n} Qs, ${pct(x.ok, x.n)}% (peers ${pct(x.peer, x.n * 100)}%)` : `${k}: none`;
      col.append(fill, el('div', 'lbl', d.toLocaleDateString('en-GB', { weekday: 'narrow' })));
      bars.append(col);
    }
    $('#days').replaceChildren(bars);

    const cats = s.byCat.map((c) => ({ ...c, you: pct(c.ok, c.n), them: pct(c.peer, c.n * 100) })).sort((x, y) => (x.you - x.them) - (y.you - y.them));
    $('#cats').replaceChildren(cats.length ? table(['Category', 'Qs', 'You', 'Peers', '±'], cats.map((c) => [pmtCategory(c.k), c.n, c.you + '%', c.them + '%', deltaEl(c.you, c.them)])) : el('p', 'muted', 'No answers logged yet.'));

    const weak = s.byTitle.filter((t) => t.n - t.ok >= 1).map((t) => ({ ...t, you: pct(t.ok, t.n) }))
      .sort((x, y) => (y.n - y.ok) - (x.n - x.ok) || x.you - y.you).slice(0, 20);
    $('#weak').replaceChildren(weak.length ? table(['Topic', 'Wrong', 'Seen', 'You'], weak.map((t) => [t.k, t.n - t.ok, t.n, t.you + '%'])) : el('p', 'muted', 'Nothing missed yet.'));

    const wins = s.done.filter((e) => e.ok && e.peer).sort((x, y) => x.peer - y.peer).slice(0, 8);
    $('#wins').replaceChildren(wins.length ? table(['Topic', 'Peers correct'], wins.map((e) => [e.title, Math.round(e.peer) + '%'])) : el('p', 'muted', '–'));

    const week = Date.now() - 7 * 864e5;
    $('#missedCount').textContent = `${missed.length} missed questions saved (${missed.filter((m) => m.t >= week).length} this week).`;
    $('#ankiAll').onclick = () => download('passmed-missed.txt', toAnki(missed, pmtCategory), 'text/plain');
    $('#ankiWeek').onclick = () => download('passmed-missed-week.txt', toAnki(missed.filter((m) => m.t >= week), pmtCategory), 'text/plain');
    $('#csv').onclick = () => download('passmed-log.csv', toCSV(log, pmtCategory), 'text/csv');
    $('#clear').onclick = () => {
      if (confirm('Delete all logged answers and saved missed questions from this browser? This cannot be undone.')) {
        chrome.storage.local.remove(['pmtLog', 'pmtMissed'], load);
      }
    };
  }

  const load = () => chrome.storage.local.get({ pmtLog: [], pmtMissed: [] }, ({ pmtLog, pmtMissed }) => render(pmtLog, pmtMissed));
  load();
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local') load(); });
}
