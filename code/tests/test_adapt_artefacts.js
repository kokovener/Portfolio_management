#!/usr/bin/env node
/* Artefacts adapter tests on the real 2026-10-27 read of Expert G1 + architect feed test set.
 * Usage: node tests/test_adapt_artefacts.js <Feeds_Inscrits.md> <raw_dir> <base_before_dir> <schema.json> <tmp_dir> */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const A = require('../tools/adapt_artefacts.js');
const Core = require('../interface/core.js');
const [, , regP, rawDir, baseDir, schema, tmpDir] = process.argv;
const registry = A.parseRegistry(fs.readFileSync(regP, 'utf8'));
const raw = A.readRaw(rawDir); const base = A.readBase(baseDir);
const versions = JSON.parse(fs.readFileSync(path.join(baseDir, 'versions.json'), 'utf8'));
const opts = { schema, tmpDir };
const G1 = 'https://claude.ai/artifact/E3KrS3o15gWHwuqrvpnETg';
const html = raw.artefacts[G1].html;
const run = (h, b, reg) => A.adapt(reg || registry, { read_at: raw.read_at, artefacts: { [G1]: Object.assign({}, raw.artefacts[G1], { html: h }) } }, b || base, versions, opts);
const feedText = A.extractBlocks(html)[0].text;
const withFeed = (fn) => { const f = JSON.parse(feedText); fn(f); return html.replace(feedText, JSON.stringify(f)); };
const sig = (r, kind, row) => r.report.signals.filter((s) => s.kind === kind && (!row || s.row === row));
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };

const r = run(html);
const rec = (c, id) => (r.doc[c] || []).find((x) => x.id === id);

ok('registry: 2 rows, Expert G1 active, architect pending, prefixes valid', () => {
  assert.deepStrictEqual(registry.map((x) => [x.prefixe, x.statut]), [['feed.expertg1', 'actif'], ['feed.archi', 'en_attente']]);
  assert.deepStrictEqual(A.checkRegistry(registry), []);
  assert(A.checkRegistry([{ url: 'u', prefixe: 'feed.a', statut: 'actif' }, { url: 'v', prefixe: 'feed.a', statut: 'actif' }]).length);
});
ok('Expert G1 read: 1 item, 8 jalons, 2 risques, 3 attentes; 14 writes all pinned', () => {
  assert.deepStrictEqual(['items', 'jalons', 'risques', 'attentes'].map((c) => r.doc[c].length), [1, 8, 2, 3]);
  assert.strictEqual(r.writes.length, 14); assert(r.writes.every((w) => w.if_version === 1));
});
ok('owned item fields kept from the base (liens, priorite); divergence reported', () => {
  const it = rec('items', 'feed.expertg1'); assert.strictEqual(it.liens.length, 1); assert.strictEqual(it.priorite.valeur, 4);
  assert.strictEqual(sig(r, 'champ_possede', 'feed.expertg1').length, 1);
});
ok('source fields from the feed: updated_at 18:14; seeded sante and pct removed; pct computed from jalons = 62.5', () => {
  const it = rec('items', 'feed.expertg1'); assert.strictEqual(it.updated_at, '2026-10-27T18:14-04:00');
  assert(!('sante' in it) && !('pct_avancement' in it));
  assert.deepStrictEqual(Core.pct({ jalons: r.doc.jalons }, it), { valeur: 62.5, origine: 'jalons' });
});
ok('risque score computed = P x I', () => assert.strictEqual(rec('risques', 'feed.expertg1.r1').score, 12));
ok('provenance: artefact URL, block date, read time EDT, no Z', () => {
  assert(/E3KrS3o15gWHwuqrvpnETg · bloc du 2026-10-27T20:30-04:00/.test(rec('jalons', 'feed.expertg1.j1').source.ref));
  assert(!/T\d\d:\d\d(:\d\d)?(\.\d+)?Z/.test(JSON.stringify(r.doc)));
});
ok('pending architect feed: its livrable kept and reported, not written', () => {
  assert.strictEqual(sig(r, 'conserve', 'feed.archi.adr-codes-taxes').length, 1); assert(!r.writes.some((w) => w.doc_id.startsWith('feed.archi')));
});

