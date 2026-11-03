#!/usr/bin/env node
/* "Unchanged" guards before a full source read (Optimisation_Requetes_v1 S3, R4, R7; model v18 lecture status inchange).
 * The agent makes the cheap probe calls; this script finds the previous raw, compares, and — when nothing changed —
 * copies the previous raw into the run folder with read_at = RD/<adapter>/debut.txt (R6), so the lecture is `inchange`.
 *
 * Usage (RD = run folder of this pass, Linux path):
 *   node tools/garde.js fenetre <RD>
 *       → JSON {jira_data_depuis, jira_depuis}: date (AAAA-MM-JJ) of the newest ok read of jira_data / jira_data_reel
 *         (resp. jira) in RD/base_avant/lectures, minus 1 day; null when there is no ok read (then: -8d / D−30 as before).
 *   node tools/garde.js dernier <smartsheet|jira_data|mep|gantt> <RD>
 *       → path of the newest previous raw (by its read_at) under dist/lundi/ and dist/passages/ (mep, gantt: all of dist/),
 *         RD itself and folders starting with "_" excluded (prints "-" and exits 3 when none); only from a run whose statut.json says that adapter was ok or
 *         inchange (a failed or partial read is never a reference: it would hide the failure); dist/runs/ folders have no
 *         statut.json and are taken as read. Exit 3 when none.
 *   node tools/garde.js smartsheet <RD>
 *       reads RD/smartsheet/garde.json {"sheet_version","gates_sheet_version","commentaires":[[rowId, commentId, …]…]}
 *       (get_sheet_version ×2 + list_discussions). Same two versions AND same (rowId, commentId) set as the previous
 *       raw → writes RD/smartsheet/raw.json (previous raw, read_at = debut.txt), exit 0; otherwise exit 1 with the cause.
 *   node tools/garde.js jira_data <RD> <count>
 *       count = searchJiraIssuesUsingJql count of « project = GOU21 AND updated >= "<jira_data_depuis>" ». 0 AND the
 *       sprints map {id: jira.gou21-s<N>} (last closed, active, next) of RD/jira/raw.json equal to the previous jira_data
 *       raw → writes RD/jira_data/raw.json (previous raw, read_at = debut.txt), exit 0; otherwise exit 1 with the cause.
 *   node tools/garde.js gantt <RD>
 *       reads RD/gantt/meta.json {"<item>":{"modifie_le":"<TimeLastModified as read>","etag":"…"}} for every active line.
 *       Every line unchanged (same ETag when both known, else same instant to the minute) → copies the previous
 *       read.json (read_at = debut.txt) and its files into RD/gantt/raw/, exit 0; otherwise exit 1 (full read).
 * Prints one JSON line. Never calls a source, never writes the base, never deletes.
 */
'use strict';
const fs = require('fs');
const path = require('path');

// GARDE_DIST: test hook only (a fixture tree instead of the real dist/)
const dist = () => process.env.GARDE_DIST || path.join(__dirname, '..', 'dist');
const RAW_OF = {
  smartsheet: { roots: ['lundi', 'passages'], rel: [['smartsheet', 'raw.json']] },
  jira_data: { roots: ['lundi', 'passages'], rel: [['jira_data', 'raw.json'], ['jira_data_reel', 'raw.json']] },
  mep: { roots: ['lundi', 'passages', 'runs'], rel: [['jira', 'mep_sources.json'], ['mep_sources', 'raw.json']] },
  gantt: { roots: ['lundi', 'passages', 'runs'], rel: [['gantt', 'raw', 'read.json']] },
};
// adapter whose outcome in statut.json validates the raw (first path segment, mep = the jira adapter)
const STATUT_OF = { smartsheet: 'smartsheet', jira_data: 'jira_data', jira_data_reel: 'jira_data_reel', jira: 'jira', mep_sources: 'jira', gantt: 'gantt' };
function readOk(runDir, rel) {
  const sp = path.join(runDir, 'statut.json');
  if (!fs.existsSync(sp)) return path.basename(path.dirname(runDir)) !== 'lundi' && path.basename(path.dirname(runDir)) !== 'passages';
  let st; try { st = js(sp); } catch (e) { return false; }
  const a = (st.adaptateurs || []).find((x) => x.nom === STATUT_OF[rel[0]]);
  return !!a && (a.statut === 'ok' || a.statut === 'inchange');
}
const js = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const out = (o, code) => { console.log(JSON.stringify(o)); process.exit(code); };
const addDays = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

