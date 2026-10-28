# Adaptateur Miro v1 — actions de rétro

> Étape 3e · 2026-10-27 · Entrée : dernier board « Rétro G2.1 S<N> » (gabarit skill `retro-sprint-g21`, lecture seule) · Code : `Projets_Dev\Portefeuille_PLQ\tools\adapt_miro.js` · Tests : `node tests/test_adapt_miro.js dist/runs/2026-10-27/miro_raw.json` (10) + `test_core.js` (15) · Exécution : `dist/runs/2026-10-27/` · Motifs : `Adaptateur_Miro_v1_Annexe_Motifs.md`

## 1. Chaîne d'exécution

| # | Étape | Outil · sortie |
|---|---|---|
| 1 | Trouver le dernier board de rétro | `board_search_boards` « Rétro G2.1 » → plus grand S<N> |
| 2 | Lire le cadre Actions | `canvas_search` (overview) → `canvas_read_as_svg` sur le cadre → SVG enregistré tel quel (`miro_frame.svg`) + `miro_raw.json` (heure, recherche, board) ; l'adaptateur lit le SVG |
| 3 | Lire la base (actions_retro, sprints) | `ArtifactData list` → `miro_base_before/` + `versions.json` |
| 4 | Transformer et valider | `node tools/adapt_miro.js <miro_raw> <base> <out> <schema.json>` ; refuse : cadre lu sur un board plus ancien, deux boards pour le même sprint, cadre autre qu'« Actions », sprint S<N+1> absent de la base ; `validate_model.py` fermé par défaut |
| 5 | Écrire | `ArtifactData batch` épinglé ; aucune écriture si seule l'heure de lecture change |
| 6 | Prouver la relance | base relue → nouvelle exécution → 0 écriture |

## 2. Correspondance

| Board (cadre Actions) | Base `actions_retro` | Règle |
|---|---|---|
| carte « Action N », ligne « Quoi » | `texte` | carte au « Quoi » vide (gabarit) ignorée |
| post-it du cadre | `texte` ; `owner` = @mention | — |
| ligne « Responsable(s) » (avec ou sans « : ») | `owner` (texte tel quel) | vide = omis, signalé ; changement signalé |
| ligne « Échéance » | `source.ref` | formats : 23 Oct · 23 octobre · 1er nov · Oct 23 · 23/10 · AAAA-MM-JJ · S<N> (= fin du sprint) ; année la plus proche du début du sprint ; vide ou illisible = signalé ; passée et statut ≠ fait = signalé |
| ligne « Statut : … » ou ligne seule ✅ / 🔄 / ⏳ | `statut` (« pas fait » = a_faire ; « bloqué » = en_cours + signal) | sinon statut déjà en base ; sinon `a_faire` |
| board « Rétro G2.1 S<N> » (variantes « - S19 », « G21 », « Goutte 2.1 » ; copies ignorées) | `sprint` = `jira.gou21-s<N+1>` ; `board` = URL | — |
| widget Miro | `id` = `miro.retro-s<N>.<id widget>` | stable tant que la carte n'est pas recréée |
| action en base absente de la lecture | inchangée | conservée, signalée, jamais supprimée |

## 3. Valeur lue à la source / valeur dans la base (3 lignes réelles, lecture 27 oct. 19h38 EDT)

| Carte | Lu sur le board | Dans la base (ArtifactData, v1) |
|---|---|---|
| Action 1 | Quoi « Mise en place Bitbucket cloud pour test » · Responsable : Franck · Échéance : 23 Oct | texte idem · owner « Franck » · `a_faire` · S19 · échéance passée signalée |
| Action 3 | Quoi « Rencontre pour repasser les règles de validation des critères d'acceptions… » · Responsable David / Alain / Franck · Échéance (vide) | texte idem · owner « David / Alain / Franck » · `a_faire` · S19 · sans échéance signalée |
| Action 4 | Quoi « Alertes pour les déploiements » · Responsable (vide) · Échéance (vide) | texte idem · sans owner · `a_faire` · S19 · 2 signaux |

