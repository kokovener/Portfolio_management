#!/usr/bin/env node
/* Cadence tests (R36): plans per pass and day, sprint starts, lecture records, block freshness.
 * Usage: node tests/test_cadence.js <schema.json> */
'use strict';
const fs = require('fs'); const assert = require('assert');
const { plan, sprintOf, lecture, loadCadence } = require('../tools/cadence.js');
const C = require('../interface/core.js');
const schema = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const cad = loadCadence();
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const names = (p) => p.adaptateurs.map((a) => a.adaptateur);

ok('lundi 2 nov. (pas un début de sprint) : photo sans Outlook, Jira data avec le réel (étape d), instantané + digest + Teams', () => {
  const p = plan(cad, 'lundi', '2026-11-02');
  assert.deepStrictEqual(names(p), ['smartsheet', 'jira', 'jira_data_reel', 'artefacts', 'gantt', 'miro']);
  assert(p.instantane && p.digest && p.teams); assert.deepStrictEqual(p.avertissements, []);
});
ok('lundi 9 nov. = début de sprint (F4) : Outlook ajouté, avant Jira (ordre C4)', () => {
  assert.deepStrictEqual(names(plan(cad, 'lundi', '2026-11-09')), ['smartsheet', 'outlook', 'jira', 'jira_data_reel', 'artefacts', 'gantt', 'miro']);
});
ok('sprints de 3 semaines : 9 nov., 30 nov., 21 déc. ; S19 en cours = 19 oct. → 6 nov.', () => {
  ['2026-11-09', '2026-11-30', '2026-12-21'].forEach((d) => assert(sprintOf(cad, d).debut_sprint, d));
  assert(!sprintOf(cad, '2026-11-16').debut_sprint);
  assert.deepStrictEqual(sprintOf(cad, '2026-10-28'), { debut_sprint: false, sprint_debut: '2026-10-19', sprint_fin: '2026-11-06' });
});
ok('quotidien 9 h : Jira + Jira data ; mercredi + Artefacts (F5) ; rien d\'autre, jamais d\'instantané', () => {
  assert.deepStrictEqual(names(plan(cad, 'quotidien', '2026-11-03')), ['jira', 'jira_data']);
  assert.deepStrictEqual(names(plan(cad, 'quotidien', '2026-11-04')), ['jira', 'jira_data', 'artefacts']);
  assert(!plan(cad, 'quotidien', '2026-11-04').instantane);
});
ok('jeudi 13 h : Smartsheet seul (F2)', () => assert.deepStrictEqual(names(plan(cad, 'jeudi', '2026-11-05')), ['smartsheet']));
ok('à la demande « équipe » (F3) : Outlook mode équipe puis Jira data, avertissement sprints de la dernière lecture', () => {
  const p = plan(cad, 'demande', '2026-10-28', 'equipe');
  assert.deepStrictEqual(names(p), ['outlook_equipe', 'jira_data']); assert.strictEqual(p.avertissements.length, 1);
  assert.throws(() => plan(cad, 'demande', '2026-10-28', 'inconnue'));
});
ok('jour hors passage : plan rendu avec un avertissement (lancement manuel)', () => assert(/samedi/.test(plan(cad, 'quotidien', '2026-11-07').avertissements[0])));
ok('lecture : document v6 valide, épinglé quand la version est connue, Z refusé', () => {
  const w = lecture(schema, 'jira_data', 'quotidien', '2026-11-03T09:05-05:00', 'ok', 12, { 'lectures/lecture.jira-data': 4 });
  assert.strictEqual(w[0].doc_id, 'lecture.jira-data'); assert.strictEqual(w[0].if_version, 4); assert.deepStrictEqual(C.validate(schema, 'lecture', w[0].data), []);
  assert(!lecture(schema, 'miro', 'skill', '2026-11-03T09:05-05:00', 'ok', 0, {})[0].if_version);
  assert.throws(() => lecture(schema, 'jira', 'quotidien', '2026-11-03T14:05Z', 'ok', 0, {}));
  assert.throws(() => lecture(schema, 'inconnu', 'quotidien', '2026-11-03T09:05-05:00', 'ok', 0, {}));
});
ok('fraîcheur : lecture du jour = fraîche ; Jira data relu par le réel (jira_data_reel) couvre B1 ; 2 j ouvrés = périmé', () => {
  const base = C.emptyBase();
  base.lectures = [{ id: 'lecture.jira-data-reel', adaptateur: 'jira_data_reel', passage: 'lundi', lu_le: '2026-11-02T07:20-05:00', statut: 'ok' },
    { id: 'lecture.outlook', adaptateur: 'outlook', passage: 'lundi', lu_le: '2026-10-27T07:30-04:00', statut: 'ok' }];
  const f = C.fraicheurBloc(base, cad, 'B1', '2026-11-03');
  assert.strictEqual(f.perime, false); assert.strictEqual(f.lu_le, '2026-10-27T07:30-04:00'); // oldest input shown
  assert.strictEqual(C.fraicheurBloc(base, cad, 'B1', '2026-11-04').perime, true);
  assert.strictEqual(C.fraicheurBloc(base, cad, 'B6', '2026-11-04').lu_le, '2026-10-27T07:30-04:00'); // full Outlook covers the team
});
ok('fraîcheur sans aucune lecture : date la plus récente écrite par l\'adaptateur ; échec ignoré ; absent = « jamais lu »', () => {
  const base = C.emptyBase();
  base.sprints = [{ id: 's', source: { systeme: 'jira', par: 'adaptateur-jira', lu_le: '2026-10-28T16:30-04:00' } }];
  base.lectures = [{ id: 'lecture.jira', adaptateur: 'jira', passage: 'quotidien', lu_le: '2026-11-03T09:00-05:00', statut: 'echec' }];
  const f = C.fraicheurBloc(base, cad, 'B3', '2026-10-29');
  assert.strictEqual(f.entrees[0].origine, 'données'); assert.strictEqual(f.perime, false);
  const g = C.fraicheurBloc(C.emptyBase(), cad, 'B4', '2026-10-29'); assert.strictEqual(g.lu_le, null); assert.strictEqual(g.perime, true);
});
console.log(`\n${n} tests OK`);
