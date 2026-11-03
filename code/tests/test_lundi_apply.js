#!/usr/bin/env node
/* lundi.js apply tests (Optimisation_Requetes_v1 S5): base_apres rebuilt from base_avant + accepted batches.
 * Real replay: the Monday run of 2026-11-02 (forced 15h51 run): base_avant + every out/batch.json of an ok/partiel adapter
 * in statut.json + every lecture.json, compared with the base_apres exported by ArtifactData that day.
 * Usage: node tests/test_lundi_apply.js <dist/lundi/2026-11-02> */
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path'); const assert = require('assert');
const { execFileSync } = require('child_process');
const { applyBatches } = require('../tools/lundi.js');
const RD = process.argv[2];
const LUNDI = path.join(__dirname, '..', 'tools', 'lundi.js');
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-'));
const loadDir = (d) => { const o = {}; fs.readdirSync(d).forEach((c) => { const p = path.join(d, c); if (!fs.statSync(p).isDirectory()) return; fs.readdirSync(p).forEach((f) => { o[`${c}/${f}`] = JSON.parse(fs.readFileSync(path.join(p, f), 'utf8')); }); }); return o; };

const statut = JSON.parse(fs.readFileSync(path.join(RD, 'statut.json'), 'utf8'));
const batches = [];
statut.adaptateurs.forEach((a) => {
  const b = path.join(RD, a.nom, 'out', 'batch.json'); if (/^(ok|partiel)$/.test(a.statut) && fs.existsSync(b)) batches.push(b);
  const l = path.join(RD, a.nom, 'lecture.json'); if (fs.existsSync(l)) batches.push(l);
});

ok('real replay 2 Nov.: base_avant + accepted batches = exported base_apres (no diff, versions aside)', () => {
  const out = path.join(tmp, 'base_apres');
  execFileSync('node', [LUNDI, 'apply', path.join(RD, 'base_avant'), out, ...batches]);
  const a = loadDir(out); const b = loadDir(path.join(RD, 'base_apres'));
  assert.deepStrictEqual(Object.keys(a).sort(), Object.keys(b).sort());
  const diff = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]) && !deepEq(a[k], b[k]));
  assert.deepStrictEqual(diff, []);
  const v = JSON.parse(fs.readFileSync(path.join(out, 'versions.json'), 'utf8'));
  const v0 = JSON.parse(fs.readFileSync(path.join(RD, 'base_avant', 'versions.json'), 'utf8'));
  assert.strictEqual(v['lectures/lecture.jira'], (v0['lectures/lecture.jira'] || 0) + 1);
});
function deepEq(x, y) { try { assert.deepStrictEqual(x, y); return true; } catch (e) { return false; } }

ok('update = shallow merge, set = replace, K13 purge applied, any other delete refused', () => {
  const av = path.join(tmp, 'av'); fs.mkdirSync(path.join(av, 'items'), { recursive: true }); fs.mkdirSync(path.join(av, 'charges'), { recursive: true });
  fs.writeFileSync(path.join(av, 'items', 'x.json'), JSON.stringify({ id: 'x', nom: 'X', rang: 1 }));
  fs.writeFileSync(path.join(av, 'charges', 'jira.c1.json'), JSON.stringify({ id: 'jira.c1' }));
  fs.writeFileSync(path.join(av, 'versions.json'), JSON.stringify({ 'items/x': 3, 'charges/jira.c1': 2 }));
  const b1 = path.join(tmp, 'b1.json');
  fs.writeFileSync(b1, JSON.stringify([{ op: 'update', collection: 'items', doc_id: 'x', data: { rang: 2 }, if_version: 3 },
    { op: 'set', collection: 'items', doc_id: 'y', data: { id: 'y', nom: 'Y' } },
    { op: 'delete', collection: 'charges', doc_id: 'jira.c1', purge: 'K13' }]));
  const { docs } = applyBatches(av, [b1]);
  assert.deepStrictEqual(docs['items/x'], { id: 'x', nom: 'X', rang: 2 }); assert.strictEqual(docs['items/y'].nom, 'Y'); assert(!docs['charges/jira.c1']);
  const out = path.join(tmp, 'o1'); execFileSync('node', [LUNDI, 'apply', av, out, b1]);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(out, 'versions.json'), 'utf8')), { 'items/x': 4, 'items/y': 1 });
  const b2 = path.join(tmp, 'b2.json'); fs.writeFileSync(b2, JSON.stringify([{ op: 'delete', collection: 'items', doc_id: 'x' }]));
  assert.throws(() => execFileSync('node', [LUNDI, 'apply', av, path.join(tmp, 'o2'), b2], { stdio: 'pipe' }));
  assert.throws(() => execFileSync('node', [LUNDI, 'apply', av, av, b1], { stdio: 'pipe' })); // never over the export
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${n} tests OK`);
