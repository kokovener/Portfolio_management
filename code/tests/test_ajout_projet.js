#!/usr/bin/env node
/* ajout_projet.js (Kickoff D21): item built from a spec, refusals on duplicates. Usage: node tests/test_ajout_projet.js <schema.json> */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const A = require('../tools/ajout_projet.js');
const schema = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'seed_v2.json'), 'utf8'));
const spec = { nom: 'Méthane P2', lu_le: '2026-10-30T10:50-04:00', epics_jira: ['gou21-7732', 'GOU21-8143'], etape: 'actif', voie: 'scrum', parent: null, responsable: 'Personne_11',
  gantt: { format: 'drawio', fichier: 'https://plq.sharepoint.com/x/methane-gantt.drawio', lecture: 'navigateur', proprietaire: 'Personne_09', raw: path.join(__dirname, 'fixtures', 'gantt', 'methane-gantt.drawio'), modifie_le: '2026-10-30T10:10-04:00' } };
let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };
let r = A.build(spec, { items: seed.items }, schema);
assert.deepStrictEqual(r.errs, []); assert.strictEqual(r.it.id, 'saisie.methane-p2'); assert.deepStrictEqual(r.it.epics_jira, ['GOU21-7732', 'GOU21-8143']);
assert.deepStrictEqual(r.it.fenetre, { debut: '2026-10-05', fin: '2027-01-15' }); assert.strictEqual(r.it.liens[0].libelle, 'Gantt'); assert.strictEqual(r.it.liens.length, 1);
assert(/^\| saisie\.methane-p2 \| drawio \| https:\/\/plq\.sharepoint\.com\/x\/methane-gantt\.drawio \| navigateur \| Personne_09 \| actif \|$/.test(r.ligne));
ok('item saisie.methane-p2: slug id, epics upper-cased, window = Gantt bounds, Gantt link (epics stay in Data Jira), registry line');
r = A.build(spec, { items: seed.items.concat([r.it]) }, schema); assert(r.errs.some((e) => /déjà en base/.test(e)) && r.errs.some((e) => /déjà liée/.test(e)));
ok('refused: same id, epic already linked');
r = A.build(Object.assign({}, spec, { lu_le: '2026-10-30T14:50Z', parent: 'nope', gantt: undefined }), { items: seed.items }, schema);
assert(r.errs.some((e) => /jamais Z/.test(e)) && r.errs.some((e) => /parent nope/.test(e)) && !r.ligne);
ok('refused: Z timestamp, unknown parent; no Gantt = no registry line');
console.log(`${n} ok`);
