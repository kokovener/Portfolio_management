#!/usr/bin/env node
/* Smartsheet adapter v4 (R30 2026-10-28: étape and voie read; v3 R06 workshop 2026-10-28, part 2: planned dates and gates; v2: grain, phases): Goutte21_Master raw export -> canonical model document + db batch.
 *
 * Usage: node tools/adapt_smartsheet.js <raw.json> <base_before_dir> <versions.json> <out_dir>
 *   raw.json         rows read by Claude through the Smartsheet connector — v2 expects ALL rows (children are
 *                    needed to deduce a parent phase and to find the nearest portfolio ancestor)
 *   base_before_dir  ArtifactData export of the current base: <dir>/items/*.json, <dir>/risques/*.json
 *   versions.json    {"items/<id>": n, "risques/<id>": n} — db versions for pinned writes (if_version)
 * Writes to out_dir: doc.json, batch.json, report.json.
 * Rules (fiche Adaptateur_Smartsheet_v2):
 *   grain = L / Sub-L by ID pattern + any row ticked in the "Portefeuille" column (promoted by Franck, D4);
 *   active phase = BA … MEP; Backlog and "A Revoir" = étape qualifié; Done = étape terminé;
 *   empty phase on a parent row = deduced from its children (least advanced active child), flagged phase_deduite;
 *   a saisie item linked to a row (liens rowId=) is refreshed, never duplicated;
 *   v4 (R30): étape (from phase) and voie (scrum) are read for every item tied to a row, linked saisie items included;
 *   planned window = Master "Début prévu" / "Fin prévue" entered at month precision (1st → last day of month);
 *   gates BA-3, AC-4, QA-2, QA-3 of a portfolio entity are read in Jalons_Entites (raw.gates): Date prévue (month),
 *   checkbox, Date check (actual) → jalon <item>.<gate>;
 *   v5 (R27): raw.commentaires [[rowId, commentId, text, author, createdAt]] → blocking comments become attentes;
 *   adapter writes source fields only, keeps portfolio-owned fields; never writes Smartsheet.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Core = require('../interface/core.js');

const RE_L = /^L\d+(-L\d+)?$/;            // L0, L8, L3-L4
const RE_SUBL = /^L\d+(?:[A-Z]|\.\d+)$/;  // L8D, L0.1
const ACTIVE_ORDER = ['BA', 'AF / UX', 'Archi / Coordo / Confo', 'Dev', 'QA', 'MEP'];
const PAUSED = ['Backlog', 'A Revoir'];    // decision Franck R06: "A Revoir" = paused, out of active
const SOURCE_FIELDS = ['pct_avancement', 'phase_source', 'phase_deduite'];
const GATES = { 'ba-3': 'BA-3 scope figé', 'ac-4': 'AC-4 GO Dev', 'qa-2': 'QA-2 UAT', 'qa-3': 'QA-3 MEP' };
const som = (d) => d.slice(0, 7) + '-01';
const eom = (d) => { const [y, m] = d.slice(0, 7).split('-').map(Number); const x = new Date(Date.UTC(y, m, 0)); return x.toISOString().slice(0, 10); };

function toEdt(z) { return z ? Core.nowTs(new Date(z)) : null; }
function readDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}
function itemId(sid) { return 'goutte21.' + sid.toLowerCase(); }
// Structural parent from the WBS ID: L8D1.1.2 -> L8D1.1 -> L8D1 -> L8D -> L8 ; L0.1 -> L0 ; L3-L4 -> null
function sheetParent(sid) {
  let m;
  if ((m = sid.match(/^(.+)\.\d+$/))) return m[1];
  if ((m = sid.match(/^(L\d+[A-Z])\d+$/))) return m[1];
  if ((m = sid.match(/^(L\d+)[A-Z]$/))) return m[1];
  return null;
}
function etapeOf(phase) {
  if (phase === 'Done') return 'termine';
  if (PAUSED.includes(phase)) return 'qualifie';
  return 'actif'; // active phase, or still empty after deduction (decision F0: active + alert)
}

// Phase of a row: its own, else deduced from children (recursive). Returns {phase, deduite}.
function phaseResolver(rows) {
  const kids = {}; rows.forEach((r) => { const p = sheetParent(r.id); if (p) (kids[p] = kids[p] || []).push(r); });
  const memo = {};
  function resolve(r) {
    if (memo[r.id]) return memo[r.id];
    if (r.phase) return (memo[r.id] = { phase: r.phase, deduite: false });
    const ph = (kids[r.id] || []).map((k) => resolve(k).phase).filter(Boolean);
    const act = ph.filter((p) => ACTIVE_ORDER.includes(p)).sort((a, b) => ACTIVE_ORDER.indexOf(a) - ACTIVE_ORDER.indexOf(b));
    let phase = null;
    if (act.length) phase = act[0];                       // least advanced active child
    else if (ph.length && ph.every((p) => p === 'Done')) phase = 'Done';
    else if (ph.includes('Backlog')) phase = 'Backlog';
    else if (ph.includes('A Revoir')) phase = 'A Revoir';
    return (memo[r.id] = { phase, deduite: !!phase });
  }
  return resolve;
}

function adapt(raw, base, versions) {
  const now = raw.read_at;
  const items = Object.fromEntries(base.items.map((i) => [i.id, i]));
  const out = { items: [], risques: [] }; const rows = []; const signals = [];
  const src = (rowId, suffix) => ({ systeme: 'smartsheet', ref: `${raw.sheet_id}/row/${rowId}${suffix || ''}`, lu_le: now, par: 'adaptateur-smartsheet' });
  const byId = Object.fromEntries(raw.rows.map((r) => [r.id, r]));
  const resolve = phaseResolver(raw.rows);

  // saisie items already linked to a row (liens url with rowId=<id>)
  const linked = {};
  base.items.filter((i) => i.promu && (i.liens || []).some((l) => /rowId=\d+/.test(l.url))).forEach((i) => {
    const rid = Number(i.liens.find((l) => /rowId=\d+/.test(l.url)).url.match(/rowId=(\d+)/)[1]); linked[rid] = i;
  });

  const isGrainL = (r) => RE_L.test(r.id) || RE_SUBL.test(r.id);
  const inPortfolio = (r) => isGrainL(r) || r.portefeuille === true || !!linked[r.rowId];
  const portfolioIdOf = (r) => (linked[r.rowId] ? linked[r.rowId].id : itemId(r.id));
  // nearest ancestor that is itself a portfolio item; none -> programme
  function portfolioParent(sid) {
    for (let p = sheetParent(sid); p; p = sheetParent(p)) { const pr = byId[p]; if (pr && inPortfolio(pr)) return portfolioIdOf(pr); }
    return 'goutte21';
  }

  const grain = raw.rows.filter((r) => isGrainL(r) || r.portefeuille === true);
  raw.rows.filter((r) => !grain.includes(r) && !linked[r.rowId]).forEach((r) => rows.push({ id: r.id, decision: 'ignorée (hors grain, non cochée Portefeuille)' }));

  function freshness(r) {
    if (r.derniere_maj) return { ts: `${r.derniere_maj}T00:00${Core.nowTs(new Date(r.derniere_maj + 'T12:00Z')).slice(16)}`, origine: 'Dernière MAJ' };
    const ts = [toEdt((r.hist || {}).pct), toEdt((r.hist || {}).phase)].filter(Boolean).sort().pop();
    return ts ? { ts, origine: 'historique % / phase' } : { ts: now, origine: 'lecture' };
  }
  // R30 (model v5): an item tied to a Smartsheet row takes étape from the phase and voie scrum (Goutte 2.1 delivery,
  // developed in GOU21 sprints) — these two fields are read, no longer entered in Gérer
  function followSource(rec, r, ph) {
    const etape = etapeOf(ph.phase);
    if (rec.etape !== etape) { signals.push({ kind: 'etape', row: r.id, texte: `${rec.id} : phase ${ph.phase || '(vide)'} → étape ${etape} (était ${rec.etape})` }); rec.etape = etape; }
    if (rec.voie !== 'scrum') { signals.push({ kind: 'voie', row: r.id, texte: `${rec.id} : voie ${rec.voie} → scrum (ligne Goutte 2.1)` }); rec.voie = 'scrum'; }
  }
  function applySource(rec, r) {
    const ph = resolve(r);
    SOURCE_FIELDS.forEach((k) => delete rec[k]);
    if (typeof r.pct === 'number') rec.pct_avancement = r.pct;
    if (ph.phase) rec.phase_source = ph.phase;
    if (ph.deduite) rec.phase_deduite = true;
    // planned window (R06 part 2): Smartsheet wins when filled; empty keeps a window entered in Gérer
    if (r.debut_prevu || r.fin_prevue) {
      const f = { debut: som(r.debut_prevu || r.fin_prevue), fin: r.fin_prevue ? eom(r.fin_prevue) : null };
      if (f.fin && f.fin < f.debut) signals.push({ kind: 'fenetre', row: r.id, texte: `${r.id} : Fin prévue avant Début prévu — fenêtre ignorée` });
      else rec.fenetre = f;
    }
    return ph;
  }

  grain.forEach((r) => {
    if (linked[r.rowId]) return; // handled below as the saisie item it is linked to
    const id = itemId(r.id); const prev = items[id];
    const promo = !isGrainL(r);
    if (!promo) {
      const expectedNiveau = RE_L.test(r.id) ? 'L' : 'Sub-L';
      if (r.niveau !== expectedNiveau) signals.push({ kind: 'niveau', row: r.id, texte: `${r.id} : Niveau « ${r.niveau} » dans Smartsheet, ${expectedNiveau} par son ID — traité au grain ${expectedNiveau}` });
    }
    const ph = resolve(r); const etape = etapeOf(ph.phase);
    if (!prev && etape !== 'actif' && !promo) { rows.push({ id: r.id, decision: `ignorée (phase ${ph.phase})` }); return; }

    const f = freshness(r);
    const rec = prev ? Object.assign({}, prev) : {
      id, nom: `${r.id} ${r.nom}`, type: 'projet', parent: portfolioParent(r.id), voie: 'scrum', etape, promu: promo
    };
    applySource(rec, r);
    // étape follows the source phase for Smartsheet items: Done -> terminé, Backlog / A Revoir -> qualifié, active -> actif
    // (R30, model v5: the source wins, including over a hand-set 'planifié')
    if (prev) followSource(rec, r, ph);
    rec.source = src(r.rowId); rec.updated_at = f.ts;
    delete rec.sante; // computed by the portfolio, never written by an adapter (D8)
    if (ph.deduite) signals.push({ kind: 'phase_deduite', row: r.id, texte: `${r.id} : phase vide, déduite des enfants = ${ph.phase}` });
    if (!ph.phase) signals.push({ kind: 'phase', row: r.id, texte: `${r.id} : phase non renseignée et non déductible — traité actif (décision Franck 2026-10-27)` });
    if (rec.parent !== 'goutte21' && !items[rec.parent] && !grain.some((g) => portfolioIdOf(g) === rec.parent) && !Object.values(linked).some((l) => l.id === rec.parent)) {
      signals.push({ kind: 'parent', row: r.id, texte: `${r.id} : parent ${rec.parent} absent → rattaché au programme` }); rec.parent = 'goutte21';
    }
    out.items.push(rec);
    rows.push({ id: r.id, item: id, decision: prev ? 'mise à jour' : (promo ? 'créée (cochée Portefeuille)' : 'créée'), lu: { nom: r.nom, phase: r.phase || '(vide)', pct: r.pct, maj: f.ts, maj_origine: f.origine }, base: { phase_source: rec.phase_source || '(absent)', phase_deduite: !!rec.phase_deduite, pct_avancement: rec.pct_avancement, updated_at: rec.updated_at, etape: rec.etape, parent: rec.parent }, avant: prev ? { phase_source: prev.phase_source || '(absent)', pct_avancement: prev.pct_avancement, updated_at: prev.updated_at, etape: prev.etape } : null });

    if (r.top_risque) {
      const rk = base.risques.find((x) => x.item === id && x.source && x.source.systeme === 'smartsheet');
      if (rk) out.risques.push(Object.assign({}, rk, { titre: r.top_risque, source: src(r.rowId, '/Top risque') }));
      else signals.push({ kind: 'risque', row: r.id, texte: `${r.id} : Top risque « ${r.top_risque} » sans P·I — à saisir dans Gérer (risque)` });
    }
  });

  // saisie items linked to a row: refresh source fields, parent follows the sheet structure (R06), no duplicate
  Object.entries(linked).forEach(([rid, i]) => {
    const r = raw.rows.find((x) => x.rowId === Number(rid));
    if (!r) { signals.push({ kind: 'promu', row: i.id, texte: `${i.id} : ligne Smartsheet ${rid} non lue` }); return; }
    const rec = Object.assign({}, i); const ph = applySource(rec, r); const f = freshness(r);
    const parent = portfolioParent(r.id);
    if (rec.parent !== parent) { signals.push({ kind: 'parent', row: r.id, texte: `${i.id} : parent ${rec.parent} → ${parent} (structure de la feuille)` }); rec.parent = parent; }
    followSource(rec, r, ph);
    rec.source = src(r.rowId); rec.updated_at = f.ts; delete rec.sante;
    out.items.push(rec);
    rows.push({ id: r.id, item: i.id, decision: 'item saisi relié rafraîchi', lu: { phase: r.phase || '(vide)', pct: r.pct, maj: f.ts }, base: { phase_source: rec.phase_source || '(absent)', pct_avancement: rec.pct_avancement, parent: rec.parent, etape: rec.etape, voie: rec.voie }, avant: { etape: i.etape, voie: i.voie } });
  });

  // ---------- gates of portfolio entities (Jalons_Entites) ----------
  const jalons = [];
  const prevJ = Object.fromEntries((base.jalons || []).map((j) => [j.id, j]));
  const entityItem = {};
  raw.rows.forEach((r) => { if (linked[r.rowId]) entityItem[r.id] = linked[r.rowId].id; else if (r.portefeuille === true && !isGrainL(r)) entityItem[r.id] = itemId(r.id); });
  const sans = {};
  (raw.gates || []).forEach((g) => {
    const item = entityItem[g.entite]; if (!item || !GATES[g.gate]) return;
    const id = `${item}.${g.gate}`; const prev = prevJ[id];
    const date = g.date_prevue ? eom(g.date_prevue) : (g.coche && g.date_check ? g.date_check : null);
    if (!date) { (sans[item] = sans[item] || []).push(g.gate.toUpperCase()); if (prev) signals.push({ kind: 'gate', row: id, texte: `${id} : Date prévue effacée dans Jalons_Entites — jalon gardé tel quel` }); return; }
    const j = { id, item, nom: GATES[g.gate], date, statut: g.coche ? 'fait' : 'a_venir', source: { systeme: 'smartsheet', ref: `${raw.gates_sheet_id || 2733930749841284}/row/${g.rowId}`, lu_le: now, par: 'adaptateur-smartsheet' } };
    if (g.date_prevue) j.precision = 'mois';
    j.date_initiale = prev && prev.date_initiale ? prev.date_initiale : date;
    if (g.coche) { if (g.date_check) j.fait_le = g.date_check; else signals.push({ kind: 'gate', row: id, texte: `${id} : cochée sans Date check — date réelle inconnue` }); }
    if (prev && prev.date !== date) signals.push({ kind: 'gate', row: id, texte: `${id} : date prévue ${prev.date} → ${date}` });
    jalons.push(j);
  });
  Object.keys(sans).forEach((item) => signals.push({ kind: 'gate_sans_date', row: item, texte: `${item} : ${sans[item].join(', ')} sans Date prévue dans Jalons_Entites` }));

  // ---------- R27 (Franck 2026-10-29): blocking comments on the rows of portfolio items → attentes ----------
  // raw.commentaires = [[rowId, commentId, text, author, createdAt]] (discussions of Goutte21_Master); a comment is blocking
  // when it says « bloquant », « bloq… », « bloque » or « bloqué » (any case); one attente per comment, never deleted:
  // a comment no longer read (deleted) closes it (recue_le).
  const attentes = [];
  if (Array.isArray(raw.commentaires)) {
    const RE_BLOQ = /\bbloq|\bbloqu[eé]/i;
    const itemOfRow = {}; out.items.forEach((i) => { const m = String((i.source || {}).ref || '').match(/\/row\/(\d+)$/); if (m) itemOfRow[m[1]] = i.id; });
    const prevA = Object.fromEntries((base.attentes || []).filter((a) => a.source && a.source.par === 'adaptateur-smartsheet').map((a) => [a.id, a]));
    const seenA = new Set();
    raw.commentaires.forEach(([rowId, cid, text, auteur, cree]) => {
      const item = itemOfRow[String(rowId)]; if (!item || !RE_BLOQ.test(text || '')) return;
      const id = `smartsheet.att.${cid}`; seenA.add(id);
      attentes.push({ id, item, tiers: auteur || 'Smartsheet', objet: String(text).replace(/\s+/g, ' ').trim().slice(0, 200), attendue_le: String(cree).slice(0, 10), recue_le: null, source: src(rowId, `/discussion/${cid}`) });
    });
    Object.values(prevA).filter((a) => !seenA.has(a.id) && !a.recue_le).forEach((a) => {
      attentes.push(Object.assign({}, a, { recue_le: now.slice(0, 10) })); signals.push({ kind: 'attente_levee', row: a.id, texte: `${a.objet.slice(0, 60)} : commentaire bloquant disparu — attente close` });
    });
  }
  const doc = { modele: '4', source: { systeme: 'smartsheet', ref: `Goutte21_Master ${raw.sheet_id}`, lu_le: now, par: 'adaptateur-smartsheet' }, items: out.items };
  if (attentes.length) doc.attentes = attentes;
  if (out.risques.length) doc.risques = out.risques;
  if (jalons.length) doc.jalons = jalons;
  const writes = [];
  ['items', 'risques', 'jalons', 'attentes'].forEach((c) => (doc[c] || []).forEach((r) => {
    const w = { op: 'set', collection: c, doc_id: r.id, data: r }; const v = versions[`${c}/${r.id}`];
    if (v) w.if_version = v; writes.push(w);
  }));
  return { doc, writes, report: { lu_le: now, lignes_lues: raw.rows.length, grain: grain.length, jalons: jalons.length, ecrits: writes.length, promus_relies: Object.keys(linked).length, rows, signals } };
}

if (require.main === module) {
  const [, , rawP, baseDir, verP, outDir] = process.argv;
  const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
  const base = { items: readDir(path.join(baseDir, 'items')), risques: readDir(path.join(baseDir, 'risques')), jalons: readDir(path.join(baseDir, 'jalons')), attentes: readDir(path.join(baseDir, 'attentes')) };
  const versions = JSON.parse(fs.readFileSync(verP, 'utf8'));
  const { doc, writes, report } = adapt(raw, base, versions);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'doc.json'), JSON.stringify(doc, null, 2));
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify(writes, null, 1));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`grain ${report.grain} · écrits ${report.ecrits} · signaux ${report.signals.length} · promus reliés ${report.promus_relies}`);
}
module.exports = { adapt, sheetParent, phaseResolver, som, eom, RE_L, RE_SUBL };
