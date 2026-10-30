# Interface v0 · spécification v3 · Annexe motifs

> À n'ouvrir que pour rouvrir un choix. Un motif ne se supprime jamais : il se déplace.

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| I1 (A1) | Calcul à l'affichage | D8 « calculée, jamais déclarée » : une santé stockée vieillit entre deux lundis ; `core.js` est le même code que la tâche du lundi pourra exécuter | Afficher `item.sante` stockée | — |
| I2 (A2) | `set` du document complet | Les définitions de types `db` de la session étaient illisibles (chemin hors dossiers connectés) : `set` est le seul verbe dont la forme est sûre ; risque de perte d'écriture concurrente faible (1 éditeur, D3) | `update` par champ | Une API non vérifiée se code défensivement (lecture tolérante aux formes de snapshot) et se prouve sur l'artefact publié, pas sur une simulation |
| I3 (A3) | Pas de bouton supprimer | Règle projet : aucune suppression sans accord explicite ; la clôture garde l'historique | Supprimer avec confirmation | — |
| I4 (A4) | Admin voit Gérer | `canEdit()` = niveau admin ; la règle `db` owner refuse l'écriture (testé `as_level admin`) ; D20 prévoit le passage au niveau admin avec un 2e éditeur | Tester `isOwner()` (D20 dit `canEdit`) | — |
| I5 (A5) | Sans jours fériés | Aucune source de fériés dans le modèle ; écart ≤ 1 j par sprint | Liste codée en dur | — |
| I6 (A6) | Attentes hors charge | `attente.tiers` est un texte (« DBA », « Personne_09 ») ; le mapper à un rôle demande une table, à poser à l'étape 3 | Heuristique sur le texte | — |
| I7 (A7) | Charge non proratisée | Simple, explicable ; la carte affiche demande / capacité en j-p | Proratiser par jours dans la fenêtre | — |
| I8 (A8) | MEP passée non alertée | La règle étape 4 ne vise que les 7 j à venir ; le ledger a des MEP sans statut final | Alerte « MEP échue » (règle nouvelle → kickoff v2 si voulue) | — |
| I9 (A9) | Éléments de maquette retirés | D13 (CDP, auditeur en v1) · D15 (Import Excel, budget) · M11 / M20 (décisions hors v1) · M21 (budget) · « Et si » = conversation Claude ; sélecteur Santé retiré (D8) | — | — |
| I10 (A10) | Sans pagination | 45 documents ; vérifier la limite de page à l'étape 3 quand Smartsheet ajoutera les L | Paginer d'office | — |
| I11 | Base simulée pour les tests DOM | Le navigateur intégré n'était pas connecté à claude.ai ; jsdom + base simulée prouvent le rendu et le cycle saisie → relecture, pas l'API réelle | Relire le code | Un test qui cherche `h1` trouve d'abord l'en-tête : cibler l'élément de la vue, pas le premier du DOM |
| I12 | Validateur JS du même `schema.json` | M1 : un seul schéma ; le validateur Python ne tourne pas dans la page ; le JS est vérifié contre les 45 enregistrements et 6 cas négatifs | Validation champ par champ codée à la main | — |
| I13 | Dépôt git créé à l'étape 2 | Instruction du projet Cowork (« code généré dans Projets_Dev avec une gestion git obligatoire », hors CLAUDE.md) ; le dépôt n'existait pas après l'étape 1 | — | Le dossier `Projets_Dev` monté refuse les suppressions par défaut : git y laisse un `index.lock` orphelin ; demander le droit de suppression du dossier avant le premier `git init` |
| I15 | Relecture du 2026-10-27 (sous-agent) | Écarts retenus : réserve run absente de la charge 4 semaines (corrigé, test ajusté 17 j-p) ; condition « 3 vues » déclarée faite sur simulation (requalifiée) ; A11–A15 manquants ; lecture testée en `view` au lieu de `interact` (testé) ; source de la règle git (citée) | Écarts non retenus : format §2 / §3 dense (tient en deux écrans) | Une condition de fin prouvée sur simulation reste « à confirmer » tant qu'elle n'a pas tourné sur la cible |
| I16 (A11) | Dépendance sans clôture | Le modèle gelé n'a pas de statut sur `dependance` ; en ajouter un = v2 du modèle | Suppression depuis Gérer (règle suppression) | — |
| I17 (A12) | Provenance au grain champ déduite | M3 met la provenance à l'enregistrement ; le §3 du modèle dit quels champs sont saisis : la provenance d'un champ possédé est donc `saisie` | Champ `source` par champ (modèle v2) | — |
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
