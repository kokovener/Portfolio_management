#!/usr/bin/env node
/* Retro action status tests. Usage: node tests/test_statut_actions.js <miro_run_dir> <schema.json>
 * miro_run_dir = a Miro adapter run (raw.json + base/ with actions_retro, sprints, versions.json). Temp dir only.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const [M, schemaP] = process.argv.slice(2);
const T = path.join(__dirname, '..', 'tools');
const run = (tool, ...a) => spawnSync('node', [path.join(T, tool), ...a], { encoding: 'utf8' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'statut-'));
const ids = fs.readdirSync(path.join(M, 'base', 'actions_retro')).map((f) => f.replace(/\.json$/, '')).sort();
const ans = (o) => { const p = path.join(tmp, `a${Math.random()}.json`); fs.writeFileSync(p, JSON.stringify(Object.assign({ asked_at: '2026-10-27T21:00-04:00' }, o))); return p; };
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

let out;
ok('only statut changes, pinned set, unchanged answer not written', () => {
  out = path.join(tmp, 'o1');
  const r = run('statut_actions.js', path.join(M, 'base'), ans({ statuts: { [ids[0]]: 'fait', [ids[1]]: 'en_cours', [ids[2]]: 'a_faire' } }), out, schemaP);
  assert.strictEqual(r.status, 0, r.stderr);
  const b = JSON.parse(fs.readFileSync(path.join(out, 'batch.json'), 'utf8'));
  assert.strictEqual(b.length, 2); assert(b.every((w) => w.op === 'set' && w.if_version >= 1));
  const before = JSON.parse(fs.readFileSync(path.join(M, 'base', 'actions_retro', ids[0] + '.json'), 'utf8'));
  assert.deepStrictEqual(Object.assign({}, b[0].data, { statut: before.statut }), before);
});
ok('Miro adapter rerun keeps the status and rewrites nothing; overdue signal gone for a done action', () => {
  const b2 = path.join(tmp, 'base2'); fs.cpSync(path.join(M, 'base'), b2, { recursive: true });
  JSON.parse(fs.readFileSync(path.join(out, 'batch.json'), 'utf8')).forEach((w) => fs.writeFileSync(path.join(b2, 'actions_retro', w.doc_id + '.json'), JSON.stringify(w.data)));
  const r = run('adapt_miro.js', path.join(M, 'raw.json'), b2, path.join(tmp, 'rerun'), schemaP);
  assert.strictEqual(r.status, 0, r.stderr);
  const rep = JSON.parse(fs.readFileSync(path.join(tmp, 'rerun', 'report.json'), 'utf8'));
  assert.strictEqual(rep.ecrits, 0);
  assert(!rep.signals.some((s) => s.kind === 'echeance_passee' && s.row === ids[0]));
});
ok('refused: unknown id, unknown statut, UTC timestamp', () => {
  assert.notStrictEqual(run('statut_actions.js', path.join(M, 'base'), ans({ statuts: { 'x.y': 'fait' } }), path.join(tmp, 'o2'), schemaP).status, 0);
  assert.notStrictEqual(run('statut_actions.js', path.join(M, 'base'), ans({ statuts: { [ids[0]]: 'termine' } }), path.join(tmp, 'o3'), schemaP).status, 0);
  assert.notStrictEqual(run('statut_actions.js', path.join(M, 'base'), ans({ asked_at: '2026-10-28T01:00Z', statuts: {} }), path.join(tmp, 'o4'), schemaP).status, 0);
});
console.log(`${n} tests passed`);
