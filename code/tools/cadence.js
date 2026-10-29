#!/usr/bin/env node
/* Refresh cadence (R36, cadrage 05_Pilotage/Cadence_Rafraichissement_v1.md): which adapters a pass runs, and the
 * "lecture" record (model v6) written after each adapter so the page can show each block's freshness.
 *
 * Usage:
 *   node tools/cadence.js plan <lundi|quotidien|jeudi> <date>          → JSON: adapters due, ordered, with their reason
 *   node tools/cadence.js plan demande <date> <cible>                   → cible ∈ keys of cadence.json "demande"
 *   node tools/cadence.js sprint <date>                                  → JSON: {debut_sprint, sprint_debut, sprint_fin}
 *   node tools/cadence.js base <export_dir> <heure> <out.json>
 *        light passes (no snapshot): builds the validation base (all collections of a full ArtifactData export, as the
 *        Monday snapshot's base_avant.json) so validate_model.py can resolve references; never written to the db.
 *   node tools/cadence.js lecture <adaptateur> <passage> <lu_le> <ok|partiel|echec> <ecrits> <versions.json|-> <out_batch.json> <schema.json> [cause]
 *        writes a one-write batch (set lectures/lecture.<adaptateur>, pinned with if_version when the versions file
 *        knows the doc) — to pass to ArtifactData batch. lu_le comes from `TZ=America/Toronto date`, never computed here.
 * Config: config/cadence.json (never hard-code a schedule here). Never writes a source; never deletes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Core = require('../interface/core.js');

const CAD = path.join(__dirname, '..', 'config', 'cadence.json');
const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function loadCadence(p) { return JSON.parse(fs.readFileSync(p || CAD, 'utf8')); }
// Sprint start days are computed from the anchor (Franck: 3-week sprints, next one starts Monday 2026-11-09).
function sprintOf(cad, date) {
  const n = Core.daysBetween(cad.sprint.ancre, date); const k = Math.floor(n / cad.sprint.duree_j);
  const debut = Core.addDays(cad.sprint.ancre, k * cad.sprint.duree_j);
  return { debut_sprint: debut === date, sprint_debut: debut, sprint_fin: Core.addDays(debut, cad.sprint.duree_j - 3) };
}
function plan(cad, passage, date, cible) {
  if (!DATE.test(date)) throw new Error(`date ${date} : AAAA-MM-JJ attendu`);
  const wd = Core.d(date).getDay(); const due = []; const add = (a, motif) => { if (!due.some((x) => x.adaptateur === a)) due.push({ adaptateur: a, motif }); };
  let flags = { instantane: false, digest: false, teams: false }; const avert = [];
  if (passage === 'demande') {
    const list = (cad.demande || {})[cible];
    if (!list) throw new Error(`cible « ${cible} » inconnue (${Object.keys(cad.demande || {}).join(', ')})`);
    list.forEach((a) => add(a, `à la demande : ${cible}`));
  } else {
    const p = cad.passages[passage]; if (!p) throw new Error(`passage « ${passage} » inconnu`);
    if (!p.jours.includes(wd)) avert.push(`${date} est un ${JOURS[wd]} : jour hors du passage ${passage} (lancement manuel ?)`);
    p.adaptateurs.forEach((a) => add(a, `${passage} ${p.heure}`));
    ((p.par_jour || {})[String(wd)] || []).forEach((a) => add(a, `${passage} du ${JOURS[wd]}`));
    const sp = sprintOf(cad, date);
    if (sp.debut_sprint) (p.debut_sprint || []).forEach((a) => add(a, `début de sprint (${date})`));
    flags = { instantane: !!p.instantane, digest: !!p.digest, teams: !!p.teams };
  }
  // An adapter that covers another one replaces it in the same pass (jira_data_reel reads steps a–d)
  Object.keys(cad.remplace || {}).forEach((k) => { if (due.some((x) => x.adaptateur === k)) (cad.remplace[k] || []).forEach((r) => { const i = due.findIndex((x) => x.adaptateur === r); if (i >= 0) due.splice(i, 1); }); });
  due.sort((a, b) => cad.ordre.indexOf(a.adaptateur) - cad.ordre.indexOf(b.adaptateur));
  // Dependencies: Jira data needs the sprints (Jira) read in the same pass or before; Miro needs the next sprint.
  ['jira_data', 'jira_data_reel', 'miro'].forEach((a) => { if (due.some((x) => x.adaptateur === a) && !due.some((x) => x.adaptateur === 'jira')) avert.push(`${a} sans jira dans ce passage : sprints de la dernière lecture utilisés`); });
  return Object.assign({ passage, date, jour: JOURS[wd], adaptateurs: due, avertissements: avert }, flags, passage === 'demande' ? { cible } : { sprint: sprintOf(cad, date) });
}
function lecture(schema, adaptateur, passage, luLe, statut, ecrits, versions, cause) {
  if (!TS.test(luLe) || /Z$/.test(luLe)) throw new Error(`lu_le ${luLe} : horodatage avec décalage attendu (jamais Z)`);
  const rec = { id: `lecture.${adaptateur.replace(/_/g, '-')}`, adaptateur, passage, lu_le: luLe, statut, ecrits: Number(ecrits),
    source: { systeme: 'calcul', ref: `tâche ${passage}`, lu_le: luLe, par: 'cadence' } };
  if (cause) rec.cause = cause;
  const errs = Core.validate(schema, 'lecture', rec); if (errs.length) throw new Error('refusé par le modèle : ' + errs.join(' ; '));
  const w = { op: 'set', collection: 'lectures', doc_id: rec.id, data: rec }; const v = versions[`lectures/${rec.id}`]; if (v) w.if_version = v;
  return [w];
}

if (require.main === module) {
  const [cmd, ...a] = process.argv.slice(2);
  const fail = (m) => { console.error(m); process.exit(2); };
  try {
    const cad = loadCadence();
    if (cmd === 'plan') console.log(JSON.stringify(plan(cad, a[0], a[1], a[2]), null, 2));
    else if (cmd === 'base') {
      const [dir, heure, out] = a; if (!out || !TS.test(heure)) fail('usage: base <export_dir> <heure> <out.json>');
      const base = Core.emptyBase(); let n = 0;
      Core.COLLECTIONS.forEach((c) => { const d = path.join(dir, c); if (!fs.existsSync(d)) return; fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort().forEach((f) => { base[c].push(JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))); n++; }); });
      if (!base.items.length) fail(`refusé : aucun item dans ${dir} — exporte les 15 collections d'abord`);
      fs.writeFileSync(out, JSON.stringify(Object.assign({ modele: '6', source: { systeme: 'calcul', ref: 'base avant (passage)', lu_le: heure, par: 'cadence' } }, base), null, 1));
      console.log(`${n} documents → ${out}`);
    }
    else if (cmd === 'sprint') console.log(JSON.stringify(sprintOf(cad, a[0])));
    else if (cmd === 'lecture') {
      const [ad, passage, luLe, statut, ecrits, vp, out, schemaP, cause] = a;
      if (!schemaP) fail('usage: lecture <adaptateur> <passage> <lu_le> <statut> <ecrits> <versions.json|-> <out_batch.json> <schema.json> [cause]');
      const schema = JSON.parse(fs.readFileSync(schemaP, 'utf8'));
      const versions = vp && vp !== '-' && fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, 'utf8')) : {};
      const ws = lecture(schema, ad, passage, luLe, statut, ecrits, versions, cause);
      fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(ws, null, 1));
      console.log(`${ws[0].doc_id} · ${statut} · ${ws[0].if_version ? 'épinglé v' + ws[0].if_version : 'création'} → ${out}`);
    } else fail(fs.readFileSync(__filename, 'utf8').split("'use strict'")[0]);
  } catch (e) { fail(e.message); }
}
module.exports = { plan, sprintOf, lecture, loadCadence };
