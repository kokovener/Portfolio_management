/* Portfolio PLQ — pure computation core (no DOM, no I/O).
 * Shared by the artifact page (inlined at build time) and the node tests.
 * Implements the canonical model v1 rules: D7 capacity, D8 health, D9 priority,
 * D16 dependency alerts, step-4 alert rules (computed live for display).
 */
(function (root) {
  'use strict';

  const COLLECTIONS = ['items', 'jalons', 'risques', 'attentes', 'dependances', 'livrables', 'meps',
    'actions_retro', 'charges', 'sprints', 'personnes', 'absences', 'stats_jira', 'instantanes'];
  // collection key -> schema $defs name
  const DEF_OF = {
    items: 'item', jalons: 'jalon', risques: 'risque', attentes: 'attente', dependances: 'dependance',
    livrables: 'livrable', meps: 'mep', actions_retro: 'action_retro', charges: 'charge',
    sprints: 'sprint', personnes: 'personne', absences: 'absence', stats_jira: 'stat_jira', instantanes: 'instantane'
  };
  const SEUILS = { fraicheur_j: 14, recul_jo: 5, attente_jo: 5, risque_rouge: 15, risque_jaune: 10, mep_j: 7, wip_defaut: 3 };
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  // ---------- dates (all local calendar dates, no time zone math on AAAA-MM-JJ) ----------
  function d(s) { if (!s) return null; const [y, m, j] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, j); }
  function iso(dt) { const p = (n) => String(n).padStart(2, '0'); return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`; }
  function addDays(s, n) { const x = d(s); x.setDate(x.getDate() + n); return iso(x); }
  function daysBetween(a, b) { return Math.round((d(b) - d(a)) / 86400000); }
  function mondayOf(s) { const x = d(s); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return iso(x); }
  // Weekdays in (a, b] when b > a; negative when b < a. No statutory holidays in v0.
  function workingDaysBetween(a, b) {
    if (!a || !b || a === b) return 0;
    const sign = b > a ? 1 : -1; let from = sign > 0 ? a : b; const to = sign > 0 ? b : a; let n = 0;
    while (from < to) { from = addDays(from, 1); const wd = d(from).getDay(); if (wd !== 0 && wd !== 6) n++; }
    return sign * n;
  }
  function weekdaysInRange(a, b) { // inclusive [a, b]
    let n = 0; for (let x = a; x <= b; x = addDays(x, 1)) { const wd = d(x).getDay(); if (wd !== 0 && wd !== 6) n++; }
    return n;
  }
  function fmtDate(s, withYear) { if (!s) return '—'; const x = d(s); return `${x.getDate()} ${MOIS[x.getMonth()]}${withYear ? ' ' + x.getFullYear() : ''}`; }
  // Timestamps are stored with an explicit offset; display in EDT wall time as written.
  function fmtTs(ts) {
    if (!ts) return '—';
    const m = String(ts).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
    if (!m) return String(ts);
    return `${fmtDate(m[1])} · ${m[2]}h${m[3]} EDT`;
  }
  function nowTs(date) { // EDT offset per project rule (never Z)
    const dt = date || new Date();
    const edt = new Date(dt.getTime() - 4 * 3600000);
    return edt.toISOString().slice(0, 16) + '-04:00';
  }
  function todayIso(date) { return nowTs(date).slice(0, 10); }

  // ---------- base helpers ----------
  function emptyBase() { const b = {}; COLLECTIONS.forEach((c) => { b[c] = []; }); return b; }
  // Merge several model documents into one base: same id => shallow merge, later wins.
  function mergeDocs(docs) {
    const base = emptyBase();
    const pos = {};
    COLLECTIONS.forEach((c) => { pos[c] = {}; });
    docs.forEach((doc) => {
      COLLECTIONS.forEach((c) => {
        (doc[c] || []).forEach((rec) => {
          if (rec.id in pos[c]) base[c][pos[c][rec.id]] = Object.assign({}, base[c][pos[c][rec.id]], rec);
          else { pos[c][rec.id] = base[c].length; base[c].push(Object.assign({}, rec)); }
        });
      });
    });
    return base;
  }
  function byId(list) { const m = {}; (list || []).forEach((r) => { m[r.id] = r; }); return m; }
  function index(base) {
    return {
      items: byId(base.items), jalons: byId(base.jalons), livrables: byId(base.livrables),
      personnes: byId(base.personnes), sprints: byId(base.sprints)
    };
  }

  // ---------- D9 priority ----------
  function prioriteScore(p) { return p ? p.valeur + p.urgence - p.effort : null; }
  function risqueScore(r) { return r.probabilite * r.impact; }
  function rangs(base) {
    const withP = base.items.filter((i) => i.priorite && i.etape !== 'termine')
      .map((i) => ({ id: i.id, s: prioriteScore(i.priorite) }))
      .sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
    const r = {}; withP.forEach((x, k) => { r[x.id] = k + 1; }); return r;
  }
  function risqueMaxNote(base, itemId) {
    const s = base.risques.filter((r) => r.item === itemId && r.ouvert !== false).map(risqueScore);
    if (!s.length) return null; return Math.max(1, Math.min(5, Math.round(Math.max(...s) / 5)));
  }

  // ---------- progress ----------
  function jalonsOf(base, itemId) { return base.jalons.filter((j) => j.item === itemId).sort((a, b) => a.date.localeCompare(b.date)); }
  function pct(base, item) {
    if (typeof item.pct_avancement === 'number') return { valeur: item.pct_avancement, origine: 'source' };
    const js = jalonsOf(base, item.id); if (!js.length) return null;
    return { valeur: Math.round(1000 * js.filter((j) => j.statut === 'fait').length / js.length) / 10, origine: 'jalons' };
  }
  function prochainJalon(base, itemId) { return jalonsOf(base, itemId).find((j) => j.statut !== 'fait') || null; }

  // ---------- recul (D16, step-4 rule) ----------
  function recul(rec) { // working days the target moved later than its first date
    if (!rec || !rec.date_initiale || rec.statut === 'fait') return 0;
    return Math.max(0, workingDaysBetween(rec.date_initiale, rec.date));
  }
  function refRecord(base, ix, ref) { return ref.kind === 'item' ? ix.items[ref.id] : ref.kind === 'jalon' ? ix.jalons[ref.id] : ix.livrables[ref.id]; }
  function refNom(base, ix, ref) { const r = refRecord(base, ix, ref); return r ? r.nom : ref.id; }
  function refItem(ix, ref) { // item that "owns" a reference
    if (ref.kind === 'item') return ref.id;
    const r = ref.kind === 'jalon' ? ix.jalons[ref.id] : ix.livrables[ref.id];
    return r ? r.item || null : null;
  }
  function predecesseurRecule(base, ix, ref) {
    if (ref.kind === 'item') return jalonsOf(base, ref.id).some((j) => recul(j) >= SEUILS.recul_jo);
    return recul(refRecord(base, ix, ref)) >= SEUILS.recul_jo;
  }

  // ---------- D8 health (computed, never declared) ----------
  function sante(base, item, today) {
    const rouge = []; const jaune = [];
    jalonsOf(base, item.id).forEach((j) => {
      if (j.statut === 'depasse' || (j.statut !== 'fait' && j.date < today)) rouge.push(`jalon dépassé : ${j.nom} (${fmtDate(j.date)})`);
    });
    base.risques.filter((r) => r.item === item.id && r.ouvert !== false).forEach((r) => {
      const s = risqueScore(r);
      if (s >= SEUILS.risque_rouge) rouge.push(`risque ${s} ≥ 15 : ${r.titre}`);
      else if (s >= SEUILS.risque_jaune) jaune.push(`risque ${s} ≥ 10 : ${r.titre}`);
    });
    const age = item.updated_at ? daysBetween(item.updated_at.slice(0, 10), today) : null;
    if (age !== null && age > SEUILS.fraicheur_j) rouge.push(`fraîcheur : ${age} j sans mise à jour (seuil 14)`);
    base.attentes.filter((a) => a.item === item.id && !a.recue_le).forEach((a) => {
      const retard = workingDaysBetween(a.attendue_le, today);
      if (retard > SEUILS.attente_jo) jaune.push(`attente ${a.tiers} : ${retard} j ouvrés de retard`);
    });
    const couleur = rouge.length ? 'rouge' : jaune.length ? 'jaune' : 'vert';
    return { couleur, motifs: rouge.concat(jaune) };
  }

  // ---------- charge / WIP (D7) ----------
  function sprintAt(base, date) { return base.sprints.find((s) => s.debut <= date && date <= s.fin) || null; }
  function wipParPersonne(base, today) {
    const lundi = mondayOf(today); const sp = sprintAt(base, today);
    const out = {};
    base.charges.filter((c) => c.mode === 'wip' && c.personne && (
      (c.periode.type === 'semaine' && c.periode.ref === lundi) || (c.periode.type === 'sprint' && sp && c.periode.ref === sp.id)))
      .forEach((c) => {
        const o = out[c.personne] || (out[c.personne] = { items: new Set(), valeur: 0 });
        o.items.add(c.item); o.valeur += c.valeur;
      });
    const ix = index(base);
    return Object.keys(out).map((pid) => {
      const p = ix.personnes[pid];
      return {
        personne: pid, nom: p ? p.nom : pid, role: p ? p.role : '?',
        wip: out[pid].items.size, limite: (p && p.wip_limite) || SEUILS.wip_defaut, items: [...out[pid].items]
      };
    }).sort((a, b) => (b.wip / b.limite) - (a.wip / a.limite));
  }
  function absJoursDansPeriode(base, personneId, a, b) {
    // Per weekday: each record contributes jours_ouvres / its weekdays (a half-day = 0.5); overlapping records
    // (personal + collective holiday, or two reads) are capped at 1 day so a day is never removed twice.
    const recs = base.absences.filter((x) => (x.personne === personneId || x.personne === null) && x.debut <= b && x.fin >= a)
      .map((x) => { const full = weekdaysInRange(x.debut, x.fin); return { x, f: full ? (typeof x.jours_ouvres === 'number' ? x.jours_ouvres : full) / full : 0 }; });
    if (!recs.length) return 0;
    let n = 0;
    for (let day = a; day <= b; day = addDays(day, 1)) {
      const wd = d(day).getDay(); if (wd === 0 || wd === 6) continue;
      n += Math.min(1, recs.filter((r) => r.x.debut <= day && r.x.fin >= day).reduce((s, r) => s + r.f, 0));
    }
    return n;
  }
  // Load per role over [today, today + 4 weeks). Scrum = person-days; flux = WIP.
  function chargeParRole(base, today, semaines) {
    const fin = addDays(today, 7 * (semaines || 4) - 1);
    const roles = {};
    const R = (r) => roles[r] || (roles[r] = { role: r, demande: 0, capacite: 0, mode: null, detail: '' });
    const sprints = base.sprints.filter((s) => s.debut <= fin && s.fin >= today).map((s) => s.id);
    base.charges.forEach((c) => {
      if (c.mode === 'jours_personne' && c.periode.type === 'sprint' && sprints.includes(c.periode.ref)) { const o = R(c.role); o.mode = o.mode || 'jours'; o.demande += c.valeur; }
      if (c.mode === 'etp') { const o = R(c.role); o.mode = o.mode || 'jours'; o.demande += c.valeur * weekdaysInRange(today, fin); }
    });
    Object.values(roles).forEach((o) => {
      if (o.mode !== 'jours') return;
      base.personnes.filter((p) => p.role === o.role).forEach((p) => {
        sprints.forEach((sid) => {
          const s = base.sprints.find((x) => x.id === sid);
          const j = s.jours_ouvres || weekdaysInRange(s.debut, s.fin);
          const net = j - absJoursDansPeriode(base, p.id, s.debut, s.fin);
          // D7: the run reserve is removed from dev capacity before computing load
          const res = o.role === 'dev' ? (typeof s.reserve_run_pct === 'number' ? s.reserve_run_pct : 15) : 0;
          o.capacite += net * (1 - res / 100);
        });
      });
      o.detail = `${fmtNum(o.demande)} / ${fmtNum(o.capacite)} j-p`;
    });
    wipParPersonne(base, today).forEach((w) => {
      const o = R(w.role); if (o.mode === 'jours') return; o.mode = 'wip'; o.demande += w.wip; o.capacite += w.limite; o.detail = `WIP ${o.demande} / ${o.capacite}`;
    });
    return Object.values(roles).map((o) => Object.assign(o, { pct: o.capacite ? Math.round(100 * o.demande / o.capacite) : null }))
      .sort((a, b) => (b.pct || 0) - (a.pct || 0));
  }
  function fmtNum(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }

  // ---------- step-4 alerts (computed live for display) ----------
  function alertes(base, today) {
    const ix = index(base); const out = [];
    base.items.filter((i) => i.etape === 'actif' || i.etape === 'planifie').forEach((i) => {
      const age = i.updated_at ? daysBetween(i.updated_at.slice(0, 10), today) : null;
      if (age !== null && age > SEUILS.fraicheur_j) out.push({ kind: 'fraicheur', item: i.id, texte: `${i.nom} : aucune mise à jour depuis ${age} jours (seuil 14).` });
    });
    // Decision Franck 2026-10-27: a Smartsheet L with an empty phase is active but flagged
    base.items.filter((i) => i.source && i.source.systeme === 'smartsheet' && i.etape === 'actif' && !i.phase_source && i.type !== 'programme')
      .forEach((i) => out.push({ kind: 'phase', item: i.id, texte: `${i.nom} : phase non renseignée dans Smartsheet.` }));
    wipParPersonne(base, today).filter((w) => w.wip > w.limite).forEach((w) => out.push({
      kind: 'wip', item: null,
      texte: `${w.nom} sur ${w.wip} items (limite ${w.limite}) : ${w.items.map((id) => (ix.items[id] || { nom: id }).nom).join(', ')}.`
    }));
    base.jalons.forEach((j) => {
      const r = recul(j);
      if (r >= SEUILS.recul_jo) out.push({ kind: 'jalon', item: j.item, texte: `${(ix.items[j.item] || { nom: j.item }).nom} — ${j.nom} : ${fmtDate(j.date_initiale)} → ${fmtDate(j.date)} (+${r} j ouvrés).` });
      else if (j.statut !== 'fait' && (j.statut === 'depasse' || j.date < today)) out.push({ kind: 'jalon', item: j.item, texte: `${(ix.items[j.item] || { nom: j.item }).nom} — ${j.nom} : dépassé depuis le ${fmtDate(j.date)}`.replace(/\.?$/, '.') });
    });
    // A deliverable (architect feed) that moves back is a milestone of its owner: same recul rule
    base.livrables.forEach((l) => {
      const r = recul(l);
      if (r >= SEUILS.recul_jo) out.push({ kind: 'jalon', item: l.item || null, texte: `Livrable ${l.nom} : ${fmtDate(l.date_initiale)} → ${fmtDate(l.date)} (+${r} j ouvrés).` });
    });
    base.dependances.forEach((dep) => {
      if (predecesseurRecule(base, ix, dep.de)) {
        out.push({ kind: 'dependance', item: refItem(ix, dep.vers), texte: `${dep.de.kind} « ${refNom(base, ix, dep.de)} » reculé → ${dep.vers.kind} « ${refNom(base, ix, dep.vers)} » en alerte (${dep.type}).` });
      }
    });
    base.meps.filter((m) => m.statut === 'planifiee' && m.date >= today && m.date <= addDays(today, SEUILS.mep_j))
      .forEach((m) => out.push({ kind: 'mep', item: m.item || null, texte: `${m.systeme} le ${fmtDate(m.date)} : pas encore « prête » (tickets de la version non tous prêts) à ${daysBetween(today, m.date)} jours${m.ticket ? ' (' + m.ticket + ')' : ''}.` }));
    return out;
  }

  // ---------- sprint view ----------
  function sprintVue(base, sprintId, today) {
    const ix = index(base); const s = ix.sprints[sprintId]; if (!s) return null;
    const jo = s.jours_ouvres || weekdaysInRange(s.debut, s.fin);
    const res = (typeof s.reserve_run_pct === 'number' ? s.reserve_run_pct : 15);
    const devs = base.personnes.filter((p) => p.role === 'dev');
    const devBrut = devs.length * jo;
    const devAbs = devs.reduce((n, p) => n + absJoursDansPeriode(base, p.id, s.debut, s.fin), 0);
    const devNet = Math.max(0, devBrut - devAbs);
    const reserve = Math.round(devNet * res) / 100;
    const charges = base.charges.filter((c) => c.periode.type === 'sprint' && c.periode.ref === s.id);
    const lundis = []; for (let x = mondayOf(s.debut); x <= s.fin; x = addDays(x, 7)) lundis.push(x);
    const chargesFlux = base.charges.filter((c) => c.mode === 'wip' && c.periode.type === 'semaine' && lundis.includes(c.periode.ref));
    // Feedback R04 (2026-10-28): Jira is the only truth of a sprint. An item belongs to it when Jira tickets of its
    // epics are in the sprint (charge mode points, model v2); nothing else (lane, hand-entered sprint content) adds it.
    // Its milestones dated in the sprint follow it. The programme itself is the "hors item" bucket (tickets of epics
    // owned by no item).
    // Franck's Jira flow (2026-10-28): points are the TEAM's, per item (mode points, no person); a person's load is the
    // number of sub-tasks assigned to them (mode taches). A points charge carrying a person is a pre-flow record: ignored.
    const pts = charges.filter((c) => c.mode === 'points' && !c.personne);
    const taches = charges.filter((c) => c.mode === 'taches');
    const isProg = (id) => ix.items[id] && ix.items[id].type === 'programme';
    const jiraItem = new Set(pts.concat(taches).map((c) => c.item).filter((id) => ix.items[id] && !isProg(id)));
    const jalons = base.jalons.filter((j) => j.date >= s.debut && j.date <= s.fin && jiraItem.has(j.item)).sort((a, b) => a.date.localeCompare(b.date));
    const items = [...jiraItem].map((id) => ix.items[id]);
    const pointsOf = (list) => list.reduce((n, c) => n + c.valeur, 0);
    const ticketsOf = (list) => list.reduce((n, c) => n + (c.tickets || 0), 0);
    const jiraParItem = {};
    const J = (id) => jiraParItem[id] || (jiraParItem[id] = { points: 0, tickets: 0, sousTaches: 0 });
    pts.forEach((c) => { const o = J(c.item); o.points += c.valeur; o.tickets += c.tickets || 0; });
    taches.forEach((c) => { J(c.item).sousTaches += c.valeur; });
    const horsItem = pts.filter((c) => isProg(c.item));
    // Feedback R05: everyone with sub-tasks in the sprint, plus every Scrum team member (capacity even without sub-task)
    const people = {};
    const P = (key, nom, role, pid) => people[key] || (people[key] = { key, personne: pid || null, nom, role, sousTaches: 0, faites: 0, enCours: 0, items: new Set() });
    base.personnes.filter((p) => p.voie === 'scrum').forEach((p) => P(p.id, p.nom, p.role, p.id));
    taches.forEach((c) => {
      const p = c.personne ? ix.personnes[c.personne] : null;
      const o = P(c.personne || 'nom:' + c.nom, p ? p.nom : (c.nom || c.personne), p ? p.role : c.role, c.personne);
      o.sousTaches += c.valeur; o.faites += c.faites || 0; o.enCours += c.en_cours || 0; o.items.add(c.item);
    });
    const personnes = Object.values(people).map((o) => Object.assign(o, {
      items: [...o.items], connu: !!o.personne, aFaire: o.sousTaches - o.faites - o.enCours,
      capacite: o.personne ? Math.max(0, jo - absJoursDansPeriode(base, o.personne, s.debut, s.fin)) : null
    })).sort((a, b) => (b.sousTaches - b.faites) - (a.sousTaches - a.faites) || b.sousTaches - a.sousTaches || a.nom.localeCompare(b.nom, 'fr'));
    const personnesParItem = {};
    taches.forEach((c) => { const k = c.personne || (c.nom ? 'nom:' + c.nom : null); if (k) (personnesParItem[c.item] = personnesParItem[c.item] || new Set()).add(k); });
    const roles = {};
    charges.filter((c) => c.mode === 'jours_personne').forEach((c) => { (roles[c.role] = roles[c.role] || { role: c.role, demande: 0 }).demande += c.valeur; });
    Object.values(roles).forEach((o) => {
      const ps = base.personnes.filter((p) => p.role === o.role);
      o.n = ps.length; o.capacite = ps.reduce((n, p) => n + jo - absJoursDansPeriode(base, p.id, s.debut, s.fin), 0);
      if (o.role === 'dev') o.capacite = Math.max(0, o.capacite - reserve);
      o.pct = o.capacite ? Math.round(100 * o.demande / o.capacite) : null;
    });
    const wip = {};
    chargesFlux.forEach((c) => { if (!c.personne) return; (wip[c.personne] = wip[c.personne] || new Set()).add(c.item); });
    const wipRows = Object.keys(wip).map((pid) => { const p = ix.personnes[pid]; return { personne: pid, nom: p ? p.nom : pid, role: p ? p.role : '?', items: [...wip[pid]], limite: (p && p.wip_limite) || SEUILS.wip_defaut }; });
    const absences = base.absences.filter((a) => a.debut <= s.fin && a.fin >= s.debut);
    const meps = base.meps.filter((m) => m.date >= s.debut && m.date <= s.fin).sort((a, b) => a.date.localeCompare(b.date));
    // Actions come from the last retro board read (one board at a time); none tied to another sprint.
    // This sprint's actions, plus open actions of earlier sprints (carried over until done). Sprint numbers are
    // compared as numbers ("s9" < "s10"), never as strings.
    const num = (id) => { const m = String(id || '').match(/-s(\d+)$/); return m ? +m[1] : null; };
    const actions = base.actions_retro.filter((a) => a.sprint === s.id || ((!a.sprint || (num(a.sprint) !== null && num(s.id) !== null && num(a.sprint) < num(s.id))) && a.statut !== 'fait'));
    const ouverts = base.items.filter((i) => i.type === 'run').reduce((n, i) => n + (i.support || []).reduce((k, x) => k + x.ouverts, 0), 0);
    return {
      sprint: s, jours_ouvres: jo, reserve_pct: res, reserve_j: reserve, dev: { brut: devBrut, absences: devAbs, net: devNet, n: devs.length },
      items, personnesParItem, roles: Object.values(roles), wip: wipRows, jalons, absences, meps, actions, support_ouverts: ouverts,
      jira: { points: pointsOf(pts), tickets: ticketsOf(pts), sousTaches: pointsOf(taches), sansPoints: pts.reduce((n, c) => n + (c.sans_points || 0), 0), parItem: jiraParItem, horsItem: { points: pointsOf(horsItem), tickets: ticketsOf(horsItem) } }, personnes
    };
  }

  // ---------- model v2 helpers ----------
  // R09: manual order among siblings (rang), unranked items after, by name
  function bySiblingOrder(a, b) {
    const ra = typeof a.rang === 'number' ? a.rang : Infinity; const rb = typeof b.rang === 'number' ? b.rang : Infinity;
    return ra - rb || a.nom.localeCompare(b.nom, 'fr');
  }
  // R10: Jira statistics of an item (stat_jira) + the team's points and each person's sub-tasks in a sprint
  function jiraOf(base, itemId, sprintId) {
    const stat = (base.stats_jira || []).find((x) => x.item === itemId) || null;
    const ix = index(base);
    const inSp = (c) => c.item === itemId && c.periode.ref === sprintId;
    const equipe = base.charges.filter((c) => inSp(c) && c.mode === 'points' && !c.personne).reduce((n, c) => n + c.valeur, 0);
    const parPersonne = base.charges.filter((c) => inSp(c) && c.mode === 'taches')
      .map((c) => ({ nom: c.personne ? (ix.personnes[c.personne] || { nom: c.personne }).nom : c.nom, sousTaches: c.valeur, faites: c.faites || 0, enCours: c.en_cours || 0 }))
      .sort((a, b) => (b.sousTaches - b.faites) - (a.sousTaches - a.faites) || b.sousTaches - a.sousTaches);
    const pct = stat && stat.tickets.total ? Math.round(1000 * stat.tickets.faits / stat.tickets.total) / 10 : null;
    return { stat, pct, parPersonne, equipe };
  }

  // ---------- sources of an item (provenance card) ----------
  function sourcesOf(base, itemId) {
    const recs = [];
    const it = base.items.find((i) => i.id === itemId); if (it) recs.push(it);
    ['jalons', 'risques', 'attentes', 'charges', 'stats_jira'].forEach((c) => (base[c] || []).filter((r) => r.item === itemId).forEach((r) => recs.push(r)));
    base.meps.filter((m) => m.item === itemId).forEach((m) => recs.push(m));
    const g = {};
    recs.forEach((r) => {
      const s = r.source || {}; const k = s.systeme; // one line per system; first non-empty ref kept
      const o = g[k] || (g[k] = { systeme: s.systeme, ref: s.systeme === 'saisie' ? 'Gérer' : s.ref, lu_le: s.lu_le, par: s.par, n: 0 });
      if (!o.ref && s.ref) o.ref = s.ref;
      o.n++; if (s.lu_le && (!o.lu_le || s.lu_le > o.lu_le)) { o.lu_le = s.lu_le; o.par = s.par; }
    });
    return Object.values(g).sort((a, b) => (b.lu_le || '').localeCompare(a.lu_le || ''));
  }

  // ---------- ids ----------
  function slug(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x';
  }
  function newId(prefix, label, existing) {
    let base = `${prefix}.${slug(label)}`.slice(0, 72); let id = base; let k = 2;
    const ex = new Set(existing || []); while (ex.has(id)) id = `${base}-${k++}`;
    return id;
  }

  // ---------- mini JSON Schema validator (subset used by schema.json) ----------
  function validate(schema, defName, value) {
    const errors = [];
    function resolve(ref) { return ref.split('/').slice(1).reduce((o, k) => o[k], schema); }
    function v(s, x, path) {
      if (s.$ref) return v(resolve(s.$ref), x, path);
      if (s.oneOf) { const ok = s.oneOf.filter((alt) => { const e0 = errors.length; v(alt, x, path); const pass = errors.length === e0; errors.length = e0; return pass; }); if (ok.length !== 1) errors.push(`${path}: ne correspond à aucune forme admise`); return; }
      if ('const' in s && x !== s.const) errors.push(`${path}: doit valoir ${s.const}`);
      if (s.enum && !s.enum.includes(x)) errors.push(`${path}: valeur « ${x} » hors liste (${s.enum.join(', ')})`);
      const t = s.type;
      if (t) {
        const ok = (t === 'object' && x && typeof x === 'object' && !Array.isArray(x)) || (t === 'array' && Array.isArray(x)) ||
          (t === 'string' && typeof x === 'string') || (t === 'integer' && Number.isInteger(x)) || (t === 'number' && typeof x === 'number' && isFinite(x)) ||
          (t === 'boolean' && typeof x === 'boolean') || (t === 'null' && x === null);
        if (!ok) { errors.push(`${path}: type ${t} attendu`); return; }
      }
      if (typeof x === 'string') {
        if (s.pattern && !new RegExp(s.pattern).test(x)) errors.push(`${path}: format invalide « ${x} »`);
        if (s.minLength && x.length < s.minLength) errors.push(`${path}: obligatoire`);
      }
      if (typeof x === 'number') {
        if ('minimum' in s && x < s.minimum) errors.push(`${path}: minimum ${s.minimum}`);
        if ('maximum' in s && x > s.maximum) errors.push(`${path}: maximum ${s.maximum}`);
      }
      if (Array.isArray(x) && s.items) x.forEach((e, k) => v(s.items, e, `${path}[${k}]`));
      if (x && typeof x === 'object' && !Array.isArray(x)) {
        (s.required || []).forEach((k) => { if (!(k in x)) errors.push(`${path}.${k}: obligatoire`); });
        Object.keys(x).forEach((k) => {
          if (s.properties && s.properties[k]) v(s.properties[k], x[k], `${path}.${k}`);
          else if (s.additionalProperties === false) errors.push(`${path}.${k}: champ inconnu`);
        });
      }
    }
    v(defName ? schema.$defs[defName] : schema, value, defName || '$');
    return errors;
  }

  const Core = {
    COLLECTIONS, DEF_OF, SEUILS, d, iso, addDays, daysBetween, mondayOf, workingDaysBetween, weekdaysInRange, fmtDate, fmtTs, nowTs, todayIso,
    emptyBase, mergeDocs, byId, index, prioriteScore, risqueScore, rangs, risqueMaxNote, jalonsOf, pct, prochainJalon, recul,
    refRecord, refNom, refItem, predecesseurRecule, sante, sprintAt, wipParPersonne, absJoursDansPeriode, chargeParRole, fmtNum, alertes, sprintVue,
    sourcesOf, slug, newId, validate, bySiblingOrder, jiraOf
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.PortfolioCore = Core;
})(typeof self !== 'undefined' ? self : this);
