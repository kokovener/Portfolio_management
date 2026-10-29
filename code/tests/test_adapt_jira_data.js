#!/usr/bin/env node
/* Jira data adapter tests on the real 2026-10-28 read. Usage: node tests/test_adapt_jira_data.js <raw.json> <base_dir> */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const { adapt, RE_STG } = require('../tools/adapt_jira_data.js');
const Core = require('../interface/core.js');
const [, , rawP, baseDir] = process.argv;
const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
const rd = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : []);
const base = {}; ['items', 'personnes', 'charges', 'stats_jira'].forEach((c) => { base[c] = rd(path.join(baseDir, c)); });
const r = adapt(raw, base, {});
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const ch = (sprint, who, item) => r.doc.charges.find((c) => c.periode.ref === 'jira.gou21-' + sprint && (c.personne === who || c.nom === who) && c.item === item);
const sig = (kind, row) => r.report.signals.some((s) => s.kind === kind && (!row || s.row === row));

ok('STG21 link recognised in both URL forms (browse and service-desk queue), PLQ links ignored', () => {
  assert.strictEqual('https://plq-supportg2.atlassian.net/browse/STG21-286'.match(RE_STG)[1], 'STG21-286');
  assert.strictEqual('https://plq-supportg2.atlassian.net/jira/servicedesk/projects/STG21/queues/custom/1/STG21-226'.match(RE_STG)[1], 'STG21-226');
  assert(!RE_STG.test('https://supportti.lait.qc.ca/browse/PLQ-8398'));
});
ok('Franck flow: points = team per item and sprint (codes de taxes S19: 46 pts, 14 parents, 1 without points)', () => {
  const c = r.doc.charges.find((x) => x.id === 'jira.s19.equipe.saisie-codes-taxes');
  assert.deepStrictEqual([c.mode, c.valeur, c.tickets, c.sans_points, c.nom, 'personne' in c], ['points', 46, 14, 1, 'Équipe', false]);
  assert(!r.doc.charges.some((x) => x.mode === 'points' && x.personne), 'no person carries points');
  // DoD: a cancelled ticket (GOU21-7753, S20) is neither load nor done
  assert(!r.doc.charges.some((x) => x.source.ref.includes('GOU21-7753')));
});
ok('Franck flow: per-person load = sub-tasks (S19, codes de taxes: non-team assignee 15 incl. 10 done; cancelled sub-tasks excluded)', () => {
  const c = ch('s19', 'Personne_15', 'saisie.codes-taxes'); assert.deepStrictEqual([c.mode, c.valeur, c.faites, c.en_cours], ['taches', 15, 10, 2]);
  assert(sig('personne_inconnue', 'Personne_15'));
  const s19 = r.doc.charges.filter((x) => x.mode === 'taches' && x.periode.ref === 'jira.gou21-s19').reduce((n, x) => n + x.valeur, 0);
  assert.strictEqual(s19, 107 - 7); // 107 sub-tasks in S19 read, 7 cancelled
});
ok('R04: a sprint ticket of an epic owned by no item goes to the programme, signalled per epic', () => {
  assert(r.doc.charges.some((x) => x.id === 'jira.s19.equipe.goutte21')); assert(sig('epic_sans_item', 'GOU21-11067'));
});
ok('R10 + DoD: codes de taxes stat = epic counts without the 5 cancelled (44, 12 done) + S19 content (14 tickets, 46 pts, 4 done)', () => {
  const s = r.doc.stats_jira.find((x) => x.item === 'saisie.codes-taxes');
  assert.deepStrictEqual(s.tickets, { total: 44, faits: 12, en_cours: 15, a_faire: 17 });
  assert.deepStrictEqual(s.sprint, { ref: 'jira.gou21-s19', tickets: 14, faits: 4, points: 46, points_faits: 11 });
});
ok('R03: support = STG21 requests behind open GOU21 tickets (STG21-226 via 10412 + 10413 counted once → Région 1; STG21-206 → Producteur 1)', () => {
  const it = r.doc.items.find((i) => i.id === 'run.extranets');
  assert.deepStrictEqual(it.support.map((s) => [s.extranet, s.ouverts]), [['Producteur', 1], ['Région', 1]]);
  assert.strictEqual('https://plq-supportg2.atlassian.net/browse/STG21-226?search_id=x'.match(RE_STG)[1], 'STG21-226');
  assert.strictEqual(it.source.systeme, 'jira'); assert(!('sante' in it));
});
ok('rerun on the written base writes nothing (idempotent)', () => {
  // keys re-sorted as an ArtifactData export does
  const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { o[k] = sortKeys(v[k]); return o; }, {}) : v);
  const b2 = JSON.parse(JSON.stringify(base));
  ['items', 'charges', 'stats_jira', 'listes_jira'].forEach((c) => (r.doc[c] || []).forEach((x) => { b2[c] = (b2[c] || []).filter((y) => y.id !== x.id).concat([sortKeys(x)]); }));
  const r2 = adapt(Object.assign({}, raw, { read_at: '2026-10-28T13:00-04:00' }), b2, {});
  assert.strictEqual(r2.writes.length, 0, r2.writes.map((w) => w.doc_id).join(', '));
  // R43: next Monday compares to the first read of the previous week (Wed 28 oct. here), then Tuesday to that Monday
  const r3 = adapt(Object.assign({}, raw, { read_at: '2026-11-02T07:05-04:00' }), b2, {});
  assert.deepStrictEqual(r3.doc.items[0].support.map((s) => [s.extranet, s.ouverts, s.tendance, s.tendance_vs]), [['Producteur', 1, 0, '2026-10-26'], ['Région', 1, 0, '2026-10-26']]);
  const b3 = JSON.parse(JSON.stringify(b2)); b3.items = b3.items.filter((y) => y.id !== r3.doc.items[0].id).concat([r3.doc.items[0]]);
  b3.items.find((y) => y.id === r3.doc.items[0].id).support[0].lundis[1].ouverts = 3; // Monday read saw 3 open
  const r4 = adapt(Object.assign({}, raw, { read_at: '2026-11-03T09:05-04:00' }), b3, {});
  const p4 = r4.doc.items[0].support[0]; assert.deepStrictEqual([p4.tendance, p4.tendance_vs, p4.lundis.length], [-2, '2026-11-02', 2]);
  // an extranet absent on Monday (0 open) that appears on Tuesday is ↑ 1, not stable
  const b5 = JSON.parse(JSON.stringify(b3)); const it5 = b5.items.find((y) => y.id === r3.doc.items[0].id); it5.support = it5.support.filter((s) => s.extranet !== 'Région');
  const r5 = adapt(Object.assign({}, raw, { read_at: '2026-11-03T09:05-04:00' }), b5, {});
  const reg = r5.doc.items[0].support.find((s) => s.extranet === 'Région'); assert.deepStrictEqual([reg.tendance, reg.tendance_vs], [1, '2026-11-02']);
});
ok('no Z timestamp, ids valid, model 2 (4 when the sprint calendar is read)', () => {
  const s = JSON.stringify(r.doc); assert(!/\d{2}:\d{2}(:\d{2})?Z/.test(s)); assert.strictEqual(r.doc.modele, raw.sprint_blocked ? '10' : r.doc.listes_jira ? '7' : raw.board_sprints ? '4' : '2');
  r.doc.charges.concat(r.doc.stats_jira).forEach((x) => assert(/^[a-z0-9][a-z0-9._-]{1,79}$/.test(x.id), x.id));
});
if (raw.board_sprints) {
  const fr = (id) => (r.doc.stats_jira.find((x) => x.item === id) || {}).fenetre_reelle;
  ok('R06 actual window: codes de taxes = S15 (28 jul) → open, planned up to S20 (27 nov, deduced), 32 open tickets', () => {
    assert.deepStrictEqual(fr('saisie.codes-taxes'), { debut: '2026-07-28', fin: null, jusqu_au: '2026-11-27', sprints: ['S15', 'S16', 'S17', 'S18', 'S19', 'S20'], ouverts: 32 });
  });
  ok('R06 sprint end at local midnight closes the previous day; future sprints chained (S21 = 30 nov → 18 dec)', () => {
    assert.strictEqual(fr('goutte21.l0').jusqu_au, '2026-12-18');
    assert.strictEqual(fr('goutte21.l8d').jusqu_au, null); // open tickets of L8D are in no sprint
  });
  ok('R06 run item has no epic sprint ticket read → no window', () => assert(!fr('run.extranets')));
  ok('R06 scope guard: more tickets than the stat already in base → signal « périmètre », none when equal', () => {
    const b2 = JSON.parse(JSON.stringify(base)); const st = b2.stats_jira.find((x) => x.item === 'saisie.codes-taxes');
    st.tickets.total -= 3; const r9 = adapt(raw, b2, {});
    assert(r9.report.signals.some((x) => x.kind === 'perimetre' && x.row === 'saisie.codes-taxes'));
    st.tickets.total += 3; assert(!adapt(raw, b2, {}).report.signals.some((x) => x.kind === 'perimetre' && x.row === 'saisie.codes-taxes'));
  });
  ok('R36 daily pass (no step d): the actual window already in base is kept, never erased', () => {
    const b2 = JSON.parse(JSON.stringify(base)); const raw2 = JSON.parse(JSON.stringify(raw)); delete raw2.board_sprints; delete raw2.epic_sprint_issues;
    const keep = { debut: '2026-07-28', fin: null, jusqu_au: '2026-11-27', sprints: ['S15'], ouverts: 1 };
    b2.stats_jira.forEach((x) => { if (x.item === 'saisie.codes-taxes') x.fenetre_reelle = keep; });
    const r9 = adapt(raw2, b2, {}); const st = r9.doc.stats_jira.find((x) => x.item === 'saisie.codes-taxes');
    assert.deepStrictEqual(st.fenetre_reelle, keep);
  });
}
ok('R32/R33 support list: open GOU21 tickets linked to STG21 with title, extranet, STG21 keys and sprint', () => {
  const L = r.doc.listes_jira.find((x) => x.id === 'jira.liste.support');
  assert(L && L.tickets.length === r.report.support_ouverts && L.tickets.every((t) => t.titre && t.stg21.length && t.extranet));
});
ok('R34 preparation list: kept in Jira backlog order (rang = read order), points only when estimated', () => {
  const raw2 = JSON.parse(JSON.stringify(raw)); raw2.ready_issues = [['GOU21-2', 'B', 'PrêtPourGrooming✅', 'Story', null, null, []], ['GOU21-1', 'A', 'PrêtPourSprint🚀', 'Bug', null, 3, []]];
  const L = adapt(raw2, base, {}).doc.listes_jira.find((x) => x.id === 'jira.liste.preparation');
  assert.deepStrictEqual(L.tickets.map((t) => [t.cle, t.rang, t.points]), [['GOU21-2', 1, undefined], ['GOU21-1', 2, 3]]);
});
ok('assignee who joins the team keeps the id of the charge written under their Jira name (no duplicate, now « connu »)', () => {
  const r0 = adapt(raw, base, {}); const ext = r0.doc.charges.find((c) => c.mode === 'taches' && c.nom); if (!ext) return;
  const b2 = JSON.parse(JSON.stringify(base)); b2.charges = (b2.charges || []).concat([ext]);
  const parts = ext.nom.split(' '); b2.personnes = b2.personnes.concat([{ id: 'team.' + Core.slug(parts.slice(1).join(' ') + ' ' + parts[0]), nom: ext.nom, role: 'dev', voie: 'scrum', source: ext.source }]);
  const c = adapt(raw, b2, {}).doc.charges.find((x) => x.id === ext.id);
  assert(c && c.personne && !c.nom, JSON.stringify(c));
});
ok('K13: a Jira-data charge of a sprint read here and not produced any more is deleted; a charge of an unread sprint is kept', () => {
  const b2 = JSON.parse(JSON.stringify(base)); const src = { systeme: 'jira', par: 'adaptateur-jira-data', lu_le: '2026-10-28T12:00-04:00' };
  const sp = Object.values(raw.sprints)[0];
  b2.charges = (b2.charges || []).concat([{ id: 'jira.x.stale.item', item: 'goutte21', periode: { type: 'sprint', ref: sp }, role: 'dev', mode: 'taches', valeur: 1, nom: 'X', source: src },
    { id: 'jira.s01.old.item', item: 'goutte21', periode: { type: 'sprint', ref: 'jira.gou21-s01' }, role: 'dev', mode: 'taches', valeur: 1, nom: 'X', source: src }]);
  const r9 = adapt(raw, b2, { 'charges/jira.x.stale.item': 2 });
  const del = r9.writes.filter((w) => w.op === 'delete');
  assert.deepStrictEqual(del.map((w) => [w.doc_id, w.if_version, w.purge]), [['jira.x.stale.item', 2, 'K13']]);
});
ok('R27 waits from Jira: status Bloqué or open « is blocked by » link on an item epic; first day kept; unblocked → recue_le, never deleted', () => {
  const raw2 = JSON.parse(JSON.stringify(raw)); const ep = base.items.find((i) => (i.epics_jira || []).length).epics_jira[0];
  raw2.blocked = [['GOU21-1', 'Bloqué net', 'Bloqué', ep, []], ['GOU21-2', 'Lié', 'En cours', ep, [['GOU21-9', 'indeterminate']]], ['GOU21-3', 'Lien fini', 'En cours', ep, [['GOU21-8', 'done']]], ['GOU21-4', 'Hors portefeuille', 'Bloqué', 'GOU21-0', []]];
  raw2.blocked_subtasks = [['GOU21-11', '[FE] x', 'GOU21-1'], ['GOU21-12', '[QA] y', 'GOU21-77']];
  const r1 = adapt(raw2, base, {}); const A = r1.doc.attentes;
  assert.deepStrictEqual(A.map((a) => [a.id, a.tiers]), [['jira.att.gou21-1', 'Jira · statut Bloqué'], ['jira.att.gou21-2', 'Jira · bloqué par GOU21-9']]);
  assert(/1 sous-tâche bloquée/.test(A[0].objet) && A[0].attendue_le === raw2.read_at.slice(0, 10) && A[0].recue_le === null);
  assert(r1.report.signals.some((x) => x.kind === 'sous_tache_bloquee'));
  const b2 = JSON.parse(JSON.stringify(base)); b2.attentes = A.map((a) => Object.assign({}, a, { attendue_le: '2026-10-20' }));
  const raw3 = JSON.parse(JSON.stringify(raw2)); raw3.blocked = raw3.blocked.filter(([k]) => k !== 'GOU21-2');
  const A3 = adapt(raw3, b2, {}).doc.attentes;
  assert.strictEqual(A3.find((a) => a.id === 'jira.att.gou21-1').attendue_le, '2026-10-20');
  assert.strictEqual(A3.find((a) => a.id === 'jira.att.gou21-2').recue_le, raw3.read_at.slice(0, 10));
});
ok('R27 bis: blocked tickets of the sprints read → jira.liste.bloques; sub-task carries parent and its epic via the parent; other sprints dropped', () => {
  const raw2 = JSON.parse(JSON.stringify(raw)); const ids = Object.keys(raw2.sprints).map(Number); const ep = base.items.find((i) => (i.epics_jira || []).length).epics_jira[0];
  raw2.sprint_blocked = [['GOU21-1', 'Story', 'Story', false, ep, 'A', [ids[0], 999]], ['GOU21-2', '[FE] x', 'Sous-Tâche Dev', true, 'GOU21-1', 'B', [ids[0]]], ['GOU21-3', 'ailleurs', 'Tâche', false, null, null, [999]]];
  const L = adapt(raw2, base, {}).doc.listes_jira.find((x) => x.id === 'jira.liste.bloques');
  assert.deepStrictEqual(L.tickets.map((t) => [t.cle, t.sous_tache, t.parent, t.epic, !!t.item, t.sprints.length]), [['GOU21-1', false, undefined, ep, true, 1], ['GOU21-2', true, 'GOU21-1', ep, true, 1]]);
});
console.log(`\n${n} tests OK`);
