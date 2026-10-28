#!/usr/bin/env node
/* Miro adapter (step 3e): last GOU21 retro board, "Actions" frame -> actions_retro.
 *
 * Usage: node tools/adapt_miro.js <miro_raw.json> <base_before_dir> <out_dir> <schema.json>
 *   miro_raw.json    {read_at, search:{boards:[{name, miro_url}]}, board:{name, miro_url}, svg_file}
 *                    svg_file = the canvas_read_as_svg result of the Actions frame, saved as is (relative path)
 *   base_before_dir  ArtifactData export: <dir>/actions_retro/*.json, <dir>/sprints/*.json + versions.json
 * Writes doc.json, batch.json, report.json; runs validate_model.py (fail closed).
 * Rules (fiche Adaptateur_Miro_v1): see §2. Never writes Miro; never deletes a db document.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MOIS = [['janv', 1], ['jan', 1], ['fevr', 2], ['fev', 2], ['feb', 2], ['mars', 3], ['mar', 3], ['avr', 4], ['apr', 4], ['mai', 5], ['may', 5], ['juin', 6], ['jun', 6],
  ['juil', 7], ['jul', 7], ['aout', 8], ['aug', 8], ['sept', 9], ['sep', 9], ['oct', 10], ['nov', 11], ['dec', 12]];
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function decode(s) {
  return String(s || '').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', ucirc: 'û', icirc: 'î', Eacute: 'É' }[n] || m));
}
function htmlToLines(h) {
  return decode(String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p>/gi, '\n').replace(/<\/(p|li|div)>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}
// "Label : value" or "Label value" (the team template is not consistent about the colon); label must end the word
function field(lines, label) {
  const re = new RegExp(`^${label}(?![\\p{L}])\\s*:?\\s*(.*)$`, 'iu'); const l = lines.find((x) => re.test(x));
  return l == null ? null : l.match(re)[1].trim();
}
// Status only from a "Statut" line, or a line that is just a status emoji; negations are not "fait"
function statutOf(lines) {
  const s = field(lines, 'Statut'); const emo = lines.find((l) => /^(✅|🔄|⏳)$/u.test(l));
  const v = fold(s || emo || '');
  if (!v) return { statut: null };
  if (/\b(pas|non)\b.*(fait|termin)/.test(v) || /a faire|todo/.test(v)) return { statut: 'a_faire' };
  if (/bloqu/.test(v)) return { statut: 'en_cours', bloque: true };
  if (/fait|termin|done|✅/.test(v)) return { statut: 'fait' };
  if (/cours|progress|🔄|⏳/.test(v)) return { statut: 'en_cours' };
  return { statut: null, illisible: s };
}
// Deadline -> {date} | {sprint} | {illisible}. Year: the occurrence closest to the retro date (handles Dec -> Jan).
function echeance(s, refDate) {
  const v = fold(s).replace(/\b1er\b/, '1').trim(); if (!v) return null;
  let m = v.match(/^s\s*(\d+)$/); if (m) return { sprint: `jira.gou21-s${m[1]}` };
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return { date: `${m[1]}-${m[2]}-${m[3]}` };
  let d; let mo;
  if ((m = v.match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/))) { d = +m[1]; mo = +m[2]; }
  else if ((m = v.match(/^(\d{1,2})\s*([a-z]+)\.?$/)) || (m = v.match(/^([a-z]+)\.?\s*(\d{1,2})$/))) {
    const [num, word] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    const hit = MOIS.find(([k]) => word.startsWith(k)); if (hit) { d = +num; mo = hit[1]; }
  }
  if (!mo || mo > 12 || d < 1 || d > 31) return { illisible: s };
  const y0 = +refDate.slice(0, 4); const ref = new Date(refDate + 'T12:00');
  const best = [y0 - 1, y0, y0 + 1].map((y) => new Date(y, mo - 1, d, 12)).sort((a, b) => Math.abs(a - ref) - Math.abs(b - ref))[0];
  return { date: `${best.getFullYear()}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}
// Retro board name: "Rétro G2.1 S18", "Rétro G2.1 - S19", "Rétro G21 S19", "Rétro Goutte 2.1 S19"; copies excluded
function boardSprint(name) {
  const v = fold(name); if (!/\bretro\b/.test(v) || !/(g\s*2\.?1|goutte\s*2\.?1)/.test(v)) return null;
  if (/\b(copie|copy)\b/.test(v)) return { copie: true };
  const m = v.match(/\bs\s*(\d{1,3})\b/); return m ? { n: +m[1] } : null;
}
// Items of the canvas_read_as_svg document
function parseSvg(svg) {
  // Opening tags only (containers such as <g> must not swallow their children); inner text read for leaf text tags
  const items = []; const re = /<(\w+)\b([^>]*?)(\/?)>/g; let m;
  const attr = (a, k) => { const x = a.match(new RegExp(`\\s${k}="([^"]*)"`)); return x ? x[1] : null; };
  const frame = (svg.match(/data-frame="([^"]*)"/) || [])[1] || null;
  while ((m = re.exec(svg))) {
    const id = attr(m[2], 'data-miro-id'); if (!id || /data-frame=/.test(m[2])) continue;
    const kind = [m[1], attr(m[2], 'data-type'), attr(m[2], 'data-widget-type')].filter(Boolean).join('/');
    let inner = null;
    if (!m[3] && m[1] !== 'g') { const end = svg.indexOf(`</${m[1]}>`, re.lastIndex); if (end > -1) inner = svg.slice(re.lastIndex, end); }
    const content = attr(m[2], 'data-content') != null ? decode(attr(m[2], 'data-content')) : inner != null ? decode(inner) : null;
    items.push({ id, kind, y: +attr(m[2], 'y') || 0, content });
  }
  return { frame, items: items.sort((a, b) => a.y - b.y) };
}

function adapt(raw, svg, base, versions) {
  const signals = []; const rows = []; const now = raw.read_at; const today = now.slice(0, 10);
  const named = (raw.search.boards || []).map((b) => ({ b, s: boardSprint(b.name) }));
  named.filter((x) => !x.s && /r[ée]tro/i.test(fold(x.b.name))).forEach((x) => signals.push({ kind: 'board_non_reconnu', texte: `Board « ${x.b.name} » : nom non reconnu comme rétro G2.1, ignoré` }));
  named.filter((x) => x.s && x.s.copie).forEach((x) => signals.push({ kind: 'board_copie', texte: `Board « ${x.b.name} » : copie, ignorée` }));
  const boards = named.filter((x) => x.s && !x.s.copie).sort((x, y) => y.s.n - x.s.n);
  if (!boards.length) throw new Error('refused: no retro G2.1 board in the search result');
  if (boards[1] && boards[1].s.n === boards[0].s.n) throw new Error(`refused: two boards for S${boards[0].s.n} — rename one`);
  if (boards[0].b.miro_url !== raw.board.miro_url) throw new Error(`refused: frame read on ${raw.board.name}, latest board is ${boards[0].b.name}`);
  const n = boards[0].s.n; const boardId = (raw.board.miro_url.match(/board\/([^/?]+)/) || [])[1];
  const { frame, items } = parseSvg(svg);
  if (!frame || !/actions/i.test(frame) || /actions de la r[ée]tro/i.test(fold(frame))) throw new Error(`refused: frame "${frame}" is not the Actions frame`);
  const sprintId = `jira.gou21-s${n + 1}`; const sp = base.sprints.find((s) => s.id === sprintId);
  // Fail closed: an action tied to a sprint the base does not know would float in every sprint view.
  if (!sp) throw new Error(`refused: ${sprintId} not in base — run the Jira adapter first`);
  const refDate = sp.debut || today;
  const prev = Object.fromEntries(base.actions_retro.map((a) => [a.id, a]));
  const out = [];
  items.forEach((it) => {
    const lines = htmlToLines(it.content);
    let texte; let owner = null; let ech = null; let label;
    if (/^rect$|shape/i.test(it.kind) && /^Action\s*\d+/i.test(lines[0] || '')) {
      label = lines[0]; texte = field(lines, 'Quoi');
      if (!texte) { rows.push({ kind: 'action', id: it.id, decision: `ignorée (${label} : gabarit vide)` }); return; }
      owner = field(lines, 'Responsables?'); ech = field(lines, '[ÉE]ch[ée]ance');
    } else if (/sticky(?!er)|sticky_note|stickynote/i.test(it.kind) && lines.length) {
      label = 'post-it'; texte = lines.filter((l) => !/^statut\b/i.test(l)).join(' ');
      const m = texte.match(/@([\p{L}-]+)/u); if (m) owner = m[1];
    } else return;
    const id = `miro.retro-s${n}.${it.id}`; const p = prev[id];
    const st = statutOf(lines);
    if (st.illisible) signals.push({ kind: 'statut_illisible', row: id, texte: `${label} : statut « ${st.illisible} » non reconnu` });
    if (st.bloque) signals.push({ kind: 'action_bloquee', row: id, texte: `${label} « ${texte} » : bloquée` });
    const statut = st.statut || (p && p.statut) || 'a_faire';
    const rec = { id, board: raw.board.miro_url, sprint: sprintId, texte, statut,
      source: { systeme: 'miro', ref: `${raw.board.name} · cadre « ${frame} » · ${label}${ech ? ' · échéance ' + ech : ''}${st.statut ? ' · statut lu sur la carte' : ''}`, lu_le: now, par: 'adaptateur-miro' } };
    if (owner) rec.owner = owner; else signals.push({ kind: 'sans_owner', row: id, texte: `${label} « ${texte} » : aucun responsable sur la carte` });
    const e = echeance(ech, refDate);
    if (!e) signals.push({ kind: 'sans_echeance', row: id, texte: `${label} « ${texte} » : aucune échéance` });
    else if (e.illisible) signals.push({ kind: 'echeance_illisible', row: id, texte: `${label} « ${texte} » : échéance « ${ech} » non comprise` });
    else {
      const due = e.date || ((base.sprints.find((s) => s.id === e.sprint) || {}).fin);
      if (e.sprint && !due) signals.push({ kind: 'echeance_illisible', row: id, texte: `${label} : échéance ${ech}, sprint absent de la base` });
      else if (due < today && statut !== 'fait') signals.push({ kind: 'echeance_passee', row: id, texte: `${label} « ${texte} » : échéance ${ech} (${due}) passée, statut ${statut}` });
    }
    if (p && p.texte !== texte) signals.push({ kind: 'texte_change', row: id, texte: `${id} : texte modifié sur le board` });
    if (p && (p.owner || null) !== (rec.owner || null)) signals.push({ kind: 'owner_change', row: id, texte: `${id} : responsable « ${p.owner || '—'} » → « ${rec.owner || '—'} »` });
    out.push(rec);
    rows.push({ kind: 'action', id, decision: p ? 'mise à jour' : 'créée', lu: { carte: label, quoi: texte, responsable: owner || '(vide)', echeance: ech || '(vide)', statut: st.statut || '(aucun marqueur)' }, base: { texte, owner: rec.owner, statut, sprint: sprintId }, avant: p ? { texte: p.texte, owner: p.owner, statut: p.statut } : null });
  });
  if (!out.length) signals.push({ kind: 'aucune_action', texte: `Cadre « ${frame} » de ${raw.board.name} : aucune action remplie` });
  base.actions_retro.filter((a) => !out.some((o) => o.id === a.id)).forEach((a) => signals.push({ kind: 'action_non_relue', row: a.id, texte: `${a.id} « ${a.texte} » en base, absente de cette lecture — conservée` }));
  const doc = { modele: '1', source: { systeme: 'miro', ref: `${raw.board.name} (${boardId}) · cadre « ${frame} »`, lu_le: now, par: 'adaptateur-miro' }, actions_retro: out };
  const strip = (r) => r && JSON.stringify(Object.assign({}, r, { source: Object.assign({}, r.source, { lu_le: null }) }), Object.keys(r).concat(Object.keys(r.source || {})).sort());
  const writes = [];
  out.forEach((r) => {
    if (strip(prev[r.id]) === strip(r)) { rows.find((x) => x.id === r.id).decision = 'inchangée (non réécrite)'; return; }
    const w = { op: 'set', collection: 'actions_retro', doc_id: r.id, data: r }; const v = versions[`actions_retro/${r.id}`]; if (v) w.if_version = v; writes.push(w);
  });
  return { doc, writes, report: { lu_le: now, board: raw.board.name, elements_cadre: items.length, actions: out.length, ecrits: writes.length, rows, signals } };
}

const readDir = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'versions.json').map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : []);
if (require.main === module) {
  const [, , rawP, baseDir, outDir, schemaP] = process.argv;
  if (!schemaP) { console.error('usage: adapt_miro.js <miro_raw.json> <base_before_dir> <out_dir> <schema.json>'); process.exit(2); }
  const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
  const svg = fs.readFileSync(path.join(path.dirname(rawP), raw.svg_file), 'utf8');
  const base = { actions_retro: readDir(path.join(baseDir, 'actions_retro')), sprints: readDir(path.join(baseDir, 'sprints')) };
  const vp = path.join(baseDir, 'versions.json'); const versions = fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, 'utf8')) : {};
  const { doc, writes, report } = adapt(raw, svg, base, versions);
  fs.mkdirSync(outDir, { recursive: true });
  const docP = path.join(outDir, 'doc.json'); fs.writeFileSync(docP, JSON.stringify(doc, null, 2));
  try { report.validation = execFileSync('python3', [path.join(__dirname, 'validate_model.py'), schemaP, docP], { encoding: 'utf8' }).trim(); } catch (e) { console.error('refused: validator failed or did not run\n' + (e.stdout || '') + (e.stderr || e.message)); process.exit(3); }
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify(writes, null, 1));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${report.board} · ${report.elements_cadre} éléments · actions ${report.actions} · écrits ${report.ecrits} · signaux ${report.signals.length} · ${report.validation.split('\n').pop()}`);
}
module.exports = { adapt, htmlToLines, field, echeance, statutOf, boardSprint, parseSvg };
