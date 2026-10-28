#!/usr/bin/env node
/* Jira GOU21 "data" adapter (model v2, feedback batch 2 — R03, R04, R05, R10).
 *
 * Usage: node tools/adapt_jira_data.js <raw.json> <base_dir> <out_dir>
 *   raw.json   read by Claude through the Atlassian connector (fiche Adaptateur_Jira_v2 §Data) :
 *              sprint_issues (board 38, last closed + active + next sprint), item_counts (per item, its epics),
 *              support (candidate tickets + their web links)
 *   base_dir   ArtifactData export: items/, personnes/, charges/, stats_jira/ (*.json, "_version" kept if present)
 *              or a sibling versions.json {"<collection>/<id>": n}
 * Writes to out_dir: doc.json (model v2 document, source = jira), batch.json (ArtifactData writes), report.json.
 *
 * Rules:
 *  - An item owns the Jira epics listed in item.epics_jira (entered in Gérer, R02). A sprint ticket whose epic is
 *    owned by no item is charged to the programme (goutte21) and listed as "hors item".
 *  - Load = Jira story points (customfield_10036) per person, sprint and item (charge mode "points", R05);
 *    a ticket without points counts in "tickets" only. People are matched on their name in Team_G2.1;
 *    an unknown assignee keeps its Jira name (charge.nom) and is signalled.
 *  - stat_jira per item with epics: ticket counts of the epics + content of the active sprint (R10).
 *  - Support (R03): a GOU21 ticket is support when one of its web links points to STG21 on plq-supportg2;
 *    open ones are counted per extranet (title rule shared with the MEP adapter) on item run.extranets.
 *  - Never writes Jira; never deletes a db document; a charge or stat not seen any more is reported, not removed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Core = require('../interface/core.js');
const { systemeOf } = require('./adapt_jira.js');

const RE_STG = /plq-supportg2\.atlassian\.net\/.*?\b(STG21-\d+)\b/i;
const PROGRAMME = 'goutte21';
const RUN_SUPPORT = 'run.extranets';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();

function adapt(raw, base, versions) {
  const now = raw.read_at; const today = now.slice(0, 10); const signals = []; const rows = [];
  const src = (ref) => ({ systeme: 'jira', ref, lu_le: now, par: 'adaptateur-jira-data' });
  const out = { charges: [], stats_jira: [], items: [] };

  // ---------- epic -> item (Gérer, R02) ----------
  const epicItem = {};
  base.items.forEach((it) => (it.epics_jira || []).forEach((e) => {
    if (epicItem[e] && epicItem[e] !== it.id) signals.push({ kind: 'epic_double', row: e, texte: `${e} rattachée à ${epicItem[e]} et ${it.id} — gardée sur ${epicItem[e]}` });
    else epicItem[e] = it.id;
  }));
  // ---------- people ----------
  const byName = {}; base.personnes.forEach((p) => { byName[norm(p.nom)] = p; });
  const person = (name) => byName[norm(name)] || null;

  // ---------- R05 load, per Franck's Jira flow (2026-10-28) ----------
  // A parent task (story, task, bug) is assigned to the coordinator and groomed by the TEAM, which sets its points:
  // points are a team measure per item and sprint (charge mode points, no person). The work of a person is the
  // sub-tasks assigned to them (QA, FE, BE, UX, architecture…): per-person load = number of sub-tasks (mode taches).
  // DoD: done from « Prêt pour Preprod » on (Jira category done) — « Annulé » is neither done nor load.
  const issues = raw.sprint_issues.filter((t) => t.status !== 'Annulé');
  const parentEpic = Object.fromEntries(raw.sprint_issues.map((t) => [t.key, t.epic]));
  const horsItem = {};
  const team = {};
  issues.forEach((t) => {
    const item = epicItem[t.epic] || PROGRAMME;
    if (item === PROGRAMME) (horsItem[t.epic || '(sans épopée)'] = horsItem[t.epic || '(sans épopée)'] || new Set()).add(t.key);
    t.sprints.forEach((sid) => {
      const sprint = raw.sprints[String(sid)]; if (!sprint) return;
      const o = team[`${sprint}|${item}`] || (team[`${sprint}|${item}`] = { sprint, item, points: 0, tickets: 0, sansPoints: 0, keys: [] });
      if (typeof t.points === 'number') o.points += t.points; else o.sansPoints++; // only parent tasks and bugs carry points
      o.tickets++; o.keys.push(t.key);
    });
  });
  const sid = (s) => s.replace(/^jira\.gou21-/, '');
  Object.values(team).forEach((o) => out.charges.push({
    id: `jira.${sid(o.sprint)}.equipe.${Core.slug(o.item)}`.slice(0, 80), item: o.item, periode: { type: 'sprint', ref: o.sprint }, role: 'dev',
    nom: 'Équipe', mode: 'points', valeur: o.points, tickets: o.tickets, sans_points: o.sansPoints,
    source: src(`board ${raw.board} · ${o.keys.length} tâche(s) parente(s) : ${o.keys.slice(0, 6).join(', ')}${o.keys.length > 6 ? ' …' : ''}`)
  }));
  const CAT = { done: ['Terminé', 'Prêt pour Preprod', 'En validation preprod', 'Pret pour déploiement en production'],
    new: ['Ouvert', 'Rouvert', 'PrêtPourGrooming✅', 'PrêtPourSprint🚀', 'A Faire'] };
  const agg = {}; const unknown = new Set(); const unknownStatus = new Set(); let orphans = 0;
  (raw.sub_tasks || []).forEach(([key, parent, who, status, sprints]) => {
    if (status === 'Annulé') return;
    if (!(parent in parentEpic)) orphans++;
    const item = epicItem[parentEpic[parent]] || PROGRAMME;
    const etat = CAT.done.includes(status) ? 'faites' : CAT.new.includes(status) ? 'a_faire' : 'en_cours';
    if (etat === 'en_cours' && !['En cours', 'Bloqué', 'En Attente Correction', 'En Revue', 'Résolue', 'Pret pour Test', 'En Test'].includes(status)) unknownStatus.add(status);
    sprints.forEach((s) => {
      const sprint = raw.sprints[String(s)]; if (!sprint) return;
      const w = who || '(non assignée)';
      const o = agg[`${sprint}|${w}|${item}`] || (agg[`${sprint}|${w}|${item}`] = { sprint, who: w, item, n: 0, faites: 0, en_cours: 0, keys: [] });
      o.n++; if (etat === 'faites') o.faites++; if (etat === 'en_cours') o.en_cours++; o.keys.push(key);
    });
  });
  Object.values(agg).forEach((o) => {
    const p = o.who === '(non assignée)' ? null : person(o.who);
    if (!p && o.who !== '(non assignée)') unknown.add(o.who);
    const role = p ? (['direction', 'cdp'].includes(p.role) ? 'expert' : p.role) : 'dev';
    const rec = { id: `jira.${sid(o.sprint)}.${Core.slug(p ? p.id.replace(/^team\./, '') : o.who)}.${Core.slug(o.item)}`.slice(0, 80), item: o.item,
      periode: { type: 'sprint', ref: o.sprint }, role, mode: 'taches', valeur: o.n, faites: o.faites, en_cours: o.en_cours,
      source: src(`board ${raw.board} · ${o.n} sous-tâche(s) : ${o.keys.slice(0, 6).join(', ')}${o.keys.length > 6 ? ' …' : ''}`) };
    if (p) rec.personne = p.id; else rec.nom = o.who;
    out.charges.push(rec);
  });
  if (!(raw.sub_tasks || []).length) signals.push({ kind: 'sous_taches', texte: 'Aucune sous-tâche lue : charge par personne vide' });
  if (orphans) signals.push({ kind: 'sous_tache_orpheline', texte: `${orphans} sous-tâche(s) dont la tâche parente n'est pas dans les 3 sprints lus → programme` });
  unknownStatus.forEach((s) => signals.push({ kind: 'statut_inconnu', row: s, texte: `Statut « ${s} » absent du board 38 : compté « en cours »` }));
  unknown.forEach((w) => signals.push({ kind: 'personne_inconnue', row: w, texte: `${w} : assigné Jira absent de Team_G2.1 — affiché sous son nom, rôle dev par défaut` }));
  Object.keys(horsItem).forEach((e) => signals.push({ kind: 'epic_sans_item', row: e, texte: `${e} « ${(raw.epic_names || {})[e] || '?'} » : ${horsItem[e].size} ticket(s) de sprint sans item du portefeuille → programme Goutte 2.1` }));

  // ---------- R10 stat_jira per item ----------
  const active = raw.sprints[String(raw.active_sprint)];
  base.items.filter((it) => (it.epics_jira || []).length).forEach((it) => {
    const c = raw.item_counts[it.id];
    const same = c && c.epics.slice().sort().join() === it.epics_jira.slice().sort().join();
    if (!same) { signals.push({ kind: 'stat_absente', row: it.id, texte: `${it.id} : comptes Jira non lus pour ${it.epics_jira.join(', ')} — stat non écrite` }); return; }
    const sp = issues.filter((t) => epicItem[t.epic] === it.id && t.sprints.includes(raw.active_sprint));
    const pts = (l) => l.reduce((n, t) => n + (typeof t.points === 'number' ? t.points : 0), 0);
    const rec = {
      id: `jira.stat.${it.id}`.slice(0, 80), item: it.id, epics: it.epics_jira.slice(),
      tickets: (() => { const x = c.cancelled || 0; const total = c.total - x; const faits = c.done - x; return { total, faits, en_cours: c.in_progress, a_faire: Math.max(0, total - faits - c.in_progress) }; })(),
      sprint: { ref: active, tickets: sp.length, faits: sp.filter((t) => t.cat === 'done').length, points: pts(sp), points_faits: pts(sp.filter((t) => t.cat === 'done')) },
      source: src(`parent in (${it.epics_jira.join(', ')})`)
    };
    out.stats_jira.push(rec);
    rows.push({ kind: 'stat', id: rec.id, tickets: rec.tickets, sprint: rec.sprint });
  });

  // ---------- R03 support from GOU21 tickets linked to STG21 ----------
  const sup = raw.support; const linked = [];
  sup.checked.forEach((k) => {
    const stg = (sup.links[k] || []).map((l) => (l.url.match(RE_STG) || [])[1]).filter(Boolean);
    if (stg.length) linked.push({ key: k, stg, info: sup.issues[k] });
  });
  linked.filter((l) => !l.info).forEach((l) => signals.push({ kind: 'support_sans_detail', row: l.key, texte: `${l.key} lié à ${l.stg.join(', ')} mais titre / date non lus — non compté` }));
  const open = linked.filter((l) => l.info && l.info.cat !== 'done');
  const runIt = base.items.find((i) => i.id === RUN_SUPPORT);
  if (runIt) {
    // Trend = Δ open vs the previous read on an earlier day (a same-day rerun keeps the trend already written)
    const prevJira = runIt.source && runIt.source.systeme === 'jira' ? runIt.support || [] : [];
    const sameDay = runIt.source && runIt.source.systeme === 'jira' && String(runIt.source.lu_le).slice(0, 10) === today;
    const prev = Object.fromEntries(prevJira.map((s) => [s.extranet, sameDay ? s.ouverts - (s.tendance || 0) : s.ouverts]));
    const prevHad = Object.fromEntries(prevJira.map((s) => [s.extranet, 'tendance' in s]));
    // One support request (STG21 key) may be split into several GOU21 tickets (e.g. FE + BE): count STG21 keys, not
    // GOU21 tickets; its age is the oldest linked GOU21 ticket. Extranet from the title, "Producteur" read first so that
    // "[E-Producteur P2] - Proaction - …" is the Producteur extranet (MEP rule left unchanged).
    const extranetOf = (t) => (/\bE-?x?\s?Producteur\b|\bExProducteur\b/i.test(t) ? 'Producteur' : systemeOf(t).replace(/^Extranet /, '') || 'Commun');
    const byStg = {};
    open.forEach((l) => l.stg.forEach((k) => {
      const age = Core.daysBetween(l.info.created.slice(0, 10), today);
      const o = byStg[k]; if (!o || age > o.age) byStg[k] = { age, ex: extranetOf(l.info.summary) };
    }));
    const g = {};
    Object.values(byStg).forEach((o) => (g[o.ex] = g[o.ex] || []).push(o.age));
    Object.keys(prev).forEach((ex) => { if (!g[ex]) g[ex] = []; });
    const support = Object.keys(g).sort().map((ex) => {
      const a = g[ex]; const s = { extranet: ex, ouverts: a.length };
      if (a.length) { s.plus_vieux_j = Math.max(...a); s.age_moyen_j = Math.round(10 * a.reduce((x, y) => x + y, 0) / a.length) / 10; }
      if (ex in prev && (!sameDay || prevHad[ex])) s.tendance = a.length - prev[ex];
      return s;
    });
    const rec = Object.assign({}, runIt, { support, updated_at: now, source: src(`GOU21 → liens web STG21 · ${sup.sweep_total || sup.checked.length} tickets vérifiés · ${open.length} ticket(s) GOU21 ouvert(s), ${Object.keys(byStg).length} demande(s) STG21 : ${open.map((l) => `${l.key}↔${l.stg.join('/')}`).join(', ') || 'aucun'}`) });
    delete rec.sante;
    out.items.push(rec);
    rows.push({ kind: 'support', id: RUN_SUPPORT, avant: runIt.support || null, apres: support, source_avant: runIt.source && runIt.source.systeme });
    if (runIt.source && runIt.source.systeme !== 'jira') signals.push({ kind: 'support_remplace', row: RUN_SUPPORT, texte: `support de ${RUN_SUPPORT} : chiffres « ${runIt.source.systeme} » remplacés par la lecture Jira (tendance à partir du prochain lundi)` });
  } else signals.push({ kind: 'support', texte: `${RUN_SUPPORT} absent de la base — support non écrit` });

  // ---------- previous Jira records not seen any more: kept, reported ----------
  const seen = new Set(out.charges.map((c) => c.id));
  base.charges.filter((c) => c.source && c.source.par === 'adaptateur-jira-data' && !seen.has(c.id)).forEach((c) => signals.push({ kind: 'charge_non_relue', row: c.id, texte: `${c.id} en base, absente de cette lecture — conservée` }));

  const doc = { modele: '2', source: { systeme: 'jira', ref: `GOU21 board ${raw.board} · sprints ${Object.keys(raw.sprints).join(', ')} · épopées · liens STG21`, lu_le: now, par: 'adaptateur-jira-data' } };
  ['items', 'charges', 'stats_jira'].forEach((c) => { if (out[c].length) doc[c] = out[c]; });
  const writes = [];
  ['items', 'charges', 'stats_jira'].forEach((c) => (doc[c] || []).forEach((r) => {
    const prev = (base[c] || []).find((x) => x.id === r.id);
    // Canonical form (sorted keys): db exports sort keys, adapter output does not — compare content, not key order
    const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { if (v[k] !== undefined) o[k] = canon(v[k]); return o; }, {}) : v);
    const strip = (x) => JSON.stringify(canon(Object.assign({}, x, { source: Object.assign({}, x.source, { lu_le: null }), updated_at: null, _version: undefined })));
    if (prev && strip(prev) === strip(r)) { rows.push({ kind: c, id: r.id, decision: 'inchangé — non écrit' }); return; }
    const w = { op: 'set', collection: c, doc_id: r.id, data: r }; const v = versions[`${c}/${r.id}`] || (prev && prev._version);
    if (v) w.if_version = v; writes.push(w);
  }));
  return { doc, writes, report: { lu_le: now, charges: out.charges.length, stats: out.stats_jira.length, support_ouverts: open.length, ecrits: writes.length, rows, signals } };
}

function readDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

if (require.main === module) {
  const [, , rawP, baseDir, outDir] = process.argv;
  if (!rawP || !baseDir || !outDir) { console.error('usage: adapt_jira_data.js <raw.json> <base_dir> <out_dir>'); process.exit(2); }
  const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
  const base = {}; ['items', 'personnes', 'charges', 'stats_jira'].forEach((c) => { base[c] = readDir(path.join(baseDir, c)); });
  const vp = path.join(baseDir, 'versions.json');
  const versions = fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, 'utf8')) : {};
  const { doc, writes, report } = adapt(raw, base, versions);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'doc.json'), JSON.stringify(doc, null, 2));
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify(writes, null, 1));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`charges ${report.charges} · stats ${report.stats} · support ouverts ${report.support_ouverts} · écrits ${report.ecrits} · signaux ${report.signals.length}`);
}
module.exports = { adapt, RE_STG };
