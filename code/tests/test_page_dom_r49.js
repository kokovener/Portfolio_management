#!/usr/bin/env node
/* R49 (Franck 2026-10-29): ticked Smartsheet rows are always shown, in three trees — main (actif, planifié),
 * « Qualifiés et en pause » (folded) and « Terminés » (folded) — each keeping the sheet's parent / child structure,
 * both new parts before the MEP rows. Fixture: base of 2026-10-29 16 h 11 (passage demande-r49), no team records.
 * Usage: python tools/build_interface.py <schema.json> tests/fixtures/seed_r49.json && cp dist/preview_local.html /tmp/p49.html
 *        NODE_PATH=<jsdom dir> node tests/test_page_dom_r49.js /tmp/p49.html
 */
'use strict';
const fs = require('fs'); const assert = require('assert'); const { JSDOM } = require('jsdom'); const frozenClock = require('./frozen_clock');
const html = fs.readFileSync(process.argv[2], 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const errors = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://local.test/', pretendToBeVisual: true, beforeParse: frozenClock() });
  dom.window.addEventListener('error', (e) => errors.push(e.message)); dom.window.scrollTo = () => {};
  await sleep(150);
  const w = dom.window; const d = w.document;
  const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const row = (id) => d.querySelector(`.tlr[data-row="${id}"]`);
  const grp = (k) => d.querySelector(`.grp[data-id="grp:${k}"]`);
  let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };

  // both parts exist, folded, after the programme tree and before the MEP header
  assert(grp('qual') && grp('term'), 'parts present');
  assert(!row('goutte21.l8e') && !row('goutte21.l1'), 'folded by default');
  const all = [...d.querySelectorAll('.grp')].map((g) => g.dataset.id || g.textContent);
  const iq = all.indexOf('grp:qual'); const it = all.indexOf('grp:term'); const im = all.findIndex((t) => /^MEP /.test(t));
  assert(iq > 0 && it > iq && im > it, `order programme < qualifiés < terminés < MEP (${all.join(' | ')})`);
  ok('qualifiés and terminés: two folded parts, before the MEP');

  // main tree: actif items with their Smartsheet children, no qualifié / terminé row
  for (const id of ['goutte21.l8', 'goutte21.l8d', 'goutte21.l8d1']) { click(row(id).querySelector('[data-act="toggle"]')); await sleep(20); }
  assert(!row('goutte21.l8e') && !row('goutte21.l8c'), 'qualifié children of L8 stay out of the main tree');
  assert(row('goutte21.l8') && row('goutte21.l8d') && row('goutte21.l8d1') && row('goutte21.l8d1.1'), 'active chain L8 > L8D > L8D1 > L8D1.1');
  const pad = (id) => parseInt(row(id).querySelector('.lab').style.paddingLeft, 10);
  assert(pad('goutte21.l8d1.1') > pad('goutte21.l8d1') && pad('goutte21.l8d1') > pad('goutte21.l8d'), 'indented as in the sheet');
  ok('main tree keeps the sheet hierarchy (L8 > L8D > L8D1 > L8D1.1)');

  // open « Qualifiés »: L8E with L8E1–3 as children, the root names its active parent
  click(grp('qual')); await sleep(20);
  assert(row('goutte21.l8e') && row('goutte21.l8c') && row('goutte21.l9') && row('goutte21.l17'), 'qualifiés listed');
  assert(/sous L8\b/.test(row('goutte21.l8e').textContent), 'root names its parent L8');
  assert(!row('goutte21.l8e1'), 'children folded under L8E');
  click(row('goutte21.l8e').querySelector('[data-act="toggle"]')); await sleep(20);
  assert(row('goutte21.l8e1') && row('goutte21.l8e3') && pad('goutte21.l8e1') > pad('goutte21.l8e'), 'L8E1–3 nested under L8E');
  ok('qualifiés: tree (L8E > L8E1, L8E2, L8E3), root says « sous L8 »');

  // open « Terminés »: L1, L2 (Done in Smartsheet) even with the default Étape filter
  click(grp('term')); await sleep(20);
  assert(row('goutte21.l1') && row('goutte21.l2'), 'terminés listed');
  ok('terminés: L1, L2 shown with the default Étape filter');

  assert(!errors.length, errors.join('\n'));

  // optional 2nd page (same seed, L8 set to qualifié): its active child L8D must stay in the main tree (fresh review R49)
  if (process.argv[3]) {
    const d2 = new JSDOM(fs.readFileSync(process.argv[3], 'utf8'), { runScripts: 'dangerously', url: 'https://local.test/', pretendToBeVisual: true, beforeParse: frozenClock() });
    d2.window.scrollTo = () => {}; await sleep(150);
    const r2 = (id) => d2.window.document.querySelector(`.tlr[data-row="${id}"]`);
    assert(r2('goutte21.l8d') && !r2('goutte21.l8'), 'L8D shown in the main tree while L8 sits in the folded qualifiés part');
    ok('active child of a qualifié parent stays visible in the main tree');
  }
  console.log(`\n${n} checks passed`);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
