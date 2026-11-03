#!/usr/bin/env node
/* Jira data read by script, no transcription (Franck 3 Nov. 2026, after the 09:02 daily pass failed on transcription).
 *
 * The sandbox cannot reach Jira. The collector page (collecteur/jira_data_collecteur.html, artifact « Collecteur Jira »)
 * calls the Atlassian connector itself and stores every tool response verbatim in its db; ArtifactData list … out_dir puts
 * them on disk; this script turns them into the flattened jira_data raw (shape of dist/runs/2026-10-28/jira_data/raw.json)
 * that tools/adapt_jira_data.js reads. Nothing is retyped by the agent.
 *
 * Usage (RD = run folder of this pass, Linux path):
 *   node tools/jira_data_collecte.js demande <RD> <run_id> [--reel]
 *       ADAPTER FOLDER A = RD/jira_data, or RD/jira_data_reel with --reel (R6: debut.txt, demande.json, raw.json live there).
 *       writes A/demande.json, the request doc for the page (ArtifactData set demandes/courante, file_path):
 *       sprint ids from RD/jira/raw.json (garde.sprintMap: last closed, active, next), items with epics_jira from
 *       RD/base_avant/items, depuis = garde fenetre jira_data_depuis (null for --reel → -8d), support_prev = keys of
 *       support.issues of the newest previous jira_data raw still open there (a key read done is not re-read).
 *   node tools/jira_data_collecte.js assemble <export_dir> <RD> [--reel]
 *       export_dir = out_dir of ArtifactData list on lectures/<run_id>/reponses and etats (files <export_dir>/lectures/
 *       <run_id>/reponses/*.json, <export_dir>/etats/<run_id>.json). Writes A/raw.json (read_at = A/debut.txt) and prints a one-line JSON report. Exit 1 (no raw written) when the collect is not « fini », a step is
 *       missing, a page chain is cut (isLast false on the last page) or a count cross-check differs.
 * Never calls a source, never writes the base, never deletes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const garde = require('./garde.js');

const RE_STG = /plq-supportg2\.atlassian\.net\/.*?\b(STG21-\d+)\b/i;
const js = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const unwrap = (texte) => { let o = JSON.parse(texte); if (o && o.data !== undefined) o = o.data; return o; };
const sprintIds = (f) => ((((f || {}).customFields || {}).Sprint || {}).value || []).map((s) => s.id);
const pts = (f) => { const v = (((f || {}).customFields || {})['Story Points'] || {}).value; return typeof v === 'number' ? v : null; };

const dirOf = (rd, reel) => path.join(rd, reel ? 'jira_data_reel' : 'jira_data');

function demande(rd, runId, reel) {
  const jr = path.join(rd, 'jira', 'raw.json');
  if (!fs.existsSync(jr)) throw new Error('RD/jira/raw.json absent : Jira data se lit après Jira');
  const jira = js(jr);
  const map = garde.sprintMap(jira);
  const active = (jira.sprints || []).find((s) => s.state === 'active');
  const ids = [jira.last_closed_sprint, active, (jira.sprints || []).find((s) => s.state === 'future')].filter(Boolean).map((s) => s.id);
  if (ids.length !== 3) throw new Error(`3 sprints attendus (dernier clos, actif, suivant), lus : ${ids.join(', ')}`);
  const items = {};
  const dir = path.join(rd, 'base_avant', 'items');
  fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => {
    const it = js(path.join(dir, f)); if ((it.epics_jira || []).length) items[it.id] = it.epics_jira;
  });
  const prevP = garde.dernier('jira_data', rd);
  const prevIssues = prevP ? ((js(prevP).support || {}).issues) || {} : {};
  const supportPrev = Object.keys(prevIssues).filter((k) => (prevIssues[k] || {}).cat !== 'done');
  const d = { run_id: runId, etat: 'a_faire', cree_le: new Date().toISOString(), reel: !!reel,
    depuis: reel ? null : garde.fenetre(rd).jira_data_depuis, sprint_ids: ids, active_sprint: active.id, sprints: map,
    items, support_prev: supportPrev, precedent: prevP ? path.relative(path.join(__dirname, '..'), prevP) : null };
  fs.mkdirSync(dirOf(rd, reel), { recursive: true });
  fs.writeFileSync(path.join(dirOf(rd, reel), 'demande.json'), JSON.stringify(d, null, 1));
  return d;
}

function assemble(exportDir, rd, reel) {
  const A = dirOf(rd, reel);
  const dem = js(path.join(A, 'demande.json'));
  if (!!dem.reel !== !!reel) throw new Error(`demande.reel = ${dem.reel} : lance assemble ${dem.reel ? 'avec' : 'sans'} --reel`);
  const readAt = fs.readFileSync(path.join(A, 'debut.txt'), 'utf8').trim();
  const etatP = path.join(exportDir, 'etats', `${dem.run_id}.json`);
  if (!fs.existsSync(etatP)) throw new Error(`état ${dem.run_id} absent de l'export`);
  const etat = js(etatP);
  if (etat.etat !== 'fini') throw new Error(`collecte ${dem.run_id} : ${etat.etat} ${(etat.erreurs || []).join(' | ')}`);
  const repDir = path.join(exportDir, 'lectures', dem.run_id, 'reponses');
  const reps = fs.readdirSync(repDir).filter((f) => f.endsWith('.json')).sort().map((f) => js(path.join(repDir, f)));
  if (etat.reponses !== reps.length) throw new Error(`${reps.length} réponse(s) exportée(s), ${etat.reponses} écrite(s) par la page : export incomplet (pagine ArtifactData list)`);
  const by = {}; reps.forEach((r) => (by[r.etape] = by[r.etape] || []).push(r));
  Object.values(by).forEach((a) => a.sort((x, y) => x.n - y.n));
  const issuesOf = (etape, required = true) => {
    const pages = by[etape] || [];
    if (!pages.length) { if (required) throw new Error(`étape ${etape} absente`); return null; }
    const d = pages.map((p) => unwrap(p.texte));
    if (d[d.length - 1].isLast === false) throw new Error(`étape ${etape} : dernière page isLast false (chaîne coupée)`);
    return d.flatMap((x) => x.issues || []);
  };
  const countOf = (r) => unwrap(r.texte).totalCount;
  const three = new Set(dem.sprint_ids);
  const in3 = (f) => sprintIds(f).filter((s) => three.has(s));
  const errors = []; const q = {};

  // a. sprint issues
  const a = issuesOf('a_sprint_issues');
  const sprint_issues = a.map((t) => {
    const f = t.fields || {};
    const o = { key: t.key, cat: ((f.status || {}).statusCategory || {}).key, assignee: (f.assignee || {}).displayName || null,
      epic: (f.parent || {}).key || null, points: pts(f), sprints: in3(f) };
    if ((f.status || {}).name === 'Annulé') o.status = 'Annulé';
    return o;
  });
  const aCount = by.a_count ? countOf(by.a_count[0]) : null;
  if (aCount !== null && aCount !== a.length) errors.push(`sprint_issues : ${a.length} lus, count ${aCount}`);
  const epic_names = {};
  a.forEach((t) => { const p = (t.fields || {}).parent; if (p && p.key && p.fields && p.fields.summary) epic_names[p.key] = p.fields.summary; });
  // a2. sub-tasks
  const a2 = issuesOf('a2_sub_tasks');
  const sub_tasks = a2.map((t) => { const f = t.fields || {}; return [t.key, (f.parent || {}).key || null, (f.assignee || {}).displayName || null, (f.status || {}).name, in3(f)]; });
  const a2Count = by.a2_count ? countOf(by.a2_count[0]) : null;
  if (a2Count !== a2.length) errors.push(`sub_tasks : ${a2.length} lus, count ${a2Count}`);
  // b. counts per item
  const item_counts = {};
  Object.entries(dem.items).forEach(([item, epics]) => { item_counts[item] = { epics }; });
  (by.b_counts || []).forEach((r) => { const e = JSON.parse(r.entree); if (item_counts[e.item]) item_counts[e.item][e.mesure] = countOf(r); });
  Object.entries(item_counts).forEach(([item, c]) => ['total', 'done', 'in_progress', 'cancelled'].forEach((k) => {
    if (typeof c[k] !== 'number') errors.push(`item_counts ${item}.${k} manquant`);
  }));
  // c. support
  const cand = issuesOf('c_candidats') || [];
  const prevIssues = issuesOf('c_precedents', (dem.support_prev || []).length > 0) || [];
  const info = {}; cand.concat(prevIssues).forEach((t) => {
    const f = t.fields || {}; info[t.key] = { summary: f.summary, cat: ((f.status || {}).statusCategory || {}).key, created: f.created };
  });
  const missingPrev = (dem.support_prev || []).filter((k) => !info[k]); // deleted, moved or off board 38: signal, never a failure
  const links = {}; const checked = [];
  (by.c_liens || []).forEach((r) => {
    const key = JSON.parse(r.entree).inputs.issueIdOrKey; checked.push(key);
    const arr = unwrap(r.texte); const ls = (Array.isArray(arr) ? arr : []).map((l) => {
      const o = { url: (l.object || {}).url }; if ((l.object || {}).title) o.title = l.object.title; if (l.relationship) o.relationship = l.relationship; return o;
    }).filter((l) => l.url);
    if (ls.length) links[key] = ls;
  });
  const expected = new Set(Object.keys(info).concat(dem.support_prev || []));
  const notChecked = [...expected].filter((k) => !checked.includes(k));
  if (notChecked.length) errors.push(`liens non lus : ${notChecked.join(', ')}`);
  const issues = {};
  Object.entries(links).forEach(([k, ls]) => { if (ls.some((l) => RE_STG.test(l.url)) && info[k]) issues[k] = info[k]; });
  // e. preparation (Jira backlog order kept)
  const ready_issues = issuesOf('e_ready').map((t) => { const f = t.fields || {};
    return [t.key, f.summary, (f.status || {}).name, (f.issuetype || {}).name, (f.parent || {}).key || null, pts(f), sprintIds(f)]; });
  // f. waits
  const fb = issuesOf('f_blocked', Object.keys(dem.items).length > 0) || [];
  const blocked = fb.map((t) => { const f = t.fields || {};
    const bl = (f.issuelinks || []).filter((l) => l.type && l.type.inward === 'is blocked by' && l.inwardIssue)
      .map((l) => [l.inwardIssue.key, (((l.inwardIssue.fields || {}).status || {}).statusCategory || {}).key]);
    return [t.key, f.summary, (f.status || {}).name, (f.parent || {}).key || null, bl]; });
  const blocked_subtasks = issuesOf('f_blocked_subtasks').map((t) => [t.key, (t.fields || {}).summary, ((t.fields || {}).parent || {}).key || null]);
  // g. blocked in the sprints
  const sprint_blocked = issuesOf('g_sprint_blocked').map((t) => { const f = t.fields || {};
    return [t.key, f.summary, (f.issuetype || {}).name, !!(f.issuetype || {}).subtask, (f.parent || {}).key || null, (f.assignee || {}).displayName || null, sprintIds(f)]; });

  const jqlOf = (etape) => { const r = (by[etape] || [])[0]; if (!r) return null; const e = JSON.parse(r.entree); return (e.inputs && e.inputs.jql) || e.jql; };
  const src = `collecteur ${dem.run_id} (page Collecteur Jira, réponses brutes exportées)`;
  q.sprint_issues = `board 38 · ${jqlOf('a_sprint_issues')} · ${a.length} tickets, ${(by.a_sprint_issues || []).length} page(s), count ${aCount} · ${src}`;
  q.sub_tasks = `board 38 · ${jqlOf('a2_sub_tasks')} · ${a2.length} lignes, ${(by.a2_sub_tasks || []).length} page(s), count ${a2Count}`;
  q.item_counts = `par item : count parent in (<epics_jira>) ; + Done ; + In Progress ; + Annulé — ${Object.keys(item_counts).length} items, ${(by.b_counts || []).length} comptes`;
  q.support = `board 38 · ${jqlOf('c_candidats')} → ${cand.length} clés + ${(dem.support_prev || []).length} clés de support.issues du brut précédent (${prevIssues.length} relues) = ${checked.length} vérifiées par listJiraIssueRemoteIssueLinks`;
  q.ready_issues = `getJiraBoardIssueData board 38 · ${jqlOf('e_ready')} · ${ready_issues.length} tickets`;
  q.blocked = `getJiraBoardIssueData board 38 · ${jqlOf('f_blocked')} · ${blocked.length} tickets`;
  q.blocked_subtasks = `${jqlOf('f_blocked_subtasks')} · ${blocked_subtasks.length} sous-tâches`;
  q.sprint_blocked = `${jqlOf('g_sprint_blocked')} · ${sprint_blocked.length} tickets`;
  q.note = `${src} ; lu par la page de ${etat.debut} à ${etat.fin} (UTC, horodatage de la page) ; aucune transcription`;

  const raw = { site: 'jira-plq.atlassian.net', project: 'GOU21', board: 38, read_at: readAt, queries: q,
    sprints: dem.sprints, active_sprint: dem.active_sprint, sprint_issues, sub_tasks, epic_names, item_counts,
    support: { checked, links, issues }, ready_issues, blocked, blocked_subtasks, sprint_blocked };
  if (dem.reel) {
    const bsPages = by.d_board_sprints || []; if (!bsPages.length) errors.push('board_sprints absent (--reel)');
    raw.board_sprints = bsPages.flatMap((p) => unwrap(p.texte).values || []).map((s) => ({ id: s.id, name: s.name, state: s.state, start: s.startDate || null, end: s.endDate || null }));
    raw.epic_sprint_issues = (issuesOf('d_epic_sprint_issues') || []).map((t) => { const f = t.fields || {};
      return [t.key, (f.parent || {}).key || null, ((f.status || {}).statusCategory || {}).key, sprintIds(f)]; });
    q.board_sprints = `listJiraBoardSprints board 38 state all · ${raw.board_sprints.length} sprints`;
    const dCount = by.d_count ? countOf(by.d_count[0]) : null;
    if (dCount !== raw.epic_sprint_issues.length) errors.push(`epic_sprint_issues : ${raw.epic_sprint_issues.length} lus, count ${dCount}`);
    q.epic_sprint_issues = `${jqlOf('d_epic_sprint_issues')} · ${raw.epic_sprint_issues.length} tickets, count ${dCount}`;
  }
  const report = { run_id: dem.run_id, sprint_issues: a.length, sub_tasks: a2.length, items: Object.keys(item_counts).length,
    support_verifies: checked.length, support_lies: Object.keys(issues).length, ready: ready_issues.length, blocked: blocked.length,
    blocked_subtasks: blocked_subtasks.length, sprint_blocked: sprint_blocked.length, signaux: missingPrev.length ? [`support_prev non relues : ${missingPrev.join(', ')}`] : [], erreurs: errors };
  if (errors.length) return { ok: false, report };
  fs.writeFileSync(path.join(A, 'raw.json'), JSON.stringify(raw, null, 1));
  return { ok: true, report };
}

if (require.main === module) {
  const [cmd, ...a] = process.argv.slice(2);
  try {
    if (cmd === 'demande') { const d = demande(a[0], a[1], a.includes('--reel')); console.log(JSON.stringify({ run_id: d.run_id, sprint_ids: d.sprint_ids, items: Object.keys(d.items).length, depuis: d.depuis, support_prev: d.support_prev.length })); }
    else if (cmd === 'assemble') { const r = assemble(a[0], a[1], a.includes('--reel')); console.log(JSON.stringify(r.report)); process.exit(r.ok ? 0 : 1); }
    else { console.error(fs.readFileSync(__filename, 'utf8').split("'use strict'")[0]); process.exit(2); }
  } catch (e) { console.error(e.message); process.exit(2); }
}
module.exports = { demande, assemble };
