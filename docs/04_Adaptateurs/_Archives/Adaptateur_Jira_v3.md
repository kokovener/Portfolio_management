# Adaptateur Jira v3 — GOU21 (sprints, MEP, data, réel)

> Étape 3b · 2026-10-27 · **v2 2026-10-28 (retours lot 2, modèle v2)** : dernier sprint clos (R14) ; §1b data = points du sprint (R05), statistiques d'épopées (R10), support lié à STG21 (R03) · **v3 2026-10-28 (atelier R06, 2e partie, modèle v4)** : fenêtre réelle d'un item = sprints de ses épopées ; garde-fou périmètre · Motifs : `Adaptateur_Jira_v3_Annexe_Motifs.md`

## 1. Chaîne d'exécution

| # | Étape | Outil · sortie |
|---|---|---|
| 1 | Lire les sprints du board 38, les versions GOU21, les tickets MEP, les demandes des versions non livrées, les tickets GOU21 cités au ledger hors épopée | connecteur Atlassian (`executeRead` + `responseFields`) → `dist/runs/<date>/jira_raw.json` |
| 2 | Lire la base (sprints, meps) et leurs versions | `ArtifactData list` → `jira_base_before/` + `versions.json` |
| 3 | Transformer et recouper avec les ledgers des semaines couvrant 30 j (W40–W44) | `node tools/adapt_jira.js <raw> <base> <out> <ledger.md>…` → `doc.json`, `batch.json`, `report.json` |
| 4 | Valider | `validate_model.py` (schéma + références) · `tests/test_adapt_jira.js` (16) |
| 5 | Écrire | `ArtifactData batch` épinglé ; la vue lit la base, pas de republication |
| 6 | Prouver la relance | relecture de la base → nouvelle exécution → 26 / 26 identiques (`jira_out_rerun/`) |

## 1b. Chaîne « data » (modèle v2)

| # | Étape | Outil · sortie |
|---|---|---|
| 1 | Tickets des 3 sprints lus (clés, catégorie de statut, assigné, épopée, Story Points, sprints) | `getJiraBoardIssueData` board 38 + `responseFields` → `dist/runs/<date>/jira_data/raw.json` |
| 2 | Comptes par item : `parent in (<epics_jira>)` total · Done · In Progress | `searchJiraIssuesUsingJql` mode count |
| 3 | Support : Bug · Story · Tâche ouverts mis à jour depuis 8 j + liés connus, puis liens web de chacun (balayage initial 60 j : 187) | `getJiraBoardIssueData` · `listJiraIssueRemoteIssueLinks` |
| 3b | Réel (v3) : calendrier des sprints du board 38 + tickets des épopées des items, avec leurs sprints (annulés et tickets sans sprint exclus) | `listJiraBoardSprints` (state all) · `getJiraBoardIssueData` dataset all, jql `parent in (<épopées>) AND issuetype not in subTaskIssueTypes() AND status != "Annulé" AND sprint is not EMPTY`, responseFields clé · parent · catégorie · ids de sprint → `board_sprints`, `epic_sprint_issues` |
| 4 | Transformer | `node tools/adapt_jira_data.js <raw> <base> <out>` → `doc.json`, `batch.json`, `report.json` |
| 5 | Valider · tester | `validate_model.py` (doc + base) · `tests/test_adapt_jira_data.js` (11) · relance = 0 écriture |

| Source | Modèle v2 | Règle |
|---|---|---|
| Épopée du ticket ∈ `item.epics_jira` (Gérer) | `charge.item` | sinon programme `goutte21` (« hors item ») + signal par épopée |
| Story Points (`customfield_10036`) par assigné, sprint, item | `charge` mode `points` · `valeur` · `tickets` | ticket sans points = 1 ticket, 0 point |
| Assigné ↔ nom Team_G2.1 | `charge.personne` | inconnu → `charge.nom` + rôle dev + signal |
| Comptes de l'item | `stat_jira.tickets` | à faire = total − faits − en cours |
| Tickets du sprint actif de l'item | `stat_jira.sprint` | tickets · faits · points · points faits |
| Sprints des tickets des épopées (v3) | `stat_jira.fenetre_reelle` | début = début du 1er sprint ; fin = fin du dernier sprint si plus aucun ticket ouvert, sinon null ; `jusqu_au` = fin du dernier sprint qui porte un ticket ouvert ; sprint futur sans date = lundi suivant le précédent + durée du sprint actif ; fin à minuit local = veille |
| Total de tickets en hausse vs lecture précédente (v3) | signal `perimetre` | un % bas peut venir d'un périmètre qui grossit |
| Lien web vers `plq-supportg2…/STG21-n` (browse ou file de service) sur un ticket ouvert | `item run.extranets.support[]` | extranet = règle de titre des MEP ; âge = depuis création GOU21 ; tendance vs lecture d'un jour antérieur |

