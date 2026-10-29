#!/usr/bin/env node
/* Core tests for R06 part 2 (planned vs actual window, gates, cascade) on the real base of 2026-10-28.
 * Usage: node tests/test_core_r06.js <base_dir with items/ jalons/ stats_jira/> <jira_out_doc.json> */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const C = require('../interface/core.js');
const [, , baseDir, jiraDocP] = process.argv;
const rd = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : []);
const base = C.emptyBase(); ['items', 'jalons', 'stats_jira'].forEach((c) => { base[c] = rd(path.join(baseDir, c)); });
const jd = JSON.parse(fs.readFileSync(jiraDocP, 'utf8'));
jd.stats_jira.forEach((s) => { base.stats_jira = base.stats_jira.filter((x) => x.id !== s.id).concat([s]); });
const it = (id) => base.items.find((i) => i.id === id);
const today = '2026-10-28';
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };

ok('actual window of codes de taxes = its Jira sprints (28 jul → open, planned to 27 nov)', () => {
  const r = C.fenetreReelle(base, it('saisie.codes-taxes'));
  assert.deepStrictEqual([r.debut, r.fin, r.jusqu_au, r.origine], ['2026-07-28', null, '2026-11-27', 'propre']);
});
ok('L8: no epic of its own → actual window cascades from L8D and codes de taxes (earliest start, open)', () => {
  const r = C.fenetreReelle(base, it('goutte21.l8'));
  assert.deepStrictEqual([r.debut, r.fin, r.origine], ['2026-07-28', null, 'enfants']);
});
ok('L8D: own epic (from 18 aug) united with its deliverable codes de taxes (from 28 jul)', () => {
  const r = C.fenetreReelle(base, it('goutte21.l8d'));
  assert.deepStrictEqual([r.debut, r.fin, r.jusqu_au, r.origine], ['2026-07-28', null, '2026-11-27', 'propre+enfants']);
});
ok('planned window: none today (columns empty) → null; with deliverable windows → cascade min/max', () => {
  assert.strictEqual(C.fenetrePrevue(base, it('goutte21.l8d')), null);
  const b = JSON.parse(JSON.stringify(base));
  b.items.find((i) => i.id === 'saisie.codes-taxes').fenetre = { debut: '2026-04-01', fin: '2027-01-31' };
  b.items.find((i) => i.id === 'goutte21.l8d1.1.3').fenetre = { debut: '2026-05-01', fin: '2027-03-31' };
  const pv = C.fenetrePrevue(b, b.items.find((i) => i.id === 'goutte21.l8d'));
  assert.deepStrictEqual([pv.debut, pv.fin, pv.origine], ['2026-04-01', '2027-03-31', 'enfants']);
  assert.deepStrictEqual(C.fenetrePrevue(b, b.items.find((i) => i.id === 'goutte21.l8')).fin, '2027-03-31');
});
ok('gates cascade: parent MEP = latest child MEP, done only when every child is done; overdue child → parent overdue', () => {
  const b = JSON.parse(JSON.stringify(base)); const src = { systeme: 'smartsheet', lu_le: '2026-10-28T16:30-04:00' };
  b.jalons.push({ id: 'saisie.codes-taxes.qa-3', item: 'saisie.codes-taxes', nom: 'QA-3 MEP', date: '2027-01-31', statut: 'a_venir', precision: 'mois', source: src });
  b.jalons.push({ id: 'goutte21.l8d1.1.3.qa-3', item: 'goutte21.l8d1.1.3', nom: 'QA-3 MEP', date: '2027-03-31', statut: 'a_venir', precision: 'mois', source: src });
  b.jalons.push({ id: 'goutte21.l8d1.1.3.ac-4', item: 'goutte21.l8d1.1.3', nom: 'AC-4 GO Dev', date: '2026-09-30', statut: 'a_venir', precision: 'mois', source: src });
  const g = C.gatesOf(b, b.items.find((i) => i.id === 'goutte21.l8d'), today);
  const mep = g.find((x) => x.gate === 'qa-3'); const go = g.find((x) => x.gate === 'ac-4');
  assert.deepStrictEqual([mep.date, mep.statut, mep.derive], ['2027-03-31', 'a_venir', true]);
  assert.strictEqual(go.statut, 'depasse');
  assert.strictEqual(C.retardGate(go, today), C.workingDaysBetween('2026-09-30', today));
});
ok('retard of a done gate = working days between planned date and Date check; on time = 0', () => {
  assert.strictEqual(C.retardGate({ statut: 'fait', date: '2026-10-31', fait_le: '2026-11-04' }, today), 3); // Mon 2, Tue 3, Wed 4 Nov
  assert.strictEqual(C.retardGate({ statut: 'fait', date: '2026-10-31', fait_le: '2026-10-21' }, today), 0);
});
ok('an item with its own gates does not get cascaded ones', () => {
  const b = JSON.parse(JSON.stringify(base));
  b.jalons.push({ id: 'goutte21.l8d.qa-3', item: 'goutte21.l8d', nom: 'QA-3 MEP', date: '2027-02-28', statut: 'a_venir', source: { systeme: 'saisie', lu_le: '2026-10-28T16:30-04:00' } });
  assert(C.gatesOf(b, b.items.find((i) => i.id === 'goutte21.l8d'), today).every((x) => !x.derive));
});
console.log(`\n${n} core R06 tests OK`);
