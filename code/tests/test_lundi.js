#!/usr/bin/env node
/* Monday run tests. Usage: node tests/test_lundi.js <base_export_dir> <schema.json>
 * base_export_dir = a full ArtifactData export (13 collections). Works in a temp dir; never touches the db.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const L = require('../tools/lundi.js');

const [baseDir, schemaP] = process.argv.slice(2);
const TOOL = path.join(__dirname, '..', 'tools', 'lundi.js');
const run = (...a) => spawnSync('node', [TOOL, ...a], { encoding: 'utf8' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lundi-'));
const cp = (a, b) => fs.cpSync(a, b, { recursive: true });
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

ok('snapshot: one create, unpinned, id snap.<date>, validated closed', () => {
  const r = run('snapshot', baseDir, '2026-11-02', '2026-11-02T07:04-05:00', path.join(tmp, 's1'), schemaP);
  assert.strictEqual(r.status, 0, r.stderr);
  const b = JSON.parse(fs.readFileSync(path.join(tmp, 's1', 'batch.json'), 'utf8'));
  assert.strictEqual(b.length, 1); assert.strictEqual(b[0].doc_id, 'snap.2026-11-02'); assert.strictEqual(b[0].collection, 'instantanes');
  assert(!('if_version' in b[0]), 'a snapshot is created, never pinned over an existing one');
  assert(b[0].data.items.every((x) => ['vert', 'jaune', 'rouge'].includes(x.sante)));
});
ok('snapshot: refused when snap.<date> already exists (never overwritten)', () => {
  const d = path.join(tmp, 'b2'); cp(baseDir, d); fs.mkdirSync(path.join(d, 'instantanes'), { recursive: true });
  fs.writeFileSync(path.join(d, 'instantanes', 'snap.2026-11-02.json'), JSON.stringify({ id: 'snap.2026-11-02', date: '2026-11-02', pris_le: '2026-11-02T07:00-05:00', items: [], source: { systeme: 'calcul', lu_le: '2026-11-02T07:00-05:00' } }));
  const r = run('snapshot', d, '2026-11-02', '2026-11-02T07:04-05:00', path.join(tmp, 's2'), schemaP);
  assert.notStrictEqual(r.status, 0); assert(/never overwritten/.test(r.stderr));
});
ok('snapshot: refused on a Z timestamp, a pris_le on another day, an empty base', () => {
  assert.notStrictEqual(run('snapshot', baseDir, '2026-11-02', '2026-11-02T12:04Z', path.join(tmp, 's3'), schemaP).status, 0);
  assert.notStrictEqual(run('snapshot', baseDir, '2026-11-02', '2026-11-01T07:04-04:00', path.join(tmp, 's3'), schemaP).status, 0);
  fs.mkdirSync(path.join(tmp, 'empty'));
  assert.notStrictEqual(run('snapshot', path.join(tmp, 'empty'), '2026-11-02', '2026-11-02T07:04-05:00', path.join(tmp, 's3'), schemaP).status, 0);
});
ok('snapshot: a run delayed to Tuesday is the Monday snapshot; a 2nd run in the same week is refused', () => {
  const r = run('snapshot', baseDir, '2026-11-03', '2026-11-03T09:15-05:00', path.join(tmp, 'st'), schemaP);
  assert.strictEqual(r.status, 0, r.stderr);
  const s = JSON.parse(fs.readFileSync(path.join(tmp, 'st', 'batch.json'), 'utf8'))[0].data;
  assert.strictEqual(s.id, 'snap.2026-11-02'); assert.strictEqual(s.date, '2026-11-02'); assert.strictEqual(s.pris_le, '2026-11-03T09:15-05:00');
  const d = path.join(tmp, 'b3'); cp(baseDir, d); fs.writeFileSync(path.join(d, 'instantanes', s.id + '.json'), JSON.stringify(s));
  assert.notStrictEqual(run('snapshot', d, '2026-11-04', '2026-11-04T07:00-05:00', path.join(tmp, 'st2'), schemaP).status, 0);
});
ok('snapshot: refused when the export has no instantanes folder (cannot prove no snapshot exists)', () => {
  const d = path.join(tmp, 'b4'); cp(baseDir, d); fs.rmSync(path.join(d, 'instantanes'), { recursive: true });
  const r = run('snapshot', d, '2026-11-02', '2026-11-02T07:04-05:00', path.join(tmp, 's4'), schemaP);
  assert.notStrictEqual(r.status, 0); assert(/incomplete export/.test(r.stderr));
});
ok('fmtLocal: EDT before Nov 1, EST after, never UTC', () => {
  assert.strictEqual(L.fmtLocal('2026-10-27T20:10-04:00'), '27 oct. 2026 · 20h10 EDT');
  assert.strictEqual(L.fmtLocal('2026-11-02T07:04-05:00'), '2 nov. 2026 · 7h04 EST');
});

// Two Mondays: week 1 then week 2 with one item turning red and one new alert.
function week(date, ts, mutate, prevDir) {
  const rd = path.join(tmp, 'runs', date); fs.mkdirSync(rd, { recursive: true });
  cp(baseDir, path.join(rd, 'base_apres'));
  if (prevDir) cp(path.join(prevDir, 'base_apres', 'instantanes'), path.join(rd, 'base_apres', 'instantanes'));
  const s = run('snapshot', path.join(rd, 'base_apres'), date, ts, path.join(rd, 'snap'), schemaP); assert.strictEqual(s.status, 0, s.stderr);
  const snap = JSON.parse(fs.readFileSync(path.join(rd, 'snap', 'batch.json'), 'utf8'))[0].data;
  fs.mkdirSync(path.join(rd, 'base_apres', 'instantanes'), { recursive: true });
  fs.writeFileSync(path.join(rd, 'base_apres', 'instantanes', snap.id + '.json'), JSON.stringify(snap));
  if (mutate) mutate(path.join(rd, 'base_apres'));
  fs.writeFileSync(path.join(rd, 'statut.json'), JSON.stringify({ adaptateurs: [{ nom: 'smartsheet', statut: 'ok' }, { nom: 'miro', statut: 'echec', cause: 'outil indisponible' }] }));
  const r = run('digest', rd, date, ts, 'https://claude.ai/artifact/X', path.join(rd, 'd.md'), path.join(rd, 'm.html'));
  assert.strictEqual(r.status, 0, r.stderr);
  return { rd, md: fs.readFileSync(path.join(rd, 'd.md'), 'utf8'), msg: fs.readFileSync(path.join(rd, 'm.html'), 'utf8') };
}
let w1;
ok('digest week 1: no comparison, failed source listed first, no empty section', () => {
  w1 = week('2026-11-02', '2026-11-02T07:04-05:00');
  assert(/Sources non lues[\s\S]*Miro[\s\S]*outil indisponible/.test(w1.md));
  assert(/première exécution/.test(w1.md));
  assert(!/## Santé — changements/.test(w1.md));
  assert(/sources 1\/2/.test(w1.msg) && /href="https:\/\/claude.ai\/artifact\/X"/.test(w1.msg));
  assert(!/<script|<img|<span/.test(w1.msg));
});
ok('digest week 2: new alert flagged, health change vs previous snapshot', () => {
  const w2 = week('2026-11-09', '2026-11-09T07:03-05:00', (b) => {
    // run.ti gets a jalon dated in the past → red + a new jalon alert
    fs.writeFileSync(path.join(b, 'jalons', 'run.ti.test.json'), JSON.stringify({ id: 'run.ti.test', item: 'run.ti', nom: 'Jalon test', date: '2026-11-05', statut: 'a_venir', source: { systeme: 'saisie', lu_le: '2026-11-03T10:00-05:00' } }));
  }, w1.rd);
  assert(/Jalon test : dépassé depuis le 5 nov\.\s*\| oui \|/.test(w2.md), w2.md);
  assert(/## Santé — changements depuis l'instantané du 2 nov\./.test(w2.md));
  assert(/Run TI[^\n]*\| vert \| rouge \|/.test(w2.md), w2.md);
  assert(/nouvelle/.test(w2.msg));
});
ok('digest: Tuesday rerun vs previous Monday, nothing new = short message (silence rule)', () => {
  const par = path.join(tmp, 'calme'); const a = path.join(par, '2026-10-26'); const rd = path.join(par, '2026-11-02');
  fs.mkdirSync(a, { recursive: true }); fs.copyFileSync(path.join(w1.rd, 'alertes.json'), path.join(a, 'alertes.json'));
  fs.mkdirSync(rd, { recursive: true }); cp(path.join(w1.rd, 'base_apres'), path.join(rd, 'base_apres'));
  fs.writeFileSync(path.join(rd, 'statut.json'), JSON.stringify({ adaptateurs: [{ nom: 'smartsheet', statut: 'ok' }] }));
  const r = run('digest', rd, '2026-11-03', '2026-11-03T07:03-05:00', 'https://claude.ai/artifact/X', path.join(rd, 'd.md'), path.join(rd, 'm.html'));
  assert.strictEqual(r.status, 0, r.stderr);
  const m = fs.readFileSync(path.join(rd, 'm.html'), 'utf8');
  assert(/dont 0 nouvelle/.test(m) && /Rien de nouveau/.test(m) && !/<ul>/.test(m), m);
});
ok('digest: snap_sources.json = one pinned update with sources_ok / sources_total only', () => {
  const u = JSON.parse(fs.readFileSync(path.join(w1.rd, 'snap_sources.json'), 'utf8'));
  assert.deepStrictEqual(u, [{ op: 'update', collection: 'instantanes', doc_id: 'snap.2026-11-02', data: { sources_ok: 1, sources_total: 2 }, if_version: 1 }]);
});
ok('versions: pinned write +1, create = 1; delete refused', () => {
  const va = path.join(tmp, 'va.json'); fs.writeFileSync(va, JSON.stringify({ 'items/a': 3 }));
  const b = path.join(tmp, 'vb.json'); fs.writeFileSync(b, JSON.stringify([{ op: 'set', collection: 'items', doc_id: 'a', data: {}, if_version: 3 }, { op: 'set', collection: 'jalons', doc_id: 'n', data: {} }]));
  const r = run('versions', va, b); assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(JSON.parse(r.stdout), { 'items/a': 4, 'jalons/n': 1 });
  const d = path.join(tmp, 'vd.json'); fs.writeFileSync(d, JSON.stringify([{ op: 'delete', collection: 'items', doc_id: 'a' }]));
  assert.notStrictEqual(run('versions', va, d).status, 0);
});
ok('writes: one file per write, chunks of 50, if_version kept, Windows path', () => {
  const b = path.join(tmp, 'wb.json'); fs.writeFileSync(b, JSON.stringify(Array.from({ length: 51 }, (_, k) => ({ op: 'set', collection: 'meps', doc_id: 'm' + k, data: { id: 'm' + k }, if_version: 2 }))));
  const r = run('writes', b, path.join(tmp, 'w'), tmp, 'C:\\X'); assert.strictEqual(r.status, 0, r.stderr);
  const c = JSON.parse(r.stdout); assert.strictEqual(c.length, 2); assert.strictEqual(c[0].length, 50);
  assert.strictEqual(c[0][0].if_version, 2); assert(/^C:\\X\\w\\000_meps_m0\.json$/.test(c[0][0].file_path), c[0][0].file_path);
});
ok('pagecheck: same page = 0, wrapped page = 0, changed page = 10', () => {
  const a = path.join(tmp, 'a.html'); const b = path.join(tmp, 'b.html'); const c = path.join(tmp, 'c.html');
  fs.writeFileSync(a, '<div>x</div>\n'); fs.writeFileSync(b, '<!doctype html><html><body><div>x</div></body></html>'); fs.writeFileSync(c, '<div>y</div>');
  assert.strictEqual(run('pagecheck', a, a).status, 0);
  assert.strictEqual(run('pagecheck', a, b).status, 0);
  assert.strictEqual(run('pagecheck', a, c).status, 10);
});
ok('analyst: dossier built from base_apres; digest takes ≤ 5 proven signals, refuses a signal without proof (exit 4)', () => {
  const rd = path.join(tmp, 'runs', '2026-11-02'); fs.mkdirSync(rd, { recursive: true }); cp(baseDir, path.join(rd, 'base_apres'));
  fs.writeFileSync(path.join(rd, 'statut.json'), JSON.stringify({ adaptateurs: [], instantane: { id: 'snap.2026-11-02', ecrit: false } }));
  const d = run('dossier', rd, '2026-11-02', path.join(rd, 'dossier.json')); assert.strictEqual(d.status, 0, d.stderr);
  const dos = JSON.parse(fs.readFileSync(path.join(rd, 'dossier.json'), 'utf8'));
  assert(Array.isArray(dos.items) && dos.items.length && Array.isArray(dos.alertes_regles) && 'sprint_courant' in dos);
  const good = { signaux: [{ titre: 'T', constat: 'C', preuves: ['p'], cause: 'probablement X' }] };
  fs.writeFileSync(path.join(rd, 'a.json'), JSON.stringify(good));
  const g = run('digest', rd, '2026-11-02', '2026-11-02T07:30-05:00', 'u', path.join(rd, 'D.md'), path.join(rd, 'm.html'), '--signaux', path.join(rd, 'a.json'));
  assert.strictEqual(g.status, 0, g.stderr);
  assert(/Signaux à confirmer — analyste \(1\)/.test(fs.readFileSync(path.join(rd, 'D.md'), 'utf8')));
  assert(/1 signal à confirmer/.test(fs.readFileSync(path.join(rd, 'm.html'), 'utf8')));
  fs.writeFileSync(path.join(rd, 'b.json'), JSON.stringify({ signaux: [{ titre: 'T', constat: 'C', preuves: [], cause: 'X' }] }));
  assert.strictEqual(run('digest', rd, '2026-11-02', '2026-11-02T07:30-05:00', 'u', path.join(rd, 'D2.md'), path.join(rd, 'm2.html'), '--signaux', path.join(rd, 'b.json')).status, 4);
  fs.writeFileSync(path.join(rd, 'c.json'), JSON.stringify({ signaux: Array(6).fill(good.signaux[0]) }));
  assert.strictEqual(run('digest', rd, '2026-11-02', '2026-11-02T07:30-05:00', 'u', path.join(rd, 'D3.md'), path.join(rd, 'm3.html'), '--signaux', path.join(rd, 'c.json')).status, 4);
});
console.log(`${n} tests passed`);
