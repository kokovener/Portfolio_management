#!/usr/bin/env node
/* Gantt adapter (model v15) on the real Méthane P2 drawio (PLQ-Forge, read 2026-10-30) and the JSON contract.
 * Usage: node tests/test_adapt_gantt.js <schema.json>
 */
'use strict';
const fs = require('fs'); const path = require('path'); const os = require('os'); const zlib = require('zlib'); const assert = require('assert');
const crypto = require('crypto');
const G = require('../tools/adapt_gantt.js');
const schema = process.argv[2]; assert(schema && fs.existsSync(schema), 'schema.json path required');
const FX = path.join(__dirname, 'fixtures', 'gantt');
const xml = fs.readFileSync(path.join(FX, 'methane-gantt.drawio'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const reg = G.parseRegistry(fs.readFileSync(path.join(FX, 'Gantts_Inscrits_test.md'), 'utf8'));
const READ = '2026-10-30T10:16-04:00';
const item = { id: 'saisie.methane-p2', nom: 'Méthane P2', type: 'projet', voie: 'scrum', etape: 'actif', promu: false, updated_at: READ, fenetre: { debut: '2026-10-05', fin: '2027-01-15' }, source: { systeme: 'saisie', lu_le: READ, par: 'Franck' } };
const raw = (buf, extra) => ({ read_at: READ, gantts: { 'saisie.methane-p2': Object.assign({ fichier: 'methane-gantt.drawio', format: 'drawio', web_url: 'https://x/methane-gantt.drawio', modifie_le: '2026-10-30T10:10-04:00', sha256: sha(buf), content: buf }, extra || {}) } });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gantt-'));
const opts = { schema, tmpDir: tmp };
let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };

// 1. drawio parse — values checked against the pixel grid by hand (x0 470, 140 px / week, 28 px / day, S0 = Mon 5 Oct 2026)
const p = G.parseDrawio(xml.toString('utf8'), '2026-10-30');
assert.strictEqual(p.onglets.length, 2); assert.deepStrictEqual(p.onglets.map((o) => o.nom), ['Phase II', 'Corrections phase I']);
const t1 = p.onglets[0].groupes.flatMap((g) => g.taches); const t2 = p.onglets[1].groupes.flatMap((g) => g.taches);
assert.strictEqual(t1.length, 43); assert.strictEqual(t2.length, 9);
const by = (ref) => t1.find((t) => t.ref === ref);
assert.deepStrictEqual([by('P2-AN1').debut, by('P2-AN1').fin], ['2026-10-16', '2026-10-16']); // x 722 = S1 + 4 days
assert.deepStrictEqual([by('P2-UIX').debut, by('P2-UIX').fin], ['2026-10-20', '2026-11-05']); // x 778 w 364 = 13 days
assert.deepStrictEqual([by('P2-DEP').debut, by('P2-DEP').fin], ['2026-12-30', '2027-01-05']); // across the year end
assert.strictEqual(p.onglets[0].fin, '2027-01-08'); assert.strictEqual(p.calcule_le, '2026-10-14'); assert.strictEqual(p.onglets[0].hors_planning, 'P2-INT.');
assert.strictEqual(by('P2-AN1').nom, 'Figer les règles de calcul de la phase II');
const jal = p.onglets.flatMap((o) => o.groupes.flatMap((g) => g.taches.filter((t) => t.jalon)).map((t) => `${o.nom}|${t.nom}|${t.fin}`));
assert.deepStrictEqual(jal, ['Phase II|Acceptation en PREP (client)|2027-01-07', 'Phase II|Mise en production après acceptation|2027-01-08', 'Corrections phase I|Acceptation en PREP (client)|2027-01-13', 'Corrections phase I|Mise en production après acceptation|2027-01-14']);
assert(!t1.find((t) => t.nom === 'Gestion de projet').jalon, 'Gestion de projet (63 days) is not a milestone');
ok('drawio: 2 tabs, 43 + 9 tasks (counted on the ref column), dates on the day grid, year rollover, 4 milestones, computed on 14 Oct');

// 2. compressed diagram (draw.io default save) gives the same result
const comp = xml.toString('utf8').replace(/(<diagram\b[^>]*>)([\s\S]*?)(<\/diagram>)/g, (_, a, b, c) => a + zlib.deflateRawSync(Buffer.from(encodeURIComponent(b.trim()))).toString('base64') + c);
assert.deepStrictEqual(G.parseDrawio(comp, '2026-10-30'), p); ok('drawio: compressed diagrams decoded identically');

// 3. adapter: item absent = ignored; item present = 1 gantt + 4 jalons valid against the model; ids <= 80
let r = G.adapt(reg, raw(xml), { items: [] }, {}, opts);
assert.strictEqual(r.writes.length, 0); assert(r.report.signals.some((s) => s.kind === 'gantt_ignore' && /item absent/.test(s.texte))); ok('adapt: Gantt of an unknown item ignored, nothing written');
r = G.adapt(reg, raw(xml), { items: [item] }, {}, opts);
assert.strictEqual(r.doc.gantts.length, 1); assert.strictEqual(r.doc.jalons.length, 4); assert.strictEqual(r.writes.length, 5);
assert(r.writes.every((w) => !w.if_version && w.doc_id.length <= 80));
assert.strictEqual(r.doc.gantts[0].id, 'gantt.saisie.methane-p2'); assert.strictEqual(r.doc.gantts[0].source.systeme, 'sharepoint');
assert(r.report.signals.some((s) => s.kind === 'plan_ancien'), 'plan computed 14 Oct, uploaded 30 Oct');
assert(!r.report.signals.some((s) => s.kind === 'fenetre'), 'window = Gantt bounds: no signal');
assert(G.adapt(reg, raw(xml), { items: [Object.assign({}, item, { fenetre: { debut: '2026-10-05', fin: '2026-12-31' } })] }, {}, opts).report.signals.some((s) => s.kind === 'fenetre'), 'window ≠ Gantt: signal');
assert(r.doc.jalons.every((j) => j.statut === 'a_venir' && j.item === 'saisie.methane-p2'));
ok('adapt: 1 gantt + 4 milestones created, model-valid, plan-age signal');

// 4. same file again = unchanged, 0 write
const base2 = { items: [item], gantts: r.doc.gantts, jalons: r.doc.jalons };
const v2 = {}; r.writes.forEach((w) => { v2[`${w.collection}/${w.doc_id}`] = 1; });
let r2 = G.adapt(reg, raw(xml), base2, v2, opts); assert.strictEqual(r2.writes.length, 0); assert.strictEqual(r2.report.gantts[0].resultat, 'inchangé');
ok('rerun: same sha256 = inchangé, 0 write');

// 5. transcription check: sha256 in read.json differs = ignored, base kept
r2 = G.adapt(reg, raw(xml, { sha256: 'f'.repeat(64) }), base2, v2, opts); assert.strictEqual(r2.writes.length, 0);
assert(r2.report.signals.some((s) => /transcription infidèle/.test(s.texte)) && r2.report.signals.filter((s) => s.kind === 'conserve').length === 4);
ok('adapt: sha256 mismatch = ignored, 4 milestones kept and reported');

// 6. MEP moved one week later: pinned rewrite, date_initiale kept, recul signalled
const moved = Buffer.from(xml.toString('utf8').replace('x="2402" y="1306"', 'x="2542" y="1306"').replace(/(S13 · 4 janv\.)/, '$1'));
// widen the grid by one week so the moved bar stays inside it
const wk14 = '<mxCell id="t_wk14" value="S14 · 11 janv." style="rounded=0;fillColor=#3a414a;" vertex="1" parent="1"><mxGeometry x="2430" y="98" width="140" height="26" as="geometry" /></mxCell>';
const moved2 = Buffer.from(moved.toString('utf8').replace('<mxCell id="p2_3"', wk14 + '<mxCell id="p2_3"'));
r2 = G.adapt(reg, raw(moved2), base2, v2, opts);
const mep = r2.doc.jalons.find((j) => /phase-ii\.mise-en-production/.test(j.id));
assert.strictEqual(mep.date, '2027-01-15'); assert.strictEqual(mep.date_initiale, '2027-01-08'); assert(r2.writes.find((w) => w.doc_id === mep.id).if_version === 1);
assert(r2.report.signals.some((s) => s.kind === 'recul' && s.row === mep.id));
ok('adapt: MEP +1 week = date_initiale kept, recul signalled, writes pinned');

// 7. broken layout (bar 5 px off the day grid) = refused, nothing written
r2 = G.adapt(reg, raw(Buffer.from(xml.toString('utf8').replace('x="722" y="178"', 'x="727" y="178"'))), base2, v2, opts);
assert.strictEqual(r2.writes.length, 0); assert(r2.report.signals.some((s) => /hors de la grille des jours|largeur/.test(s.texte)));
ok('adapt: bar off the day grid = Gantt refused (never guessed), base kept');

// 8. JSON contract (feeds/gantt_json_gabarit.json): milestones, critical path, segments; fait -> statut fait
const gab = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'feeds', 'gantt_json_gabarit.json'), 'utf8'));
gab.onglets[0].groupes[1].taches[0].fait = true;
const jb = Buffer.from(JSON.stringify(gab));
const regJ = [{ item: 'saisie.methane-p2', format: 'json', fichier: 'x', statut: 'actif' }];
r2 = G.adapt(regJ, { read_at: READ, gantts: { 'saisie.methane-p2': { fichier: 'g.json', format: 'json', sha256: sha(jb), content: jb } } }, { items: [item] }, {}, opts);
assert.strictEqual(r2.doc.gantts[0].format, 'json'); assert.strictEqual(r2.doc.jalons.length, 2);
assert.strictEqual(r2.doc.jalons.find((j) => /acceptation/.test(j.id)).statut, 'fait');
const tj = r2.doc.gantts[0].onglets[0].groupes[0].taches; assert(tj[0].critique && tj[1].segments.length === 2);
ok('json: contract parsed, jalon fait, critical path and segments kept');
// 9. fresh review 30 oct.: missing sha256, impossible date, long JSON milestone, « fait » in the future, Z timestamp, unknown format
const jr = (g, extra) => { const b = Buffer.from(JSON.stringify(g)); return { read_at: READ, gantts: { 'saisie.methane-p2': Object.assign({ fichier: 'g.json', format: 'json', sha256: sha(b), content: b }, extra || {}) } }; };
const sig = (res, re) => res.report.signals.some((s) => re.test(s.texte));
let q = G.adapt(reg, raw(xml, { sha256: undefined }), { items: [item] }, {}, opts); assert(q.writes.length === 0 && sig(q, /sha256 absente/));
const bad = JSON.parse(JSON.stringify(gab)); bad.onglets[0].groupes[0].taches[0].fin = '2026-02-30';
q = G.adapt(regJ, jr(bad), { items: [item] }, {}, opts); assert(q.writes.length === 0 && sig(q, /dates réelles/));
const lng = JSON.parse(JSON.stringify(gab)); lng.onglets[0].groupes[1].taches[0].debut = '2026-10-01';
q = G.adapt(regJ, jr(lng), { items: [item] }, {}, opts); assert(q.writes.length === 0 && sig(q, /marquée jalon sur/));
const fut = JSON.parse(JSON.stringify(gab)); fut.onglets[0].groupes[1].taches[1].fait = true;
q = G.adapt(regJ, jr(fut), { items: [item] }, {}, opts); const mj = q.doc.jalons.find((j) => /mise-en-production/.test(j.id));
assert(mj.statut === 'fait' && mj.fait_le === '2026-10-30' && q.report.signals.some((s) => s.kind === 'fait_avance'));
q = G.adapt(reg, raw(xml, { modifie_le: '2026-10-30T14:10:26Z' }), { items: [item] }, {}, opts); assert.strictEqual(q.doc.gantts[0].fichier_modifie_le, '2026-10-30T10:10-04:00');
q = G.adapt([Object.assign({}, reg[0], { format: 'JSON' })], raw(xml), { items: [item] }, {}, opts); assert(q.writes.length === 0 && sig(q, /format « JSON » inconnu/));
ok('review 30 oct.: sha256 required, real dates, JSON milestone ≤ 5 j o., fait never after the read, SharePoint Z converted to EDT, format checked');
console.log(`${n} ok`);
