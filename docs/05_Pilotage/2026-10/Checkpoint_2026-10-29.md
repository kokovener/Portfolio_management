# Checkpoint — 2026-10-29 (fin des itérations 1–3)

Relecture à froid par un sous-agent au contexte neuf (lecture seule, sans le raisonnement des sessions) : 19 constats. Actions faites le jour même ; commits `ab6c096`, `a2b3ddf`. Les corrections ont été relues par un second sous-agent au contexte neuf : 8 écarts, tous corrigés (§4).

## 1. Constats et suite

| # | Constat | Cause | Grav. | Suite |
|---|---|---|---|---|
| C1 | Lundi 2 nov. 7 h : ledger W45 pas encore écrit → Jira en échec, puis Jira data et Miro | Le briefing quotidien écrit le ledger après 7 h ; l'adaptateur lisait sans tester l'existence | M | **fait** : ledger absent sauté + signal `ledger_absent` ; refus si aucun ledger |
| C2 | Heures fausses dès le 1er nov. : page « EDT » à −04:00 en dur ; fin de sprint à minuit lue le lendemain (Jira data) | Proposition E13 (heure de Toronto) jamais appliquée à `core.js` | S | **fait** : `America/Toronto` (EST −05:00) dans `core.js`, Smartsheet, fériés ; test DST |
| C3 | Digest du 2 nov. : toutes les alertes « nouvelles » | Comparaison au texte des alertes du 27 oct., écrites avant R44 | S | **fait** : alertes du lundi précédent recalculées avec les règles du jour ; test |
| C4 | Lundi 9 h : le passage quotidien peut écrire pendant la tâche de 7 h | Il attendait l'instantané, écrit au début de la tâche, pas à la fin | S | **fait** : le passage v5 attend, le lundi et le mardi, l'instantané **et** le marqueur `fin` de la tâche du lundi v13 |
| C5 | Enveloppes des 3 tâches planifiées : « jamais de suppression » (contredit K13), versions v7 / v2 citées | Non touchées depuis le 28 oct. | S | **fait** : enveloppes mises à jour (exception K13, « N le plus grand ») |
| C6 | 3 suites de tests en échec, aucune commande pour tout lancer | R44 n'a pas mis à jour 2 tests ; tests liés à la base vivante | M | **fait** : 3 suites réparées, `tests/run_all.sh` : 16 suites, 0 échec ; K16 fermée |
| C7 | Données personnelles commitées (annuaire, équipe, calendrier, absences) | `dist/passages/` (R36) hors des règles `.gitignore` | S | **fait** : `dist/passages/` et 74 fiches `personnes` de `dist/runs/` retirées de l'index, fichiers gardés ; historique → K19 |
| C8 | Boucle de validation de l'analyste ouverte : `verdicts.json` lu, jamais écrit | Seule la moitié « agent » de F9–F11 a été codée | S | **R46** (Franck : boutons dans la page) |
| C9 | Kickoff : SDD, PLQ, JSM STG21 lus ; connecteur = GOU21 seul | Périmètre réduit dans le modèle v2 sans réviser le Kickoff | S | **fait** : Kickoff v5 D11 D17 D18 (Franck : GOU21 seul) ; CLAUDE.md aligné |
| C10 | Schéma de flux v3 et spécification d'interface v1 périmés | Changements tracés dans les retours et les commits seulement | C | **R47, R48** |
| C11 | Liens d'annexes vers des versions archivées (Jira, Smartsheet) ; modèle v14 « −04:00 obligatoire » | En-têtes non réécrits à chaque vN+1 | C | **fait** (corrigé en place, documents non diffusés) |
| C12 | Sauvegarde GitHub non relancée depuis le 28 oct. 14 h 32 | Lancement manuel, hors cadence | C | à relancer par Franck (poste Windows) |

## 2. « Agent validateur »

| Quoi | Réponse |
|---|---|
| Ce qui existe | Un seul agent : l'**analyste** (F9, 28 oct.) ; les « validateurs » du code sont des contrôles de schéma, pas des agents |
| Quand | Lundi 7 h, étape 3b : après les adaptateurs, avant le digest ; jamais à 9 h ni 13 h |
| Ce qu'il fait | ≤ 5 signaux croisés, chacun prouvé, dans le digest et Teams (« Signaux à confirmer ») ; rien en base |
| Ce qui manque | Ton jugement juste / faux : aucun outil ne l'écrit → R46 |
| Premier passage réel | Lundi 2 nov. (essai seulement le 28 oct.) |

## 3. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| T32 | Modèle v14, fiches Jira v9 / Smartsheet v5, Retours itération 3 corrigés en place (non diffusés, précédent T25) ; prompts du lundi et des passages en vN+1 (lus par les tâches planifiées) |
| T33 | Page v42 non republiée aujourd'hui : la tâche du lundi la republie (pagecheck), avant que l'heure EST ne s'affiche |
| T34 | Passage du lundi ou du mardi sans instantané ou sans marqueur `fin` : il n'écrit rien, le passage suivant rattrape (un jour de retard plutôt qu'un conflit d'écriture) |
| T35 | Historique git non purgé (réécriture = suppression : accord requis) → K19 |

## 4. Relecture des corrections (2e sous-agent, contexte neuf)

| # | Écart | Cause | Suite |
|---|---|---|---|
| V1 | Passage v5 : le marqueur `fin` remplaçait le test de l'instantané | Condition remplacée au lieu d'ajoutée | **fait** : les deux conditions |
| V2 | 74 fiches `personnes` encore suivies dans `dist/runs/` | `git rm --cached` limité à `dist/passages/` | **fait** |
| V3 | Kickoff v5 §3 Entrants listait encore SDD, PLQ | Seules D11, D17, D18 relues | **fait** |
| V4 | Lundi retardé au mardi non protégé | C4 traité pour le cas nominal | **fait** (V1) |
| V5 | Prompt du lundi : heure avancée « dès le 8 mars » | Date 2026 recopiée | **fait** : 14 mars 2027 |
| V6 | Fiche Jira L5 et `schema.json` disaient encore « −04:00 » ; `ledger_absent` non documenté | C11 limité au modèle | **fait** |
| V7 | Pas de test `ledger_absent` | Correctif essayé à la main | **fait** : jira 18 tests |
| V8 | Titres d'annexe et « heure EDT » du Kickoff v5 | En-têtes non réécrits en vN+1 | **fait** |
