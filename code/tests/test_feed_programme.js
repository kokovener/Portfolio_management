#!/usr/bin/env node
/* Architect roadmap (donnees-programme 1.0) read as delivered (Kickoff D12 v10): translator + artefacts adapter.
 * Usage: node tests/test_feed_programme.js <schema.json> <base_dir (items, jalons, … ; may be empty)> <tmp_dir>
 */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const P = require('../tools/feed_programme.js');
const A = require('../tools/adapt_artefacts.js');
const [, , schema, baseDir, tmpDir] = process.argv;
const URL = 'https://claude.ai/artifact/7wZxwDRbqFhdG3SwsZq8eM';
const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'archi_roadmap_2026-11-02.html'), 'utf8');
const axes = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'archi_axes.json'), 'utf8'))).filter(([k]) => !k.startsWith('_')));
const REG = `| URL | Item attendu | Préfixe | Propriétaire | Statut | Format |\n|---|---|---|---|---|---|\n| ${URL} | feed.archi | feed.archi | Personne_09 | actif | programme-1.0 |\n`;
const reg = A.parseRegistry(REG); const base = A.readBase(baseDir);
let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };
const prog = JSON.parse(P.extractProgramme(html)[0].text);
const withProg = (p) => html.replace(P.extractProgramme(html)[0].text, JSON.stringify(p));
const run = (h, b) => A.adapt(reg, { read_at: '2026-11-02T11:30-05:00', artefacts: { [URL]: { dir: 'archi', version: 'x', html: h } } }, b || base, {}, { schema, tmpDir, axes });

// 1. translator on the real 2 Nov. read
const t = P.translate(prog, Object.assign({ axes }, reg[0]));
assert.deepStrictEqual(t.errors, []);
assert.strictEqual(t.feed.items.length, 15); assert.strictEqual(t.feed.jalons.length, 38); assert.strictEqual(t.feed.dependances.length, 2);
assert.strictEqual(t.feed.items[0].type, 'programme'); assert(t.feed.items.slice(1).every((i) => i.parent === 'feed.archi' && i.type === 'projet' && i.voie === 'flux'));
const se02 = t.feed.jalons.find((j) => j.id === 'feed.archi.se-02'); assert.deepStrictEqual([se02.item, se02.date, se02.date_initiale, se02.statut], ['feed.archi.identite-et-acces', '2027-01-29', '2027-01-29', 'a_venir']);
assert.deepStrictEqual(t.feed.dependances.map((d) => [d.de.id, d.vers.id]), [['feed.archi.se-02', 'feed.archi.if-08'], ['feed.archi.se-01', 'feed.archi.in-04']]);
assert.deepStrictEqual(t.feed.gantts[0].onglets.map((o) => o.nom), ['Horizon engagé', 'Au carnet']);
assert.strictEqual(t.feed.gantts[0].onglets.reduce((k, o) => k + o.groupes.reduce((m, g) => m + g.taches.length, 0), 0), 38);
assert.strictEqual(t.feed.source.lu_le, '2026-11-02T00:00-05:00');
assert.strictEqual(t.signals.filter((s) => s.kind === 'archi_incoherence').length, 11);
assert.strictEqual(t.signals.filter((s) => s.kind === 'archi_axe').length, 0, 'lot = axe of the prefix for 38/38');
assert.strictEqual(t.signals.filter((s) => s.kind === 'archi_changement').length, 1);
ok('translator: 1 programme + 14 projects, 38 end-of-task milestones, 2 bloque deps, 2-tab Gantt, 11 inconsistencies, lot = axe');

// 2. adapter: registry format programme-1.0, feed accepted and validated against the model
let r = run(html);
assert.strictEqual(r.report.feeds[0].resultat, 'lu', JSON.stringify(r.report.signals.slice(0, 3)));
assert(r.writes.every((w) => w.doc_id.startsWith('feed.archi')));
assert.strictEqual(r.doc.items.length, 15); assert(r.doc.items.every((i) => i.source.par === 'adaptateur-artefacts' && i.sante === undefined));
ok('adapter: programme-1.0 block accepted, every write under feed.archi, source = adapter read');

// 3. fail closed: unknown statut or duplicated id = feed ignored whole, nothing written
const bad = JSON.parse(JSON.stringify(prog)); bad.taches[0].statut = 'bloque';
r = run(withProg(bad)); assert(r.writes.length === 0 && r.report.signals.some((s) => s.kind === 'feed_ignore' && /statut « bloque » inconnu/.test(s.texte)));
const dup = JSON.parse(JSON.stringify(prog)); dup.taches[1].id = dup.taches[0].id;
r = run(withProg(dup)); assert(r.writes.length === 0 && r.report.signals.some((s) => /id en double/.test(s.texte)));
ok('fail closed: unknown statut, duplicated id = feed ignored, 0 write');

