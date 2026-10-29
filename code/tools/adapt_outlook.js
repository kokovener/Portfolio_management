#!/usr/bin/env node
/* Outlook adapter (step 3d): Team_G2.1 -> personnes, Microsoft 365 free/busy -> absences.
 *
 * Usage: node tools/adapt_outlook.js <team_raw.json> <outlook_raw.json> <base_before_dir> <out_dir> <schema.json>
 *        node tools/adapt_outlook.js --equipe <team_raw.json> <base_before_dir> <out_dir> <schema.json>
 *          (R36 cadence: team only — personnes written, absences neither read nor touched)
 *   team_raw.json     tools/read_team.py output (Team_G2.1_vN.xlsx rows + directory resolution)
 *   outlook_raw.json  find_meeting_availability transcription, one call per working day (see fiche)
 *   base_before_dir   ArtifactData export: <dir>/personnes/*.json, <dir>/absences/*.json + versions.json
 * Writes doc.json, batch.json, report.json. Runs validate_model.py on doc.json (fail closed).
 * Rules (fiche Adaptateur_Outlook_v1):
 *   - other people's calendars are not shared with Franck: only free/busy is readable; "oof" is the only status
 *     taken as an absence; never a subject, never a reason; label is always "absence".
 *   - a half-day (AM = slots ending <= 12:00, PM = slots starting >= 13:00) is absent when it has >= 2 slots
 *     and all of them are "oof" for that person; the lunch overlap is ignored (recurring oof at lunch exists).
 *   - consecutive absent halves are merged into one record; jours_ouvres = halves x 0.5.
 *   - a day covered by a collective absence (personne null, e.g. a statutory holiday entered in Gérer) is skipped.
 *   - an absence in base that this read no longer sees is kept and reported, never deleted.
 * Never writes Outlook nor the Team file; never deletes a db document.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MIN_SLOTS = 2;
const MIN_COVER_MIN = 120; // a half-day is concluded only if its observed slots cover >= 2 h
const AM_END = '12:00';    // morning = slots ending by noon
const PM_START = '13:30';  // afternoon = slots starting 13:30 or later (a recurring lunch "oof" runs to 13:30)
const mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
function coverage(slots) { // minutes covered by the union of slots
  const iv = slots.map((s) => [mins(s.start), mins(s.end)]).sort((x, y) => x[0] - y[0]); let tot = 0; let cur = null;
  iv.forEach(([a, b]) => { if (!cur || a > cur[1]) { if (cur) tot += cur[1] - cur[0]; cur = [a, b]; } else cur[1] = Math.max(cur[1], b); });
  return cur ? tot + cur[1] - cur[0] : 0;
}
// Team_G2.1 "Role" column -> model role + lane (D7). AF and UX out of capacity: decision Franck 2026-10-27.
const ROLES = [
  [/^QA$/i, 'qa', 'scrum'], [/^Dev\b/i, 'dev', 'scrum'], [/^Architecte/i, 'architecte', 'flux'],
  [/^Coordinat/i, 'coordo', 'flux'], [/project manager|scrum master/i, 'pm', 'flux'],
  [/analyste d.affaires/i, 'ba', 'flux'], [/analyste fonctionnel/i, 'af', 'hors'], [/^UX/i, 'ux', 'hors'],
  [/^Directeur/i, 'direction', 'hors'], [/^expert/i, 'expert', 'hors']
];

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function lev(a, b) { // edit distance, small strings only
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}
const isoWeekday =(s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };
const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const nextWorkday = (s) => { let x = addDays(s, 1); while ([0, 6].includes(isoWeekday(x))) x = addDays(x, 1); return x; };

function personnes(team, base, signals, departs) {
  const prev = Object.fromEntries(base.personnes.map((p) => [p.id, p]));
  const out = []; const byMail = {};
  team.personnes.forEach((r) => {
    // People Franck confirmed gone while Team_G2.1 (read only here) still lists them: not written, reported every read
    const gone = (departs || []).find((d) => slug(d.nom) === slug(r.nom || '') && slug(d.prenom) === slug(r.prenom || ''));
    if (gone) { signals.push({ kind: 'parti', row: r.ligne, texte: `Ligne ${r.ligne} ${r.prenom} ${r.nom} : parti (${gone.source}) — non écrit ; Team_G2.1 à corriger` }); return; }
    if (!r.prenom) { signals.push({ kind: 'personne_ignoree', row: r.ligne, texte: `Ligne ${r.ligne} « ${r.nom} » (${r.role}) : instance, pas une personne — non écrite` }); return; }
    const hit = ROLES.find(([re]) => re.test(r.role || ''));
    if (!hit) { signals.push({ kind: 'role_inconnu', row: r.ligne, texte: `Ligne ${r.ligne} ${r.prenom} ${r.nom} : rôle « ${r.role} » sans correspondance — non écrite` }); return; }
    // The directory spelling wins over the Team file (typos such as "Kowalzzyk", "Bourgoin"); the gap is reported.
    const dn = r.annuaire && r.annuaire.displayName;
    const nomSrc = `${r.prenom} ${r.nom}`;
    const nom = dn || nomSrc;
    // Family name from the directory = displayName minus the Team first name (robust to "Nom, Prénom" or compound names)
    const nomAnnuaire = dn ? dn.replace(',', ' ').split(/\s+/).filter((w) => slug(w) && slug(w) !== slug(r.prenom) && !slug(r.prenom).split('-').includes(slug(w))).join(' ') : null;
    if (dn && slug(dn) !== slug(nomSrc)) signals.push({ kind: 'nom_ecart', row: r.ligne, texte: `Ligne ${r.ligne} « ${nomSrc} » ≠ annuaire « ${dn} » → orthographe de l'annuaire` });
    if (!r.annuaire) signals.push({ kind: 'hors_annuaire', row: r.ligne, texte: `${nomSrc} : introuvable dans l'annuaire Microsoft 365 → personne écrite, absences non lisibles` });
    // Id stability: an id already in base (from either spelling) wins, so charges.personne never gets orphaned
    // when the directory misses a person one day; otherwise the directory spelling, then the Team spelling.
    const cands = [nomAnnuaire, r.nom].filter(Boolean).map((n) => `team.${slug(n)}-${slug(r.prenom)}`);
    let id = cands.find((c) => prev[c]);
    if (!id) { // last resort: a base person with the same first name and a family name within 2 typos
      const near = Object.keys(prev).filter((k) => k.endsWith('-' + slug(r.prenom)) && lev(k.slice(5, -slug(r.prenom).length - 1), slug(r.nom)) <= 2);
      if (near.length === 1) { id = near[0]; signals.push({ kind: 'id_rapproche', row: r.ligne, texte: `Ligne ${r.ligne} ${nomSrc} : rapprochée de ${id} (orthographe proche)` }); }
    }
    id = id || cands[0];
    if (out.some((o) => o.rec.id === id)) { signals.push({ kind: 'collision', row: r.ligne, texte: `Ligne ${r.ligne} ${nomSrc} : id ${id} déjà pris par une autre ligne — non écrite` }); return; }
    const p = prev[id];
    const rec = { id, nom, role: hit[1], voie: hit[2], source: { systeme: 'saisie', ref: `${team.fichier} · ${team.feuille} ligne ${r.ligne}`, lu_le: team.read_at, par: 'adaptateur-outlook' } };
    // wip_limite dropped with the D7 flux part (Franck 2026-10-28, R23 R24 R28)
    if (p && (p.role !== rec.role || p.voie !== rec.voie)) signals.push({ kind: 'personne_ecart', row: id, texte: `${id} : base ${p.role}/${p.voie} → source ${rec.role}/${rec.voie}` });
    out.push({ rec, prev: p, ligne: r });
    if (r.annuaire) byMail[r.annuaire.mail.toLowerCase()] = id;
  });
  base.personnes.filter((p) => !out.some((o) => o.rec.id === p.id)).forEach((p) => signals.push({ kind: 'personne_non_relue', row: p.id, texte: `${p.id} en base, absente de ${team.fichier} — conservée` }));
  return { list: out, byMail };
}

function absences(raw, byMail, base, signals) {
  const collectives = base.absences.filter((a) => a.personne === null);
  const covered = (date) => collectives.some((a) => a.debut <= date && a.fin >= date);
  const halves = {}; // pid -> [{date, half}]
  const unread = [];
  const orgId = byMail[raw.organizer.toLowerCase()];
  raw.days.forEach((day) => {
    if (covered(day.date)) { signals.push({ kind: 'collective', row: day.date, texte: `${day.date} : absence collective en base — jour non lu (pas de doublon)` }); return; }
    if (day.error) { unread.push(day.date); return; }
    const am = day.slots.filter((s) => s.end <= AM_END); const pm = day.slots.filter((s) => s.start >= PM_START);
    [['matin', am], ['apres-midi', pm]].forEach(([half, slots]) => {
      // Slots are suggestions, not a measure: conclude only when the observed slots cover enough minutes.
      if (slots.length < MIN_SLOTS || coverage(slots) < MIN_COVER_MIN) { unread.push(`${day.date} ${half}`); return; }
      const status = (s, mail) => (mail === raw.organizer.toLowerCase() ? s.organizer : (s.non_free[mail] || 'free'));
      [...raw.participants, raw.organizer.toLowerCase()].forEach((mail) => {
        const pid = byMail[mail]; if (!pid) return;
        if (slots.every((s) => status(s, mail) === 'oof')) (halves[pid] = halves[pid] || []).push({ date: day.date, half, n: slots.length });
      });
    });
  });
  if (unread.length) signals.push({ kind: 'demi_journee_illisible', texte: `${unread.length} demi-journée(s) sans assez de créneaux pour conclure (équipe majoritairement occupée) : ${unread.join(', ')}` });
  if (!orgId) signals.push({ kind: 'organisateur', texte: 'Organisateur hors Team_G2.1' });
  const out = [];
  Object.entries(halves).forEach(([pid, hs]) => {
    let cur = null;
    const flush = () => { if (!cur) return; out.push(cur); cur = null; };
    hs.forEach((h) => {
      const follows = cur && ((cur.lastHalf === 'matin' && h.half === 'apres-midi' && cur.fin === h.date) || (cur.lastHalf === 'apres-midi' && h.half === 'matin' && nextWorkday(cur.fin) === h.date));
      if (!follows) { flush(); cur = { personne: pid, debut: h.date, fin: h.date, demi: 0, premiere: h.half, lastHalf: h.half, creneaux: 0 }; }
      cur.fin = h.date; cur.lastHalf = h.half; cur.demi += 1; cur.creneaux += h.n;
    });
    flush();
  });
  const winStart = raw.days[0].date;
  const prevOutlook = base.absences.filter((x) => x.source && x.source.systeme === 'outlook' && x.personne);
  const used = new Set();
  return out.map((a) => {
    const borne = a.demi === 1 ? ` (${a.premiere === 'matin' ? 'matin' : 'après-midi'})` : '';
    const rec = { id: `outlook.${a.personne.replace(/^team\./, '')}.${a.debut}${a.premiere === 'apres-midi' ? '-pm' : ''}`, personne: a.personne, debut: a.debut, fin: a.fin, jours_ouvres: a.demi / 2, libelle: 'absence',
      source: { systeme: 'outlook', ref: `disponibilités (free/busy) · ${a.debut}${a.fin !== a.debut ? ' → ' + a.fin : ''}${borne} · ${a.creneaux} créneaux « absent du bureau »`, lu_le: raw.read_at, par: 'adaptateur-outlook' } };
    // Id stability across the sliding window: a period overlapping (or extending) an absence already in base for
    // the same person keeps that id; the part before the window start is history and is carried over.
    const old = prevOutlook.find((x) => !used.has(x.id) && x.personne === a.personne && x.debut <= a.fin && x.fin >= a.debut);
    if (old) {
      used.add(old.id); rec.id = old.id;
      if (old.debut < winStart && a.debut === winStart) {
        const wdays = (s, e) => { let n = 0; for (let x = s; x <= e; x = addDays(x, 1)) if (![0, 6].includes(isoWeekday(x))) n++; return n; };
        const full = wdays(old.debut, old.fin) || 1;
        rec.jours_ouvres += old.jours_ouvres * wdays(old.debut, addDays(winStart, -1)) / full; rec.debut = old.debut;
        rec.source.ref += ` · début ${old.debut} repris de la lecture précédente`;
      }
    }
    return rec;
  });
}

function adapt(team, raw, base, versions, departs) {
  const signals = []; const rows = [];
  const P = personnes(team, base, signals, departs);
  const A = raw ? absences(raw, P.byMail, base, signals) : []; // raw null = team-only mode (R36)
  const prevA = Object.fromEntries(base.absences.map((a) => [a.id, a]));
  A.filter((a, i) => A.findIndex((x) => x.id === a.id) !== i).forEach((a) => signals.push({ kind: 'collision', row: a.id, texte: `${a.id} : deux périodes lues pour le même id` }));
  const today = raw ? raw.read_at.slice(0, 10) : null; const lastDay = raw ? raw.days[raw.days.length - 1].date : null;
  if (raw) base.absences.filter((a) => a.source && a.source.systeme === 'outlook' && !A.some((x) => x.id === a.id || (x.personne === a.personne && x.debut <= a.fin && x.fin >= a.debut)) && a.fin >= today && a.debut <= lastDay)
    .forEach((a) => signals.push({ kind: 'absence_non_relue', row: a.id, texte: `${a.id} (${a.debut} → ${a.fin}) en base, plus vue dans Outlook (ou jour non concluant) — conservée ; à retirer dans Gérer si annulée` }));
  P.list.forEach(({ rec, prev, ligne }) => rows.push({ kind: 'personne', id: rec.id, decision: prev ? 'mise à jour' : 'créée', lu: { ligne: ligne.ligne, nom: `${ligne.prenom} ${ligne.nom}`, role: ligne.role, annuaire: ligne.annuaire ? ligne.annuaire.displayName : '(absent)' }, base: { nom: rec.nom, role: rec.role, voie: rec.voie }, avant: prev ? { nom: prev.nom, role: prev.role, voie: prev.voie } : null }));
  A.forEach((a) => rows.push({ kind: 'absence', id: a.id, decision: prevA[a.id] ? 'mise à jour' : 'créée', lu: a.source.ref, base: { personne: a.personne, debut: a.debut, fin: a.fin, jours_ouvres: a.jours_ouvres, libelle: a.libelle } }));
  const doc = raw ? { modele: '1', source: { systeme: 'outlook', ref: `${team.fichier} + disponibilités Microsoft 365 ${raw.days[0].date} → ${lastDay}`, lu_le: raw.read_at, par: 'adaptateur-outlook' }, personnes: P.list.map((x) => x.rec), absences: A }
    : { modele: '1', source: { systeme: 'saisie', ref: `${team.fichier} (mode équipe)`, lu_le: team.read_at, par: 'adaptateur-outlook' }, personnes: P.list.map((x) => x.rec) };
  // No write when only the read time changed: versions stay put and the rerun proof is "0 writes".
  const strip = (r) => r && JSON.stringify(Object.assign({}, r, { source: Object.assign({}, r.source, { lu_le: null }) }), Object.keys(r).concat(Object.keys(r.source || {})).sort());
  const prevAll = { personnes: Object.fromEntries(base.personnes.map((p) => [p.id, p])), absences: prevA };
  const writes = [];
  ['personnes', 'absences'].forEach((c) => (doc[c] || []).forEach((r) => {
    const row = rows.find((x) => x.id === r.id);
    if (strip(prevAll[c][r.id]) === strip(r)) { if (row) row.decision = 'inchangé (non réécrit)'; return; }
    const w = { op: 'set', collection: c, doc_id: r.id, data: r }; const v = versions[`${c}/${r.id}`]; if (v) w.if_version = v; writes.push(w);
  }));
  return { doc, writes, report: { mode: raw ? 'complet' : 'equipe', lu_le: raw ? raw.read_at : team.read_at, personnes: doc.personnes.length, absences: A.length, jours: A.reduce((n, a) => n + a.jours_ouvres, 0), ecrits: writes.length, rows, signals } };
}

function validate(docPath, schemaPath) {
  const v = path.join(__dirname, 'validate_model.py');
  try { return execFileSync('python3', [v, schemaPath, docPath], { encoding: 'utf8' }); } catch (e) {
    console.error('refused: validator failed or did not run\n' + (e.stdout || '') + (e.stderr || e.message)); process.exit(3);
  }
}
const readDir = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : []);

if (require.main === module) {
  const equipe = process.argv[2] === '--equipe';
  const args = equipe ? [process.argv[3], null].concat(process.argv.slice(4)) : process.argv.slice(2);
  const [teamP, rawP, baseDir, outDir, schemaP] = args;
  if (!schemaP) { console.error('usage: adapt_outlook.js <team_raw.json> <outlook_raw.json> <base_before_dir> <out_dir> <schema.json>\n       adapt_outlook.js --equipe <team_raw.json> <base_before_dir> <out_dir> <schema.json>'); process.exit(2); }
  const team = JSON.parse(fs.readFileSync(teamP, 'utf8')); const raw = rawP ? JSON.parse(fs.readFileSync(rawP, 'utf8')) : null;
  const base = { personnes: readDir(path.join(baseDir, 'personnes')), absences: readDir(path.join(baseDir, 'absences')) };
  const vp = path.join(baseDir, 'versions.json'); const versions = fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, 'utf8')) : {};
  const dp = path.join(__dirname, '..', 'config', 'team_departs.json');
  const departs = fs.existsSync(dp) ? JSON.parse(fs.readFileSync(dp, 'utf8')) : [];
  const { doc, writes, report } = adapt(team, raw, base, versions, departs);
  fs.mkdirSync(outDir, { recursive: true });
  const docP = path.join(outDir, 'doc.json');
  fs.writeFileSync(docP, JSON.stringify(doc, null, 2));
  report.validation = validate(docP, schemaP).trim();
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify(writes, null, 1));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`personnes ${report.personnes} · absences ${report.absences} (${report.jours} j) · écrits ${report.ecrits} · signaux ${report.signals.length} · ${report.validation}`);
}
module.exports = { adapt, slug };
