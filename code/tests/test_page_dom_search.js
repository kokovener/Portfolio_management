#!/usr/bin/env node
/* DOM checks of the header search (S1, Franck 5 Nov.) on a preview built from the real base of 3 Nov.
 * (dist/runs/2026-11-03/collecteur/base_avant.json: architect roadmap with SC-15 « Coordonnées, ISQ et Région »).
 * Usage: python tools/build_interface.py <schema.json> <base.json> && cp dist/preview_local.html /tmp/ps.html
 *        NODE_PATH=<jsdom dir> node tests/test_page_dom_search.js /tmp/ps.html
 */
'use strict';
const fs = require('fs'); const assert = require('assert'); const { JSDOM } = require('jsdom'); const frozenClock = require('./frozen_clock');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const errors = [];
  const dom = new JSDOM(fs.readFileSync(process.argv[2], 'utf8'), { runScripts: 'dangerously', url: 'https://local.test/', pretendToBeVisual: true, beforeParse: frozenClock() });
  dom.window.addEventListener('error', (e) => errors.push(e.message)); dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  await sleep(200);
  const w = dom.window; const d = w.document;
  let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };
  const box = () => d.getElementById('srch'); const res = () => d.getElementById('srch-res');
  const type = (v) => { const i = box(); i.focus(); i.value = v; i.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const key = (k) => box().dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));

  // 1. the box is in the header on every view, with its scope in the tooltip
  for (const v of ['portefeuille', 'projet', 'sprint']) {
    d.querySelector(`[data-act="view"][data-v="${v}"]`).dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(20);
    assert(d.querySelector('.hdr #srch'), 'search box in header on ' + v);
  }
  assert(/tâches des Gantt/.test(box().title) && /Raccourci : \//.test(box().title), 'scope tooltip');
  ok('header: search box on the 3 views, scope in the tooltip');

  // 2. focus with no text: help line says where it searches
  box().focus(); box().dispatchEvent(new w.FocusEvent('focusin', { bubbles: true }));
  assert(!res().hidden && /Cherche dans : noms des projets/.test(res().textContent), 'scope help on focus');
  ok('focus: scope help shown before typing');

  // 3. Franck's case: « coordonnees » (no accent) finds SC-15 as milestone and Gantt task, highlighted
  type('coordonnees');
  const txt = res().textContent;
  assert(/Jalons · \d/.test(txt) && /Tâches de Gantt · \d/.test(txt), 'both groups: ' + txt.slice(0, 200));
  assert(/Coordonnées/.test(res().querySelector('mark').textContent), 'accented word highlighted');
  assert(res().querySelector('.srch-i .rf').textContent === 'SC-15', 'ref column SC-15');
  ok('« coordonnees » finds SC-15 (jalon + tâche de Gantt), accents ignored, word highlighted');

  // 4. exact ref ranks first; several words all required
  type('sc-15'); assert.strictEqual(res().querySelector('.srch-i .rf').textContent, 'SC-15', 'exact ref first');
  type('isq region'); assert(/SC-15/.test(res().textContent), 'two words');
  type('isq zzzz'); assert(/Aucun résultat/.test(res().textContent), 'no result');
  ok('ref SC-15 first, multi-word AND, empty result message');

  // 5. click on the Gantt task: architect fiche, right tab, row flashed
  type('coordonnees');
  const gIx = [...res().querySelectorAll('.srch-g')].findIndex((x) => /Tâches de Gantt/.test(x.textContent));
  const gEl = [...res().children].slice([...res().children].indexOf(res().querySelectorAll('.srch-g')[gIx]) + 1).find((x) => x.classList.contains('srch-i'));
  gEl.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(20);
  const row = d.querySelector('#gantt .gtr.flash');
  assert(row && /SC-15/.test(row.textContent) && /Coordonnées/.test(row.textContent), 'Gantt row flashed');
  assert(d.querySelector('#gantt [data-act="gantt-tab"].on') === null || /Horizon engagé/.test(d.querySelector('#gantt [data-act="gantt-tab"].on').textContent), 'tab Horizon engagé');
  assert(res().hidden, 'list closed after navigation');
  ok('clic tâche : fiche du programme architecte, onglet Horizon engagé, ligne SC-15 surlignée');

  // 6. Enter on the milestone: owner item fiche, jalon row flashed (section forced open)
  type('coordonnees'); while (!/Fin SC-15/.test(res().querySelector('.srch-i.on').textContent)) key('ArrowDown');
  key('Enter'); await sleep(20);
  const jr = d.querySelector('.lrow.jal.flash');
  assert(jr && /Coordonnées/.test(jr.textContent), 'milestone row flashed');
  assert(/Services transverses du socle/.test(d.querySelector('.phead').textContent), 'owner item fiche');
  ok('clavier ↓ + Entrée sur le jalon : fiche « Services transverses du socle », jalon surligné');

  // 7. Escape clears, then closes; « / » focuses from the page
  type('abc'); key('Escape'); assert.strictEqual(box().value, '', 'escape clears');
  box().blur(); d.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: '/', bubbles: true }));
  assert.strictEqual(d.activeElement, box(), '« / » focuses the box');
  ok('Échap vide puis ferme ; « / » place le curseur dans la recherche');

  // 8. visitor view: hidden items never come out
  const hidden = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).items.filter((i) => i.visible === false);
  if (hidden.length && d.querySelector('[data-act="visitor"]')) {
    d.querySelector('[data-act="visitor"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(20);
    type(hidden[0].nom.split(/\s+/).slice(0, 2).join(' '));
    assert(![...res().querySelectorAll('.srch-i .nm')].some((x) => x.firstChild && x.textContent.startsWith(hidden[0].nom)), 'hidden item not listed');
    ok(`vue visiteur : item masqué « ${hidden[0].nom} » absent des résultats`);
  } else ok('vue visiteur : aucun item masqué dans cette base (contrôle sans objet)');

  assert.deepStrictEqual(errors, [], 'no page error');
  console.log(`OK ${n} checks`);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
