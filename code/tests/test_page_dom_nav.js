#!/usr/bin/env node
/* Browser Back returns to the previous view (Franck 2026-11-02): Portefeuille -> Projet -> Back = Portefeuille.
 * Usage: build the preview on seed_r49.json (see tests/run_all.sh), then
 *        NODE_PATH=<jsdom dir> node tests/test_page_dom_nav.js <p49.html>
 */
'use strict';
const fs = require('fs'); const assert = require('assert'); const { JSDOM } = require('jsdom'); const frozenClock = require('./frozen_clock');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };

(async () => {
  const errors = [];
  const dom = new JSDOM(fs.readFileSync(process.argv[2], 'utf8'), { runScripts: 'dangerously', url: 'https://local.test/', pretendToBeVisual: true, beforeParse: frozenClock() });
  const w = dom.window; const d = w.document;
  w.addEventListener('error', (e) => errors.push(e.message)); w.scrollTo = () => {};
  await sleep(150);
  const click = async (el) => { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }) /* real clicks are cancelable: href="#" must not add an entry */); await sleep(20); };
  const back = async () => { w.history.back(); await sleep(60); };
  const fwd = async () => { w.history.forward(); await sleep(60); };
  const tabOn = () => d.querySelector('.tabs .tab.on').dataset.v;

  assert.strictEqual(tabOn(), 'portefeuille', 'landing view');
  const h0 = w.history.length;
  assert(w.history.state && w.history.state.view === 'portefeuille', 'landing entry carries its view');
  ok('landing entry carries the portfolio view');

  // Portefeuille -> click a project -> Back = Portefeuille
  const link = d.querySelector('[data-act="open-item"]'); assert(link, 'a project link on the portfolio');
  const id = link.dataset.id; await click(link);
  assert.strictEqual(tabOn(), 'projet'); assert.strictEqual(w.history.length, h0 + 1, 'one entry per view change');
  await back();
  assert.strictEqual(tabOn(), 'portefeuille', 'Back returns to the portfolio');
  ok('Portefeuille -> Projet -> Back = Portefeuille');

  // Forward reopens the same project
  await fwd();
  assert.strictEqual(tabOn(), 'projet'); assert.strictEqual(w.history.state.itemId, id, 'forward = same project');
  ok('Forward reopens the same project');

  // Tabs chain: Projet -> Sprint -> Back = Projet -> Back = Portefeuille
  await click(d.querySelector('.tabs [data-v="sprint"]')); assert.strictEqual(tabOn(), 'sprint');
  await back(); assert.strictEqual(tabOn(), 'projet');
  await back(); assert.strictEqual(tabOn(), 'portefeuille');
  ok('tab changes stack in history in order');

  // Clicking the tab already shown adds no entry
  const h1 = w.history.length; await click(d.querySelector('.tabs [data-v="portefeuille"]'));
  assert.strictEqual(w.history.length, h1, 'no duplicate entry for the same view');
  ok('same view clicked twice = no new entry');

  assert.deepStrictEqual(errors, [], 'no script error');
  console.log(`---- ${n} ok`);
})().catch((e) => { console.error('FAIL ' + e.message); process.exit(1); });
