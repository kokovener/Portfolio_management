# Interface · spécification v4 · Annexe motifs

> À n'ouvrir que pour rouvrir un choix. Un motif ne se supprime jamais : il se déplace.

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| I1 (A1) | Calcul à l'affichage | D8 « calculée, jamais déclarée » : une santé stockée vieillit entre deux lundis ; `core.js` est le même code que la tâche du lundi pourra exécuter | Afficher `item.sante` stockée | — |
| I2 (A2) | `set` du document complet | Les définitions de types `db` de la session étaient illisibles (chemin hors dossiers connectés) : `set` est le seul verbe dont la forme est sûre ; risque de perte d'écriture concurrente faible (1 éditeur, D3) | `update` par champ | Une API non vérifiée se code défensivement (lecture tolérante aux formes de snapshot) et se prouve sur l'artefact publié, pas sur une simulation |
| I3 (A3) | Pas de bouton supprimer | Règle projet : aucune suppression sans accord explicite ; la clôture garde l'historique | Supprimer avec confirmation | — |
| I4 (A4) | Admin voit Gérer | `canEdit()` = niveau admin ; la règle `db` owner refuse l'écriture (testé `as_level admin`) ; D20 prévoit le passage au niveau admin avec un 2e éditeur | Tester `isOwner()` (D20 dit `canEdit`) | — |
| I5 (A5) — retiré en v4, voir « Retiré de la v3 » | Sans jours fériés | Aucune source de fériés dans le modèle ; écart ≤ 1 j par sprint | Liste codée en dur | — |
| I6 (A6) — retiré en v4, voir « Retiré de la v3 » | Attentes hors charge | `attente.tiers` est un texte (« DBA », « Personne_09 ») ; le mapper à un rôle demande une table, à poser à l'étape 3 | Heuristique sur le texte | — |
| I7 (A7) — retiré en v4, voir « Retiré de la v3 » | Charge non proratisée | Simple, explicable ; la carte affiche demande / capacité en j-p | Proratiser par jours dans la fenêtre | — |
| I8 (A8) | MEP passée non alertée | La règle étape 4 ne vise que les 7 j à venir ; le ledger a des MEP sans statut final | Alerte « MEP échue » (règle nouvelle → kickoff v2 si voulue) | — |
| I9 (A9) | Éléments de maquette retirés | D13 (CDP, auditeur en v1) · D15 (Import Excel, budget) · M11 / M20 (décisions hors v1) · M21 (budget) · « Et si » = conversation Claude ; sélecteur Santé retiré (D8) | — | — |
| I10 (A10) | Sans pagination | (27 oct.) 45 documents ; vérifier la limite de page à l'étape 3 quand Smartsheet ajoutera les L | Paginer d'office | — |
| I11 | Base simulée pour les tests DOM | Le navigateur intégré n'était pas connecté à claude.ai ; jsdom + base simulée prouvent le rendu et le cycle saisie → relecture, pas l'API réelle | Relire le code | Un test qui cherche `h1` trouve d'abord l'en-tête : cibler l'élément de la vue, pas le premier du DOM |
| I12 | Validateur JS du même `schema.json` | M1 : un seul schéma ; le validateur Python ne tourne pas dans la page ; le JS est vérifié contre les 45 enregistrements de la base semée du 27 oct. et 6 cas négatifs | Validation champ par champ codée à la main | — |
| I13 | Dépôt git créé à l'étape 2 | Instruction du projet Cowork (« code généré dans Projets_Dev avec une gestion git obligatoire », hors CLAUDE.md) ; le dépôt n'existait pas après l'étape 1 | — | Le dossier `Projets_Dev` monté refuse les suppressions par défaut : git y laisse un `index.lock` orphelin ; demander le droit de suppression du dossier avant le premier `git init` |
| I15 | Relecture du 2026-10-27 (sous-agent) | Écarts retenus : réserve run absente de la charge 4 semaines (corrigé, test ajusté 17 j-p) ; condition « 3 vues » déclarée faite sur simulation (requalifiée) ; A11–A15 manquants ; lecture testée en `view` au lieu de `interact` (testé) ; source de la règle git (citée) | Écarts non retenus : format §2 / §3 dense (tient en deux écrans) | Une condition de fin prouvée sur simulation reste « à confirmer » tant qu'elle n'a pas tourné sur la cible |
| I16 (A11) | Dépendance sans clôture | Le modèle gelé n'a pas de statut sur `dependance` ; en ajouter un = v2 du modèle | Suppression depuis Gérer (règle suppression) | — |
| I17 (A12) — remplacé en v4 par la règle « Provenance » | Provenance au grain champ déduite | M3 met la provenance à l'enregistrement ; le §3 du modèle dit quels champs sont saisis : la provenance d'un champ possédé est donc `saisie` | Champ `source` par champ (modèle v2) | — |
| I14 | Écart de rendu assumé | Couleurs du design system PLQ reprises des maquettes ; thème sombre ajouté (contrat artefact) ; icônes Lucide non chargées (aucune nécessaire) | Charger la feuille du design system (CDN non autorisé) | — |

