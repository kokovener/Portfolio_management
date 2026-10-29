#!/usr/bin/env node
/* Holidays adapter (R41, model v11): statutory holidays + office closures -> collective absences (personne null).
 *
 * Usage: node tools/adapt_feries.js <feries.json> <calendar_raw.json|-> <base_before_dir> <out_dir> <schema.json> <today>
 *   feries.json        config/feries.json (Quebec statutory holidays, versioned in git)
 *   calendar_raw.json  transcription of outlook_calendar_search on Franck's own calendar (queries "Fermeture" and
 *                      "Férié", today -> today + 190 d): { read_at, events: [{ subject, start, end, all_day }] } ; "-" = not read
 *   base_before_dir    ArtifactData export: <dir>/absences/*.json + versions.json
 * Rules:
 *   - one record per weekday, id `ferie.<date>` (config) or `fermeture.<date>` (calendar); a calendar day that is
 *     already a statutory holiday is not written twice;
 *   - calendar events count only when the subject starts with "Fermeture" or "Férié" (case and accent insensitive);
 *   - window = today -> today + 190 days; past records stay in base (history), never deleted;
 *   - a calendar closure in base no longer seen in the calendar is kept and reported (never deleted);
 *   - Outlook is never written; nothing is deleted.
 */
'use strict';
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const Core = require('../interface/core.js');

const WINDOW_D = 190;
const pad = (n) => String(n).padStart(2, '0');
const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const wd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };
const isWeekday = (s) => ![0, 6].includes(wd(s));
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const isClosure = (subject) => /^(fermetures?|feries?)\b/.test(norm(subject)); // plural accepted (review 29 oct.)
// Quebec: Fête nationale and Fête du Canada falling on a Sunday move to the Monday (Loi sur la fête nationale, LNT art. 60)
const SUNDAY_MOVES = /fete nationale|fete du canada/;

