#!/usr/bin/env node
/* Jira GOU21 adapter (step 3b): board 38 sprints + MEP (versions, MEP tickets) cross-checked with the ledger.
 *
 * Usage: node tools/adapt_jira.js <jira_raw.json> <base_before_dir> <out_dir> <ledger.md> [ledger.md ...]
 *   jira_raw.json    read by Claude through the Atlassian connector (see fiche Adaptateur_Jira_v1)
 *   base_before_dir  ArtifactData export: <dir>/sprints/*.json, <dir>/meps/*.json (versions taken from "_version")
 *                    or a sibling versions.json {"sprints/<id>": n, "meps/<id>": n}
 *   ledger.md        Goutte2.1 weekly ledger(s): lines "MEP | date | libellé | ticket | responsable | statut"
 * Writes to out_dir: doc.json (model document, source = jira), batch.json (ArtifactData writes), report.json.
 * Rules (fiche): sprint grain = board 38, last closed + active + first future; MEP grain = child of epic GOU21-1651 whose
 * summary starts with "MEP", or a ledger MEP line; Jira wins on status, ledger supplies the date of an open
 * ticket; a MEP without any date is reported, never written (date is mandatory in model v1).
 * Never writes Jira nor the ledger; never deletes a db document.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Core = require('../interface/core.js');

const READY = ['Pret pour déploiement en production', 'Terminé', 'Annulé']; // version issue states counted as ready
const RE_MEP = /^\s*MEP\b/i;
const WINDOW_DAYS = 30; // MEP window: open + done within 30 days (same as the JQL)

// Calendar dates use Québec wall time (America/Toronto: EDT until 1 Nov., EST after) so a midnight end
// is read correctly on both sides of the DST switch. Stored timestamps keep the project rule (-04:00, never Z).
const LOCAL = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function local(s) { const p = Object.fromEntries(LOCAL.formatToParts(new Date(s)).map((x) => [x.type, x.value])); return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }; }
function edtDate(s) { return s ? local(s).date : null; }
// Sprint end stored as local midnight means "through the previous day"
function sprintEnd(s) { const l = local(s); return l.time === '00:00' ? Core.addDays(l.date, -1) : l.date; }
function nextMonday(s) { let x = Core.addDays(s, 1); while (new Date(x + 'T12:00').getDay() !== 1) x = Core.addDays(x, 1); return x; }

function systemeOf(text) {
  const rules = [
    [/inter ?province|ExPInterProvince/i, 'Extranet Interprovince'],
    [/ExProductRegion|r[ée]gion et producteur/i, 'Extranet Région / Producteur'],
    [/ExRegion|E-Region|r[ée]gion/i, 'Extranet Région'],
    [/ExUsine|usine/i, 'Extranet Usine'],
    [/transporteur/i, 'Extranet Transporteur'],
    [/qualit/i, 'Extranet Qualité'],
    [/proaction/i, 'Extranet ProAction'],
    [/mkt|marketing/i, 'Extranet Marketing'],
    [/code_taxe|codes? de taxes/i, 'G2.1'],
    [/\bG1\b/, 'G1'],
    [/SQL|serveur|Windows|IIS|\bBD\b/i, 'Infra (SQL, serveurs)'],
    [/extranet/i, 'Extranet (commun)']
  ];
  const hit = rules.find(([re]) => re.test(text));
  return hit ? hit[1] : 'G2.1';
}
function itemOf(systeme) { return /^Extranet/.test(systeme) ? 'run.extranets' : /^(Infra|G1)/.test(systeme) ? 'run.ti' : 'goutte21'; }
function libelleOf(summary) { return summary.replace(/^\s*MEP\s*[-–:]?\s*/i, '').trim(); }

