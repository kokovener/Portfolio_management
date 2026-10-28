#!/usr/bin/env node
/* Artefacts adapter (step 3c): project artefacts' portfolio-feed blocks -> canonical model v1 document + db batch.
 *
 * Usage: node tools/adapt_artefacts.js <Feeds_Inscrits.md> <raw_dir> <base_before_dir> <out_dir> <schema.json>
 *   Feeds_Inscrits.md  registry table: URL | Item attendu | Préfixe | Propriétaire | Statut (only "actif" rows are read)
 *   raw_dir            read.json {read_at, artefacts: {<url>: {dir, version, sha256}}} + <dir>/index.html, saved by
 *                      Claude with `Artifact read` (path index.html) — never WebFetch
 *   base_before_dir    ArtifactData export: <dir>/<collection>/*.json + versions.json {"<collection>/<id>": n}
 * Writes to out_dir: doc.json, batch.json (pinned ArtifactData writes), report.json, feeds/<dir>.json (extracted blocks).
 * Rules (fiche Adaptateur_Artefacts_v1):
 *   - one <script type="application/json" id="portfolio-feed"> block; missing, duplicated, unparsable, invalid
 *     against the model (validate_model.py) or breaking the feed contract = feed ignored and reported, no write at all;
 *   - contract: source = artefact + registered URL; collections items, jalons, risques, attentes, dependances,
 *     livrables only; every id under the registered prefix; the expected item present;
 *   - item: portfolio-owned fields taken at creation only (as Smartsheet S3), source fields at every read;
 *   - jalon / livrable: date_initiale kept when the date moves; risque.score computed;
 *   - base records of a feed absent from its read are kept and reported, never deleted.
 * Never writes an artefact; never deletes a db document.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ALLOWED = ['items', 'jalons', 'risques', 'attentes', 'dependances', 'livrables'];
const OWNED = ['nom', 'type', 'parent', 'voie', 'etape', 'promu', 'priorite', 'responsable', 'fenetre', 'note_lundi', 'liens'];
const ITEM_SOURCE = ['pct_avancement', 'phase_source', 'contenu_sprint', 'support']; // model §3 read-only fields (sante apart)
const RE_BLOCK = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

// ---------- registry ----------
function parseRegistry(md) {
  const rows = [];
  md.split(/\r?\n/).forEach((l) => {
    const c = l.split('|').map((x) => x.trim());
    if (c.length < 7 || !/^https?:\/\/|^\(/.test(c[1])) return;
    rows.push({ url: c[1], item: /^[a-z0-9]/.test(c[2]) ? c[2] : null, prefixe: c[3], proprietaire: c[4], statut: c[5] });
  });
  return rows;
}
function checkRegistry(rows) {
  const errs = [];
  rows.forEach((r, i) => {
    if (!/^feed\.[a-z0-9-]+$/.test(r.prefixe)) errs.push(`ligne ${i + 1} : préfixe « ${r.prefixe} » hors forme feed.<nom>`);
    if (r.item && !underPrefix(r.item, r.prefixe)) errs.push(`ligne ${i + 1} : item attendu ${r.item} hors du préfixe ${r.prefixe}`);
    rows.forEach((o, j) => { if (j > i && (underPrefix(o.prefixe, r.prefixe) || underPrefix(r.prefixe, o.prefixe))) errs.push(`préfixes ${r.prefixe} / ${o.prefixe} se recouvrent`); });
  });
  return errs;
}
function underPrefix(id, p) { return id === p || id.startsWith(p + '.'); }

// ---------- extraction ----------
function extractBlocks(html) {
  const out = []; let m; RE_BLOCK.lastIndex = 0;
  while ((m = RE_BLOCK.exec(html))) {
    const attrs = m[1];
    if (/\bid\s*=\s*["']?portfolio-feed["']?/i.test(attrs)) out.push({ json: /type\s*=\s*["']application\/json["']/i.test(attrs), text: m[2] });
  }
  return out;
}

// ---------- validation (validate_model.py, shared with steps 1-3b) ----------
function validateWithModel(feed, baseDoc, name, schema, tmpDir) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const fp = path.join(tmpDir, name + '.json'); const bp = path.join(tmpDir, '_base.json');
  fs.writeFileSync(fp, JSON.stringify(feed, null, 1)); fs.writeFileSync(bp, JSON.stringify(baseDoc));
  const r = spawnSync('python3', [path.join(__dirname, 'validate_model.py'), schema, fp, bp], { encoding: 'utf8' });
  if (r.error) throw r.error;
  // fail closed: a validator that did not run (missing jsonschema, crash) must never let a feed through
  const ran = r.status === 0 ? /OK — /.test(r.stdout) : r.status === 1 && /erreur\(s\)/.test(r.stdout);
  if (!ran) throw new Error(`validate_model.py n'a pas tourné (code ${r.status}) : ${(r.stderr || r.stdout || '').trim().slice(0, 200)}`);
  const lines = (r.stdout || '').split('\n').filter((l) => l.startsWith(' - '));
  // errors located in the base itself never block a feed; errors on the feed (schema, rules, its refs) do
  return lines.map((l) => l.slice(3)).filter((l) => l.startsWith(name + '.json'));
}

function checkContract(feed, reg) {
  const errs = [];
  if (!feed.source || feed.source.systeme !== 'artefact') errs.push('source.systeme ≠ artefact');
  if (!feed.source || feed.source.ref !== reg.url) errs.push(`source.ref « ${feed.source && feed.source.ref} » ≠ URL inscrite`);
  Object.keys(feed).filter((k) => !['modele', 'source'].includes(k) && !ALLOWED.includes(k)).forEach((k) => errs.push(`collection « ${k} » non admise dans un feed`));
  ALLOWED.forEach((c) => (feed[c] || []).forEach((r) => { if (r && r.id && !underPrefix(r.id, reg.prefixe)) errs.push(`${c} ${r.id} hors du préfixe ${reg.prefixe}`); }));
  // health-bearing records (jalon, risque, attente) may only attach to the feed's own items: a feed must not colour
  // an item of another source (review 3c). Dependances and livrables may point outside: that is their purpose.
  ['jalons', 'risques', 'attentes'].forEach((c) => (feed[c] || []).forEach((r) => { if (r && r.item && !underPrefix(r.item, reg.prefixe)) errs.push(`${c} ${r.id} rattaché à ${r.item}, hors du préfixe ${reg.prefixe}`); }));
  if (reg.item && !(feed.items || []).some((i) => i.id === reg.item)) errs.push(`item attendu ${reg.item} absent du bloc`);
  const ids = {}; ALLOWED.forEach((c) => (feed[c] || []).forEach((r) => { const k = `${c}/${r.id}`; if (ids[k]) errs.push(`${k} en double`); ids[k] = 1; }));
  return errs;
}

// ---------- mapping ----------
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function mapFeed(feed, reg, base, readAt, signals, rows) {
  const src = { systeme: 'artefact', ref: `${reg.url} · bloc du ${feed.source.lu_le}`, lu_le: readAt, par: 'adaptateur-artefacts' };
  const found = (c, id) => (base[c] || []).find((r) => r.id === id);
  const out = {}; ALLOWED.forEach((c) => { out[c] = []; });
  // a base record under the prefix but owned by another source (e.g. re-saved as saisie) is never overwritten
  const conflict = {};
  ALLOWED.forEach((c) => (feed[c] || []).forEach((r) => {
    const p = found(c, r.id);
    if (p && p.source && p.source.systeme !== 'artefact') { conflict[`${c}/${r.id}`] = 1; signals.push({ kind: 'conflit', row: r.id, texte: `${c}/${r.id} : en base avec source « ${p.source.systeme} », le feed ne l'écrase pas` }); }
  }));
  const keep = (c) => (r) => !conflict[`${c}/${r.id}`];
  const prevOf = found;
  if (feed.source.lu_le && feed.source.lu_le.slice(0, 16) > readAt.slice(0, 16)) signals.push({ kind: 'date_bloc', row: reg.url, texte: `Bloc ${reg.prefixe} daté du ${feed.source.lu_le}, après la lecture (${readAt}) : horodatage du producteur à vérifier` });

  (feed.items || []).filter(keep('items')).forEach((it) => {
    const prev = prevOf('items', it.id); let rec;
    if (!prev) rec = Object.assign({}, it);
    else {
      rec = Object.assign({}, prev); ITEM_SOURCE.forEach((k) => delete rec[k]);
      Object.keys(it).filter((k) => !OWNED.includes(k) && k !== 'source').forEach((k) => { rec[k] = it[k]; });
      OWNED.filter((k) => k in it && !same(it[k], prev[k])).forEach((k) => {
        if (k === 'etape' && it.etape === 'termine') { rec.etape = 'termine'; signals.push({ kind: 'termine', row: it.id, texte: `${it.id} : terminé dans le feed → étape Terminé` }); return; }
        signals.push({ kind: 'champ_possede', row: it.id, texte: `${it.id}.${k} : le feed propose ${JSON.stringify(it[k])}, la base garde ${JSON.stringify(prev[k])} (champ possédé, modifiable dans Gérer)` });
      });
    }
    delete rec.sante; // computed by the portfolio (D8)
    rec.source = src; out.items.push(rec);
    rows.push({ kind: 'item', id: it.id, decision: prev ? 'mise à jour' : 'créé', lu: { updated_at: it.updated_at, etape: it.etape, liens: (it.liens || []).length }, base: { updated_at: rec.updated_at, etape: rec.etape, liens: (rec.liens || []).length, pct_avancement: rec.pct_avancement === undefined ? '(calculé des jalons)' : rec.pct_avancement }, avant: prev ? { updated_at: prev.updated_at, pct_avancement: prev.pct_avancement, sante: prev.sante ? prev.sante.couleur : undefined } : null });
  });

  ['jalons', 'livrables'].forEach((c) => (feed[c] || []).filter(keep(c)).forEach((j) => {
    const prev = prevOf(c, j.id); const rec = Object.assign({}, j, { source: src });
    const first = prev && prev.date_initiale ? prev.date_initiale : j.date_initiale ? j.date_initiale : prev && prev.date && prev.date !== j.date ? prev.date : undefined;
    if (first) rec.date_initiale = first; else delete rec.date_initiale;
    if (prev && prev.date_initiale && j.date_initiale && j.date_initiale !== prev.date_initiale) signals.push({ kind: 'date_initiale', row: j.id, texte: `${j.id} : date initiale ${j.date_initiale} dans le feed, ${prev.date_initiale} gardée (1re date connue)` });
    if (prev && prev.date && j.date && j.date > prev.date) signals.push({ kind: 'recul', row: j.id, texte: `${j.id} : ${prev.date} → ${j.date} (initiale ${rec.date_initiale})` });
    out[c].push(rec);
    rows.push({ kind: c.slice(0, -1), id: j.id, decision: prev ? 'mise à jour' : 'créé', lu: { date: j.date, date_initiale: j.date_initiale || '(absente)', statut: j.statut }, base: { date: rec.date, date_initiale: rec.date_initiale || '(absente)', statut: rec.statut }, avant: prev ? { date: prev.date, date_initiale: prev.date_initiale || '(absente)', statut: prev.statut } : null });
  }));
  (feed.risques || []).filter(keep('risques')).forEach((r) => {
    const prev = prevOf('risques', r.id);
    out.risques.push(Object.assign({}, r, { score: r.probabilite * r.impact, source: src }));
    rows.push({ kind: 'risque', id: r.id, decision: prev ? 'mise à jour' : 'créé', lu: { p: r.probabilite, i: r.impact }, base: { score: r.probabilite * r.impact } });
  });
  ['attentes', 'dependances'].forEach((c) => (feed[c] || []).filter(keep(c)).forEach((r) => {
    const prev = prevOf(c, r.id); out[c].push(Object.assign({}, r, { source: src }));
    rows.push({ kind: c.slice(0, -1), id: r.id, decision: prev ? 'mise à jour' : 'créé' });
  }));
  return out;
}

// records under a feed's prefix (any source) present in the base but not in this read: kept, reported
function absents(reg, base, seen, signals, why) {
  ALLOWED.forEach((c) => (base[c] || []).filter((r) => underPrefix(r.id, reg.prefixe) && !seen.has(`${c}/${r.id}`))
    .forEach((r) => signals.push({ kind: 'conserve', row: r.id, texte: `${c}/${r.id} en base, ${why} — conservé` })));
}

function adapt(registry, raw, base, versions, opts) {
  const readAt = raw.read_at; const signals = []; const rows = []; const feeds = [];
  const doc = { modele: '1', source: { systeme: 'artefact', ref: 'Feeds_Inscrits_v1', lu_le: readAt, par: 'adaptateur-artefacts' } };
  ALLOWED.forEach((c) => { doc[c] = []; });
  const regErr = checkRegistry(registry);
  if (regErr.length) { regErr.forEach((t) => signals.push({ kind: 'registre', texte: t })); return finish(); }
  const baseDoc = Object.assign({ modele: '1', source: { systeme: 'calcul', ref: 'base', lu_le: readAt } }, base);

  registry.forEach((reg) => {
    const f = { url: reg.url, prefixe: reg.prefixe, statut: reg.statut };  feeds.push(f);
    if (reg.statut !== 'actif') { f.resultat = 'non lu (inscription ' + reg.statut + ')'; absents(reg, base, new Set(), signals, `feed ${reg.prefixe} non actif`); return; }
    const ignore = (why, errs) => {
      f.resultat = 'ignoré : ' + why; f.erreurs = errs || [];
      signals.push({ kind: 'feed_ignore', row: reg.url, texte: `Feed ${reg.prefixe} ignoré — ${why}${errs && errs.length ? ' : ' + errs.slice(0, 5).join(' · ') + (errs.length > 5 ? ` … (+${errs.length - 5})` : '') : ''}` });
      absents(reg, base, new Set(), signals, 'feed ignoré');
    };
    const r = raw.artefacts[reg.url];
    if (!r || r.html == null) return ignore('artefact non lu');
    f.version = r.version;
    const blocks = extractBlocks(r.html);
    if (!blocks.length) return ignore('aucun bloc portfolio-feed');
    if (blocks.length > 1) return ignore(`${blocks.length} blocs portfolio-feed`);
    if (!blocks[0].json) return ignore('bloc sans type="application/json"');
    let feed; try { feed = JSON.parse(blocks[0].text); } catch (e) { return ignore('JSON illisible', [e.message]); }
    const contract = checkContract(feed, reg);
    const model = validateWithModel(feed, baseDoc, r.dir || reg.prefixe, opts.schema, opts.tmpDir);
    f.bloc = feed;
    if (contract.length || model.length) return ignore('bloc invalide', contract.concat(model));
    const out = mapFeed(feed, reg, base, readAt, signals, rows);
    ALLOWED.forEach((c) => doc[c].push(...out[c]));
    f.resultat = 'lu'; f.ecrits = ALLOWED.reduce((n, c) => n + out[c].length, 0);
    absents(reg, base, new Set(ALLOWED.flatMap((c) => (feed[c] || []).map((x) => `${c}/${x.id}`))), signals, 'absent de cette lecture');
  });
  return finish();

  function finish() {
    ALLOWED.forEach((c) => { if (!doc[c].length) delete doc[c]; });
    const writes = [];
    ALLOWED.forEach((c) => (doc[c] || []).forEach((rec) => {
      const w = { op: 'set', collection: c, doc_id: rec.id, data: rec }; const v = versions[`${c}/${rec.id}`];
      if (v) w.if_version = v; writes.push(w);
    }));
    return { doc, writes, report: { lu_le: readAt, feeds: feeds.map((x) => Object.assign({}, x, { bloc: undefined })), ecrits: writes.length, rows, signals }, feeds };
  }
}

function readBase(dir) {
  const base = {};
  if (!fs.existsSync(dir)) return base;
  fs.readdirSync(dir).filter((c) => fs.statSync(path.join(dir, c)).isDirectory()).forEach((c) => {
    base[c] = fs.readdirSync(path.join(dir, c)).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, c, f), 'utf8')));
  });
  return base;
}
function readRaw(dir) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'read.json'), 'utf8'));
  const artefacts = {};
  Object.entries(meta.artefacts).forEach(([url, a]) => {
    const p = path.join(dir, a.dir, 'index.html');
    artefacts[url] = Object.assign({}, a, { html: fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null });
  });
  return { read_at: meta.read_at, artefacts };
}

if (require.main === module) {
  const [, , regP, rawDir, baseDir, outDir, schemaP] = process.argv;
  if (!regP || !rawDir || !baseDir || !outDir || !schemaP) { console.error('usage: adapt_artefacts.js <Feeds_Inscrits.md> <raw_dir> <base_before_dir> <out_dir> <schema.json>'); process.exit(2); }
  const registry = parseRegistry(fs.readFileSync(regP, 'utf8'));
  const vp = path.join(baseDir, 'versions.json');
  const versions = fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, 'utf8')) : {};
  const res = adapt(registry, readRaw(rawDir), readBase(baseDir), versions, { schema: schemaP, tmpDir: path.join(outDir, 'feeds') });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'doc.json'), JSON.stringify(res.doc, null, 2));
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify(res.writes, null, 1));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(res.report, null, 2));
  console.log(`feeds ${res.feeds.map((f) => `${f.prefixe}: ${f.resultat}`).join(' · ')} · écrits ${res.writes.length} · signaux ${res.report.signals.length}`);
}
module.exports = { adapt, parseRegistry, checkRegistry, extractBlocks, checkContract, readBase, readRaw };
