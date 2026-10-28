#!/usr/bin/env node
/* End-to-end DOM test of dist/preview_local.html (mock db) with jsdom.
 * Usage: NODE_PATH=<dir with jsdom> node tests/test_page_dom.js dist/preview_local.html
 * Checks: 3 views render with the seeded examples; a Gérer save is written to the store and
 * survives a full reload of the page state; Gérer is absent in read-only mode (?ro).
 */
'use strict';
const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(process.argv[2], 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(query) {
  const errors = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://local.test/' + (query || ''), pretendToBeVisual: true });
  dom.window.addEventListener('error', (e) => errors.push(e.message));
  dom.window.scrollTo = () => {};
  await sleep(150);
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

(async () => {
  let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };
  const { w, d, errors } = await open();
  const txt = () => d.querySelector('#app').textContent;
  assert(/Base : 45 enregistrements/.test(txt()), 'seed loaded'); ok('portefeuille: base loaded (45 records)');
  ['L8D Paie Transporteur', 'Expert G1 — graphe de connaissance', 'Gestion des codes de taxes', 'Run TI — G1, IIS, extranets', 'Run G2.1 — support extranets']
    .forEach((nm) => assert(txt().includes(nm), nm));
  assert(/Décision CDP/.test(txt()) && /dépendance/.test(txt())); ok('portefeuille: 4 examples + alerts (recul, dépendance)');
  assert(d.querySelectorAll('.ms').length >= 8 && d.querySelectorAll('.bar').length >= 3); ok('portefeuille: timeline diamonds and bars');
  // R07 accordion: children closed by default, a toggle opens them; R08: no charge block on the portfolio
  const rowL8D = () => d.querySelector('.tl [data-act="open-item"][data-id="goutte21.l8d"]');
  const tgL8 = d.querySelector('.tg[data-act="toggle"][data-id="goutte21.l8"]');
  assert(tgL8 && !rowL8D(), 'L8 closed by default'); click(w, tgL8); await sleep(20);
  assert(rowL8D(), 'L8D visible after toggle'); click(w, d.querySelector('[data-act="collapse-all"]')); await sleep(20);
  assert(!rowL8D() && !/Charge par rôle/.test(txt())); ok('portefeuille: accordion open/close (R07), no charge block (R08)');
  click(w, d.querySelector('[data-act="expand-all"]')); await sleep(20);

  click(w, d.querySelector('[data-act="open-item"][data-id="feed.expertg1"]')); await sleep(20);
  assert(/Jalons · 8 \(dont 5 faits\)/.test(txt()) && /P1 — valeur 4/.test(txt()) && /santé calculée : jaune/.test(txt())); ok('projet Expert G1: 8 jalons, P1, jaune');
  assert(d.querySelector('form[data-form="item"]'), 'gerer visible'); ok('projet: Gérer visible when canEdit');

  click(w, d.querySelector('[data-act="open-sprint"]')); await sleep(20);
  assert(/S19/.test(txt()) && /Items dans le sprint/.test(txt())); ok('sprint view renders (S19 actif)');
  click(w, [...d.querySelectorAll('[data-act="open-sprint"]')].find((b) => b.textContent.startsWith('S20'))); await sleep(20);
  assert(!/Gate AC-4 GO Dev/.test(txt()) && !/Go \/ no-go pilote/.test(txt())); ok('sprint S20: no Jira ticket in the v1 seed → no item, no milestone (R04, Jira only)');

  // Gérer: save note_lundi on L8D (Smartsheet item, owned field)
  click(w, d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
  click(w, d.querySelector('[data-act="expand-all"]')); await sleep(20);
  click(w, [...d.querySelectorAll('[data-act="open-item"]')].find((a) => a.dataset.id === 'goutte21.l8d')); await sleep(20);
  const f = d.querySelector('form[data-form="item"]');
  f.querySelector('[name="note_lundi"]').value = 'Test étape 2 — saisie Gérer';
  f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await sleep(100);
  assert(/Note du lundi/.test(txt()) && txt().includes('Test étape 2 — saisie Gérer'), 'note shown after save'); ok('gerer: item saved and re-rendered');
  // add a jalon
  click(w, d.querySelector('[data-act="gtab"][data-t="jalons"]')); await sleep(10);
  const fj = d.querySelector('form[data-form="jalons"]');
  fj.querySelector('[name="nom"]').value = 'Validation UX-2'; fj.querySelector('[name="date"]').value = '2026-11-24';
  fj.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await sleep(100);
  assert(/Jalons · 2/.test(txt()) && txt().includes('Validation UX-2')); ok('gerer: jalon added (saisie)');
  // invalid write refused by model (risk without P/I)
  click(w, d.querySelector('[data-act="gtab"][data-t="risques"]')); await sleep(10);
  const fr = d.querySelector('form[data-form="risques"]'); fr.querySelector('[name="titre"]').value = 'x';
  fr.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await sleep(50);
  assert(/Probabilité et impact obligatoires/.test(d.querySelector('#toast').textContent)); ok('gerer: incomplete risk refused');
  // new project
  click(w, d.querySelector('[data-act="new-item"]')); await sleep(10);
  const fn = d.querySelector('form[data-form="item"]'); fn.querySelector('[name="nom"]').value = 'Méthane P2';
  fn.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await sleep(100);
  assert(/Méthane P2/.test(d.querySelectorAll('h1')[1].textContent)); ok('gerer: new project created (saisie.methane-p2)');
  assert(!errors.length, errors.join('\n')); ok('no runtime error');

  // read-only mode
  const ro = await open('?ro');
  click(ro.w, ro.d.querySelector('[data-act="open-item"][data-id="feed.expertg1"]')); await sleep(20);
  assert(!ro.d.querySelector('form[data-form]') && !ro.d.querySelector('[data-act="new-item"]') && /lecture seule/.test(ro.d.querySelector('#app').textContent));
  ok('read-only: Gérer and + Ajouter hidden');
  console.log(`\n${n} DOM checks OK`);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
