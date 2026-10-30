# Adaptateur Gantt v1 — Gantt de projet (drawio ou JSON)

> 2026-10-30 · Modèle v15 · Entrée : `Gantts_Inscrits_v1.md` · Code : `Projets_Dev\Portefeuille_PLQ\tools\adapt_gantt.js` · Tests : `tests/test_adapt_gantt.js` (10) · `tests/test_page_dom_gantt.js` (5) · Contrat JSON : `feeds/gantt_json_gabarit.json` · Motifs : `Adaptateur_Gantt_v1_Annexe_Motifs.md`

## 1. Chaîne d'exécution

| # | Étape | Outil · sortie |
|---|---|---|
| 1 | Lire chaque ligne `actif` du registre | `.json` : connecteur Microsoft 365 `read_resource` (URI `file:///…` du registre) · `.drawio` : navigateur intégré (session SharePoint de Franck), `fetch` de `…/_api/web/GetFileByServerRelativeUrl('<chemin>')/$value` ; métadonnées `TimeLastModified`, `ETag` |
| 2 | Transcrire le fichier octet pour octet | `raw/<fichier>` + `raw/read.json` {read_at, gantts {<item> {fichier, format, web_url, modifie_le, sha256}}} ; sha256 calculé dans le navigateur, revérifié par l'adaptateur |
| 3 | Exporter la base | `ArtifactData list` items, jalons, gantts → `base/` + `versions.json` |
| 4 | Adapter et valider | `node tools/adapt_gantt.js <registre> raw base out schema.json` → `doc.json`, `batch.json`, `report.json` ; `validate_model.py` appelé, fail closed |
| 5 | Écrire | `ArtifactData batch` (épinglé sur l'existant) ; puis `cadence.js lecture gantt …` |

## 2. Règles

| Règle | Énoncé |
|---|---|
| Inchangé | Même sha256 que le `gantt` en base : 0 écriture (jalons compris) |
| Transcription | sha256 absent de `read.json` ou ≠ du fichier : Gantt ignoré, base gardée · `modifie_le` lu tel quel (Z compris), converti en heure du Québec par l'adaptateur · format ∉ {drawio, json} : ignoré |
| drawio (PLQ-Forge) | En-têtes « S<n> · <jour> <mois> » consécutifs (lundis, année déduite de la date du fichier) ; colonnes « Tâche » et « Réf. » ; 5 jours ouvrés par semaine ; une ligne = libellé + barre(s) |
| Dates | Toute date doit exister au calendrier (le schéma ne vérifie que la forme) |
| Refus | Barre hors de la grille des jours, ligne sans barre, barre sans ligne, en-tête non consécutif : Gantt refusé, jamais deviné |
| Tâche | ref, nom (préfixe « ref — » retiré), début, fin (dernier jour inclus), segments si plusieurs barres, `critique` = contour rouge épais |
| Jalon | drawio : ligne sans réf., dans un groupe « validation / mise en production / jalon », ≤ 5 j o. · JSON : `"jalon": true` et ≤ 5 j o. (sinon Gantt refusé) · id `<item>.gantt.<onglet>.<réf. ou nom>`, date = fin, statut `a_venir` ; `fait` (JSON) : `fait_le` = fin, jamais après le jour de lecture |
| Recul | `date_initiale` de la base gardée ; date plus tardive = signal `recul` (et alerte ≥ 5 j o. dans la page) |
| Conservation | Jalon du Gantt en base absent de la lecture (ligne renommée ou retirée) : conservé, signal prioritaire `jalon_disparu`, jamais supprimé ; jalon du même id tenu par une autre source : jamais écrasé |
| Plan ancien | Repère « aujourd'hui » du drawio (ou `calcule_le` JSON) > 5 j o. avant la date du fichier : signal `plan_ancien` · page : étiquette orange quand le plan a > 5 j o. au jour de l'affichage |
| Fenêtre | Bornes du Gantt ≠ `fenetre` de l'item : signal (champ possédé, corrigé dans Gérer) |

## 3. Valeur lue à la source / valeur dans la base (Méthane P2, lecture 30 oct. 10h16 EDT)

| Ligne du drawio | Lu (pixels) | En base |
|---|---|---|
| S0 · 5 oct. (x 470, 140 px) · P2-AN1 (x 722, 28 px) | semaine 1, jour 4, 1 jour | P2-AN1 : 16 oct. → 16 oct. 2026 |
| P2-DEP (x 2206, 140 px) | S12 jour 2 → S13 jour 1 | 30 déc. 2026 → 5 janv. 2027 |
| Mise en production après acceptation (x 2402, 28 px) | S13 jour 4 | jalon `…phase-ii.mise-en-production-apres-acceptation` 8 janv. 2027 |
| Repère « aujourd'hui » (x 679) | S1 jour 2 | `calcule_le` 2026-10-14 → signal `plan_ancien` |

## 4. Limites

| # | Limite | Qui |
|---|---|---|
| L1 | `.drawio` illisible par le connecteur Microsoft 365 (type octet) : lecture par le navigateur intégré, donc session SharePoint ouverte dans l'app | Franck → producteur : déposer aussi le `.json` (contrat `gantt_json_gabarit.json`) |
| L2 | Un drawio ne dit pas qu'un jalon est fait : un jalon passé reste « dépassé » jusqu'à un nouveau Gantt | producteur (JSON `fait`) |
| L3 | Libellés coupés (« … ») dans le drawio : repris tels quels | producteur |
| L5 | Ligne jalon sans réf. renommée = nouvel id, date initiale perdue ; l'ancien jalon reste et passera « dépassé » | producteur (réf. stable sur les jalons) · Franck (clore dans Gérer) |
| L4 | Un autre générateur de drawio que PLQ-Forge = refus probable (contrat de mise en page) | JSON |
