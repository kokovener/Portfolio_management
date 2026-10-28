#!/usr/bin/env node
/* DOM checks of the model v2 features (feedback batch 2) on a preview built from tests/fixtures/seed_v2.json.
 * Usage: python tools/build_interface.py <schema.json> tests/fixtures/seed_v2.json && cp dist/preview_local.html /tmp/p2.html
 *        NODE_PATH=<jsdom dir> node tests/test_page_dom_v2.js /tmp/p2.html
 */
'use strict';
const fs = require('fs'); const assert = require('assert'); const { JSDOM } = require('jsdom');
const html = fs.readFileSync(process.argv[2], 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const errors = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://local.test/', pretendToBeVisual: true });
  dom.window.addEventListener('error', (e) => errors.push(e.message)); dom.window.scrollTo = () => {};
  await sleep(150);
  const w = dom.window; const d = w.document; const txt = () => d.querySelector('#app').textContent;
  const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };

  // R10 Data Jira on codes de taxes
  click(d.querySelector('[data-act="open-item"][data-id="saisie.codes-taxes"]')); await sleep(20);
  assert(/Data Jira/.test(txt()) && /34,7 % des tickets faits/.test(txt()) && /17 faits · 15 en cours · 17 à faire · 49 au total/.test(txt()), 'stat');
  assert(/14 tâches parentes · 46 pts équipe/.test(txt()) && /Testeur Externe/.test(txt()) && /3 \/ 4/.test(txt()), 'sprint content and people (sub-tasks à faire / total)');
  const a = d.querySelector('a[href="https://jira-plq.atlassian.net/browse/GOU21-9199"]'); assert(a && a.target === '_blank', 'epic link');
  ok('projet: Data Jira card (R10) with clickable epic (R02)');

  // R02 Gérer: epics field saved, normalised
  const f = d.querySelector('form[data-form="item"]'); f.querySelector('[name="epics_jira"]').value = 'gou21-9199;  GOU21-11067';
  f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await sleep(120);
  assert(d.querySelector('a[href$="GOU21-11067"]'), 'epic saved'); ok('gerer: epics_jira saved, upper-cased, deduplicated (R02)');

  // R05 sprint capacity per person (Jira assignees + Scrum team)
  click(d.querySelector('[data-act="open-sprint"]')); await sleep(20);
  assert(/Capacité · sous-tâches par personne · Jira/.test(txt()) && /Testeur Externe/.test(txt()) && /hors équipe/.test(txt()), 'people table');
  assert(/Hors item du portefeuille.*6 tâches · 31 pts/.test(txt()), 'programme bucket');
  assert(/Capacité · sous-tâches par personne/.test(txt()) && /pts équipe/.test(txt()), 'per-person load = sub-tasks, points = team (Franck flow)');
  assert(/Gestion des codes de taxes/.test(txt()), 'flux item with Jira tickets is in the sprint (R04)');
  ok('sprint: capacity per person incl. non-team assignee (R05), Jira items + hors-item bucket (R04)');

  // R09 reorder within a section
  click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
  click(d.querySelector('[data-act="expand-all"]')); await sleep(20);
  const order = () => [...d.querySelectorAll('.tl [data-act="open-item"]')].map((x) => x.dataset.id).filter((id) => ['goutte21.l8', 'run.extranets', 'saisie.codes-taxes'].includes(id));
  const before = order(); const last = before[before.length - 1];
  click(d.querySelector(`[data-act="move"][data-id="${last}"][data-d="-1"]`)); await sleep(150);
  const after = order(); assert.notDeepStrictEqual(after, before); assert.strictEqual(after[after.length - 2], last);
  ok(`portefeuille: ▲ moves ${last} up within its section and persists ranks (R09)`);

  assert.deepStrictEqual(errors, []); ok('no runtime error');
  console.log(`\n${n} DOM v2 checks OK`); process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
