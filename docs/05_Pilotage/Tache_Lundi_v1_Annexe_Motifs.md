# Tâche du lundi v1 — annexe des motifs

> On n'ouvre ce fichier que pour rouvrir une décision. Un motif se déplace, ne se supprime jamais.

## 1. Motifs des arbitrages

| # | Motif | Options écartées |
|---|---|---|
| T1 | Le schéma gelé définit l'instantané comme un résumé par item ; un export complet en base doublerait la base chaque semaine. L'export complet reste comme preuve locale. | Instantané = copie intégrale de la base |
| T2 | Supprimer l'exemple semé exige l'accord de Franck ; il porte une heure fictive (07h00). L'ignorer suffit. | Suppression ; renommage |
| T3 | L'en-tête de la vue affichait « ?/? sources OK » : la vue lit ces champs sur le dernier instantané. Les poser après lecture ne touche pas l'état figé (items). | Instantané pris après les lectures (perd l'état d'avant) ; champ ignoré |
| T4 | Comparer au lundi précédent est ce qui rend le digest lisible en 1 minute ; le recalcul depuis l'instantané ne donne pas les alertes (non stockées dans le modèle). | Ajouter les alertes au modèle (modèle gelé) |
| T5 | 9 lignes de fraîcheur identiques = deux écrans dépassés ; le même fait en alerte et en signal = bruit. | Une ligne par item |
| T6 | Le 2 nov., « 7h00 EDT » serait faux d'une heure. | Toujours « EDT » (règle projet littérale) |
| T7 | Règle de la skill suivi-planifie : une seule recommandation ; elle exige du jugement, donc Claude, pas le script. | Liste de priorités ; recommandation calculée |
| T8 | L'adaptateur Miro compare l'enregistrement entier (source comprise) : changer `source` ferait réécrire et effacerait la trace à la lecture suivante. | `source.systeme = saisie` ; `source.par` = skill |
| T9 | AskUserQuestion limite à 4 options par question ; « une question » = un seul échange pour Franck. | Une question par action (5 échanges) |
| T10 | L'outil ArtifactData ne lit pas un fichier de lot et n'écrit pas la version dans ses exports (friction F1, F2). Une écriture épinglée acceptée vaut version + 1 : déductible sans relire. | Relire toute la base après chaque adaptateur |

## 2. Erreurs payées — exécution manuelle du 27 oct. (sous-agent au contexte neuf, prompt seul)

| # | Constat | Cause réutilisable | Traitement |
|---|---|---|---|
| F1 | 87 versions recopiées à la main ; script maison pour les suivantes | L'export `out_dir` n'écrit pas la version dans les fichiers | `lundi.js versions` |
| F2 | `batch.json` inutilisable tel quel | L'outil batch prend `writes` en ligne ou par `file_path`, pas un fichier de lot | `lundi.js writes` |
| F3 | « Brut tel que rendu » contre « forme de référence » | Les bruts de référence sont des transcriptions normalisées, pas la sortie brute | Prompt : transcription fidèle, SVG seul octet pour octet |
| F4 | « Jamais de Z » contre bruts en Z | Règle écrite pour la base, appliquée au brut | Prompt : la règle vaut pour base, digest, message |
| F5 | Outlook transcrit partiellement (oof seuls) | Forme `slots`/`non_free` non décrite | Prompt : tous les statuts non libres |
| F6 | « Kowalzzyk » introuvable dans l'annuaire | Faute dans Team_G2.1 ; repli non écrit | Prompt : nom seul, puis prénom |
| F7 | Recherche Jira trop volumineuse | Sortie > limite sans `responseFields` | Prompt : `executeRead` + `responseFields` |
| F8 | Fenêtre des ledgers ambiguë (W39 ?) | « 30 derniers jours » ≠ semaines ISO | Prompt : 5 semaines ISO finissant par la semaine courante |
| F9 | Témoins Smartsheet devinés | Prompt sans règle de choix | Prompt : témoins facultatifs |
| F10 | 36 écritures sans changement | Smartsheet et Jira n'ont pas le contrôle « rien ne change » d'Outlook et Miro | Prompt corrigé ; limite L3 |
| F11 | Publication refusée deux fois | `Artifact read` avec `path` ne compte pas comme lecture de la page | Prompt : republier le même fichier |
| F12 | Bloc feed daté après la lecture | Horodatage du producteur (L5 artefacts) | Prompt : signalé, non bloquant |
| F13 | Deux instantanés le même jour | Exemple semé à la même date | T2 |
| F14 | Porteur de l'alerte absent du digest | Le digest ne lit pas les responsables | Prompt : lire `base_apres` |
| F15 | Digest « mardi » | Exécution manuelle hors lundi | Normal |
| P1 | Alerte « dépassé depuis le 4 nov.. » (point double), vue comprise | Gabarit d'alerte + `fmtDate` qui finit par un point | `core.js` corrigé, page v8 |

## 3. Relecture au contexte neuf (27 oct.) — écarts et causes

| # | Écart | Cause réutilisable | Traitement |
|---|---|---|---|
| R1 | Instantané écrasable si l'export de `instantanes` manque | « Écriture unique » prouvée par un export local, pas par la base | Refus si dossier absent ; `get` de contrôle avant écriture |
| R2 | Écriture partielle possible (lots de 50), Miro dépend de Jira | Écriture non atomique ; adaptateurs chaînés par les sprints | Statut « partiel » ; cause « dépend de Jira » |
| R3 | Recalcul possible sans instantané | La règle « continue » s'appliquait aussi à l'étape qui doit précéder | Sans instantané, aucun adaptateur n'écrit |
| R4 | Alerte MEP « aucun ticket prêt » à 63/66 | Libellé de l'exigence ≠ définition du calcul (« prête » = toutes prêtes) | Libellé corrigé (T12) |
| R5 | Alerte la plus grave portée par un livrable sans source active | Un enregistrement conservé n'a pas de fraîcheur | Limite L8 |
| R6 | Digest > deux écrans (23 signaux) | Aucun plafond global | 15 signaux max, prioritaires d'abord |
| R7 | Pas de règle de silence dans le message | Règle écrite pour la réponse finale seulement | Message court si rien de nouveau |
| R8 | Instantané daté du mardi | Id pris sur l'horloge, pas sur la semaine | T11 |
| R9 | Plus de 4 actions = plusieurs questions | Limite de 4 options par question | Gardé : un seul appel (T9) |
| R10 | `statut.json` sans `instantane.version` | Fichier rempli à la main | Corrigé (v2) |
| R13 | Message : « actifs » ≠ « actifs ou planifiés » ; fraîcheur sur 2 places | Message trié autrement que le digest | Une ligne par règle, mêmes libellés |
| R14 | Livrable reculé sans alerte propre | Règle de recul écrite sur `jalons` seulement | T12 |
| R11, R12, R15 | Ajout post-création · heure ISO brute dans un signal · longueur du document | Arbitrage T3 · texte de l'adaptateur recopié · §5–§6 | Gardés |
