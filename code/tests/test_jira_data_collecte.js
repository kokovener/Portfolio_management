#!/usr/bin/env node
/* jira_data_collecte.js tests on the real collector read of 3 Nov. 2026 (run named in demande.json: 2026-11-03-essai3, 85 responses).
 * Usage: node tests/test_jira_data_collecte.js <dist/runs/2026-11-03/collecteur> */
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path'); const assert = require('assert');
const SRC = path.resolve(process.argv[2]);
const C = require('../tools/jira_data_collecte.js');
const { adapt } = require('../tools/adapt_jira_data.js');
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const js = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'collecte-'));
// fresh copy of the run folder (demande, debut, export) for each case
const fresh = (name) => {
  const rd = path.join(tmp, name);
  fs.mkdirSync(path.join(rd, 'jira_data'), { recursive: true });
  ['demande.json', 'debut.txt'].forEach((f) => fs.copyFileSync(path.join(SRC, 'jira_data', f), path.join(rd, 'jira_data', f)));
  fs.cpSync(path.join(SRC, 'jira_data', 'export'), path.join(rd, 'export'), { recursive: true });
  return rd;
};
const RUN = js(path.join(SRC, 'jira_data', 'demande.json')).run_id;
const rep = (rd, id) => path.join(rd, 'export', 'lectures', RUN, 'reponses', `${id}.json`);
const edit = (p, fn) => { const d = js(p); fn(d); fs.writeFileSync(p, JSON.stringify(d)); };

ok('real export → raw.json in the flattened shape, counts cross-checked, no error', () => {
  const rd = fresh('ok'); const r = C.assemble(path.join(rd, 'export'), rd);
  assert.ok(r.ok, JSON.stringify(r.report.erreurs));
  const raw = js(path.join(rd, 'jira_data', 'raw.json'));
  ['site', 'project', 'board', 'read_at', 'queries', 'sprints', 'active_sprint', 'sprint_issues', 'sub_tasks', 'epic_names',
    'item_counts', 'support', 'ready_issues', 'blocked', 'blocked_subtasks', 'sprint_blocked'].forEach((k) => assert.ok(k in raw, k));
  assert.ok(!('board_sprints' in raw), 'daily read: no step d');
  assert.strictEqual(raw.read_at, fs.readFileSync(path.join(rd, 'jira_data', 'debut.txt'), 'utf8').trim());
  const cnt = (id) => { const o = JSON.parse(js(rep(rd, id)).texte); return (o.data || o).totalCount; };
  assert.strictEqual(raw.sprint_issues.length, cnt('a_count-001')); assert.strictEqual(raw.sub_tasks.length, cnt('a2_count-001'));
  const three = new Set(Object.keys(raw.sprints).map(Number));
  assert.ok(raw.sprint_issues.every((t) => t.sprints.every((s) => three.has(s))), 'sprint ids kept among the 3');
  assert.ok(raw.sprint_issues.filter((t) => 'status' in t).every((t) => t.status === 'Annulé'), 'status only when Annulé');
  Object.values(raw.item_counts).forEach((c) => ['total', 'done', 'in_progress', 'cancelled'].forEach((k) => assert.strictEqual(typeof c[k], 'number')));
  assert.ok(Object.keys(raw.support.issues).every((k) => raw.support.links[k]), 'a support issue has its STG21 link');
});

ok('the adapter accepts the assembled raw (same entry point as a transcribed raw)', () => {
  const rd = fresh('adapt'); C.assemble(path.join(rd, 'export'), rd);
  const raw = js(path.join(rd, 'jira_data', 'raw.json'));
  const base = { items: [{ id: 'saisie.codes-taxes', epics_jira: ['GOU21-9199'], type: 'projet' }], personnes: [], charges: [], stats_jira: [], listes_jira: [], attentes: [] };
  const out = adapt(raw, base, {});
  assert.ok(out && typeof out === 'object');
});

ok('collect not « fini » → refused, no raw written', () => {
  const rd = fresh('echec'); edit(path.join(rd, 'export', 'etats', `${RUN}.json`), (d) => { d.etat = 'echec'; d.erreurs = ['c_liens : tool_error']; });
  assert.throws(() => C.assemble(path.join(rd, 'export'), rd), /echec/);
  assert.ok(!fs.existsSync(path.join(rd, 'jira_data', 'raw.json')));
});

ok('export shorter than the page wrote → refused (unpaged ArtifactData list)', () => {
  const rd = fresh('court'); fs.unlinkSync(rep(rd, 'c_liens-001'));
  assert.throws(() => C.assemble(path.join(rd, 'export'), rd), /export incomplet/);
});

ok('page chain cut (last page isLast false) → refused', () => {
  const rd = fresh('coupe'); fs.unlinkSync(rep(rd, 'a2_sub_tasks-004'));
  edit(path.join(rd, 'export', 'etats', `${RUN}.json`), (d) => { d.reponses -= 1; });
  assert.throws(() => C.assemble(path.join(rd, 'export'), rd), /chaîne coupée/);
});

ok('count cross-check differs → error report, no raw written', () => {
  const rd = fresh('compte');
  edit(rep(rd, 'a2_count-001'), (d) => { const t = JSON.parse(d.texte); t.data.totalCount += 1; d.texte = JSON.stringify(t); });
  const r = C.assemble(path.join(rd, 'export'), rd);
  assert.ok(!r.ok && r.report.erreurs.some((e) => /sub_tasks/.test(e)));
  assert.ok(!fs.existsSync(path.join(rd, 'jira_data', 'raw.json')));
});

ok('a previous support key Jira no longer returns → signal, never a failure', () => {
  const rd = fresh('introuvable');
  // a previous key that is not also a candidate of the window (otherwise the candidate read gives its detail)
  const dir = path.join(rd, 'export', 'lectures', RUN, 'reponses');
  const cand = new Set(fs.readdirSync(dir).filter((f) => f.startsWith('c_candidats')).flatMap((f) => JSON.parse(js(path.join(dir, f)).texte).data.issues.map((i) => i.key)));
  const page = fs.readdirSync(dir).filter((f) => f.startsWith('c_precedents')).find((f) => JSON.parse(js(path.join(dir, f)).texte).data.issues.every((i) => !cand.has(i.key)));
  assert.ok(page, 'fixture: a previous key outside the window');
  edit(path.join(dir, page), (d) => { d.texte = JSON.stringify({ introuvable: 'GOU21-1', cause: 'tool_error', issues: [], isLast: true }); });
  const r = C.assemble(path.join(rd, 'export'), rd);
  assert.ok(r.ok, JSON.stringify(r.report.erreurs));
  assert.ok(r.report.signaux.some((s) => /support_prev non relues/.test(s)));
});

ok('a daily request assembled with --reel (or the reverse) is refused: folders jira_data / jira_data_reel (R6)', () => {
  const rd = fresh('reel'); fs.mkdirSync(path.join(rd, 'jira_data_reel'));
  ['demande.json', 'debut.txt'].forEach((f) => fs.copyFileSync(path.join(rd, 'jira_data', f), path.join(rd, 'jira_data_reel', f)));
  assert.throws(() => C.assemble(path.join(rd, 'export'), rd, true), /sans --reel/);
});

console.log(`${n} ok`);
