#!/usr/bin/env node
/* Miro adapter tests: real 2026-10-27 read of "Rétro G2.1 S18" (SVG as returned by canvas_read_as_svg) + synthetic cases.
 * Usage: node tests/test_adapt_miro.js <miro_raw.json> */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const { adapt, echeance, statutOf, boardSprint, htmlToLines, field } = require('../tools/adapt_miro.js');
const rawP = process.argv[2]; const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
const svg = fs.readFileSync(path.join(path.dirname(rawP), raw.svg_file), 'utf8');
const sprints = [{ id: 'jira.gou21-s19', debut: '2026-10-19', fin: '2026-11-06' }, { id: 'jira.gou21-s20', debut: '2026-11-09', fin: '2026-11-27' }];
const clone = (x) => JSON.parse(JSON.stringify(x));
let n = 0; const ok = (m, f) => { f(); n++; console.log('ok  ' + m); };
const r = adapt(raw, svg, { actions_retro: [], sprints }, {});
const sig = (res, kind) => res.report.signals.filter((s) => s.kind === kind);
const card = (num, body) => `<rect data-miro-id="9${num}" x="64" y="${2000 + num}" data-content="${body.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}" />`;
const withCards = (...c) => svg.replace('</g>', c.join('\n') + '\n</g>');

