#!/usr/bin/env node
/* Revue UX v1 (03_Interface/Revue_UX_v1.md, decisions Franck 2026-10-29): DOM checks, one block per U.
 * Fixtures: seed_r49.json (portfolio + project, base of 2026-10-29, no team records) and seed_v2.json (sprint view).
 * Usage: build both previews (see tests/run_all.sh), then
 *        NODE_PATH=<jsdom dir> node tests/test_page_dom_ux.js <p49.html> <p2.html>
 */
'use strict';
const fs = require('fs'); const assert = require('assert'); const { JSDOM } = require('jsdom'); const frozenClock = require('./frozen_clock');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(file) {
  const errors = [];
  const beforeParse = frozenClock(); // fixtures = base of 2026-10-29: date-relative checks stay true later
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), { runScripts: 'dangerously', url: 'https://local.test/', pretendToBeVisual: true, beforeParse });
  dom.window.addEventListener('error', (e) => errors.push(e.message)); dom.window.scrollTo = () => {};
  await sleep(150);
  const w = dom.window; const d = w.document;
  return { w, d, errors, txt: () => d.querySelector('#app').textContent, click: async (el) => { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(20); } };
}
let n = 0; const ok = (m) => { n++; console.log('ok  ' + m); };

(async () => {
  const P = await open(process.argv[2]);
  const { d, txt } = P;

  // U08: each count names its scope (tile = projects without runs, funnel = projects + runs, Terminé 90 days, MEP since Monday)
  const tile = d.querySelector('.tile.t1').textContent;
  assert(/^10projets actifs \(hors runs\) · \+ 2 runs actifs · 1 programme$/.test(tile.trim()), 'tile scope: ' + tile);
  const stages = [...d.querySelectorAll('.stage')].map((s) => s.textContent.replace(/\s+/g, ' ').trim());
  assert(stages.some((s) => /^12 ?Actif dont 2 runs$/.test(s)), 'funnel actif: ' + stages);
  assert(stages.some((s) => /^0 ?Terminé depuis 90 j · 2 au total$/.test(s)), 'funnel terminé: ' + stages);
  const mh = [...d.querySelectorAll('.grp')].find((g) => /^MEP /.test(g.textContent)).textContent;
  assert(/\d+ depuis le lundi 26 oct\., dont \d+ à venir · 1 passée encore « planifiée »/.test(mh), 'MEP header: ' + mh);
  assert(d.querySelector('.tl .ms.bad[title*="MEP non confirmée"]') || /non confirmée/.test(txt()), 'past planifiée MEP flagged');
  ok('U08: tile, funnel and MEP counts name their scope; past « planifiée » MEP flagged');

  // U01: sticky header carries the tabs and the freshness line
  const hdr = d.querySelector('header.hdr');
  assert(hdr && hdr.querySelector('.tabs') && P.w.getComputedStyle(hdr).position === 'sticky', 'sticky header with tabs');
  ok('U01: header is sticky and carries tabs + freshness');

  // U02: health legend = one compact line, rules on hover
  const lg = d.querySelector('.raglg');
  assert(lg && lg.classList.contains('line') && !/jalon dépassé/.test(lg.textContent) && /jalon dépassé/.test(lg.querySelector('[title^="Rouge"]').title), 'compact legend');
  ok('U02: legend in one compact line, rule of each colour on hover');

  // U06: one freshness line (latest source read + Monday snapshot), no competing « base lue »
  const fl = hdr.querySelector('.row .muted').textContent;
  assert(/^Données du 29 oct\. · \d+h\d+ (EDT|EST) · instantané du lundi 27 oct\./.test(fl) && !/base lue|sources OK/.test(hdr.textContent), 'freshness line: ' + fl);
  ok('U06: one freshness line « Données du … · instantané du lundi … »');

  // U13: funnel right under the tiles, before the grid
  { const kids = [...d.querySelector('#app').children]; const it = kids.findIndex((x) => x.classList.contains('tiles')); const ifu = kids.findIndex((x) => x.querySelector && x.querySelector('.funnel')); const ig = kids.findIndex((x) => x.classList.contains('main2'));
    assert(it >= 0 && ifu === it + 1 && ig > ifu, `order tiles ${it} funnel ${ifu} grid ${ig}`); }
  ok('U13: admission funnel right under the tiles');

  // U09: tiles and stages filter the grid; the chip clears it; « bloqués » alert leads to the sprint view
  { const rows = () => d.querySelectorAll('.tl .tlr[data-row]').length; const before = rows();
    await P.click(d.querySelector('.tile[data-f="alertes"]'));
    const ids = [...d.querySelectorAll('.tl .tlr[data-row]')].map((r) => r.dataset.row);
    assert(ids.includes('goutte21.l8') && ids.includes('goutte21.l8b') && ids.length <= 4 && /Filtre : items rattachés à une alerte/.test(txt()), 'alert filter: ' + ids);
    await P.click(d.querySelector('.stage[data-f="qualifie"]'));
    assert.strictEqual(rows(), 17, 'qualifié stage = 17 rows');
    await P.click(d.querySelector('.chip.on [data-act="focus"]'));
    assert.strictEqual(rows(), before, 'chip clears the filter');
    const kd = new P.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }); d.querySelector('.tile[data-f="projets"]').dispatchEvent(kd); await sleep(20);
    assert.strictEqual(rows(), 12, 'Enter on the projets tile = 12 actifs');
    await P.click(d.querySelector('.tile[data-f="projets"]')); assert.strictEqual(rows(), before, 'second click clears'); }
  ok('U09: tiles / funnel stages filter the grid (click or Enter), chip clears');

  // U10: wider label column, names wrap on two lines instead of an ellipsis
  { const a = d.querySelector('.tl .lab a'); const cs = P.w.getComputedStyle(a);
    assert(/310px/.test(P.w.getComputedStyle(d.querySelector('.tl .tlr')).gridTemplateColumns) && cs.whiteSpace === 'normal', 'label column 310 px, wrapping'); }
  ok('U10: item names wrap on two lines in a 310 px label column');

  // U11: Expert G1 milestones 26, 27, 27, 28 oct. share one diamond (badge 4); 4 nov. x2 (badge 2); 11 nov. alone
  { const r = d.querySelector('.tlr[data-row="feed.expertg1"]');
    assert.strictEqual(r.querySelectorAll('.ms').length, 3, 'three diamonds');
    assert.deepStrictEqual([...r.querySelectorAll('.msn')].map((x) => x.textContent), ['4', '2'], 'count badges');
    assert((r.querySelector('.msn').title.match(/\n/g) || []).length === 3, 'hover lists the four milestones'); }
  ok('U11: milestones ≤ 2 days apart merged into one diamond with a count badge');

  // U05: no technical jargon in visible text (row ids, adapter names, rule codes); details on hover / in « Détails techniques »
  await P.click(d.querySelector('[data-act="open-item"][data-id="goutte21.l8"]'));
  const vis = () => { const c = d.querySelector('#app').cloneNode(true); c.querySelectorAll('details.diag').forEach((x) => x.remove()); return c.textContent; };
  assert(/Paie|L8/.test(vis()), 'project L8 open');
  assert(!/\/row\/\d|adaptateur-|\((R|D)\d+\)/.test(vis()), 'no jargon: ' + (vis().match(/.{30}(\/row\/\d|adaptateur-|\((R|D)\d+\)).{10}/) || [''])[0]);
  assert(d.querySelector('[title^="Détails techniques"]') && /Détails techniques/.test(d.querySelector('details.diag summary').textContent), 'details kept on hover');
  ok('U05: project view free of row ids, adapter names and rule codes; details on hover');

  // U14: health banner at the top of the project: colour, reason, next action
  { const b = d.querySelector('.bnr'); assert(b && b.classList.contains('rouge') && /Rouge/.test(b.textContent) && /risque 16 ≥ 15/.test(b.textContent) && /→/.test(b.textContent), 'banner: ' + (b && b.textContent));
    const kids = [...d.querySelector('#app').children]; assert(kids.indexOf(b) < kids.findIndex((x) => x.classList.contains('main2')), 'banner above the cards'); }
  ok('U14: project health banner (colour, reason, next action) above the cards');

  // U15: « Modifier » opens Gérer in a modal; sources and history stay in the reading column; Échap / backdrop close it
  { assert(!d.querySelector('form[data-form]') && /Sources de ce projet/.test(txt()), 'reading view without form');
    await P.click(d.querySelector('[data-act="modal"]'));
    const m = d.querySelector('.modal-bg .modal[role="dialog"][aria-modal="true"]'); assert(m && m.querySelector('form[data-form="item"]'), 'modal with the item form');
    d.dispatchEvent(new P.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(20); assert(!d.querySelector('.modal'), 'Échap closes');
    await P.click(d.querySelector('[data-act="modal"]')); await P.click(d.querySelector('.modal')); assert(d.querySelector('.modal'), 'click inside keeps it');
    await P.click(d.querySelector('.modal-bg')); assert(!d.querySelector('.modal'), 'backdrop closes'); }
  ok('U15: Gérer in a « Modifier » modal (Échap, ✕, backdrop)');

  // Manual MEP (Franck 30 Oct.): « + MEP » tab in the modal, card « MEP · n » in the project, read tickets refused
  { const cardMep = () => [...d.querySelectorAll('.card')].find((x) => x.querySelector('.eyebrow') && /^MEP · \d+$/.test(x.querySelector('.eyebrow').textContent.trim()));
    const nMep = () => +cardMep().querySelector('.eyebrow').textContent.trim().match(/(\d+)$/)[1];
    const n0 = nMep();
    await P.click(d.querySelector('[data-act="modal"]')); await P.click(d.querySelector('[data-act="gtab"][data-t="meps"]'));
    const fill = (f, vals) => Object.entries(vals).forEach(([k, v]) => { f.querySelector(`[name="${k}"]`).value = v; });
    let f = d.querySelector('form[data-form="meps"]'); assert(f, 'MEP form');
    fill(f, { libelle: 'Bascule DNS préprod', date: '2026-11-04', statut: 'planifiee', systeme: 'Infra (SQL, serveurs)', ticket: 'plq-9999', responsable: 'Personne_04' });
    f.dispatchEvent(new P.w.Event('submit', { bubbles: true, cancelable: true })); await sleep(120);
    const c = cardMep(); assert(c && nMep() === n0 + 1 && /Bascule DNS préprod/.test(c.textContent) && /PLQ-9999/.test(c.textContent) && /Saisie/.test(c.textContent), 'MEP card: ' + (c && c.textContent));
    assert(c.querySelector('[data-act="edit"][data-col="meps"]'), 'manual MEP editable');
    const read = (JSON.parse(fs.readFileSync(require('path').join(__dirname, 'fixtures', 'seed_r49.json'), 'utf8')).meps || []).find((m) => m.ticket && m.source.systeme !== 'saisie');
    if (read) {
      await P.click(d.querySelector('[data-act="modal"]')); await P.click(d.querySelector('[data-act="gtab"][data-t="meps"]'));
      f = d.querySelector('form[data-form="meps"]'); fill(f, { libelle: 'doublon', date: '2026-11-05', systeme: 'G1', ticket: read.ticket });
      f.dispatchEvent(new P.w.Event('submit', { bubbles: true, cancelable: true })); await sleep(120);
      assert(nMep() === n0 + 1, 'read ticket refused');
      d.dispatchEvent(new P.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(20);
    } }
  ok('manual MEP: « + MEP » writes a saisie MEP shown in the project card; a ticket already read is refused');

  // U16: sub-deliveries listed in the project (name, health, stage) and clickable
  { const c = [...d.querySelectorAll('.card')].find((x) => /^Livraisons · 4/.test(x.textContent.trim()));
    assert(c && c.querySelectorAll('.lrow').length === 4 && c.querySelector('[data-act="open-item"][data-id="goutte21.l8d"]') && /Qualifié/.test(c.textContent), 'livraisons card'); }
  ok('U16: Livraisons block lists the 4 children of L8 with health and stage');

  // U17: stage stepper is a read-only list (no button, current step marked)
  { const st = d.querySelector('ol.steps'); assert(st && !st.querySelector('button,a,[data-act]') && st.querySelector('[aria-current="step"]').textContent === 'Actif', 'stepper'); }
  ok('U17: read-only stepper, current stage aria-current');

  assert(!P.errors.length, 'no JS error: ' + P.errors.join(' | '));

  const Q = await open(process.argv[3]);
  // U12: one line per alert (type · item · action), the full text with the Jira keys folded under it
  { const lis = [...Q.d.querySelectorAll('ul.al > li')]; assert(lis.length > 0 && lis.every((li) => li.querySelector('details > summary')), 'alerts as folded lines');
    const bl = lis.find((li) => /^bloqués/.test(li.querySelector('summary').textContent)); const sm = bl.querySelector('summary').textContent;
    assert(!/GOU21-\d/.test(sm) && /· voir le sprint$/.test(sm) && /GOU21-\d/.test(bl.querySelector('details > p').textContent), 'bloqués line: ' + sm); }
  ok('U12: alerts on one line each, keys folded');
  // fresh review fixes: banner shows item alerts that are not health reasons; modal focus; visitor toggle closes the modal
  { await Q.click(Q.d.querySelector('[data-act="open-item"][data-id="goutte21.l8"]'));
    assert(/Alerte phase/.test(Q.d.querySelector('.bnr').textContent), 'phase alert in the L8 banner');
    const mb = Q.d.querySelector('[data-act="modal"]'); await Q.click(mb); assert(Q.d.activeElement.closest('.modal'), 'focus inside the modal');
    Q.d.dispatchEvent(new Q.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(20);
    assert(Q.d.activeElement && Q.d.activeElement.dataset.act === 'modal', 'focus back on Modifier');
    await Q.click(Q.d.querySelector('[data-act="modal"]')); await Q.click(Q.d.querySelector('[data-act="visitor"]')); await Q.click(Q.d.querySelector('[data-act="visitor"]'));
    assert(!Q.d.querySelector('.modal'), 'visitor round trip closes the modal');
    await Q.click(Q.d.querySelector('[data-act="view"][data-v="portefeuille"]')); }
  ok('review fixes: item alerts in the banner, modal focus in/out, visitor toggle resets the modal');
  { const l = Q.d.querySelector('ul.al [data-act="open-sprint"]'); assert(l, 'bloqués alert links to the sprint'); await Q.click(l); assert(/Bloqués dans le sprint/.test(Q.txt()), 'sprint view opened'); }
  ok('U09: « bloqués » alert opens the sprint view');
  await Q.click(Q.d.querySelector('[data-act="view"][data-v="sprint"]'));
  assert(/non confirmée/.test(Q.txt()), 'sprint MEP past planifiée flagged');
  ok('U08: sprint MEP list flags a past « planifiée » MEP');

  // U18: sprint header says where the sprint stands (S19: 20 oct. → 2 nov., today 29 oct. = J8 / 10)
  { const t = Q.d.querySelector('.tempo').textContent.replace(/\s+/g, ' ');
    assert(/J8 \/ 10 · 2 j ouvrés restants/.test(t) && /\d+ % des sous-tâches faites/.test(t) && Q.d.querySelector('.tempo-b'), 'tempo: ' + t);
    await Q.click([...Q.d.querySelectorAll('[data-act="open-sprint"]')].find((b) => /^S20/.test(b.textContent)));
    assert(/commence dans \d+ j ouvrés?/.test(Q.d.querySelector('.tempo').textContent), 'future sprint');
    await Q.click([...Q.d.querySelectorAll('[data-act="open-sprint"]')].find((b) => /^S19/.test(b.textContent))); }
  ok('U18: sprint header J / total, days left, % sub-tasks done');

  // U19 (trial): remaining sub-tasks per available day as a bar, relative to the team
  { const bars = Q.d.querySelectorAll('.ptab .cbar'); assert(bars.length === 1 && /Sous-tâches restantes par jour dispo/.test(Q.d.querySelector('.ptab thead').textContent) && /0,4 \/ j/.test(bars[0].textContent) && /médiane équipe/.test(bars[0].title), 'charge bar'); }
  ok('U19: capacity bar per person (trial), ratio and team median on hover');

  // U20: sprint tiles neutral, coloured edge only past a threshold
  { const ts = [...Q.d.querySelectorAll('.tiles .tile')]; assert(ts.length === 3 && ts.every((t) => t.classList.contains('nt') && !/\bt[1-4]\b/.test(t.className)), 'neutral tiles');
    assert(!ts[2].classList.contains('warn'), 'reserve 15 % = no colour'); }
  ok('U20: sprint tiles neutral, colour only past a threshold');

  // U21: open retro actions first; done ones folded; « rouvrir » is a link, « Faite » a button
  { const c = [...Q.d.querySelectorAll('.card')].find((x) => /Actions de la rétro/.test(x.textContent));
    const b = c.querySelector('button[data-act="retro"][data-st="fait"]'); assert(b, 'Faite button on an open action');
    await Q.click(b); await sleep(40);
    const c2 = [...Q.d.querySelectorAll('.card')].find((x) => /Actions de la rétro/.test(x.textContent));
    const det = c2.querySelector('details.done-l'); assert(det && !det.open && /Faites · 1/.test(det.textContent) && det.querySelector('a[data-act="retro"][data-st="a_faire"]'), 'done folded with a rouvrir link');
    await Q.click(det.querySelector('a[data-act="retro"]')); await sleep(40); }
  ok('U21: retro actions — open first, done folded, rouvrir as a link');

  assert(!Q.errors.length, 'no JS error: ' + Q.errors.join(' | '));
  console.log(`${n} checks ok`);
})().catch((e) => { console.error(e); process.exit(1); });