// run folders: dist/<root>/<run>/ and, for runs/, one level deeper (dist/runs/<date>/<name>/)
function runDirs(root) {
  const base = path.join(dist(), root); if (!fs.existsSync(base)) return [];
  const dirs = [];
  fs.readdirSync(base).filter((d) => !d.startsWith('_')).forEach((d) => {
    const p = path.join(base, d); if (!fs.statSync(p).isDirectory()) return; dirs.push(p);
    if (root === 'runs') fs.readdirSync(p).filter((e) => !e.startsWith('_')).forEach((e) => { const q = path.join(p, e); if (fs.statSync(q).isDirectory()) dirs.push(q); });
  });
  return dirs;
}
function dernier(kind, rd) {
  const k = RAW_OF[kind]; if (!k) throw new Error(`type « ${kind} » inconnu (${Object.keys(RAW_OF).join(', ')})`);
  const self = rd ? path.resolve(rd) : null; let best = null;
  k.roots.forEach((r) => runDirs(r).forEach((d) => {
    if (self && (path.resolve(d) === self || path.resolve(d).startsWith(self + path.sep))) return;
    k.rel.forEach((rel) => {
      const p = path.join(d, ...rel); if (!fs.existsSync(p) || !readOk(d, rel)) return;
      let t; try { t = Date.parse(js(p).read_at); } catch (e) { return; }
      if (!Number.isNaN(t) && (!best || t > best.t)) best = { p, t };
    });
  }));
  return best ? best.p : null;
}
function debut(rd, ad) {
  const p = path.join(rd, ad, 'debut.txt');
  if (!fs.existsSync(p)) throw new Error(`${p} absent : lance la commande date dans le bloc du premier appel (R6)`);
  const s = fs.readFileSync(p, 'utf8').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$/.test(s)) throw new Error(`${p} : horodatage avec décalage attendu, lu « ${s} »`);
  return s;
}
function newestOk(rd, ids) {
  const dir = path.join(rd, 'base_avant', 'lectures'); let best = null;
  ids.forEach((id) => { const p = path.join(dir, `${id}.json`); if (!fs.existsSync(p)) return; const l = js(p); if (l.statut === 'ok' && (!best || Date.parse(l.lu_le) > Date.parse(best))) best = l.lu_le; });
  return best;
}
function fenetre(rd) {
  const jd = newestOk(rd, ['lecture.jira-data', 'lecture.jira-data-reel']); const j = newestOk(rd, ['lecture.jira']);
  return { jira_data_derniere: jd, jira_data_depuis: jd ? addDays(jd.slice(0, 10), -1) : null, jira_derniere: j, jira_depuis: j ? addDays(j.slice(0, 10), -1) : null };
}
function reuse(prevP, destP, readAt, extra) {
  const r = Object.assign(js(prevP), { read_at: readAt }, extra || {});
  fs.mkdirSync(path.dirname(destP), { recursive: true }); fs.writeFileSync(destP, JSON.stringify(r, null, 1));
}
// comments compared by (rowId, commentId, text): an edited comment (e.g. "bloquant" added) breaks the guard
const pairSet = (list) => JSON.stringify((list || []).map((c) => JSON.stringify([String(c[0]), String(c[1]), String(c[2] == null ? '' : c[2]).trim()])).sort());

