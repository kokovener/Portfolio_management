# Retours itération 3 — 2026-10-29

Une ligne par retour. Écran = où tu l'as vu (Portefeuille · Projet · Sprint · Gérer · digest · Teams). Prio : M (bloquant) · S (à faire) · C (confort) — vide = Claude propose.
Laisse vides les colonnes Impact et Statut : Claude les remplit au tri. Une capture vaut mieux qu'un long constat.
Contexte : page v34, modèle v10, → **clôture 29 oct. : page v41, modèle v14, Kickoff v4 ; R37–R45 tous faits** ; cadence 3 tâches (lundi 7 h · quotidien 9 h · jeudi 13 h). Itération 2 : `Retours_Iteration2_2026-10-28.md` (R15–R36, tous faits).

| ID | Écran / zone | Constat (ce que je vois) | Attendu (ce que je veux) | Prio | Impact (Claude) | Statut (Claude) |
|---|---|---|---|---|---|---|
| R37 | projet / gestion du projet | | ajoputer une case a cocher qui permet de rendre le projet visible ou pas dns le portefeuille. par defaut la case est cohcé a oui. si la cse n'Est pas coché, selement moi avec mes droits peut le voir | S | Page + modèle v13 (`item.visible`) + digest ; écart D20 (masquage, pas un droit) — Franck 29 oct. : « bruit, masquer suffit », pas de confidentialité | **fait 29 oct.** (page v37, Kickoff v3, modèle v13) : case « visible », item + descendants + leurs enregistrements filtrés (vue visiteur, digest) ; testé sur Expert G1 puis réaffiché (document identique) |
| R38 | tout | | ajouté un bouton qui me permet de passer du mode vue admin (moi) au mode vue visiteur| S | Page seule (bascule propriétaire → rendu visiteur, `canEdit` simulé) | **fait 29 oct.** (page v37) : bouton « Vue visiteur » / « Revenir en vue propriétaire » ; testé : sans Gérer, sans poignées, item masqué absent |
| R39 | Projet / artifact | lien artifact non clicable | rendre le lien clicable| M | Page : « Source : https://… » affichée en texte, pas en lien | **fait 29 oct.** (page v35) : URL web des provenances cliquable (source, % avancement, phase, support, sprint) ; clic testé : Gantt S1 d'Expert G1 s'ouvre |
| R40 | Sprint / action retro | pas de posibilité de dire si une action est faite | me donner la possibilité de mettre une actio a faite ou a rouvrir | S | Page + modèle v12 (`action_retro.statut` saisissable), adaptateur Miro inchangé | **fait 29 oct.** (page v36, modèle v12) : boutons Faite / Rouvrir (propriétaire) ; aller-retour testé sur « Alertes pour les déploiements », statut seul écrit, source Miro gardée |
| R41 | sprint | absence | comment trouves tu les absences de l'équipe ? vois tu les jours férié dans outlook ? | M | Donnée fausse : aucun férié compté (absent d'Outlook, saisie collective retirée en v8) → capacité S23 surestimée ; config fériés + modèle v11 + Outlook | **fait 29 oct.** : 3 fériés en base (25 déc., 1er janv., 26 mars), S23 15 → 13 j/personne ; modèle v11, fiche Outlook v3, tâche lundi v12 (étape 2f) ; page v35 publiée |
| R42 | Sprint | | Sprint Pas le cartouche rouge orange vert en haut, mettre la legende avec le cartouche item dans le sprint  | C | Page : légende retirée de l'en-tête en vue Sprint, posée dans la carte « Items dans le sprint » | **fait 29 oct.** (page v38) : vue Sprint sans légende en tête ; légende compacte en bas de « Items dans le sprint » ; Portefeuille et Projet inchangés |
| R43 | Portefeuille / support extranets | « = » à côté des ouverts : on ne sait pas ce que c'est | comprendre la tendance (conversation 29 oct.) | M | Donnée trompeuse : tendance vs la veille depuis R36, pas vs le lundi ; modèle v14, fiche Jira v9, page | **fait 29 oct.** (page v39) : tendance vs le lundi (`lundis`, `tendance_vs`), colonnes ouverts · plus vieux · vs lundi (« stable » au lieu de « = ») |
| R44 | Portefeuille / Alertes | 11 alertes dont 7 « fraîcheur » Smartsheet et 4 lignes pour un seul recul | Franck : OK recommandations ; fraîcheur 15 j ouvrés (sprint de 3 sem.) ; bloqués du sprint seulement, clés seules | S | Kickoff D8 v4, modèle v14, core, digest, page | **fait 29 oct.** (page v39) : fraîcheur Smartsheet ou Jira > 15 j o. (pastille et liste), regroupée par parent ; chaîne de recul ; risques ≥ 15, attentes > 5 j o., bloqués du sprint ajoutés ; 11 → 4 alertes au 29 oct. |
| R45 | Portefeuille / ligne des sprints | deux petits cartouches « o » et « d » vers le 25 déc. et le 1er janv. | comprendre / lisible (conversation 29 oct., Franck : « essaye ») | C | Page seule | **fait 29 oct.** (page v41) : férié d'un jour = bande verticale dorée sur toute la grille, détail au survol ; fermeture de plusieurs jours = barre avec libellé (jours consécutifs fusionnés) |
| R46 | | | | | | |