## 2. Correspondance

| Source | Modèle | Règle |
|---|---|---|
| Dernier sprint `closed` + `active` + 1er `future` du board 38 | `sprint` `jira.gou21-s<N>` | autres non lus ; clos → `etat` clos (R14) |
| `startDate` · `endDate` | `debut` · `fin` · `jours_ouvres` | heure du Québec ; fin à minuit = veille ; sans dates → déduites, marquées |
| `goal` | `objectif` | — |
| Enfant de l'épopée GOU21-1651 dont le résumé commence par « MEP » | `mep` `jira.<clé>` · `libelle` · `responsable` | autres enfants ignorés |
| Nom du statut du ticket | `statut` | Terminé → completee · Annulé → annulee · « Pret pour déploiement en production » → prete · sinon prete si toutes les demandes de sa version non livrée sont prêtes, sinon planifiee |
| Version liée (lien `versions/<id>` de la description, sinon nom dans le résumé) ou résumé | `systeme` · `item` | Extranet … → `run.extranets` · G1, Infra → `run.ti` · sinon `goutte21` |
| Ligne `MEP` du ledger | `date` | date de déploiement ; à défaut, passage à Terminé ; aucune → non écrite |
| Ligne `MEP` du ledger sans ticket MEP Jira | `mep` source `ledger` | ligne de clôture prioritaire ; statut confirmé par Jira si ticket GOU21 |

## 3. Valeur lue à la source / valeur dans la base (3 lignes réelles, lecture 27 oct. 19h40 EDT)

| Ligne | Champ | Lu à la source | Dans la base (ArtifactData) |
|---|---|---|---|
| Sprint S19 (sprint 71, v3) | Dates | début 19 oct. 10h52 · fin 6 nov. 23h00 (heure normale) | `debut` 2026-10-19 · `fin` 2026-11-06 |
| | Jours ouvrés · état | — · active | `jours_ouvres` 15 · `etat` actif |
| GOU21-11325 (v3) | Statut · version | Ouvert · OPS_ExRegion_2610 (1 demande « Prêt pour Preprod ») | `statut` planifiee |
| | Date | Jira : aucune · ledger W44 : 26 oct. planifiée | `date` 2026-10-26 |
| | Système · item | version ExRegion | Extranet Région · run.extranets |
| GOU21-11185 (v2) | Statut · date | Jira : Terminé le 19 oct. · ledger W42 : 14 oct. complétée | `completee` · `date` 2026-10-14 |
| | Système · item | résumé « serveur SQL Extranet » | Infra (SQL, serveurs) · run.ti |

## 4. Résultat v1 (27 oct., base : 72 documents)

| Mesure | Valeur |
|---|---|
| Sprints écrits | 2 le 27 oct. : S19 (19 oct. → 6 nov., 15 j ouvrés) · S20 (9 → 27 nov., dates déduites) ; v2 (28 oct.) : + S18 clos (29 sept. → 15 oct.) |
| MEP écrites | 24 : 9 tickets Jira · 15 lignes de ledger (13 SDD, 1 PLQ, 1 GOU21 hors épopée) |
| Statuts | 18 complétées · 6 planifiées, toutes échues : GOU21-11325, SDD-2967, SDD-2942, SDD-2980, SDD-2981, PLQ-9437 |
| Non écrites | 2 MEP ouvertes sans date : GOU21-10584, GOU21-11326 · 3 versions sans ticket MEP : Code_Taxe_L1, Ops_proaction_2609, Ops_Qualité_2610 |
| Signaux | 15, dans `report.json` → digest du lundi (étape 4) |
| Vue (navigateur, 27 oct. 18h37 EDT) | grille « S19 · 19 oct.–6 nov. », « S20 · 9–27 nov. » · « MEP : 24 lues · 0 à venir » · Sprint S19 : 11 MEP |

## 4b. Résultat data (lecture 28 oct. 12h14 EDT, base : 120 documents)

