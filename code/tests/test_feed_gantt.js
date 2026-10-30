#!/usr/bin/env node
/* Expert G1 Gantt carried by its portfolio-feed block (Kickoff D22, model v15): producer tool + artefacts adapter.
 * Usage: node tests/test_feed_gantt.js <Feeds_Inscrits.md> <base_before_dir (2026-10-27)> <schema.json> <tmp_dir>
 */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const P = require('../feeds/expertg1_gantt.js');
const A = require('../tools/adapt_artefacts.js');
const [, , regP, baseDir, schema, tmpDir] = process.argv;
const G1 = 'https://claude.ai/artifact/E3KrS3o15gWHwuqrvpnETg'; const LU = '2026-10-30T11:31-04:00';
const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'expertg1_index_2026-10-29.html'), 'utf8');
let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };

// 1. producer: ROWS -> gantt record, block patched in place, idempotent
const p = P.patch(html, LU); const g = p.gantt; const o = g.onglets[0]; const ts = o.groupes.flatMap((x) => x.taches);
assert.strictEqual(o.groupes.length, 7); assert.strictEqual(ts.length, 80);
assert.deepStrictEqual([o.debut, o.fin, g.calcule_le], ['2026-10-21', '2026-11-20', '2026-10-29']);
const gng = ts.find((t) => /^Go\/no-go/.test(t.nom)); assert(gng.jalon && gng.debut === '2026-11-11' && gng.fin === '2026-11-11' && !gng.fait);
assert(ts.find((t) => /^Parseur SQL v1\.1/.test(t.nom)).fait);
assert.strictEqual(P.patch(p.html, LU).html, p.html, 'idempotent');
ok('producer: 7 groups, 80 rows, milestone rows (go/no-go 11 nov.), done = fait, block rewritten in place, idempotent');

// 2. adapter: the block (with gantts) is accepted; gantt written under the prefix, attached to its item
const reg = A.parseRegistry(fs.readFileSync(regP, 'utf8')); const base = A.readBase(baseDir);
const run = (h) => A.adapt(reg, { read_at: '2026-10-30T11:40-04:00', artefacts: { [G1]: { dir: 'expertg1', version: 'x', html: h } } }, base, {}, { schema, tmpDir });
let r = run(p.html);
assert(r.doc.gantts && r.doc.gantts.length === 1 && r.doc.gantts[0].id === 'feed.expertg1.gantt', JSON.stringify(r.report.signals.slice(0, 3)));
assert.strictEqual(r.doc.gantts[0].source.par, 'adaptateur-artefacts'); assert(r.writes.some((w) => w.collection === 'gantts'));
ok('adapter: feed with gantts accepted, gantt feed.expertg1.gantt written (source = adapter read)');

// 3. a gantt attached to an item outside the feed prefix = feed ignored whole
r = run(p.html.replace('"item":"feed.expertg1","format":"json"', '"item":"saisie.methane-p2","format":"json"'));
assert(!r.doc.gantts && r.report.signals.some((s) => s.kind === 'feed_ignore' && /gantts feed\.expertg1\.gantt rattaché/.test(s.texte)));
ok('adapter: gantt attached outside the prefix = feed ignored, nothing written');
// 4. review 30 oct.: two Gantts refused; stale Gantt line and contradicting milestone reported; no double with a file Gantt
const fb = (h) => A.extractBlocks(h)[0].text;
const f2 = JSON.parse(fb(p.html)); f2.gantts.push(Object.assign({}, f2.gantts[0], { id: 'feed.expertg1.autre' }));
r = run(p.html.replace(fb(p.html), JSON.stringify(f2))); assert(!r.doc.gantts && r.report.signals.some((s) => /Gantts dans le bloc|id attendu/.test(s.texte)));
const f3 = JSON.parse(fb(p.html)); f3.source.lu_le = '2026-11-03T09:00-05:00';
f3.gantts[0].onglets[0].groupes.forEach((gr) => gr.taches.forEach((t) => { if (/^Go\/no-go/.test(t.nom)) { t.debut = '2026-12-11'; t.fin = '2026-12-11'; } }));
r = run(p.html.replace(fb(p.html), JSON.stringify(f3)));
assert(r.report.signals.some((s) => s.kind === 'gantt_perime') && r.report.signals.some((s) => s.kind === 'gantt_jalon_ecart' && s.row === 'feed.expertg1.go-nogo'));
r = A.adapt(reg, { read_at: '2026-10-30T11:40-04:00', artefacts: { [G1]: { dir: 'expertg1', version: 'x', html: p.html } } }, Object.assign({}, base, { gantts: [{ id: 'gantt.feed.expertg1', item: 'feed.expertg1' }] }), {}, { schema, tmpDir });
assert(!r.doc.gantts && r.report.signals.some((s) => s.kind === 'gantt_double'));
ok('review: one Gantt per block and per item, stale Gantt line and contradicting milestone date reported');
console.log(`${n} ok`);
