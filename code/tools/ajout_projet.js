#!/usr/bin/env node
/* New portfolio project (Kickoff D21, skill ajout-projet-portefeuille): spec -> item record (saisie) + registry line.
 *
 * Usage: node tools/ajout_projet.js <spec.json> <base_dir> <schema.json> <out_dir>
 *   spec.json  {nom, lu_le, epics_jira[], etape, voie, parent|null, responsable?, liens[]?, note_lundi?,
 *               gantt?: {format: drawio|json, fichier: <web URL>, lecture: navigateur|file:///…, proprietaire, raw?: <local file>, modifie_le?}}
 *   base_dir   ArtifactData export (<dir>/items/*.json at least)
 * Writes out_dir/item.json, out_dir/batch.json (one creation, no if_version), out_dir/registre_ligne.md (if gantt),
 * out_dir/report.json. Refuses (exit 3) when the id exists, an epic is already linked to another item, or the model rejects
 * the record. fenetre = Gantt bounds when the Gantt file is given (raw), else absent. Never writes a source; never deletes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Core = require('../interface/core.js');
const G = require('./adapt_gantt.js');

function build(spec, base, schema) {
  const errs = []; const notes = [];
  const id = spec.id || `saisie.${G.slug(spec.nom, 60)}`;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(spec.lu_le || '')) errs.push(`lu_le ${spec.lu_le} : heure du Québec avec décalage attendue (jamais Z)`);
  const items = base.items || [];
  if (items.some((i) => i.id === id)) errs.push(`item ${id} déjà en base : utiliser Gérer pour le modifier`);
  const epics = [...new Set((spec.epics_jira || []).map((k) => String(k).trim().toUpperCase()).filter(Boolean))];
  epics.forEach((k) => { const o = items.find((i) => (i.epics_jira || []).includes(k)); if (o) errs.push(`épopée ${k} déjà liée à ${o.id} (${o.nom})`); });
  if (spec.parent && !items.some((i) => i.id === spec.parent)) errs.push(`parent ${spec.parent} absent de la base`);
  const it = { id, nom: spec.nom, type: spec.type || 'projet', parent: spec.parent || null, voie: spec.voie || 'scrum', etape: spec.etape || 'planifie', promu: false,
    updated_at: spec.lu_le, source: { systeme: 'saisie', ref: 'skill ajout-projet-portefeuille', lu_le: spec.lu_le, par: 'Franck' } };
  if (spec.responsable) it.responsable = spec.responsable;
  if (epics.length) it.epics_jira = epics;
  if (spec.note_lundi) it.note_lundi = spec.note_lundi;
  const liens = (spec.liens || []).slice();
  if (spec.gantt && spec.gantt.fichier && !liens.some((l) => l.url === spec.gantt.fichier)) liens.unshift({ libelle: 'Gantt', url: spec.gantt.fichier });
  // epics are already clickable in the « Data Jira » card (R02): no duplicate header link
  if (liens.length) it.liens = liens;
  if (spec.gantt && spec.gantt.raw) {
    const buf = fs.readFileSync(spec.gantt.raw);
    const p = spec.gantt.format === 'json' ? G.parseJson(buf.toString('utf8')) : G.parseDrawio(buf.toString('utf8'), (spec.gantt.modifie_le || spec.lu_le).slice(0, 10));
    it.fenetre = { debut: p.onglets.map((o) => o.debut).sort()[0], fin: p.onglets.map((o) => o.fin).sort().pop() };
    notes.push(`fenêtre = bornes du Gantt ${it.fenetre.debut} → ${it.fenetre.fin}`);
  }
  errs.push(...Core.validate(schema, 'item', it));
  const ligne = spec.gantt ? `| ${id} | ${spec.gantt.format} | ${spec.gantt.fichier} | ${spec.gantt.lecture} | ${spec.gantt.proprietaire || '—'} | actif |` : null;
  return { it, errs, notes, ligne };
}

if (require.main === module) {
  const [, , specP, baseDir, schemaP, outDir] = process.argv;
  if (!outDir) { console.error('usage: ajout_projet.js <spec.json> <base_dir> <schema.json> <out_dir>'); process.exit(2); }
  const spec = JSON.parse(fs.readFileSync(specP, 'utf8')); const schema = JSON.parse(fs.readFileSync(schemaP, 'utf8'));
  const base = G.readBase(baseDir);
  const r = build(spec, base, schema);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ id: r.it.id, erreurs: r.errs, notes: r.notes }, null, 2));
  if (r.errs.length) { console.error('refusé : ' + r.errs.join(' · ')); process.exit(3); }
  fs.writeFileSync(path.join(outDir, 'item.json'), JSON.stringify(r.it, null, 2));
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify([{ op: 'set', collection: 'items', doc_id: r.it.id, data: r.it }], null, 1));
  if (r.ligne) fs.writeFileSync(path.join(outDir, 'registre_ligne.md'), r.ligne + '\n');
  console.log(`${r.it.id} prêt · ${r.notes.join(' · ') || 'sans Gantt'}${r.ligne ? ' · ligne de registre écrite' : ''}`);
}
module.exports = { build };
