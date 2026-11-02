#!/usr/bin/env node
/* Architect roadmap translator (Kickoff D12 v10): the architect's artefact carries a « donnees-programme » JSON block
 * (format 1.0, his own), read as delivered — never asked to change. This module turns it into a canonical model
 * document (same shape as a portfolio-feed block), which adapt_artefacts.js then checks and maps like any feed.
 *
 * Mapping (fiche Adaptateur_Artefacts_v3 §3 bis):
 *   - one programme item <prefix> (the registered expected item) + one projet item per « projet » value
 *     (<prefix>.<slug of the project name>), voie flux, responsable = registry owner;
 *   - each « tache » = one milestone « end of task » (D4: yes/no at a date): id <prefix>.<task id lower-cased>, date = fin_prevue,
 *     date_initiale = fin_initiale; statut a_faire -> a_venir, en_cours -> en_cours, termine|fait -> fait;
 *     an unknown statut = the whole block refused (fail closed, as A3);
 *   - depend_de « X, Y » = dependance bloque from milestone X to this milestone (<prefix>.dep-<x>-<this>);
 *   - item pct_avancement = task avancement_pct weighted by working days; fenetre = min start / max end (planned);
 *     etape = actif when a task has started (debut_prevu <= data date), else planifie; etape and fenetre follow the
 *     source at every read (adapt_artefacts SOURCE_OWNED, D12 v10), unlike portfolio-feed items;
 *   - one display Gantt <prefix>.gantt on the programme item: tab « Horizon engagé », tab « Au carnet » (commentaire
 *     « au carnet »), one group per project, planned bars (the initial plan stays visible through milestone recul);
 *   - risque_principal has no probability/impact: not a risk record (D8 needs P x I);
 *   - inconsistencies of the source (started status with a future start, progress on a « a_faire » task, past end
 *     still open) and the block's « changements_semaine » are returned as signals, never corrected.
 */
'use strict';
const crypto = require('crypto');

const RE_PROG = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const STATUTS = { a_faire: 'a_venir', en_cours: 'en_cours', termine: 'fait', fait: 'fait' };
const CARNET = /au carnet/i;

