# Adaptateur Smartsheet v1 — Goutte21_Master

> Étape 3a · 2026-10-27 · Source : `Goutte21_Master` 230627583414148 (lecture seule) · Code : `Projets_Dev\Portefeuille_PLQ\tools\adapt_smartsheet.js` · Tests : `tests/test_adapt_smartsheet.js` (12) · Exécution : `dist/runs/2026-10-27/` · Motifs : `Adaptateur_Smartsheet_v1_Annexe_Motifs.md`

## 1. Chaîne d'exécution

| # | Étape | Outil |
|---|---|---|
| 1 | Lire les lignes au grain L (filtre à l'extraction) + 2 lignes témoins hors grain, puis l'historique des cellules % et Phase des L actifs | connecteur Smartsheet (`get_sheet_summary`, `get_cell_history`) → `smartsheet_raw.json` (24 lignes, pas l'export des 94) |
| 2 | Lire la base actuelle (items, risques) et leurs versions | `ArtifactData list` → `base_before/` + `versions.json` |
| 3 | Transformer, valider, préparer les écritures | `node tools/adapt_smartsheet.js` → `doc.json`, `batch.json`, `report.json` · `validate_model.py` |
| 4 | Écrire dans la base | `ArtifactData batch` (écritures épinglées par version) |

## 2. Champs lus et correspondance

| Smartsheet | Modèle | Règle |
|---|---|---|
| `ID` | `item.id` = `goutte21.<id minuscule>` · grain | L : `^L\d+(-L\d+)?$` · Sub-L : `^L\d+([A-Z]\|\.\d+)$` · le reste est ignoré |
| `ID` (préfixe) | `item.parent` | Sub-L → son L ; L → `goutte21` |
| `Nom` | `item.nom` = `<ID> <Nom>` | à la création seulement (champ possédé) |
| `Phase actuelle` | `item.phase_source` | Backlog, Done → non actif ; vide → actif + alerte « phase » |
| `% avancement` | `item.pct_avancement` | à chaque lecture |
| `Dernière MAJ`, sinon historique % / Phase | `item.updated_at` (EDT) | **écart au modèle §1** (date de ligne non exposée par le connecteur) ; une saisie Gérer ne la change pas (décision Franck) |
| `Top risque` | `risque.titre` | mis à jour si un risque Smartsheet existe ; sinon signalé (P·I à saisir) |
| `Niveau` | — | contrôle seulement : écart avec l'ID signalé |
| `Statut santé`, heures, coût, KPI, Notes hebdo, Valeur métier, Owner | — | non lus (D8, D15, champs possédés) |

## 3. Valeur lue à la source / valeur dans la base (3 lignes réelles, 2026-10-27 18h25 EDT)

| Ligne | Champ | Lu dans Smartsheet | Dans la base (ArtifactData) | Écart expliqué |
|---|---|---|---|---|
| L8D (mise à jour, v3) | Phase | (vide) | `phase_source` absent ; alerte « phase » | la valeur « AF / UX » de l'exemple étape 1 est corrigée |
| | % avancement | 3 | `pct_avancement` 3 | — |
| | Dernière modif. | % le 8 oct. 09h20 EDT | `updated_at` 8 oct. 09h20 EDT (v4) | la saisie du 27 oct. ne rajeunit plus l'item (décision Franck) |
| | Champs possédés | — | note « test note », priorité (valeur 5 · urgence 4 · effort 4), nom inchangés | non touchés |
| L6 (créée, v1) | Niveau / ID | Entité / L6 | item `goutte21.l6`, parent `goutte21` | grain lu par l'ID ; écart signalé |
| | Phase · % | A Revoir · 36 | `phase_source` A Revoir · `pct_avancement` 36 | — |
| | Dernière modif. | Phase le 8 juil. 14h35 EDT | `updated_at` 8 juil. 14h35 EDT | la vue en déduit l'alerte fraîcheur (111 j) |
| L0 (créée, v1) | Phase · % | Dev · 56 | `phase_source` Dev · `pct_avancement` 56 | — |
| | Dernière modif. | % le 8 oct. 09h29 EDT | `updated_at` 8 oct. 09h29 EDT | — |

## 4. Résultat de l'exécution

| Mesure | Valeur |
|---|---|
| Lignes au grain L | 22 lues (sur 94 dans la feuille) · 9 actives écrites · 13 non actives ignorées (Backlog, Done) · 2 témoins hors grain ignorés |
| Écritures | 9 items (7 créés, 2 mis à jour) · 1 risque relu (titre et P·I inchangés, `lu_le` rafraîchi) · base : 52 documents |
| Signaux | 4 phases vides (L0.1, L8, L8D, L8E) · 5 Niveau ≠ ID (L1, L2, L3-L4, L5, L6) · 1 Top risque sans P·I (L8B) |
| Items promus reliés à une ligne | 0 en réalité (aucun item promu n'est une ligne Smartsheet : Codes de taxes est saisi) · **réserve** : mécanisme `rowId=` prouvé sur jeu de test seulement |
| Vue | publiée v3 : 10 projets actifs, 8 alertes fraîcheur, 4 alertes phase |

## 5. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| S1 | Grain lu par l'ID, pas par la colonne `Niveau` |
| S2 | Fraîcheur = dernière modification des cellules % et Phase (pas de la ligne entière) |
| S3 | `etape`, `nom`, `parent` posés à la création seulement, sauf Done → étape Terminé sur un item existant |
| S4 | Top risque sans risque existant : signalé, pas créé (P·I non lus) |
| S5 | Item promu relié par un lien `rowId=<id>` dans ses liens (proposition modèle v2 : champ de référence source) |
| S6 | ~~tranché par Franck~~ → voir décision F1 ci-dessous |
| S7 | Exemple L8D corrigé par la source (phase « AF / UX » → vide) |
| S11 | Création : voie Scrum, type projet, non promu par défaut |
| S9 | Écart au modèle §1 (fraîcheur) : proposé pour le modèle v2 « date de ligne, sinon dernière modification des cellules % et Phase » |

## 6. Décisions de Franck (2026-10-27)

| # | Décision |
|---|---|
| F0 | Phase vide = L actif + alerte « phase » |
| F1 | Fraîcheur d'un item lu dans une source = source seule ; une saisie Gérer ne la remet pas à zéro (écart au modèle « source ou saisie » → modèle v2) |
