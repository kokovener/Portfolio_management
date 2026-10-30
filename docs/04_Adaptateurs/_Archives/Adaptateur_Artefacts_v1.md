# Adaptateur Artefacts v1 — blocs portfolio-feed

> Étape 3c · 2026-10-27 · Entrée : `Feeds_Inscrits_v1.md` · Code : `Projets_Dev\Portefeuille_PLQ\tools\adapt_artefacts.js` · Tests : `tests/test_adapt_artefacts.js` (25) · Exécution : `dist/runs/2026-10-27/` · Motifs : `Adaptateur_Artefacts_v1_Annexe_Motifs.md`

## 1. Chaîne d'exécution

| # | Étape | Outil · sortie |
|---|---|---|
| 1 | Lire chaque artefact `actif` du registre | `Artifact read` (`path: index.html`), jamais WebFetch → `artefacts_raw/<dossier>/index.html` + `read.json` (heure, version, sha256) |
| 2 | Lire la base (items, jalons, risques, attentes, livrables, dependances) et leurs versions | `ArtifactData list` → `art_base_before/` + `versions.json` |
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
| Périmètre | collections admises : items, jalons, risques, attentes, dependances, livrables ; tout `id` sous le préfixe inscrit ; jalon, risque, attente rattachés à un item du préfixe |
| Item attendu | présent dans le bloc s'il est inscrit |
| Santé | `sante` refusée (D8) |

## 3. Correspondance

| Bloc | Base | Règle |
|---|---|---|
| item, champs possédés (nom, type, parent, voie, etape, promu, priorite, responsable, fenetre, note_lundi, liens) | idem | à la création seulement ; écart signalé ; sauf `etape = termine` appliqué |
| item, autres champs (`updated_at` obligatoire, `pct_avancement`, `phase_source`, `contenu_sprint`, `support`) | idem | à chaque lecture ; ces 4 derniers absents du bloc = retirés (la vue calcule le % des jalons) |
| jalon · livrable | idem | remplacé ; `date_initiale` de la base gardée ; à défaut celle du bloc ; à défaut l'ancienne date si elle bouge ; recul signalé |
| risque | idem + `score` = P × I | remplacé |
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
| Feeds | 1 lu (Expert G1) · 1 en attente (architecte) |
| Écritures | 14 (1 item, 8 jalons, 2 risques, 3 attentes), épinglées v1 → v2 |
| Relance | données 14 / 14 identiques ; base relue = écrit 14 / 14 |
| Signaux | 3 : bloc daté 20h30, après la lecture de 18h50 · liens possédés divergents · livrable `feed.archi.adr-codes-taxes` conservé (feed architecte non branché) |
| Vue (navigateur, 27 oct. 18h57 EDT) | Expert G1 : « Source : Artefact … lu 27 oct. 18h50 · adaptateur-artefacts », progression 62,5 %, santé jaune |

## 6. Feed architecte (mécanisme prouvé sur jeu de test `tests/fixtures/archi_feed_test.html`)

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
| L1 | Feed architecte inexistant : bloc minimal à envoyer = `Projets_Dev\…\feeds\archi_portfolio-feed_gabarit.html` | Franck → Personne_09 |
| L2 | Lien « Architecture S1 » du feed non repris (champ possédé) | Franck : l'ajouter dans Gérer s'il est voulu |
| L3 | Lecture manuelle par Claude (`Artifact read`) : pas de lecture sans session | étape 4 (tâche du lundi) |
| L5 | Bloc Expert G1 daté 20h30 −04:00 pour une lecture à 18h50 : heure probablement UTC étiquetée EDT | Franck : corriger `lu_le` du bloc à la prochaine régénération du Gantt |
| L4 | Un artefact non possédé par Franck est lu en résumé isolé, sans HTML brut → bloc illisible | inscrire seulement des artefacts dont Franck est propriétaire ou éditeur |
