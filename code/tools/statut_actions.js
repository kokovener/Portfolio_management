#!/usr/bin/env node
/* Retro action status (step 4b, skill maj-actions-retro): Franck's answers -> pinned writes on actions_retro.
 *
 * Usage: node tools/statut_actions.js <base_dir> <answers.json> <out_dir> <schema.json>
 *   base_dir      ArtifactData export: <dir>/actions_retro/*.json + <dir>/versions.json {"actions_retro/<id>": n}
 *   answers.json  {"asked_at": "<ts -04:00|-05:00>", "statuts": {"<action id>": "a_faire" | "en_cours" | "fait"}}
 * Writes out_dir/doc.json, batch.json (set, pinned), report.json; runs validate_model.py (fail closed).
 * Only `statut` changes: text, owner, board, sprint and source stay as the Miro adapter wrote them, so the adapter's
 * next read keeps the status and sees no change (no rewrite). Never writes Miro; never deletes a db document.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const STATUTS = ['a_faire', 'en_cours', 'fait'];
const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$/;

function plan(actions, versions, answers) {
  const byId = Object.fromEntries(actions.map((a) => [a.id, a]));
  const writes = []; const rows = []; const out = [];
  Object.entries(answers.statuts || {}).forEach(([id, st]) => {
    const a = byId[id];
    if (!a) throw new Error(`refused: ${id} not in base`);
    if (!STATUTS.includes(st)) throw new Error(`refused: statut « ${st} » for ${id}`);
    const v = versions[`actions_retro/${id}`];
    if (!v) throw new Error(`refused: no version for actions_retro/${id} — export the base first`);
    if (a.statut === st) { rows.push({ id, texte: a.texte, avant: a.statut, apres: st, decision: 'inchangé' }); return; }
    const rec = Object.assign({}, a, { statut: st });
    out.push(rec);
    writes.push({ op: 'set', collection: 'actions_retro', doc_id: id, data: rec, if_version: v });
    rows.push({ id, texte: a.texte, avant: a.statut, apres: st, decision: 'écrit' });
  });
  return { writes, rows, out };
}

function main() {
  const [baseDir, ansP, outDir, schemaP] = process.argv.slice(2);
  if (!schemaP) { console.error('usage: statut_actions.js <base_dir> <answers.json> <out_dir> <schema.json>'); process.exit(2); }
  const dir = path.join(baseDir, 'actions_retro');
  const actions = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  const versions = JSON.parse(fs.readFileSync(path.join(baseDir, 'versions.json'), 'utf8'));
  const answers = JSON.parse(fs.readFileSync(ansP, 'utf8'));
  if (!TS.test(answers.asked_at || '')) { console.error('refused: asked_at must be a local timestamp with offset'); process.exit(2); }
  let r;
  try { r = plan(actions, versions, answers); } catch (e) { console.error(e.message); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  const doc = { modele: '1', source: { systeme: 'saisie', ref: 'skill maj-actions-retro · statut des actions', lu_le: answers.asked_at, par: 'Franck' }, actions_retro: r.out };
  const docP = path.join(outDir, 'doc.json');
  fs.writeFileSync(docP, JSON.stringify(doc, null, 2) + '\n');
  let validation = 'rien à valider (aucune écriture)';
  if (r.out.length) {
    try { validation = execFileSync('python3', [path.join(__dirname, 'validate_model.py'), schemaP, docP], { encoding: 'utf8' }).trim(); } catch (e) {
      console.error('refused: validator failed or did not run\n' + (e.stdout || '') + (e.stderr || e.message)); process.exit(3);
    }
  }
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify(r.writes, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ asked_at: answers.asked_at, ecrits: r.writes.length, rows: r.rows, validation }, null, 2) + '\n');
  console.log(`${r.writes.length} write(s) · ${r.rows.length} answer(s) · ${validation.split('\n').pop()}`);
}
if (require.main === module) main();
module.exports = { plan };