function gardeSmartsheet(rd) {
  const g = js(path.join(rd, 'smartsheet', 'garde.json')); const at = debut(rd, 'smartsheet');
  const prevP = dernier('smartsheet', rd); if (!prevP) return { inchange: false, cause: 'aucun brut Smartsheet précédent' };
  const prev = js(prevP);
  if (prev.sheet_version === undefined || prev.gates_sheet_version === undefined) return { inchange: false, precedent: prevP, cause: 'brut précédent sans versions (1re lecture gardée)' };
  if (String(prev.sheet_version) !== String(g.sheet_version)) return { inchange: false, precedent: prevP, cause: `version Master ${prev.sheet_version} → ${g.sheet_version}` };
  if (String(prev.gates_sheet_version) !== String(g.gates_sheet_version)) return { inchange: false, precedent: prevP, cause: `version Jalons_Entites ${prev.gates_sheet_version} → ${g.gates_sheet_version}` };
  if (pairSet(prev.commentaires) !== pairSet(g.commentaires)) return { inchange: false, precedent: prevP, cause: 'commentaires changés' };
  reuse(prevP, path.join(rd, 'smartsheet', 'raw.json'), at);
  return { inchange: true, precedent: prevP, read_at: at };
}
function sprintMap(jiraRaw) {
  const sid = (s) => 'jira.gou21-' + (s.name.match(/S(\d+)/i) ? 's' + s.name.match(/S(\d+)/i)[1] : String(s.id)); // same rule as adapt_jira.js
  const active = (jiraRaw.sprints || []).find((s) => s.state === 'active'); const next = (jiraRaw.sprints || []).find((s) => s.state === 'future');
  const m = {}; [jiraRaw.last_closed_sprint, active, next].filter(Boolean).forEach((s) => { m[String(s.id)] = sid(s); });
  return m;
}
function gardeJiraData(rd, count) {
  if (!/^\d+$/.test(String(count))) throw new Error('count : entier attendu');
  const at = debut(rd, 'jira_data');
  const jr = path.join(rd, 'jira', 'raw.json'); if (!fs.existsSync(jr)) return { inchange: false, cause: 'pas de brut Jira dans ce passage (dépend de Jira)' };
  const map = sprintMap(js(jr));
  if (Number(count) !== 0) return { inchange: false, cause: `${count} ticket(s) GOU21 mis à jour depuis la dernière lecture`, sprints: map };
  const prevP = dernier('jira_data', rd); if (!prevP) return { inchange: false, cause: 'aucun brut Jira data précédent' };
  const prev = js(prevP);
  const canon = (o) => JSON.stringify(Object.keys(o || {}).sort().map((k) => [k, o[k]]));
  if (canon(prev.sprints) !== canon(map)) return { inchange: false, precedent: prevP, cause: `sprints ${canon(prev.sprints)} → ${canon(map)}` };
  // a jira_data_reel raw carries step d (board_sprints, epic_sprint_issues): kept as read, the adapter keeps the real window
  reuse(prevP, path.join(rd, 'jira_data', 'raw.json'), at);
  return { inchange: true, precedent: prevP, read_at: at };
}
function sameGantt(a, b) {
  if (a.etag && b.etag) return a.etag === b.etag;
  const ta = Date.parse(a.modifie_le); const tb = Date.parse(b.modifie_le);
  return !Number.isNaN(ta) && !Number.isNaN(tb) && Math.floor(ta / 60000) === Math.floor(tb / 60000);
}
function gardeGantt(rd) {
  const meta = js(path.join(rd, 'gantt', 'meta.json')); const at = debut(rd, 'gantt');
  const prevP = dernier('gantt', rd); if (!prevP) return { inchange: false, cause: 'aucun read.json Gantt précédent' };
  const prev = js(prevP); const changed = [];
  Object.keys(meta).forEach((item) => { const p = (prev.gantts || {})[item]; if (!p || !sameGantt(meta[item], p)) changed.push(item); });
  if (!Object.keys(meta).length) return { inchange: false, cause: 'meta.json vide' };
  if (changed.length) return { inchange: false, precedent: prevP, cause: `modifié : ${changed.join(', ')}` };
  const dest = path.join(rd, 'gantt', 'raw'); fs.mkdirSync(dest, { recursive: true });
  const gantts = {};
  Object.keys(meta).forEach((item) => {
    const g = prev.gantts[item]; gantts[item] = g;
    const src = path.join(path.dirname(prevP), g.fichier); if (!fs.existsSync(src)) throw new Error(`${src} absent : relecture complète`);
    fs.copyFileSync(src, path.join(dest, g.fichier));
  });
  fs.writeFileSync(path.join(dest, 'read.json'), JSON.stringify({ read_at: at, gantts }, null, 2));
  return { inchange: true, precedent: prevP, read_at: at };
}

if (require.main === module) {
  const [cmd, ...a] = process.argv.slice(2);
  try {
    if (cmd === 'fenetre') out(fenetre(a[0]), 0);
    else if (cmd === 'dernier') { const p = dernier(a[0], a[1]); if (!p) { console.log('-'); process.exit(3); } console.log(p); } // '-' = none (mep_merge reads it as no previous file)
    else if (cmd === 'smartsheet') { const r = gardeSmartsheet(a[0]); out(r, r.inchange ? 0 : 1); }
    else if (cmd === 'jira_data') { const r = gardeJiraData(a[0], a[1]); out(r, r.inchange ? 0 : 1); }
    else if (cmd === 'gantt') { const r = gardeGantt(a[0]); out(r, r.inchange ? 0 : 1); }
    else { console.error(fs.readFileSync(__filename, 'utf8').split("'use strict'")[0]); process.exit(2); }
  } catch (e) { console.error(e.message); process.exit(2); }
}
module.exports = { dernier, fenetre, gardeSmartsheet, gardeJiraData, gardeGantt, sprintMap };