ok('real SVG: 20 items in the frame, 5 filled cards -> 5 actions for S19', () => {
  assert.strictEqual(r.report.elements_cadre, 20); assert.strictEqual(r.doc.actions_retro.length, 5);
  assert(r.doc.actions_retro.every((a) => a.sprint === 'jira.gou21-s19'));
});
ok('owners: with/without colon, empty omitted; "Responsables :" not "s : …"', () => {
  const a = Object.fromEntries(r.doc.actions_retro.map((x) => [x.id.split('.').pop(), x]));
  assert.strictEqual(a['3458764687505150080'].owner, 'Franck'); assert.strictEqual(a['3458764687505150082'].owner, 'David / Alain / Franck');
  assert.strictEqual(a['3458764687508094021'].owner, 'Yacine'); assert.strictEqual(a['3458764687508093983'].owner, undefined);
  assert.strictEqual(field(['Responsables : Alain'], 'Responsables?'), 'Alain');
});
ok('real deadlines: 23 Oct and 21 Oct past; "S19" = end of S19 (6 Nov) not past; 2 without deadline', () => {
  assert.strictEqual(sig(r, 'echeance_passee').length, 2); assert.strictEqual(sig(r, 'sans_echeance').length, 2); assert.strictEqual(sig(r, 'echeance_illisible').length, 0);
});
ok('deadline formats and year boundary', () => {
  const ref = '2026-12-14';
  assert.deepStrictEqual(echeance('5 Jan', ref), { date: '2027-01-05' }); assert.deepStrictEqual(echeance('15 déc', '2027-01-10'), { date: '2026-12-15' });
  assert.deepStrictEqual(echeance('23 octobre', '2026-10-19'), { date: '2026-10-23' }); assert.deepStrictEqual(echeance('1er nov', '2026-10-19'), { date: '2026-11-01' });
  assert.deepStrictEqual(echeance('Oct 23', '2026-10-19'), { date: '2026-10-23' }); assert.deepStrictEqual(echeance('23/10', '2026-10-19'), { date: '2026-10-23' });
  assert.deepStrictEqual(echeance('2026-10-23', ref), { date: '2026-10-23' }); assert.deepStrictEqual(echeance('S19', ref), { sprint: 'jira.gou21-s19' });
  assert(echeance('bientôt', ref).illisible);
});
ok('status markers: only a Statut line or a lone emoji; negation and "bloqué" handled', () => {
  assert.strictEqual(statutOf(['Statut : pas fait']).statut, 'a_faire'); assert.strictEqual(statutOf(['Statut : non terminé']).statut, 'a_faire');
  assert.strictEqual(statutOf(['Statut : fait']).statut, 'fait'); assert.strictEqual(statutOf(['Statut : en cours']).statut, 'en_cours');
  assert.deepStrictEqual(statutOf(['Statut : bloqué']), { statut: 'en_cours', bloque: true }); assert.strictEqual(statutOf(['✅']).statut, 'fait');
  assert.strictEqual(statutOf(['Quoi : Valider ✅ les tests']).statut, null);
});
ok('no marker -> status kept from base (maj-actions-retro), pinned write when something else changed', () => {
  const prev = Object.assign(clone(r.doc.actions_retro[1]), { statut: 'fait', owner: 'Ancien' });
  const r2 = adapt(raw, svg, { actions_retro: [prev], sprints }, { [`actions_retro/${prev.id}`]: 2 });
  assert.strictEqual(r2.doc.actions_retro.find((x) => x.id === prev.id).statut, 'fait');
  assert.strictEqual(r2.writes.find((w) => w.doc_id === prev.id).if_version, 2); assert.strictEqual(sig(r2, 'owner_change').length, 1);
});
ok('HTML entities decoded; empty template ignored; sticky notes read with @mention', () => {
  assert.deepStrictEqual(htmlToLines('<p>R&eacute;union &#233; &#xE9; &lt;3</p>'), ['Réunion é é <3']);
  const s = withCards(card(6, '<p><strong>Action 6</strong><br />Quoi :<br />Responsable :<br />Échéance :</p>'),
    '<rect data-miro-id="97" data-type="sticky_note" y="2100" data-content="&lt;p&gt;Documenter le runbook MEP @Yacine&lt;/p&gt;" />');
  const r4 = adapt(raw, s, { actions_retro: [], sprints }, {});
  assert.strictEqual(r4.doc.actions_retro.length, 6); assert.strictEqual(r4.doc.actions_retro[5].owner, 'Yacine');
});
ok('board names: variants recognised, copies ignored, ties refused, older board refused', () => {
  assert.deepStrictEqual(boardSprint('Rétro G2.1 - S19'), { n: 19 }); assert.deepStrictEqual(boardSprint('Rétro G21 S19'), { n: 19 });
  assert.deepStrictEqual(boardSprint('Rétro Goutte 2.1 S19'), { n: 19 }); assert.deepStrictEqual(boardSprint('Rétro G2.1 S19'), { n: 19 });
  assert.deepStrictEqual(boardSprint('Rétro G2.1 S18 (copie)'), { copie: true });
  const x = clone(raw); x.search.boards.push({ name: 'Rétro G2.1 S18 (copie)', miro_url: 'c' });
  assert.strictEqual(sig(adapt(x, svg, { actions_retro: [], sprints }, {}), 'board_copie').length, 1);
  const y = clone(raw); y.search.boards.push({ name: 'Rétro G2.1 - S19', miro_url: 'z' });
  assert.throws(() => adapt(y, svg, { actions_retro: [], sprints }, {}), /latest board/);
  const t = clone(raw); t.search.boards.push({ name: 'Rétro G21 S18', miro_url: 'z' });
  assert.throws(() => adapt(t, svg, { actions_retro: [], sprints }, {}), /two boards/);
});
ok('refuses a non-Actions frame and a sprint unknown to the base (fail closed)', () => {
  assert.throws(() => adapt(raw, svg.replace('data-frame="8. Actions"', 'data-frame="Actions de la rétro précédente"'), { actions_retro: [], sprints }, {}), /not the Actions frame/);
  assert.throws(() => adapt(raw, svg, { actions_retro: [], sprints: [sprints[1]] }, {}), /not in base/);
});
ok('action in base absent from the read: kept, reported; rerun on own output: 0 writes', () => {
  const old = { id: 'miro.retro-s17.1', board: 'x', texte: 'Ancienne action', statut: 'a_faire', source: { systeme: 'miro', lu_le: '2026-10-01T10:00-04:00' } };
  const r5 = adapt(raw, svg, { actions_retro: [old], sprints }, {});
  assert.strictEqual(sig(r5, 'action_non_relue').length, 1); assert(!r5.writes.some((w) => w.doc_id === old.id || w.op !== 'set'));
  const r6 = adapt(raw, svg, { actions_retro: r.doc.actions_retro.map((a) => Object.assign(clone(a), { source: Object.assign({}, a.source, { lu_le: '2026-10-20T08:00-04:00' }) })), sprints }, {});
  assert.strictEqual(r6.writes.length, 0);
});
console.log(`${n} tests ok`);
