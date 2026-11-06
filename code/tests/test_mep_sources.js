#!/usr/bin/env node
/* MEP evidence (D18 v8, Statut TI rules) on the real 30 Oct. 2026 reads.
 * Usage: node tests/test_mep_sources.js <mep_sources_raw.json> <jira_passage_dir> <ledger.md>... (W40..W44)
 * jira_passage_dir = dist/passages/2026-10-30-quotidien-0902/jira (raw.json + base/). Ledgers frozen at 30 Oct. */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const { preuves, closingDate, frenchDate, labelOf } = require('../tools/mep_preuves.js');
const { adapt, parseLedger } = require('../tools/adapt_jira.js');
const [, , srcP, jiraDir, ...ledgerPs] = process.argv;
const src = JSON.parse(fs.readFileSync(srcP, 'utf8'));
const raw = JSON.parse(fs.readFileSync(path.join(jiraDir, 'raw.json'), 'utf8'));
const rd = (d) => fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : [];
const base = { sprints: rd(path.join(jiraDir, 'base', 'sprints')), meps: rd(path.join(jiraDir, 'base', 'meps')) };
// Ledgers keep growing: freeze them at the lines known on 30 Oct. 2026
const ledgers = ledgerPs.map((p) => parseLedger(fs.readFileSync(p, 'utf8'), p).filter((l) => l.ref.slice(-10) <= '2026-10-30'));
const ev = preuves(src, src.read_at);
const r = adapt(raw, base, {}, ledgers, src);
const r0 = adapt(raw, base, {}, ledgers, null);
const mp = (doc, k) => doc.meps.find((m) => m.ticket === k);
const sig = (rep, kind, row) => rep.signals.some((s) => s.kind === kind && (!row || s.row === row));
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };

