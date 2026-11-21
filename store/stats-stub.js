// Fake, deterministic data for the store screenshot (no real user data).
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const topics = [['Primary biliary cholangitis', 4], ['Atrial fibrillation: anticoagulation', 4], ['Pre-eclampsia', 6], ['Bronchiolitis', 8], ['Lithium toxicity', 10], ['Appendicitis', 12], ['Glaucoma', 7], ['Asthma: management', 4], ['Hypercalcaemia', 4], ['Ectopic pregnancy', 6]];
const log = [], now = Date.now();
for (let i = 0; i < 420; i++) {
  const [title, cat] = topics[Math.floor(rnd() * topics.length)];
  const day = Math.floor(rnd() * rnd() * 14);
  log.push({ id: 'q' + i, t: now - day * 864e5, ok: rnd() < (title.includes('Lithium') ? 0.45 : 0.74), ms: 25000 + rnd() * 80000, cat, peer: 45 + rnd() * 35, title });
}
window.chrome = { storage: { local: { get: (d, cb) => cb({ pmtLog: log, pmtMissed: log.filter((e) => !e.ok).slice(0, 96) }), remove: (k, cb) => cb() }, onChanged: { addListener() {} } } };
