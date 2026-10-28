#!/usr/bin/env node
/* Core tests on the real step-1 examples. Usage: node tests/test_core.js <schema.json> <base_seed.json> */
'use strict';
const fs = require('fs');
const assert = require('assert');
const Core = require('../interface/core.js');

const schema = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const seed = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const base = Core.mergeDocs([seed]);
const T = '2026-10-27';
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

ok('mini-validator: every seeded record valid against its $def', () => {
  Core.COLLECTIONS.forEach((c) => base[c].forEach((r) => {
    const e = Core.validate(schema, Core.DEF_OF[c], r); assert.deepStrictEqual(e, [], `${c}/${r.id}: ${e}`);
  }));
  assert.deepStrictEqual(Core.validate(schema, null, seed), []);
});
ok('mini-validator: negatives refused (unknown field, bad id, note 6, Z timestamp, oneOf)', () => {
  const it = Object.assign({}, base.items[0]);
  assert(Core.validate(schema, 'item', Object.assign({}, it, { budget: 'x' })).some((e) => /champ inconnu/.test(e)));
  assert(Core.validate(schema, 'item', Object.assign({}, it, { id: 'L8D' })).some((e) => /format/.test(e)));
  assert(Core.validate(schema, 'item', Object.assign({}, it, { priorite: { valeur: 6, urgence: 1, effort: 1 } })).some((e) => /maximum/.test(e)));
  assert(Core.validate(schema, 'item', Object.assign({}, it, { updated_at: '2026-10-27T10:00Z' })).some((e) => /format/.test(e)));
  assert(Core.validate(schema, 'item', Object.assign({}, it, { parent: 3 })).some((e) => /aucune forme/.test(e)));
  assert(Core.validate(schema, 'jalon', { id: 'x.y', item: 'a.b', nom: 'n', date: '2026-11-01', statut: 'fini', source: { systeme: 'saisie', lu_le: '2026-10-27T10:00-04:00' } }).some((e) => /hors liste/.test(e)));
});
ok('dates: working days and EDT timestamp', () => {
  assert.strictEqual(Core.workingDaysBetween('2026-11-20', '2026-12-04'), 10);
  assert.strictEqual(Core.workingDaysBetween('2026-11-14', '2026-11-28'), 10);
  assert.strictEqual(Core.mondayOf(T), '2026-10-26');
  assert.match(Core.nowTs(new Date('2026-10-27T21:05:00Z')), /^2026-10-27T17:05-04:00$/);
});
ok('D8 health: Expert G1 jaune (risk 12), L8 rouge (risk 16), L8D vert, Run TI vert', () => {
  const ix = Core.index(base);
  assert.strictEqual(Core.sante(base, ix.items['feed.expertg1'], T).couleur, 'jaune');
  assert.strictEqual(Core.sante(base, ix.items['goutte21.l8'], T).couleur, 'rouge');
  assert.strictEqual(Core.sante(base, ix.items['goutte21.l8d'], T).couleur, 'vert');
  assert.strictEqual(Core.sante(base, ix.items['run.ti'], T).couleur, 'vert');
});
ok('D8 health: attente 5+ working days late turns jaune; overdue jalon turns rouge; staleness rouge', () => {
  const ix = Core.index(base);
  assert.strictEqual(Core.sante(base, ix.items['run.ti'], '2026-11-03').couleur, 'jaune'); // 26 oct -> 3 nov = 6 jo > 5
  assert.strictEqual(Core.sante(base, ix.items['run.ti'], '2026-11-03').motifs.length, 1);
  assert.strictEqual(Core.sante(base, ix.items['goutte21.l8d'], '2026-11-15').couleur, 'rouge');
  assert.strictEqual(Core.sante(base, ix.items['goutte21.l8d'], '2026-11-11').couleur, 'rouge'); // updated 27 oct + 15 j
});
ok('D9 priority: score and ranks', () => {
  const r = Core.rangs(base);
  assert.strictEqual(r['feed.expertg1'], 1);
  assert.strictEqual(Core.risqueMaxNote(base, 'feed.expertg1'), 2);
});
ok('progress: source % wins, else done/total jalons', () => {
  const ix = Core.index(base);
  assert.deepStrictEqual(Core.pct(base, ix.items['goutte21.l8d']), { valeur: 3, origine: 'source' });
  assert.deepStrictEqual(Core.pct(base, ix.items['saisie.codes-taxes']), { valeur: 25, origine: 'jalons' });
});
ok('alerts: jalon recul +10 jo, dependency ADR -> décision CDP and taxes -> L8D, no MEP/WIP alert today', () => {
  const a = Core.alertes(base, T);
  const k = a.map((x) => x.kind);
  assert(a.some((x) => x.kind === 'jalon' && /Décision CDP/.test(x.texte) && /\+10/.test(x.texte)));
  assert(a.some((x) => x.kind === 'dependance' && x.item === 'saisie.codes-taxes'));
  assert(a.some((x) => x.kind === 'dependance' && x.item === 'goutte21.l8d'));
  assert(!k.includes('mep') && !k.includes('wip'));
  assert(a.some((x) => x.kind === 'phase' && x.item === 'goutte21.l8')); // seed L8: smartsheet, no phase
});
ok('alerts: MEP planifiée within 7 days', () => {
  const b = Core.mergeDocs([seed, { meps: [{ id: 'jira.gou21-1', date: '2026-10-30', systeme: 'G2.1', statut: 'planifiee', source: { systeme: 'ledger', lu_le: '2026-10-27T07:00-04:00' } }] }]);
  assert(Core.alertes(b, T).some((x) => x.kind === 'mep'));
});
ok('WIP: Luc 1 / 2, Franck 1 / 3 this week', () => {
  const w = Core.wipParPersonne(base, T);
  assert.deepStrictEqual(w.map((x) => [x.personne, x.wip, x.limite]).sort(), [['team.personne-09', 1, 2], ['team.kowalczyk-franck', 1, 3]]);
});
ok('sprint S20: dev capacity, reserve; without Jira tickets no item and no milestone (R04, Jira only)', () => {
  const s = Core.sprintVue(base, 'jira.gou21-s20', T);
  assert.strictEqual(s.dev.net, 10);
  assert.strictEqual(s.reserve_j, 1.5);
  assert.deepStrictEqual([s.items.length, s.jalons.length], [0, 0]);
});
ok('sprint S19 (seed v2, Franck flow): items = items holding Jira tickets, team points, per-person sub-task counts', () => {
  const b2 = Core.mergeDocs([JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'seed_v2.json'), 'utf8'))]);
  const s = Core.sprintVue(b2, 'jira.gou21-s19', T);
  assert.deepStrictEqual(s.items.map((i) => i.id), ['saisie.codes-taxes']);
  assert.deepStrictEqual([s.jira.points, s.jira.horsItem.points, s.jira.sousTaches], [77, 31, 10]);
  const ext = s.personnes.find((p) => p.nom === 'Testeur Externe');
  assert(ext && !ext.connu && ext.sousTaches === 4 && ext.aFaire === 1 && !('points' in ext));
  const j = Core.jiraOf(b2, 'saisie.codes-taxes', 'jira.gou21-s19');
  assert.strictEqual(j.equipe, 46); assert.deepStrictEqual(j.parPersonne.map((p) => p.sousTaches), [6, 4]);
});
ok('charge par rôle: dev in j-p, architecte in WIP', () => {
  const c = Core.chargeParRole(base, T, 4);
  const dev = c.find((x) => x.role === 'dev'); const ar = c.find((x) => x.role === 'architecte');
  assert.strictEqual(dev.mode, 'jours'); assert.strictEqual(dev.demande, 14.5); assert.strictEqual(dev.capacite, 17); // 2 sprints x 10 j - 15 % run reserve
  assert.strictEqual(ar.mode, 'wip'); assert.strictEqual(ar.pct, 50);
});
ok('ids: slug + uniqueness', () => {
  assert.strictEqual(Core.newId('saisie', 'Méthane P2 — été', []), 'saisie.methane-p2-ete');
  assert.strictEqual(Core.newId('saisie', 'Méthane P2 — été', ['saisie.methane-p2-ete']), 'saisie.methane-p2-ete-2');
});
ok('absences prorated on jours_ouvres (half-day = 0.5; partial overlap prorated; collective applies to all)', () => {
  const b = { absences: [
    { personne: 'p1', debut: '2026-11-03', fin: '2026-11-03', jours_ouvres: 0.5 },
    { personne: 'p1', debut: '2026-11-05', fin: '2026-11-10', jours_ouvres: 2 }, // 4 weekdays, 2 days off (half days)
    { personne: null, debut: '2026-12-25', fin: '2026-12-25', jours_ouvres: 1 }] };
  assert.strictEqual(Core.absJoursDansPeriode(b, 'p1', '2026-11-02', '2026-11-06'), 0.5 + 1); // 2 of 4 weekdays of the 2nd record
  assert.strictEqual(Core.absJoursDansPeriode(b, 'p2', '2026-12-21', '2026-12-31'), 1);
  const dup = { absences: [b.absences[2], { personne: 'p1', debut: '2026-12-24', fin: '2026-12-28', jours_ouvres: 3 }] };
  assert.strictEqual(Core.absJoursDansPeriode(dup, 'p1', '2026-12-21', '2026-12-31'), 3); // holiday inside a personal absence: not removed twice
});
ok('retro actions in sprint view: own sprint + open earlier ones, numeric sprint order', () => {
  const b = JSON.parse(JSON.stringify(base));
  b.sprints.push({ id: 'jira.gou21-s9', nom: 'S9', debut: '2026-01-05', fin: '2026-01-16', etat: 'clos', source: b.sprints[0].source },
    { id: 'jira.gou21-s10', nom: 'S10', debut: '2026-01-19', fin: '2026-01-30', etat: 'clos', source: b.sprints[0].source });
  const A = (id, sprint, statut) => ({ id, board: 'x', texte: id, statut, sprint, source: { systeme: 'miro', lu_le: '2026-10-27T19:38-04:00' } });
  b.actions_retro = [A('a9', 'jira.gou21-s9', 'a_faire'), A('a9f', 'jira.gou21-s9', 'fait'), A('a19', 'jira.gou21-s19', 'a_faire'), A('a100', 'jira.gou21-s100', 'a_faire')];
  const ids = (sid) => Core.sprintVue(b, sid, '2026-10-27').actions.map((a) => a.id).sort();
  assert.deepStrictEqual(ids('jira.gou21-s10'), ['a9']);
  assert.deepStrictEqual(ids('jira.gou21-s19'), ['a19', 'a9']);
  assert.deepStrictEqual(ids('jira.gou21-s9'), ['a9', 'a9f']);
});
console.log(`\n${n} tests OK`);
