#!/usr/bin/env node
/* Backup to GitHub: builds a pseudonymised copy of the code (tracked files) and of the project documents
 * (OneDrive Portefeuille_PLQ) in a separate git working copy, scans it, then commits and pushes it.
 *
 * Usage:
 *   node tools/backup_github.js            dry run: builds the copy, scans it, prints what would be pushed
 *   node tools/backup_github.js --push     same, then commits and pushes (refused if the scan finds anything)
 *   Options: --config <file> (default config/backup.json), --docs <dir>, --staging <dir> (override config)
 *
 * Rules:
 *   - The local repository is never modified; its history never leaves the machine (the backup has its own).
 *   - People are replaced by stable tags (Personne_NN). The name → tag map lives in config/backup_pseudonymes.json,
 *     which is local only (gitignored, never copied). People come from team.* records in tracked dist/ JSON, Jira
 *     assignees and charges kept under a Jira name in tracked dist/ JSON,
 *     from config/team_departs.json and from the map itself (append-only: a tag is never reassigned).
 *   - Every @lait.qc.ca address is masked. Only text files are copied; anything else is reported and skipped.
 *   - Fail closed: any remaining full name, slug, company address or secret-looking string blocks the commit.
 * Exit codes: 0 ok · 2 config/usage error · 3 scan refused · 4 git error.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const TEXT_EXT = new Set(['.js', '.py', '.json', '.md', '.html', '.htm', '.css', '.txt', '.drawio', '.svg',
  '.ps1', '.sh', '.yml', '.yaml', '.csv', '.gitignore', '.mermaid', '.xml']);
const COMPANY_MAIL = /[A-Za-z0-9._%+-]+@lait\.qc\.ca/gi;
const SECRETS = [
  /ghp_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /\bsk-[A-Za-z0-9_-]{20,}/, /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bBearer\s+[A-Za-z0-9._-]{20,}/,
  /\b(password|passwd|mot_de_passe|client_secret|api[_-]?key)\s*["']?\s*[:=]\s*["'][^"']{6,}["']/i,
];

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const slug = (s) => fold(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function git(cwd, args, opts = {}) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    const err = new Error(`git ${args.join(' ')} failed in ${cwd}:\n${r.stderr || r.stdout}`);
    err.exit = 4;
    throw err;
  }
  return r;
}

function parseArgs(argv) {
  const a = { push: false, config: path.join(REPO, 'config', 'backup.json') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--push') a.push = true;
    else if (['--config', '--docs', '--staging'].includes(argv[i])) a[argv[i].slice(2)] = argv[++i];
    else throw Object.assign(new Error(`unknown argument ${argv[i]}`), { exit: 2 });
  }
  return a;
}

function loadConfig(args, repo) {
  const c = JSON.parse(fs.readFileSync(args.config, 'utf8'));
  return {
    remote: c.remote,
    docs: args.docs || c.docs_dir,
    staging: path.resolve(repo, args.staging || c.staging_dir || 'dist/backup'),
    excludeCode: c.exclude_code || [],
    excludeDocs: c.exclude_docs || [],
    mapFile: path.resolve(repo, c.pseudonym_map || 'config/backup_pseudonymes.json'),
    keep: (c.keep_people || []).map((n) => fold(n).toLowerCase()),
  };
}

// Prefix match on forward-slash relative paths; a pattern ending with "/" is a folder.
const excluded = (rel, patterns) => patterns.some((p) => (p.endsWith('/') ? rel.startsWith(p) : rel === p
  || (p.startsWith('*') && rel.endsWith(p.slice(1))) || rel.split('/').includes(p)));

/* People: {nom: "Prénom Nom", tag}. Sources are local only; the map is append-only. */
function collectPeople(repo, mapFile, keep = []) {
  const map = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, 'utf8')) : { personnes: [] };
  const known = new Map(map.personnes.map((p) => [fold(p.nom).toLowerCase(), p]));
  const found = [];
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      if (typeof o.id === 'string' && o.id.startsWith('team.') && typeof o.nom === 'string') found.push(o.nom);
      // People read in Jira who are not in Team_G2.1 (2026-10-28: an assignee outside the team slipped through the
      // scan): assignees of parent tasks, sub-task rows [key, parent, assignee, …], and charges kept under a Jira name.
      if (typeof o.assignee === 'string') found.push(o.assignee);
      if (Array.isArray(o.sub_tasks)) o.sub_tasks.forEach((r) => { if (Array.isArray(r) && typeof r[2] === 'string') found.push(r[2]); });
      if (typeof o.nom === 'string' && (o.mode === 'points' || o.mode === 'taches') && !o.personne) found.push(o.nom);
      Object.values(o).forEach(walk);
    }
  };
  const tracked = git(repo, ['ls-files', '-z', '--', 'dist']).stdout.split('\0').filter((f) => f.endsWith('.json'));
  for (const f of tracked) {
    try { walk(JSON.parse(fs.readFileSync(path.join(repo, f), 'utf8'))); } catch (_) { /* not JSON: ignore */ }
  }
  const departs = path.join(repo, 'config', 'team_departs.json');
  if (fs.existsSync(departs)) {
    for (const d of JSON.parse(fs.readFileSync(departs, 'utf8'))) found.push(`${d.prenom} ${d.nom}`);
  }
  let next = map.personnes.reduce((m, p) => Math.max(m, Number(p.tag.split('_')[1])), 0) + 1;
  const isName = (s) => /^[A-ZÀ-Ý][\p{L}'-]+(\s+[A-ZÀ-Ý][\p{L}'-]+)+$/u.test(s.trim()) && !/^Équipe$/i.test(s.trim());
  for (const nom of [...new Set(found.filter(isName))].sort()) {
    const k = fold(nom).toLowerCase();
    if (!known.has(k) && !keep.includes(k)) {
      const p = { nom, tag: `Personne_${String(next++).padStart(2, '0')}` };
      map.personnes.push(p);
      known.set(k, p);
    }
  }
  return map;
}

