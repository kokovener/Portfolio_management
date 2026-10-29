#!/usr/bin/env node
/* Smartsheet adapter v4 tests (R06 + R30) on the real 2026-10-28 read (94 rows).
 * Usage: node tests/test_adapt_smartsheet.js <raw.json> <base_before_dir> */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const { adapt, sheetParent } = require('../tools/adapt_smartsheet.js');
const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rd = (d) => fs.readdirSync(d).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')));
const base = { items: rd(path.join(process.argv[3], 'items')), risques: rd(path.join(process.argv[3], 'risques')) };
const clone = (x) => JSON.parse(JSON.stringify(x));
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const r = adapt(raw, base, { 'items/goutte21.l8d': 6 });
const it = (res, id) => res.doc.items.find((i) => i.id === id);
const SS_URL = 'https://app.smartsheet.com/sheets/2xqXgjQ4P7vVpGc423cRfpqrfMPw9QJwJpMF8h61?rowId=';

ok('real read: 94 rows, grain L/Sub-L = 22, units and entities not created unless ticked', () => {
  assert.strictEqual(r.report.lignes_lues, 94); assert.strictEqual(r.report.grain, 22);
  assert(!it(r, 'goutte21.l8d1') && !it(r, 'goutte21.l0.1.1') && !it(r, 'goutte21.l8d1.1.3') && !it(r, 'goutte21.l9'));
});
ok('structural parent from WBS ID', () => {
  assert.deepStrictEqual(['L8D1.1.2', 'L8D1.1', 'L8D1', 'L8D', 'L0.1', 'L8B10.1', 'L8B10', 'L3-L4', 'L8'].map(sheetParent), ['L8D1.1', 'L8D1', 'L8D', 'L8', 'L0', 'L8B10', 'L8B', null, null]);
});
ok('R06 A Revoir = paused: L3-L4, L5, L6 -> étape qualifié (no freshness alert), phase kept', () => {
  ['goutte21.l3-l4', 'goutte21.l5', 'goutte21.l6'].forEach((id) => { assert.strictEqual(it(r, id).etape, 'qualifie'); assert.strictEqual(it(r, id).phase_source, 'A Revoir'); });
});
ok('R06 parent phase deduced: L8D = Dev (L8D1), L8 = BA (least advanced of L8D Dev, L8B BA), L0.1 = AF / UX', () => {
  assert.strictEqual(it(r, 'goutte21.l8d').phase_source, 'Dev'); assert.strictEqual(it(r, 'goutte21.l8d').phase_deduite, true);
  assert.strictEqual(it(r, 'goutte21.l8').phase_source, 'BA'); assert.strictEqual(it(r, 'goutte21.l0.1').phase_source, 'AF / UX');
  assert(!('phase_deduite' in it(r, 'goutte21.l0'))); // own phase
});
ok('R06 all-Backlog children: L8E deduced Backlog -> étape qualifié', () => {
  assert.strictEqual(it(r, 'goutte21.l8e').phase_source, 'Backlog'); assert.strictEqual(it(r, 'goutte21.l8e').etape, 'qualifie');
});
ok('no "phase" alert left on the real read (every empty parent is deducible)', () => assert(!r.report.signals.some((s) => s.kind === 'phase')));
ok('owned fields kept on update (note du lundi, priorité, nom, épopées)', () => {
  const l8d = it(r, 'goutte21.l8d'); const prev = base.items.find((i) => i.id === 'goutte21.l8d');
  assert.strictEqual(l8d.nom, prev.nom); assert.deepStrictEqual(l8d.epics_jira, prev.epics_jira); assert.deepStrictEqual(l8d.priorite, prev.priorite);
});
ok('freshness: source only, EDT offset, no Z', () => {
  assert.strictEqual(it(r, 'goutte21.l8d').updated_at, '2026-10-08T09:20-04:00');
  assert(r.doc.items.every((i) => /-04:00$/.test(i.updated_at)));
});
ok('R06 ticked row (simulated "Portefeuille" on L8D1.1.3) -> promoted item under nearest portfolio ancestor L8D', () => {
  const raw2 = clone(raw); raw2.rows.find((x) => x.id === 'L8D1.1.3').portefeuille = true;
  const x = it(adapt(raw2, base, {}), 'goutte21.l8d1.1.3');
  assert(x && x.promu === true && x.parent === 'goutte21.l8d' && x.phase_source === 'AF / UX' && x.pct_avancement === 77 && x.etape === 'actif');
  assert.strictEqual(x.updated_at, '2026-10-08T09:20-04:00');
});
ok('R06 saisie item linked by rowId: refreshed, parent from the sheet, never duplicated even when ticked', () => {
  const b2 = clone(base); const ct = b2.items.find((i) => i.id === 'saisie.codes-taxes');
  ct.liens.push({ libelle: 'Smartsheet L8D1.1.2', url: SS_URL + '6759596715605892' });
  const raw2 = clone(raw); raw2.rows.find((x) => x.id === 'L8D1.1.2').portefeuille = true;
  const r2 = adapt(raw2, b2, {});
  const x = it(r2, 'saisie.codes-taxes');
  assert(x.phase_source === 'AF / UX' && x.pct_avancement === 56 && x.parent === 'goutte21.l8d' && x.source.systeme === 'smartsheet');
  assert.strictEqual(x.note_lundi, ct.note_lundi); assert.deepStrictEqual(x.epics_jira, ['GOU21-9199']);
  // R30: étape and voie follow the source (was planifié / flux, hand-set at seeding)
  assert.strictEqual(x.etape, 'actif'); assert.strictEqual(x.voie, 'scrum');
  assert(r2.report.signals.some((s) => s.kind === 'etape' && /saisie.codes-taxes/.test(s.texte)) && r2.report.signals.some((s) => s.kind === 'voie'));
  assert(!it(r2, 'goutte21.l8d1.1.2'));
});
ok('Done on an item already in base -> étape terminé; back to an active phase -> actif', () => {
  const raw2 = clone(raw); raw2.rows.find((x) => x.id === 'L8').phase = 'Done';
  assert.strictEqual(it(adapt(raw2, base, {}), 'goutte21.l8').etape, 'termine');
  const b3 = clone(base); b3.items.find((i) => i.id === 'goutte21.l6').etape = 'qualifie';
  const raw3 = clone(raw); raw3.rows.find((x) => x.id === 'L6').phase = 'Dev';
  assert.strictEqual(it(adapt(raw3, b3, {}), 'goutte21.l6').etape, 'actif');
});
ok('Niveau inconsistency still signalled (L1, L2, L3-L4, L5, L6)', () => {
  assert.deepStrictEqual(r.report.signals.filter((s) => s.kind === 'niveau').map((s) => s.row), ['L1', 'L2', 'L3-L4', 'L5', 'L6']);
});
ok('Top risque: existing smartsheet risk keeps P·I; L8B only signalled', () => {
  assert.strictEqual(r.doc.risques.length, 1); assert.strictEqual(r.doc.risques[0].probabilite, 4);
  assert(r.report.signals.some((s) => s.kind === 'risque' && s.row === 'L8B'));
});
ok('pinned write for existing doc; no health written; model v4 document', () => {
  assert.strictEqual(r.writes.find((w) => w.doc_id === 'goutte21.l8d').if_version, 6);
  assert(r.doc.items.every((i) => !('sante' in i))); assert.strictEqual(r.doc.modele, '4');
});
// ---------- v3 (R06 part 2): planned window and gates ----------
const { som, eom } = require('../tools/adapt_smartsheet.js');
ok('month helpers: 1st and last day of month (leap years, December)', () => {
  assert.strictEqual(som('2026-11-17'), '2026-11-01'); assert.strictEqual(eom('2026-11-17'), '2026-11-30');
  assert.strictEqual(eom('2028-02-03'), '2028-02-29'); assert.strictEqual(eom('2026-12-05'), '2026-12-31');
});
const withGates = (mut) => { const x = clone(raw); x.rows.find((y) => y.id === 'L8D1.1.3').portefeuille = true;
  x.gates = [['ba-3', 6987234436644740, true], ['ac-4', 4172484669538180, true], ['qa-2', 5016909599670148, false], ['qa-3', 2765109785984900, false]]
    .map(([g, rowId, coche]) => ({ entite: 'L8D1.1.3', gate: g, rowId, coche, date_prevue: null, date_check: null }));
  if (mut) mut(x); return x; };
