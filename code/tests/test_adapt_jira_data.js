#!/usr/bin/env node
/* Jira data adapter tests on the real 2026-10-28 read. Usage: node tests/test_adapt_jira_data.js <raw.json> <base_dir> */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const { adapt, RE_STG } = require('../tools/adapt_jira_data.js');
const [, , rawP, baseDir] = process.argv;
const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
const rd = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : []);
const base = {}; ['items', 'personnes', 'charges', 'stats_jira'].forEach((c) => { base[c] = rd(path.join(baseDir, c)); });
const r = adapt(raw, base, {});
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const ch = (sprint, who, item) => r.doc.charges.find((c) => c.periode.ref === 'jira.gou21-' + sprint && (c.personne === who || c.nom === who) && c.item === item);
const sig = (kind, row) => r.report.signals.some((s) => s.kind === kind && (!row || s.row === row));

ok('STG21 link recognised in both URL forms (browse and service-desk queue), PLQ links ignored', () => {
  assert.strictEqual('https://plq-supportg2.atlassian.net/browse/STG21-286'.match(RE_STG)[1], 'STG21-286');
  assert.strictEqual('https://plq-supportg2.atlassian.net/jira/servicedesk/projects/STG21/queues/custom/1/STG21-226'.match(RE_STG)[1], 'STG21-226');
  assert(!RE_STG.test('https://supportti.lait.qc.ca/browse/PLQ-8398'));
});
ok('Franck flow: points = team per item and sprint (codes de taxes S19: 46 pts, 14 parents, 1 without points)', () => {
  const c = r.doc.charges.find((x) => x.id === 'jira.s19.equipe.saisie-codes-taxes');
  assert.deepStrictEqual([c.mode, c.valeur, c.tickets, c.sans_points, c.nom, 'personne' in c], ['points', 46, 14, 1, 'Équipe', false]);
  assert(!r.doc.charges.some((x) => x.mode === 'points' && x.personne), 'no person carries points');
  // DoD: a cancelled ticket (GOU21-7753, S20) is neither load nor done
  assert(!r.doc.charges.some((x) => x.source.ref.includes('GOU21-7753')));
});
ok('Franck flow: per-person load = sub-tasks (S19, codes de taxes: non-team assignee 15 incl. 10 done; cancelled sub-tasks excluded)', () => {
  const c = ch('s19', 'Personne_15', 'saisie.codes-taxes'); assert.deepStrictEqual([c.mode, c.valeur, c.faites, c.en_cours], ['taches', 15, 10, 2]);
  assert(sig('personne_inconnue', 'Personne_15'));
  const s19 = r.doc.charges.filter((x) => x.mode === 'taches' && x.periode.ref === 'jira.gou21-s19').reduce((n, x) => n + x.valeur, 0);
  assert.strictEqual(s19, 107 - 7); // 107 sub-tasks in S19 read, 7 cancelled
});
ok('R04: a sprint ticket of an epic owned by no item goes to the programme, signalled per epic', () => {
  assert(r.doc.charges.some((x) => x.id === 'jira.s19.equipe.goutte21')); assert(sig('epic_sans_item', 'GOU21-11067'));
});
ok('R10 + DoD: codes de taxes stat = epic counts without the 5 cancelled (44, 12 done) + S19 content (14 tickets, 46 pts, 4 done)', () => {
  const s = r.doc.stats_jira.find((x) => x.item === 'saisie.codes-taxes');
  assert.deepStrictEqual(s.tickets, { total: 44, faits: 12, en_cours: 15, a_faire: 17 });
  assert.deepStrictEqual(s.sprint, { ref: 'jira.gou21-s19', tickets: 14, faits: 4, points: 46, points_faits: 11 });
});
ok('R03: support = STG21 requests behind open GOU21 tickets (STG21-226 via 10412 + 10413 counted once → Région 1; STG21-206 → Producteur 1)', () => {
  const it = r.doc.items.find((i) => i.id === 'run.extranets');
  assert.deepStrictEqual(it.support.map((s) => [s.extranet, s.ouverts]), [['Producteur', 1], ['Région', 1]]);
  assert.strictEqual('https://plq-supportg2.atlassian.net/browse/STG21-226?search_id=x'.match(RE_STG)[1], 'STG21-226');
  assert.strictEqual(it.source.systeme, 'jira'); assert(!('sante' in it));
});
ok('rerun on the written base writes nothing (idempotent)', () => {
  // keys re-sorted as an ArtifactData export does
  const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { o[k] = sortKeys(v[k]); return o; }, {}) : v);
  const b2 = JSON.parse(JSON.stringify(base));
  ['items', 'charges', 'stats_jira'].forEach((c) => (r.doc[c] || []).forEach((x) => { b2[c] = b2[c].filter((y) => y.id !== x.id).concat([sortKeys(x)]); }));
  const r2 = adapt(Object.assign({}, raw, { read_at: '2026-10-28T13:00-04:00' }), b2, {});
  assert.strictEqual(r2.writes.length, 0, r2.writes.map((w) => w.doc_id).join(', '));
  // next Monday, same open tickets: trend appears (0)
  const r3 = adapt(Object.assign({}, raw, { read_at: '2026-11-02T07:05-04:00' }), b2, {});
  assert.deepStrictEqual(r3.doc.items[0].support.map((s) => [s.extranet, s.ouverts, s.tendance]), [['Producteur', 1, 0], ['Région', 1, 0]]);
});
ok('no Z timestamp, ids valid, model 2', () => {
  const s = JSON.stringify(r.doc); assert(!/\d{2}:\d{2}(:\d{2})?Z/.test(s)); assert.strictEqual(r.doc.modele, '2');
  r.doc.charges.concat(r.doc.stats_jira).forEach((x) => assert(/^[a-z0-9][a-z0-9._-]{1,79}$/.test(x.id), x.id));
});
console.log(`\n${n} tests OK`);
