#!/usr/bin/env node
/* Outlook adapter tests: real 2026-10-27 read + synthetic edge cases.
 * Usage: node tests/test_adapt_outlook.js <team_raw.json> <outlook_raw.json> <base_before_dir> */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const { adapt } = require('../tools/adapt_outlook.js');
const [, , teamP, rawP, baseDir] = process.argv;
const team = JSON.parse(fs.readFileSync(teamP, 'utf8')); const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
const rd = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json') && f !== 'versions.json').map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : []);
const base = { personnes: rd(path.join(baseDir, 'personnes')), absences: rd(path.join(baseDir, 'absences')) };
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const r = adapt(team, raw, base, {});
const sig = (res, kind) => res.report.signals.filter((s) => s.kind === kind);

ok('15 people written, CDP skipped, Personne_07 written without readable absences', () => {
  assert.strictEqual(r.doc.personnes.length, 15); assert.strictEqual(sig(r, 'personne_ignoree').length, 1);
  assert(r.doc.personnes.some((p) => p.id === 'team.personne-07')); assert.strictEqual(sig(r, 'hors_annuaire').length, 1);
});
ok('directory spelling wins: Kowalzzyk -> team.kowalczyk-franck (seed id kept), Bourgoin -> Personne_02', () => {
  assert(r.doc.personnes.some((p) => p.id === 'team.kowalczyk-franck')); assert(r.doc.personnes.some((p) => p.id === 'team.personne-02'));
  assert.strictEqual(sig(r, 'nom_ecart').length, 2);
});
ok('D7 flux part dropped (Franck 2026-10-28): no wip_limite written on anyone', () => {
  assert(r.doc.personnes.every((x) => !('wip_limite' in x)));
});
ok('real read: recurring lunch "oof" of Personne_05 is not an absence; only 3 Nov. morning (0.5 d)', () => {
  assert.deepStrictEqual(r.doc.absences.map((a) => [a.id, a.debut, a.fin, a.jours_ouvres, a.libelle]), [['outlook.personne-05.2026-11-03', '2026-11-03', '2026-11-03', 0.5, 'absence']]);
});
ok('no subject, no reason anywhere in absences', () => assert(!/réunion|congé|vacance|maladie|rendez/i.test(JSON.stringify(r.doc.absences))));

// synthetic: Mona oof Thu PM + Fri all day + Mon AM -> one record, 2 days
const slots = (who) => ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'].map((s) => ({ start: s, end: String(+s.slice(0, 2) + 1).padStart(2, '0') + ':00', organizer: 'free', non_free: who(s) }));
const syn = { read_at: '2026-11-04T08:00-05:00', organizer: 'adresse-masquee@exemple.test', participants: ['personne-12@exemple.test'], days: [
  { date: '2026-11-05', slots: slots((s) => (s >= '13:00' ? { 'personne-12@exemple.test': 'oof' } : {})) },
  { date: '2026-11-06', slots: slots(() => ({ 'personne-12@exemple.test': 'oof' })) },
  { date: '2026-11-09', slots: slots((s) => (s < '12:00' ? { 'personne-12@exemple.test': 'oof' } : {})) },
  { date: '2026-11-10', slots: slots(() => ({})) },
  { date: '2026-11-11', slots: slots(() => ({ 'personne-12@exemple.test': 'oof' })) }] };
