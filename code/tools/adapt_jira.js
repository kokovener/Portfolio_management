#!/usr/bin/env node
/* Jira GOU21 adapter (step 3b): board 38 sprints + MEP (versions, MEP tickets) cross-checked with the ledger.
 *
 * Usage: node tools/adapt_jira.js <jira_raw.json> <base_before_dir> <out_dir> [--sources=<mep_sources_raw.json>] <ledger.md> [ledger.md ...]
 *   jira_raw.json    read by Claude through the Atlassian connector (see fiche Adaptateur_Jira_v1)
 *   base_before_dir  ArtifactData export: <dir>/sprints/*.json, <dir>/meps/*.json (versions taken from "_version")
 *                    or a sibling versions.json {"sprints/<id>": n, "meps/<id>": n}
 *   ledger.md        Goutte2.1 weekly ledger(s): lines "MEP | date | libellé | ticket | responsable | statut"
 * Writes to out_dir: doc.json (model document, source = jira), batch.json (ArtifactData writes), report.json.
 * Rules (fiche): sprint grain = board 38, last closed + active + first future; MEP grain = child of epic GOU21-1651 whose
 * summary starts with "MEP", or a ledger MEP line; Jira wins on status, ledger supplies the date of an open
 * ticket; a MEP without any date is reported, never written (date is mandatory in model v1).
 * v10 (Kickoff D18 v8, 30 Oct. 2026 — rules of the Statut TI weekly task): MEP evidence from the Calendar "Calendar - MEP",
 * emails and the Teams channel "05 - Déploiements" (tools/mep_preuves.js). Priority on status, date and owner:
 * Calendar > Jira > Email > Teams > ledger. Jira keeps the status of a GOU21 ticket; a proof of deployment beats an
 * announcement; between two proofs of the same kind the higher source wins. Jira has no deployment date: its closing
 * date is the last fallback. SDD / PLQ tickets seen only in an email or Teams post are written (source outlook / teams).
 * Never writes Jira nor the ledger; never deletes a db document.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Core = require('../interface/core.js');
const { preuves: readPreuves, RANG } = require('./mep_preuves.js');

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

function systemeOf(text, dflt) {
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
  return hit ? hit[1] : dflt || 'G2.1';
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

function adapt(raw, base, versions, ledgers, sources) {
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

  // ---------- M365 evidence (D18 v8): calendar, emails, Teams ----------
  const ev = sources ? readPreuves(sources, now, WINDOW_DAYS) : { preuves: [], signals: [{ kind: 'sources_mep_absentes', row: 'mep_sources', texte: 'Calendrier, courriels et Teams non lus pour les MEP : Jira et ledger seuls' }] };
  signals.push(...ev.signals);
  const epicTickets = raw.mep_tickets.concat((raw.mep_tickets_hors_epopee || []).map((t) => Object.assign({ hors_epopee: true }, t)));
  // A version name in an email / Teams post points to the MEP ticket that carries it (summary or linked version)
  const ticketOfVersion = (name) => epicTickets.filter((t) => RE_MEP.test(t.summary) && (t.summary.includes(name) || t.versions_in_description.some((id) => verById[id] && verById[id].name === name))).map((t) => t.key);
  const evByTicket = {};
  ev.preuves.forEach((p) => {
    const keys = new Set(p.keys); p.versions.forEach((v) => ticketOfVersion(v).forEach((k) => keys.add(k)));
    if (!keys.size) signals.push({ kind: 'mep_preuve_orpheline', row: p.ref, texte: `${p.ref} : version ${p.versions.join(', ')} sans ticket MEP Jira — non écrite` });
    keys.forEach((k) => (evByTicket[k] = evByTicket[k] || []).push(p));
  });
  const closedSt = (x) => x === 'completee' || x === 'annulee';
  // Ledger line as evidence of rank 5, so the same choice rule applies to every source
  const ledgerEv = (l) => l && { source: 'ledger', rang: RANG.ledger, statut: l.statut === 'prete' ? 'planifiee' : l.statut, date: l.date, responsable: l.responsable && !/^(équipe|-)/i.test(l.responsable) ? l.responsable : null, libelle: l.libelle, ref: l.ref };
  // Best evidence: closing proofs first when wanted, then by source rank, then the most recent date within a source
  const best = (list, wantClosed) => list.filter((p) => p && p.date && (wantClosed ? closedSt(p.statut) : !closedSt(p.statut)))
    .sort((a, b) => a.rang - b.rang || (b.date || '').localeCompare(a.date || ''))[0] || null;
  // Calendar (rank 1) decides the date whenever it has an event for the ticket, past or future (Statut TI: Calendar > all)
  const calOf = (list) => list.filter((p) => p && p.source === 'calendrier' && p.date).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  const evRef = (p) => `date : ${p.source === 'ledger' ? 'ledger ' : ''}${p.ref}`;
  const srcSys = { calendrier: 'outlook', email: 'outlook', teams: 'teams', ledger: 'ledger' };
  const mepId = (ticket) => 'jira.' + ticket.toLowerCase();

  epicTickets.forEach((t) => {
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
    // MEP date (D18 v8): the deployment date of the highest source (calendar > email > Teams > ledger), the proof of
    // deployment for a done ticket, the announcement for an open one. Jira only has the closing date, which can lag the
    // deployment by days (GOU21-11185: deployed 14 Oct., closed 19 Oct.): last fallback.
    const evs = (evByTicket[t.key] || []).concat([ledgerEv(led)]).filter(Boolean);
    // open ticket: announcement first, else a proof (deployed before Jira is moved, the lag D18 cites)
    const pick = calOf(evs) || (closedSt(statut) ? best(evs, true) || best(evs, false) : best(evs, false) || best(evs, true));
    const date = pick ? pick.date : closedSt(statut) ? edtDate(t.status_changed) : null;
    const dateOrigin = pick ? `${pick.source} ${pick.ref}` : date ? 'Jira (passage à Terminé)' : null;
    if (!date) { signals.push({ kind: 'mep_sans_date', row: t.key, texte: `${t.key} « ${libelleOf(t.summary)} » : ouverte, aucune date (ni calendrier, ni courriel, ni Teams, ni ledger) — non écrite` }); rows.push({ kind: 'mep', id: t.key, decision: 'non écrite (sans date)', lu: { statut_jira: t.status } }); return; }
    if (t.hors_epopee) signals.push({ kind: 'mep_hors_epopee', row: t.key, texte: `${t.key} : ticket « MEP » hors épopée ${raw.mep_epic} — lu quand même` });
    if (led && led.statut !== statut) signals.push({ kind: 'mep_ecart', row: t.key, texte: `${t.key} : ledger « ${led.statut} », Jira « ${t.status} » → ${statut} (Jira fait foi)` });
    const proof = best(evByTicket[t.key] || [], true);
    if (proof && !closedSt(statut)) signals.push({ kind: 'mep_ecart', row: t.key, texte: `${t.key} : ${proof.ref} atteste la MEP, Jira « ${t.status} » → ${statut} (Jira fait foi)` });
    if (statut === 'planifiee' && date < now.slice(0, 10)) signals.push({ kind: 'mep_passee', row: t.key, texte: `${t.key} : date ${date} passée, ticket toujours « ${t.status} »` });
    const systeme = systemeOf(vers.map((v) => v.name).join(' ') + ' ' + t.summary);
    const rec = { id: mepId(t.key), date, ticket: t.key, systeme, libelle: libelleOf(t.summary), statut, item: itemOf(systeme), source: src(`${t.key}${vers.length ? ' · version ' + vers.map((v) => v.name).join(', ') : ''}${pick ? ' · ' + evRef(pick) : ' · date : passage à Terminé'}`) };
    // owner: Jira assignee, else the owner given by the chosen evidence (Jira > email > Teams > ledger)
    if (t.assignee) rec.responsable = t.assignee; else if (pick && pick.responsable) rec.responsable = pick.responsable;
    out.meps.push(rec);
    const prev = prevM[rec.id];
    rows.push({ kind: 'mep', id: rec.id, decision: prev ? 'mise à jour' : 'créée', lu: { statut_jira: t.status, versions: vers.map((v) => v.name), date_origine: dateOrigin, ledger: led ? `${led.date} ${led.statut}` : '(absent)', preuves: (evByTicket[t.key] || []).length }, base: { date, statut, systeme, item: rec.item }, avant: prev ? { date: prev.date, statut: prev.statut, systeme: prev.systeme, item: prev.item } : null });
  });

  // unreleased versions without a MEP ticket: no date anywhere -> reported
  raw.versions.filter((v) => !v.released && !linkedVersions.has(v.name)).forEach((v) => {
    const issues = raw.version_issues[v.name] || [];
    signals.push({ kind: 'version_sans_mep', row: v.name, texte: `Version ${v.name} : non livrée, ${issues.length} ticket(s), aucun ticket MEP ni date de livraison — non écrite` });
  });

  // MEPs outside the Jira MEP tickets: ledger lines and M365 evidence (SDD, PLQ out of connector scope; GOU21 outside the epic)
  const done = new Set(out.meps.map((m) => m.ticket)); const seenJira = new Set(epicTickets.map((t) => t.key));
  const since = Core.addDays(now.slice(0, 10), -WINDOW_DAYS);
  const keys = new Set(Object.keys(ledgerByTicket).concat(Object.keys(evByTicket)));
  [...keys].filter((k) => !done.has(k) && !seenJira.has(k)).sort().forEach((k) => {
    const l = ledgerByTicket[k]; const evs = (evByTicket[k] || []).concat([ledgerEv(l)]).filter(Boolean);
    const other = (raw.other_tickets || []).find((o) => o.key === k);
    if (/^GOU21-/.test(k) && !other && !l) { signals.push({ kind: 'mep_cle_non_lue', row: k, texte: `${k} : cité par ${evs[0].ref}, absent de la lecture Jira (à ajouter aux clés lues) — non écrit` }); return; }
    // A proof of deployment beats an announcement; otherwise the highest source (email > Teams > ledger)
    const proof = best(evs, true); const plan = best(evs, false); const cal = calOf(evs);
    const pick = cal ? Object.assign({}, proof || plan || cal, { date: cal.date, ref: cal.ref + ((proof || plan) && (proof || plan) !== cal ? ' · ' + (proof || plan).ref : '') }) : proof || plan;
    if (!pick) return;
    let statut = proof ? proof.statut : 'planifiee';
    if (!(pick.date >= since || statut === 'planifiee')) return;
    if (l && !proof && l.statut === 'prete') statut = 'prete';
    if (l && l.statut !== statut && pick.source !== 'ledger') signals.push({ kind: 'mep_ecart', row: k, texte: `${k} : ledger « ${l.statut} », ${pick.ref} → ${statut} (${pick.source === 'email' ? 'courriel' : pick.source} fait foi)` });
    if (other) {
      const js = other.cat === 'done' ? (other.status === 'Annulé' ? 'annulee' : 'completee') : 'planifiee';
      if (js !== statut) signals.push({ kind: 'mep_ecart', row: k, texte: `${k} : ${pick.source} « ${statut} », Jira « ${other.status} » → ${js} (Jira fait foi)` });
      statut = js;
      signals.push({ kind: 'mep_hors_epopee', row: k, texte: `${k} : MEP au ${pick.source === 'ledger' ? 'ledger' : 'courriel / Teams'}, hors épopée ${raw.mep_epic} dans Jira` });
    }
    // D18 v8 motif: the ledger is a summary, not a source; a MEP seen only there is written but flagged
    if (l && !(evByTicket[k] || []).length && !other) signals.push({ kind: 'mep_non_recoupee', row: k, texte: `${k} : MEP connue du ledger seul (${l.ref}), aucune source primaire lue ne la confirme` });
    if (!l) signals.push({ kind: 'mep_hors_ledger', row: k, texte: `${k} : MEP ${statut === 'completee' ? 'réalisée' : 'annoncée'} le ${pick.date} (${pick.ref}), absente du ledger — écrite` });
    const id = mepId(k); const prev = prevM[id];
    const libelle = ((l && l.libelle) || (evs.find((p) => p.libelle) || {}).libelle || k).replace(/^\s*MEP\s*[-–:]?\s*/i, '');
    const systeme = /^SDD-/.test(k) && !/extranet/i.test(libelle) ? 'G1' : systemeOf(libelle, /^PLQ-/.test(k) ? 'Infra (SQL, serveurs)' : 'G2.1');
    const rec = Object.assign({}, prev || {}, { id, date: pick.date, ticket: k, libelle, statut, systeme, item: itemOf(systeme), source: { systeme: srcSys[pick.source], ref: pick.ref + (other ? ` · statut : Jira ${k}` : ''), lu_le: now, par: 'adaptateur-jira' } });
    const resp = pick.responsable || (evs.find((p) => p.responsable) || {}).responsable;
    if (resp) rec.responsable = resp; else delete rec.responsable;
    if (statut === 'planifiee' && pick.date < now.slice(0, 10)) signals.push({ kind: 'mep_passee', row: k, texte: `${k} : date ${pick.date} passée, toujours « planifiée » (${pick.ref} ; hors connecteur)` });
    out.meps.push(rec);
    rows.push({ kind: 'mep', id, decision: (prev ? 'mise à jour' : 'créée') + ` (${pick.source})`, lu: { ledger: l ? `${l.date} ${l.statut}` : '(absent)', preuves: (evByTicket[k] || []).map((p) => `${p.source} ${p.date} ${p.statut}`), statut_jira: other ? other.status : '(hors connecteur)' }, base: { date: rec.date, statut: rec.statut, systeme: rec.systeme, item: rec.item }, avant: prev ? { date: prev.date, statut: prev.statut, systeme: prev.systeme, item: prev.item } : null });
  });
  // base MEPs not seen in this run: kept untouched (never deleted), reported
  // manual MEPs (Gérer, source saisie) are Franck's: never read, never rewritten; a read MEP with the same ticket is reported
  const isSaisie = (m) => m.source && m.source.systeme === 'saisie';
  base.meps.filter((m) => !isSaisie(m) && !out.meps.some((o) => o.id === m.id)).forEach((m) => signals.push({ kind: 'mep_non_relue', row: m.id, texte: `${m.id} en base, absente de cette lecture — conservée` }));
  base.meps.filter((m) => isSaisie(m) && m.ticket).forEach((m) => { const o = out.meps.find((x) => x.ticket === m.ticket); if (o) signals.push({ kind: 'mep_saisie_doublon', row: m.id, texte: `${m.ticket} saisie à la main (${m.id}) et lue (${o.source.ref}) : supprimer la saisie dans Gérer` }); });

  const doc = { modele: '1', source: { systeme: 'jira', ref: `GOU21 board ${raw.board} · épopée ${raw.mep_epic} · versions · ${sources ? 'calendrier, courriels, Teams · ' : ''}ledger`, lu_le: now, par: 'adaptateur-jira' }, sprints: out.sprints, meps: out.meps };
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
  const args = process.argv.slice(2); const srcArg = args.find((a) => a.startsWith('--sources='));
  const [rawP, baseDir, outDir, ...ledgerPs] = args.filter((a) => a !== srcArg);
  if (!rawP || !baseDir || !outDir || !ledgerPs.length) { console.error('usage: adapt_jira.js <raw.json> <base_before_dir> <out_dir> [--sources=<mep_sources_raw.json>] <ledger.md>...'); process.exit(2); }
  // M365 evidence (D18 v8) is optional: without it the adapter runs on Jira + ledger and says so (signal sources_mep_absentes)
  const sources = srcArg ? JSON.parse(fs.readFileSync(srcArg.slice('--sources='.length), 'utf8')) : null;
  const raw = JSON.parse(fs.readFileSync(rawP, 'utf8'));
  const base = { sprints: readDir(path.join(baseDir, 'sprints')), meps: readDir(path.join(baseDir, 'meps')) };
  const vp = path.join(baseDir, 'versions.json');
  const versions = fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, 'utf8')) : {};
  // A ledger not written yet (Monday 7h runs before the daily briefing that creates the week's ledger) is skipped
  // with a signal; at least one ledger must exist, otherwise MEP dates would silently fall back to Jira only.
  const present = ledgerPs.filter((p) => fs.existsSync(p)); const missing = ledgerPs.filter((p) => !fs.existsSync(p));
  if (!present.length) { console.error('refused: no ledger found among ' + ledgerPs.join(', ')); process.exit(2); }
  const ledgers = present.map((p) => parseLedger(fs.readFileSync(p, 'utf8'), p));
  const { doc, writes, report } = adapt(raw, base, versions, ledgers, sources);
  missing.forEach((p) => report.signals.push({ kind: 'ledger_absent', row: path.basename(p), texte: `ledger ${path.basename(p)} absent à la lecture (écrit par le briefing quotidien) — semaine lue sans lui` }));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'doc.json'), JSON.stringify(doc, null, 2));
  fs.writeFileSync(path.join(outDir, 'batch.json'), JSON.stringify(writes, null, 1));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`sprints ${report.sprints} · meps ${report.meps} · écrits ${report.ecrits} · signaux ${report.signals.length}`);
}
module.exports = { adapt, parseLedger, systemeOf, sprintEnd };
