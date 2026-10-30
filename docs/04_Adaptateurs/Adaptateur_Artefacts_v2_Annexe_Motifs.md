# Adaptateur Artefacts v2 · Annexe motifs

> À n'ouvrir que pour rouvrir un choix. Un motif ne se supprime jamais : il se déplace. Références : code `Projets_Dev\Portefeuille_PLQ\tools\adapt_artefacts.js` · tests `tests/test_adapt_artefacts.js` · exécutions `dist/runs/2026-10-27/art_*` · registre `Feeds_Inscrits_v1.md`.

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| A1 | Registre avec préfixe et statut | Le préfixe borne ce qu'un feed peut écrire ; le statut `en_attente` permet d'inscrire l'architecte avant que son bloc existe et de signaler ses enregistrements semés | 3 colonnes (URL, item, propriétaire) seulement : rien n'empêchait un feed d'écrire `goutte21.l8d` | — |
| A2 | Dépendances d'un feed sous son préfixe | Sinon un feed peut écraser une dépendance saisie dans Gérer (`dep.adr-taxes-vers-decision-cdp`) | Préfixe `dep.` du modèle §1 | — |
| A3 | Tout ou rien par feed | Règle Feed du CLAUDE.md (« invalide = ignoré ») + consigne « jamais d'écriture partielle » ; un bloc à moitié juste dit qu'il est mal régénéré | Écrire les enregistrements valides seulement | — |
| A4 | Champs possédés à la création | Même règle que Smartsheet S3 : le portefeuille possède ces champs (modèle §3) ; Franck a saisi la priorité d'Expert G1 dans Gérer | Le feed écrase tout · le feed ne crée jamais l'item | — |
| A5 | `date_initiale` : base d'abord | Modèle §1 « garde la 1re date » ; un feed régénéré peut perdre ou réécrire sa date initiale, la base est la mémoire du recul | Bloc d'abord | — |
| A6 | `lu_le` = heure de lecture | Même usage que 3a/3b (fraîcheur de la lecture) ; la date du bloc reste visible dans `ref` en attendant E6 | `lu_le` = date du bloc | — |
| A7 | Valeurs semées remplacées | Étape 2 a semé la base avec les exemples étape 1 ; la source réelle fait foi (même cas que S7 en 3a) | Garder les valeurs semées | Le seed portait `sante` et `pct_avancement` dans un item de feed : une valeur calculée stockée devient fausse dès la lecture suivante — ne jamais semer un champ calculé |
| A8 | Validateur fermé par défaut | `validate_model.py` sortait sans erreur listée quand `jsonschema` 3.2 n'avait pas `Draft202012Validator` : l'adaptateur a d'abord compté « 0 erreur » et aurait accepté n'importe quel bloc | Lire seulement les lignes d'erreur | 2026-10-27 : un contrôle qui ne tourne pas ressemble à un contrôle qui passe. Exiger la preuve qu'il a tourné (code de sortie + ligne « OK »), et tester le cas « validateur absent » |
| T1 | Lecture par `Artifact read` avec `path: index.html` + `out_dir` | Le HTML brut est enregistré tel que publié (version, sha256 dans `read.json`) : la lecture est rejouable | Lecture sans `path` (HTML dans la conversation, pas de fichier) · WebFetch (interdit) | — |
| T2 | Preuve architecte sur jeu de test, pas en base | Le feed architecte n'existe pas ; écrire un faux livrable en base fausserait la vue partagée | Écrire le jeu de test dans la base | — |
| A9 | Rattachement borné au préfixe | Un risque à 15 rattaché par un feed à `goutte21.l8d` passerait un item Smartsheet au rouge : le préfixe protégeait les identifiants, pas les rattachements | Contrôle par identifiant seulement (première version) | Relecture 2026-10-27 : borner ce qu'on écrit ne suffit pas, il faut borner ce que l'écrit touche (santé calculée par rattachement) |
| A10 | Pas d'écrasement d'une autre source | Gérer peut réenregistrer un enregistrement avec `source = saisie` en gardant son id ; l'adaptateur l'aurait écrasé sans le dire, et le suivi des absents l'aurait perdu | Interface en lecture seule comme seule garde (première version) | Relecture 2026-10-27 : une garde d'interface n'est pas une garde de données ; vérifier la provenance avant chaque `set` |
| A11 | Dépendances dans Gérer | `dep.adr-taxes-vers-decision-cdp` existe déjà en saisie ; si le bloc architecte la portait aussi, la relation serait en double sous deux ids | Bloc architecte avec dépendances | — |
| L5 | Signaler, pas refuser, un bloc daté après la lecture | L'horodatage du producteur n'invalide pas le contenu ; il fausse seulement la provenance | Feed ignoré | Le bloc Expert G1 (écrit à l'étape 3b) porte 20h30 −04:00 alors que la base était lue à 18h57 EDT par la vue : une heure écrite à la main sans horloge de référence. Toujours prendre l'heure d'une horloge (navigateur, `date` avec TZ) et la comparer à une autre source |

## v2 (2026-10-30) — Gantt Expert G1

| # | Choix | Motif | Options écartées |
|---|---|---|---|
| A12 | `gantts` admise dans un bloc | Demande de Franck : le Gantt Expert G1 dans sa fiche ; le bloc feed est la seule voie de lecture d'un artefact (D12) | Parser `ROWS` dans la page |
| A13 | Bloc régénéré sans ligne `gantts` = Gantt en base conservé et signalé | Règle existante (« absent de cette lecture — conservé ») ; les sessions Expert G1 régénèrent le bloc sans connaître l'outil | Supprimer le Gantt absent |
| A14 | Un seul Gantt par bloc et par item ; écarts signalés (Gantt périmé, jalon contradictoire) | Relecture neuve du 30 oct. : deux Gantts acceptés sans signal, la page n'en montrait qu'un ; l'outil producteur peut ne pas être relancé ; les losanges du Gantt ne sont pas confrontés aux jalons du bloc | Confier ces contrôles au producteur | (preuve de lecture déplacée au §5 bis du document) |
