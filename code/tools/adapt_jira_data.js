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
 *  - v7 (R32/R33/R34): lists « jira.liste.support » (open GOU21 tickets linked to STG21, with title and sprint) and
 *    « jira.liste.preparation » (raw.ready_issues = [[key, summary, status, type, epic, points, [sprint ids]]] read with
 *    status in (PrêtPourSprint🚀 10020, PrêtPourGrooming✅ 10021) ORDER BY Rank, Jira backlog order kept).
 *  - R27: raw.blocked = [[key, summary, status, epic, [[blockerKey, blockerStatusCategory]…]]] (tickets of the items' epics,
 *    status Bloqué or link « is blocked by »), raw.blocked_subtasks = [[key, summary, parentKey]] → attentes jira.att.<key>.
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
    // Stable id: an assignee who joins the team file keeps the id of the charge already written under their Jira name
    // (otherwise the old "hors équipe" record would stay beside the new one and count twice — Personne_15, 28 oct.)
    const idOf = (k) => `jira.${sid(o.sprint)}.${Core.slug(k)}.${Core.slug(o.item)}`.slice(0, 80);
    const idTeam = p ? idOf(p.id.replace(/^team\./, '')) : null; const idName = idOf(o.who);
    const chargeId = p && !(base.charges || []).some((c) => c.id === idTeam) && (base.charges || []).some((c) => c.id === idName) ? idName : (idTeam || idName);
    const rec = { id: chargeId, item: o.item,
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

  // ---------- R06 part 2: actual window of an item from the sprints of its epic tickets ----------
  // raw.board_sprints: [{id, name, state, start, end}] (listJiraBoardSprints, board 38, all states)
  // raw.epic_sprint_issues: [[key, epic, statusCategory, [sprint ids]]] (epic tickets in a sprint, cancelled excluded)
  const sprintDates = {};
  if (raw.board_sprints) {
    const day = (z) => (z ? Core.nowTs(new Date(z)).slice(0, 10) : null);
    // an end at local midnight closes the previous day (Jira 2026-11-07T04:00Z = end of 6 Nov EDT), as in the sprint adapter
    const endDay = (z) => (z ? Core.nowTs(new Date(Date.parse(z) - 60000)).slice(0, 10) : null);
    const bs = raw.board_sprints.map((x) => ({ id: String(x.id), state: x.state, debut: day(x.start), fin: endDay(x.end) }));
    bs.filter((x) => x.debut && x.fin).forEach((x) => { sprintDates[x.id] = { debut: x.debut, fin: x.fin, deduit: false }; });
    // future sprints have no dates in Jira: next Monday after the previous one + the active sprint's length (same rule as the sprint adapter)
    const act = bs.find((x) => x.state === 'active' && x.debut && x.fin);
    const len = act ? Core.daysBetween(act.debut, act.fin) : 18;
    let prev = act ? act.fin : null;
    bs.filter((x) => x.state === 'future' && !(x.debut && x.fin)).forEach((x) => {
      if (!prev) return;
      let d0 = Core.addDays(prev, 1); while (Core.d(d0).getDay() !== 1) d0 = Core.addDays(d0, 1);
      sprintDates[x.id] = { debut: d0, fin: Core.addDays(d0, len), deduit: true }; prev = sprintDates[x.id].fin;
    });
  }
  function fenetreReelle(it, counts) {
    if (!raw.epic_sprint_issues || !raw.board_sprints) return null;
    const tk = raw.epic_sprint_issues.filter((t) => it.epics_jira.includes(t[1]));
    const ids = [...new Set(tk.flatMap((t) => t[3].map(String)))].filter((id) => sprintDates[id]);
    if (!ids.length) return null;
    const openIds = [...new Set(tk.filter((t) => t[2] !== 'done').flatMap((t) => t[3].map(String)))].filter((id) => sprintDates[id]);
    const ouverts = Math.max(0, counts.total - counts.done);
    const fins = (l) => l.map((id) => sprintDates[id].fin).sort();
    const nom = (id) => ((raw.board_sprints.find((x) => String(x.id) === id) || {}).name || id).replace(/^G2\.1 - (S\d+).*$/, '$1');
    return {
      debut: ids.map((id) => sprintDates[id].debut).sort()[0],
      fin: ouverts === 0 ? fins(ids).pop() : null,
      jusqu_au: openIds.length ? fins(openIds).pop() : null,
      sprints: ids.sort((x, y) => sprintDates[x].debut.localeCompare(sprintDates[y].debut)).map(nom),
      ouverts
    };
  }

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
    const prevStat = (base.stats_jira || []).find((x) => x.id === rec.id);
    const fr = fenetreReelle(it, c); if (fr) rec.fenetre_reelle = fr;
    // R36 (cadence L5): a daily pass reads steps a–c only (no board_sprints): keep the actual window already in base
    else if (!raw.board_sprints && prevStat && prevStat.fenetre_reelle) rec.fenetre_reelle = prevStat.fenetre_reelle;
    // R06: scope growth guard — more tickets than at the previous read means a low % is not necessarily a delay
    if (prevStat && prevStat.tickets && rec.tickets.total > prevStat.tickets.total) signals.push({ kind: 'perimetre', row: it.id, texte: `${it.id} : périmètre Jira ${prevStat.tickets.total} → ${rec.tickets.total} tickets depuis la lecture précédente` });
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
    // R43 (model v14): trend = Δ open vs the last Monday before today (Monday: the previous week's), not vs yesterday.
    // Each extranet keeps the count of the first read of its last 2 weeks (`lundis`); no baseline yet = no trend.
    const prevJira = runIt.source && runIt.source.systeme === 'jira' ? runIt.support || [] : [];
    const prev = Object.fromEntries(prevJira.map((s) => [s.extranet, s]));
    const lundi = Core.mondayOf(today);
    const weeksRead = [...new Set(prevJira.flatMap((s) => (s.lundis || []).map((x) => x.lundi)))];
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
      // A week already read without this extranet means 0 open that week (review 29 oct.: a new extranet is ↑, not stable)
      const hist = ((prev[ex] && prev[ex].lundis) || []).slice();
      weeksRead.forEach((w) => { if (!hist.some((x) => x.lundi === w)) hist.push({ lundi: w, ouverts: 0 }); });
      if (!hist.some((x) => x.lundi === lundi)) hist.push({ lundi, ouverts: a.length });
      s.lundis = hist.sort((x, y) => x.lundi.localeCompare(y.lundi)).slice(-2);
      const ref = s.lundis.filter((x) => (today === lundi ? x.lundi < lundi : x.lundi === lundi)).pop();
      if (ref) { s.tendance = a.length - ref.ouverts; s.tendance_vs = ref.lundi; }
      return s;
    });
    const rec = Object.assign({}, runIt, { support, updated_at: now, source: src(`GOU21 → liens web STG21 · ${sup.sweep_total || sup.checked.length} tickets vérifiés · ${open.length} ticket(s) GOU21 ouvert(s), ${Object.keys(byStg).length} demande(s) STG21 : ${open.map((l) => `${l.key}↔${l.stg.join('/')}`).join(', ') || 'aucun'}`) });
    delete rec.sante;
    out.items.push(rec);
    rows.push({ kind: 'support', id: RUN_SUPPORT, avant: runIt.support || null, apres: support, source_avant: runIt.source && runIt.source.systeme });
    if (runIt.source && runIt.source.systeme !== 'jira') signals.push({ kind: 'support_remplace', row: RUN_SUPPORT, texte: `support de ${RUN_SUPPORT} : chiffres « ${runIt.source.systeme} » remplacés par la lecture Jira (tendance à partir du prochain lundi)` });
  } else signals.push({ kind: 'support', texte: `${RUN_SUPPORT} absent de la base — support non écrit` });

  // ---------- R32/R33/R34 (model v7): ticket lists, one document per list, rewritten whole at each read ----------
  out.listes_jira = [];
  const refsOf = (ids) => (ids || []).map((x) => raw.sprints[String(x)]).filter(Boolean);
  if (sup) {
    const inSprint = Object.fromEntries(raw.sprint_issues.map((t) => [t.key, t]));
    const tickets = open.slice().sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true })).map((l) => {
      const si = inSprint[l.key]; const t = { cle: l.key, titre: l.info.summary, categorie: l.info.cat, stg21: l.stg.slice().sort(), extranet: (/\bE-?x?\s?Producteur\b|\bExProducteur\b/i.test(l.info.summary) ? 'Producteur' : systemeOf(l.info.summary).replace(/^Extranet /, '') || 'Commun'), cree_le: l.info.created.slice(0, 10) };
      if (si) { t.sprints = refsOf(si.sprints); if (si.epic) { t.epic = si.epic; if (epicItem[si.epic]) t.item = epicItem[si.epic]; } }
      return t;
    });
    out.listes_jira.push({ id: 'jira.liste.support', nature: 'support', tickets, source: src('GOU21 ouverts liés à STG21 (liens web)') });
  }
  if (Array.isArray(raw.ready_issues)) {
    // Jira backlog order (ORDER BY Rank): rang = position in the read, kept as read (R34, Franck: same order as Jira)
    const tickets = raw.ready_issues.map(([cle, titre, statut, type, epic, points, sprints], k) => {
      const t = { cle, titre, statut, type, rang: k + 1, sprints: refsOf(sprints) };
      if (typeof points === 'number') t.points = points;
      if (epic) { t.epic = epic; if (epicItem[epic]) t.item = epicItem[epic]; }
      return t;
    });
    out.listes_jira.push({ id: 'jira.liste.preparation', nature: 'preparation', tickets, source: src(raw.queries && raw.queries.ready_issues ? raw.queries.ready_issues : 'statuts PrêtPourSprint / PrêtPourGrooming, ORDER BY Rank') });
  }

  // ---------- R27 bis (Franck 2026-10-29): tickets « Bloqué » in the 3 sprints read → list jira.liste.bloques ----------
  // raw.sprint_blocked = [[key, summary, type, isSubtask, parentKey, assignee, [sprintIds]]] (sprint in (3 ids) AND status = Bloqué)
  if (Array.isArray(raw.sprint_blocked)) {
    const parentEpicOf = Object.fromEntries(raw.sprint_blocked.filter((r) => !r[3]).map((r) => [r[0], r[4]]));
    (raw.sprint_issues || []).forEach((t) => { if (t.epic && !(t.key in parentEpicOf)) parentEpicOf[t.key] = t.epic; });
    const tickets = raw.sprint_blocked.map(([cle, titre, type, sub, parent, who, sprints]) => {
      const t = { cle, titre, type, sous_tache: !!sub, sprints: refsOf(sprints) };
      if (who) t.assigne = who;
      const epic = sub ? parentEpicOf[parent] : parent;
      if (sub && parent) t.parent = parent;
      if (epic) { t.epic = epic; if (epicItem[epic]) t.item = epicItem[epic]; }
      return t;
    }).filter((t) => t.sprints.length);
    out.listes_jira.push({ id: 'jira.liste.bloques', nature: 'bloques', tickets, source: src('sprints lus · statut Bloqué') });
  }

  // ---------- R27 (Franck 2026-10-29): waits read in Jira — A1 status « Bloqué », A2 link « is blocked by » to an
  // unfinished ticket; tickets of the items' epics; a blocked sub-task is carried by its parent. First day seen blocked =
  // attendue_le (D8: yellow after 5 working days); no longer blocked = recue_le (the record is never deleted).
  out.attentes = [];
  if (Array.isArray(raw.blocked)) {
    const prevA = Object.fromEntries((base.attentes || []).filter((a) => a.source && a.source.par === 'adaptateur-jira-data').map((a) => [a.id, a]));
    const parentOf = {}; (raw.blocked_subtasks || []).forEach(([k, titre, parent]) => (parentOf[parent] = parentOf[parent] || []).push(k));
    const seenA = new Set();
    raw.blocked.forEach(([cle, titre, statut, epic, blockers]) => {
      const item = epicItem[epic]; if (!item) return;
      const open = (blockers || []).filter(([, cat]) => cat !== 'done').map(([k]) => k);
      if (statut !== 'Bloqué' && !open.length) return;
      const id = `jira.att.${cle.toLowerCase()}`; seenA.add(id); const prev = prevA[id];
      const subs = parentOf[cle] || [];
      out.attentes.push({ id, item, tiers: open.length ? `Jira · bloqué par ${open.join(', ')}` : 'Jira · statut Bloqué',
        objet: `${cle} ${titre}${subs.length ? ` (${subs.length} sous-tâche${subs.length > 1 ? 's' : ''} bloquée${subs.length > 1 ? 's' : ''})` : ''}`.slice(0, 200),
        attendue_le: prev && !prev.recue_le ? prev.attendue_le : today, recue_le: null, source: src(`${cle} · ${statut}${open.length ? ' · bloqué par ' + open.join(', ') : ''}`) });
    });
    Object.values(prevA).filter((a) => !seenA.has(a.id) && !a.recue_le).forEach((a) => {
      out.attentes.push(Object.assign({}, a, { recue_le: today, source: src(`${a.id.replace(/^jira\.att\./, '').toUpperCase()} · plus bloqué`) }));
      signals.push({ kind: 'attente_levee', row: a.id, texte: `${a.objet} : plus bloqué — attente close le ${today}` });
    });
    const orphanSubs = (raw.blocked_subtasks || []).filter(([, , parent]) => !raw.blocked.some(([k]) => k === parent));
    if (orphanSubs.length) signals.push({ kind: 'sous_tache_bloquee', texte: `${orphanSubs.length} sous-tâche(s) bloquée(s) dont la tâche parente n'est pas bloquée ou hors épopées du portefeuille : ${orphanSubs.map(([k]) => k).join(', ')}` });
  }

  // ---------- previous Jira records not seen any more: kept, reported ----------
  const seen = new Set(out.charges.map((c) => c.id));
  // K13 (standing consent Franck 2026-10-29): a Jira-data charge of a sprint read in this pass that is not produced any
  // more (sub-task moved out of the sprint, ticket re-assigned) is deleted — listed in the report; other sprints untouched.
  const readSprints = new Set(Object.values(raw.sprints || {}));
  const purge = base.charges.filter((c) => c.source && c.source.par === 'adaptateur-jira-data' && !seen.has(c.id) && c.periode && readSprints.has(c.periode.ref));
  purge.forEach((c) => signals.push({ kind: 'charge_supprimee', row: c.id, texte: `${c.id} : absente de cette lecture de ${c.periode.ref} — supprimée (règle K13)` }));
  base.charges.filter((c) => c.source && c.source.par === 'adaptateur-jira-data' && !seen.has(c.id) && !(c.periode && readSprints.has(c.periode.ref))).forEach((c) => signals.push({ kind: 'charge_non_relue', row: c.id, texte: `${c.id} en base, sprint non lu ici — conservée` }));

  const doc = { modele: out.listes_jira.some((l) => l.nature === 'bloques') ? '10' : out.listes_jira.length ? '7' : raw.board_sprints ? '4' : '2', source: { systeme: 'jira', ref: `GOU21 board ${raw.board} · sprints ${Object.keys(raw.sprints).join(', ')} · épopées · liens STG21`, lu_le: now, par: 'adaptateur-jira-data' } };
  ['items', 'charges', 'stats_jira', 'listes_jira', 'attentes'].forEach((c) => { if (out[c].length) doc[c] = out[c]; });
  const writes = [];
  ['items', 'charges', 'stats_jira', 'listes_jira', 'attentes'].forEach((c) => (doc[c] || []).forEach((r) => {
    const prev = (base[c] || []).find((x) => x.id === r.id);
    // Canonical form (sorted keys): db exports sort keys, adapter output does not — compare content, not key order
    const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { if (v[k] !== undefined) o[k] = canon(v[k]); return o; }, {}) : v);
    const strip = (x) => JSON.stringify(canon(Object.assign({}, x, { source: Object.assign({}, x.source, { lu_le: null }), updated_at: null, _version: undefined })));
    if (prev && strip(prev) === strip(r)) { rows.push({ kind: c, id: r.id, decision: 'inchangé — non écrit' }); return; }
    const w = { op: 'set', collection: c, doc_id: r.id, data: r }; const v = versions[`${c}/${r.id}`] || (prev && prev._version);
    if (v) w.if_version = v; writes.push(w);
  }));
  purge.forEach((c) => { const w = { op: 'delete', collection: 'charges', doc_id: c.id, purge: 'K13' }; const v = versions[`charges/${c.id}`] || c._version; if (v) w.if_version = v; writes.push(w); });
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
  const base = {}; ['items', 'personnes', 'charges', 'stats_jira', 'listes_jira', 'attentes'].forEach((c) => { base[c] = readDir(path.join(baseDir, c)); });
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