function parseLedger(text, file) {
  const out = []; let day = null;
  text.split(/\r?\n/).forEach((l) => {
    const h = l.match(/^##\s+(\d{4}-\d{2}-\d{2})/); if (h) { day = h[1]; return; }
    const p = l.split('|').map((x) => x.trim());
    if (p[0] !== 'MEP' || p.length < 6) return;
    const st = p[5].toLowerCase();
    out.push({ date: p[1], libelle: p[2], ticket: p[3], responsable: p[4], statut: /compl/.test(st) ? 'completee' : /pr[eê]t/.test(st) ? 'prete' : /annul/.test(st) ? 'annulee' : 'planifiee', ref: `${path.basename(file)}#${day}` });
  });
  return out;
}

function adapt(raw, base, versions, ledgers) {
  const now = raw.read_at; const signals = []; const rows = [];
  const src = (ref) => ({ systeme: 'jira', ref, lu_le: now, par: 'adaptateur-jira' });
  const out = { sprints: [], meps: [] };

  // ---------- sprints: active + first future on board 38 ----------
  const active = raw.sprints.find((s) => s.state === 'active');
  const next = raw.sprints.find((s) => s.state === 'future');
  const prevS = Object.fromEntries(base.sprints.map((s) => [s.id, s]));
  const sid = (s) => 'jira.gou21-' + (s.name.match(/S(\d+)/i) ? 's' + s.name.match(/S(\d+)/i)[1] : String(s.id));
  if (!active) signals.push({ kind: 'sprint', texte: 'Aucun sprint actif sur le board 38' });
  let lastFin = null; let lenDays = null;
  // Last closed sprint is read too, so the sprint view can look back one sprint (feedback R14, 2026-10-28)
  const closed = raw.last_closed_sprint ? Object.assign({ state: 'closed' }, raw.last_closed_sprint) : null;
  [closed, active, next].filter(Boolean).forEach((s) => {
    const id = sid(s); const prev = prevS[id];
    let debut; let fin; let ref = `board ${raw.board} / sprint ${s.id}`;
    if (s.startDate && s.endDate) { debut = edtDate(s.startDate); fin = sprintEnd(s.endDate); }
    else if (lastFin) {
      debut = nextMonday(lastFin); fin = Core.addDays(debut, lenDays); ref += ' — dates absentes dans Jira, déduites (lundi suivant + durée du sprint actif)';
      signals.push({ kind: 'sprint_dates', row: s.name, texte: `${s.name} : pas de dates dans Jira → ${debut} → ${fin} déduites de ${active.name}` });
    } else { signals.push({ kind: 'sprint_dates', row: s.name, texte: `${s.name} : pas de dates, non écrit` }); return; }
    if (s === active) { lastFin = fin; lenDays = Core.daysBetween(debut, fin); }
    const rec = { id, nom: s.name, debut, fin, etat: s.state === 'active' ? 'actif' : s.state === 'future' ? 'futur' : 'clos', jours_ouvres: Core.weekdaysInRange(debut, fin), reserve_run_pct: prev && prev.reserve_run_pct != null ? prev.reserve_run_pct : 15, source: src(ref) };
    if (s.goal && s.goal.trim()) rec.objectif = s.goal.replace(/^\s*-\s*/gm, '').trim();
    out.sprints.push(rec);
    rows.push({ kind: 'sprint', id, decision: prev ? 'mise à jour' : 'créé', lu: { nom: s.name, start: s.startDate || '(absent)', end: s.endDate || '(absent)', etat: s.state }, base: { debut, fin, jours_ouvres: rec.jours_ouvres, etat: rec.etat }, avant: prev ? { debut: prev.debut, fin: prev.fin, jours_ouvres: prev.jours_ouvres } : null });
  });

  // ---------- MEP ----------
  const verById = Object.fromEntries(raw.versions.map((v) => [v.id, v]));
  const ledger = ledgers.flat();
  // One line per ticket: a closing line (completee / annulee) wins over any planned line (the ledger sometimes
  // logs the plan after the completion, e.g. SDD-2963 W40); otherwise the latest line wins (re-planning).
  const ledgerByTicket = {};
  ledger.forEach((l) => {
    const cur = ledgerByTicket[l.ticket]; const closed = (x) => x.statut === 'completee' || x.statut === 'annulee';
    if (!cur || closed(l) || !closed(cur)) ledgerByTicket[l.ticket] = l;
  });
  const prevM = Object.fromEntries(base.meps.map((m) => [m.id, m]));
  const linkedVersions = new Set();
  const mepId = (ticket) => 'jira.' + ticket.toLowerCase();

  raw.mep_tickets.forEach((t) => {
    if (!RE_MEP.test(t.summary)) { rows.push({ kind: 'mep', id: t.key, decision: 'ignoré (enfant de l\'épopée MEP sans préfixe « MEP » : tâche de préparation)' }); return; }
    const vers = t.versions_in_description.map((v) => verById[v]).filter(Boolean)
      .concat(raw.versions.filter((v) => t.summary.includes(v.name) && !t.versions_in_description.includes(v.id)));
    vers.forEach((v) => linkedVersions.add(v.name));
    let statut; // by status NAME: the Done category also holds "Prêt pour Preprod", which is not deployed
    if (t.status === 'Terminé') statut = 'completee';
    else if (t.status === 'Annulé') statut = 'annulee';
    else if (t.status === READY[0]) statut = 'prete';
    else {
      const issues = vers.filter((v) => !v.released).flatMap((v) => raw.version_issues[v.name] || []);
      const notReady = issues.filter(([, st]) => !READY.includes(st));
      statut = issues.length && !notReady.length ? 'prete' : 'planifiee';
      if (vers.length) signals.push({ kind: 'mep_contenu', row: t.key, texte: `${t.key} : version ${vers.map((v) => v.name).join(', ')} — ${issues.length - notReady.length}/${issues.length} tickets prêts (${notReady.map(([k, st]) => `${k} ${st}`).slice(0, 4).join(' · ')}${notReady.length > 4 ? ' …' : ''})` });
    }
    const led = ledgerByTicket[t.key];
    // MEP date: the ledger carries the deployment date (e.g. GOU21-11185 planned and done 14 Oct., closed in Jira 19 Oct.);
    // Jira only has the closing date, used when the ledger has no line.
    const date = led ? led.date : statut === 'completee' || statut === 'annulee' ? edtDate(t.status_changed) : null;
    const dateOrigin = led ? `ledger ${led.ref}` : date ? 'Jira (passage à Terminé)' : null;
    if (!date) { signals.push({ kind: 'mep_sans_date', row: t.key, texte: `${t.key} « ${libelleOf(t.summary)} » : ouverte, aucune date (ni Jira ni ledger) — non écrite` }); rows.push({ kind: 'mep', id: t.key, decision: 'non écrite (sans date)', lu: { statut_jira: t.status } }); return; }
    if (led && led.statut !== statut) signals.push({ kind: 'mep_ecart', row: t.key, texte: `${t.key} : ledger « ${led.statut} », Jira « ${t.status} » → ${statut} (Jira fait foi)` });
    if (statut === 'planifiee' && date < now.slice(0, 10)) signals.push({ kind: 'mep_passee', row: t.key, texte: `${t.key} : date ${date} passée, ticket toujours « ${t.status} »` });
    const systeme = systemeOf(vers.map((v) => v.name).join(' ') + ' ' + t.summary);
    const rec = { id: mepId(t.key), date, ticket: t.key, systeme, libelle: libelleOf(t.summary), statut, item: itemOf(systeme), source: src(`${t.key}${vers.length ? ' · version ' + vers.map((v) => v.name).join(', ') : ''}${led ? ' · date : ' + led.ref : ' · date : passage à Terminé'}`) };
    if (t.assignee) rec.responsable = t.assignee;
    out.meps.push(rec);
    const prev = prevM[rec.id];
    rows.push({ kind: 'mep', id: rec.id, decision: prev ? 'mise à jour' : 'créée', lu: { statut_jira: t.status, versions: vers.map((v) => v.name), date_origine: dateOrigin, ledger: led ? `${led.date} ${led.statut}` : '(absent)' }, base: { date, statut, systeme, item: rec.item }, avant: prev ? { date: prev.date, statut: prev.statut, systeme: prev.systeme, item: prev.item } : null });
  });

  // unreleased versions without a MEP ticket: no date anywhere -> reported
  raw.versions.filter((v) => !v.released && !linkedVersions.has(v.name)).forEach((v) => {
    const issues = raw.version_issues[v.name] || [];
    signals.push({ kind: 'version_sans_mep', row: v.name, texte: `Version ${v.name} : non livrée, ${issues.length} ticket(s), aucun ticket MEP ni date de livraison — non écrite` });
  });

  // ledger MEP lines not covered by a Jira MEP ticket (SDD, PLQ out of connector scope; GOU21 outside the epic)
  const done = new Set(out.meps.map((m) => m.ticket));
  const since = Core.addDays(now.slice(0, 10), -WINDOW_DAYS);
  Object.values(ledgerByTicket).filter((l) => !done.has(l.ticket) && (l.date >= since || l.statut === 'planifiee')).forEach((l) => {
    const other = (raw.other_tickets || []).find((o) => o.key === l.ticket);
    let statut = l.statut;
    if (other) {
      const js = other.cat === 'done' ? (other.status === 'Annulé' ? 'annulee' : 'completee') : 'planifiee';
      if (js !== statut) signals.push({ kind: 'mep_ecart', row: l.ticket, texte: `${l.ticket} : ledger « ${statut} », Jira « ${other.status} » → ${js} (Jira fait foi)` });
      statut = js;
      signals.push({ kind: 'mep_hors_epopee', row: l.ticket, texte: `${l.ticket} : MEP au ledger, hors épopée ${raw.mep_epic} dans Jira` });
    }
    const id = mepId(l.ticket); const prev = prevM[id];
    const systeme = /^SDD-/.test(l.ticket) && !/extranet/i.test(l.libelle) ? 'G1' : systemeOf(l.libelle);
    const rec = Object.assign({}, prev || {}, { id, date: l.date, ticket: l.ticket, libelle: l.libelle.replace(/^\s*MEP\s*[-–:]?\s*/i, ''), statut, systeme, item: itemOf(systeme), source: { systeme: 'ledger', ref: l.ref + (other ? ` · statut : Jira ${l.ticket}` : ''), lu_le: now, par: 'adaptateur-jira' } });
    if (l.responsable && !/^(équipe|-)/i.test(l.responsable)) rec.responsable = l.responsable; else delete rec.responsable;
    if (statut === 'planifiee' && l.date < now.slice(0, 10)) signals.push({ kind: 'mep_passee', row: l.ticket, texte: `${l.ticket} : date ${l.date} passée, toujours « planifiée » au ledger (hors connecteur)` });
    out.meps.push(rec);
    rows.push({ kind: 'mep', id, decision: (prev ? 'mise à jour' : 'créée') + ' (ledger)', lu: { ledger: `${l.date} ${l.statut}`, statut_jira: other ? other.status : '(hors connecteur)' }, base: { date: rec.date, statut: rec.statut, systeme: rec.systeme, item: rec.item }, avant: prev ? { date: prev.date, statut: prev.statut, systeme: prev.systeme, item: prev.item } : null });
  });
  // base MEPs not seen in this run: kept untouched (never deleted), reported
  base.meps.filter((m) => !out.meps.some((o) => o.id === m.id)).forEach((m) => signals.push({ kind: 'mep_non_relue', row: m.id, texte: `${m.id} en base, absente de cette lecture — conservée` }));

  const doc = { modele: '1', source: { systeme: 'jira', ref: `GOU21 board ${raw.board} · épopée ${raw.mep_epic} · versions · ledger`, lu_le: now, par: 'adaptateur-jira' }, sprints: out.sprints, meps: out.meps };
  const writes = [];
  ['sprints', 'meps'].forEach((c) => doc[c].forEach((r) => {
    const w = { op: 'set', collection: c, doc_id: r.id, data: r }; const v = versions[`${c}/${r.id}`];
    if (v) w.if_version = v; writes.push(w);
  }));
  return { doc, writes, report: { lu_le: now, sprints: out.sprints.length, meps: out.meps.length, ecrits: writes.length, rows, signals } };
}

function readDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

if (require.main === module) {
  const [, , rawP, baseDir, outDir, ...ledgerPs] = process.argv;
  if (!rawP || !baseDir || !outDir || !ledgerPs.length) { console.error('usage: adapt_jira.js <raw.json> <base_before_dir> <out_dir> <ledger.md>...'); process.exit(2); }
  const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
  const base = { sprints: readDir(path.join(baseDir, 'sprints')), meps: readDir(path.join(baseDir, 'meps')) };
  const vp = path.join(baseDir, 'versions.json');
  const versions = fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, 'utf8')) : {};
  const ledgers = ledgerPs.map((p) => parseLedger(fs.readFileSync(p, 'utf8'), p));
  const { doc, writes, report } = adapt(raw, base, versions, ledgers);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'doc.json'), JSON.stringify(doc, null, 2));
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify(writes, null, 1));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`sprints ${report.sprints} · meps ${report.meps} · écrits ${report.ecrits} · signaux ${report.signals.length}`);
}
module.exports = { adapt, parseLedger, systemeOf, sprintEnd };
