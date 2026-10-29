#!/usr/bin/env node
/* R37 public base (model v13 M53 M54): hidden item -> descendants and tied records out; digest uses the same filter.
 * Usage: node tests/test_public_base.js <base_export_dir>   (e.g. dist/passages/2026-10-29-jeudi-1302/base_avant) */
'use strict';
const assert = require('assert');
const C = require('../interface/core.js'); const { loadBase } = require('../tools/lundi.js');
const dir = process.argv[2]; let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const fresh = () => loadBase(dir);
ok('no hidden item: same base object (nothing filtered)', () => { const b = fresh(); assert.strictEqual(C.publicBase(b), b); });
ok('hidden parent hides its descendants and their records (M53)', () => {
  const b = fresh(); const l8 = b.items.find((i) => i.id === 'goutte21.l8'); l8.visible = false;
  const h = C.hiddenIds(b); assert(h.has('goutte21.l8d') && h.has('saisie.codes-taxes'));
  const p = C.publicBase(b);
  ['items', 'jalons', 'risques', 'attentes', 'charges', 'stats_jira'].forEach((c) => assert(!p[c].some((r) => h.has(c === 'items' ? r.id : r.item)), c));
  assert(p.listes_jira.every((l) => l.tickets.every((t) => !h.has(t.item))));
  assert(!C.alertes(p, '2026-10-29').some((a) => h.has(a.item)));
  assert(b.items.length > p.items.length && b.items.find((i) => i.id === 'goutte21.l8d'), 'full base untouched');
});
ok('dependencies touching a hidden item are dropped', () => {
  const b = fresh(); b.items.find((i) => i.id === 'feed.expertg1').visible = false;
  b.dependances.push({ id: 'dep.t', type: 'bloque', de: { kind: 'item', id: 'feed.expertg1' }, vers: { kind: 'item', id: 'run.ti' }, source: { systeme: 'saisie', lu_le: '2026-10-29T10:00-04:00' } });
  assert(!C.publicBase(b).dependances.some((d) => d.id === 'dep.t'));
});
console.log(`${n} tests ok`);
