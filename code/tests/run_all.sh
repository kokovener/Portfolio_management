#!/usr/bin/env bash
# Run every test suite with the real-data inputs it was written against (checkpoint 2026-10-29).
# Usage: bash tests/run_all.sh   (from anywhere; needs node, python3 with jsonschema>=4.18, jsdom in $JSDOM_DIR)
# Each suite runs in isolation: one failing suite never hides the others. Exit code = number of failing suites.
# Some inputs are local-only run evidence (gitignored personal data): a missing input is reported as SKIP, never as OK.
set -u
cd "$(dirname "$0")/.."
SCHEMA="${SCHEMA:-../../OneDrive - Les producteurs de lait du Québec/Documents/Claude/Portefeuille_PLQ/02_Modele/schema.json}"
[ -f "$SCHEMA" ] || SCHEMA="$(ls -d /sessions/*/mnt/Portefeuille_PLQ/02_Modele/schema.json 2>/dev/null | head -1)"
FEEDS="$(dirname "$(dirname "$SCHEMA")")/04_Adaptateurs/Feeds_Inscrits_v1.md"
LEDGER="${LEDGER:-$(ls -d /sessions/*/mnt/Goutte2.1/Daily_Brief/_ledger 2>/dev/null | head -1)}"
[ -n "$LEDGER" ] || LEDGER="../../OneDrive - Les producteurs de lait du Québec/Documents/Claude/Goutte2.1/Daily_Brief/_ledger"
JSDOM_DIR="${JSDOM_DIR:-/tmp/jd/node_modules}"
R27=dist/runs/2026-10-27; R28=dist/runs/2026-10-28; BASE29=dist/passages/2026-10-29-jeudi-1302/base_avant
TMP="$(mktemp -d)"
fail=0; skip=0
run() { # name, inputs-to-check..., -- , command...
  local name="$1"; shift; local miss=""
  while [ "$1" != "--" ]; do [ -e "$1" ] || miss="$miss $1"; shift; done; shift
  if [ -n "$miss" ]; then echo "SKIP $name (absent:$miss)"; skip=$((skip+1)); return; fi
  local out; out="$("$@" 2>&1)"; local rc=$?
  if [ $rc -eq 0 ]; then echo "OK   $name ($(printf '%s\n' "$out" | grep -c '^ok\|✓\|^OK'))"; else echo "FAIL $name"; printf '%s\n' "$out" | tail -8 | sed 's/^/     /'; fail=$((fail+1)); fi
}
run core            "$SCHEMA" dist/seed/base_seed.json -- node tests/test_core.js "$SCHEMA" dist/seed/base_seed.json
run core_r06        $R28/r06c/base $R28/r06c/jira_out/doc.json -- node tests/test_core_r06.js $R28/r06c/base $R28/r06c/jira_out/doc.json
run public_base     $BASE29 -- node tests/test_public_base.js $BASE29
run cadence         "$SCHEMA" -- node tests/test_cadence.js "$SCHEMA"
run feries          tests -- node tests/test_adapt_feries.js
run backup_github   tests -- node tests/test_backup_github.js
run smartsheet      $R28/r06/smartsheet_raw.json $R28/r06c/base -- node tests/test_adapt_smartsheet.js $R28/r06/smartsheet_raw.json $R28/r06c/base
run jira            $R27/jira_raw.json $R27/jira_base_before "$LEDGER/2026-W44.md" -- node tests/test_adapt_jira.js $R27/jira_raw.json $R27/jira_base_before "$LEDGER/2026-W40.md" "$LEDGER/2026-W41.md" "$LEDGER/2026-W42.md" "$LEDGER/2026-W43.md" "$LEDGER/2026-W44.md"
run mep_sources     dist/runs/2026-10-30/mep_sources/raw.json dist/passages/2026-10-30-quotidien-0902/jira/raw.json "$LEDGER/2026-W44.md" -- node tests/test_mep_sources.js dist/runs/2026-10-30/mep_sources/raw.json dist/passages/2026-10-30-quotidien-0902/jira "$LEDGER/2026-W40.md" "$LEDGER/2026-W41.md" "$LEDGER/2026-W42.md" "$LEDGER/2026-W43.md" "$LEDGER/2026-W44.md"
run jira_data       $R28/jira_data/raw.json $R28/r34/base -- node tests/test_adapt_jira_data.js $R28/jira_data/raw.json $R28/r34/base
run outlook         $R27/team_raw.json $R27/outlook_raw.json $R27/outlook_base_before -- node tests/test_adapt_outlook.js $R27/team_raw.json $R27/outlook_raw.json $R27/outlook_base_before
run miro            $R27/miro_raw.json -- node tests/test_adapt_miro.js $R27/miro_raw.json
run artefacts       "$FEEDS" $R27/artefacts_raw $R27/art_base_before -- node tests/test_adapt_artefacts.js "$FEEDS" $R27/artefacts_raw $R27/art_base_before "$SCHEMA" "$TMP/art"
run gantt           "$SCHEMA" tests/fixtures/gantt/methane-gantt.drawio -- node tests/test_adapt_gantt.js "$SCHEMA"
run ajout_projet    "$SCHEMA" -- node tests/test_ajout_projet.js "$SCHEMA"
run feed_gantt      "$FEEDS" $R27/art_base_before tests/fixtures/expertg1_index_2026-10-29.html -- node tests/test_feed_gantt.js "$FEEDS" $R27/art_base_before "$SCHEMA" "$TMP/fg"
run statut_actions  dist/retro/2026-10-27 -- node tests/test_statut_actions.js dist/retro/2026-10-27 "$SCHEMA"
run lundi           $BASE29 -- node tests/test_lundi.js $BASE29 "$SCHEMA"
run page_dom_v1     "$JSDOM_DIR/jsdom" -- bash -c "python3 tools/build_interface.py '$SCHEMA' dist/seed/base_seed.json >/dev/null && cp dist/preview_local.html '$TMP/p1.html' && NODE_PATH='$JSDOM_DIR' node tests/test_page_dom.js '$TMP/p1.html'"
run page_dom_r49    "$JSDOM_DIR/jsdom" tests/fixtures/seed_r49.json tests/fixtures/seed_r49_l8q.json -- bash -c "python3 tools/build_interface.py '$SCHEMA' tests/fixtures/seed_r49_l8q.json >/dev/null && cp dist/preview_local.html '$TMP/p49q.html' && python3 tools/build_interface.py '$SCHEMA' tests/fixtures/seed_r49.json >/dev/null && cp dist/preview_local.html '$TMP/p49.html' && NODE_PATH='$JSDOM_DIR' node tests/test_page_dom_r49.js '$TMP/p49.html' '$TMP/p49q.html'"
run page_dom_v2    "$JSDOM_DIR/jsdom" tests/fixtures/seed_v2.json -- bash -c "python3 tools/build_interface.py '$SCHEMA' tests/fixtures/seed_v2.json >/dev/null && cp dist/preview_local.html '$TMP/p2.html' && NODE_PATH='$JSDOM_DIR' node tests/test_page_dom_v2.js '$TMP/p2.html'"
run page_dom_ux    "$JSDOM_DIR/jsdom" tests/fixtures/seed_r49.json tests/fixtures/seed_v2.json -- bash -c "python3 tools/build_interface.py '$SCHEMA' tests/fixtures/seed_r49.json >/dev/null && cp dist/preview_local.html '$TMP/pu1.html' && python3 tools/build_interface.py '$SCHEMA' tests/fixtures/seed_v2.json >/dev/null && cp dist/preview_local.html '$TMP/pu2.html' && NODE_PATH='$JSDOM_DIR' node tests/test_page_dom_ux.js '$TMP/pu1.html' '$TMP/pu2.html'"
run page_dom_gantt "$JSDOM_DIR/jsdom" tests/fixtures/seed_gantt.json -- bash -c "python3 tools/build_interface.py '$SCHEMA' tests/fixtures/seed_gantt.json >/dev/null && cp dist/preview_local.html '$TMP/pg.html' && NODE_PATH='$JSDOM_DIR' node tests/test_page_dom_gantt.js '$TMP/pg.html'"
git checkout -q -- dist/portefeuille.html 2>/dev/null || echo "WARN dist/portefeuille.html non restauré (git checkout impossible : verrou ?) — reconstruit par les tests" # build_interface rewrites the tracked page: restore it
echo "---- $fail en échec · $skip sautés"
rm -rf "$TMP"
exit $fail
