# Adaptateur Smartsheet v3 — Goutte21_Master + Jalons_Entites

> Atelier R06 · 2026-10-28 · **v3 (2e partie) : prévu au mois + 4 gates** · Source : `Goutte21_Master` 230627583414148 (lecture seule) · Code : `Projets_Dev\Portefeuille_PLQ\tools\adapt_smartsheet.js` · Tests : `tests/test_adapt_smartsheet.js` (20, données réelles du 28 oct.) · Exécution : `dist/runs/2026-10-28/r06/` · Modèle : v4 · Motifs : `Adaptateur_Smartsheet_v3_Annexe_Motifs.md` · v1, v2 archivées

## 1. Chaîne d'exécution

| # | Étape | Outil |
|---|---|---|
| 1 | Lire **toutes** les lignes (94) : ID, Nom, Niveau, `Portefeuille`, Phase actuelle, Trimestre cible, **Début prévu, Fin prévue**, % avancement, Notes hebdo, Top risque, Dernière MAJ | `get_sheet_summary` sans filtre, `isSampled` = false obligatoire |
| 1b | Jalons_Entites (2733930749841284) : lignes BA-3, AC-4, QA-2, QA-3 des entités au portefeuille (cochées ou reliées) — case, **Date prévue**, Date check | `get_sheet_summary` filtre `ID Entité` IN (…) |
| 2 | Historique des cellules % et Phase des lignes qui deviennent items (L/Sub-L actifs ou déjà en base, lignes cochées, lignes reliées) | `get_cell_history` (≤ 30 / min) |
| 3 | Lire la base (items, risques) et leurs versions | `ArtifactData list` → `base/` + `versions.json` |
| 4 | Transformer, valider | `node tools/adapt_smartsheet.js` → `doc.json`, `batch.json`, `report.json` · `validate_model.py` |
| 5 | Écrire | `ArtifactData batch` épinglé |

## 2. Règles

| Règle | Énoncé |
|---|---|
| Grain | L et Sub-L par l'ID (`^L\d+(-L\d+)?$`, `^L\d+([A-Z]\|\.\d+)$`) + toute ligne cochée `Portefeuille` (item promu, D4) ; Unit, WBS, entité non cochées : ignorées |
| Parent structurel | Par l'ID : `L8D1.1.2 → L8D1.1 → L8D1 → L8D → L8` ; `L0.1 → L0` ; `L3-L4` → programme |
| Parent d'un item | Plus proche ancêtre qui est lui-même au portefeuille ; aucun → `goutte21` |
| Phase vide | Déduite des enfants : la moins avancée des enfants actifs (BA < AF / UX < Archi / Coordo / Confo < Dev < QA < MEP ; enfants directs seulement) ; sinon tous Done → Done ; sinon Backlog ; sinon A Revoir · `phase_deduite = true` |
| Étape | Done → terminé · Backlog, **A Revoir** → qualifié · phase active → actif (planifié conservé) |
| Création | Seulement si étape actif, ou ligne cochée `Portefeuille` |
| Item saisi relié | Lien `rowId=<id>` dans `liens` : % et phase rafraîchis, parent = structure de la feuille, jamais de doublon même si la ligne est cochée |
| Fraîcheur | `Dernière MAJ` si remplie, sinon dernière modif. des cellules % et Phase (F1 : source seule) |
| Fenêtre prévue (v3) | Début prévu → 1er du mois ; Fin prévue → dernier jour du mois ; vide = fenêtre Gérer gardée ; fin < début = ignorée + signal |
| Gates (v3) | `<item>.<gate>` ; date = dernier jour du mois de Date prévue (`precision` mois), sinon Date check si cochée ; cochée = fait, `fait_le` = Date check (absent = signal) ; `date_initiale` = 1re date vue ; sans date = pas de jalon, un signal par item |
| Inchangé v1 | Champs possédés gardés · Top risque sans P·I signalé · Niveau ≠ ID signalé · jamais de `sante` · jamais d'écriture Smartsheet |

