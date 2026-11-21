// node test/stats.test.js
const assert = require('assert');
const { summarize, toAnki, toCSV } = require('../stats.js');

const now = Date.now();
const log = [
  { id: 'a', t: now, ok: true, ms: 30000, cat: 4, peer: 60, title: 'Murmurs' },
  { id: 'b', t: now, ok: false, ms: 90000, cat: 4, peer: 80, title: 'Murmurs' },
  { id: 'c', t: now - 864e5, ok: true, ms: 60000, cat: 12, peer: 40, title: 'Hernia' },
  { id: 'd', t: now, ok: null, ms: 1, cat: 1, peer: 50, title: 'Skipped' }, // unknown result: ignored
];
const s = summarize(log);
assert.deepStrictEqual([s.all.n, s.all.ok, s.all.peer, s.all.ms], [3, 2, 180, 180000]);
assert.strictEqual(s.streak, 2);
assert.deepStrictEqual(s.byCat.find((c) => c.k === 4).n, 2);
assert.strictEqual(s.byTitle.find((t) => t.k === 'Murmurs').ok, 1);

const anki = toAnki([{ stem: 'Tab\there\nnew <b>', options: ['A&B'], correct: 'X', title: 'My Topic', cat: 4 }], () => 'Medicine');
const card = anki.trim().split('\n').pop().split('\t');
assert.strictEqual(card.length, 3, 'stray tabs/newlines must not split fields');
assert.ok(card[0].startsWith('Tab here<br>new &lt;b&gt;'));
assert.ok(card[0].includes('<li>A&amp;B</li>'));
assert.strictEqual(card[2], 'passmed medicine my_topic');

const csv = toCSV([{ id: 'x', t: 0, ok: false, ms: 1500, cat: 4, peer: 50, title: 'a, "b"' }], () => 'Medicine').split('\n');
assert.strictEqual(csv[1], 'x,1970-01-01T00:00:00.000Z,0,2,Medicine,50,"a, ""b"""');
console.log('stats ok');
