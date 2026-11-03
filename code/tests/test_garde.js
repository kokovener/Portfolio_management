#!/usr/bin/env node
/* garde.js tests (Optimisation_Requetes_v1 S3, R4, R7) on the real runs of 2 Nov. 2026.
 * Usage: node tests/test_garde.js <dist/passages/2026-11-02-quotidien-1021> */
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path'); const assert = require('assert');
const Q = path.resolve(process.argv[2]);
const G = require('../tools/garde.js');
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'garde-'));
const js = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const put = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof v === 'string' ? v : JSON.stringify(v)); };
// a run folder for Tuesday 3 Nov. built from the real 10h21 pass of 2 Nov.
const RD = path.join(tmp, 'rd');
fs.cpSync(path.join(Q, 'base_avant', 'lectures'), path.join(RD, 'base_avant', 'lectures'), { recursive: true });
fs.cpSync(path.join(Q, 'jira', 'raw.json'), path.join(RD, 'jira', 'raw.json'));
['jira_data', 'smartsheet', 'gantt'].forEach((a) => put(path.join(RD, a, 'debut.txt'), '2026-11-03T09:02-05:00\n'));

ok('fenetre: newest ok read of jira_data / jira_data_reel and of jira, minus 1 day', () => {
  const f = G.fenetre(RD);
  assert.strictEqual(f.jira_data_depuis, G.fenetre(RD).jira_data_derniere && f.jira_data_depuis);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(f.jira_data_depuis) && /^\d{4}-\d{2}-\d{2}$/.test(f.jira_depuis));
  assert(f.jira_data_depuis < f.jira_data_derniere.slice(0, 10));
  const empty = path.join(tmp, 'empty'); fs.mkdirSync(path.join(empty, 'base_avant', 'lectures'), { recursive: true });
  assert.deepStrictEqual(G.fenetre(empty), { jira_data_derniere: null, jira_data_depuis: null, jira_derniere: null, jira_depuis: null });
});
ok('dernier: newest raw by read_at, the run folder itself excluded', () => {
  const p = G.dernier('jira_data', RD); assert(p && /raw\.json$/.test(p));
  const self = G.dernier('jira_data', path.dirname(path.dirname(p))); assert.notStrictEqual(self, p);
});
ok('Jira data: count 0 + same sprints → previous raw reused with read_at = debut.txt; count > 0 → full read', () => {
  const r = G.gardeJiraData(RD, 0); assert(r.inchange, r.cause);
  const raw = js(path.join(RD, 'jira_data', 'raw.json')); assert.strictEqual(raw.read_at, '2026-11-03T09:02-05:00');
  assert.deepStrictEqual(raw.sprint_issues, js(r.precedent).sprint_issues);
  assert(!G.gardeJiraData(RD, 4).inchange);
  // a new sprint starts: the map changes even with no ticket updated
  const jr = js(path.join(RD, 'jira', 'raw.json')); const moved = JSON.parse(JSON.stringify(jr));
  moved.last_closed_sprint = moved.sprints.find((s) => s.state === 'active'); moved.sprints = moved.sprints.filter((s) => s.state === 'future'); moved.sprints[0].state = 'active';
  const RD2 = path.join(tmp, 'rd2'); fs.cpSync(RD, RD2, { recursive: true }); fs.rmSync(path.join(RD2, 'jira_data', 'raw.json')); put(path.join(RD2, 'jira', 'raw.json'), moved);
  const r2 = G.gardeJiraData(RD2, 0); assert(!r2.inchange && /sprints/.test(r2.cause)); assert(!fs.existsSync(path.join(RD2, 'jira_data', 'raw.json')));
});
ok('Smartsheet: same 2 versions + same comments → reused; one version or one comment differs → full read; no previous version → full read', () => {
  const D = path.join(tmp, 'dist'); process.env.GARDE_DIST = D;
  put(path.join(D, 'passages', '2026-11-02-jeudi-1300', 'smartsheet', 'raw.json'), { read_at: '2026-11-02T13:05-05:00', sheet_version: 412, gates_sheet_version: 88, rows: [{ id: 'L0' }], commentaires: [[1, 10, 'x', 'a', 'c']] });
  put(path.join(D, 'passages', '2026-11-02-jeudi-1300', 'statut.json'), { adaptateurs: [{ nom: 'smartsheet', statut: 'ok' }] });
  // a newer read that failed is never the reference (it would hide the failure)
  put(path.join(D, 'passages', '2026-11-02-demande-1500', 'smartsheet', 'raw.json'), { read_at: '2026-11-02T15:05-05:00', sheet_version: 999, gates_sheet_version: 88, rows: [], commentaires: [] });
  put(path.join(D, 'passages', '2026-11-02-demande-1500', 'statut.json'), { adaptateurs: [{ nom: 'smartsheet', statut: 'echec' }] });
  const R = path.join(tmp, 'rs'); put(path.join(R, 'smartsheet', 'debut.txt'), '2026-11-09T07:03-05:00');
  put(path.join(R, 'smartsheet', 'garde.json'), { sheet_version: 412, gates_sheet_version: 88, commentaires: [[1, 10, 'x', 'a', 'c']] });
  const r = G.gardeSmartsheet(R); assert(r.inchange, r.cause);
  const raw = js(path.join(R, 'smartsheet', 'raw.json')); assert.strictEqual(raw.read_at, '2026-11-09T07:03-05:00'); assert.strictEqual(raw.sheet_version, 412);
  put(path.join(R, 'smartsheet', 'garde.json'), { sheet_version: 413, gates_sheet_version: 88, commentaires: [[1, 10, 'x']] }); assert(/Master/.test(G.gardeSmartsheet(R).cause));
  put(path.join(R, 'smartsheet', 'garde.json'), { sheet_version: 412, gates_sheet_version: 88, commentaires: [[1, 10, 'x'], [1, 11, 'y']] }); assert(/commentaires/.test(G.gardeSmartsheet(R).cause));
  put(path.join(R, 'smartsheet', 'garde.json'), { sheet_version: 412, gates_sheet_version: 88, commentaires: [[1, 10, 'x bloquant']] }); assert(/commentaires/.test(G.gardeSmartsheet(R).cause)); // edited text
  put(path.join(D, 'passages', '2026-11-03-jeudi-1300', 'smartsheet', 'raw.json'), { read_at: '2026-11-03T13:05-05:00', rows: [] });
  put(path.join(D, 'passages', '2026-11-03-jeudi-1300', 'statut.json'), { adaptateurs: [{ nom: 'smartsheet', statut: 'inchange' }] });
  assert(/sans versions/.test(G.gardeSmartsheet(R).cause));
  delete process.env.GARDE_DIST;
});
ok('Gantt: TimeLastModified (Z) = previous modifie_le (offset) to the minute → read.json + file copied; changed → full read', () => {
  const prevP = G.dernier('gantt', RD); const prev = js(prevP); const item = Object.keys(prev.gantts)[0];
  const z = new Date(Date.parse(prev.gantts[item].modifie_le) + 20000).toISOString();
  put(path.join(RD, 'gantt', 'meta.json'), { [item]: { modifie_le: z } });
  const r = G.gardeGantt(RD); assert(r.inchange, r.cause);
  const rj = js(path.join(RD, 'gantt', 'raw', 'read.json')); assert.strictEqual(rj.read_at, '2026-11-03T09:02-05:00'); assert.strictEqual(rj.gantts[item].sha256, prev.gantts[item].sha256);
  assert(fs.existsSync(path.join(RD, 'gantt', 'raw', prev.gantts[item].fichier)));
  put(path.join(RD, 'gantt', 'meta.json'), { [item]: { modifie_le: '2026-11-03T13:00:00Z' } }); assert(!G.gardeGantt(RD).inchange);
});
ok('debut.txt required and with an offset (R6)', () => {
  const R = path.join(tmp, 'nodebut'); put(path.join(R, 'jira', 'raw.json'), {}); assert.throws(() => G.gardeJiraData(R, 0));
  put(path.join(R, 'jira_data', 'debut.txt'), '2026-11-03T14:02Z'); assert.throws(() => G.gardeJiraData(R, 0));
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${n} tests OK`);
