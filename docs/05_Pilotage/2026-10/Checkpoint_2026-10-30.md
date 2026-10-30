# Checkpoint — 2026-10-30 (deux sessions parallèles : Gantt D21/D22 · MEP D18 v8)

Relecture à froid par un sous-agent au contexte neuf : aucune décision écrasée, versions séquentielles (Kickoff v6→v7→v8, modèle v15→v16→v17, lundi v15→v16→v17), git linéaire, 23 suites vertes. 13 écarts de cohérence.

## 1. Constats et suite

| # | Constat | Cause | Grav. | Suite |
|---|---|---|---|---|
| K1 | Spec interface v2 sans l'interface MEP de la page v49, pointe le modèle v16 archivé | Figée à 11h37 EDT par la session Gantt, avant les commits MEP (12h00) | M | **fait** : Interface v3 (§8 MEP, §3 « + MEP ») |
| K2 | Cadence v2 : B3 = « Jira + ledger » | Écrite à 11h05 avant les sources MEP (11h45) | C | **fait** : Cadence v3, Passage v7 (pointeur « dernier _v* »), `cadence.json` |
| K3 | Kickoff D22 : jalons d'un Gantt de feed comptés dans la santé (tableau) vs affichage (annexe, modèle, adaptateur) | Extension v7 ajoutée sans relire la phrase v6 | M | **fait** : Kickoff v9 (D22, D11 calendrier cité) |
| K4 | Spec §7 : Gantt de feed non décrit (provenance, jalons, estompage) | §7 écrit avant D22 v7 | C | **fait** : Interface v3 §7 |
| K5 | Titres d'annexes restés à la version précédente (Kickoff, modèle, cadence, interface) ; annexe Jira v10 → Interface v1 | Copie sans reprise du titre | C | **fait** (en place, coquilles) |
| K6 | Carte Gantt de feed affiche la fraîcheur B12 (gantt) au lieu de B9 (artefacts) | `freshTag` codé pour le Gantt de fichier seul | C | après la démo (code) |
| K7 | `schema.json` : `modele` limité à « 15 » alors que la v17 ajoute `teams` ; description « D18 v7 » | v16 déclarée « schéma inchangé », v17 n'a pas étendu l'énumération | C | après la démo (code) |
| K8 | Aucune cible « rafraîchis les MEP » dans `cadence.json` | v3 a élargi B3 sans cible `demande` | C | après la démo : cible `mep` = [`jira`] |
| K9 | Spec §3 : « Charge flux WIP/ETP » et « limite WIP » encore saisissables | Spec non purgée à D7 v2 (28 oct.) | C | R47 (spec à purger) |
| K10 | En-têtes de `tools/cadence.js`, `tools/adapt_jira.js` pointent les fiches v1 | Pointeurs corrigés dans la config seulement | C | après la démo (code) |
| K11 | Verrous `.git/HEAD.lock` et `.git/index.lock` laissés par le commit `c57d6ee` (12h16 EDT) | Le sandbox ne peut pas supprimer dans `.git` sous OneDrive/Windows | **S** | **fait** : suppression autorisée par Franck (30 oct.), verrous et objets temporaires retirés, `git status` propre |

## 2. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| A1 | Annexes : titres corrigés en place (coquille, aucune décision touchée) |
| A2 | Interface v3 créée ce jour et non diffusée : §7 complété en place |
| A3 | Corrections de code (K6–K8, K10) reportées après la démo : aucune ne fausse les données affichées |
| A4 | Rafraîchissement complet du 30 oct. lancé « à la demande » (toutes cibles sauf équipe), sans instantané, digest ni Teams : l'instantané est réservé au lundi |