## v2 (2026-10-30) — Gantt du projet

| # | Choix | Motif | Options écartées |
|---|---|---|---|
| I-G1 | Carte en bas de la fiche, pleine largeur | Demande de Franck (« en bas de l'écran projet ») ; 14 semaines × 43 lignes ne tiennent pas dans la colonne principale | Onglet séparé · colonne latérale |
| I-G2 | Couleur par groupe (rôle), rouge réservé au chemin critique | Le drawio colore par rôle ; le rouge porte déjà « rouge = alerte » dans la page | Couleurs du drawio telles quelles (hors design system) |
| I-G3 | Défilement horizontal, 64 px minimum par semaine | Lisibilité au jour près sans écraser les libellés | Ajuster à la largeur (barres d'un jour illisibles) |

## Interface-v3 (2026-10-30, checkpoint après deux sessions parallèles)

| # | Décision | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| v3 | Spécification portée en v3 pour décrire l'interface MEP de la page v49 | La v2 (Gantt) et la page v49 (MEP) ont été produites le même matin par deux sessions parallèles : la spec v2 a été figée à 11h37 EDT, avant les commits MEP (12h00), et pointait le modèle v16 archivé | Laisser la spec en retard sur la page | **Cause réutilisable : deux sessions qui versionnent les mêmes documents en parallèle laissent passer les documents qu'aucune des deux ne croit posséder ; au checkpoint, comparer chaque `_vN` modifié du jour avec les commits postérieurs à son heure.** |

## Interface-v4 (2026-11-03, réécriture d'après le code de la page v58)

| # | Décision | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| v4 | Spec réécrite depuis `interface/page.html` et `core.js` (commit `69757e3`), puis relue au contexte neuf | La v3 décrivait la page v49 ; les itérations R37–R61, la revue UX et le checkpoint de partage (lots A et B) ont changé les vues sans nouvelle version de la spec | Corriger v3 en place (règle : un document vivant ne s'édite pas, il se versionne) | **La présentation d'équipe du 3 nov. a affiché « Charge par rôle sur 4 semaines », carte retirée de la page, parce qu'elle a été écrite d'après la spec v3. Cause réutilisable : une spec qui n'est pas versionnée quand une vue change de contenu devient une source fausse ; décrire l'outil d'après le code, et produire `_vN+1` de la spec au même commit qu'un changement de vue.** |
| v4-T | Tests comptés en relançant `tests/run_all.sh` (30 suites vertes) plutôt que repris du checkpoint | Règle projet : essayer les commandes plutôt que relire le texte | Recopier « 32/32 » du checkpoint | Premier lancement : 6 suites en échec à cause de `jsonschema` 3.2 dans le shell ; avec ≥ 4.18 (exigé en tête de `run_all.sh`) : 0 échec. **Cause réutilisable : vérifier les prérequis écrits en tête du script avant de lire un échec comme une régression.** |

### Retiré de la v3 (déplacé ici, jamais supprimé)

| Élément v3 | Cause du retrait |
|---|---|
| §2 Portefeuille : « charge par rôle 4 sem. » ; Sprint : « WIP par personne », « Gérer équipe » ; §3 « Projet · Charge flux » (WIP ou ETP), « Sprint · Équipe » (limite WIP, absence collective) | Kickoff D7 v2 (28 oct., Franck R23 R24 R28) : volet flux et WIP saisi abandonnés ; charge = sous-tâches Jira par personne ; absences collectives = fériés (config) et fermetures (calendrier de Franck), plus saisies |
| A5 Jours fériés non retirés | Remplacé : fériés du Québec et fermetures retirés des jours ouvrés (Kickoff D7 v3, modèle v11, étape 2f) |
| A6 Attente hors charge · A7 Charge 4 semaines non proratisée · A14 ETP → j-p · A15 Charge flux limitée à la voie flux | Sans objet : la carte et la saisie de charge qu'ils réglaient n'existent plus (D7 v2) |
| A13 Idée / Qualifié gris, fraîcheur sur Actif et Planifié | Intégré à la règle « Santé » du §4 v4 (+ terminé jamais rouge, checkpoint du 3 nov.) |
| §1 Base « 13 collections, semée par `build_seed.js` (5 exemples, 45 enregistrements) » ; Tests « `test_core.js` (13), `test_page_dom.js` (13) » | État du 27 oct. ; base réelle de 17 collections depuis le modèle v15 ; tests regroupés dans `run_all.sh` |
| §8 MEP : sources lues dans l'ordre calendrier « Calendar - MEP » > Jira GOU21 > courriels > Teams « 05 - Déploiements » > ledger ; en-tête des MEP = sources lues et leur état ; signaux `mep_non_recoupee`, `mep_saisie_doublon`, `courriels_partiels`, `sources_mep_absentes` | Détail d'adaptateur, déjà porté par Kickoff D18 v8 et `04_Adaptateurs/Adaptateur_Jira_v12.md` ; la spec garde la saisie (§3) |
| §7 Gantt : provenance « Fichier : SharePoint · lu le … · fichier du … · plan calculé le … (orange au-delà de 5 j o.) » ; test `test_page_dom_gantt.js` sur le Gantt réel Méthane P2 | Détail de rendu inchangé, résumé au §5 v4 |

### Nouveaux choix v4 et relecture

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| I18 (A16) | Badge de fraîcheur daté par la source principale du bloc | Écart constaté : « Jira lu il y a 4 j » alors que Jira avait été lu la veille, la date venait d'Outlook ; « à relire » reste levé par toute source en retard (`05_Pilotage/2026-11/Checkpoint_Partage_2026-11-03.md`) | La plus ancienne des entrées (R36) | — |
| I19 (A17) | Terminé = vert, sans motif | Même périmètre que l'alerte de fraîcheur (actif, planifié) | Rouge de fraîcheur sur un item terminé | — |
| I20 (A18) | Barres par rôle de la carte Capacité décrites telles que codées | Le code les affiche encore (`page.html`, `sv.roles`, charges en jours-personne) ; D7 v2 a abandonné la charge par rôle : le retrait est un choix de Franck, pas de la spec | Les omettre (spec fausse) · les retirer du code sans accord | — |
| I21 | A8 devient la règle « MEP passée encore planifiée » du §4 | La grille montre le cas en rouge : « pas d'alerte » seul induisait en erreur | — | — |
| I22 | A12 remplacé par la règle « Provenance » | Relecture : le code ne pose aucune provenance par champ ; un item lu garde sa `source` (`Object.assign`), `saisie` seulement à la création | Garder A12 (déduction du modèle, non implémentée) | **Cause réutilisable : un arbitrage déduit du modèle s'écrit comme règle seulement après l'avoir retrouvé dans le code.** |
| I23 | F1 rangée dans les règles du §4 | Décision de Franck, pas un arbitrage pris sans lui | — | — |
| I24 | Relecture au contexte neuf du 3 nov. : 23 écarts, tous traités | Causes dominantes : résumé fait sur les titres des cartes et non leur contenu ; vue propriétaire prise pour la vue d'équipe ; contenus visibles déplacés à tort en annexe (MEP de la grille) ; règle inférée des données du jour (3 sprints → 3 onglets) | — | **Cause réutilisable : décrire une vue en lisant le gabarit de chaque carte en entier, dans les deux vues (propriétaire, lecteur).** |

### Conditions de fin de l'étape 2 (v3 §5, déplacées)

| Condition | Preuve | État |
|---|---|---|
| 3 vues avec les exemples | artefact publié v2, navigateur, 2026-10-27 18h10 EDT : Portefeuille, Projet L8D, Sprint S19 rendus sur la base réelle | fait |
| Règles `db` | `as_level admin` et `interact` : écriture refusée · `view` et `interact` : lecture OK | fait |
| Saisie Gérer → ArtifactData → vue après rechargement | note du lundi L8D « test note » (supprimée le 3 nov. avec l'accord de Franck) ; `items/goutte21.l8d` version 2, `updated_at` 18h06 EDT | fait |
