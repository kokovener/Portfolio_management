#!/usr/bin/env node
/* Jira adapter tests on the real 2026-10-27 read. Usage: node tests/test_adapt_jira.js <jira_raw.json> <base_before_dir> <ledger.md>... (W40..W44) */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const { adapt, parseLedger, sprintEnd } = require('../tools/adapt_jira.js');
const [, , rawP, baseDir, ...ledgerPs] = process.argv;
const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
const rd = (d) => fs.readdirSync(d).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')));
const base = { sprints: rd(path.join(baseDir, 'sprints')), meps: rd(path.join(baseDir, 'meps')) };
// Ledgers are live files that keep growing: freeze them at what the 27 Oct. run could see (lines up to 26 Oct.)
const ledgers = ledgerPs.map((p) => parseLedger(fs.readFileSync(p, 'utf8'), p).filter((l) => l.date <= '2026-10-26'));
const ledger = ledgers[ledgers.length - 1];
const r = adapt(raw, base, { 'meps/jira.gou21-11325': 1 }, ledgers);
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const sp = (id) => r.doc.sprints.find((s) => s.id === id);
const mp = (id) => r.doc.meps.find((m) => m.id === id);
const sig = (kind, row) => r.report.signals.some((s) => s.kind === kind && (!row || s.row === row));

ok('sprint end at local midnight = previous day, both sides of the DST switch', () => {
  assert.strictEqual(sprintEnd('2026-10-16T04:00:00.000Z'), '2026-10-15'); // EDT midnight
  assert.strictEqual(sprintEnd('2026-11-07T04:00:00.000Z'), '2026-11-06'); // 23:00 EST
  assert.strictEqual(sprintEnd('2026-11-28T05:00:00.000Z'), '2026-11-27'); // EST midnight
});
ok('S19 active read from Jira: 19 oct → 6 nov, 15 working days (step-1 example corrected)', () => {
  const s = sp('jira.gou21-s19'); assert.deepStrictEqual([s.debut, s.fin, s.jours_ouvres, s.etat], ['2026-10-19', '2026-11-06', 15, 'actif']);
});
ok('S20 has no dates in Jira: deduced, flagged in ref and signals; S21 not read', () => {
  const s = sp('jira.gou21-s20'); assert.deepStrictEqual([s.debut, s.fin, s.etat], ['2026-11-09', '2026-11-27', 'futur']);
  assert(/déduites/.test(s.source.ref) && sig('sprint_dates')); assert(!sp('jira.gou21-s21'));
});
ok('S18 last closed sprint read (R14): 29 sept → 15 oct, etat clos', () => {
  const s = sp('jira.gou21-s18'); assert.deepStrictEqual([s.debut, s.fin, s.etat], ['2026-09-29', '2026-10-15', 'clos']);
});
// The W44 ledger is live and grows during the week: count only the lines known at the 26 Oct. read
ok('ledger W44 parsed: 4 MEP lines up to 26 oct.', () => assert.strictEqual(ledger.length, 4));
ok('MEP date = ledger deployment date, not Jira closing date (GOU21-11185: 14 oct., closed 19 oct.)', () => assert.strictEqual(mp('jira.gou21-11185').date, '2026-10-14'));
ok('ledger: a completed line wins over a later planned line (SDD-2963, W40)', () => assert.strictEqual(mp('jira.sdd-2963').statut, 'completee'));
ok('released version linked by description gives the system (GOU21-11224)', () => assert.strictEqual(mp('jira.gou21-11224').systeme, 'Extranet Interprovince'));
ok('MEP grain: epic children without "MEP" prefix ignored', () => assert(!mp('jira.gou21-11302') && !mp('jira.gou21-10899')));
ok('open MEP ticket dated by the ledger, status by Jira, system by its version', () => {
  const m = mp('jira.gou21-11325'); assert.deepStrictEqual([m.date, m.statut, m.systeme, m.item], ['2026-10-26', 'planifiee', 'Extranet Région', 'run.extranets']);
  assert(sig('mep_passee', 'GOU21-11325'));
});
ok('open MEP without any date: not written, reported', () => { assert(!mp('jira.gou21-11326') && !mp('jira.gou21-10584')); assert(sig('mep_sans_date', 'GOU21-10584')); });
ok('version not fully ready -> planifiee, content reported', () => assert(sig('mep_contenu', 'GOU21-10584')));
ok('done MEP without ledger line dated by status change (GOU21-10748)', () => { const m = mp('jira.gou21-10748'); assert.deepStrictEqual([m.date, m.statut], ['2026-09-29', 'completee']); assert(/passage à Terminé/.test(m.source.ref)); });
ok('unreleased versions without MEP ticket reported (3)', () => assert.strictEqual(r.report.signals.filter((s) => s.kind === 'version_sans_mep').length, 3));
ok('ledger-only MEPs kept with source ledger (SDD, PLQ)', () => { assert.strictEqual(mp('jira.sdd-2981').source.systeme, 'ledger'); assert.strictEqual(mp('jira.plq-9437').source.systeme, 'ledger'); });
ok('writes pinned when the doc exists', () => { const w = r.writes.find((x) => x.doc_id === 'jira.gou21-11325'); assert.strictEqual(w.if_version, 1); });
ok('no Z timestamp, no sante written', () => { const s = JSON.stringify(r.doc); assert(!/T\d\d:\d\d(:\d\d)?(\.\d+)?Z/.test(s)); assert(!/"sante"/.test(s)); });
ok('CLI: a ledger not written yet is skipped with signal ledger_absent; no ledger at all = refused (checkpoint 29 Oct.)', () => {
  const { spawnSync } = require('child_process'); const os = require('os');
  const tool = path.join(__dirname, '..', 'tools', 'adapt_jira.js'); const out = fs.mkdtempSync(path.join(os.tmpdir(), 'jira-'));
  const missing = path.join(path.dirname(ledgerPs[0]), '2099-W01.md');
  const a = spawnSync('node', [tool, rawP, baseDir, out, ...ledgerPs, missing], { encoding: 'utf8' });
  assert.strictEqual(a.status, 0, a.stderr);
  const sig = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8')).signals.filter((x) => x.kind === 'ledger_absent');
  assert.deepStrictEqual(sig.map((x) => x.row), ['2099-W01.md']);
  assert.strictEqual(spawnSync('node', [tool, rawP, baseDir, out, missing], { encoding: 'utf8' }).status, 2);
});
console.log(`\n${n} tests OK`);