const s1 = adapt(team, syn, { personnes: [], absences: [] }, {});
ok('consecutive halves across a weekend merge: Thu PM -> Mon AM = 2 days; isolated Wed = 1 day', () => {
  assert.deepStrictEqual(s1.doc.absences.map((a) => [a.id, a.debut, a.fin, a.jours_ouvres]), [
    ['outlook.personne-12.2026-11-05-pm', '2026-11-05', '2026-11-09', 2], ['outlook.personne-12.2026-11-11', '2026-11-11', '2026-11-11', 1]]);
});
ok('collective absence in base (holiday entered in Gérer): day skipped, no duplicate', () => {
  const col = { id: 'saisie.abs.ferie', personne: null, debut: '2026-11-11', fin: '2026-11-11', jours_ouvres: 1, libelle: 'Férié', source: { systeme: 'saisie', lu_le: '2026-10-27T10:00-04:00' } };
  const s2 = adapt(team, syn, { personnes: [], absences: [col] }, {});
  assert(!s2.doc.absences.some((a) => a.debut === '2026-11-11')); assert.strictEqual(sig(s2, 'collective').length, 1);
});
ok('outlook absence in base no longer seen: kept (not in writes, never deleted) and reported', () => {
  const old = { id: 'outlook.personne-12.2026-11-10', personne: 'team.personne-12', debut: '2026-11-10', fin: '2026-11-10', jours_ouvres: 1, libelle: 'absence', source: { systeme: 'outlook', lu_le: '2026-11-01T08:00-04:00' } };
  const s3 = adapt(team, syn, { personnes: [], absences: [old] }, {});
  assert.strictEqual(sig(s3, 'absence_non_relue').length, 1); assert(!s3.writes.some((w) => w.doc_id === old.id || w.op === 'delete'));
});
ok('half-day with < 2 slots is unreadable, never guessed', () => {
  const s4 = adapt(team, { ...syn, days: [{ date: '2026-11-12', slots: [{ start: '11:30', end: '12:30', organizer: 'free', non_free: { 'personne-12@exemple.test': 'oof' } }] }] }, { personnes: [], absences: [] }, {});
  assert.strictEqual(s4.doc.absences.length, 0); assert.strictEqual(sig(s4, 'demi_journee_illisible').length, 1);
});
ok('writes pinned on existing docs only', () => {
  const s5 = adapt(team, raw, base, { 'personnes/team.personne-09': 1 });
  assert.strictEqual(s5.writes.find((w) => w.doc_id === 'team.personne-09').if_version, 1);
  assert.strictEqual(s5.writes.find((w) => w.doc_id === 'team.personne-12').if_version, undefined);
});
ok('sliding window: absence begun before the read keeps its id and its past part (no double count)', () => {
  const old = { id: 'outlook.personne-12.2026-11-04', personne: 'team.personne-12', debut: '2026-11-04', fin: '2026-11-06', jours_ouvres: 3, libelle: 'absence', source: { systeme: 'outlook', lu_le: '2026-11-02T08:00-05:00' } };
  const s6 = adapt(team, { ...syn, days: [{ date: '2026-11-06', slots: slots(() => ({ 'personne-12@exemple.test': 'oof' })) }] }, { personnes: [], absences: [old] }, {});
  assert.deepStrictEqual(s6.doc.absences.map((a) => [a.id, a.debut, a.fin, a.jours_ouvres]), [[old.id, '2026-11-04', '2026-11-06', 3]]);
  assert.strictEqual(sig(s6, 'absence_non_relue').length, 0);
});
ok('two overlapping slots (90 min) do not make a half-day', () => {
  const s7 = adapt(team, { ...syn, days: [{ date: '2026-11-12', slots: [{ start: '09:30', end: '10:30', organizer: 'free', non_free: { 'personne-12@exemple.test': 'oof' } }, { start: '10:00', end: '11:00', organizer: 'free', non_free: { 'personne-12@exemple.test': 'oof' } }] }] }, { personnes: [], absences: [] }, {});
  assert.strictEqual(s7.doc.absences.length, 0);
});
ok('person id stays the base id when the directory misses her (charges never orphaned)', () => {
  const t2 = JSON.parse(JSON.stringify(team)); t2.personnes.find((p) => p.nom === 'Kowalzzyk').annuaire = null;
  const s8 = adapt(t2, raw, base, {});
  assert(s8.doc.personnes.some((p) => p.id === 'team.kowalczyk-franck')); assert(!s8.doc.personnes.some((p) => p.id === 'team.kowalzzyk-franck'));
});
ok('homonyms: second row not written, collision reported', () => {
  const t3 = JSON.parse(JSON.stringify(team)); t3.personnes.push(Object.assign({}, t3.personnes[0], { ligne: 99 }));
  const s9 = adapt(t3, raw, base, {}); assert.strictEqual(sig(s9, 'collision').length, 1); assert.strictEqual(s9.doc.personnes.length, 15);
});
ok('unchanged record (only read time differs) is not rewritten', () => {
  const after = r.doc.personnes.map((p) => Object.assign({}, p, { source: Object.assign({}, p.source, { lu_le: '2026-10-01T08:00-04:00' }) }));
  const s10 = adapt(team, raw, { personnes: after, absences: r.doc.absences }, {});
  assert.strictEqual(s10.writes.length, 0);
});
ok('AF and UX out of capacity (hors); departed person not written, reported', () => {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'team_departs.json'), 'utf8'));
  const s11 = adapt(team, raw, base, {}, dep); const p = Object.fromEntries(s11.doc.personnes.map((x) => [x.id, x]));
  assert.strictEqual(p['team.personne-01'].voie, 'hors'); assert.strictEqual(p['team.personne-05'].voie, 'hors');
  assert(!p['team.personne-07']); assert.strictEqual(s11.doc.personnes.length, 14); assert.strictEqual(sig(s11, 'parti').length, 1);
});
ok('R36 team-only mode (--equipe): personnes written, absences neither produced nor touched', () => {
  const r0 = adapt(team, raw, base, {}, []); const re = adapt(team, null, base, {}, []);
  assert.deepStrictEqual(re.doc.personnes, r0.doc.personnes.map((p) => Object.assign({}, p, { source: Object.assign({}, p.source, { lu_le: team.read_at }) })));
  assert(!('absences' in re.doc)); assert(re.writes.every((w) => w.collection === 'personnes')); assert.strictEqual(re.report.mode, 'equipe');
});
console.log(`${n} tests ok`);
