#!/usr/bin/env node
/* MEP evidence from the M365 sources (Kickoff D18 v8, rules of the Statut TI weekly task, Franck 30 Oct. 2026).
 *
 * Priority on status, date and owner: Franck's confirmation (rank 0, config/mep_confirmations.json, adapt_jira.js)
 * > Jira GOU21 (2, adapt_jira.js) > Email (3) > Teams channel "05 - Déploiements" (4) > ledger (5, adapt_jira.js).
 * The calendar "Calendar - MEP" is no longer read (Franck, 5 Nov. 2026: it will never be shared); a "calendar" key
 * left in an old raw file is ignored.
 * Emails = everything in the Outlook folder "MEP" plus everything sent to adresse-masquee@exemple.test (5 Nov. 2026: the
 * query "MEP" missed SDD-3004 and SDD-2974, whose subjects do not contain the word).
 * This module only turns the raw reads into evidence rows; adapt_jira.js merges them with Jira and the ledger.
 *
 * Raw shape (dist/runs/<date>/mep_sources/raw.json, read by Claude through the M365 connector):
 *   { read_at, queries, emails: [[receivedIso, senderName, subject, summary], ...], teams: [[createdIso, author, subject, body], ...] }
 * Evidence row: { source: "email"|"teams", rang, statut: "completee"|"planifiee"|null, date, responsable,
 *   keys: [ticket keys], versions: [Jira version names], libelle, ref }
 * Pure functions, no I/O except the CLI (prints the evidence for a raw file).
 */
'use strict';
const Core = require('../interface/core.js');

