#!/usr/bin/env node
/* R9 (Optimisation_Requetes_v1): Jira and Smartsheet adapters write only documents whose content changed (source.lu_le
 * excluded), on the real passes of 2 Nov. 2026.
 * Usage: node tests/test_r9_ecritures.js <dist/passages/2026-11-02-quotidien-1021> <dist/passages/2026-11-02-demande-smartsheet-1455> <ledger.md>...
 *   quotidien 10h21: Jira wrote 28 documents that day, all identical to the base apart from lu_le;
 *   demande Smartsheet 14h55: L0.2 created, L8D1.1.2 (saisie.codes-taxes) and L8D1.1.3 moved AF / UX → Dev. */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const J = require('../tools/adapt_jira.js'); const S = require('../tools/adapt_smartsheet.js');
const [Q, DS, ...ledgerPs] = process.argv.slice(2);
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const rd = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : []);
const js = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

ok('adapt_jira, quotidien 2 Nov. 10h21: ≤ 5 writes (28 that day), doc.json still holds every sprint and MEP', () => {
  const b = path.join(Q, 'jira', 'base');
  const ledgers = ledgerPs.filter((p) => fs.existsSync(p)).map((p) => J.parseLedger(fs.readFileSync(p, 'utf8'), p));
  const r = J.adapt(js(path.join(Q, 'jira', 'raw.json')), { sprints: rd(path.join(b, 'sprints')), meps: rd(path.join(b, 'meps')) },
    js(path.join(b, 'versions.json')), ledgers, js(path.join(Q, 'jira', 'mep_sources.json')));
  assert(r.writes.length <= 5, `${r.writes.length} écritures`);
  assert.strictEqual(r.doc.sprints.length + r.doc.meps.length, js(path.join(Q, 'jira', 'out', 'batch.json')).length);
  assert.strictEqual(r.report.inchanges + r.writes.length, r.doc.sprints.length + r.doc.meps.length);
});
ok('adapt_smartsheet, demande 2 Nov. 14h55: writes = L0.2 created + L8D1.1.2 / L8D1.1.3 phase Dev, nothing else', () => {
  const b = path.join(DS, 'smartsheet', 'base');
  const base = { items: rd(path.join(b, 'items')), risques: rd(path.join(b, 'risques')), jalons: rd(path.join(b, 'jalons')), attentes: rd(path.join(b, 'attentes')) };
  const r = S.adapt(js(path.join(DS, 'smartsheet', 'raw.json')), base, js(path.join(b, 'versions.json')));
  assert.deepStrictEqual(r.writes.map((w) => w.doc_id).sort(), ['goutte21.l0.2', 'goutte21.l8d1.1.3', 'saisie.codes-taxes']);
  assert(!r.writes.find((w) => w.doc_id === 'goutte21.l0.2').if_version); // creation
  ['goutte21.l8d1.1.3', 'saisie.codes-taxes'].forEach((id) => { const w = r.writes.find((x) => x.doc_id === id); assert.strictEqual(w.data.phase_source, 'Dev'); assert(w.if_version); });
  assert.strictEqual(r.doc.items.length, js(path.join(DS, 'smartsheet', 'out', 'doc.json')).items.length); // doc keeps all rows
  assert.strictEqual(r.report.ecrits, 3);
});
ok('same content with another lu_le or key order = not written; any other field change = written', () => {
  const b = path.join(DS, 'smartsheet', 'base');
  const items = rd(path.join(b, 'items')); const raw = js(path.join(DS, 'smartsheet', 'raw.json'));
  const r1 = S.adapt(raw, { items, risques: [], jalons: [], attentes: [] }, {});
  const after = r1.doc.items.map((i) => JSON.parse(JSON.stringify(Object.assign({}, i, { source: Object.assign({}, i.source, { lu_le: '2020-01-01T00:00-05:00' }) }))));
  const r2 = S.adapt(raw, { items: after, risques: [], jalons: [], attentes: [] }, {});
  assert.strictEqual(r2.writes.filter((w) => w.collection === 'items').length, 0);
});
console.log(`\n${n} tests OK`);
