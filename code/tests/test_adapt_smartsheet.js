#!/usr/bin/env node
/* Smartsheet adapter tests on the real 2026-10-27 export. Usage: node tests/test_adapt_smartsheet.js <raw.json> <base_before_dir> */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const { adapt } = require('../tools/adapt_smartsheet.js');
const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rd = (d) => fs.readdirSync(d).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')));
const base = { items: rd(path.join(process.argv[3], 'items')), risques: rd(path.join(process.argv[3], 'risques')) };
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const r = adapt(raw, base, { 'items/goutte21.l8d': 2 });
const it = (id) => r.doc.items.find((i) => i.id === id);

ok('grain: units and entities ignored; Backlog / Done not created', () => {
  assert(!it('goutte21.l8d1') && !it('goutte21.l0.1.1') && !it('goutte21.l9') && !it('goutte21.l1'));
  assert.strictEqual(r.report.grain_l, 22);
});
ok('active Ls: L0, L0.1, L3-L4, L5, L6, L8, L8D, L8E, L8B', () => {
  assert.deepStrictEqual(r.doc.items.map((i) => i.id).sort(), ['goutte21.l0', 'goutte21.l0.1', 'goutte21.l3-l4', 'goutte21.l5', 'goutte21.l6', 'goutte21.l8', 'goutte21.l8b', 'goutte21.l8d', 'goutte21.l8e']);
});
ok('empty phase: active, no phase_source, signal', () => {
  assert(!('phase_source' in it('goutte21.l8d')) && it('goutte21.l8d').etape === 'actif');
  assert(r.report.signals.some((s) => s.kind === 'phase' && s.row === 'L8D'));
});
ok('owned fields kept on update (note du lundi, priorité, contenu sprint, nom)', () => {
  const l8d = it('goutte21.l8d');
  assert.strictEqual(l8d.note_lundi, 'test note'); assert.strictEqual(l8d.priorite.score, 5); assert.strictEqual(l8d.nom, 'L8D Paie Transporteur');
});
ok('freshness: source only — a Gérer save does not reset it (decision Franck)', () => {
  assert.strictEqual(it('goutte21.l8d').updated_at, '2026-10-08T09:20-04:00');
  assert.strictEqual(it('goutte21.l8').updated_at, '2026-10-08T09:20-04:00');
  assert(!/Z$/.test(it('goutte21.l6').updated_at));
});
ok('parent by ID prefix; Sub-L under its L', () => {
  assert.strictEqual(it('goutte21.l0.1').parent, 'goutte21.l0'); assert.strictEqual(it('goutte21.l8b').parent, 'goutte21.l8'); assert.strictEqual(it('goutte21.l6').parent, 'goutte21');
});
ok('Top risque: existing smartsheet risk keeps P·I; new one only signalled', () => {
  assert.strictEqual(r.doc.risques.length, 1); assert.strictEqual(r.doc.risques[0].probabilite, 4);
  assert(r.report.signals.some((s) => s.kind === 'risque' && s.row === 'L8B'));
});
ok('Niveau inconsistency signalled (L6 = Entité in source)', () => assert(r.report.signals.some((s) => s.kind === 'niveau' && s.row === 'L6')));
ok('pinned write for existing doc, none for new', () => {
  assert.strictEqual(r.writes.find((w) => w.doc_id === 'goutte21.l8d').if_version, 2);
  assert(!('if_version' in r.writes.find((w) => w.doc_id === 'goutte21.l0')));
});
ok('no health written by adapter', () => assert(r.doc.items.every((i) => !('sante' in i))));
ok('Done on an item already in base -> étape terminé', () => {
  const raw2 = JSON.parse(JSON.stringify(raw)); raw2.rows.find((x) => x.id === 'L8').phase = 'Done';
  const r2 = adapt(raw2, base, {}); assert.strictEqual(r2.doc.items.find((i) => i.id === 'goutte21.l8').etape, 'termine');
});
ok('promoted item linked by rowId gets source fields', () => {
  const b2 = { items: base.items.concat([{ id: 'saisie.x', nom: 'X', type: 'projet', voie: 'flux', etape: 'actif', promu: true, liens: [{ libelle: 'smartsheet', url: 'https://app.smartsheet.com/sheets/abc?rowId=3035956060815236' }], source: { systeme: 'saisie', lu_le: '2026-10-27T10:00-04:00' }, updated_at: '2026-10-27T10:00-04:00' }]), risques: base.risques };
  const r3 = adapt(raw, b2, {}); const x = r3.doc.items.find((i) => i.id === 'saisie.x');
  assert.strictEqual(x.phase_source, 'Dev'); assert.strictEqual(x.source.systeme, 'smartsheet');
});
console.log(`\n${n} adapter tests OK`);