## 4. Résultat

| Mesure | Valeur |
|---|---|
| Lu | board « Rétro G2.1 S18 » (seul board de rétro trouvé ; confirmé par Franck le 27 oct. : son lien d'invitation redirige vers uXjVEYiDVMw=, contenu inchangé à la relecture) · cadre « 8. Actions » · 20 éléments (21 avec le cadre) · 5 cartes remplies |
| Écritures | 5 actions créées (v1) |
| Relance | 0 écriture sur la base relue ; base relue = écrit 5 / 5 |
| Signaux | 5 : échéances passées (Action 1 23 oct., Action 2 21 oct.) · sans échéance (Actions 3, 4) · sans responsable (Action 4) ; Action 5 « S19 » = 6 nov., non passée |
| Ce que l'écriture touche | carte « Actions de la rétro · Miro » de la vue Sprint : actions du sprint + actions ouvertes des sprints antérieurs (comparaison numérique des sprints, correction de `core.js`, artefact v7) ; S19 et S20 montrent les 5 ; une action `fait` ne reste que dans son sprint |
| Vue (navigateur) | 19h41 EDT, v6 : Sprint S19, 5 actions « a faire » avec leur responsable · v7 : Sprint S20, les 5 reportées |

## 5. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| M1 | Le gabarit ne porte ni statut, ni tag, ni couleur de statut : `a_faire` par défaut ; un statut posé ensuite (skill `maj-actions-retro`) est gardé |
| M2 | Marqueurs de statut reconnus pour la suite : « Statut : … », ✅, 🔄 / ⏳ |
| M3 | Owner = texte de la carte, pas un id de personne (le modèle a `owner` en texte ; plusieurs noms possibles) |
| M4 | Échéance dans `source.ref` (pas de champ au modèle) |
| M5 | Cadre réel « 8. Actions » (le prompt dit « Actions du sprint suivant ») : reconnu par « Actions » sauf « Actions de la rétro » |
| M6 | Pastilles de vote (dot voting) non lues : votes, pas statut |
| M8 | Sprint S<N+1> absent de la base : arrêt, rien écrit (une action sans sprint connu flotterait dans toutes les vues) |
| M9 | Actions ouvertes reportées dans les sprints suivants ; faites, visibles dans leur sprint seulement |
| M7 | Aucun statut déduit d'une autre source (ex. canaux Teams créés le 20 oct. pour l'Action 2) : signalé, à trancher en séance |

## 6. Écarts au modèle gelé (proposition v2)

| # | Écart | Proposition |
|---|---|---|
| E9 | Pas de champ d'échéance pour une action | `action_retro.echeance` (date ou sprint) |
| E10 | `owner` texte libre, non relié à `personnes` | `owner` = liste d'ids `team.*` |

## 7. Limites et décisions à prendre

| # | Point | Qui |
|---|---|---|
| L1 | Statut illisible sur le gabarit actuel : sans marqueur, tout reste `a_faire` | Franck : ajouter « Statut : » aux cartouches du gabarit (skill retro-sprint-g21) ou statuer via `maj-actions-retro` |
| L2 | Actions 1 et 2 à échéance passée (Bitbucket cloud, équipe Teams) | Franck / équipe : statuer |
| L3 | Le prochain board (S19) n'existe pas encore : à la lecture suivante, les actions S18 restent en base, signalées « non relues » | `maj-actions-retro` (étape 4) |
| L4 | Carte recréée ou board copié = nouvel id ; l'ancienne reste en base et apparaît en double dans la vue tant qu'elle est ouverte | accepté, signalé « non relue » ; Franck la passe à fait |
| L5 | Lecture par Claude (2 appels Miro) ; SVG recopié depuis le résultat de l'outil | étape 4 |