// 4. a planned end that moves: recul reported, the first known date kept as date_initiale
const moved = JSON.parse(JSON.stringify(prog)); const x = moved.taches.find((k) => k.id === 'SE-02'); x.fin_prevue = '2027-02-12'; x.fin_initiale = '2027-02-12';
const base2 = Object.assign({}, base, { jalons: (base.jalons || []).concat([Object.assign({}, se02, { source: { systeme: 'artefact', ref: URL, lu_le: '2026-11-02T11:30-05:00' } })]) });
r = run(withProg(moved), base2);
const j = r.doc.jalons.find((k) => k.id === 'feed.archi.se-02');
assert.deepStrictEqual([j.date, j.date_initiale], ['2027-02-12', '2027-01-29']);
assert(r.report.signals.some((s) => s.kind === 'recul' && s.row === 'feed.archi.se-02'));
assert(!r.report.signals.some((s) => s.kind === 'archi_nouveau'), 'first read: nothing is « new »');
const plus = JSON.parse(JSON.stringify(prog)); plus.taches.push(Object.assign({}, plus.taches[0], { id: 'DA-99', tache: 'Nouvelle analyse' }));
const base3 = Object.assign({}, base, { items: (base.items || []).concat(t.feed.items) });
r = run(withProg(plus), base3);
assert(r.report.signals.some((s) => s.kind === 'archi_nouveau' && /Fin DA-99 · Nouvelle analyse/.test(s.texte)));
ok('recul: SE-02 29 janv. -> 12 févr. reported, date initiale 29 janv. kept from the base; a task added later = « nouvelle tâche »');

// 5. axis guard and unknown dependency
const ax = JSON.parse(JSON.stringify(prog)); ax.taches[0].lot = 'Socle/Core'; ax.taches[1].depend_de = 'DM-01';
r = run(withProg(ax));
assert(r.report.signals.some((s) => s.kind === 'archi_axe' && /DA-01/.test(s.texte)));
assert(r.report.signals.some((s) => s.kind === 'archi_dependance' && /DM-01/.test(s.texte)));
ok('guards: lot ≠ axe of the prefix and a dependency on an unplanned task are reported, not written');

// 6. a registry without the Format column still reads portfolio-feed blocks
const old = A.parseRegistry(`| URL | Item attendu | Préfixe | Propriétaire | Statut |\n|---|---|---|---|---|\n| https://claude.ai/artifact/E3KrS3o15gWHwuqrvpnETg | feed.expertg1 | feed.expertg1 | Franck Kowalczyk | actif |\n`);
assert.strictEqual(old[0].format, 'portfolio-feed'); assert.deepStrictEqual(A.checkRegistry(old), []);
assert(A.checkRegistry(A.parseRegistry(REG.replace('programme-1.0', 'xml'))).some((e) => /format « xml » inconnu/.test(e)));
ok('registry: Format column optional (portfolio-feed by default), unknown format refused');
// 7. fresh review 2 Nov.: second read — etape/fenetre follow the source, old news dropped, removed task purged (K14)
const first = run(html);
const asBase = (doc) => { const b = Object.assign({}, base); ['items', 'jalons', 'dependances', 'gantts'].forEach((c) => { b[c] = (base[c] || []).concat(doc[c] || []); }); return b; };
const b1 = asBase(first.doc);
r = run(html, b1);
assert(!r.report.signals.some((s) => s.kind === 'archi_changement'), 'same data date: changements_semaine not repeated');
assert(!r.writes.some((w) => w.op === 'delete'));
const later = JSON.parse(JSON.stringify(prog)); later.date_donnees = '2027-01-20'; later.changements_semaine = ['SE-12 retirée'];
later.taches = later.taches.filter((k) => k.id !== 'SE-12');
r = run(withProg(later), b1);
const ia = r.doc.items.find((i) => i.id === 'feed.archi.identite-et-acces');
assert.strictEqual(ia.etape, 'actif', 'etape follows the source (SE-02 started 1 Jan. 2027)');
assert(r.report.signals.some((s) => s.kind === 'archi_etape' && /identit/i.test(s.texte)));
assert(!r.report.signals.some((s) => s.kind === 'champ_possede' && /etape|fenetre/.test(s.texte)));
assert(r.report.signals.some((s) => s.kind === 'archi_changement' && /SE-12 retirée/.test(s.texte)));
const del = r.writes.filter((w) => w.op === 'delete');
assert.deepStrictEqual(del.map((w) => [w.collection, w.doc_id, w.purge]), [['jalons', 'feed.archi.se-12', 'K14']]);
assert(r.report.signals.some((s) => s.kind === 'archi_supprime' && /se-12|SE-12/.test(s.texte)));
ok('second read: etape/fenetre follow the source, old changements dropped, removed task SE-12 purged (K14) and reported');

// 8. time zone on switch days (2 a.m. switch: midnight keeps the previous offset); ids unique ignoring case
assert.deepStrictEqual(['2026-11-01', '2026-11-02', '2027-03-14', '2027-03-15', '2026-07-01'].map(P.quebecOffset), ['-04:00', '-05:00', '-05:00', '-04:00', '-04:00']);
const cs = JSON.parse(JSON.stringify(prog)); cs.taches[1].id = cs.taches[0].id.toLowerCase();
assert(P.translate(cs, reg[0]).errors.some((e) => /id en double/.test(e)));
ok('Québec offset at 00:00 on switch days; « SC-02 » and « sc-02 » refused as duplicates');
console.log(`${n} ok`);
