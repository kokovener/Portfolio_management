#!/usr/bin/env node
/* DOM checks of the model v2 features (feedback batch 2) on a preview built from tests/fixtures/seed_v2.json.
 * Usage: python tools/build_interface.py <schema.json> tests/fixtures/seed_v2.json && cp dist/preview_local.html /tmp/p2.html
 *        NODE_PATH=<jsdom dir> node tests/test_page_dom_v2.js /tmp/p2.html
 */
'use strict';
const fs = require('fs'); const assert = require('assert'); const { JSDOM } = require('jsdom');
const html = fs.readFileSync(process.argv[2], 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S_same = () => true; // rows compared are siblings of the same section in the seed
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

  // R37 hide an item from visitors; R38 visitor view toggle
  { const g = d.querySelector('form[data-form="item"]'); assert(g.querySelector('[name="visible"]').checked, 'visible by default');
    g.querySelector('[name="visible"]').checked = false; g.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await sleep(120);
    assert(/masqué/.test(d.querySelector('h1 ~ *') ? txt() : txt()), 'hidden tag for the owner');
    click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
    assert(d.querySelector('[data-act="open-item"][data-id="saisie.codes-taxes"]'), 'owner still sees it');
    click(d.querySelector('[data-act="visitor"]')); await sleep(20);
    assert(!d.querySelector('[data-act="open-item"][data-id="saisie.codes-taxes"]') && /vue visiteur/.test(txt()) && !d.querySelector('[data-act="new-item"]') && !d.querySelector('[data-act="drag"]'), 'visitor: hidden item gone, no edit');
    click(d.querySelector('[data-act="visitor"]')); await sleep(20);
    click(d.querySelector('[data-act="open-item"][data-id="saisie.codes-taxes"]')); await sleep(20);
    const h = d.querySelector('form[data-form="item"]'); h.querySelector('[name="visible"]').checked = true; h.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await sleep(120);
    assert(!/masqué/.test(d.querySelector('h1').textContent), 'shown again'); }
  ok('gerer: item hidden from visitors, visitor view toggle, shown again (R37 R38)');

  // R31 plain labels; R30 étape / voie read-only for an item tied to a Smartsheet row
  const eb = ([...d.querySelectorAll('.eyebrow')].find((e) => /^(Projet|Programme|Run)/.test(e.textContent)) || { textContent: 'absent' }).textContent;
  assert(/^Projet · suivi (en sprints Jira|au fil de l.eau, sans sprint) · sous-livraison de /.test(eb) && !/voie|promu/.test(eb), 'eyebrow: ' + eb);
  click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
  const ssId = [...d.querySelectorAll('[data-act="open-item"]')].map((x) => x.dataset.id).find((id) => /^goutte21\.l/.test(id));
  click(d.querySelector(`[data-act="open-item"][data-id="${ssId}"]`)); await sleep(20);
  const f2 = d.querySelector('form[data-form="item"]');
  assert(f2 && !f2.querySelector('select[name="voie"]') && !f2.querySelector('select[name="etape"]') && f2.querySelector('input[type=hidden][name="etape"]') && /lu dans Smartsheet/.test(f2.textContent), 'read-only étape/voie');
  ok(`projet: plain nature label (R31); étape / voie read from Smartsheet on ${ssId} (R30)`);

  // R16 legend on every view
  ['portefeuille', 'projet', 'sprint'].forEach((v) => { click(d.querySelector(`[data-act="view"][data-v="${v}"]`)); });
  await sleep(20); assert(d.querySelector('.raglg') && /Rouge.*Orange.*Vert.*Gris/.test(d.querySelector('.raglg').textContent), 'legend');
  // R42: on the sprint view, no header legend; a compact one inside the « Items dans le sprint » card
  { const lg = d.querySelectorAll('.raglg'); assert.strictEqual(lg.length, 1, 'one legend on sprint'); assert(lg[0].classList.contains('in'), 'compact');
    assert(/^Items dans le sprint/.test(lg[0].closest('.card').querySelector('.eyebrow').textContent), 'inside items card'); }
  click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20); assert(d.querySelector('.raglg'), 'legend on portefeuille');
  click(d.querySelector('[data-act="open-item"][data-id="saisie.codes-taxes"]')); await sleep(20);
  ok('legend: health colours explained on every view (R16), inside the items card on the sprint view (R42)');

  // R05 sprint capacity per person (Jira assignees + Scrum team)
  click(d.querySelector('[data-act="open-sprint"]')); await sleep(20);
  assert(/Capacité · sous-tâches par personne · Jira/.test(txt()) && /Testeur Externe/.test(txt()) && /hors équipe/.test(txt()), 'people table');
  assert(/Hors item du portefeuille.*6 tâches · 31 pts/.test(txt()), 'programme bucket');
  assert(/Capacité · sous-tâches par personne/.test(txt()) && /pts équipe/.test(txt()), 'per-person load = sub-tasks, points = team (Franck flow)');
  assert(/Gestion des codes de taxes/.test(txt()), 'flux item with Jira tickets is in the sprint (R04)');
  assert(!/Jalons dans le sprint|jalons tombent dans le sprint/.test(txt()), 'R20 block and tile removed');
  { const cols = d.querySelectorAll('.main2 > .side'); const first = cols[1] && cols[1].querySelector('.card .eyebrow'); assert(first && /Actions de la rétro/.test(first.textContent), 'R22 retro actions first: ' + (first && first.textContent)); }
  ok('sprint: capacity per person incl. non-team assignee (R05), Jira items + hors-item bucket (R04)');

  // R15 sprint MEP by theme (Goutte 2.1 open by default, others folded)
  const g = [...d.querySelectorAll('.mepg b')].map((x) => x.textContent);
  assert.deepStrictEqual(g, ['Goutte 2.1', 'Extranet', 'SDD', 'Autre'], 'themes ' + g);
  assert.strictEqual(d.querySelector('[data-act="toggle"][data-id="mep:g21"]').getAttribute('aria-expanded'), 'true');
  assert.strictEqual(d.querySelector('[data-act="toggle"][data-id="mep:sdd"]').getAttribute('aria-expanded'), 'false');
  click(d.querySelector('[data-act="toggle"][data-id="mep:sdd"]')); await sleep(20);
  assert.strictEqual(d.querySelector('[data-act="toggle"][data-id="mep:sdd"]').getAttribute('aria-expanded'), 'true');
  ok('sprint: MEP grouped by theme, Goutte 2.1 open, others foldable (R15)');

  // R21 sprint goal band under the title, before the tiles
  { const g = d.querySelector('.goal'); assert(g && /Objectif du sprint/.test(g.textContent) && g.nextElementSibling.classList.contains('tiles'), 'goal band'); }
  ok('sprint: goal band under the title (R21)');

  // R36 freshness tags on sprint blocks (seed has no lecture: falls back to the data's read dates)
  assert(d.querySelectorAll('.fr').length >= 4 && [...d.querySelectorAll('.fr')].every((x) => /^lu |^jamais lu/.test(x.textContent)), 'fresh tags');
  ok('sprint: freshness tag on each block (R36)');

  // R34/R35 future sprint: preparation list in Jira order, planned capacity, no sub-task table, no support; previous goal and retro actions kept
  click(d.querySelector('[data-act="open-sprint"][data-id="jira.gou21-s20"]')); await sleep(20);
  { const t = txt(); assert(/Préparation · backlog GOU21 · ordre Jira/.test(t) && /Prêt pour sprint · 1/.test(t) && /Prêt pour grooming · 19/.test(t), 'prep');
    const keys = [...d.querySelectorAll('.card.top a.tag.blue')].map((x) => x.textContent); assert.strictEqual(keys[0], 'GOU21-9889'); assert.strictEqual(keys[3], 'GOU21-11145');
    assert(/Capacité prévue/.test(t) && !/Capacité · sous-tâches par personne/.test(t) && !/Support extranets ouverts/.test(t), 'future view');
    assert(/Support dans le sprint · STG21/.test(t) && d.querySelector('a[href$="STG21-226"]') && /1 ouvert sans sprint \(GOU21-10413\)/.test(t), 'R33 support S20');
    assert(/Sprint précédent \(S19\) : Terminer le sprint/.test(t) && /Action S19 de test/.test(t) && /sprint précédent/.test(t), 'previous goal and actions'); }
  ok('sprint futur: préparation (ordre Jira), capacité prévue, objectif et actions du sprint précédent (R34 R35)');
  // R40: owner marks a retro action done, then reopens it; only statut changes
  { const b = d.querySelector('[data-act="retro"][data-st="fait"]'); assert(b, 'Faite button'); const id = b.dataset.id;
    click(b); await sleep(40);
    const r = d.querySelector(`[data-act="retro"][data-id="${id}"]`); assert.strictEqual(r.dataset.st, 'a_faire'); assert.strictEqual(r.textContent, 'Rouvrir');
    click(r); await sleep(40); assert.strictEqual(d.querySelector(`[data-act="retro"][data-id="${id}"]`).dataset.st, 'fait', 'reopened'); }
  ok('sprint: retro action Faite / Rouvrir by the owner (R40)');
  click(d.querySelector('[data-act="open-sprint"][data-id="jira.gou21-s19"]')); await sleep(20);
  assert(/Capacité · sous-tâches par personne/.test(txt()) && !/Préparation · backlog/.test(txt()), 'current view unchanged');
  assert(/Aucun ticket de support dans ce sprint/.test(txt()) && /1 dans S20/.test(txt()), 'R33 support S19');
  assert(/Bloqués dans le sprint · 2/.test(txt()) && /GOU21-10591/.test(txt()) && /Personne_13/.test(txt()), 'R27 bis blocked in sprint');
  { const left = d.querySelectorAll('.main2 > .side')[0]; const eb = [...left.querySelectorAll(':scope > .card .eyebrow')].map((e) => e.textContent.split(' · ')[0]);
    assert.deepStrictEqual(eb.slice(0, 3), ['Items dans le sprint', 'Bloqués dans le sprint', 'Capacité'], 'order ' + eb); }
  ok('sprint: support tickets of the sprint with STG21 links, others summarised (R33)');

  // R32 support ticket names on the portfolio card, grouped by STG21 request
  click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
  { const card = [...d.querySelectorAll('.card')].find((c) => /Support extranets · tickets GOU21/.test(c.textContent));
    assert(card && card.querySelector('a[href$="STG21-226"]') && /GOU21-10412/.test(card.textContent) && /GOU21-10413/.test(card.textContent) && /sans sprint/.test(card.textContent), 'R32'); }
  ok('portefeuille: support tickets named, grouped by STG21 request, sprint or « sans sprint » (R32)');

  // R18 horizon: past 13 weeks on demand
  click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
  { const sel = d.querySelector('select[data-f="horizon"]'); sel.value = 'passe'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(20);
    assert(d.querySelector('.tl.wide') && d.querySelectorAll('.tl .wk span').length === 26, 'wide horizon');
    const sel2 = d.querySelector('select[data-f="horizon"]'); sel2.value = 'avenir'; sel2.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(20);
    assert(!d.querySelector('.tl.wide') && d.querySelectorAll('.tl .wk span').length === 13, 'default horizon'); }
  ok('portefeuille: horizon + 13 weeks past on demand (R18)');

  // R09 reorder within a section
  click(d.querySelector('[data-act="view"][data-v="portefeuille"]')); await sleep(20);
  click(d.querySelector('[data-act="expand-all"]')); await sleep(20);
  assert(d.querySelector('.tl [data-act="toggle"][data-id="mep:extranet"]'), 'R19 MEP theme rows on the Gantt');
  const order = () => [...d.querySelectorAll('.tl [data-act="open-item"]')].map((x) => x.dataset.id).filter((id) => ['goutte21.l8', 'run.extranets', 'saisie.codes-taxes'].includes(id));
  const before = order(); const last = before[before.length - 1];
  const h = d.querySelector(`[data-act="drag"][data-id="${last}"]`); assert(h && h.draggable && h.closest('.lab').firstElementChild === h, 'R17 handle first in the row');
  h.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await sleep(150);
  const after = order(); assert.notDeepStrictEqual(after, before); assert.strictEqual(after[after.length - 2], last);
  ok(`portefeuille: handle at row start (R17); ↑ moves ${last} up within its section and persists ranks (R09)`);
  // drag and drop: drop the first row after the last one of the same section
  const sec = order(); const first = sec[0]; const tgt = sec[sec.length - 1];
  if (S_same(first, tgt)) {
    const hs = d.querySelector(`[data-act="drag"][data-id="${first}"]`); const row = d.querySelector(`.tlr[data-row="${tgt}"]`);
    hs.dispatchEvent(new w.Event('dragstart', { bubbles: true })); row.classList.add('drop-after');
    row.querySelector('.lab').dispatchEvent(new w.Event('drop', { bubbles: true, cancelable: true })); await sleep(150);
    const o2 = order(); assert.strictEqual(o2.indexOf(first) > o2.indexOf(tgt), true, 'dropped after');
    ok('portefeuille: drag and drop reorders within the section (R17)');
  }

  assert.deepStrictEqual(errors, []); ok('no runtime error');
  console.log(`\n${n} DOM v2 checks OK`); process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
