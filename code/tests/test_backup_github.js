#!/usr/bin/env node
/* GitHub backup tests. Usage: node tests/test_backup_github.js
 * Builds a throw-away repo, docs folder and bare remote in a temp dir; synthetic people only.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const B = require('../tools/backup_github.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bk-'));
const sh = (cwd, ...a) => { const r = spawnSync('git', a, { cwd, encoding: 'utf8' }); assert.strictEqual(r.status, 0, r.stderr); return r.stdout; };
const w = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const quiet = (fn) => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };

// Fake source repo: one person in dist/, one departure, the owner, a company address in a test.
const repo = path.join(tmp, 'repo');
w(path.join(repo, 'dist/seed/base.json'), JSON.stringify([{ id: 'team.tremblay-elodie', nom: 'Élodie Tremblay' },
  { id: 'team.owner-olga', nom: 'Olga Owner' }]));
w(path.join(repo, 'config/team_departs.json'), JSON.stringify([{ nom: 'Gagnon', prenom: 'Rémi' }]));
w(path.join(repo, 'tools/a.js'), "// owner: Olga Owner\nconst m = 'adresse-masquee@exemple.test'; // team.tremblay-elodie\n");
w(path.join(repo, 'tests/b.js'), "assert(x === 'Rémi Gagnon'); // GAGNON, à côté de Tremblay\n");
w(path.join(repo, 'logo.png'), 'binary');
sh(repo, 'init', '-q', '-b', 'main');
sh(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A');
sh(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'init');
const docs = path.join(tmp, 'docs');
w(path.join(docs, '01/plan_v1.md'), '| Tremblay, Élodie | absente 3 nov. | Mme Elodie Tremblay |\n');
w(path.join(docs, '01/~$plan_v1.md'), 'lock');
const remote = path.join(tmp, 'remote.git');
sh(tmp, 'init', '-q', '--bare', remote);
const cfgP = path.join(tmp, 'cfg.json');
const cfg = { remote, docs_dir: docs, staging_dir: path.join(tmp, 'staging'), pseudonym_map: path.join(tmp, 'map.json'),
  keep_people: ['Olga Owner'] };
w(cfgP, JSON.stringify(cfg));
const stg = (f) => fs.readFileSync(path.join(cfg.staging_dir, f), 'utf8');

// 1. Dry run: copy pseudonymised, nothing committed, local repo untouched.
const head = sh(repo, 'rev-parse', 'HEAD');
assert.strictEqual(quiet(() => B.run(['--config', cfgP], repo)), 0);
assert.strictEqual(sh(repo, 'rev-parse', 'HEAD'), head);
assert.strictEqual(sh(repo, 'status', '--porcelain'), '');
const a = stg('code/tools/a.js');
assert.ok(a.includes('Olga Owner'), 'owner kept');
assert.ok(!/tremblay/i.test(a) && a.includes('team.personne-'), 'slug and address replaced');
assert.ok(a.includes('@exemple.test'));
const b = stg('code/tests/b.js');
assert.ok(!/Gagnon|GAGNON|Rémi Gagnon/.test(b), 'departure pseudonymised, upper case too');
assert.ok(b.includes('à côté de'), 'common words kept');
assert.ok(!fs.existsSync(path.join(cfg.staging_dir, 'code/dist')), 'dist/ excluded');
assert.ok(!fs.existsSync(path.join(cfg.staging_dir, 'code/config/team_departs.json')), 'departures excluded');
assert.ok(!fs.existsSync(path.join(cfg.staging_dir, 'code/logo.png')), 'binary skipped');
assert.ok(!fs.existsSync(path.join(cfg.staging_dir, 'docs/01/~$plan_v1.md')), 'Office lock skipped');
assert.ok(!/Tremblay|Elodie Tremblay/.test(stg('docs/01/plan_v1.md')));
assert.strictEqual(spawnSync('git', ['rev-parse', '-q', '--verify', 'HEAD'], { cwd: cfg.staging_dir }).status !== 0, true, 'no commit on dry run');

// 2. Tags are stable and append-only.
const map1 = JSON.parse(fs.readFileSync(cfg.pseudonym_map, 'utf8'));
assert.deepStrictEqual(map1.personnes.map((p) => p.nom).sort(), ['Rémi Gagnon', 'Élodie Tremblay'].sort(), 'owner never mapped');
w(path.join(repo, 'dist/seed/base2.json'), JSON.stringify([{ id: 'team.aaron-abel', nom: 'Abel Aaron' }]));
sh(repo, 'add', '-A'); sh(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'p2');
quiet(() => B.run(['--config', cfgP], repo));
const map2 = JSON.parse(fs.readFileSync(cfg.pseudonym_map, 'utf8'));
map1.personnes.forEach((p) => assert.ok(map2.personnes.some((q) => q.nom === p.nom && q.tag === p.tag), 'tag kept'));

// 3. Push, then a second push with no change is a no-op.
assert.strictEqual(quiet(() => B.run(['--config', cfgP, '--push'], repo)), 0);
assert.strictEqual(sh(remote, 'rev-list', '--count', 'main').trim(), '1');
assert.strictEqual(quiet(() => B.run(['--config', cfgP, '--push'], repo)), 0);
assert.strictEqual(sh(remote, 'rev-list', '--count', 'main').trim(), '1');

// 4. Fail closed: a secret blocks the commit.
w(path.join(docs, '02/notes.md'), 'token: ghp_' + 'A'.repeat(36) + '\n');
assert.strictEqual(quiet(() => B.run(['--config', cfgP, '--push'], repo)), 3);
assert.strictEqual(sh(remote, 'rev-list', '--count', 'main').trim(), '1');

// 5. A fresh staging dir resumes on top of the remote history.
fs.rmSync(path.join(docs, '02'), { recursive: true });
fs.rmSync(cfg.staging_dir, { recursive: true, force: true });
w(path.join(docs, '01/plan_v2.md'), 'v2\n');
assert.strictEqual(quiet(() => B.run(['--config', cfgP, '--push'], repo)), 0);
assert.strictEqual(sh(remote, 'rev-list', '--count', 'main').trim(), '2');

// 6. Raw repo history pushed to the remote beforehand: refused, nothing built on top of it.
const remote2 = path.join(tmp, 'remote2.git');
sh(tmp, 'init', '-q', '--bare', remote2);
sh(repo, 'push', '-q', remote2, 'main');
const cfg2P = path.join(tmp, 'cfg2.json');
w(cfg2P, JSON.stringify({ ...cfg, remote: remote2, staging_dir: path.join(tmp, 'staging2') }));
assert.strictEqual(quiet(() => B.run(['--config', cfg2P, '--push'], repo)), 5);
assert.strictEqual(sh(remote2, 'rev-list', '--count', 'main').trim(), '2', 'remote untouched');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('test_backup_github: ok');