ok('closing message after midnight = previous evening (GOU21-11185, "MEP complétée" at 00h10 EDT)', () => assert.strictEqual(closingDate('2026-10-15T04:10:04Z'), '2026-10-14'));
ok('closing message in the evening keeps its day in Québec time (02h30 UTC = 22h30 EDT)', () => assert.strictEqual(closingDate('2026-10-21T02:30:54Z'), '2026-10-20'));
ok('French date in an announcement ("lundi 2 novembre")', () => assert.strictEqual(frenchDate('la bascule lundi 2 novembre à 9h', '2026-10-30'), '2026-11-02'));
ok('label from the body "[SDD-2990] … - Jira", else the cleaned subject', () => {
  assert.strictEqual(labelOf('MEP (SQL) | SDD-2990 | G1', "Billet : [SDD-2990] Ajout contrat d'innovation usine 301 - Jira  Instructions", 'SDD-2990'), "Ajout contrat d'innovation usine 301");
  assert.strictEqual(labelOf('MEP G1 SDD-2960 Composition', '', 'SDD-2960'), 'Composition');
});
ok('calendar no longer read (Franck 5 Nov.): no signal, no evidence, even with a calendar key in the raw file', () => { assert(!sig(ev, 'calendrier_mep_inaccessible')); assert(!ev.preuves.some((p) => p.source === 'calendrier')); });
ok('noise ignored: Statut TI, Jira notifications, digests, Service Desk without a dated announcement', () => {
  const refs = ev.preuves.map((p) => p.ref).join('\n');
  assert(!/Statut TI|STG21|Reaction|PLQ-9440|Organismes/.test(refs));
});
ok('"SDD-1981.sql" is a file name, not a ticket (SDD-2981 mail)', () => assert(!ev.preuves.some((p) => p.keys.includes('SDD-1981'))));
ok('bare reply "MEP terminée" linked to its thread\'s ticket (GOU21-11325, OPS_ExRegion_2610)', () => {
  const p = ev.preuves.find((x) => x.statut === 'completee' && x.keys.includes('GOU21-11325')); assert(p && p.date === '2026-10-27');
});
ok('Teams "effectuée hier" = previous day, versions given', () => {
  const p = ev.preuves.find((x) => x.source === 'teams' && x.statut === 'completee'); assert.strictEqual(p.date, '2026-10-20'); assert(p.versions.includes('OPS_ExUsine_2610'));
});
ok('evidence without ticket nor version: reported, never written', () => assert(ev.signals.filter((s) => s.kind === 'mep_preuve_orpheline').length >= 1));
// --- merged with Jira and the ledger (adapt_jira v10) ---
ok('paid error 29 Oct.: SDD-2981 planned in the ledger, done by Richard Tremblay\'s mail of 23 Oct. -> completee, email wins', () => {
  const m = mp(r.doc, 'SDD-2981'); assert.deepStrictEqual([m.statut, m.date, m.responsable, m.source.systeme], ['completee', '2026-10-23', 'Richard Tremblay', 'outlook']);
  assert(sig(r.report, 'mep_ecart', 'SDD-2981')); assert.strictEqual(mp(r0.doc, 'SDD-2981').statut, 'planifiee');
});
ok('paid error 29 Oct.: SDD-2987 absent from the ledger, written from the mail, reported mep_hors_ledger', () => {
  const m = mp(r.doc, 'SDD-2987'); assert.deepStrictEqual([m.statut, m.date, m.systeme, m.item], ['completee', '2026-10-28', 'G1', 'run.ti']);
  assert(sig(r.report, 'mep_hors_ledger', 'SDD-2987')); assert(!mp(r0.doc, 'SDD-2987'));
});
ok('GOU21 ticket: Jira keeps the status, the email gives the deployment date (GOU21-11185: 14 Oct., not the 19 Oct. closing)', () => {
  const m = mp(r.doc, 'GOU21-11185'); assert.deepStrictEqual([m.statut, m.date], ['completee', '2026-10-14']); assert(/email/.test(m.source.ref) && m.source.systeme === 'jira');
});
ok('version named in a mail / Teams post reaches its MEP ticket (OPS_ExUsine_2610 -> GOU21-10582, 20 Oct.)', () => assert.strictEqual(mp(r.doc, 'GOU21-10582').date, '2026-10-20'));
ok('a proof of deployment beats a later-ranked announcement (GOU21-11326: ledger complétée 27 Oct. over the email announcement)', () => {
  const m = mp(r.doc, 'GOU21-11326'); assert.deepStrictEqual([m.statut, m.date], ['completee', '2026-10-27']); assert(/ledger/.test(m.source.ref));
});
ok('PLQ announcement dated by Service Desk: planned 2 Nov., system Infra', () => { const m = mp(r.doc, 'PLQ-9462'); assert.deepStrictEqual([m.statut, m.date, m.item], ['planifiee', '2026-11-02', 'run.ti']); });
ok('without sources: Jira + ledger only, said by signal sources_mep_absentes', () => assert(sig(r0.report, 'sources_mep_absentes') && !sig(r.report, 'sources_mep_absentes')));
ok('model: source.systeme in the schema enum (outlook, teams, ledger, jira), no Z timestamp', () => {
  r.doc.meps.forEach((m) => assert(['jira', 'outlook', 'teams', 'ledger'].includes(m.source.systeme), m.id));
  assert(!/T\d\d:\d\d(:\d\d)?(\.\d+)?Z/.test(JSON.stringify(r.doc)));
});
// --- fresh review 30 Oct. (cause: rules built from one month of phrasings) ---
const one = (sum, subj, iso, sender) => preuves({ emails: [[iso || '2026-10-20T15:00:00Z', sender || 'A', subj || 'MEP - X GOU21-1', sum]] }, '2026-10-30T10:00-04:00').preuves;
ok('any confirmation phrasing is a proof (la MEP est complétée, réalisée, faite, déploiement terminé)', () => {
  ['Bonjour Franck, la MEP est complétée', 'MEP réalisée avec succès', 'Mep faite', 'Déploiement en production terminé'].forEach((x) => assert.strictEqual(one(x)[0].statut, 'completee', x));
});
ok('a date in the quoted history does not date an announcement ("demain" wins over "Envoyé : 12 octobre")', () => assert.strictEqual(one('MEP prévue demain. Envoyé : 12 octobre 2026')[0].date, '2026-10-21'));
ok('year of a French date across the new year', () => { assert.strictEqual(frenchDate('le 28 décembre', '2027-01-05'), '2026-12-28'); assert.strictEqual(frenchDate('le 5 janvier', '2026-12-20'), '2027-01-05'); });
ok('G1 rule: Richard Tremblay\'s mail = date of the mail, even before 6 h', () => assert.strictEqual(one('...\\MEP\\SDD-1\\ Destination : SQL', 'SDD-1 x', '2026-10-23T05:30:00Z', 'Richard Tremblay')[0].date, '2026-10-23'));
ok('a reply is linked to its thread only within 7 days', () => {
  const p = preuves({ emails: [['2026-10-01T15:00:00Z', 'A', 'MEP Extranets', 'Billet de MEP: GOU21-1'], ['2026-10-25T15:00:00Z', 'A', 'RE: MEP Extranets', 'MEP terminée']] }, '2026-10-30T10:00-04:00');
  assert(!p.preuves.some((x) => x.statut === 'completee'));
});
ok('a calendar event left in a raw file is ignored; open ticket with only a proof keeps its MEP', () => {
  const rr = JSON.parse(JSON.stringify(raw)); const t = rr.mep_tickets.find((x) => x.key === 'GOU21-11300'); t.status = 'En cours'; t.cat = 'indeterminate';
  const s2 = Object.assign({}, src, { calendar: { status: 'ok', events: [['2026-10-21T19:00:00', 'MEP SDD-2981']] } });
  const r2 = adapt(rr, base, {}, ledgers, s2);
  assert.strictEqual(mp(r2.doc, 'SDD-2981').date, '2026-10-23');
  const m = mp(r2.doc, 'GOU21-11300'); assert(m && m.date === '2026-10-22'); assert(sig(r2.report, 'mep_ecart', 'GOU21-11300'));
});
ok('partial email read and ledger-only MEPs are reported (courriels_partiels, mep_non_recoupee)', () => { assert(sig(r.report, 'courriels_partiels')); assert(sig(r.report, 'mep_non_recoupee', 'SDD-2967')); });
ok('manual MEP (saisie): never reported as not re-read; a read MEP with the same ticket is reported', () => {
  const b2 = { sprints: base.sprints, meps: base.meps.concat([{ id: 'saisie.run-ti.mep.x', date: '2026-10-28', systeme: 'G1', statut: 'completee', ticket: 'SDD-2987', item: 'run.ti', source: { systeme: 'saisie', ref: 'Gérer', lu_le: '2026-10-30T12:00-04:00', par: 'Franck' } }, { id: 'saisie.run-ti.mep.y', date: '2026-11-04', systeme: 'G1', statut: 'planifiee', item: 'run.ti', source: { systeme: 'saisie', ref: 'Gérer', lu_le: '2026-10-30T12:00-04:00', par: 'Franck' } }]) };
  const r3 = adapt(raw, b2, {}, ledgers, src);
  assert(!sig(r3.report, 'mep_non_relue', 'saisie.run-ti.mep.y')); assert(sig(r3.report, 'mep_saisie_doublon', 'saisie.run-ti.mep.x'));
  assert(!r3.writes.some((w) => /^saisie\./.test(w.doc_id)));
});
// --- 5 Nov. 2026 (cause: query "MEP" + subject filter missed SDD-3004 / SDD-2974; 3 past MEPs left « non confirmées ») ---
const rt = (subj, sum, iso) => preuves({ emails: [[iso || '2026-11-04T18:46:38Z', 'Richard Tremblay', subj, sum]] }, '2026-11-05T10:00-05:00').preuves;
ok('paid error 5 Nov.: Richard Tremblay\'s first mail with a ticket = done, even without « MEP » nor a done phrase (SDD-3004)', () => {
  const p = rt('SDD-3004 - ajout de demandes absentes de rapports proActions pour quatre producteurs', 'Bonjour, http://jira-l-02:8080/browse/SDD-3004 Nous avons ajouté quatre demandes ...');
  assert.deepStrictEqual([p[0].statut, p[0].date, p[0].keys[0]], ['completee', '2026-11-04', 'SDD-3004']);
});
ok('ticket only in the body (« …\\MEP\\ SDD-3004\\ Destination », space after the folder) still counts', () => assert.deepStrictEqual(rt('Ajout en prod', 'Source : \\\\fplq\\PLQ\\MEP\\ SDD-3004\\ Destination : SQL-W-01')[0].keys, ['SDD-3004']));
ok('a reply from Richard Tremblay is not a proof by itself (« Pour procéder à une mep le lundi tu dois justifier »)', () => {
  const p = rt('RE: MEP de modification de réquisitions ajustées (prévu mardi)', 'Bonjour Claude, Pour procéder à une mep le lundi tu dois justifier la MEP');
  assert(!p.some((x) => x.statut === 'completee'));
});
ok('operator rule not applied to an announcement, a question, another Tremblay or an auto-reply (fresh review 5 Nov.)', () => {
  assert(!rt('SDD-3010 - correction', 'MEP SDD-3010 prévue jeudi soir').some((x) => x.statut === 'completee'));
  assert(!rt('SDD-3011 - script', 'Pouvez-vous valider avant la MEP ?').some((x) => x.statut === 'completee'));
  assert(!preuves({ emails: [['2026-11-04T18:46:38Z', 'Julie Tremblay', 'SDD-3012 - données', 'Voici le fichier']] }, '2026-11-05T10:00-05:00').preuves.some((x) => x.statut === 'completee'));
  assert(!rt('Réponse automatique : SDD-3013', 'Je suis absent').some((x) => x.statut === 'completee'));
});
ok('ITI tickets are recognised (ITI-804 « terminé avec succès »)', () => assert.deepStrictEqual(rt('MEP ITI-804 Infra LAITWEB et SQL-W-01 terminé avec succès', 'mep complétée', '2026-11-04T01:30:48Z')[0].keys, ['ITI-804']));
ok('Franck\'s confirmation (rank 0) closes a past planned MEP, source saisie, id kept jira.*, never reported as a manual duplicate', () => {
  const conf = { _doc: 'x', 'PLQ-9462': { statut: 'completee', date: '2026-11-02', le: '2026-11-05', motif: 'bascule réalisée' } };
  const r4 = adapt(raw, base, {}, ledgers, src, conf);
  const m = mp(r4.doc, 'PLQ-9462'); assert.deepStrictEqual([m.id, m.statut, m.date, m.source.systeme], ['jira.plq-9462', 'completee', '2026-11-02', 'saisie']);
  const b4 = { sprints: base.sprints, meps: base.meps.filter((x) => x.id !== m.id).concat([m]) };
  const r5 = adapt(raw, b4, {}, ledgers, src, conf);
  assert(!sig(r5.report, 'mep_saisie_doublon')); assert(!sig(r5.report, 'mep_non_relue', 'jira.plq-9462'));
});
ok('a confirmation without date is reported, never applied', () => {
  const r6 = adapt(raw, base, {}, ledgers, src, { 'PLQ-9462': { statut: 'completee', le: '2026-11-05' } });
  assert(sig(r6.report, 'mep_confirmation_invalide', 'PLQ-9462')); assert.strictEqual(mp(r6.doc, 'PLQ-9462').statut, 'planifiee');
});
console.log(`\n${n} tests OK`);