const ignored = (h, why) => { const x = run(h); assert.strictEqual(x.writes.length, 0, why); assert(sig(x, 'feed_ignore').length === 1, why); assert.strictEqual(sig(x, 'conserve').filter((s) => s.row.startsWith('feed.expertg1')).length, 14, why); return x; };
ok('no block: feed ignored, nothing written, 14 base records kept', () => ignored(html.replace('id="portfolio-feed"', 'id="other"'), 'no block'));
ok('two blocks: ignored', () => ignored(html + '<script type="application/json" id="portfolio-feed">{}</script>', 'two'));
ok('unparsable JSON: ignored', () => ignored(html.replace(feedText, feedText.slice(0, -20)), 'json'));
ok('sante declared in the feed: ignored (D8, validate_model)', () => ignored(withFeed((f) => { f.items[0].sante = { couleur: 'vert', motifs: [], calcule_le: '2026-10-27T18:00-04:00' }; }), 'sante'));
ok('one record outside the prefix: whole feed ignored, no partial write', () => {
  const x = ignored(withFeed((f) => { f.jalons.push({ id: 'goutte21.l8d.x', item: 'goutte21.l8d', nom: 'x', date: '2026-11-01', statut: 'a_venir', source: f.source }); }), 'prefix');
  assert(/hors du préfixe/.test(x.report.signals.find((s) => s.kind === 'feed_ignore').texte));
});
ok('block copied from another artefact (source.ref): ignored', () => ignored(withFeed((f) => { f.source.ref = 'https://claude.ai/artifact/AUTRE'; }), 'ref'));
ok('collection not allowed in a feed (meps): ignored', () => ignored(withFeed((f) => { f.meps = []; }), 'meps'));
ok('dangling reference (jalon on an unknown item): ignored', () => ignored(withFeed((f) => { f.jalons[0].item = 'feed.expertg1.inconnu'; }), 'ref'));
ok('record absent from a read: kept and reported, not written, not deleted', () => {
  const x = run(withFeed((f) => { f.jalons = f.jalons.filter((j) => j.id !== 'feed.expertg1.go-nogo'); }));
  assert.strictEqual(x.writes.length, 13); assert.strictEqual(sig(x, 'conserve', 'feed.expertg1.go-nogo').length, 1);
  assert(!x.writes.some((w) => w.op === 'delete'));
});
ok('date moved later without date_initiale in the feed: base first date kept, recul reported', () => {
  const x = run(withFeed((f) => { const j = f.jalons.find((y) => y.id === 'feed.expertg1.validateurs'); j.date = '2026-11-18'; delete j.date_initiale; }));
  const j = x.doc.jalons.find((y) => y.id === 'feed.expertg1.validateurs'); assert.deepStrictEqual([j.date, j.date_initiale], ['2026-11-18', '2026-11-04']);
  assert.strictEqual(sig(x, 'recul', 'feed.expertg1.validateurs').length, 1);
});
ok('jalon under the prefix but attached to another source\'s item (goutte21.l8d): ignored', () => ignored(withFeed((f) => { f.jalons.push({ id: 'feed.expertg1.x', item: 'goutte21.l8d', nom: 'x', date: '2026-11-01', statut: 'a_venir', source: f.source }); }), 'attach'));
ok('base record under the prefix owned by another source (saisie): not overwritten, conflict reported, rest written', () => {
  const b = Object.assign({}, base, { attentes: base.attentes.map((a) => a.id === 'feed.expertg1.a1' ? Object.assign({}, a, { source: { systeme: 'saisie', lu_le: '2026-10-27T18:00-04:00', par: 'Franck' } }) : a) });
  const x = run(html, b); assert.strictEqual(x.writes.length, 13); assert(!x.writes.some((w) => w.doc_id === 'feed.expertg1.a1'));
  assert.strictEqual(sig(x, 'conflit', 'feed.expertg1.a1').length, 1); assert.strictEqual(sig(x, 'conserve', 'feed.expertg1.a1').length, 0);
});
ok('block dated after the read: reported (real case: 20h30 vs read 18h50)', () => assert.strictEqual(sig(r, 'date_bloc').length, 1));
ok('fail closed: a validator that cannot run stops the adapter', () => assert.throws(() => A.adapt(registry, raw, base, versions, { schema: '/nonexistent.json', tmpDir })));

