#!/usr/bin/env node
/* Merge the step-1 example documents into one base and emit ArtifactData batch files.
 * Usage: node tools/build_seed.js <exemples_dir> <out_dir>
 * Writes: <out_dir>/base_seed.json (one model document, source = calcul)
 *         <out_dir>/batch_NN.json   (ArtifactData "batch" writes, <= 50 each, op = set)
 * Order matters: later documents override earlier ones for the same id (base_calcul last).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Core = require('../interface/core.js');

const ORDER = ['exemple_l8d.json', 'exemple_expert_g1.json', 'exemple_run_ti.json', 'exemple_codes_taxes.json', 'exemple_base_calcul.json'];
const [, , exDir, outDir] = process.argv;
if (!exDir || !outDir) { console.error('usage: build_seed.js <exemples_dir> <out_dir>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

const docs = ORDER.map((f) => JSON.parse(fs.readFileSync(path.join(exDir, f), 'utf8')));
const base = Core.mergeDocs(docs);
const doc = { modele: '1', source: { systeme: 'calcul', ref: 'seed étape 2 = fusion des 5 exemples de l\'étape 1', lu_le: Core.nowTs(), par: 'build_seed.js' } };
Core.COLLECTIONS.forEach((c) => { if (base[c].length) doc[c] = base[c]; });
fs.writeFileSync(path.join(outDir, 'base_seed.json'), JSON.stringify(doc, null, 2));

const writes = [];
Core.COLLECTIONS.forEach((c) => base[c].forEach((r) => writes.push({ op: 'set', collection: c, doc_id: r.id, data: r })));
for (let k = 0; k * 50 < writes.length; k++) {
  fs.writeFileSync(path.join(outDir, `batch_${String(k + 1).padStart(2, '0')}.json`), JSON.stringify(writes.slice(k * 50, k * 50 + 50), null, 1));
}
console.log(`records: ${writes.length} · batches: ${Math.ceil(writes.length / 50)} · ` +
  Core.COLLECTIONS.filter((c) => base[c].length).map((c) => `${c}=${base[c].length}`).join(' '));