const RANG = { confirmation: 0, jira: 2, email: 3, teams: 4, ledger: 5 };
// ITI = infrastructure tickets (Jira DC), e.g. "MEP ITI-804 Infra LAITWEB et SQL-W-01 terminé avec succès"
const RE_KEY = /\b(GOU21|SDD|PLQ|ITI)-\d+\b(?!\.\w)/g; // "SDD-1981.sql" is a file name, not a ticket
const RE_VERSION = /\bOPS_[A-Za-z]+_\d+\b|\bExtraTransporteurV\d+\b|\bCode_Taxe_L\d+\b/g;
const RE_FW = /^\s*((re|tr|fw|fwd)\s*:\s*)+/i;
// Proof of deployment, searched in the message's own text (quoted history removed): "MEP complétée", "la MEP est
// terminée", "MEP réalisée avec succès", "Mep faite", "déploiement en production terminé", "nous avons effectué"
const RE_DONE = /\b(mep|mise en production|d[ée]ploiement(?: en production)?)\s+(?:est\s+|a\s+été\s+)?(compl[ée]t[ée]e?|termin[ée]e?|effectu[ée]e?|r[ée]alis[ée]e?|faite?)(?![a-zà-ÿ])|\b(avons|a été)\s+effectu[ée]/i;
// Quoted history of a reply / forward starts at the first header line
const ownText = (s) => s.split(/\b(De|From|Envoyé|Sent)\s*:/)[0];
const RE_ANNOUNCE = /billets? de mep|mep pr[ée]vue|mep au calendrier|mise en production est pr[ée]vue|planifi[ée]|on va d[ée]ployer|ce soir/i;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Québec wall clock (EDT/EST) of an ISO timestamp
const FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
function local(iso) { const p = Object.fromEntries(FMT.formatToParts(new Date(iso)).map((x) => [x.type, x.value])); return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour }; }
// A closing message sent between midnight and 6 h reports the previous evening's deployment (GOU21-11185: done
// 14 Oct. evening, "MEP complétée" sent 15 Oct. 00h10)
function closingDate(iso) { const l = local(iso); return l.hour < 6 ? Core.addDays(l.date, -1) : l.date; }
// Explicit French date in the text ("lundi 2 novembre"), year taken from the message, rolled over in January
function frenchDate(text, refDate) {
  const m = text.match(new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${MOIS.join('|')})\\b`, 'i')); if (!m) return null;
  const mo = MOIS.indexOf(m[2].toLowerCase()) + 1; const rm = +refDate.slice(5, 7); let y = +refDate.slice(0, 4);
  if (mo < rm - 6) y += 1; else if (mo > rm + 6) y -= 1; // "5 janvier" written in December / "28 décembre" in January
  return `${y}-${String(mo).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
}
function plannedDate(text, iso) {
  const d = local(iso).date; text = ownText(text);
  return frenchDate(text, d) || (/\bdemain\b/i.test(text) ? Core.addDays(d, 1) : d);
}
const uniq = (a) => [...new Set(a)];
const keysOf = (s) => uniq((s.match(RE_KEY) || []));
const versionsOf = (s) => uniq((s.match(RE_VERSION) || []).map((v) => v.replace(/\.$/, '')));
const norm = (s) => s.replace(RE_FW, '').replace(/\s+/g, ' ').trim().toLowerCase();

// Label for a ticket known only through email: "[SDD-2990] Ajout contrat ... - Jira" in the body, else the subject
// without the forward prefix, the "MEP"/"G1" tags and the key
function labelOf(subject, summary, key) {
  const b = summary.match(new RegExp(`\\[${key}\\]\\s*(.+?)\\s+-\\s+Jira`));
  if (b) return b[1].trim();
  return subject.replace(RE_FW, '').replace(new RegExp(key, 'g'), '').replace(/^\s*MEP\b/i, '').replace(/\bG1\b/g, '')
    .replace(/\(SQL\)/i, '').replace(/^[\s\-–:|]+|[\s\-–:|]+$/g, '').replace(/\s*[|]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim() || null;
}

function fromEmails(emails, signals) {
  const out = [];
  // Ticket keys and versions of a thread, so a bare reply ("MEP terminée") is linked to its announcement
  // (only messages of the same subject within 7 days: a subject like "MEP Extranets" comes back every month)
  const thread = {};
  emails.forEach(([iso, , subject, summary]) => (thread[norm(subject)] = thread[norm(subject)] || []).push({ d: local(iso).date, keys: keysOf(subject).length ? keysOf(subject) : keysOf(summary), versions: versionsOf(subject + ' ' + summary) }));
  const threadOf = (subject, iso) => {
    const d = local(iso).date; const near = (thread[norm(subject)] || []).filter((x) => Math.abs(Core.daysBetween(x.d, d)) <= 7);
    return { keys: uniq(near.flatMap((x) => x.keys)), versions: uniq(near.flatMap((x) => x.versions)) };
  };
  emails.forEach(([iso, sender, subject, summary]) => {
    const s = subject.replace(RE_FW, '');
    if (/^statut ti\b/i.test(s) || /\(jira\)$/i.test(sender) || /^reaction daily digest/i.test(s) || /^\[jira\]/i.test(s)) return;
    const serviceDesk = /^service desk$/i.test(sender) || /^\[service desk\]/i.test(s);
    let keys = keysOf(subject).length ? keysOf(subject) : keysOf(summary);
    let versions = versionsOf(subject + ' ' + summary);
    if (!keys.length) { const t = threadOf(subject, iso); keys = t.keys; versions = uniq(versions.concat(t.versions)); }
    // G1 rule of the Statut TI task, widened 5 Nov. 2026: Richard Tremblay runs the G1 scripts and infra interventions
    // himself, so his own first mail (not a reply / forward) carrying a ticket = done on the date of the mail
    // (SDD-3004 "nous avons ajouté", SDD-2974 "ajusté en prod", SDD-2942, ITI-804; "\MEP\ SDD-3004\" has a space)
    // Fresh review 5 Nov.: exact sender name (Tremblay is a common name), no auto-reply, and not when his own text
    // announces, asks or reports a failure (then the usual announce / done rules apply)
    const RE_NOT_DONE = /pr[ée]vue?s?\b|planifi|demain|ce soir|[àa] venir|[ée]chec|rollback|annul|pouvez-vous|peux-tu|\?/i;
    const operator = /^richard tremblay$/i.test(sender.trim()) && !RE_FW.test(subject) && !/^\s*(r[ée]ponse automatique|automatic reply|absent\b|out of office)/i.test(subject)
      && (keysOf(subject).length || keysOf(summary).length) && !RE_NOT_DONE.test(ownText(summary));
    const g1Done = operator || (/tremblay/i.test(sender) && /\\MEP\\\s*SDD-\d+/i.test(summary) && /destination/i.test(summary));
    let statut = null; let date = null;
    if (!serviceDesk && g1Done) { statut = 'completee'; date = local(iso).date; }
    else if (!serviceDesk && RE_DONE.test(ownText(summary))) { statut = 'completee'; date = closingDate(iso); }
    else if (serviceDesk) {
      // Service Desk notifications never prove a deployment; they may announce one with its date (PLQ-9462)
      if (/mep au calendrier|mep (est )?pr[ée]vue/i.test(summary) && frenchDate(summary, local(iso).date)) { statut = 'planifiee'; date = plannedDate(summary, iso); }
    } else if (/^\s*MEP\b/i.test(s) || RE_ANNOUNCE.test(summary)) { statut = 'planifiee'; date = plannedDate(summary, iso); }
    if (!statut) return;
    const ref = `email du ${local(iso).date} (${sender}) « ${s.trim().slice(0, 70)} »`;
    if (!keys.length && !versions.length) { signals.push({ kind: 'mep_preuve_orpheline', row: ref, texte: `${ref} : ${statut === 'completee' ? 'réalisation' : 'annonce'} de MEP sans billet ni version reconnaissable — non écrite` }); return; }
    const label = keys.length === 1 ? labelOf(subject, summary, keys[0]) : null;
    out.push({ source: 'email', rang: RANG.email, statut, date, responsable: serviceDesk ? null : sender, keys, versions, libelle: label, ref });
  });
  return out;
}

function fromTeams(msgs, signals) {
  const out = [];
  msgs.forEach(([iso, author, subject, body]) => {
    const text = `${subject || ''} ${body || ''}`;
    let statut = null; let date = null;
    if (/mise en production effectu[ée]e|mep (termin[ée]e|compl[ée]t[ée]e)/i.test(text)) { statut = 'completee'; date = /\bhier\b/i.test(text) ? Core.addDays(local(iso).date, -1) : closingDate(iso); }
    else if (RE_ANNOUNCE.test(text) || /mises? en production/i.test(subject || '')) { statut = 'planifiee'; date = plannedDate(text, iso); }
    if (!statut) return;
    const keys = keysOf(text); const versions = versionsOf(text);
    const ref = `Teams Déploiements ${local(iso).date} (${author}) « ${(subject || '').trim().slice(0, 60)} »`;
    if (!keys.length && !versions.length) { signals.push({ kind: 'mep_preuve_orpheline', row: ref, texte: `${ref} : MEP sans billet ni version reconnaissable — non écrite` }); return; }
    out.push({ source: 'teams', rang: RANG.teams, statut, date, responsable: author, keys, versions, libelle: null, ref });
  });
  return out;
}

// Franck's confirmations (config/mep_confirmations.json): { "<TICKET>": { statut, date?, le, motif } }.
// A confirmation is the highest evidence; without its own date it keeps the date the other sources give.
function fromConfirmations(conf) {
  return Object.entries(conf || {}).filter(([k]) => !k.startsWith('_')).map(([key, c]) => ({
    source: 'confirmation', rang: RANG.confirmation, statut: c.statut, date: c.date || null, responsable: null, keys: [key], versions: [], libelle: null,
    ref: `confirmé par Franck le ${c.le}${c.motif ? ' (' + c.motif + ')' : ''}`,
  }));
}

function preuves(raw, now, windowDays) {
  const signals = []; const today = now.slice(0, 10);
  const emails = raw.emails || [];
  // Emails are read in pages of 25: an oldest email well after the window start means the read was cut short
  if (emails.length) {
    const oldest = emails.map(([iso]) => local(iso).date).sort()[0]; const start = Core.addDays(today, -(windowDays || 30));
    if (Core.daysBetween(start, oldest) > 3) signals.push({ kind: 'courriels_partiels', row: 'emails', texte: `Courriels MEP lus du ${oldest} seulement (fenêtre depuis le ${start}) : les MEP d'avant restent au ledger seul` });
  }
  const list = fromEmails(raw.emails || [], signals).concat(fromTeams(raw.teams || [], signals));
  return { preuves: list, signals };
}

if (require.main === module) {
  const raw = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
  const r = preuves(raw, raw.read_at);
  r.preuves.forEach((p) => console.log([p.source, p.statut, p.date, p.keys.join(',') || '-', p.versions.join(',') || '-', p.responsable || '-', p.libelle || ''].join(' | ')));
  r.signals.forEach((s) => console.log('SIGNAL ' + s.kind + ' ' + s.texte));
}
module.exports = { preuves, fromConfirmations, RANG, closingDate, frenchDate, labelOf };