## 3. Lu à la source / écrit en base (réel, 28 oct. 15h10 EDT)

| Ligne | Lu dans Smartsheet | Dans la base (v. après) | Avant |
|---|---|---|---|
| L3-L4 · L5 · L6 | A Revoir · 55 / 50 / 36 % · modif. 8 juil. | étape **qualifié**, phase A Revoir (v3) | actif, rouge fraîcheur 112 j |
| L8D | Phase vide ; L8D1 = Dev | phase **Dev (déduite)**, actif (v7) | sans phase, alerte « phase » |
| L8 | Phase vide ; L8D Dev (déduite), L8B BA, autres Backlog | phase **BA (déduite)** (v4) | sans phase, alerte |
| L0.1 | Phase vide ; 10 entités Dev / AF / UX | phase **AF / UX (déduite)** (v3) | sans phase, alerte |
| L8E | Phase vide ; 3 Units Backlog | phase Backlog (déduite), étape **qualifié** (v3) | actif, alerte |
| L8D1.1.2 Codes de taxes | AF / UX · 56 % · % modif. 8 oct. | `saisie.codes-taxes` relié : phase AF / UX, 56 %, parent **L8D** (v4) | parent programme, sans % ni phase |

## 3b. État du prévu au 28 oct. (après création des colonnes)

| Source | Lu | Effet |
|---|---|---|
| Master `Début prévu` / `Fin prévue` | vides (colonnes créées 28 oct.) | aucune fenêtre prévue ; Gantt : réel Jira seulement |
| Jalons_Entites `Date prévue` (L8D1.1.2, L8D1.1.3) | vides ; BA-3 et AC-4 cochés, `Date check` vide | aucun jalon créé ; signal « BA-3, AC-4, QA-2, QA-3 sans Date prévue » par livrable |

## 4. Résultat de l'exécution

| Mesure | Valeur |
|---|---|
| Lignes | 94 lues · 22 au grain L/Sub-L · 0 cochée (colonne absente) · 1 item saisi relié |
| Écritures | 11 (10 items, 1 risque) · lot atomique accepté |
| Signaux | 4 phases déduites · 4 changements d'étape · 5 Niveau ≠ ID · 1 parent remonté (codes de taxes) · 1 Top risque sans P·I (L8B) · **0 alerte « phase »** |
| Page | republiée v15 : « (déduite) » après la phase, groupe « Candidats et en pause » |

## 5. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| S12 | Promotion d'une ligne sous le grain = colonne case à cocher `Portefeuille` dans la feuille (et non lecture de toutes les entités) |
| S13 | Parent d'un item relié ou coché = structure de la feuille, recalculé à chaque lecture (écart à S3 pour ces items seulement) |
| S14 | L'étape des items Smartsheet suit la phase (écart à S3 : l'étape n'était posée qu'à la création) |
| S15 | Backlog sur un item déjà en base → qualifié (même traitement que A Revoir) |
| S22 | Colonnes de date créées vides par Claude (accord Franck) ; Franck les remplit |
| S23 | Une gate cochée sans Date prévue prend Date check comme date ; sans les deux : pas de jalon |
| S16 | Codes de taxes relié à L8D1.1.2 par un lien `rowId=` posé en base par Claude (même geste que T7) |

## 6. Décisions de Franck

| # | Décision |
|---|---|
| F0 | Phase vide = actif + alerte « phase » — **restreinte** : ne s'applique plus qu'à une phase non déductible (R06) |
| F1 | Fraîcheur = source seule |
| F12 | « A Revoir » = en pause, hors actif (R06, 28 oct.) |
| F13 | Phase d'une ligne parent vide = déduite des enfants (R06, 28 oct.) |
| F15 | Jalon portefeuille = 4 gates BA-3, AC-4, QA-2, QA-3 ; prévu dans le Master (fenêtre) + Jalons_Entites (gates) ; au mois |
| F14 | Le défaut de structure (codes de taxes, L8D1.1.3) se corrige dans la feuille, pas dans le portefeuille (R06, 28 oct.) |