## Limites ouvertes reprises de l'itération 2

| # | Limite | Suite proposée |
|---|---|---|
| K9 | Item saisi auquel on ajoute `rowId=` : modifiable dans Gérer jusqu'au lundi suivant | acceptée |
| K10 | Ligne Smartsheet reliée devenue introuvable : étape et voie figées, un signal seulement | à traiter si le cas arrive |
| K11 | Passage de 9 h sans contrôle de fin du daily briefing : ledger possiblement incomplet ce jour-là | à surveiller |
| K15 | R37 : vue visiteur et digest recalculent cascade, santé, dépendances et charge sans l'item masqué (un parent peut y paraître vert) | acceptée (masquer = retirer le bruit) |
| K16 | Tests `test_lundi.js`, `test_page_dom.js` v1 et `test_adapt_artefacts.js` en échec : données vivantes passées en argument, et R44 (type `dependance` fondu dans `recul`) | **réparé au checkpoint du 29 oct.** (commit ab6c096, `tests/run_all.sh` : 16 suites, 0 échec) |
| K17 | Jours ouvrés de la fraîcheur, du recul et des attentes ne retirent pas les fériés (capacité oui) : alerte possible 1–2 j plus tôt aux Fêtes | acceptée |
| K18 | Pastille jaune possible par un bloqué Jira de plus de 5 j o. hors sprint actif, sans ligne dans la liste (motif au survol) | acceptée ; à revoir si gênant |
| K14 | Attente Jira datée du 1er jour vu bloqué (29 oct. pour les 12 actuelles) | lire la date de passage à « Bloqué » si utile |

## Lots

| Ordre | Lot | Retours | Contenu |
|---|---|---|---|
| 1 | A · données fausses | R41 | fériés et congés collectifs comptés dans la capacité |
| 2 | A · données fausses | R39 | lien source cliquable (artefact, Smartsheet) |
| 3 | B · ajouts | R40 | action de rétro : faite / rouverte depuis la page |
| 4 | C · visibilité | R37 + R38 | item masqué + bascule vue visiteur (R38 sert de test à R37) |
| 5 | D · design | R42 | légende santé dans la carte Items du sprint |
| 6 | A · données fausses | R43 | tendance du support vs le lundi |
| 7 | B · ajouts | R44 | alertes groupées et complètes |
| 8 | D · design | R45 | fériés lisibles sur la grille |

## Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| T18 | Prio remplie par Claude (règle T11) : M = donnée fausse ou lien cassé ; S = ajout demandé ; C = design |
| T19 | Aucun retrait dans cette itération : ordre T12 = données fausses → ajouts → design |
| T20 | Modèle : v11 = R41, v12 = R40 (règles seules) ; R37 = v13 (un modèle par retour validé, plus simple à rouvrir) |
| T21 | R41 : Outlook ne porte aucun férié (recherches « férié », « Noël » au 31 janv. 2027, « Fermeture » au 7 mai 2027 : 0 événement) → source = fichier versionné `config/feries.json`, pas Outlook |
| T22 | R41 : fermetures PLQ = événements du calendrier de Franck dont le sujet commence par « Fermeture » ou « Férié » (pas toute journée entière : ses congés personnels compteraient pour l'équipe) ; lus chaque lundi |
| T23 | R41 : Vendredi saint retenu, lundi de Pâques non (choix de l'employeur) ; à ajouter au calendrier si le bureau ferme |
| T24 | R39 : une référence Smartsheet (`sheet/row/id`) n'est pas une URL : reste du texte ; le bouton de lien de l'item porte déjà l'URL de la ligne |
| T25 | Documents créés dans cette session et jamais diffusés (modèle v13, Kickoff v3, tâche lundi v12) corrigés en place après la relecture au contexte neuf, sans vN+1 |
| T26 | Relecture : 21 écarts, 0 M ; corrigés : fériés pluriels, report du dimanche (24 juin, 1er juillet), signal « config courte » et « Fêtes sans fermeture », test de `publicBase`, kickoff D7 D11 D19, historique du modèle déplacé en annexe, `modele` 1 → 13 dans le schéma |
| T27 | R44 : même règle de fraîcheur pour la pastille (D8) et la liste, sinon pastille rouge sans alerte |
| T28 | R44 : activité Jira = tickets des épopées de l'item (ou d'un descendant) dans le sprint lu par Jira data, datée par la lecture (le brut n'a pas la date `updated` des tickets) |
| T29 | R44 : attentes lues dans Jira (statut Bloqué) exclues de la ligne « attente » : ce sont les bloqués, déjà listés par clé |
| T30 | R43 : référence de la semaine du 26 oct. = lecture du jeudi 29 ; la page compare au vrai lundi dès le mardi 3 nov. ; le digest lundi→lundi dès le 9 nov. |
| T31 | Relecture R43/R44 : 2 M corrigés (cycle de dépendances qui effaçait les deux reculs ; extranet nouveau affiché « stable » au lieu de ↑) ; textes alignés (modèle, schéma, fiche Jira, annexe Kickoff, F1 rouvert noté) |