// ---------- architect feed: livrable -> dependency target (test set, Codes de taxes) ----------
const ARCHI = 'https://claude.ai/artifact/TEST-feed-archi';
const archiHtml = fs.readFileSync(path.join(__dirname, 'fixtures', 'archi_feed_test.html'), 'utf8');
const regArchi = [{ url: ARCHI, item: null, prefixe: 'feed.archi', proprietaire: 'Personne_09', statut: 'actif' }];
const runArchi = (date, b, mutate) => {
  let h = archiHtml.replace('__DATE_ADR__', date);
  if (mutate) { const t = A.extractBlocks(h)[0].text; const f = JSON.parse(t); mutate(f); h = h.replace(t, JSON.stringify(f)); }
  return A.adapt(regArchi, { read_at: raw.read_at, artefacts: { [ARCHI]: { dir: 'archi-test', html: h } } }, b, {}, opts);
};
const merge = (b, doc) => Core.mergeDocs([Object.assign({ modele: '1' }, b), doc]);
const depAlert = (b) => Core.alertes(b, '2026-10-27').filter((a) => a.kind === 'recul' && /^Livrable ADR/.test(a.texte) && /entraîne[^]*Décision CDP/.test(a.texte)); // R44: the ADR recul line carries its dependency chain
const base0 = Object.assign({}, base, { livrables: [] }); // architect feed never read yet
let base1;
ok('archi read 1 (ADR 14 nov.): livrables created, saisie dependance now resolves, no alert', () => {
  const x = runArchi('2026-11-14', base0); assert.strictEqual(x.writes.length, 2);
  const l = x.doc.livrables.find((y) => y.id === 'feed.archi.adr-codes-taxes'); assert(!l.date_initiale);
  base1 = merge(base0, x.doc); assert(base1.livrables.length === 2); assert.strictEqual(depAlert(base1).length, 0);
});
ok('archi read 2 (ADR 28 nov.): date_initiale 14 nov. kept, recul reported, Décision CDP in alert', () => {
  const x = runArchi('2026-11-28', base1); const l = x.doc.livrables.find((y) => y.id === 'feed.archi.adr-codes-taxes');
  assert.deepStrictEqual([l.date, l.date_initiale], ['2026-11-28', '2026-11-14']); assert.strictEqual(sig(x, 'recul').length, 1);
  const a = depAlert(merge(base1, x.doc)); assert.strictEqual(a.length, 1); assert(/Décision CDP/.test(a[0].texte), a[0] && a[0].texte);
});
ok('archi feed may carry its own dependance to a portfolio jalon (under its prefix)', () => {
  const x = runArchi('2026-11-14', base0, (f) => { f.dependances = [{ id: 'feed.archi.dep-erp-vers-l8d', type: 'alimente', de: { kind: 'livrable', id: 'feed.archi.adr-integration-erp' }, vers: { kind: 'item', id: 'goutte21.l8d' }, source: f.source }]; });
  assert.strictEqual(x.writes.length, 3);
});
ok('archi dependance to an unknown jalon, or with a dep.* id: feed ignored', () => {
  const bad1 = runArchi('2026-11-14', base0, (f) => { f.dependances = [{ id: 'feed.archi.dep-x', type: 'bloque', de: { kind: 'livrable', id: 'feed.archi.adr-codes-taxes' }, vers: { kind: 'jalon', id: 'saisie.codes-taxes.inconnu' }, source: f.source }]; });
  const bad2 = runArchi('2026-11-14', base0, (f) => { f.dependances = [{ id: 'dep.x', type: 'bloque', de: { kind: 'livrable', id: 'feed.archi.adr-codes-taxes' }, vers: { kind: 'jalon', id: 'saisie.codes-taxes.decision-cdp' }, source: f.source }]; });
  assert.strictEqual(bad1.writes.length + bad2.writes.length, 0);
});
console.log(`\n${n} tests OK`);
