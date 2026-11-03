#!/usr/bin/env node
/* mep_merge tests (Optimisation_Requetes_v1 S4) on the real Monday read of 2026-11-02 (15h57, 74 e-mails, 3 Teams posts).
 * Usage: node tests/test_mep_merge.js <dist/lundi/2026-11-02/jira/mep_sources.json> <dist/lundi/2026-11-02_matin/jira/mep_sources.json> */
'use strict';
const fs = require('fs'); const assert = require('assert');
const { merge, keyOf } = require('../tools/mep_merge.js');
const full = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const matin = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
// incremental read fabricated from the real one: e-mails received on or after 1 Nov. only
const inc = Object.assign({}, full, { read_at: '2026-11-02T16:30-05:00', emails: full.emails.filter((e) => e[0] >= '2026-11-01'), teams: [], queries: { emails: 'incrémental' } });
const dupes = (rows) => rows.length - new Set(rows.map(keyOf)).size;

ok('previous = full read, new = e-mails ≥ 1 Nov. → 74 e-mails (72 reused + 2), 0 duplicate, Teams kept', () => {
  assert.strictEqual(inc.emails.length, 2);
  const { out, stats } = merge(full, inc, '2026-11-02');
  assert.strictEqual(out.emails.length, 74); assert.strictEqual(dupes(out.emails), 0);
  assert.strictEqual(stats.emails.reused, 72); assert.strictEqual(out.teams.length, 3);
  assert.strictEqual(out.read_at, inc.read_at); assert.strictEqual(out.queries.emails, 'incrémental');
  assert(/72 repris/.test(out.queries.note) && /= 74/.test(out.queries.note));
  assert(out.emails[0][0] >= out.emails[out.emails.length - 1][0]); // newest first
});
ok('previous = morning read (72) → same 74: the 2 afternoon e-mails are the only additions', () => {
  const { out } = merge(matin, inc, '2026-11-02');
  assert.strictEqual(out.emails.length, 74); assert.strictEqual(dupes(out.emails), 0);
});
ok('empty previous → output = new read', () => {
  const { out } = merge(null, inc, '2026-11-02');
  assert.deepStrictEqual(out.emails, inc.emails); assert.deepStrictEqual(out.teams, []);
});
ok('window D−30 kept: on 6 Nov. the 5 Oct. e-mails leave the window', () => {
  const { out, stats } = merge(full, inc, '2026-11-06');
  const old = full.emails.filter((e) => e[0] < '2026-10-07').length;
  assert(old > 0); assert(out.emails.every((e) => e[0] >= '2026-10-06T05')); assert(stats.emails.dropped >= old - 1);
});
ok('same instant written with Z or offset = one row; new row wins', () => {
  const p = { emails: [['2026-11-02T20:08:01Z', 'A', 'MEP x', 'old']], teams: [] };
  const q = { emails: [['2026-11-02T15:08:01-05:00', 'A', 'MEP x', 'new']], teams: [] };
  const { out } = merge(p, q, '2026-11-02'); assert.strictEqual(out.emails.length, 1); assert.strictEqual(out.emails[0][3], 'new');
});
ok('bad D or new file without emails refused', () => {
  assert.throws(() => merge(full, inc, '2026-11')); assert.throws(() => merge(full, {}, '2026-11-02'));
});
console.log(`\n${n} tests OK`);
