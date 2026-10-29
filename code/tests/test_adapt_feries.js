#!/usr/bin/env node
/* Holidays adapter tests (R41). Usage: node tests/test_adapt_feries.js */
'use strict';
const assert = require('assert'); const path = require('path');
const { adapt, isClosure } = require('../tools/adapt_feries.js');
const feries = require(path.join(__dirname, '..', 'config', 'feries.json'));
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const T = '2026-10-29';

ok('config only: Noël, Jour de l\'An, Vendredi saint in a 190-day window; collective, 1 day, source calcul', () => {
  const r = adapt(feries, null, { absences: [] }, {}, T);
  assert.deepStrictEqual(r.doc.absences.map((a) => a.id), ['ferie.2026-12-25', 'ferie.2027-01-01', 'ferie.2027-03-26']);
  r.doc.absences.forEach((a) => { assert.strictEqual(a.personne, null); assert.strictEqual(a.jours_ouvres, 1); assert.strictEqual(a.source.systeme, 'calcul'); });
  assert.strictEqual(r.writes.length, 3);
});
ok('rerun with same base: 0 writes', () => {
  const r0 = adapt(feries, null, { absences: [] }, {}, T);
  const r1 = adapt(feries, null, { absences: r0.doc.absences }, {}, T); assert.strictEqual(r1.writes.length, 0);
});
ok('calendar: only "Fermeture…"/"Férié…" subjects; all-day exclusive end; weekend skipped; no double with a statutory day', () => {
  assert(isClosure('Fermeture des Fêtes')); assert(isClosure('FÉRIÉ PLQ')); assert(!isClosure('Rétro fermeture sprint'));
  const cal = { read_at: '2026-10-29T15:00-04:00', events: [
    { subject: 'Fermeture des Fêtes', start: '2026-12-24T00:00', end: '2027-01-02T00:00', all_day: true },
    { subject: 'Rétro S22', start: '2026-12-18T10:00', end: '2026-12-18T11:00', all_day: false }] };
  const r = adapt(feries, cal, { absences: [] }, {}, T);
  const f = r.doc.absences.filter((a) => a.id.startsWith('fermeture.')).map((a) => a.debut);
  assert.deepStrictEqual(f, ['2026-12-24', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31']);
  assert.strictEqual(r.report.signals.filter((s) => s.kind === 'deja_ferie').length, 2);
});
ok('closure in base no longer in calendar: kept, reported, never a delete', () => {
  const old = { id: 'fermeture.2026-12-24', personne: null, debut: '2026-12-24', fin: '2026-12-24', jours_ouvres: 1, libelle: 'Fermeture', source: { systeme: 'outlook', ref: 'x', lu_le: '2026-10-29T09:00-04:00', par: 'adaptateur-feries' } };
  const r = adapt(feries, { read_at: '2026-10-29T15:00-04:00', events: [] }, { absences: [old] }, {}, T);
  assert(r.report.signals.some((s) => s.kind === 'fermeture_non_relue')); assert(r.writes.every((w) => w.op === 'set'));
});
ok('if_version pinned when the record exists', () => {
  const r = adapt(feries, null, { absences: [] }, { 'absences/ferie.2026-12-25': 4 }, T);
  assert.strictEqual(r.writes.find((w) => w.doc_id === 'ferie.2026-12-25').if_version, 4);
});
ok('plural subjects, Sunday move, short config and year-end reminder signalled', () => {
  assert(isClosure('Fermetures du bureau') && isClosure('Fériés PLQ'));
  const f2 = { jours: [{ date: '2029-07-01', libelle: 'Fête du Canada' }] }; // a Sunday
  const r = adapt(f2, null, { absences: [] }, {}, '2029-06-01');
  assert.deepStrictEqual(r.doc.absences.map((a) => a.id), ['ferie.2029-07-02']);
  const r2 = adapt(feries, { read_at: '2026-10-29T15:00-04:00', events: [] }, { absences: [] }, {}, '2027-07-01');
  assert(r2.report.signals.some((s) => s.kind === 'config_courte')); assert(r2.report.signals.some((s) => s.kind === 'fetes_sans_fermeture'));
  const r3 = adapt(feries, { read_at: '2026-10-29T15:00-04:00', events: [] }, { absences: [] }, {}, T);
  assert(r3.report.signals.some((s) => s.kind === 'fetes_sans_fermeture') && !r3.report.signals.some((s) => s.kind === 'config_courte'));
});
console.log(`${n} tests ok`);
