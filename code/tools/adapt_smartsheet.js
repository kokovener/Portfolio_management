#!/usr/bin/env node
/* Smartsheet adapter (step 3a): Goutte21_Master raw export -> canonical model v1 document + db batch.
 *
 * Usage: node tools/adapt_smartsheet.js <raw.json> <base_before_dir> <versions.json> <out_dir>
 *   raw.json         rows read by Claude through the Smartsheet connector (see 04_Adaptateurs fiche)
 *   base_before_dir  ArtifactData export of the current base: <dir>/items/*.json, <dir>/risques/*.json
 *   versions.json    {"items/<id>": n, "risques/<id>": n} — db versions for pinned writes (if_version)
 * Writes to out_dir: doc.json (model document, source = smartsheet), batch.json (ArtifactData writes),
 *   report.json (per-row decision, signals, read/written comparison).
 * Rules (fiche Adaptateur_Smartsheet_v1): grain L by ID pattern; active = phase not Backlog / Done;
 * empty phase = active + signal; adapter writes source fields only and keeps portfolio-owned fields;
 * never writes Smartsheet.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Core = require('../interface/core.js');

const RE_L = /^L\d+(-L\d+)?$/;            // L0, L8, L3-L4
const RE_SUBL = /^L\d+(?:[A-Z]|\.\d+)$/;  // L8D, L0.1
const INACTIVE = ['Backlog', 'Done'];
const SOURCE_FIELDS = ['pct_avancement', 'phase_source'];

function toEdt(z) { // 2026-10-08T13:29:31Z -> 2026-10-08T09:29-04:00 (project rule: fixed EDT)
  if (!z) return null;
  return Core.nowTs(new Date(z));
}
function readDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}
function itemId(sid) { return 'goutte21.' + sid.toLowerCase(); }
function parentOf(sid) { return RE_SUBL.test(sid) ? itemId(sid.match(/^(L\d+)/)[1]) : 'goutte21'; }

function adapt(raw, base, versions) {
  const now = raw.read_at;
  const items = Object.fromEntries(base.items.map((i) => [i.id, i]));
  const out = { items: [], risques: [] }; const rows = []; const signals = [];
  const src = (rowId, suffix) => ({ systeme: 'smartsheet', ref: `${raw.sheet_id}/row/${rowId}${suffix || ''}`, lu_le: now, par: 'adaptateur-smartsheet' });

  const grain = raw.rows.filter((r) => RE_L.test(r.id) || RE_SUBL.test(r.id));
  raw.rows.filter((r) => !grain.includes(r)).forEach((r) => rows.push({ id: r.id, decision: 'ignorée (hors grain L)' }));

  grain.forEach((r) => {
    const id = itemId(r.id); const prev = items[id];
    const active = !INACTIVE.includes(r.phase || '');
    const expectedNiveau = RE_L.test(r.id) ? 'L' : 'Sub-L';
    if (r.niveau !== expectedNiveau) signals.push({ kind: 'niveau', row: r.id, texte: `${r.id} : Niveau « ${r.niveau} » dans Smartsheet, ${expectedNiveau} par son ID — traité au grain ${expectedNiveau}` });
    if (!active && !prev) { rows.push({ id: r.id, decision: `ignorée (phase ${r.phase})` }); return; }

    // freshness: Dernière MAJ if filled, else last change of % / phase cells.
    // Decision Franck 2026-10-27: for a source item, a Gérer save never resets freshness (source only).
    const srcTs = r.derniere_maj ? `${r.derniere_maj}T00:00-04:00`
      : [toEdt((r.hist || {}).pct), toEdt((r.hist || {}).phase)].filter(Boolean).sort().pop() || now;
    const updated = srcTs; const updatedOrigin = r.derniere_maj ? 'Dernière MAJ' : (r.hist ? 'historique % / phase' : 'lecture');

    const rec = prev ? Object.assign({}, prev) : {
      id, nom: `${r.id} ${r.nom}`, type: 'projet', parent: parentOf(r.id), voie: 'scrum', etape: 'actif', promu: false
    };
    SOURCE_FIELDS.forEach((k) => delete rec[k]);
    if (typeof r.pct === 'number') rec.pct_avancement = r.pct;
    if (r.phase) rec.phase_source = r.phase;
    if (r.phase === 'Done' && rec.etape !== 'termine') { rec.etape = 'termine'; signals.push({ kind: 'termine', row: r.id, texte: `${r.id} passé en Done → étape Terminé` }); }
    rec.source = src(r.rowId); rec.updated_at = updated;
    delete rec.sante; // computed by the portfolio, never written by an adapter (D8)
    if (!active) signals.push({ kind: 'inactif', row: r.id, texte: `${r.id} déjà en base, phase ${r.phase} : mis à jour, plus actif` });
    if (!r.phase) signals.push({ kind: 'phase', row: r.id, texte: `${r.id} : phase non renseignée — traité actif (décision Franck 2026-10-27)` });
    if (!items[rec.parent] && !grain.some((g) => itemId(g.id) === rec.parent)) { signals.push({ kind: 'parent', row: r.id, texte: `${r.id} : parent ${rec.parent} absent → rattaché au programme` }); rec.parent = 'goutte21'; }
    out.items.push(rec);
    rows.push({ id: r.id, item: id, decision: prev ? 'mise à jour' : 'créée', lu: { nom: r.nom, phase: r.phase || '(vide)', pct: r.pct, maj: srcTs, maj_origine: updatedOrigin }, base: { phase_source: rec.phase_source || '(absent)', pct_avancement: rec.pct_avancement, updated_at: rec.updated_at, etape: rec.etape }, avant: prev ? { phase_source: prev.phase_source || '(absent)', pct_avancement: prev.pct_avancement, updated_at: prev.updated_at } : null });

    if (r.top_risque) {
      const rk = base.risques.find((x) => x.item === id && x.source && x.source.systeme === 'smartsheet');
      if (rk) { out.risques.push(Object.assign({}, rk, { titre: r.top_risque, source: src(r.rowId, '/Top risque') })); }
      else signals.push({ kind: 'risque', row: r.id, texte: `${r.id} : Top risque « ${r.top_risque} » sans P·I — à saisir dans Gérer (risque)` });
    }
  });
  // promoted items linked to a Smartsheet row (liens url with rowId=<id>): refresh source fields
  const promus = base.items.filter((i) => i.promu && (i.liens || []).some((l) => /rowId=\d+/.test(l.url)));
  promus.forEach((i) => {
    const rid = Number((i.liens.find((l) => /rowId=\d+/.test(l.url)).url.match(/rowId=(\d+)/) || [])[1]);
    const r = raw.rows.find((x) => x.rowId === rid);
    if (!r) { signals.push({ kind: 'promu', row: i.id, texte: `${i.id} : ligne Smartsheet ${rid} non lue` }); return; }
    const rec = Object.assign({}, i); SOURCE_FIELDS.forEach((k) => delete rec[k]);
    if (typeof r.pct === 'number') rec.pct_avancement = r.pct; if (r.phase) rec.phase_source = r.phase;
    rec.source = src(r.rowId); out.items.push(rec);
    rows.push({ id: r.id, item: i.id, decision: 'item promu rafraîchi' });
  });

  const doc = { modele: '1', source: { systeme: 'smartsheet', ref: `Goutte21_Master ${raw.sheet_id}`, lu_le: now, par: 'adaptateur-smartsheet' }, items: out.items };
  if (out.risques.length) doc.risques = out.risques;
  const writes = [];
  ['items', 'risques'].forEach((c) => (doc[c] || []).forEach((r) => {
    const w = { op: 'set', collection: c, doc_id: r.id, data: r }; const v = versions[`${c}/${r.id}`];
    if (v) w.if_version = v; writes.push(w);
  }));
  return { doc, writes, report: { lu_le: now, lignes_lues: raw.rows.length, grain_l: grain.length, ecrits: writes.length, promus_relies: promus.length, rows, signals } };
}

if (require.main === module) {
  const [, , rawP, baseDir, verP, outDir] = process.argv;
  const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
  const base = { items: readDir(path.join(baseDir, 'items')), risques: readDir(path.join(baseDir, 'risques')) };
  const versions = JSON.parse(fs.readFileSync(verP, 'utf8'));
  const { doc, writes, report } = adapt(raw, base, versions);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'doc.json'), JSON.stringify(doc, null, 2));
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify(writes, null, 1));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`grain L ${report.grain_l} · écrits ${report.ecrits} · signaux ${report.signals.length} · promus reliés ${report.promus_relies}`);
}
module.exports = { adapt, RE_L, RE_SUBL };