ok('real state (Date prévue and Date check empty): no gate milestone created, one signal listing the 4 gates', () => {
  const r4 = adapt(withGates(), base, {});
  assert(!(r4.doc.jalons || []).length);
  assert(r4.report.signals.some((s) => s.kind === 'gate_sans_date' && s.row === 'goutte21.l8d1.1.3' && /BA-3, AC-4, QA-2, QA-3/.test(s.texte)));
});
ok('planned month on a gate → date = last day of month, precision mois, date_initiale kept from base', () => {
  const x = withGates((y) => { y.gates[3].date_prevue = '2027-01-10'; y.gates[1].date_prevue = '2026-10-01'; y.gates[1].date_check = '2026-10-21'; });
  const b2 = clone(base); b2.jalons = [{ id: 'goutte21.l8d1.1.3.qa-3', item: 'goutte21.l8d1.1.3', nom: 'x', date: '2026-12-31', date_initiale: '2026-12-31', statut: 'a_venir', source: {} }];
  const r5 = adapt(x, b2, {}); const j = (g) => r5.doc.jalons.find((z) => z.id === 'goutte21.l8d1.1.3.' + g);
  assert.deepStrictEqual([j('qa-3').date, j('qa-3').precision, j('qa-3').date_initiale, j('qa-3').statut], ['2027-01-31', 'mois', '2026-12-31', 'a_venir']);
  assert.deepStrictEqual([j('ac-4').date, j('ac-4').statut, j('ac-4').fait_le], ['2026-10-31', 'fait', '2026-10-21']);
  assert(r5.report.signals.some((s) => s.kind === 'gate' && /2026-12-31 → 2027-01-31/.test(s.texte)));
});
ok('gate of a linked saisie item (codes de taxes, L8D1.1.2) is attached to that item, not to a new one', () => {
  const b2 = clone(base); b2.items.find((i) => i.id === 'saisie.codes-taxes').liens.push({ libelle: 'ss', url: SS_URL + '6759596715605892' });
  const x = clone(raw); x.gates = [{ entite: 'L8D1.1.2', gate: 'qa-3', rowId: 778888905949060, coche: false, date_prevue: '2027-01-15', date_check: null }];
  const r6 = adapt(x, b2, {}); assert.strictEqual(r6.doc.jalons[0].id, 'saisie.codes-taxes.qa-3');
});
ok('checked without Date check → done, no fait_le, signalled; checked with no planned date uses Date check as date', () => {
  const x = withGates((y) => { y.gates[0].date_prevue = '2026-06-01'; y.gates[1].date_check = '2026-10-21'; });
  const r7 = adapt(x, base, {}); const j = (g) => r7.doc.jalons.find((z) => z.id === 'goutte21.l8d1.1.3.' + g);
  assert(j('ba-3').statut === 'fait' && !('fait_le' in j('ba-3')));
  assert(r7.report.signals.some((s) => s.row === 'goutte21.l8d1.1.3.ba-3' && /sans Date check/.test(s.texte)));
  assert.deepStrictEqual([j('ac-4').date, j('ac-4').fait_le, 'precision' in j('ac-4')], ['2026-10-21', '2026-10-21', false]);
});
ok('planned window from Master at month precision; empty keeps a Gérer window; end before start ignored', () => {
  const x = clone(raw); const l8d = x.rows.find((y) => y.id === 'L8D'); l8d.debut_prevu = '2026-08-12'; l8d.fin_prevue = '2027-03-03';
  assert.deepStrictEqual(it(adapt(x, base, {}), 'goutte21.l8d').fenetre, { debut: '2026-08-01', fin: '2027-03-31' });
  const b2 = clone(base); b2.items.find((i) => i.id === 'goutte21.l8').fenetre = { debut: '2026-09-01', fin: null };
  assert.deepStrictEqual(it(adapt(raw, b2, {}), 'goutte21.l8').fenetre, { debut: '2026-09-01', fin: null });
  l8d.fin_prevue = '2026-01-01'; const r8 = adapt(x, base, {});
  assert(!it(r8, 'goutte21.l8d').fenetre && r8.report.signals.some((s) => s.kind === 'fenetre'));
});
ok('R27 blocking comments on an item row → attentes (bloquant, BLOQ, bloque, bloqué); others ignored; vanished comment closes the wait', () => {
  const x = clone(raw); const rid = x.rows.find((y) => y.id === 'L8D').rowId;
  x.commentaires = [[rid, 11, 'BLOQUANT : attente du DBA pour le schéma', 'Luc', '2026-10-27T14:00:00Z'], [rid, 12, 'Revue faite, RAS', 'Mona', '2026-10-28T10:00:00Z'],
    [rid, 13, 'on est bloqué par la licence', 'Félix', '2026-10-28T11:00:00Z'], [999, 14, 'BLOQ ailleurs', 'X', '2026-10-28T11:00:00Z']];
  const r9 = adapt(x, base, {}); const A = r9.doc.attentes || [];
  assert.deepStrictEqual(A.map((a) => [a.id, a.item, a.tiers, a.attendue_le]), [['smartsheet.att.11', 'goutte21.l8d', 'Luc', '2026-10-27'], ['smartsheet.att.13', 'goutte21.l8d', 'Félix', '2026-10-28']]);
  const b2 = clone(base); b2.attentes = A; const y = clone(x); y.commentaires = y.commentaires.filter(([, c]) => c !== 11);
  const A2 = adapt(y, b2, {}).doc.attentes; assert.strictEqual(A2.find((a) => a.id === 'smartsheet.att.11').recue_le, raw.read_at.slice(0, 10));
});
console.log(`\n${n} adapter tests OK`);
