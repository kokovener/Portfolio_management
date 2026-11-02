# Retours itération 5 — 2026-11-02 (fiche projet et Gantt)

Une ligne par retour. Prio : M (bloquant) · S (à faire) · C (confort). Impact et Statut remplis par Claude.
Contexte : page v52 (commit 0fef1d3), roadmap de l'architecte lue telle que livrée (Kickoff v10). Captures du 2 nov. (fiche Goutte 2.1 vide, Gantt du programme de l'architecte, jalons d'un projet de l'architecte).
Numérotation : R49–R50 déjà pris (coché = toujours item) → ce lot commence à R51.

| ID | Écran / zone | Constat (ce que je vois) | Attendu (ce que je veux) | Prio | Impact (Claude) | Statut (Claude) |
|---|---|---|---|---|---|---|
| R51 | Projet / Jalons | « 19 nov. », « 25 oct. » sans année ; la roadmap va jusqu'en 2029 (IN-04 « à venir » au 25 oct. = 2029, vu à l'affichage v53) | Année affichée sur chaque date de jalon | S | Page seule | livré v53 (32eab34) |
| R52 | Projet / Gantt | Gantt seulement sur la fiche du programme | Sous-projet : la partie du Gantt du programme qui le concerne | S | Page seule (groupe du Gantt = nom du projet, sinon réf. des jalons) | livré v53 (32eab34) |
| R53 | Projet / Gantt | Au défilement horizontal, la colonne des titres disparaît | Colonne des titres figée | S | Page seule (CSS) | livré v53 (32eab34) |
| R54 | Projet / Gantt | Aucun chemin du sous-projet vers le Gantt global | Lien « Gantt du programme » à côté du titre, ouvre la fiche du programme sur son Gantt | S | Page seule | livré v53 (32eab34) |
| R55 | Projet / Jalons · MEP · Risques · Attentes | Quatre cartes pleine largeur, même vides | Proposition de Claude (voir Arbitrages) | S | Page seule | livré v53 (32eab34) |
| R56 | Programme Goutte 2.1 | Pas de Gantt global G2.1 ; donc rien à montrer dans les L | Gantt du programme G2.1 calculé depuis les livraisons (prévu Smartsheet, réel Jira, jalons) ; même lien et même extrait dans les L | S | Page seule (calcul à l'affichage, rien en base) | livré v53 (32eab34) |

## Arbitrages (Claude, sans Franck)

| # | Arbitrage |
|---|---|
| A1 | R51 : année aussi sur Prochain jalon, bandeau santé, Prévu / Réel, MEP, attentes et infobulles du Gantt (même ambiguïté) |
| A2 | R52 : extrait = groupes du Gantt portant le nom du projet (ou d'un descendant), sinon tâches dont la réf. = un jalon du projet ; axe resserré sur l'extrait |
| A3 | R53 : le Gantt s'ouvre centré sur aujourd'hui (au quart gauche) |
| A4 | R54 : lien « Gantt du programme › » sur tout extrait ; ouvre la fiche du programme sur son Gantt (Retour du navigateur = sous-projet) |
| A5 | R55 : sections repliables (▾, mémorisées par visiteur) ; vides regroupées sur une ligne « Rien de rattaché » ; Risques et Attentes passent dans la colonne de droite ; consigne Jalons Goutte 2.1 gardée (propriétaire) |
| A6 | R56 : Gantt G2.1 calculé à l'affichage, jamais écrit en base : un groupe par L active, barre = prévu (Smartsheet, cascade), trait = réel Jira (pointillé = en cours), losanges = jalons propres ; idées / qualifiés exclus, non datés listés sous le Gantt |
| A7 | Tests : la carte MEP vide n'existe plus (test U15 adapté) ; nouvelle vérif. DOM R51–R56 dans `test_page_dom_gantt.js` ; 27 suites vertes |
