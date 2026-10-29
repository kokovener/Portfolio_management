# Atelier R06 — Goutte 2.1 dans Smartsheet v2

> 2026-10-28 · Franck + Claude · Sources lues en direct : `Goutte21_Master` 230627583414148 (94 lignes), `Jalons_Entites` 2733930749841284 (1 064 lignes), Jira GOU21 (board 38) · Motifs : `Atelier_R06_Smartsheet_v2_Annexe_Motifs.md` · Fiches : `Adaptateur_Smartsheet_v3.md`, `Adaptateur_Jira_v3.md` · Modèle v4 · v2 = 2e partie (jalons, prévu vs réel) ; v1 archivée · preuves non transcrites ailleurs : `Projets_Dev\…\dist\runs\2026-10-28\r06c\constats.json`

## 1. Écarts constatés

| # | Ligne | Constat | Cause |
|---|---|---|---|
| E1 | L3-L4 · L5 · L6 | « A Revoir » affiché actif et rouge (112 j) | Adaptateur : A Revoir lu comme actif |
| E2–E5 | L8D · L0.1 · L8 · L8E | Phase vide sur les lignes parents → alerte « phase » | Structure : phase non remontée |
| E3 | Codes de taxes | Existe (L8D1.1.2) mais item saisi orphelin | Adaptateur (entités jamais lues) |
| E7 | L1 · L2 · L3-L4 · L5 · L6 | `Niveau` = Entité, ID = L | Saisie |
| E8 | Goutte 2.1 | Aucun jalon venu d'une source : `Jalon prochain` vide (94/94), 5 jalons en base tous saisis à la main | Aucune colonne de date prévue lue |
| E9 | Jalons_Entites | `Date check` vide sur 1 064 / 1 064 lignes : fait oui/non, jamais quand | Saisie (colonne jamais remplie) |
| E10 | Jira | Épopée GOU21-9199 sans date de début, d'échéance ni fixVersion | Saisie Jira |
| E11 | Jalons_Entites | Dev-1 = case à poids variable (30, 10) au lieu de « 40 % proportionnel Jira » (v7) | Saisie ; écart au modèle Jalons_Binaires_v7 |
| E12 | Jira → portefeuille | Épopée GOU21-9604 « Gestion des grilles de taxes » rattachée à L8D | Arbitrage Claude T7 (lot 2) non revu après la promotion de L8D1.1.3 |

## 2. Décisions de Franck

| # | Décision |
|---|---|
| F12 | « A Revoir » = en pause, hors actif |
| F13 | Phase vide d'un parent = la moins avancée des enfants actifs |
| F14 | Le défaut de structure se corrige dans la feuille |
| F15 | Jalon portefeuille = 4 gates par livrable : BA-3 scope figé · AC-4 GO Dev · QA-2 UAT · QA-3 MEP |
| F16 | Prévu dans Smartsheet : fenêtre dans le Master, date des gates dans Jalons_Entites ; précision au mois |
| F17 | % Dev calculé depuis Jira en tickets, pas en points (tout n'est pas estimé au début) — écart déclaré à Jalons_Binaires_v7 (« points livrés / planifiés ») : le portefeuille l'affiche à côté du % Smartsheet, la feuille n'est pas changée |
| F18 | Suppression accordée : 12 charges et 1 statistique L8D périmées, jalon saisi « Gate AC-4 » de L8D |

## 3. Changements

| # | Où | Changement | Statut |
|---|---|---|---|
| C1 | Feuille | Colonne `Portefeuille` + L8D1.1.3 cochée | Fait (Claude, accord Franck) |
| C2 | Feuille | `Niveau` = L sur 5 L | Fait (Claude, accord Franck) |
| C3–C5 | Adaptateur Smartsheet v2 | Pause · phase déduite · lignes cochées | Fait |
| C6 | Feuille | Colonnes `Début prévu`, `Fin prévue` (Master) et `Date prévue` (Jalons_Entites), vides | Fait (Claude, accord Franck) |
| C7 | Adaptateur Smartsheet v3 | Fenêtre prévue au mois ; 4 gates → jalons (prévu = Date prévue, réel = Date check) | Fait |
| C8 | Adaptateur Jira v3 | Réel = sprints des tickets des épopées ; garde-fou « périmètre qui grossit » | Fait |
| C9 | Modèle v4 + page v17 | Gantt : barre claire = prévu, trait foncé = réel (rouge si dépasse) ; cascade aux parents ; « Jira n % tickets » sur chaque ligne qui a une épopée | Fait |
| C11 | Base | Épopée GOU21-9604 déplacée de L8D vers Grilles de taxes ; 13 enregistrements L8D périmés et la gate saisie AC-4 supprimés (F18) | Fait |
| C10 | Tâche du lundi v4 | Lit les nouvelles colonnes, les gates et le calendrier des sprints | Fait |

## 4. Résultat (base écrite le 28 oct. 16h30 EDT)

| Ligne | Prévu | Réel Jira |
|---|---|---|
| Codes de taxes | à saisir | 28 juil. → en cours, planifié jusqu'au 27 nov. (S15 → S20) · 32 tickets ouverts |
| Grilles de taxes | à saisir | 18 août → en cours (épopée GOU21-9604, S16 → S19) · 34 tickets ouverts hors sprint |
| L8D | à saisir (sinon cascade des livrables) | 28 juil. → en cours (cascade de ses 2 livrables ; pas d'épopée propre) |
| L0 | à saisir | 8 déc. 2025 → en cours, planifié jusqu'au 18 déc. 2026 (S6 → S21) |
| Gates | aucune (Date prévue vide) | BA-3 et AC-4 cochés pour les 2 livrables, sans Date check |

## 5. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| A1 | Promotion = case `Portefeuille` ; critère : la ligne a sa propre épopée Jira (Grilles : GOU21-9604) |
| A2–A4 | Backlog = pause · étape et parent suivent la feuille · codes de taxes relié par lien |
| A8 | Date prévue saisie au mois → jalon au dernier jour du mois (pas de faux retard en cours de mois) |
| A9 | Réel d'un parent = union de son épopée et de ses livrables |
| A10 | Sprint futur non daté dans Jira = lundi suivant + durée du sprint actif |
| A11 | Gate cochée sans Date prévue → date = Date check ; sans les deux : pas de jalon, un signal |

## 6. Suite

| # | Quoi | Qui | Quand |
|---|---|---|---|
| S4 | Confirmer la phase de L8D1 (Dev alors que ses entités sont AF / UX) | Franck | avant le 2 nov. |
| S5 | Saisir au mois : `Début prévu` / `Fin prévue` (Goutte21_Master) de L0, L8D, L8D1.1.2 codes de taxes, L8D1.1.3 grilles ; `Date prévue` (Jalons_Entites) des lignes BA-3, AC-4, QA-2, QA-3 de L8D1.1.2 et L8D1.1.3 | Franck | avant le 2 nov. |
| S6 | Remplir `Date check` en cochant une gate (règle d'équipe, mercredi) | Équipe G2.1 | dès maintenant |
| S7 | Vérifier le 2 nov. : barres prévu / réel et gates dans le digest | Claude (tâche du lundi) | 2 nov. |
