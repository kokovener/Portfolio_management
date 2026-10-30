#!/usr/bin/env node
/* DOM checks of the project Gantt (model v15) on a preview built from tests/fixtures/seed_gantt.json
 * (seed_v2 + Méthane P2 item, its gantt record and 4 milestones produced by adapt_gantt.js from the real drawio).
 * Usage: python tools/build_interface.py <schema.json> tests/fixtures/seed_gantt.json && cp dist/preview_local.html /tmp/pg.html
 *        NODE_PATH=<jsdom dir> node tests/test_page_dom_gantt.js /tmp/pg.html
 */
'use strict';
const fs = require('fs'); const assert = require('assert'); const { JSDOM } = require('jsdom'); const frozenClock = require('./frozen_clock');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const errors = [];
  const dom = new JSDOM(fs.readFileSync(process.argv[2], 'utf8'), { runScripts: 'dangerously', url: 'https://local.test/', pretendToBeVisual: true, beforeParse: frozenClock() });
  dom.window.addEventListener('error', (e) => errors.push(e.message)); dom.window.scrollTo = () => {};
  await sleep(150);
  const w = dom.window; const d = w.document; const txt = () => d.querySelector('#app').textContent;
  const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };

  click(d.querySelector('[data-act="open-item"][data-id="saisie.methane-p2"]')); await sleep(20);
  assert(/Gantt du projet/.test(txt()), 'gantt card present');
  const card = [...d.querySelectorAll('.card')].find((c) => /Gantt du projet/.test(c.textContent));
  assert.strictEqual(card.querySelectorAll('.gtr:not(.g):not(.h)').length, 43, 'Phase II: 43 task rows');
  assert.strictEqual(card.querySelectorAll('.gtr.g').length, 7, '7 groups');
  assert.strictEqual(card.querySelectorAll('.gms').length, 2 + 1, '2 milestones + legend diamond');
  assert(/SharePoint · lu/.test(card.textContent) && /plan calculé le 14 oct\./.test(card.textContent) && /il y a 11 j o\./.test(card.textContent), 'provenance and plan age');
  assert(/Hors planning : P2-INT\./.test(card.textContent), 'out-of-plan note');
  ok('projet: Gantt card rebuilt from data — 43 rows, 7 groups, 2 milestones, provenance, plan computed 11 j o. ago');

  // bar position: P2-AN1 on Fri 16 Oct in a grid starting Mon 5 Oct, 14 weeks (98 days) -> left = 11/98
  const an1 = [...card.querySelectorAll('.gtr')].find((r) => /P2-AN1/.test(r.textContent)).querySelector('.gb');
  assert(Math.abs(parseFloat(an1.style.left) - 100 * 11 / 98) < 0.01 && Math.abs(parseFloat(an1.style.width) - 100 / 98) < 0.01, 'P2-AN1 position ' + an1.style.left);
  assert(/16 oct\. → 16 oct\. 2026 · 1 j o\./.test(an1.title), 'bar tooltip');
  assert(card.querySelector('.gnow'), 'today line (29 Oct is inside the grid)');
  ok('projet: bars placed on the calendar (P2-AN1 = 16 oct.), tooltip, today line');

  // milestones feed the project: next milestone in the Fiche, listed in Jalons with SharePoint as source
  assert(/Prochain jalon.*Acceptation en PREP \(client\) — Phase II — 7 janv\./.test(txt()), 'next milestone from the Gantt');
  assert(/Jalons · 4/.test(txt()), '4 milestones listed');
  ok('projet: Gantt milestones = project milestones (prochain jalon 7 janv., 4 listed)');

  // tabs
  click(card.querySelector('[data-act="gantt-tab"][data-k="1"]')); await sleep(20);
  const card2 = [...d.querySelectorAll('.card')].find((c) => /Gantt du projet/.test(c.textContent));
  assert.strictEqual(card2.querySelectorAll('.gtr:not(.g):not(.h)').length, 9, 'Corrections phase I: 9 rows');
  assert(card2.querySelector('[data-act="gantt-tab"][data-k="1"]').classList.contains('on'));
  ok('projet: tabs switch to « Corrections phase I » (9 rows)');

  // no Gantt card on an item without gantt; visitor sees it
  click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
  click(d.querySelector('[data-act="open-item"][data-id="saisie.codes-taxes"]')); await sleep(20);
  assert(!/Gantt du projet/.test(txt())); ok('projet without gantt: no card');
  // Expert G1: Gantt carried by its feed block (one tab, done rows faded, milestone diamonds)
  click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
  click(d.querySelector('[data-act="open-item"][data-id="feed.expertg1"]')); await sleep(20);
  const ce = [...d.querySelectorAll('.card')].find((c) => /Gantt du projet/.test(c.textContent));
  assert(ce && !ce.querySelector('[data-act="gantt-tab"]'), 'one tab, no tab buttons');
  assert.strictEqual(ce.querySelectorAll('.gtr:not(.g):not(.h)').length, 80); assert(ce.querySelectorAll('.gb.fait').length > 30);
  assert(/Artefact · lu/.test(ce.textContent) && /plan calculé le 29 oct\./.test(ce.textContent));
  ok('Expert G1: Gantt from its feed block — 80 rows, done rows faded, provenance Artefact');
  assert(!errors.length, errors.join(' | '));
  console.log(`${n} ok`);
})().catch((e) => { console.error(e); process.exit(1); });
