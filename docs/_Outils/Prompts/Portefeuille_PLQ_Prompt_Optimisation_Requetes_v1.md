# Portefeuille PLQ — Prompt d'exécution : optimisation des requêtes v1

> À donner tel quel à un autre modèle. Cadrage : `05_Pilotage/Optimisation_Requetes_v1.md` (décisions S1–S6, R1–R10) et son annexe motifs. 2026-11-02, relu au contexte neuf (13 écarts corrigés avant livraison).
> Reste à Franck, hors prompt : changer le cron de `portefeuille-plq-quotidien` en `0 9 * * 2-5` (S1).

```
Tu réalises l'optimisation des tâches de mise à jour du Portefeuille PLQ pour Franck Kowalczyk (PLQ). Tu n'as aucune
mémoire d'une session précédente. Ne pose aucune question : les décisions sont prises dans
PP\05_Pilotage\Optimisation_Requetes_v1.md (lis-le en premier ; son annexe motifs seulement si une décision te paraît
contestable — tu l'appliques quand même et notes l'écart dans ton rapport final).

PP = C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Portefeuille_PLQ\
PD = C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\ (git obligatoire : un commit par lot, message en anglais, jamais de stash)
Dans le shell Linux : /sessions/<session>/mnt/Portefeuille_PLQ et /sessions/<session>/mnt/Projets_Dev--Portefeuille_PLQ.
Lis aussi, avant d'écrire : PP\CLAUDE.md, PP\05_Pilotage\Cadence_Rafraichissement_v3.md,
PP\_Outils\Prompts\Portefeuille_PLQ_Tache_Lundi_v18.md, PP\_Outils\Prompts\Portefeuille_PLQ_Tache_Passage_v7.md,
PD\config\cadence.json, PD\tools\cadence.js, PD\tools\lundi.js, PD\tools\adapt_jira.js, PD\tools\adapt_jira_data.js,
PD\tools\adapt_smartsheet.js, PD\interface\core.js (l. 390–420), PP\02_Modele\schema.json ($defs.lecture), PD\tests\.
Règles : commentaires de code en anglais ; livrables en français ; noms de fichiers [A-Za-z0-9._-] ; créer _vN+1 = déplacer
_vN dans _Archives\ adjacent. Aucune suppression. Aucune écriture dans Smartsheet, Jira, Outlook, Miro, la base de l'artefact
ni les tâches planifiées (les SKILL.md des tâches lisent déjà « le dernier _vN hors _Archives » : rien à y changer ; le cron
est changé par Franck). Essaie tes commandes sur les vraies données de PD\dist\ plutôt que de relire ton texte ; tests
PD\tests\ verts avant chaque commit.

Données de test disponibles : PD\dist\lundi\2026-11-02\ (lundi complet : smartsheet, jira + mep_sources, jira_data_reel,
artefacts, miro, feries, base_avant, base_apres, snap) ; PD\dist\lundi\2026-11-02_matin\ ; PD\dist\passages\2026-11-02-quotidien-1021\
(jira, jira_data, base_avant) ; PD\dist\passages\2026-10-30-quotidien-0902\ ; PD\dist\passages\2026-11-02-demande-smartsheet-1455\.

== Lot 1 — cadence (S1, S2) ==
1. PD\config\cadence.json : quotidien `jours` [2,3,4,5] ; miro retiré de `passages.lundi.adaptateurs`, ajouté à
   `passages.lundi.debut_sprint` (avec outlook) ; `_doc` cite Optimisation_Requetes_v1.
2. PD\tools\cadence.js `plan` : hors des jours du passage, la liste `adaptateurs` est VIDE avec le motif « jour hors du
   passage » ; l'option `--force` rend l'ancien comportement (lancement manuel). Attendu : `plan lundi 2026-11-09` =
   smartsheet, outlook, jira, jira_data_reel, artefacts, gantt, miro ; `plan lundi 2026-11-16` = sans outlook ni miro ;
   `plan quotidien 2026-11-09` = liste vide ; `plan quotidien 2026-11-09 --force` = jira, jira_data ;
   `plan demande 2026-11-10 retro` = miro. Tests de cadence.js mis à jour.
3. PP\05_Pilotage\Cadence_Rafraichissement_v4.md (v3 → _Archives) : §4 passages (quotidien mar.–ven.), B8 Miro « lundi de
   début de sprint · skill maj-actions-retro · à la demande », A1 et A6 déplacés dans l'annexe motifs v4 avec la cause (S1 :
   deux sessions le 2 nov. pour 8 écritures ; l'étape 0 du passage reste comme garde des lancements manuels).

== Lot 2 — statut « inchange » et gardes (S3) ==
4. PP\02_Modele\schema.json : `$defs.lecture.statut` enum + `inchange` ; modèle vN+1 (note de version dans PP\02_Modele\,
   fichier Modele_Canonique_vN+1.md, vN → _Archives). PD\tools\cadence.js `lecture` accepte `inchange` (0 écriture, cause
   facultative). core.js l. 397 n'exclut que `echec` : vérifie par un test que `inchange` compte comme une lecture fraîche.
5. adapt_smartsheet.js : champs optionnels `sheet_version` et `gates_sheet_version` dans le brut, recopiés dans le rapport.
6. adapt_jira_data.js : rien à changer ; la garde est dans la procédure (point 12).

== Lot 3 — code (S4, S5, R9) ==
7. PD\tools\mep_merge.js <precedent mep_sources.json> <nouveau mep_sources.json> <D> <sortie> : fusionne `emails` et `teams`
   par (date, expéditeur, sujet) sans doublon, garde D−30 j, prend `calendar` et `queries` du nouveau, `read_at` du nouveau ;
   note dans `queries.note` le nombre repris / ajouté. Test : précédent = PD\dist\lundi\2026-11-02\jira\mep_sources.json,
   nouveau = le même fichier filtré sur les courriels reçus ≥ 2026-11-01 (fabrique-le par script dans /tmp) → sortie = 72
   courriels, 0 doublon ; précédent vide → sortie = nouveau.
8. PD\tools\lundi.js `apply <base_avant dir> <out dir> <batch.json acceptés…>` : rejoue set / update / delete sur une copie →
   base_apres locale, versions = `cmdVersions`. Test : rejouer PD\dist\lundi\2026-11-02 (base_avant + tous les out\batch.json
   acceptés par statut.json) et comparer à PD\dist\lundi\2026-11-02\base_apres : diff vide hors `version`. Si un diff reste,
   explique-le dans le rapport (écriture concurrente ou lot non rejoué) et garde la commande.
9. adapt_jira.js et adapt_smartsheet.js : n'émettre un `set` que si le document diffère de la base hors `source.lu_le` (même
   règle que adapt_jira_data.js) ; le document `doc.json` et le rapport gardent toutes les lignes. Test : adapt_jira sur
   PD\dist\passages\2026-11-02-quotidien-1021\jira\raw.json + sa base → ≤ 5 écritures (le 2 nov. réel : 28) ; adapt_smartsheet
   sur PD\dist\passages\2026-11-02-demande-smartsheet-1455\smartsheet\raw.json + sa base → les mêmes différences que son
   out\batch.json (L0.2 créée, phases L8D1.1.2 / L8D1.1.3), rien d'autre.
10. Fiches : PP\04_Adaptateurs\Adaptateur_Jira_v11.md (v10 → _Archives) : §2 règle « écrit seulement ce qui change », §1c
    courriels en incrémental + mep_merge, garde Jira data (point 12) ; Adaptateur_Smartsheet_v7.md (v6 → _Archives) : §1 garde
    version + discussions, §2 règle « écrit seulement ce qui change ». Une ligne de version en tête de chaque fiche.

== Lot 4 — prompts, une seule version chacun (S1, R1–R8, R10) ==
11. Crée PP\_Outils\Prompts\Portefeuille_PLQ_Procedure_Adaptateurs_v1.md : bloc entre ``` qui contient, extraits du prompt
    Lundi v18 sans en changer le sens, « Écriture en base » et l'étape 2 complète (tous les adaptateurs, fériés compris),
    PARAMÉTRÉS : en tête, trois paramètres fournis par le prompt appelant — RD (dossier du lancement), BASEVAL (base de
    validation : RD\snap\base_avant.json le lundi, RD\base_avant.json en passage) et PASSAGE (argument de cadence.js lecture) ;
    chaque occurrence du prompt v18 est remplacée par le paramètre.