/* Every written form of a person: full name both orders (accented or not), team.* slug, guessed address. */
function variants(p) {
  const parts = p.nom.trim().split(/\s+/);
  const prenom = parts[0];
  const nom = parts.slice(1).join(' ');
  const t = p.tag.toLowerCase().replace('_', '-');
  const forms = new Set([p.nom, fold(p.nom), `${nom} ${prenom}`, fold(`${nom} ${prenom}`),
    `${nom}, ${prenom}`, fold(`${nom}, ${prenom}`), ...(p.alias || [])]);
  // Last name on its own, case-sensitive (capitalised or upper case) so "côté" the common word is kept.
  // Names under 4 letters are too ambiguous to replace alone.
  const alone = nom.replace(/[\s-]/g, '').length >= 4
    ? [...new Set([nom, fold(nom), nom.toUpperCase(), fold(nom).toUpperCase()])] : [];
  return {
    names: [...forms].map((f) => [f, p.tag]),
    alone: alone.map((f) => [f, p.tag]),
    slugs: [[`team.${slug(nom)}-${slug(prenom)}`, `team.${t}`], [`${slug(nom)}-${slug(prenom)}`, t]],
    mail: [`${slug(prenom)[0]}${slug(nom).replace(/-/g, '')}@lait.qc.ca`, `${t}@exemple.test`],
  };
}

function buildRules(map) {
  const rules = [];
  const mails = new Map();
  for (const p of map.personnes) {
    const v = variants(p);
    [...v.names, ...v.alone].forEach(([from, to]) => rules.push({ re: new RegExp(`(?<![\\p{L}])${esc(from)}(?![\\p{L}])`, 'gu'), from, to }));
    v.slugs.forEach(([from, to]) => rules.push({ re: new RegExp(`\\b${esc(from)}\\b`, 'gi'), from, to }));
    mails.set(v.mail[0], v.mail[1]);
  }
  rules.sort((a, b) => b.from.length - a.from.length); // longest first: "Nom, Prénom" before "Nom Prénom"
  return { rules, mails };
}

function pseudonymise(text, { rules, mails }) {
  let out = text.replace(COMPANY_MAIL, (m) => mails.get(m.toLowerCase()) || 'adresse-masquee@exemple.test');
  for (const r of rules) out = out.replace(r.re, r.to);
  return out;
}

/* Fail-closed scan of the built copy. Returns [{file, motif}] — never the matched value itself. */
function scan(dir, map) {
  const hits = [];
  // One folded, lower-case needle list per person: any full-name form or slug.
  const needles = map.personnes.map((p) => {
    const v = variants(p);
    return { tag: p.tag, forms: [...v.names.map(([n]) => fold(n).toLowerCase()), ...v.slugs.map(([s]) => s)],
      alone: v.alone.map(([a]) => new RegExp(`(?<![\\p{L}])${esc(a)}(?![\\p{L}])`, 'u')) };
  });
  for (const f of listFiles(dir)) {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    const low = fold(txt).toLowerCase();
    if (txt.match(COMPANY_MAIL)) hits.push({ file: f, motif: 'adresse @lait.qc.ca' });
    for (const n of needles) {
      if (n.forms.some((s) => new RegExp(`(?<![a-z0-9])${esc(s)}(?![a-z0-9])`).test(low))
        || n.alone.some((re) => re.test(txt))) {
        hits.push({ file: f, motif: `nom réel (${n.tag})` });
      }
    }
    SECRETS.forEach((re) => { if (re.test(txt)) hits.push({ file: f, motif: `secret possible ${re.source.slice(0, 18)}…` }); });
  }
  return hits;
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

const isText = (rel) => TEXT_EXT.has(path.extname(rel).toLowerCase()) || TEXT_EXT.has(path.basename(rel));

function copyTree(files, srcRoot, dstRoot, rules, skipped, label) {
  let n = 0;
  for (const rel of files) {
    if (!isText(rel)) { skipped.push(`${label}/${rel}`); continue; }
    const dst = path.join(dstRoot, ...rel.split('/'));
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, pseudonymise(fs.readFileSync(path.join(srcRoot, ...rel.split('/')), 'utf8'), rules));
    n++;
  }
  return n;
}