function adapt(feries, cal, base, versions, today) {
  const end = addDays(today, WINDOW_D); const signals = []; const recs = [];
  const nowTs = (cal && cal.read_at) || `${today}T00:00${Core.nowTs(new Date(today + 'T12:00Z')).slice(16)}`;
  feries.jours.forEach((j) => {
    if (j.date < today || j.date > end) return;
    let date = j.date;
    if (wd(date) === 0 && SUNDAY_MOVES.test(norm(j.libelle))) { date = addDays(date, 1); signals.push({ kind: 'report', row: j.date, texte: `${j.date} ${j.libelle} : dimanche, reporté au lundi ${date}` }); }
    if (!isWeekday(date)) { signals.push({ kind: 'weekend', row: j.date, texte: `${j.date} ${j.libelle} : fin de semaine, non compté` }); return; }
    recs.push({ id: `ferie.${date}`, personne: null, debut: date, fin: date, jours_ouvres: 1, libelle: j.libelle,
      source: { systeme: 'calcul', ref: `config/feries.json · ${j.libelle}`, lu_le: nowTs, par: 'adaptateur-feries' } });
  });
  if (cal) {
    (cal.events || []).forEach((e) => {
      if (!isClosure(e.subject)) return;
      const d0 = String(e.start).slice(0, 10);
      // all-day events end at 00:00 the next day (exclusive end)
      let d1 = String(e.end || e.start).slice(0, 10); if (e.all_day && d1 > d0) d1 = addDays(d1, -1);
      for (let d = d0; d <= d1; d = addDays(d, 1)) {
        if (d < today || d > end || !isWeekday(d)) continue;
        if (recs.some((r) => r.debut === d)) { signals.push({ kind: 'deja_ferie', row: d, texte: `${d} « ${e.subject} » : déjà férié, non dupliqué` }); continue; }
        recs.push({ id: `fermeture.${d}`, personne: null, debut: d, fin: d, jours_ouvres: 1, libelle: String(e.subject).trim(),
          source: { systeme: 'outlook', ref: `calendrier de Franck · « ${String(e.subject).trim()} »`, lu_le: nowTs, par: 'adaptateur-feries' } });
      }
    });
    base.absences.filter((a) => /^fermeture\./.test(a.id) && a.debut >= today && a.debut <= end && !recs.some((r) => r.id === a.id))
      .forEach((a) => signals.push({ kind: 'fermeture_non_relue', row: a.id, texte: `${a.id} « ${a.libelle} » en base, plus vue dans le calendrier — conservée ; suppression sur accord` }));
  }
  // Coverage: the config must reach the end of the window, otherwise a holiday would be missed silently
  const last = feries.jours.map((j) => j.date).sort().pop();
  const xmasIn = [today.slice(0, 4), end.slice(0, 4)].map((y) => y + '-12-25').filter((x) => x >= today && x <= end);
  if (!last || xmasIn.some((x) => last < x)) signals.push({ kind: 'config_courte', texte: `config/feries.json s'arrête au ${last} : la fenêtre va jusqu'au ${end} — ajouter les fériés de ${end.slice(0, 4)}` });
  // Year-end reminder: Christmas in the window and no office closure read around it
  const xmas = [today.slice(0, 4), String(+today.slice(0, 4) + 1)].map((y) => y + '-12-25').find((x) => x >= today && x <= end);
  if (xmas && cal && !recs.some((r) => r.id.startsWith('fermeture.') && r.debut >= addDays(xmas, -7) && r.debut <= addDays(xmas, 10))) signals.push({ kind: 'fetes_sans_fermeture', texte: `Aucune fermeture des Fêtes lue autour du ${xmas} : si le bureau ferme, ajouter un événement « Fermeture … » au calendrier de Franck` });
  const prev = Object.fromEntries(base.absences.map((a) => [a.id, a]));
  const strip = (r) => r && JSON.stringify(Object.assign({}, r, { source: Object.assign({}, r.source, { lu_le: null }) }), Object.keys(r).concat(Object.keys(r.source || {})).sort());
  const writes = [];
  recs.forEach((r) => { if (strip(prev[r.id]) === strip(r)) return; const w = { op: 'set', collection: 'absences', doc_id: r.id, data: r }; const v = versions[`absences/${r.id}`]; if (v) w.if_version = v; writes.push(w); });
  const doc = { modele: '1', source: { systeme: 'calcul', ref: `config/feries.json${cal ? ' + calendrier de Franck' : ''} · ${today} → ${end}`, lu_le: nowTs, par: 'adaptateur-feries' }, absences: recs };
  return { doc, writes, report: { lu_le: nowTs, feries: recs.filter((r) => r.id.startsWith('ferie.')).length, fermetures: recs.filter((r) => r.id.startsWith('fermeture.')).length, ecrits: writes.length, signals } };
}

if (require.main === module) {
  const [ferP, calP, baseDir, outDir, schemaP, today] = process.argv.slice(2);
  if (!today) { console.error('usage: adapt_feries.js <feries.json> <calendar_raw.json|-> <base_before_dir> <out_dir> <schema.json> <today>'); process.exit(2); }
  const feries = JSON.parse(fs.readFileSync(ferP, 'utf8')); const cal = calP === '-' ? null : JSON.parse(fs.readFileSync(calP, 'utf8'));
  const dir = path.join(baseDir, 'absences');
  const absences = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : [];
  const vp = path.join(baseDir, 'versions.json'); const versions = fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, 'utf8')) : {};
  const { doc, writes, report } = adapt(feries, cal, { absences }, versions, today);
  fs.mkdirSync(outDir, { recursive: true }); const docP = path.join(outDir, 'doc.json');
  fs.writeFileSync(docP, JSON.stringify(doc, null, 2));
  try { report.validation = execFileSync('python3', [path.join(__dirname, 'validate_model.py'), schemaP, docP], { encoding: 'utf8' }).trim(); } catch (e) { console.error('refused: validator failed\n' + (e.stdout || '') + (e.stderr || e.message)); process.exit(3); }
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify(writes, null, 1));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`fériés ${report.feries} · fermetures ${report.fermetures} · écrits ${report.ecrits} · signaux ${report.signals.length} · ${report.validation}`);
}
module.exports = { adapt, isClosure };