12. Ajoute dans cette procédure les règles suivantes, à l'endroit de l'adaptateur concerné :
    - R1 (amorce) : un seul ToolSearch groupé avec les outils de tous les adaptateurs du plan.
    - R6 (chaque adaptateur) : `TZ=America/Toronto date +%Y-%m-%dT%H:%M%:z > RD\<nom>\debut.txt` dans le MÊME bloc parallèle
      que le premier appel outil de l'adaptateur ; read_at = ce fichier, jamais une heure de mémoire.
    - R5 (chaque adaptateur) : collecter tous les appels outil d'abord ; aucun bash entre deux appels outil du même adaptateur,
      sauf la pagination qui dépend d'un résultat ; raw.json écrit en une commande.
    - Smartsheet, garde S3 : avant get_sheet_summary, `get_sheet_version` sur 230627583414148 et 2733930749841284 et
      `list_discussions` (déjà dans la procédure) dans un bloc parallèle ; si les deux versions ET la liste des commentaires
      (rowId, commentId) égalent celles du raw.json Smartsheet le plus récent sous PD\dist\lundi\ ou PD\dist\passages\ : copie
      ce raw.json avec read_at = debut.txt, lecture `inchange`, 0 écriture, fin de l'adaptateur. Le brut porte `sheet_version`
      et `gates_sheet_version`.
    - Jira, courriels (S4) : afterDateTime = lu_le de la dernière lecture ok de `jira` (collection lectures) −1 j, limit 25,
      pagination comme avant ; puis `node PD\tools\mep_merge.js <mep_sources.json le plus récent sous PD\dist\> RD\jira\mep_sources_new.json D RD\jira\mep_sources.json`.
      Sans lecture ok : D−30 j sans fusion, comme avant.
    - Jira data, garde S3 (jamais le lundi : l'étape d est due) : DERNIERE = lu_le le plus récent entre lecture.jira-data et
      lecture.jira-data-reel avec statut ok ; un seul searchJiraIssuesUsingJql count « project = GOU21 AND updated >=
      "<DERNIERE −1 j, AAAA-MM-JJ>" » ; 0 ET carte `sprints` de l'adaptateur Jira du passage identique au raw.json jira_data
      le plus récent → ce brut repris (read_at = debut.txt), lecture `inchange`, 0 écriture.
    - Jira data b (R2) : les comptes dans un seul bloc parallèle. a, a2, e, f, g (R3) : premières pages dans un seul bloc
      parallèle, pages suivantes groupées.
    - Jira data c (R4) : candidats `updated >= "<DERNIERE −1 j>"` ; `-8d` le lundi ou sans lecture ok ;
      listJiraIssueRemoteIssueLinks de tous les candidats dans un bloc parallèle.
    - Gantt (R7) : métadonnées `$select=TimeLastModified,ETag` d'abord ; page de connexion Microsoft = statut echec immédiat,
      sans capture, sans second essai ; TimeLastModified identique au read.json Gantt le plus récent sous PD\dist\ = brut et
      sha256 repris, 0 appel de plus, lecture `inchange`.
13. Crée Portefeuille_PLQ_Tache_Lundi_v19.md (v18 → _Archives) : journal de version en tête (ligne v19 : Optimisation_Requetes_v1,
    lots 1–4) ; contexte, interdits, étapes 1, 3, 3b, 4–8 inchangés ; l'étape 2 devient « plan = cadence.js plan lundi D ;
    applique PP\_Outils\Prompts\Portefeuille_PLQ_Procedure_Adaptateurs_v*.md (dernier N hors _Archives) avec RD = PD\dist\lundi\L\,
    BASEVAL = RD\snap\base_avant.json, PASSAGE = lundi » ; l'étape 4a devient `node PD\tools\lundi.js apply RD\base_avant
    RD\base_apres <batch.json acceptés>` puis `ArtifactData list lectures (out_dir RD\base_apres)` : si une lecture ok du jour
    manque dans base_apres, export complet des 17 collections comme avant (cause notée dans statut.json) ; l'étape 3b
    précise « outil Agent avec model: "opus" » pour le sous-agent analyste (seul endroit du déroulé où le modèle se choisit ;
    le modèle de la tâche planifiée elle-même n'est pas réglable par le prompt).
14. Crée Portefeuille_PLQ_Tache_Passage_v8.md (v7 → _Archives) : la ligne « PROCÉDURE » pointe sur Procedure_Adaptateurs_v*
    avec RD = PD\dist\passages\D-<passage>-HHMM\, BASEVAL = RD\base_avant.json, PASSAGE = <passage> ; plus aucune lecture du
    prompt du lundi ; étape 0 conservée (garde des lancements manuels du lundi) ; étape 1 : liste vide = statut.json et fin
    (le `--force` n'est pas utilisé par la tâche planifiée).
15. Contrôle : un sous-agent au contexte neuf lit Procedure v1, Lundi v19 et Passage v8 et rend, par adaptateur et par
    passage, la liste ordonnée des commandes et appels outil. Tout écart avec v18 + Optimisation_Requetes_v1 = cause, puis
    corrige avant de livrer.

== Fin ==
16. Commits : un par lot. Rapport final (≤ 12 lignes, français) : lots faits, tests lancés et verts, écarts avec
    Optimisation_Requetes_v1 et leur cause, fichiers créés / archivés, gain attendu en appels par semaine (base de mesure :
    quotidien 106 appels, lundi 226), et le rappel à Franck : cron du quotidien → `0 9 * * 2-5`.
```
