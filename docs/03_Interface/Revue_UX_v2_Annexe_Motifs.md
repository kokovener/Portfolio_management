# Revue UX v2 — Annexe motifs et preuves

| ID | Principe | Preuve (29 oct., page v45) |
|---|---|---|
| U01 | Nielsen 6 (reconnaître plutôt que se rappeler) | Vue Projet défilée : onglets hors écran ; retour = remonter tout |
| U02 | Gestalt (bruit visuel), Nielsen 8 (minimalisme) | Bande ~60 px en tête de Portefeuille et Projet, recopiée dans « Items dans le sprint » |
| U03 | WCAG 1.4.1 (couleur seule), 1.4.11 (contraste non textuel ≥ 3:1) | Calcul : `--idle` #3f5a6a / #002536 = 2,19 ; #cfcfd6 / #fff = 1,55 ; `--warn` #d8932f / #fff = 2,58 ; `--ok` #5b9e5b = 3,24 (passe). ~8 % des hommes daltoniens rouge-vert |
| U04 | WCAG 1.4.3 (texte ≥ 4,5:1) | `--mute` #82828c / #fff = 3,8 ; page.html : 21× 12 px, 10× 11 px, 3× 10 px |
| U05 | Nielsen 2 (langage de l'utilisateur) | Fiche L8 : « 230627583414148/row/6026558968889220 · adaptateur-smartsheet » ; case « visible dans le portefeuille (R37) » |
| U06 | Nielsen 1 (visibilité de l'état) | En-tête : « Instantané 27 oct. 20h11 EDT · 5/5 sources OK · base lue 29 oct. 19h13 EDT » — « 5/5 OK » date de 2 jours |
| U07 | Responsive (artifact-design : 375 px sans défilement horizontal) | Vue Sprint 375 px : colonne « depuis » coupée, barre de défilement horizontale |
| U08 | Nielsen 4 (cohérence) — un chiffre contradictoire coûte la confiance dans tous les autres | Tuile 10 / entonnoir 12 ; entonnoir Terminé 0 / repli Terminés 2 ; MEP 5 / somme des « à venir » 0. Cause probable : périmètres différents (type, fenêtre 90 j, horizon) non dits. Libellé « 10 projets + 1 programme + 1 run » = exemple, à confirmer au code |
| U09 | Shneiderman (vue d'ensemble → filtre → détail) | Tuile « 4 alertes » : aucun lien vers les lignes concernées |
| U10 | Lisibilité | « L0 Plateform Génériq… », « Expert G1 — graphe de c… », « Run G2.1 — support ex… » à 800 px |
| U11 | Gestalt (proximité) | Expert G1 : 3 chevrons verts empilés sur la ligne du jour |
| U12 | Nielsen 8 | Alerte « bloqués » = 9 clés GOU21 en ligne |
| U13 | Pyramide inversée (le résumé d'abord) | Entonnoir sous MEP et support, ~2 écrans plus bas que les tuiles |
| U14 | Nielsen 1 ; question n° 1 d'un sponsor : « pourquoi rouge ? » | L8 : motif « risque 16 ≥ 15 » en 11 px gris dans la ligne source |
| U15 | Séparation lecture / écriture ; vue visiteur sans Gérer | Colonne droite = formulaire 12 champs ; « Sources » et « Historique » sous le bouton Enregistrer |
| U16 | Nielsen 6 | L8 : phase « déduite des enfants actifs » mais aucun enfant listé ; aller-retour par la grille |
| U17 | Affordance (Norman) | Barre d'étapes = mêmes boutons pleine largeur que des onglets |
| U18 | Scrum : objectif + temps restant = première lecture d'un sprint | En-tête S19 : dates seulement ; aujourd'hui J9 / 15 |
| U19 | Préattentif (longueur > nombre) | Personne_05 20 sous-tâches / 14,5 j ; aucun repère visuel |
| U20 | Nielsen 4 | Tuile 60 / 60 en or, 15 % en vert : aucun seuil franchi |
| U21 | Hiérarchie visuelle | 3 « fait » en tête avec bouton contour, 2 « à faire » en dessous |
| U22 | Gestalt (hiérarchie) | 9 lignes bloquées dont 4 sous-tâches au même gabarit |

## Écarts trouvés par la relecture au contexte neuf (cause réutilisable)

| ID | Écart | Cause |
|---|---|---|
| U02 | Légende dite « répétée sur Sprint » ; R16 rouvert sans le dire | Constat tiré de la capture sans relire les règles R16/R42 du code — relire les commentaires `// Rnn` avant de proposer |
| U03 | Vert / or attribués aux pastilles | Contraste calculé sur `--green`/`--gold` (tuiles) au lieu de `--ok`/`--warn` (pastilles) — mesurer la variable réellement rendue |
| U08 | Libellé « 10 + 1 programme + 1 run » faux (programmes exclus, 2 runs) ; causes non trouvées | Hypothèse écrite au lieu d'exécuter le calcul — compter sur la base (node) avant d'écrire un chiffre |
| U10, U11, U22 | Infobulle, fusion même jour, indentation déjà présentes | Revue visuelle seule — vérifier l'existant au code avant de proposer |
| U15, U21 | « permanent », « primaire » | Vocabulaire approximatif sur la capture — nommer l'état exact (`canEdit`, `btn ghost`) |

Preuves U08 (page.html) : tuile :429 · entonnoir :439 (fenêtre 90 j, l1/l2 mis à jour le 8 juil.) · repli Terminés :412 · horizon MEP :290/:416 vs « à venir » :419 ; MEP du 26 oct. encore `planifiee`.

## Écartés

| Option | Motif |
|---|---|
| Thème clair revu en entier | Hors périmètre : constats limités au contraste (U03, U04) |
| Graphe d'avancement (burndown) | Charge = sous-tâches Jira ; un burndown demande l'historique quotidien, non lu (règle Capacité) |
| « depuis auj. » sur les bloqués | Historique démarré le 29 oct. ; la durée se remplit seule aux passages suivants |
| Vue CDP / auditeur | Déjà écartée en spécification v1 (A9) |

## Écarts trouvés par la relecture d'implémentation au contexte neuf (29 oct., page v46 avant correctifs)

| ID | Écart | Cause | Suite |
|---|---|---|---|
| U15 | Fenêtre rouverte seule au retour de la vue visiteur | État d'interface ajouté sans l'inscrire dans les remises à zéro des changements de contexte | corrigé b4d0428 |
| U15 | Focus perdu (sortie de la fenêtre au Tab, pas de retour sur « Modifier ») | Rendu complet par innerHTML non adapté à un dialogue ; tests limités à ouvrir / fermer | corrigé b4d0428 |
| U09 | Chiffre de la tuile ≠ lignes filtrées | Tuile compte des jalons / alertes, filtre compte des items ; test sur le nombre de lignes seulement | libellé corrigé (A6) |
| U09 | Focus et état actif des tuiles non exposés | État rendu visuellement seulement | aria-pressed + focus, b4d0428 |
| U14 | Bandeau « vert » sur un item en alerte recul / phase | Bandeau tiré de la santé D8 seule, pas des alertes de l'item | corrigé b4d0428 |
| U05 | Test anti-jargon sur une seule vue ; « Gérer » resté dans des libellés | Critère d'acceptation posé sur un cas ; libellé non recherché partout après U15 | libellés corrigés 6d3f17b, b4d0428 |
| U19 | Seuil 1,5 × médiane non noté ; surbrillance non testée (une seule barre dans la fixture) | Ajustement fait sur données réelles sans trace ; donnée de test incapable d'atteindre le chemin | A5 ; test à enrichir |
| U22 | Deux comptes des bloqués (page vs alerte) | Règle de comptage changée dans la page sans la reporter au cœur | A8 (périmètre dit) |
| Tests | v1/v2 dépendent de la date du jour | Gel d'horloge limité à la nouvelle suite | reste à faire 3 |

## Causes payées pendant l'implémentation

| Cause | Règle réutilisable |
|---|---|
| U11 a cassé un test v1 qui comptait les losanges | Un regroupement visuel change les compteurs DOM : compter l'objet métier (badge), pas l'élément |
| Clé de bloqué chevauchant le titre (S19 réel) | Ajouter un contrôle dans une colonne de grille = élargir la colonne ; vérifier sur données réelles, pas seulement la fixture |