| Mesure | Valeur |
|---|---|
| Tickets lus | 73 (S18 · S19 : 29 · S20) ; 7 assignés dont 1 hors équipe (Personne_15) |
| Charges points écrites | 26 · S19 : Personne_14 101 pts / 24 tickets · Personne_15 5 / 2 · Personne_08 3 / 3 |
| Statistiques | Codes de taxes 12 / 44 faits (annulés exclus) (S19 : 14 tickets, 46 pts) · L8D 6 / 40 · L0 61 / 114 · Run extranets 97 / 107 |
| Hors item | 6 épopées (Transporteur P2, Région P2, Usine P2, Producteur P2, Commun P2, MS Schedule) → programme |
| Support | 187 tickets vérifiés (Bug · Story · Tâche ouverts, MAJ < 60 j) · 3 tickets GOU21 = 2 demandes STG21 : STG21-226 (Région, 10412 + 10413, 93 j) · STG21-206 (Producteur, 9889, 166 j) · liens PLQ et Confluence ignorés |
| Vue (navigateur, 28 oct.) | Sprint S19 : tableau par personne (7 lignes) · 4 items · hors item 7 tickets / 33 pts |

## 4c. Résultat réel (lecture 28 oct. 16h20 EDT, 80 tickets en sprint, 23 sprints)

| Item | Réel Jira | Sprints |
|---|---|---|
| Codes de taxes | 28 juil. → en cours, planifié jusqu'au 27 nov. · 32 ouverts | S15 → S20 |
| Grilles de taxes (GOU21-9604, d'abord rattachée à L8D, corrigé le 28 oct.) | 18 août → en cours · 34 ouverts, aucun dans un sprint | S16 → S19 |
| L0 | 8 déc. 2025 → en cours, planifié jusqu'au 18 déc. · 53 ouverts | S6 → S21 |

## 5. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| J1 | Sprint suivant = 1er sprint futur du board 38 |
| JR1 | Réel = sprints des tickets, pas les dates d'épopée (vides dans Jira) ni l'historique des statuts (coûteux) |
| JR2 | Réel écrit dans `stat_jira`, jamais dans `item` |
| J2 | Dates du sprint lues en heure du Québec ; fin à minuit = veille |
| J3 | S20 sans dates : déduites, marquées dans `source.ref` |
| J4 | Grain MEP = épopée GOU21-1651 + préfixe « MEP » |
| J5 | Statut : Jira fait foi, lu par le nom du statut |
| J6 | Date : le ledger fait foi ; Jira (clôture) à défaut |
| J7 | MEP sans date : non écrite |
| J8 | « Prête » = demandes prêtes pour la production ; « Prêt pour Preprod » ne compte pas |
| J9 | Système et item déduits de la version, sinon du libellé |
| J10 | Fenêtre : ouvertes + 30 j ; ledgers W40–W44 |
| J11 | MEP en base non relues : conservées |
| J12 | GOU21-11323 (ledger, hors épopée) : gardé |
| J13 | Lecture filtrée par `responseFields` |
| J14 | Épopées initiales posées par Claude (à corriger dans Gérer) : 9199 → Codes de taxes · 9604 → L8D · 9934, 9781, 8354 → L0 · 5466 → Run extranets |
| J15 | Support compté en demandes STG21 distinctes (une demande peut donner un ticket FE et un BE) ; « Producteur » lu avant « ProAction » dans le titre |
| J16 | Un assigné hors Team_G2.1 reste visible sous son nom, rôle dev par défaut |

## 6. Écarts au modèle (non repris en v2, proposés pour v3)

| # | Écart | Proposition |
|---|---|---|
| E1 | Valeur déduite dans un champ source (S20) | `sprint.dates_deduites` |
| E2 | MEP planifiée sans date non représentable | `mep.date` facultative si `planifiee` |
| E3 | Id `jira.sdd-…` / `jira.plq-…` pour une MEP lue au ledger (préfixe ≠ origine) | préfixe = système du ticket, pas de la lecture |
| E4 | Valeurs `systeme` hors exemples : « Infra (SQL, serveurs) », « Extranet (commun) » | liste fermée de systèmes |

## 7. Limites et décisions à prendre

| # | Point | Qui |
|---|---|---|
| L1 | GOU21-10584 ExtraTransporteurV3 : 63 / 66 demandes prêtes, aucune date | Franck : dater la MEP au ledger ou dans Jira |
| L2 | 6 MEP planifiées échues : ledger non clos ou MEP reportée | Franck : clore ou redater au ledger |
| L3 | SDD et PLQ connus par le ledger seulement (connecteur = GOU21) | — |
| L4 | MEP sans ligne au ledger : date = clôture Jira, peut suivre la MEP de plusieurs jours | — |
| L5 | Horodatages écrits en −04:00 (règle projet) alors que l'heure normale commence le 1er nov. | Franck : règle « EDT » à revoir |
| L6 | Personne_14 porte 24 des 29 tickets de S19 : assignation de coordination ou charge réelle ? | Franck |
| L7 | 22 tickets de S20 sans points : la charge S20 est sous-estimée tant que le grooming n'est pas fait | équipe |