function ensureStaging(staging, remote) {
  fs.mkdirSync(staging, { recursive: true });
  if (fs.existsSync(path.join(staging, '.git'))) return;
  git(staging, ['init', '-q', '-b', 'main']);
  git(staging, ['remote', 'add', 'origin', remote]);
  // Start on top of what the remote already holds (README created on GitHub, earlier backups).
  if (git(staging, ['fetch', '-q', 'origin'], { allowFail: true }).status === 0
    && git(staging, ['rev-parse', '--verify', '-q', 'origin/main'], { allowFail: true }).status === 0) {
    git(staging, ['reset', '-q', 'origin/main']);
  }
}

/* The backup history may only hold backup commits (README.md, code/, docs/) or a GitHub starter commit
 * (README.md, LICENSE, .gitignore). Anything else means raw history reached the remote: refuse to build on it.
 * Returns the offending commits ([] when clean or when the remote is empty/unreachable). */
function foreignCommits(staging) {
  git(staging, ['fetch', '-q', 'origin'], { allowFail: true });
  const refs = ['HEAD', 'origin/main'].filter((r) => git(staging, ['rev-parse', '--verify', '-q', r], { allowFail: true }).status === 0);
  if (!refs.length) return [];
  const bad = [];
  for (const c of git(staging, ['rev-list', ...refs]).stdout.split('\n').filter(Boolean)) {
    const subject = git(staging, ['log', '-1', '--format=%s', c]).stdout.trim();
    const top = git(staging, ['ls-tree', '--name-only', c]).stdout.split('\n').filter(Boolean);
    const backup = subject.startsWith('backup ') && top.every((t) => ['README.md', 'code', 'docs'].includes(t));
    const starter = top.every((t) => ['README.md', 'LICENSE', '.gitignore'].includes(t));
    if (!backup && !starter) bad.push(`${c.slice(0, 7)} ${subject}`);
  }
  return bad;
}

function readme(counts, skipped) {
  return [
    '# Portefeuille PLQ — sauvegarde',
    '',
    'Copie générée par `tools/backup_github.js` (date dans le message de commit). Ne pas modifier ici : la source fait foi.',
    '',
    '| Dossier | Contenu | Fichiers |',
    '|---|---|---|',
    `| \`code/\` | Fichiers suivis du dépôt local \`Projets_Dev/Portefeuille_PLQ\` (hors \`dist/\`) | ${counts.code} |`,
    `| \`docs/\` | Dossier projet OneDrive \`Portefeuille_PLQ\` | ${counts.docs} |`,
    '',
    '## Pseudonymisation',
    '',
    '| Règle | Effet |',
    '|---|---|',
    '| Personnes | Nom complet et identifiant `team.*` remplacés par `Personne_NN` (table locale, jamais publiée) |',
    '| Adresses | Toute adresse `@lait.qc.ca` remplacée par une adresse `@exemple.test` |',
    '| Exclus | `dist/` (exports et preuves de run), départs d\'équipe, fichiers non texte |',
    '| Contrôle | Le push est refusé si un nom, une adresse ou un secret subsiste |',
    '| Nom seul | Remplacé s\'il a 4 lettres ou plus et commence par une majuscule |',
    '| Limite connue | Les prénoms seuls ne sont pas remplacés ; le propriétaire du dépôt est conservé |',
    '',
    skipped.length ? `Fichiers non texte ignorés : ${skipped.length}.` : 'Aucun fichier non texte ignoré.',
    '',
  ].join('\n');
}

function edtStamp() {
  const d = new Date();
  const f = (o) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Toronto', ...o }).format(d);
  return `${f({ year: 'numeric', month: '2-digit', day: '2-digit' })} ${f({ hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h').replace(' h ', 'h')} (heure de l'Est)`;
}

