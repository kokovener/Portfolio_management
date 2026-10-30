#!/usr/bin/env node
/* Producer-side tool (Kickoff D12, D22): adds the project Gantt to the portfolio-feed block of the « Expert G1 — Gantt S1 »
 * artifact, so the portfolio rebuilds it from data. Run it whenever ROWS changes, right after the feed block is regenerated.
 *
 * Usage: node feeds/expertg1_gantt.js <index.html in> <index.html out> <lu_le>
 *   index.html in   the artifact page (Artifact read, path index.html)
 *   lu_le           Québec timestamp with offset (TZ=America/Toronto date +%Y-%m-%dT%H:%M%:z), never Z
 * Reads the page's own data constants (START, END, TODAY, ROWS) in a sandbox — the data part only, never the DOM code —
 * and writes the gantt record (model v15) into the feed block: id feed.expertg1.gantt, format json, empreinte = sha256 of
 * its onglets. Milestone rows (end null) become one-day rows marked « jalon » for display; the portfolio's milestones stay
 * those of the block's « jalons » collection (no duplicate). Status « done » -> fait. Owner and other statuses are not in
 * the model (display only in the source page).
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

const PREFIX = 'feed.expertg1';
const URL = 'https://claude.ai/artifact/E3KrS3o15gWHwuqrvpnETg';

function readRows(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const s = scripts.find((x) => /const ROWS\s*=/.test(x)); if (!s) throw new Error('ROWS introuvable dans la page');
  const data = s.slice(0, s.indexOf('const d = ')); // data constants only; the rendering code that follows needs a DOM
  const box = {}; vm.runInNewContext(data + '\n;this.START=START;this.END=END;this.TODAY=TODAY;this.ROWS=ROWS;', box, { timeout: 1000 });
  return box;
}
function strip(html) { return String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

function buildGantt(html, luLe) {
  const { TODAY, ROWS } = readRows(html);
  const groupes = []; let cur = null;
  ROWS.forEach((r) => {
    if (r.length === 1) { cur = { nom: r[0], taches: [] }; groupes.push(cur); return; }
    const [label, , s, e, st] = r; if (!cur) { cur = { nom: 'Sans groupe', taches: [] }; groupes.push(cur); }
    const t = { nom: label, debut: s, fin: e || s };
    if (e === null) t.jalon = true;
    if (st === 'done') t.fait = true;
    cur.taches.push(t);
  });
  const all = groupes.flatMap((g) => g.taches);
  const h1 = strip((html.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1]); const sub = strip((html.match(/<p class="sub">([\s\S]*?)<\/p>/) || [])[1]);
  const onglet = { nom: 'S1 (phase locale)', debut: all.map((t) => t.debut).sort()[0], fin: all.map((t) => t.fin).sort().pop(), groupes: groupes.filter((g) => g.taches.length) };
  if (h1) onglet.titre = h1; if (sub) onglet.sous_titre = sub;
  const onglets = [onglet];
  return { id: `${PREFIX}.gantt`, item: PREFIX, format: 'json', titre: h1 || 'Expert G1 — Gantt S1',
    empreinte: crypto.createHash('sha256').update(JSON.stringify(onglets)).digest('hex'), calcule_le: TODAY, onglets,
    source: { systeme: 'artefact', ref: URL, lu_le: luLe, par: 'feed Expert G1 — Gantt S1' } };
}

function patch(html, luLe) {
  const re = /(<script type="application\/json" id="portfolio-feed">)([\s\S]*?)(<\/script>)/;
  const m = html.match(re); if (!m) throw new Error('bloc portfolio-feed absent');
  JSON.parse(m[2]); // the block must be valid before it is touched
  // keep the block's own layout (one record per line): replace modele and the block date, (re)write one « gantts » line
  let body = m[2].replace(/\n,"gantts":\[.*\]\n/, '\n');
  body = body.replace(/"modele":"\d+"/, '"modele":"15"').replace(/("source":\{[^}]*?"lu_le":")[^"]+(")/, `$1${luLe}$2`);
  const gantt = buildGantt(html, luLe);
  body = body.replace(/\s*\}\s*$/, `\n,"gantts":[${JSON.stringify(gantt)}]\n}\n`);
  const feed = JSON.parse(body); if (!feed.gantts || feed.modele !== '15' || feed.source.lu_le !== luLe) throw new Error('bloc mal réécrit');
  return { html: html.replace(re, (_, a, __, c) => a + body + c), gantt };
}

if (require.main === module) {
  const [, , inP, outP, luLe] = process.argv;
  if (!outP || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(luLe || '')) { console.error('usage: expertg1_gantt.js <in.html> <out.html> <lu_le Québec, jamais Z>'); process.exit(2); }
  const r = patch(fs.readFileSync(inP, 'utf8'), luLe);
  fs.writeFileSync(outP, r.html);
  const n = r.gantt.onglets[0].groupes.reduce((k, g) => k + g.taches.length, 0);
  console.log(`${r.gantt.id} : ${r.gantt.onglets[0].groupes.length} groupes, ${n} lignes, ${r.gantt.onglets[0].debut} → ${r.gantt.onglets[0].fin} → ${outP}`);
}
module.exports = { buildGantt, patch, readRows };
