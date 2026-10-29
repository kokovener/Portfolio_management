#!/usr/bin/env node
/* Monday run (step 4a): snapshot before any recalculation, digest after the five adapters, page check.
 *
 * Usage:
 *   node tools/lundi.js snapshot <base_dir> <date> <pris_le> <out_dir> <schema.json>
 *       base_dir  full ArtifactData export of the collections (16 in model v14) (<dir>/<collection>/<id>.json), taken BEFORE
 *                 any adapter runs. Writes out_dir/doc.json + batch.json (one create, never pinned: a snapshot is
 *                 never overwritten) and runs validate_model.py (fail closed). Refuses if snap.<date> exists.
 *   node tools/lundi.js digest <run_dir> <date> <now_ts> <artifact_url> <out_md> <out_msg> [--reco "<text>"]
 *       run_dir   holds base_apres/ (export after the adapters), statut.json (adapter outcomes) and each adapter's
 *                 report.json (path given in statut.json). Writes run_dir/alertes.json, out_md (digest) and
 *                 out_msg (Teams message, HTML). Previous alerts: recomputed from ../<previous date>/base_apres with today's rules,
 *                 else ../<previous date>/alertes.json.
 *       Also writes run_dir/snap_sources.json: one pinned update adding sources_ok / sources_total to snap.<date>
 *       (the only write ever made to a snapshot after its creation; its items are never touched).
 *   node tools/lundi.js dossier <run_dir> <date> <out.json>
 *       Analyst input (step 3b): one compact file built from run_dir/base_apres — items with computed health and Jira
 *       stats, current and next sprint (team points, sub-tasks per person, capacity), MEP ±30 days, support, rule
 *       alerts already computed (the analyst must not repeat them) and last Monday's signals with Franck's verdicts.
 *   node tools/lundi.js digest … [--signaux <analyste.json>]
 *       analyste.json = {"signaux":[{"titre","constat","preuves":[≥1 id or figure from the dossier],"cause","porteur"?}]}
 *       ≤ 5 signals; refused (exit 4) when malformed — the digest is then built without them, never with a guess.
 *   node tools/lundi.js versions <versions_avant.json> [applied batch.json ...]   → prints current versions
 *       (a pinned set/update bumps a version by 1, a create starts at 1); pass only batches the db accepted.
 *   node tools/lundi.js writes <batch.json> <out_dir> [<from> <to>]  → one JSON file per write in out_dir and, on
 *       stdout, the `writes` array for ArtifactData batch (file_path instead of inline data), in chunks of ≤ 50.
 *   node tools/lundi.js pagecheck <built.html> <published.html>
 *       exit 0 = same page (no republication), exit 10 = page changed (republish), 2 = unreadable.
 * Times are never computed here: <pris_le> and <now_ts> come from `TZ=America/Toronto date`.
 * Never writes a source; deletes no db document itself (only Jira data deletions K13 pass `writes`); nothing from Recrutements/ is read.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const Core = require('../interface/core.js');

const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function loadBase(dir) {
  const base = Core.emptyBase();
  Core.COLLECTIONS.forEach((c) => {
    const d = path.join(dir, c);
    if (!fs.existsSync(d)) return;
    fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort()
      .forEach((f) => base[c].push(JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))));
  });
  return base;
}
function writeJson(p, v) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8'); }
// Display a timestamp in its own wall time; label from its offset (EDT before Nov 1, EST after).
function fmtLocal(ts) {
  const m = String(ts).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2})?([+-]\d{2}):(\d{2})$/);
  if (!m) return String(ts);
  const zone = m[4] === '-04' ? 'EDT' : m[4] === '-05' ? 'EST' : `UTC${m[4]}`;
  return `${Core.fmtDate(m[1], true)} · ${+m[2]}h${m[3]} ${zone}`;
}

// ---------- snapshot ----------
function buildSnapshot(base, date, prisLe) {
  const items = base.items.slice().sort((a, b) => a.id.localeCompare(b.id)).map((it) => {
    const s = Core.sante(base, it, date);
    const p = Core.pct(base, it);
    const js = Core.jalonsOf(base, it.id);
    const nr = base.risques.filter((r) => r.item === it.id && r.ouvert !== false).length;
    const pj = Core.prochainJalon(base, it.id);
    const rec = { item: it.id, etape: it.etape, sante: s.couleur };
    if (p) rec.pct_avancement = p.valeur;
    if (js.length) { rec.jalons_faits = js.filter((j) => j.statut === 'fait').length; rec.jalons_total = js.length; }
    rec.risques_ouverts = nr;
    if (pj) rec.prochain_jalon = pj.date;
    rec.resume = `${p ? Core.fmtNum(p.valeur) + ' %' : '— %'} · ${s.couleur} · ${nr} risque${nr > 1 ? 's' : ''}`;
    return rec;
  });
  return {
    id: `snap.${date}`, date, pris_le: prisLe, items,
    source: { systeme: 'calcul', ref: 'tache-lundi · base avant adaptateurs', lu_le: prisLe, par: 'tache-lundi' }
  };
}
function cmdSnapshot([baseDir, date, prisLe, outDir, schemaP]) {
  if (!schemaP || !DATE.test(date) || !TS.test(prisLe)) usage();
  if (prisLe.slice(0, 10) !== date) fail(`refused: pris_le ${prisLe} is not on ${date}`);
  // Export must be complete: a missing instantanes/ folder would hide an existing snapshot of the week.
  if (!fs.existsSync(path.join(baseDir, 'instantanes'))) fail(`refused: ${baseDir}/instantanes missing — incomplete export, snapshot not written`);
  const base = loadBase(baseDir);
  const lundi = Core.mondayOf(date);
  const n = Core.COLLECTIONS.reduce((k, c) => k + base[c].length, 0);
  if (!base.items.length) fail(`refused: no item in ${baseDir} — export the base first`);
  if (base.instantanes.some((x) => x.id === `snap.${lundi}` || (/^snap\./.test(x.id) && x.date >= lundi && x.date <= Core.addDays(lundi, 6))))
    fail(`refused: a snapshot of the week of ${lundi} is already in base — a snapshot is never overwritten`);
  const snap = buildSnapshot(base, date, prisLe);
  // One snapshot per week, named after its Monday (a run delayed to Tuesday still belongs to Monday); health is
  // computed on the real day of the run.
  snap.id = `snap.${lundi}`; snap.date = lundi;
  const doc = { modele: '1', source: snap.source, instantanes: [snap] };
  // Validation set = the snapshot + the base it was computed from (references resolved against the base).
  const baseDoc = Object.assign({ modele: '1', source: { systeme: 'calcul', ref: 'base avant', lu_le: prisLe, par: 'tache-lundi' } }, base);
  writeJson(path.join(outDir, 'doc.json'), doc);
  writeJson(path.join(outDir, 'base_avant.json'), baseDoc);
  let validation;
  try {
    validation = execFileSync('python3', [path.join(__dirname, 'validate_model.py'), schemaP, path.join(outDir, 'doc.json'), path.join(outDir, 'base_avant.json')], { encoding: 'utf8' }).trim();
  } catch (e) { fail('refused: validator failed or did not run\n' + (e.stdout || '') + (e.stderr || e.message), 3); }
  writeJson(path.join(outDir, 'batch.json'), [{ op: 'set', collection: 'instantanes', doc_id: snap.id, data: snap }]);
  writeJson(path.join(outDir, 'report.json'), { pris_le: prisLe, documents_base: n, items: snap.items.length, validation });
  console.log(`${snap.id}: ${snap.items.length} items from ${n} documents · ${validation.split('\n').pop()}`);
}

// ---------- digest ----------
const ORDRE = ['recul', 'jalon', 'bloque', 'risque', 'attente', 'mep', 'fraicheur', 'phase']; // R44 (2026-10-29)
const REGLE = { recul: 'Recul ≥ 5 j o. et ce qu\'il entraîne', jalon: 'Jalon dépassé', bloque: 'Bloqués du sprint', risque: 'Risque ≥ 15', attente: 'Attente > 5 j o.', mep: 'MEP ≤ 7 j sans « prêt »', fraicheur: 'Fraîcheur : ni Smartsheet ni Jira depuis > 15 j o.', phase: 'Phase vide' };
const ADAPT = { smartsheet: 'Smartsheet', jira: 'Jira', jira_data: 'Jira (data)', jira_data_reel: 'Jira (data + réel)', artefacts: 'Artefacts', outlook: 'Outlook', outlook_equipe: 'Outlook (équipe)', miro: 'Miro' };
// Signals Franck asked to see first (prompt step 4), then the rest grouped by kind.
const PRIO_SIG = ['feed_ignore', 'echeance_passee', 'action_non_relue', 'absence_non_relue', 'personne_non_relue', 'hors_annuaire',
  'demi_journee_illisible', 'parti', 'mep_passee', 'mep_sans_date', 'recul', 'conflit'];

// Signal kinds already shown as an alert (same fact twice is noise).
const DOUBLON = new Set(['phase']);
const MAX_SIG = 15;
const COLLAPSE = new Set(['fraicheur', 'phase']);
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const jour = (date) => `${JOURS[Core.d(date).getDay()]} ${Core.fmtDate(date, true)}`;
const short = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
function readSignaux(p) {
  let j; try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { fail(`refused: --signaux ${p} unreadable (${e.message})`, 4); }
  const l = j && Array.isArray(j.signaux) ? j.signaux : null;
  if (!l) fail('refused: --signaux needs {"signaux":[…]}', 4);
  if (l.length > 5) fail(`refused: ${l.length} signals, 5 at most`, 4);
  l.forEach((s, k) => {
    const miss = ['titre', 'constat', 'cause'].filter((f) => !s || typeof s[f] !== 'string' || !s[f].trim());
    if (miss.length || !Array.isArray(s.preuves) || !s.preuves.length) fail(`refused: signal ${k + 1} lacks ${miss.concat(Array.isArray(s && s.preuves) && s.preuves.length ? [] : ['preuves']).join(', ')}`, 4);
    if (/\d{2}:\d{2}(:\d{2})?Z/.test(JSON.stringify(s))) fail(`refused: signal ${k + 1} carries a UTC Z time`, 4);
  });
  return l;
}

// ---------- analyst dossier (step 3b) ----------
function cmdDossier([runDir, date, outP]) {
  if (!outP || !DATE.test(date)) usage();
  const base = Core.publicBase(loadBase(path.join(runDir, 'base_apres'))); // R37: hidden items never reach the digest
  if (!base.items.length) fail('refused: base_apres is empty — export the base after the adapters');
  const ix = Core.index(base);
  const nom = (id) => (ix.items[id] || { nom: id }).nom;
  const items = base.items.filter((i) => i.etape !== 'termine').map((i) => {
    const s = Core.sante(base, i, date); const j = Core.jiraOf(base, i.id, (Core.sprintAt(base, date) || {}).id);
    const o = { id: i.id, nom: i.nom, type: i.type, voie: i.voie, etape: i.etape, parent: i.parent || null, responsable: i.responsable || null,
      sante: s.couleur, motifs: s.motifs, mis_a_jour: i.updated_at, pct_source: typeof i.pct_avancement === 'number' ? i.pct_avancement : null,
      phase: i.phase_source || null, fenetre: i.fenetre || null, epics: i.epics_jira || [] };
    if (j.stat) o.jira = { tickets: j.stat.tickets, pct_faits: j.pct, sprint: j.stat.sprint || null };
    const js = Core.jalonsOf(base, i.id); if (js.length) o.jalons = js.map((x) => ({ nom: x.nom, date: x.date, statut: x.statut, recul_jo: Core.recul(x) }));
    const rs = base.risques.filter((r) => r.item === i.id && r.ouvert !== false); if (rs.length) o.risques = rs.map((r) => ({ titre: r.titre, score: Core.risqueScore(r) }));
    const at = base.attentes.filter((a) => a.item === i.id && !a.recue_le); if (at.length) o.attentes = at.map((a) => ({ tiers: a.tiers, objet: a.objet, attendue_le: a.attendue_le }));
    if (i.support) o.support = i.support;
    return o;
  });
  const sprintBloc = (sp) => {
    if (!sp) return null; const v = Core.sprintVue(base, sp.id, date);
    return { id: sp.id, nom: sp.nom, debut: sp.debut, fin: sp.fin, etat: sp.etat, jours_ouvres: v.jours_ouvres, points_equipe: v.jira.points,
      taches_parentes: v.jira.tickets, sans_points: v.jira.sansPoints, sous_taches: v.jira.sousTaches,
      par_item: Object.entries(v.jira.parItem).map(([id, x]) => Object.assign({ item: nom(id) }, x)),
      personnes: v.personnes.map((p) => ({ nom: p.nom, role: p.role, equipe: p.connu, sous_taches: p.sousTaches, a_faire: p.aFaire, en_cours: p.enCours, faites: p.faites, dispo_j: p.capacite })),
      absences: v.absences.map((a) => ({ qui: a.personne ? (ix.personnes[a.personne] || { nom: a.personne }).nom : (a.libelle || 'collective'), debut: a.debut, fin: a.fin, jours: a.jours_ouvres })) };
  };
  const sprints = base.sprints.slice().sort((a, b) => a.debut.localeCompare(b.debut));
  const cur = Core.sprintAt(base, date) || sprints.find((s) => s.etat === 'actif') || null;
  const next = cur ? sprints.find((s) => s.debut > cur.fin) || null : null;
  const meps = base.meps.filter((m) => m.date >= Core.addDays(date, -30) && m.date <= Core.addDays(date, 30)).sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ date: m.date, systeme: m.systeme, statut: m.statut, ticket: m.ticket || null, libelle: m.libelle || null }));
  const prevDir = (() => {
    const parent = path.dirname(path.resolve(runDir));
    const d = fs.readdirSync(parent).filter((x) => DATE.test(x) && x < Core.mondayOf(date) && fs.existsSync(path.join(parent, x, 'analyste.json'))).sort().pop();
    return d ? path.join(parent, d) : null;
  })();
  const prevSignaux = prevDir ? JSON.parse(fs.readFileSync(path.join(prevDir, 'analyste.json'), 'utf8')).signaux || [] : [];
  const verdicts = prevDir && fs.existsSync(path.join(prevDir, 'verdicts.json')) ? JSON.parse(fs.readFileSync(path.join(prevDir, 'verdicts.json'), 'utf8')) : null;
  const dossier = {
    date, consigne: 'Ne répète aucune alerte de « alertes_regles » : elles sont déjà au digest. Cherche ce que croiser les sources révèle.',
    items, sprint_courant: sprintBloc(cur), sprint_suivant: sprintBloc(next), meps,
    alertes_regles: Core.alertes(base, date).map((a) => `${a.kind} · ${a.texte}`),
    signaux_semaine_precedente: prevSignaux, verdicts_franck: verdicts
  };
  writeJson(outP, dossier);
  console.log(`dossier: ${items.length} items · sprint ${cur ? cur.id : '—'} / ${next ? next.id : '—'} · ${meps.length} MEP · ${dossier.alertes_regles.length} alertes déjà connues · ${prevSignaux.length} signaux précédents`);
}

const keyOf = (a) => `${a.kind}|${a.item || ''}|${a.texte.replace(/\d+ (jours|j)\b/g, 'N j')}`;

function previousRun(runDir, date) {
  const parent = path.dirname(path.resolve(runDir));
  const prev = fs.readdirSync(parent).filter((d) => DATE.test(d) && d < date && fs.existsSync(path.join(parent, d, 'alertes.json'))).sort().pop();
  if (!prev) return null;
  // Same rules on both sides: when the previous Monday's export is kept, its alerts are recomputed with today's core,
  // so a rule change (R44, 29 Oct.) does not mark every alert "nouvelle"; the stored alertes.json is the fallback.
  const prevBase = path.join(parent, prev, 'base_apres');
  if (fs.existsSync(prevBase)) {
    const b = Core.publicBase(loadBase(prevBase));
    if (b.items.length) return { date: prev, alertes: Core.alertes(b, prev), recalcule: true };
  }
  return { date: prev, alertes: JSON.parse(fs.readFileSync(path.join(parent, prev, 'alertes.json'), 'utf8')).alertes };
}
function signalLines(sigs) {
  // Group by kind; ≤ 2 occurrences shown in full, more collapsed to one line with the rows.
  const by = {}; sigs.forEach((s) => (by[s.kind] = by[s.kind] || []).push(s));
  const kinds = Object.keys(by).sort((a, b) => {
    const pa = PRIO_SIG.indexOf(a); const pb = PRIO_SIG.indexOf(b);
    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a.localeCompare(b);
  });
  const out = [];
  kinds.forEach((k) => {
    const l = by[k];
    if (k === 'champ_possede') { out.push({ kind: k, texte: `${l.length} champ(s) possédé(s) que la source propose autrement : ${l.map((s) => s.row).join(' · ')} (modifiable dans Gérer)` }); return; }
    if (DOUBLON.has(k)) return;
    if (l.length <= 2) l.forEach((s) => out.push({ kind: k, texte: short(s.texte, 180) }));
    else out.push({ kind: k, texte: `${l.length} × ${k.replace(/_/g, ' ')} : ${l.map((s) => s.row).filter((r) => r != null).join(' · ') || l[0].texte}` });
  });
  return out;
}

function cmdDigest(args) {
  const ri = args.indexOf('--reco'); let reco = null;
  if (ri >= 0) { reco = args[ri + 1]; args = args.slice(0, ri).concat(args.slice(ri + 2)); }
  const si = args.indexOf('--signaux'); let signaux = [];
  if (si >= 0) { signaux = readSignaux(args[si + 1]); args = args.slice(0, si).concat(args.slice(si + 2)); }
  const [runDir, date, nowTs, url, outMd, outMsg] = args;
  if (!outMsg || !DATE.test(date) || !TS.test(nowTs)) usage();
  const lundi = DATE.test(date) ? Core.mondayOf(date) : null;
  const statut = JSON.parse(fs.readFileSync(path.join(runDir, 'statut.json'), 'utf8'));
  const base = Core.publicBase(loadBase(path.join(runDir, 'base_apres'))); // R37: hidden items never reach the digest
  if (!base.items.length) fail('refused: base_apres is empty — export the base after the adapters');
  const ix = Core.index(base);

  // 1) alerts (the five rules of step 4 + phase), new vs the previous Monday
  // Previous Monday's run only: a rerun in the same week (dir named after its Monday) never compares to itself
  const prev = previousRun(runDir, Core.mondayOf(date));
  const prevKeys = new Set((prev ? prev.alertes : []).map(keyOf));
  const alertes = Core.alertes(base, date).map((a) => Object.assign(a, { nouvelle: prev ? !prevKeys.has(keyOf(a)) : null }))
    .sort((a, b) => ORDRE.indexOf(a.kind) - ORDRE.indexOf(b.kind) || (b.nouvelle === true) - (a.nouvelle === true) || a.texte.localeCompare(b.texte));
  writeJson(path.join(runDir, 'alertes.json'), { date, calcule_le: nowTs, alertes });

  // 2) health changes since the previous snapshot (snap.* only; the seeded example is not a Monday)
  const snaps = base.instantanes.filter((x) => /^snap\.\d{4}-\d{2}-\d{2}$/.test(x.id)).sort((a, b) => a.date.localeCompare(b.date));
  const ref = snaps.filter((x) => x.date < lundi).pop() || null;
  const courant = snaps.filter((x) => x.date >= lundi && x.date <= date).pop() || null;
  const santeAvant = {}; (ref ? ref.items : []).forEach((x) => { santeAvant[x.item] = x.sante; });
  const changements = ref ? base.items.filter((it) => it.etape === 'actif' || it.etape === 'planifie').map((it) => {
    const s = Core.sante(base, it, date); return { it, avant: santeAvant[it.id] || '(nouveau)', apres: s.couleur, motif: s.motifs[0] || '' };
  }).filter((x) => x.avant !== x.apres) : [];

  // 3) adapters and their signals
  const adapt = statut.adaptateurs || [];
  const ok = adapt.filter((a) => a.statut === 'ok').length;
  const sigs = [];
  adapt.forEach((a) => {
    if (!a.report) return;
    const p = path.isAbsolute(a.report) ? a.report : path.join(runDir, a.report);
    if (!fs.existsSync(p)) return;
    const r = JSON.parse(fs.readFileSync(p, 'utf8'));
    signalLines(r.signals || []).forEach((s) => sigs.push(Object.assign({ source: ADAPT[a.nom] || a.nom }, s)));
  });

  // 4) portfolio counts (computed live, as the view does)
  const actifs = base.items.filter((i) => (i.etape === 'actif' || i.etape === 'planifie') && i.type !== 'programme');
  const couleurs = { rouge: 0, jaune: 0, vert: 0 }; actifs.forEach((i) => { couleurs[Core.sante(base, i, date).couleur]++; });
  const mep7 = base.meps.filter((m) => m.date >= date && m.date <= Core.addDays(date, 7) && m.statut !== 'annulee').sort((a, b) => a.date.localeCompare(b.date));
  const sp = Core.sprintAt(base, date);

  const L = [];
  L.push(`# Digest Portefeuille PLQ — semaine du ${Core.fmtDate(lundi, true)}`, '');
  L.push(`> Calculé le ${fmtLocal(nowTs)} · sources lues ${ok}/${adapt.length} · instantané ${courant ? '`' + courant.id + '` écrit avant recalcul' : '**absent**'} · [Portefeuille PLQ](${url})`, '');
  const echecs = adapt.filter((a) => a.statut !== 'ok');
  if (echecs.length) {
    L.push('## Sources non lues', '', '| Source | Statut | Cause |', '|---|---|---|');
    echecs.forEach((a) => L.push(`| ${ADAPT[a.nom] || a.nom} | ${a.statut} | ${cell(a.cause || '—')} |`));
    L.push('', '*Les valeurs de ces sources sont celles de la lecture précédente.*', '');
  }
  if (alertes.length) {
    L.push(`## Alertes (${alertes.length})`, '', '| Règle | Alerte | Nouvelle |', '|---|---|---|');
    const nv = (a) => (a.nouvelle === null ? '—' : a.nouvelle ? 'oui' : 'non');
    ORDRE.forEach((k) => {
      const l = alertes.filter((a) => a.kind === k); if (!l.length) return;
      if (!COLLAPSE.has(k) || l.length <= 2) { l.forEach((a) => L.push(`| ${REGLE[k]} | ${cell(a.texte)} | ${nv(a)} |`)); return; }
      // One row per rule: item code (Smartsheet L) or name, with its age for freshness
      const lab = (a) => { const it = ix.items[a.item]; const n = it ? (/^L[\d.-]+[A-Z]?\b/.test(it.nom) ? it.nom.split(' ')[0] : it.nom) : a.item; const m = a.texte.match(/depuis (\d+) j ouvrés/); return m ? `${n} (${m[1]} j o.)` : n; };
      const nouvelles = l.filter((a) => a.nouvelle).map(lab);
      L.push(`| ${REGLE[k]} | ${l.length} items : ${cell(l.map(lab).join(' · '))} | ${prev ? (nouvelles.length ? cell(nouvelles.join(' · ')) : 'non') : '—'} |`);
    });
    if (!prev) L.push('', '*Première exécution : aucune alerte de la semaine précédente à comparer (« — »).*');
    L.push('');
  }
  if (signaux.length) {
    // Analyst (step 3b): judgment across sources, never written to the base; Franck confirms in Gérer or rejects.
    L.push(`## Signaux à confirmer — analyste (${signaux.length})`, '', '| Signal | Constat | Preuves | Cause probable | Qui |', '|---|---|---|---|---|');
    signaux.forEach((s) => L.push(`| ${cell(s.titre)} | ${cell(s.constat)} | ${cell(s.preuves.join(' · '))} | ${cell(s.cause)} | ${cell(s.porteur || '—')} |`));
    L.push('', '*Hypothèses d\'un agent au contexte neuf, à juger « juste » ou « faux » : un signal confirmé devient un risque dans Gérer ; jamais écrit en base par la tâche.*', '');
  }
  if (changements.length) {
    L.push(`## Santé — changements depuis l'instantané du ${Core.fmtDate(ref.date)}`, '', '| Item | Avant | Maintenant | Motif |', '|---|---|---|---|');
    changements.forEach((c) => L.push(`| ${cell(c.it.nom)} | ${c.avant} | ${c.apres} | ${cell(c.motif)} |`));
    L.push('');
  }
  L.push('## Portefeuille', '', '| Mesure | Valeur |', '|---|---|');
  L.push(`| Items actifs ou planifiés | ${actifs.length} · rouge ${couleurs.rouge} · jaune ${couleurs.jaune} · vert ${couleurs.vert} |`);
  if (sp) L.push(`| Sprint en cours | ${sp.nom || sp.id} · ${Core.fmtDate(sp.debut)} → ${Core.fmtDate(sp.fin)} |`);
  if (mep7.length) L.push(`| MEP dans 7 jours | ${mep7.map((m) => `${Core.fmtDate(m.date)} ${cell(m.systeme)} (${m.statut})`).join(' · ')} |`);
  if (!ref) L.push('| Comparaison de santé | première exécution : aucun instantané précédent |');
  L.push('');
  if (sigs.length) {
    L.push(`## Signaux des adaptateurs (${sigs.length})`, '', '| Source | Signal |', '|---|---|');
    // Priority signals first across all sources (stable order otherwise), then cap
    const pr = (s) => { const k = PRIO_SIG.indexOf(s.kind); return k < 0 ? 99 : k; };
    sigs.sort((x, y) => pr(x) - pr(y));
    sigs.slice(0, MAX_SIG).forEach((s) => L.push(`| ${s.source} | ${cell(s.texte)} |`));
    if (sigs.length > MAX_SIG) L.push(`| — | ${sigs.length - MAX_SIG} autres signaux dans les report.json du dossier d'exécution |`);
    L.push('');
  }
  if (reco) L.push('## Recommandation', '', reco, '');
  L.push('---', `*Règles : D7, D8, D16, étape 4 (recul ≥ 5 j ouvrés et sa chaîne · jalon dépassé · bloqués du sprint · risque ≥ 15 · attente > 5 j ouvrés · MEP ≤ 7 j · fraîcheur : ni Smartsheet ni Jira depuis > 15 j ouvrés). Tâche « Portefeuille PLQ — lundi 7 h ». Aucune source n'est modifiée.*`, '');
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outMd, L.join('\n'), 'utf8');

  // Teams message: short, HTML (narrow allowlist), link to the artifact. One line per rule (as the digest), new first.
  // Silence rule: nothing new since last Monday (no new alert, no health change, all sources read) = two lines only.
  const nNew = alertes.filter((a) => a.nouvelle).length;
  const calme = prev && !nNew && !changements.length && !echecs.length;
  const parRegle = ORDRE.map((k) => {
    const l = alertes.filter((a) => a.kind === k); if (!l.length) return null;
    const lab = (a) => { const it = ix.items[a.item]; return it ? (/^L[\d.-]+[A-Z]?\b/.test(it.nom) ? it.nom.split(' ')[0] : it.nom) : (a.item || ''); };
    const txt = l.length === 1 ? l[0].texte : COLLAPSE.has(k) ? `${l.length} items : ${l.map(lab).join(' · ')}` : `${l.length} alertes : ${l.map((a) => a.texte).join(' · ')}`;
    return { k, nouv: l.some((a) => a.nouvelle), txt };
  }).filter(Boolean).sort((a, b) => b.nouv - a.nouv);
  const M = [];
  M.push(`<p><b>Portefeuille PLQ — semaine du ${esc(Core.fmtDate(lundi, true))}</b></p>`);
  M.push(`<p>${actifs.length} items actifs ou planifiés · rouge ${couleurs.rouge} · jaune ${couleurs.jaune} · vert ${couleurs.vert} · ${alertes.length} alerte${alertes.length > 1 ? 's' : ''}${prev ? ` dont ${nNew} nouvelle${nNew > 1 ? 's' : ''}` : ''} · sources ${ok}/${adapt.length}</p>`);
  if (calme) M.push('<p>Rien de nouveau depuis lundi dernier.</p>');
  else {
    if (echecs.length) M.push(`<p>Sources non lues : ${esc(echecs.map((a) => ADAPT[a.nom] || a.nom).join(', '))}</p>`);
    if (parRegle.length) M.push('<ul>' + parRegle.map((r) => `<li>${r.nouv ? '<b>nouveau</b> · ' : ''}${esc(REGLE[r.k])} — ${esc(r.txt)}</li>`).join('') + '</ul>');
    if (changements.length) M.push(`<p>Santé : ${esc(changements.map((c) => `${c.it.nom} ${c.avant} → ${c.apres}`).join(' · '))}</p>`);
    if (signaux.length) M.push(`<p>${signaux.length} ${signaux.length > 1 ? 'signaux' : 'signal'} à confirmer (analyste) : ${esc(signaux.map((s) => s.titre).join(' · '))}</p>`);
    if (reco) M.push(`<p><b>À faire cette semaine :</b> ${esc(reco)}</p>`);
  }
  M.push(`<p><a href="${esc(url)}">Ouvrir le Portefeuille PLQ</a></p>`);
  fs.writeFileSync(outMsg, M.join('\n') + '\n', 'utf8');
  if (courant) {
    writeJson(path.join(runDir, 'snap_sources.json'), [{ op: 'update', collection: 'instantanes', doc_id: courant.id,
      data: { sources_ok: ok, sources_total: adapt.length }, if_version: statut.instantane && statut.instantane.version || 1 }]);
  }
  console.log(`digest ${date}: ${alertes.length} alerts · ${changements.length} health changes · ${sigs.length} signal lines · sources ${ok}/${adapt.length}`);
}

// ---------- versions / writes helpers ----------
function cmdVersions([avant, ...batches]) {
  if (!avant) usage();
  const v = JSON.parse(fs.readFileSync(avant, 'utf8'));
  batches.forEach((b) => JSON.parse(fs.readFileSync(b, 'utf8')).forEach((w) => {
    const k = `${w.collection}/${w.doc_id}`;
    if (w.op === 'delete') fail(`refused: ${b} holds a delete — never applied by the Monday run`);
    v[k] = (k in v) ? v[k] + 1 : 1;
  }));
  process.stdout.write(JSON.stringify(v, null, 0) + '\n');
}
function cmdWrites([batchP, outDir, from, to]) {
  if (!outDir) usage();
  const batch = JSON.parse(fs.readFileSync(batchP, 'utf8'));
  // Default path mapping: this repo's Linux mount → its Windows path (the ArtifactData tool reads Windows paths).
  const root = path.resolve(__dirname, '..');
  const src = from || root; const dst = to || 'C:\\Users\\fkowalczyk\\Projets_Dev\\Portefeuille_PLQ';
  const win = (p) => { const a = path.resolve(p); return a.startsWith(src) ? dst + a.slice(src.length).replace(/\//g, '\\') : a; };
  fs.mkdirSync(outDir, { recursive: true });
  const writes = batch.map((w, k) => {
    // Only deletion ever allowed: Jira-data charges not re-read (rule K13, standing consent Franck 2026-10-29)
    if (w.op === 'delete') {
      if (!(w.purge === 'K13' && w.collection === 'charges' && /^jira\./.test(w.doc_id))) fail(`refused: ${batchP} holds a delete`);
      const o = { op: 'delete', collection: w.collection, doc_id: w.doc_id }; if (w.if_version) o.if_version = w.if_version; return o;
    }
    const f = path.join(outDir, `${String(k).padStart(3, '0')}_${w.collection}_${w.doc_id}.json`);
    fs.writeFileSync(f, JSON.stringify(w.data), 'utf8');
    const o = { op: w.op, collection: w.collection, doc_id: w.doc_id, file_path: win(f) };
    if (w.if_version) o.if_version = w.if_version;
    return o;
  });
  const chunks = []; for (let i = 0; i < writes.length; i += 50) chunks.push(writes.slice(i, i + 50));
  process.stdout.write(JSON.stringify(chunks, null, 1) + '\n');
}

// ---------- page check ----------
function norm(html) { return String(html).replace(/\r\n/g, '\n').trim(); }
function cmdPagecheck([built, published]) {
  if (!published) usage();
  let a; let b;
  try { a = norm(fs.readFileSync(built, 'utf8')); b = norm(fs.readFileSync(published, 'utf8')); } catch (e) { fail(String(e.message)); }
  const h = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
  if (a === b) { console.log(`page unchanged (${h(a)}) — no republication`); process.exit(0); }
  // The published copy may be wrapped in a skeleton by the platform: unchanged if it contains the built page whole.
  if (b.includes(a)) { console.log(`page unchanged (${h(a)}, wrapped) — no republication`); process.exit(0); }
  console.log(`page changed: built ${h(a)} ≠ published ${h(b)} — republish`); process.exit(10);
}

function usage() { const t = fs.readFileSync(__filename, 'utf8'); console.error(t.slice(0, t.indexOf("'use strict'"))); process.exit(2); }
function fail(msg, code) { console.error(msg); process.exit(code || 1); }

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'snapshot') cmdSnapshot(rest);
  else if (cmd === 'digest') cmdDigest(rest);
  else if (cmd === 'dossier') cmdDossier(rest);
  else if (cmd === 'pagecheck') cmdPagecheck(rest);
  else if (cmd === 'versions') cmdVersions(rest);
  else if (cmd === 'writes') cmdWrites(rest);
  else usage();
}
module.exports = { buildSnapshot, loadBase, signalLines, fmtLocal, keyOf, readSignaux };
