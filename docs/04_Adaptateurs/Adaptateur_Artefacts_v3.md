# Adaptateur Artefacts v3 — blocs portfolio-feed et roadmap de l'architecte

> Étape 3c · 2026-10-27 · Entrée : `Feeds_Inscrits_v2.md` · Code : `Projets_Dev\Portefeuille_PLQ\tools\adapt_artefacts.js` · Tests : `tests/test_adapt_artefacts.js` (25) + `tests/test_feed_gantt.js` (4) · Exécutions : `dist/runs/2026-10-27/` · v3 `dist/runs/2026-11-02/archi/` (dont `registre_complet/`) · Motifs : `Adaptateur_Artefacts_v3_Annexe_Motifs.md` · **v2 2026-10-30 : collection `gantts` admise (Kickoff D22 v7), test `tests/test_feed_gantt.js` (3), outil producteur `feeds/expertg1_gantt.js`** · **v3 2026-11-02 : format `programme-1.0` (roadmap de l'architecte lue telle que livrée, Kickoff D12 v10) — traducteur `tools/feed_programme.js`, axes `config/archi_axes.json`, tests `tests/test_feed_programme.js` (6)**

## 1. Chaîne d'exécution

| # | Étape | Outil · sortie |
|---|---|---|
| 1 | Lire chaque artefact `actif` du registre | `Artifact read` (`path: index.html`), jamais WebFetch → `artefacts_raw/<dossier>/index.html` + `read.json` (heure, version, sha256) |
| 2 | Lire la base (items, jalons, risques, attentes, livrables, dependances, **gantts**) et leurs versions | `ArtifactData list` → `art_base_before/` + `versions.json` |
| 3 | Extraire, valider, transformer | `node tools/adapt_artefacts.js <registre> <raw> <base> <out> <schema.json>` → `doc.json`, `batch.json`, `report.json` |
| 4 | Valider | `validate_model.py` appelé par l'adaptateur (bloc + base) ; validateur qui ne tourne pas = arrêt |
| 5 | Écrire | `ArtifactData batch` : épinglé (`if_version`) sur tout document existant, sans version à la création ; la vue lit la base, pas de republication |
| 6 | Prouver la relance | relecture de la base → nouvelle exécution → données de `art_out_rerun/` identiques (seules les versions d'épinglage changent) |

## 2. Contrat du bloc (sinon : feed ignoré en entier, signalé, rien d'écrit)

| Contrôle | Règle |
|---|---|
| Présence | exactement un `<script type="application/json" id="portfolio-feed">` |
| Forme | JSON lisible ; valide au schéma v1 ; références résolues dans le bloc ou la base |
| Origine | `source.systeme = artefact` et `source.ref` = URL inscrite |
| Périmètre | collections admises : items, jalons, risques, attentes, dependances, livrables, **gantts (v2)** ; tout `id` sous le préfixe inscrit ; jalon, risque, attente, gantt rattachés à un item du préfixe |
| Item attendu | présent dans le bloc s'il est inscrit |
| Santé | `sante` refusée (D8) |

## 2 bis. Format `programme-1.0` (v3, roadmap de l'architecte)

| Contrôle | Règle |
|---|---|
| Présence | exactement un `<script type="application/json" id="donnees-programme">` ; `version_schema` = 1.0 ; `date_donnees` AAAA-MM-JJ |
| Tâche | id unique, projet et tâche non vides, dates AAAA-MM-JJ, début ≤ fin, statut ∈ a_faire · en_cours · termine · fait ; sinon feed ignoré en entier |
| Projets | deux noms qui donnent le même identifiant = feed ignoré |
| Ensuite | traduit en document canonique, puis mêmes contrôles qu'un bloc portfolio-feed (§2) |

## 3 bis. Correspondance `programme-1.0`

| Roadmap de l'architecte | Base | Règle |
|---|---|---|
| (bloc entier) | item `feed.archi` (programme « Roadmap de l'architecte », voie flux, responsable = propriétaire inscrit) | fenêtre, % et étape calculés sur toutes les tâches |
| `projet` | item `feed.archi.<nom normalisé>` (projet, parent `feed.archi`) | étape : actif si une tâche a commencé, planifié sinon, terminé si tout est fait ; étape et fenêtre suivent la source à chaque lecture (signal `archi_etape`), les autres champs possédés à la création seulement ; % = moyenne des tâches pondérée par les jours ouvrés |
| `tache` | jalon `feed.archi.<id en minuscules>` « Fin <id> · <tâche> » | date = `fin_prevue`, date initiale = `fin_initiale` (la base garde la 1re) ; a_faire → a_venir, en_cours → en_cours, termine/fait → fait (`fait_le` vide : le format n'a pas de fin réelle) ; id unique sans tenir compte de la casse |
| tâche ou dépendance absente de la lecture | supprimée (règle **K14**, accord permanent de Franck du 2 nov.) | `delete` marqué `purge: K14`, jalons et dépendances `feed.archi.*` seulement ; signal `archi_supprime` ; feed ignoré = rien supprimé |
| `depend_de` | dépendance `feed.archi.dep-<préd>-<tâche>`, type bloque, jalon → jalon | préd. absent de la roadmap : signal `archi_dependance`, rien d'écrit |
| tâches | Gantt `feed.archi.gantt` (affichage) : onglets « Horizon engagé » / « Au carnet » (commentaire « au carnet »), un groupe par projet | barres prévues ; l'initial reste visible par la date initiale des jalons |
| `risque_principal` | — | non repris (aucune probabilité ni impact) |
| `lot` | — | doit commencer par l'axe du préfixe (`config/archi_axes.json` ; « Domaine métier » couvre « Domaine métier : modules… ») ; écart : signal `archi_axe` |
| incohérences (statut contraire aux dates, % sur « à faire », fin passée non terminée) | — | signal `archi_incoherence`, jamais corrigé |
| `changements_semaine` | — | signal `archi_changement` (digest, en tête) seulement si `date_donnees` a changé depuis la lecture précédente |
| tâche ou projet apparu après la 1re lecture | créé | signal `archi_nouveau` |

## 3. Correspondance

| Bloc | Base | Règle |
|---|---|---|
| item, champs possédés (nom, type, parent, voie, etape, promu, priorite, responsable, fenetre, note_lundi, liens) | idem | à la création seulement ; écart signalé ; sauf `etape = termine` appliqué |
| item, autres champs (`updated_at` obligatoire, `pct_avancement`, `phase_source`, `contenu_sprint`, `support`) | idem | à chaque lecture ; ces 4 derniers absents du bloc = retirés (la vue calcule le % des jalons) |
| jalon · livrable | idem | remplacé ; `date_initiale` de la base gardée ; à défaut celle du bloc ; à défaut l'ancienne date si elle bouge ; recul signalé |
| risque | idem + `score` = P × I | remplacé |
| gantt (v2) | idem (un seul, id `<préfixe>.gantt`) | remplacé à chaque lecture ; affichage seulement, aucun jalon tiré de ses lignes · item ayant déjà un autre Gantt : non écrit (`gantt_double`) · ligne Gantt plus ancienne que le bloc : `gantt_perime` · ligne jalon du Gantt ≠ jalon du bloc de même nom : `gantt_jalon_ecart` |
| attente · dependance | idem | remplacé |
| tout enregistrement | `source` = artefact · URL + date du bloc · heure de lecture · `adaptateur-artefacts` | — |
| enregistrement en base absent de la lecture, ou feed ignoré / en attente | inchangé | conservé et signalé, jamais supprimé |
| enregistrement du préfixe tenu en base par une autre source (ex. saisie) | inchangé | jamais écrasé ; conflit signalé |

## 4. Valeur lue à la source / valeur dans la base (3 lignes réelles, lecture 27 oct. 18h50 EDT, Gantt S1 version 1793141174-6134)

| Ligne | Champ | Lu dans le bloc | Dans la base (ArtifactData) |
|---|---|---|---|
| Item `feed.expertg1` (v2) | Fraîcheur | `updated_at` 27 oct. 18h14 | 27 oct. 18h14 (avant : 07h00, valeur semée) |
| | Liens | 2 (Gantt S1, Architecture S1) | 1 (Gantt S1) — champ possédé, écart signalé |
| | Avancement · santé | absents | `pct_avancement` retiré → vue : 62,5 % = 5 faits / 8 ; `sante` semée retirée → vue : jaune calculée (risque 12) |
| Jalon `feed.expertg1.pilote-doc` (v2) | Date · statut | 4 nov. · a_venir | 4 nov. · a_venir (avant : en_cours, valeur semée) |
| Risque `feed.expertg1.r1` (v2) | P · I · score | 4 · 3 · — | 4 · 3 · `score` 12 calculé |

## 5. Résultat

| Mesure | Valeur |
|---|---|
| Feeds | 1 lu (Expert G1) · 1 en attente (architecte, actif depuis la v3) |
| Écritures | 14 (1 item, 8 jalons, 2 risques, 3 attentes), épinglées v1 → v2 |
| Relance | données 14 / 14 identiques ; base relue = écrit 14 / 14 |
| Signaux | 3 : bloc daté 20h30, après la lecture de 18h50 · liens possédés divergents · livrable `feed.archi.adr-codes-taxes` conservé (feed architecte non branché) |
| Vue (navigateur, 27 oct. 18h57 EDT) | Expert G1 : « Source : Artefact … lu 27 oct. 18h50 · adaptateur-artefacts », progression 62,5 %, santé jaune |

## 5 bis. Lecture réelle v2 (30 oct. 11h45 EDT, Expert G1 version 1793374476-25db)

| Mesure | Valeur |
|---|---|
| Écritures | 30 : 1 item, 20 jalons (11 nouveaux), 5 risques, 3 attentes, 1 gantt (7 groupes, 80 lignes) |
| Signaux | 2 : liens possédés divergents · livrable architecte conservé |
| Vue | fiche Expert G1 : carte « Gantt du projet », lignes faites estompées |

## 5 ter. Lecture réelle v3 (2 nov. 14h25 EST, roadmap version 1793638598-e9d5, sha256 3efdb1dd…)

| Mesure | Valeur |
|---|---|
| Écritures | 56 : 15 items (1 programme, 14 projets), 38 jalons, 2 dépendances, 1 Gantt (27 + 11 lignes) · + 1 dépendance saisie `dep.archi-methane-alimente-p2` |
| Relance | données identiques (`out` = `out_rerun`) · registre complet à blanc (Expert G1 + architecte) : 86 écritures, 12 signaux |
| Signaux | 12 : 11 `archi_incoherence`, 1 `archi_changement` ; `archi_axe` 0 (lot = axe 38/38) |
| Digest (simulé sur la base du 2 nov.) | + 2 jalons dépassés (Filtre et Recherche : SC-02 30 oct., SC-24 2 oct.) ; alerte de recul « ADR codes de taxes » disparue |
| Supprimé (accord de Franck, 2 nov.) | livrable semé `feed.archi.adr-codes-taxes` (sans source ; les bloquants d'architecture sont des sous-tâches Jira du sprint) |

## 6. Feed architecte (mécanisme prouvé sur jeu de test `tests/fixtures/archi_feed_test.html`, avant la v3)

| Lecture | Livrable ADR codes de taxes | Effet sur Codes de taxes |
|---|---|---|
| 1 : ADR au 14 nov. | créé, sans date initiale | dépendance `bloque` résolue, aucune alerte |
| 2 : ADR au 28 nov. | date 28 nov., initiale 14 nov. gardée, recul signalé | alerte « reculé → jalon Décision CDP en alerte » |
| Dépendance portée par le feed | `feed.archi.dep-…` admise ; `dep.…` ou cible inconnue → feed ignoré | — |
| Base réelle (livrable semé : 28 nov., initiale 14 nov.) | 1re lecture réelle : initiale 14 nov. gardée (A5) | alerte déjà présente, maintenue |

## 7. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| A1 | Registre : une ligne = URL · item attendu · préfixe · propriétaire · statut (actif / en_attente) |
| A2 | Un feed n'écrit que sous son préfixe, y compris ses dépendances (`feed.archi.dep-…`, pas `dep.…`) |
| A3 | Bloc invalide sur un seul enregistrement = feed ignoré en entier |
| A4 | Champs possédés de l'item : création seulement, écart signalé (comme S3) |
| A5 | `date_initiale` : la base prime sur le bloc |
| A6 | `source.lu_le` = heure de lecture ; date du bloc dans `source.ref` |
| A7 | Valeurs semées à l'étape 2 (`sante`, `pct_avancement`, statut pilote-doc) remplacées par la source |
| A8 | Validateur qui ne tourne pas = arrêt de l'adaptateur, jamais un feed accepté |
| A9 | Jalon, risque, attente d'un feed rattachés à ses propres items seulement |
| A10 | Enregistrement du préfixe repris par une autre source : le feed ne l'écrase pas |
| A11 | Dépendances de Codes de taxes gardées dans Gérer ; le bloc architecte n'expose que des livrables |

## 8. Écarts au modèle gelé (proposition v2)

| # | Écart | Proposition |
|---|---|---|
| E5 | Id de dépendance `dep.…` (modèle §1) vs préfixe du feed (A2) | préfixe = origine aussi pour les dépendances |
| E6 | Aucun champ pour la date du bloc lu | `source.emis_le` |

## 9. Limites et décisions à prendre

| # | Point | Qui |
|---|---|---|
| L1 | ~~Feed architecte inexistant~~ — clos v3 : roadmap lue telle que livrée (programme-1.0) | — |
| L2 | Lien « Architecture S1 » du feed non repris (champ possédé) | Franck : l'ajouter dans Gérer s'il est voulu |
| L3 | Lecture manuelle par Claude (`Artifact read`) : pas de lecture sans session | étape 4 (tâche du lundi) |
| L5 | Bloc Expert G1 daté 20h30 −04:00 pour une lecture à 18h50 : heure probablement UTC étiquetée EDT | Franck : corriger `lu_le` du bloc à la prochaine régénération du Gantt |
| L4 | ~~Artefact non possédé illisible~~ — clos v3 : `Artifact read` avec `path: index.html` rend le HTML brut d'un artefact partagé ; seul le résumé sans path est isolé (et dit à tort « JSON absent ») | — |
| L6 | Un projet renommé par l'architecte = nouvel item, l'ancien conservé et signalé (`conserve`) | Franck : masquer l'ancien dans Gérer |
| L7 | Les 11 incohérences reviennent chaque lundi tant que la roadmap ne change pas | Franck → Luc |
| L8 | Fraîcheur des 15 items = `date_donnees` de Luc : sans republication pendant 15 j o., les 15 passent au rouge (une ligne d'alerte) | voulu : une roadmap non republiée est périmée (A26) |
| L9 | Projet renommé : la dépendance saisie `dep.archi-methane-alimente-p2` pointe l'ancien item | Franck : la refaire dans Gérer |
| L10 | Modèle v17 cite encore le livrable ADR « feed à brancher » (exemples §4, livrable) : collection `livrables` sans producteur | à la prochaine version du modèle |
