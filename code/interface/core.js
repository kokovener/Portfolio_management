/* Portfolio PLQ — pure computation core (no DOM, no I/O).
 * Shared by the artifact page (inlined at build time) and the node tests.
 * Implements the canonical model v1 rules: D7 capacity, D8 health, D9 priority,
 * D16 dependency alerts, step-4 alert rules (computed live for display).
 */
(function (root) {
  'use strict';

  const COLLECTIONS = ['items', 'jalons', 'risques', 'attentes', 'dependances', 'livrables', 'meps',
    'actions_retro', 'charges', 'sprints', 'personnes', 'absences', 'stats_jira', 'instantanes', 'lectures', 'listes_jira', 'gantts'];
  // collection key -> schema $defs name
  const DEF_OF = {
    items: 'item', jalons: 'jalon', risques: 'risque', attentes: 'attente', dependances: 'dependance',
    livrables: 'livrable', meps: 'mep', actions_retro: 'action_retro', charges: 'charge',
    sprints: 'sprint', personnes: 'personne', absences: 'absence', stats_jira: 'stat_jira', instantanes: 'instantane', lectures: 'lecture', listes_jira: 'liste_jira', gantts: 'gantt'
  };
  const SEUILS = { fraicheur_jo: 15, recul_jo: 5, attente_jo: 5, risque_rouge: 15, risque_jaune: 10, mep_j: 7 };
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
  // Timestamps are stored with an explicit offset; display in their own wall time, zone label from the offset
  // (-04:00 = EDT, -05:00 = EST: Québec switches on the first Sunday of November and the second Sunday of March).
  function fmtTs(ts) {
    if (!ts) return '—';
    const m = String(ts).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2})?(?:([+-]\d{2}):\d{2})?/);
    if (!m) return String(ts);
    const zone = m[4] === '-05' ? 'EST' : 'EDT';
    return `${fmtDate(m[1])} · ${m[2]}h${m[3]} ${zone}`;
  }
  // Québec wall time (America/Toronto) with its real offset, never Z: -04:00 in summer, -05:00 in winter.
  const TZ_FMT = (typeof Intl !== 'undefined') ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : null;
  function nowTs(date) {
    const dt = date || new Date();
    if (TZ_FMT) {
      const p = {}; TZ_FMT.formatToParts(dt).forEach((x) => { p[x.type] = x.value; });
      const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
      const off = Math.round((wall - Math.floor(dt.getTime() / 60000) * 60000) / 3600000); // -4 or -5
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}${off < 0 ? '-' : '+'}${String(Math.abs(off)).padStart(2, '0')}:00`;
    }
    const edt = new Date(dt.getTime() - 4 * 3600000); // fallback without Intl: EDT
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
    const fr = fraicheur(base, item, today);
    if (fr && fr.jo > SEUILS.fraicheur_jo) rouge.push(`fraîcheur : ${fr.jo} j ouvrés sans mise à jour Smartsheet ni activité Jira (seuil 15)`);
    base.attentes.filter((a) => a.item === item.id && !a.recue_le).forEach((a) => {
      const retard = workingDaysBetween(a.attendue_le, today);
      if (retard > SEUILS.attente_jo) jaune.push(`attente ${a.tiers} : ${retard} j ouvrés de retard`);
    });
    const couleur = rouge.length ? 'rouge' : jaune.length ? 'jaune' : 'vert';
    return { couleur, motifs: rouge.concat(jaune) };
  }

  // ---------- charge (D7 — flux / WIP part dropped 2026-10-28, Franck R23 R24 R28) ----------
  function sprintAt(base, date) { return base.sprints.find((s) => s.debut <= date && date <= s.fin) || null; }
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
  // Load per role over [today, today + 4 weeks), in person-days.
  function chargeParRole(base, today, semaines) {
    const fin = addDays(today, 7 * (semaines || 4) - 1);
    const roles = {};
    const R = (r) => roles[r] || (roles[r] = { role: r, demande: 0, capacite: 0, mode: null, detail: '' });
    const sprints = base.sprints.filter((s) => s.debut <= fin && s.fin >= today).map((s) => s.id);
    base.charges.forEach((c) => {
      if (c.mode === 'jours_personne' && c.periode.type === 'sprint' && sprints.includes(c.periode.ref)) { const o = R(c.role); o.mode = o.mode || 'jours'; o.demande += c.valeur; }
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
    return Object.values(roles).map((o) => Object.assign(o, { pct: o.capacite ? Math.round(100 * o.demande / o.capacite) : null }))
      .sort((a, b) => (b.pct || 0) - (a.pct || 0));
  }
  function fmtNum(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }

  // ---------- R44 freshness (Kickoff D8 v4, model v14): last source update OR Jira activity, in working days ----------
  // Jira activity = the item (or one of its descendants) has tickets of its epics in the sprint read by Jira data:
  // dated by that read. Threshold 15 working days = one 3-week sprint (Franck, 2026-10-29).
  function jiraActivite(base, item, depth) {
    const st = (base.stats_jira || []).find((x) => x.item === item.id);
    let best = st && st.sprint && st.sprint.tickets > 0 && st.source && st.source.lu_le ? st.source.lu_le.slice(0, 10) : null;
    if ((depth || 0) < 6) base.items.filter((c) => c.parent === item.id).forEach((c) => { const x = jiraActivite(base, c, (depth || 0) + 1); if (x && (!best || x > best)) best = x; });
    return best;
  }
  function fraicheur(base, item, today) {
    const src = item.updated_at ? item.updated_at.slice(0, 10) : null; const jira = jiraActivite(base, item);
    const last = [src, jira].filter(Boolean).sort().pop(); if (!last) return null;
    return { jo: Math.max(0, workingDaysBetween(last, today)), depuis: last, par: last === jira && jira !== src ? 'jira' : 'source' };
  }

  // ---------- step-4 alerts (computed live for display; R44 2026-10-29: grouped, chained, complete) ----------
  function alertes(base, today) {
    const ix = index(base); const out = [];
    const nom = (id) => (ix.items[id] || { nom: id }).nom;
    // Freshness: one line per top-most stale item, its stale descendants in brackets
    const stale = new Map();
    base.items.filter((i) => i.etape === 'actif' || i.etape === 'planifie').forEach((i) => { const fr = fraicheur(base, i, today); if (fr && fr.jo > SEUILS.fraicheur_jo) stale.set(i.id, fr); });
    const topOf = (id) => { let top = id; let p = (ix.items[id] || {}).parent; let k = 0; while (p && k++ < 10) { if (stale.has(p)) top = p; p = (ix.items[p] || {}).parent; } return top; };
    const groups = new Map(); [...stale.keys()].forEach((id) => { const t = topOf(id); (groups.get(t) || groups.set(t, []).get(t)).push(id); });
    groups.forEach((ids, top) => {
      const kids = ids.filter((x) => x !== top); const fr = stale.get(top);
      out.push({ kind: 'fraicheur', item: top, texte: `${nom(top)} : aucune mise à jour Smartsheet ni activité Jira depuis ${fr.jo} j ouvrés (seuil 15)${kids.length ? ` — avec ${kids.map(nom).join(', ')}` : ''}.` });
    });
    // Decision Franck 2026-10-27: a Smartsheet L with an empty phase is active but flagged
    base.items.filter((i) => i.source && i.source.systeme === 'smartsheet' && i.etape === 'actif' && !i.phase_source && i.type !== 'programme')
      .forEach((i) => out.push({ kind: 'phase', item: i.id, texte: `${i.nom} : phase non renseignée dans Smartsheet.` }));
    base.jalons.filter((j) => recul(j) < SEUILS.recul_jo && j.statut !== 'fait' && (j.statut === 'depasse' || j.date < today))
      .forEach((j) => out.push({ kind: 'jalon', item: j.item, texte: `${nom(j.item)} — ${j.nom} : dépassé depuis le ${fmtDate(j.date).replace(/\.$/, '')}.` }));
    // Recul chains (D16): one line per moved-back milestone / deliverable, with what it drags along the dependencies.
    // A moved-back record reached from another one is shown inside that chain, not as a line of its own.
    const reculs = base.jalons.map((j) => ({ kind: 'jalon', r: j })).concat(base.livrables.map((l) => ({ kind: 'livrable', r: l })))
      .filter((x) => recul(x.r) >= SEUILS.recul_jo);
    const key = (k, id) => `${k}:${id}`;
    const succ = (k, id) => { // dependencies leaving a record, or its item (an item with a moved-back milestone counts as moved back)
      const it = k === 'item' ? id : (k === 'jalon' ? (ix.jalons[id] || {}).item : (ix.livrables[id] || {}).item);
      return base.dependances.filter((d) => (d.de.kind === k && d.de.id === id) || (it && d.de.kind === 'item' && d.de.id === it && k !== 'item'));
    };
    const chain = (k, id) => { const seen = new Set([key(k, id)]); const steps = []; const q = [[k, id]];
      while (q.length) { const [ck, cid] = q.shift(); succ(ck, cid).forEach((d) => { const kk = key(d.vers.kind, d.vers.id); if (seen.has(kk)) return; seen.add(kk); steps.push(d); q.push([d.vers.kind, d.vers.id]); if (d.vers.kind !== 'item') { const it = refItem(ix, d.vers); if (it && !seen.has(key('item', it))) { seen.add(key('item', it)); q.push(['item', it]); } } }); }
      return { seen, steps }; };
    const chains = reculs.map((x) => Object.assign({ c: chain(x.kind, x.r.id) }, x));
    const reached = new Set(); chains.forEach((x) => chains.forEach((y) => { if (y !== x && x.c.seen.has(key(y.kind, y.r.id))) reached.add(key(y.kind, y.r.id)); }));
    // Heads first (not reached by another recul); a cycle has no head: its earliest record leads (review 29 oct.)
    const ordered = chains.slice().sort((x, y) => reached.has(key(x.kind, x.r.id)) - reached.has(key(y.kind, y.r.id)) || String(x.r.date_initiale).localeCompare(String(y.r.date_initiale)) || x.r.id.localeCompare(y.r.id));
    const covered = new Set();
    ordered.filter((x) => { if (covered.has(key(x.kind, x.r.id))) return false; x.c.seen.forEach((k) => covered.add(k)); return true; }).forEach((x) => {
      const lab = (ref) => { const rec = refRecord(base, ix, ref); const rc = rec && ref.kind !== 'item' ? recul(rec) : 0; return `${refNom(base, ix, ref)}${rc >= SEUILS.recul_jo ? `, +${rc} j o.` : ''}`; };
      const who = x.kind === 'livrable' ? `Livrable ${x.r.nom}` : `${nom(x.r.item)} — ${x.r.nom}`;
      const tail = x.c.steps.length ? ` → entraîne : ${x.c.steps.map((d) => `${lab(d.vers)} (${d.type})`).join(' → ')}` : '';
      out.push({ kind: 'recul', item: x.kind === 'livrable' ? x.r.item || null : x.r.item, texte: `${who} : ${fmtDate(x.r.date_initiale)} → ${fmtDate(x.r.date)} (+${recul(x.r)} j ouvrés)${tail}.` });
    });
    // R44: risks >= 15 and late waits (per item) are listed too, not only coloured
    base.risques.filter((r) => r.ouvert !== false && risqueScore(r) >= SEUILS.risque_rouge)
      .forEach((r) => out.push({ kind: 'risque', item: r.item, texte: `${r.item ? nom(r.item) : 'Portefeuille'} — ${r.titre} : P${r.probabilite} × I${r.impact} = ${risqueScore(r)}.` }));
    // Waits read from Jira (status Bloqué) are the blocked tickets: shown by the « bloqué » line of the sprint, not here
    const late = {}; base.attentes.filter((a) => !a.recue_le && !(a.source && a.source.systeme === 'jira')).forEach((a) => { const n = workingDaysBetween(a.attendue_le, today); if (n > SEUILS.attente_jo) (late[a.item] = late[a.item] || []).push({ a, n }); });
    Object.keys(late).forEach((id) => { const l = late[id].sort((x, y) => y.n - x.n);
      out.push({ kind: 'attente', item: id, texte: `${nom(id)} : ${l.length} attente${l.length > 1 ? 's' : ''} de plus de 5 j ouvrés (max ${l[0].n} j o. : ${l[0].a.tiers} — ${l[0].a.objet})${l.length > 1 ? ` · tiers : ${[...new Set(l.map((x) => x.a.tiers))].join(', ')}` : ''}.` }); });
    // R44 (Franck): blocked tickets of the active sprint only, ticket keys only
    const sp = sprintAt(base, today); const L = (base.listes_jira || []).find((x) => x.id === 'jira.liste.bloques');
    if (sp && L) { const b = L.tickets.filter((x) => (x.sprints || []).includes(sp.id));
      if (b.length) out.push({ kind: 'bloque', item: null, texte: `${String(sp.nom || sp.id).replace(/^G2\.1 - /, '')} : ${b.length} ticket${b.length > 1 ? 's' : ''} bloqué${b.length > 1 ? 's' : ''} — ${b.map((x) => x.cle).join(', ')}.` }); }
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
      items, personnesParItem, roles: Object.values(roles), jalons, absences, meps, actions, support_ouverts: ouverts,
      jira: { points: pointsOf(pts), tickets: ticketsOf(pts), sousTaches: pointsOf(taches), sansPoints: pts.reduce((n, c) => n + (c.sans_points || 0), 0), parItem: jiraParItem, horsItem: { points: pointsOf(horsItem), tickets: ticketsOf(horsItem) } }, personnes
    };
  }

  // ---------- model v4 (R06 workshop part 2): planned vs actual, gates, cascade ----------
  // Portfolio gates of a Goutte 2.1 deliverable (decision Franck 2026-10-28): 4 of the 18 entity milestones.
  const GATES = [['ba-3', 'BA-3 scope figé'], ['ac-4', 'AC-4 GO Dev'], ['qa-2', 'QA-2 UAT'], ['qa-3', 'QA-3 MEP']];
  const gateOf = (j) => { const m = String(j.id).match(/\.(ba-3|ac-4|qa-2|qa-3)$/); return m ? m[1] : null; };
  // R49: idea / qualifié (Backlog, A Revoir) children no longer drive a parent's cascade (windows, gates), now that
  // ticked Backlog rows become items
  function childrenOf(base, id) { return base.items.filter((i) => i.parent === id && !['termine', 'idee', 'qualifie'].includes(i.etape)); }
  // Planned window: own (Smartsheet "Début prévu / Fin prévue" or Gérer) else cascade = earliest start, latest end of children.
  function fenetrePrevue(base, item, depth) {
    if (item.fenetre && item.fenetre.debut) return Object.assign({ origine: 'propre' }, item.fenetre);
    if ((depth || 0) > 6) return null;
    const ws = childrenOf(base, item.id).map((c) => fenetrePrevue(base, c, (depth || 0) + 1)).filter(Boolean);
    if (!ws.length) return null;
    const fins = ws.map((w) => w.fin);
    return { debut: ws.map((w) => w.debut).sort()[0], fin: fins.includes(null) ? null : fins.sort().pop(), origine: 'enfants' };
  }
  // Actual window: union of the Jira sprints of the item's own epics (stat_jira.fenetre_reelle) and of its children's
  // actual windows (a parent's real work includes its deliverables' work).
  function fenetreReelle(base, item, depth) {
    const st = (base.stats_jira || []).find((x) => x.item === item.id);
    const own = st && st.fenetre_reelle ? st.fenetre_reelle : null;
    const kids = (depth || 0) > 6 ? [] : childrenOf(base, item.id).map((c) => fenetreReelle(base, c, (depth || 0) + 1)).filter(Boolean);
    if (own && !kids.length) return Object.assign({ origine: 'propre' }, own);
    const ws = (own ? [own] : []).concat(kids);
    if (!ws.length) return null;
    const open = ws.some((w) => !w.fin);
    return { debut: ws.map((w) => w.debut).sort()[0], fin: open ? null : ws.map((w) => w.fin).sort().pop(), jusqu_au: ws.map((w) => w.jusqu_au || w.fin).filter(Boolean).sort().pop() || null, origine: own ? 'propre+enfants' : 'enfants' };
  }
  // Gates shown on a row: own gate milestones, else per gate the latest child gate (done only when every child is done).
  function gatesOf(base, item, today, depth) {
    const own = jalonsOf(base, item.id).filter(gateOf);
    if (own.length) return own.map((j) => Object.assign({ gate: gateOf(j), derive: false }, j));
    if ((depth || 0) > 6) return [];
    const kids = childrenOf(base, item.id).flatMap((c) => gatesOf(base, c, today, (depth || 0) + 1));
    return GATES.map(([g, nom]) => {
      const ks = kids.filter((k) => k.gate === g); if (!ks.length) return null;
      const last = ks.slice().sort((a, b) => a.date.localeCompare(b.date)).pop();
      const fait = ks.every((k) => k.statut === 'fait');
      return { id: `${item.id}.${g}`, item: item.id, gate: g, nom: `${nom} (${ks.length} livrable${ks.length > 1 ? 's' : ''})`, date: last.date, statut: fait ? 'fait' : (ks.some((k) => k.statut !== 'fait' && k.date < today) ? 'depasse' : 'a_venir'), derive: true };
    }).filter(Boolean);
  }
  // Delay of a gate in working days: done late (fait_le after date) or overdue today; 0 otherwise.
  function retardGate(j, today) {
    if (j.statut === 'fait') return j.fait_le && j.fait_le > j.date ? workingDaysBetween(j.date, j.fait_le) : 0;
    return j.date < today ? workingDaysBetween(j.date, today) : 0;
  }

  // ---------- R15/R19: MEP themes (decision Franck 2026-10-28) ----------
  // Extranet = system "Extranet …"; SDD = SDD-* ticket; infra (system "Infra …") = Autre; any other GOU21 ticket = Goutte 2.1
  // (a G1 deployment carried by a GOU21 ticket included); everything else = Autre. Display order below.
  const MEP_THEMES = [['g21', 'Goutte 2.1'], ['extranet', 'Extranet'], ['sdd', 'SDD'], ['autre', 'Autre']];
  function mepTheme(m) {
    const sys = String(m.systeme || ''); const t = String(m.ticket || '').toUpperCase();
    if (/^extranet/i.test(sys)) return 'extranet';
    if (/^SDD-/.test(t)) return 'sdd';
    if (/^infra/i.test(sys)) return 'autre';
    if (/^GOU21-/.test(t)) return 'g21';
    return 'autre';
  }
  function mepParTheme(list) { return MEP_THEMES.map(([k, nom]) => ({ k, nom, meps: list.filter((m) => mepTheme(m) === k) })); }

  // ---------- R36: freshness of a page block (config/cadence.json, model v6 lectures) ----------
  // Latest read of an adapter: its own lecture doc or one of an adapter that covers it (jira_data_reel covers jira_data,
  // full outlook covers outlook_equipe); without any lecture yet, the newest source.lu_le written by that adapter.
  function derniereLecture(base, cad, a) {
    const covers = [a].concat(Object.keys(cad.remplace || {}).filter((k) => (cad.remplace[k] || []).includes(a)));
    const ls = (base.lectures || []).filter((l) => covers.includes(l.adaptateur) && l.statut !== 'echec').map((l) => l.lu_le).sort();
    if (ls.length) return { lu_le: ls.pop(), origine: 'lecture' };
    const par = (cad.par || {})[a]; if (!par) return null;
    let best = null;
    COLLECTIONS.forEach((c) => (base[c] || []).forEach((r) => { const s = r.source; if (s && s.par === par && s.lu_le && (!best || s.lu_le > best)) best = s.lu_le; }));
    return best ? { lu_le: best, origine: 'données' } : null;
  }
  function fraicheurBloc(base, cad, ref, today) {
    const b = ((cad && cad.blocs) || []).find((x) => x.ref === ref); if (!b) return null;
    const entrees = b.adaptateurs.map((a) => {
      const l = derniereLecture(base, cad, a); const c = (b.cible || {})[a] || null;
      if (!l) return { a, lu_le: null, perime: !!c, cible: c };
      const day = l.lu_le.slice(0, 10);
      const age = c && c.jours_ouvres ? workingDaysBetween(day, today) : daysBetween(day, today);
      const lim = c ? (c.jours_ouvres || c.jours) : null;
      return { a, lu_le: l.lu_le, origine: l.origine, age, unite: c && c.jours_ouvres ? 'j ouvrés' : 'j', cible: c, perime: lim !== null && age > lim };
    });
    const lus = entrees.filter((e) => e.lu_le).map((e) => e.lu_le).sort();
    return { ref, nom: b.nom, entrees, lu_le: entrees.some((e) => !e.lu_le) ? null : lus[0] || null, perime: entrees.some((e) => e.perime) };
  }

  // ---------- R37 (model v13): items hidden by the owner (item.visible === false) ----------
  // Display filter, not a right (Kickoff D20 v3): the visitor view and the Teams digest use this public base.
  // A hidden item hides its descendants and every record tied to them; ids are kept so nothing is rewritten.
  function hiddenIds(base) {
    const out = new Set(base.items.filter((i) => i.visible === false).map((i) => i.id)); let grew = true;
    while (grew) { grew = false; base.items.forEach((i) => { if (!out.has(i.id) && i.parent && out.has(i.parent)) { out.add(i.id); grew = true; } }); }
    return out;
  }
  function publicBase(base) {
    const h = hiddenIds(base); if (!h.size) return base;
    const ix = index(base); const b = Object.assign({}, base);
    const off = (ref) => !!ref && h.has(refItem(ix, ref) || '');
    b.items = base.items.filter((i) => !h.has(i.id));
    ['jalons', 'risques', 'attentes', 'charges', 'stats_jira', 'livrables', 'meps', 'gantts'].forEach((c) => { b[c] = (base[c] || []).filter((r) => !h.has(r.item)); });
    b.dependances = base.dependances.filter((d) => !off(d.de) && !off(d.vers));
    b.listes_jira = (base.listes_jira || []).map((l) => Object.assign({}, l, { tickets: l.tickets.filter((t) => !h.has(t.item)) }));
    return b;
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
    ['jalons', 'risques', 'attentes', 'charges', 'stats_jira', 'gantts'].forEach((c) => (base[c] || []).filter((r) => r.item === itemId).forEach((r) => recs.push(r)));
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
    refRecord, refNom, refItem, predecesseurRecule, sante, fraicheur, jiraActivite, sprintAt, absJoursDansPeriode, chargeParRole, fmtNum, alertes, sprintVue,
    sourcesOf, slug, newId, validate, bySiblingOrder, jiraOf, GATES, gateOf, fenetrePrevue, fenetreReelle, gatesOf, retardGate,
    MEP_THEMES, mepTheme, mepParTheme, derniereLecture, fraicheurBloc, hiddenIds, publicBase
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.PortfolioCore = Core;
})(typeof self !== 'undefined' ? self : this);
