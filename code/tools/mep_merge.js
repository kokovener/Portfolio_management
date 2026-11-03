#!/usr/bin/env node
/* MEP sources incremental merge (Optimisation_Requetes_v1 S4).
 * The Jira step now reads the MEP e-mails only since the last ok Jira read (−1 day margin) instead of D−30 every day;
 * this script rebuilds the full D−30 window by merging that short read with the previous mep_sources.json.
 *
 * Usage: node tools/mep_merge.js <previous mep_sources.json|-> <new mep_sources.json> <D AAAA-MM-JJ> <out.json>
 *   emails [[receivedDateTime, senderName, subject, summary]] and teams [[createdDateTime, from, subject, preview]]:
 *     union of previous and new, keyed by (date, sender, subject) — the new row wins on a duplicate;
 *     only rows dated on or after D−30 days are kept; sorted newest first.
 *   calendar, queries and read_at come from the new read; queries.note says how many rows were reused / added.
 *   Previous file absent, "-" or empty: output = new read (window D−30 still applied).
 * Never reads a source, never writes the base; personal data: output stays in dist/ (gitignored), never committed.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function addDays(d, n) { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
// Same instant written two ways ("…Z" vs "…-05:00", with or without ms) must give the same key.
function instant(s) { const t = Date.parse(s); return Number.isNaN(t) ? String(s) : String(t); }
const keyOf = (r) => [instant(r[0]), r[1] || '', r[2] || ''].join('\u0001');

function mergeRows(prev, next, cutoffMs) {
  const inWindow = (r) => { const t = Date.parse(r[0]); return Number.isNaN(t) || t >= cutoffMs; };
  const out = new Map(); let reused = 0; let added = 0; let dropped = 0;
  (next || []).forEach((r) => { if (!inWindow(r)) { dropped++; return; } out.set(keyOf(r), r); });
  (prev || []).forEach((r) => {
    if (!inWindow(r)) { dropped++; return; }
    if (!out.has(keyOf(r))) { out.set(keyOf(r), r); reused++; }
  });
  added = out.size - reused;
  const rows = [...out.values()].sort((a, b) => (Date.parse(b[0]) || 0) - (Date.parse(a[0]) || 0));
  return { rows, reused, added, dropped };
}

function merge(prev, next, D) {
  if (!DATE.test(D)) throw new Error(`D ${D} : AAAA-MM-JJ attendu`);
  if (!next || !Array.isArray(next.emails)) throw new Error('nouveau mep_sources.json sans « emails »');
  const d30 = addDays(D, -30);
  const cutoff = Date.parse(`${d30}T00:00:00-05:00`); // window start at midnight, Québec time (EST bound: never later than EDT)
  const p = prev && typeof prev === 'object' ? prev : {};
  const em = mergeRows(p.emails, next.emails, cutoff);
  const tm = mergeRows(p.teams, next.teams, cutoff);
  const out = Object.assign({}, next, { emails: em.rows, teams: tm.rows });
  out.queries = Object.assign({}, next.queries || {});
  const from = p.read_at ? ` (lecture précédente ${p.read_at})` : ' (aucune lecture précédente)';
  out.queries.note = `mep_merge D=${D}, fenêtre ≥ ${d30} : courriels ${em.reused} repris du précédent${from} + ${em.added} de la lecture incrémentale = ${em.rows.length}`
    + ` ; Teams ${tm.reused} repris + ${tm.added} lus = ${tm.rows.length} ; ${em.dropped + tm.dropped} hors fenêtre écartés`;
  return { out, stats: { emails: em, teams: tm } };
}

if (require.main === module) {
  const [prevP, nextP, D, outP] = process.argv.slice(2);
  if (!outP) { console.error(fs.readFileSync(__filename, 'utf8').split("'use strict'")[0]); process.exit(2); }
  try {
    let prev = null;
    if (prevP && prevP !== '-' && fs.existsSync(prevP) && fs.statSync(prevP).size > 0) prev = JSON.parse(fs.readFileSync(prevP, 'utf8'));
    const next = JSON.parse(fs.readFileSync(nextP, 'utf8'));
    if (prev && path.resolve(prevP) === path.resolve(outP)) throw new Error('sortie = précédent : refusé (la lecture précédente serait écrasée)');
    const { out, stats } = merge(prev, next, D);
    fs.mkdirSync(path.dirname(path.resolve(outP)), { recursive: true });
    fs.writeFileSync(outP, JSON.stringify(out, null, 1));
    console.log(`courriels ${stats.emails.rows.length} (${stats.emails.reused} repris + ${stats.emails.added}) · Teams ${stats.teams.rows.length} · hors fenêtre ${stats.emails.dropped + stats.teams.dropped} → ${outP}`);
  } catch (e) { console.error(e.message); process.exit(2); }
}
module.exports = { merge, keyOf };