function run(argv, repo = REPO) {
  const args = parseArgs(argv);
  const cfg = loadConfig(args, repo);
  if (!cfg.remote || !cfg.docs) throw Object.assign(new Error('config: remote and docs_dir are required'), { exit: 2 });
  if (!fs.existsSync(cfg.docs)) throw Object.assign(new Error(`docs folder not found: ${cfg.docs}`), { exit: 2 });

  const map = collectPeople(repo, cfg.mapFile, cfg.keep);
  fs.mkdirSync(path.dirname(cfg.mapFile), { recursive: true });
  fs.writeFileSync(cfg.mapFile, JSON.stringify(map, null, 1) + '\n');
  // People kept by choice (the repository owner) stay in the map file but get no rule and no scan.
  const active = { personnes: map.personnes.filter((p) => !cfg.keep.includes(fold(p.nom).toLowerCase())) };
  const rules = buildRules(active);

  ensureStaging(cfg.staging, cfg.remote);
  const foreign = foreignCommits(cfg.staging);
  if (foreign.length) {
    console.log(`REFUS — l'historique du dépôt distant contient ${foreign.length} commit(s) hors sauvegarde `
      + `(ex. ${foreign[0]}). Purger le dépôt GitHub avant toute sauvegarde.`);
    return 5;
  }
  for (const e of fs.readdirSync(cfg.staging)) {
    if (e !== '.git') fs.rmSync(path.join(cfg.staging, e), { recursive: true, force: true });
  }

  const rel = path.relative(repo, cfg.staging).split(path.sep).join('/');
  const excludeCode = [...cfg.excludeCode, 'dist/', 'config/team_departs.json',
    path.relative(repo, cfg.mapFile).split(path.sep).join('/'), ...(rel.startsWith('..') ? [] : [`${rel}/`])];
  const codeFiles = git(repo, ['ls-files', '-z']).stdout.split('\0').filter(Boolean)
    .filter((f) => !excluded(f, excludeCode) && fs.existsSync(path.join(repo, f)));
  const docFiles = listFiles(cfg.docs).filter((f) => !excluded(f, ['~$', '*.tmp', '.DS_Store', ...cfg.excludeDocs])
    && !path.basename(f).startsWith('~$'));

  const skipped = [];
  const counts = {
    code: copyTree(codeFiles, repo, path.join(cfg.staging, 'code'), rules, skipped, 'code'),
    docs: copyTree(docFiles, cfg.docs, path.join(cfg.staging, 'docs'), rules, skipped, 'docs'),
  };
  const stamp = edtStamp();
  fs.writeFileSync(path.join(cfg.staging, 'README.md'), readme(counts, skipped));

  const hits = scan(cfg.staging, active);
  console.log(`Copie : ${counts.code} fichiers code, ${counts.docs} documents, ${active.personnes.length} personnes pseudonymisées.`);
  if (skipped.length) console.log(`Ignorés (non texte) : ${skipped.join(', ')}`);
  if (hits.length) {
    console.log(`REFUS — ${hits.length} élément(s) sensible(s) restant(s), rien n'est commité :`);
    hits.forEach((h) => console.log(`  ${h.file} : ${h.motif}`));
    return 3;
  }
  console.log('Contrôle : aucun nom réel, aucune adresse @lait.qc.ca, aucun secret.');

  git(cfg.staging, ['add', '-A']);
  const stat = git(cfg.staging, ['diff', '--cached', '--stat']).stdout.trim();
  if (!stat) { console.log('Rien de nouveau à sauvegarder.'); return 0; }
  console.log(stat.split('\n').slice(-1)[0]);
  if (!args.push) { console.log('Essai à blanc : relancer avec --push pour commiter et pousser.'); return 0; }

  // Commit identity is neutral: the machine's git identity (company address) must never reach the public history
  // (2026-10-28: the first backup commit carried the @lait.qc.ca author — the scan only looked at file content).
  const owner = (cfg.remote.match(/github\.com[/:]([^/]+)\//) || [])[1] || 'backup';
  git(cfg.staging, ['-c', 'user.name=Sauvegarde Portefeuille PLQ', '-c', `user.email=${owner}@users.noreply.github.com`,
    'commit', '-q', '-m', `backup ${stamp}`]);
  const author = git(cfg.staging, ['log', '-1', '--format=%an <%ae>|%cn <%ce>']).stdout.trim();
  if (COMPANY_MAIL.test(author)) { COMPANY_MAIL.lastIndex = 0; throw Object.assign(new Error(`REFUS — identité de commit avec une adresse de l'entreprise : ${author}`), { exit: 3 }); }
  COMPANY_MAIL.lastIndex = 0;
  git(cfg.staging, ['push', '-q', '-u', 'origin', 'main']);
  console.log(`Poussé vers ${cfg.remote}.`);
  return 0;
}

module.exports = { pseudonymise, buildRules, variants, scan, collectPeople, excluded, run };

if (require.main === module) {
  try { process.exit(run(process.argv.slice(2))); } catch (e) { console.error(e.message); process.exit(e.exit || 2); }
}
