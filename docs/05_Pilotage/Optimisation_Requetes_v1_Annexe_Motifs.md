# Optimisation des requêtes v1 — Annexe motifs

> À n'ouvrir que pour rouvrir une décision de `Optimisation_Requetes_v1.md`. Un motif se déplace, ne se supprime jamais.

## Méthode de mesure

| Source | Ce qu'elle donne | Limite |
|---|---|---|
| Transcripts des sessions `local_225d818c` (lundi 9 h 09) et `local_a77fbe93` (quotidien 10 h 21), lus par deux sous-agents au contexte neuf | nombre et ordre des appels d'outils, texte de l'assistant, durée | `read_transcript` masque paramètres et résultats : aucune taille mesurée en direct |
| `dist/lundi/2026-11-02*` et `dist/passages/2026-11-02-*` | tailles réelles des bruts retranscrits, des batches, des exports | — |
| `interface/core.js` l. 392–415 | la fraîcheur d'un bloc vient de `lectures`, `source.lu_le` n'est qu'un repli | — |

## Motifs des décisions

| Réf | Motif |
|---|---|
| T1 | Un passage de 109 tours avec un contexte qui grossit jusqu'à ~150 k tokens coûte des millions de tokens d'entrée (cache compris) ; réduire 10 % des octets ne change rien, réduire 50 % des tours divise la facture par deux |
| S1 | Le 2 nov., le quotidien de 9 h 09 a attendu l'instantané (session vide) puis 10 h 21 a relu Jira + Jira data en 106 appels pour 8 écritures. La règle A1 de la cadence v3 (ledger relu après le briefing) ne justifie pas 106 appels : le ledger du lundi contient le briefing du matin seul, et les 4 semaines précédentes sont déjà lues à 7 h. Supprimer le lundi retire aussi l'étape 0 (attente, concurrence d'écritures), la cause de deux sessions le même matin |
| S2 | Le cadre Actions ne change qu'après la rétro (fin de sprint, 21 j). Lire le SVG complet du board chaque lundi = 2 lectures sur 3 identiques (2 nov. : « cadre identique → svg du 30 oct. recopié »). La skill `maj-actions-retro` reste le chemin juste après la rétro |
| S3 | 2 nov. 9 h 14 : « aucune cellule changée depuis le 30 oct. 13 h 09 → historiques repris » — le modèle a improvisé la garde ; elle doit être une règle outillée (`get_sheet_version` existe dans le connecteur) pour ne pas dépendre de son jugement. Même logique pour Jira : `count updated >= <dernière lecture>` coûte 1 appel et évite 40 |
| S4 | 2 nov. 10 h 21 : « page 1 identique au lundi → repris de la lecture complète du 30 oct. » — même improvisation. L'incrémental doit être écrit (afterDateTime = dernière lecture ok − 1 j) et fusionné par script, sinon un courriel reçu entre deux lectures peut être perdu par un raccourci de jugement |
| S5 | `base_apres` sert au digest et à l'analyste ; `lundi.js versions` sait déjà rejouer les lots acceptés sur `base_avant`. Une écriture concurrente de Franck pendant la tâche est le seul risque : la `list` de contrôle sur `lectures` + le pin `if_version` des écritures le couvrent |
| A1 | `curl` depuis le sandbox vers api.atlassian.com, app.smartsheet.com, graph.microsoft.com, api.miro.com → code 000 (2 nov.). L'option « scripts qui lisent les API directement, zéro retranscription » est écartée tant que le réseau est fermé ; c'est pourtant la seule qui supprimerait T3 |
| A4 | `validate_model.py` contrôle les références croisées (jalon → item, charge → personne…) ; exporter seulement les collections du passage casserait ce contrôle. Les 17 `list` sont 17 tours mais des résultats courts (`out_dir`) |
| R2, R3 | Les 20 `count` et les premières pages sont indépendants : un bloc parallèle = 1 tour au lieu de 20. Le prompt du lundi l'exige déjà pour les sources MEP (« 1er appel de chaque source dans un seul bloc parallèle ») ; il suffit d'étendre la règle |
| R4 | `updated >= -8d` chaque jour relit 36 candidats et leurs liens ; le 30 oct. le modèle a relu « seulement les 8 tickets modifiés depuis 9 h 13 » — la règle doit être écrite |
| R5 | Daily : 27 `bash`, lundi : 73, souvent isolés entre deux appels MCP (transformation à la main, heredocs). Collecter puis écrire en une commande |
| R6 | 2 nov. matin : heures de lecture estimées (09:13, 09:20, 09:47, 09:52) puis corrigées par 3 lots épinglés, 147 écritures, ≈ 20 tours. La règle « aucune heure inventée » existait ; elle manquait d'un mécanisme : `date` dans le même bloc que le premier appel |
| R7 | 2 nov. : session SharePoint expirée → 5 appels navigateur + capture écran pour une page de connexion. Le résultat est le même qu'un échec immédiat |
| R8 | La lecture « sans path » charge 200 Ko de HTML dans le contexte ; elle n'a lieu qu'au code 10, rare le lundi (le code change en session de développement). Rien à optimiser tant que c'est rare ; à revérifier si la page change chaque lundi |
| R9 | `core.js` l. 397 : la fraîcheur d'un bloc vient de `lectures` ; `source.lu_le` sert de repli seulement. Réécrire 28 documents identiques par jour n'apporte rien et incrémente les versions des items que Franck édite dans Gérer (risque de conflit `if_version`) |
| R10 | Le quotidien lit le prompt du lundi en entier (≈ 9 k tokens) pour n'en appliquer que l'étape 2 ; ce texte est rejoué à chacun des 109 tours. Extraire la procédure dans un fichier commun réduit chaque tour, et un seul texte reste à maintenir (A5 de la cadence) |

## Écarts relevés par la relecture au contexte neuf (2 nov.) et ce qu'ils ont changé

| Écart | Cause | Effet sur v1 |
|---|---|---|
| S1 ne s'exécutait pas : le cron vit dans la tâche, pas dans cadence.json, et « jour hors passage : continue » aurait fait tourner le lundi | cadence.json pris pour l'ordonnanceur | S1 = cron + plan vide hors jours (sauf `--force`) |
| Retirer l'étape 0 violait « instantané avant tout recalcul » pour un lancement manuel | l'étape 0 lue comme un coût, pas comme une garde | étape 0 conservée |
| `get_sheet_version` ne prouve pas que les commentaires n'ont pas changé | hypothèse non testée | garde Smartsheet = versions + `list_discussions` |
| La garde Jira ne couvrait pas un changement de sprints (clôture hors lundi) | garde sur les tickets seulement | + carte `sprints` identique |
| `lecture.jira-data-reel` le lundi, `lecture.jira-data` en semaine | couverture `remplace` oubliée | « dernière lecture ok » = la plus récente des deux |
| « +1 j » dans le doc, « −1 j » dans le prompt | rédaction | −1 j partout (marge de recouvrement) |
| Procédure commune « sans changer le sens » alors que Passage v7 substitue RD, base de validation et `<passage>` | trois substitutions ignorées | procédure paramétrée |
| Trois versions de Procedure et deux du prompt lundi dans une exécution | lots conçus indépendants | code d'abord, prompts en une version |

## Options écartées

| Option | Pourquoi écartée |
|---|---|
| Lire les API par le navigateur intégré (`javascript_tool` + fetch) | Même nombre de tours qu'en MCP, plus fragile (sessions), et déjà en échec pour SharePoint |
| Réduire le quotidien à 2 jours / semaine | La cible B1–B3 « 1 j ouvré » est une décision Franck (F1) ; ce n'est pas un gaspillage, c'est le service rendu |
| Exporter la base en un seul appel | `ArtifactData list` est par collection ; pas de `list` multi-collections |
| Compacter `sprint_issues` en tableaux (comme `sub_tasks`) | −10 Ko / jour en sortie : vrai mais second ordre devant les tours ; à faire si on touche à l'adaptateur pour autre chose |
| Instantané reconstruit en local | Jamais : l'instantané est la photo de la base réelle avant tout recalcul (règle produit) |

## Erreurs payées (réutilisables)

| Erreur | Cause | Règle réutilisable |
|---|---|---|
| Deux sessions quotidiennes le même lundi | Le quotidien attend un instantané que la tâche du lundi n'avait pas encore écrit (lancement retardé à 9 h 09) | Ne pas planifier deux tâches qui écrivent la même base à moins de 2 h d'écart ; supprimer plutôt que synchroniser |
| 147 écritures de correction d'heure | Le modèle a rempli `read_at` de mémoire au lieu de la commande | Toute valeur qui doit être exacte vient d'une commande exécutée dans le même tour que l'action qu'elle date |
| Gardes « inchangé » improvisées par le modèle (Smartsheet, courriels) | Le prompt disait « relis tout » ; le modèle a jugé seul que rien n'avait changé | Une garde d'économie est une règle outillée (version, compteur) ou n'existe pas |
