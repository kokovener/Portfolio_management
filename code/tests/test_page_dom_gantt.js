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
  assert(/SharePoint · lu/.test(card.textContent) && /plan calculé le 14 oct\./.test(card.textContent) && /il y a 11 j ouvrés/.test(card.textContent), 'provenance and plan age');
  assert(/Non affichés \(sans date\) : P2-INT\./.test(card.textContent), 'out-of-plan note');
  ok('projet: Gantt card rebuilt from data — 43 rows, 7 groups, 2 milestones, provenance, plan computed 11 j o. ago');

  // bar position: P2-AN1 on Fri 16 Oct in a grid starting Mon 5 Oct, 14 weeks (98 days) -> left = 11/98
  const an1 = [...card.querySelectorAll('.gtr')].find((r) => /P2-AN1/.test(r.textContent)).querySelector('.gb');
  assert(Math.abs(parseFloat(an1.style.left) - 100 * 11 / 98) < 0.01 && Math.abs(parseFloat(an1.style.width) - 100 / 98) < 0.01, 'P2-AN1 position ' + an1.style.left);
  assert(/16 oct\. 2026 → 16 oct\. 2026 · 1 j ouvré/.test(an1.title), 'bar tooltip (R51: year shown)');
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
  // R52/R54/R56 (Franck 2 Nov.): a Goutte 2.1 delivery without a Gantt file shows its part of the programme Gantt,
  // computed from planned / Jira actual windows, with a link that opens the programme on its Gantt
  { const gx = d.getElementById('gantt');
    assert(gx && /Gantt du projet · extrait/.test(gx.textContent) && /Calculé à l’affichage/.test(gx.textContent), 'extract card on codes-taxes');
    assert(gx.querySelector('.gb.pv'), 'planned bar'); assert(/\d{4}/.test(gx.querySelector('.gtr.h .gtk span').textContent), 'first week label carries the year');
    const lk = gx.querySelector('[data-act="open-gantt"]'); assert(lk && lk.dataset.id === 'goutte21', 'link to the programme Gantt');
    click(lk); await sleep(20);
    const gp = d.getElementById('gantt'); assert(gp && /Gantt du programme/.test(gp.textContent) && !gp.querySelector('[data-act="open-gantt"]'), 'programme fiche with its computed Gantt');
    assert(gp.querySelectorAll('.gtr:not(.g):not(.h)').length > 1, 'one row per delivery');
    assert.strictEqual(d.defaultView.getComputedStyle(gp.querySelector('.gtl')).position, 'sticky', 'R53 frozen title column');
    ok('R52/R54/R56: delivery extract of the computed programme Gantt, link opens the programme Gantt; R53 sticky titles'); }
  // R51 year on milestone dates, R55 foldable sections and empty ones on one line
  click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
  click(d.querySelector('[data-act="open-item"][data-id="saisie.methane-p2"]')); await sleep(20);
  { const jr = d.querySelector('.lrow.jal'); assert(/\d{1,2} \S+ 20\d\d/.test(jr.textContent), 'R51 year: ' + jr.textContent);
    assert(/Rien de rattaché/.test(txt()), 'empty sections grouped');
    click(d.querySelector('[data-act="toggle"][data-id="sec:jalons"]')); await sleep(20);
    assert(!d.querySelector('.lrow.jal') && /Jalons · 4/.test(txt()), 'jalons folded, header kept');
    click(d.querySelector('[data-act="toggle"][data-id="sec:jalons"]')); await sleep(20); assert(d.querySelector('.lrow.jal'), 'unfolded');
    ok('R51 year on milestones; R55 sections fold, empty ones on one line'); }
  // Expert G1: Gantt carried by its feed block (one tab, done rows faded, milestone diamonds)
  click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
  click(d.querySelector('[data-act="open-item"][data-id="feed.expertg1"]')); await sleep(20);
  const ce = [...d.querySelectorAll('.card')].find((c) => /Gantt du projet/.test(c.textContent));
  assert(ce && !ce.querySelector('[data-act="gantt-tab"]'), 'one tab, no tab buttons');
  assert.strictEqual(ce.querySelectorAll('.gtr:not(.g):not(.h)').length, 80); assert(ce.querySelectorAll('.gb.fait').length > 30);
  assert(/Artefact du projet · lu/.test(ce.textContent) && /plan calculé le 29 oct\./.test(ce.textContent));
  ok('Expert G1: Gantt from its feed block — 80 rows, done rows faded, provenance Artefact');
  // R58: project title frozen — sticky bar is a direct child of #app (sticky needs the scrolling parent), holds the h1, sits under the header
  { const ph = d.querySelector('#app > .phead'); assert(ph && ph.querySelector('h1') && /Expert G1/.test(ph.textContent), 'phead with the project title');
    const css = d.querySelector('style').textContent; assert(/\.phead\{position:sticky;top:var\(--hdr-h/.test(css), 'phead sticky under the header');
    assert(/Source :/.test(d.querySelector('#app > .psrc').textContent), 'source line outside the frozen bar'); }
  ok('R58: project title frozen under the sticky header');
  // R59: sprint title frozen the same way (title + sprint tabs in the bar, tempo and source line scroll)
  click(d.querySelector('[data-act="view"][data-v="sprint"]')); await sleep(20);
  { const ph = d.querySelector('#app > .phead'); assert(ph && ph.querySelector('h1') && ph.querySelector('[data-act="open-sprint"]'), 'sprint phead with title and tabs');
    assert(/jours ouvrés/.test(d.querySelector('#app > .psrc').textContent), 'tempo / source line outside the frozen bar'); }
  ok('R59: sprint title frozen under the sticky header');
  // R57: compact tiles and funnel (one line, footnote in the funnel tooltip)
  { const css = d.querySelector('style').textContent; assert(/\.tile\{[^}]*flex-direction:row/.test(css) && /\.stage\{[^}]*flex-direction:row/.test(css), 'tiles / stages on one line'); }
  ok('R57: compact tiles and funnel stages');
  assert(!errors.length, errors.join(' | '));
  console.log(`${n} ok`);
})().catch((e) => { console.error(e); process.exit(1); });