function extractProgramme(html) {
  const out = []; let m; RE_PROG.lastIndex = 0;
  while ((m = RE_PROG.exec(html))) if (/\bid\s*=\s*["']?donnees-programme["']?/i.test(m[1])) out.push({ json: /type\s*=\s*["']application\/json["']/i.test(m[1]), text: m[2] });
  return out;
}

function slug(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Québec offset for a date: EDT (-04:00) from the 2nd Sunday of March to the 1st Sunday of November, else EST (-05:00)
function quebecOffset(date) {
  const y = +date.slice(0, 4);
  const nthSunday = (month, n) => { const d = new Date(Date.UTC(y, month, 1)); const first = (7 - d.getUTCDay()) % 7 + 1; return `${y}-${String(month + 1).padStart(2, '0')}-${String(first + 7 * (n - 1)).padStart(2, '0')}`; };
  // the switch happens at 2 a.m.: on the switch day itself, midnight is still on the previous offset
  return date > nthSunday(2, 2) && date <= nthSunday(10, 1) ? '-04:00' : '-05:00';
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/* prog = parsed donnees-programme JSON ; reg = registry row {url, item, prefixe, proprietaire}
 * returns {feed, errors[], signals[]} ; errors non-empty = feed must be ignored whole */
function translate(prog, reg) {
  const errors = []; const signals = [];
  const P = reg.prefixe; const top = reg.item || P;
  if (!prog || prog.version_schema !== '1.0') errors.push(`version_schema « ${prog && prog.version_schema} » ≠ 1.0`);
  if (!prog || !ISO.test(prog.date_donnees || '')) errors.push('date_donnees absente ou hors AAAA-MM-JJ');
  const taches = (prog && Array.isArray(prog.taches)) ? prog.taches : (errors.push('taches absent'), []);
  if (errors.length) return { feed: null, errors, signals };
  const D = prog.date_donnees; const luLe = `${D}T00:00${quebecOffset(D)}`;
  const src = { systeme: 'artefact', ref: reg.url, lu_le: luLe };
  const ids = new Set();
  taches.forEach((t, i) => {
    const w = `taches[${i}] ${t && t.id}`;
    if (!t || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(t.id || '')) errors.push(`${w} : id manquant ou hors forme`);
    else if (ids.has(slug(t.id))) errors.push(`${w} : id en double (casse ignorée)`); else ids.add(slug(t.id));
    if (!t.projet || !String(t.projet).trim()) errors.push(`${w} : projet vide`);
    if (!t.tache || !String(t.tache).trim()) errors.push(`${w} : tache vide`);
    ['debut_prevu', 'fin_prevue', 'fin_initiale'].forEach((k) => { if (!ISO.test(t[k] || '')) errors.push(`${w} : ${k} hors AAAA-MM-JJ`); });
    if (t.debut_prevu > t.fin_prevue) errors.push(`${w} : début ${t.debut_prevu} après la fin ${t.fin_prevue}`);
    if (!(t.statut in STATUTS)) errors.push(`${w} : statut « ${t.statut} » inconnu (attendu ${Object.keys(STATUTS).join(', ')})`);
  });
  // two project names folding to the same slug would merge two items silently
  const bySlug = {}; taches.forEach((t) => { const s = slug(t.projet); (bySlug[s] = bySlug[s] || new Set()).add(t.projet); });
  Object.entries(bySlug).filter(([, v]) => v.size > 1).forEach(([s, v]) => errors.push(`projets ${[...v].join(' / ')} : même identifiant ${P}.${s}`));
  if (errors.length) return { feed: null, errors, signals };

  const projets = []; const byP = {};
  taches.forEach((t) => { if (!byP[t.projet]) { byP[t.projet] = []; projets.push(t.projet); } byP[t.projet].push(t); });
  const jo = (t) => Math.max(1, +t.duree_jours_ouvres || 1);
  const pct = (ts) => Math.round(ts.reduce((s, t) => s + jo(t) * (+t.avancement_pct || 0), 0) / ts.reduce((s, t) => s + jo(t), 0));
  const window = (ts) => ({ debut: ts.map((t) => t.debut_prevu).sort()[0], fin: ts.map((t) => t.fin_prevue).sort().pop() });
  const started = (ts) => ts.some((t) => t.debut_prevu <= D && STATUTS[t.statut] !== 'fait');
  const done = (ts) => ts.every((t) => STATUTS[t.statut] === 'fait');
  const etape = (ts) => (done(ts) ? 'termine' : started(ts) ? 'actif' : 'planifie');
  const itemId = (p) => `${P}.${slug(p)}`;

  const items = [{ id: top, nom: "Roadmap de l'architecte", type: 'programme', parent: null, voie: 'flux', etape: etape(taches), promu: false,
    responsable: reg.proprietaire, fenetre: window(taches), liens: [{ libelle: "Roadmap de l'architecte", url: reg.url }],
    pct_avancement: pct(taches), updated_at: luLe, source: Object.assign({ par: 'roadmap architecte' }, src) }];
  projets.forEach((p) => {
    const ts = byP[p];
    items.push({ id: itemId(p), nom: p, type: 'projet', parent: top, voie: 'flux', etape: etape(ts), promu: false, responsable: reg.proprietaire,
      fenetre: window(ts), pct_avancement: pct(ts), updated_at: luLe, source: Object.assign({ par: 'roadmap architecte' }, src) });
  });

  const jid = (id) => `${P}.${slug(id)}`;
  const jalons = taches.map((t) => {
    const j = { id: jid(t.id), item: itemId(t.projet), nom: `Fin ${t.id} · ${t.tache}`, date: t.fin_prevue, date_initiale: t.fin_initiale,
      statut: STATUTS[t.statut], precision: 'jour', source: src };
    // no actual end date in format 1.0: fait_le stays empty rather than invented
    return j;
  });

  const dependances = [];
  taches.forEach((t) => String(t.depend_de || '').split(/[,;\s]+/).filter(Boolean).forEach((d) => {
    if (!ids.has(slug(d))) { signals.push({ kind: 'archi_dependance', row: jid(t.id), texte: `${t.id} dépend de ${d}, absent de la roadmap — dépendance non écrite` }); return; }
    dependances.push({ id: `${P}.dep-${slug(d)}-${slug(t.id)}`, type: 'bloque', de: { kind: 'jalon', id: jid(d) }, vers: { kind: 'jalon', id: jid(t.id) },
      note: `${t.id} dépend de ${d} (roadmap de l'architecte)`, source: src });
  }));

  // source inconsistencies: reported, never corrected (the architect owns his data)
  taches.forEach((t) => {
    const why = [];
    if (t.statut === 'en_cours' && t.debut_prevu > D) why.push(`« en cours » mais début prévu le ${t.debut_prevu}`);
    if (t.statut === 'a_faire' && +t.avancement_pct > 0) why.push(`« à faire » mais ${t.avancement_pct} % d'avancement`);
    if (STATUTS[t.statut] !== 'fait' && t.fin_prevue < D) why.push(`fin prévue ${t.fin_prevue} passée, non terminée (${t.avancement_pct} %)`);
    if (why.length) signals.push({ kind: 'archi_incoherence', row: jid(t.id), texte: `${t.id} ${t.tache} : ${why.join(' ; ')}` });
  });
  // axis of the id prefix (config/archi_axes.json): « lot » must match it
  const axes = reg.axes || {};
  if (Object.keys(axes).length) taches.forEach((t) => {
    const pre = String(t.id).split('-')[0]; const a = axes[pre];
    if (!a) signals.push({ kind: 'archi_axe', row: jid(t.id), texte: `${t.id} : préfixe ${pre} hors des axes connus (config/archi_axes.json)` });
    // config axis « Domaine métier » is the short form of « Domaine métier : modules fonctionnels (…) »
    else if (t.lot && t.lot !== a && !t.lot.startsWith(a)) signals.push({ kind: 'archi_axe', row: jid(t.id), texte: `${t.id} : lot « ${t.lot} » ≠ axe du préfixe ${pre} « ${a} »` });
  });
  (prog.changements_semaine || []).forEach((c) => signals.push({ kind: 'archi_changement', row: reg.url, texte: `Roadmap de l'architecte (${D}) : ${c}` }));

  // display Gantt on the programme item: committed horizon vs backlog (« au carnet »), one group per project
  const tab = (nom, ts) => {
    const groupes = projets.map((p) => ({ nom: p, taches: ts.filter((t) => t.projet === p).map((t) => {
      const x = { ref: t.id, nom: t.tache, debut: t.debut_prevu, fin: t.fin_prevue }; if (STATUTS[t.statut] === 'fait') x.fait = true; return x;
    }) })).filter((g) => g.taches.length);
    return groupes.length ? Object.assign({ nom }, window(ts), { groupes }) : null;
  };
  const onglets = [tab('Horizon engagé', taches.filter((t) => !CARNET.test(t.commentaire || ''))), tab('Au carnet', taches.filter((t) => CARNET.test(t.commentaire || '')))].filter(Boolean);
  const gantt = { id: `${P}.gantt`, item: top, format: 'json', titre: "Roadmap de l'architecte", calcule_le: D,
    empreinte: crypto.createHash('sha256').update(JSON.stringify(onglets)).digest('hex'), onglets, source: Object.assign({ par: 'roadmap architecte' }, src) };

  const feed = { modele: '15', source: Object.assign({ par: 'roadmap architecte (donnees-programme 1.0)' }, src), items, jalons, gantts: [gantt] };
  if (dependances.length) feed.dependances = dependances;
  return { feed, errors, signals };
}

module.exports = { extractProgramme, translate, slug, quebecOffset };
