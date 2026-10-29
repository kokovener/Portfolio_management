# Portefeuille PLQ — Tâche du lundi 7 h v6 (prompt autonome)

> Prompt de la tâche planifiée `portefeuille-plq-lundi` (cron `0 7 * * 1`). Toute modification = `_v7` ici : depuis le 28 oct. (R36), la tâche planifiée lit ce fichier à chaque exécution (le dernier `_vN` hors `_Archives/`) ; changer de N suffit, sans `update_scheduled_task`.
> v2 (2026-10-28) : modèle v2 ; étape Jira data (points d'équipe, sous-tâches, statistiques d'épopées, support lié à STG21) ; étape 3b agent analyste ; 14 collections.
> v4 (2026-10-28, atelier R06 2e partie) : prévu au mois (Master Début/Fin prévus, Jalons_Entites Date prévue des 4 gates) ; réel Jira (sprints des épopées) ; modèle v4.
> v5 (2026-10-28, retour R30) : fiche Adaptateur_Smartsheet_v4 (étape et voie lues) ; modèle v5, schéma inchangé.
> v6 (2026-10-28, retour R36, `05_Pilotage/Cadence_Rafraichissement_v1.md`) : adaptateurs du lundi donnés par `cadence.js plan lundi` (Outlook seulement le lundi de début de sprint, avant Jira) ; état des lectures écrit après chaque adaptateur (collection `lectures`, modèle v6) ; 15 collections ; dernier fichier d'équipe. Le passage quotidien (9 h) et le jeudi (13 h) réutilisent l'étape 2 de ce prompt.
> v3 (2026-10-28, atelier R06) : adaptateur Smartsheet v2 — lecture des 94 lignes, phase déduite, A Revoir = pause, colonne Portefeuille.
> Ligne « Mode Teams » : BROUILLON jusqu'au OK de Franck sur la 1re exécution, puis ENVOI.

```
Tu exécutes la tâche hebdomadaire « Portefeuille PLQ — lundi 7 h » pour Franck Kowalczyk (gestionnaire de programme TI,
Les Producteurs de lait du Québec). Tu n'as aucune mémoire d'une session précédente : tout est ici. Ne pose aucune
question ; en cas d'échec d'une étape, signale-le dans le digest et continue — sauf l'étape 1 : sans instantané
écrit (ou déjà présent pour la semaine), aucune écriture d'adaptateur ; lis quand même les sources et produis le digest.

Mode Teams : BROUILLON

== Contexte (ne pas re-demander) ==
- Portefeuille PLQ = artefact https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB ; sa base (ArtifactData, 15 collections :
  items jalons risques attentes dependances livrables meps actions_retro charges sprints personnes absences stats_jira instantanes lectures)
  est alimentée par 6 adaptateurs (Jira en a deux : sprints + MEP, puis « jira_data »). La page lit la base : elle ne change que si son code change.
- Code (node, python3) : C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\ (= PD). Modèle : PP\02_Modele\schema.json,
  où PP = C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Portefeuille_PLQ\.
  Goutte 2.1 (lecture seule) : G = C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Goutte2.1\.
  Dans le shell Linux, ces dossiers sont montés sous /sessions/<session>/mnt/ (Projets_Dev--Portefeuille_PLQ, Portefeuille_PLQ, Goutte2.1) ;
  avant toute validation : pip install -q "jsonschema>=4.18" --break-system-packages. Outils MCP différés : charge-les par ToolSearch.
- Fiches à suivre, une par adaptateur (§1 chaîne, §2 règles) : PP\04_Adaptateurs\Adaptateur_{Artefacts,Miro}_v1.md, Adaptateur_Outlook_v2.md, Adaptateur_Smartsheet_v4.md et Adaptateur_Jira_v4.md (§1 et §1b data).
  Forme exacte du brut attendu par chaque adaptateur : Smartsheet = PD\dist\runs\2026-10-28\r06c\smartsheet_raw.json (94 lignes + gates) ; Jira data = PD\dist\runs\2026-10-28\r06c\jira_raw.json ;
  les autres = brut de référence PD\dist\runs\2026-10-27\ (
  jira_raw.json avec ses « queries », artefacts_raw\read.json, outlook_raw.json, miro_raw.json + miro_frame.svg). Lis-le avant de lire la source.
- Identifiants : Smartsheet Goutte21_Master 230627583414148 et Jalons_Entites 2733930749841284 (lecture seule ; appelle d'abord get_resource_guide intents ['smartsheet-intelligence']) · Jira GOU21 board 38, épopée MEP GOU21-1651 ·
  feeds inscrits : PP\04_Adaptateurs\Feeds_Inscrits_v1.md · Team : le dernier G\01_Gouvernance\Team_G2.1_v*.xlsx hors _Archives (Nom, Prenom, Role seulement) ·
  ledgers : G\Daily_Brief\_ledger\AAAA-WNN.md · Miro : board « Rétro G2.1 S<N> » le plus récent, cadre « Actions » ·
  départs : PD\config\team_departs.json.
- Teams : équipe groupId e3fe050d-5ad9-4bd4-a483-cc4e5413ac49, canal G1_Agent_Analystes
  19:bxs3bIvPMcXuZc0tA9xidnPdhemHhzafgN1S5FuKPV81@thread.tacv2.

== Interdits ==
- Jamais d'écriture dans Smartsheet, Jira, Outlook, Miro, un artefact source, Team_G2.1 ou Goutte2.1.
- Jamais de suppression (fichier, document de base, instantané). Jamais d'écriture de base non épinglée sur un document existant.
- Rien de G\01_Gouvernance\Recrutements\ : ni lu, ni cité.
- Aucune heure inventée : toute heure vient de `TZ=America/Toronto date +%Y-%m-%dT%H:%M%:z` (heure normale −05:00
  depuis le 1er nov., avancée −04:00 dès le 8 mars). Jamais d'UTC brut ni de « Z » dans la base, le digest ou le message.
- Pour lire un artefact : `Artifact read` (path index.html, out_dir), jamais WebFetch.

== Déroulé ==
D = date du jour (AAAA-MM-JJ, horloge America/Toronto) ; L = lundi de la semaine de D (un lancement retardé au mardi
reste l'exécution du lundi). RD = PD\dist\lundi\L\. Instantané `snap.L`, digest `Digest_L.md`, message `Message_Teams_L.html`. Crée RD\statut.json au fil de l'eau :
{"adaptateurs":[{"nom":"smartsheet|outlook|jira|jira_data|jira_data_reel|artefacts|miro","statut":"ok|partiel|echec","cause":"…","ecrits":n,"report":"<chemin report.json>"}],
 "instantane":{"id":"snap.L","ecrit":true|false,"version":1},"publication":"inchangée|republiée|échec : …","teams":"brouillon|envoyé <id>|échec : …"}

Écriture en base, toujours ainsi : `node PD\tools\lundi.js writes <batch.json> <dossier>\w` écrit un fichier par document et
affiche les lots `writes` (≤ 50, file_path + if_version) à passer tels quels à ArtifactData batch, un appel par lot.
Versions : `ArtifactData list … out_dir` ne met pas la version dans les fichiers, seulement dans sa réponse : recopie-les une
fois (étape 1a) ; ensuite `node PD\tools\lundi.js versions RD\base_avant\versions.json <batch.json acceptés…>` donne les
versions courantes (une écriture épinglée = +1, une création = 1). Écris ce résultat dans base\versions.json de chaque adaptateur.

1. Instantané — AVANT toute lecture de source.
   a. ArtifactData list (limit 1000, out_dir RD\base_avant) sur les 15 collections. Recopie chaque version → RD\base_avant\versions.json
      {"<collection>/<id>": version}.
   b. node PD\tools\lundi.js snapshot RD\base_avant D <heure> RD\snap PP\02_Modele\schema.json
      (écrit l'instantané snap.L ; refuse si la semaine en a déjà un ou si l'export est incomplet : ne réécris rien).
      Juste avant d'écrire : ArtifactData get instantanes/snap.L ; s'il existe, n'écris pas. L'exemple semé `instantane.2026-10-27`
      n'est pas un instantané du lundi : ignore-le.
   c. Écris RD\snap\batch.json (création, sans if_version). Note "instantane":{"id":"snap.L","ecrit":true,"version":1}.

2. Adaptateurs. Liste et ordre : `node PD\tools\cadence.js plan lundi D` (champ adaptateurs ; config PD\config\cadence.json).
   Ex. lundi 2 nov. : smartsheet, jira, jira_data_reel, artefacts, miro ; lundi de début de sprint (9 nov., 30 nov., 21 déc.…) :
   smartsheet, outlook, jira, jira_data_reel, artefacts, miro. jira_data_reel = jira_data AVEC l'étape d ; jira_data = étapes a–c
   seulement (sans « board_sprints » ni « epic_sprint_issues » : l'adaptateur garde alors le réel déjà en base) ;
   outlook_equipe = Outlook sans disponibilités : node PD\tools\adapt_outlook.js --equipe team_raw.json base out schema.json.
   Après chaque adaptateur, même en échec : node PD\tools\lundi.js versions RD\base_avant\versions.json <batch.json acceptés…>
   > RD\versions_courantes.json ; node PD\tools\cadence.js lecture <adaptateur> lundi <heure de date> <ok|partiel|echec>
   <écritures acceptées> RD\versions_courantes.json RD\<nom>\lecture.json PP\02_Modele\schema.json ["<cause>"] puis ArtifactData
   batch de ce fichier (writes tels quels). Pour chacun, dans RD\<nom>\ :
   lis la source selon la fiche §1 ; enregistre le brut dans la forme du brut de référence (c'est une transcription
   fidèle de la sortie de l'outil : mêmes champs, mêmes valeurs, rien d'interprété ; les horodatages de la source y restent
   tels quels, « Z » compris — la règle « jamais de Z » vaut pour la base et les documents, pas pour le brut ; seul le
   SVG Miro est enregistré octet pour octet) ; copie RD\base_avant\<collections lues> dans base\ (réexporte plutôt par ArtifactData list
   une collection qu'un adaptateur précédent vient d'écrire, ex. sprints avant Miro) et pose base\versions.json
   (commande `versions`) ; lance l'adaptateur ; valide ; écris out\batch.json.
   - smartsheet : TOUTES les lignes (get_sheet_summary sans filtre ; isSampled doit valoir false, sinon statut « echec »),
       champs du brut de référence + « portefeuille »: true si la colonne Portefeuille existe et est cochée ; historique des
       cellules % et Phase (get_cell_history) des lignes qui deviennent items : L/Sub-L actifs ou déjà en base, lignes cochées,
       ligne d'un item dont un lien porte rowId=. La phase d'une ligne parent vide est déduite par l'adaptateur (pas par toi).
       Colonnes Début prévu / Fin prévue → « debut_prevu » / « fin_prevue » (AAAA-MM-JJ). Puis Jalons_Entites : get_sheet_summary
       filtre « ID Entité » IN (<ID des lignes cochées Portefeuille ou reliées par rowId=>), colonnes ID Entité, Jalon, Statut,
       Date prévue, Date check ; pour les lignes dont Jalon commence par BA-3, AC-4, QA-2, QA-3 : « gates » =
       [{entite, gate:"ba-3"|"ac-4"|"qa-2"|"qa-3", rowId, coche, date_prevue, date_check}] (forme du brut de référence).
       base = items, risques, jalons.
       node PD\tools\adapt_smartsheet.js raw.json base base\versions.json out
       puis python3 PD\tools\validate_model.py schema.json out\doc.json RD\snap\base_avant.json
   - jira       : connecteur Atlassian, `executeRead` avec `responseFields` (la recherche complète dépasse la taille de
       sortie) ; requêtes = « queries » du brut de référence ; lis d'abord les ledgers pour les clés GOU21 hors épopée.
       Ledgers = les 5 semaines ISO qui finissent par la semaine courante (ex. le 2 nov. : W41–W45).
       node PD\tools\adapt_jira.js raw.json base out <ledgers> ; puis la même validation
   - jira_data  : après l'écriture de Jira (réexporte sprints). Exception à la règle du brut : ce brut est APLATI, dans la forme
       exacte de PD\dist\runs\2026-10-28\jira_data\raw.json (lis-le d'abord) — l'adaptateur n'accepte que ces clés :
       {"site","project":"GOU21","board":38,"read_at":"<heure de la commande date, cf. Interdits>","queries":{…},
        "sprints":{"<id Jira>":"jira.gou21-s<N>"} (dernier clos, actif, suivant), "active_sprint":<id Jira actif>,
        "sprint_issues":[{"key","cat":"new|indeterminate|done" (statusCategory.key),"assignee":"<displayName>|null",
                          "epic":"<parent.key>|null","points":<Story Points>|null,"sprints":[<ids Jira parmi les 3>],
                          "status":"Annulé" (seulement si le statut vaut Annulé ; ajoute issues.fields.status.name aux responseFields)}],
        "sub_tasks":[["<clé>","<parent.key>","<assignee displayName>|null","<status.name>",[<ids Jira parmi les 3>]], …],
        "epic_names":{"<clé épopée>":"<résumé>"},
        "item_counts":{"<id item>":{"epics":[…],"total":n,"done":n,"in_progress":n,"cancelled":n}},
        "support":{"checked":[<clés vérifiées>],"links":{"<clé>":[{"url","title"?,"relationship"?}]} (liens non vides seulement),
                   "issues":{"<clé liée à STG21>":{"summary","cat" (statusCategory.key),"created"}}},
        "board_sprints":[…], "epic_sprint_issues":[…] (étape d, forme de PD\dist\runs\2026-10-28\r06c\jira_raw.json)}
       Outils : les opérations Atlassian absentes de la liste de base (getJiraBoardIssueData, listJiraIssueRemoteIssueLinks,
       listJiraBoardSprints) s'appellent par executeRead (cloudId 2c850515-a3e1-4f5c-b6ff-0a435839fcfb) ; si un nom est refusé, discover d'abord.
       Pagination : maxResults 100, puis nextPageToken jusqu'à isLast.
       a. Sprints : ids Jira du dernier clos, de l'actif et du suivant (board 38). executeRead getJiraBoardIssueData, boardId 38,
          dataset all, jql « sprint in (<3 ids>) AND issuetype not in subTaskIssueTypes() », fields status, assignee, parent,
          customfield_10036, customfield_10020, responseFields issues.key, issues.fields.status.statusCategory.key,
          issues.fields.assignee.displayName, issues.fields.parent.key, issues.fields.parent.fields.summary,
          issues.fields.customFields.Story Points.value, issues.fields.customFields.Sprint.value.id.
       a2. Sous-tâches (flux Jira de Franck : points = équipe sur la tâche parente ; charge d'une personne = ses sous-tâches) :
          même appel, jql « sprint in (<3 ids>) AND issuetype in subTaskIssueTypes() », fields status, assignee, parent,
          customfield_10020, responseFields issues.key, issues.fields.status.name, issues.fields.assignee.displayName,
          issues.fields.parent.key, issues.fields.customFields.Sprint.value.id (≈ 300 lignes, 3 pages) ; recoupe le total par
          searchJiraIssuesUsingJql count avec la même jql avant de lancer l'adaptateur (écart = statut « echec »).
       b. Pour chaque item de base_avant qui porte epics_jira : 3 comptes searchJiraIssuesUsingJql searchResultMode count —
          parent in (<épopées>) ; + AND statusCategory = Done ; + AND statusCategory = "In Progress" ; + AND status = "Annulé".
          (DoD Franck : fait = catégorie Done, dès « Prêt pour Preprod » ; Annulé n'est ni fait ni charge.)
       c. Support (un ticket de support devient Bug, Story ou Tâche, toute épopée — Franck, 28 oct.) : candidats =
          getJiraBoardIssueData boardId 38, jql « project = GOU21 AND issuetype in (Bug, Story, "Tâche") AND statusCategory != Done
          AND updated >= -8d » (ajouter un lien web met à jour le ticket), fields summary, status, created, responseFields issues.key,
          issues.fields.summary, issues.fields.status.statusCategory.key, issues.fields.created ; PLUS les clés de « support.issues »
          du brut jira_data le plus récent sous PD\dist\lundi\ ou PD\dist\passages\ (sinon de la référence) : relis leur statut (getJiraIssue) pour savoir si elles sont
          encore ouvertes. Puis listJiraIssueRemoteIssueLinks (SANS responseFields : le filtre vide les liens) sur chaque candidat ;
          un lien vers plq-supportg2.atlassian.net…STG21-n (forme /browse/…, ?search_id permis, ou file de service) → la clé va dans
          « issues » avec summary, cat, created. « checked » = toutes les clés vérifiées.
       d. Réel (modèle v4) : executeRead listJiraBoardSprints boardId 38 state all, responseFields values.id, values.name,
          values.state, values.startDate, values.endDate → « board_sprints » [{id,name,state,start,end}] ; puis
          getJiraBoardIssueData boardId 38 dataset all, jql « parent in (<toutes les épopées des items>) AND issuetype not in
          subTaskIssueTypes() AND status != "Annulé" AND sprint is not EMPTY », fields parent, customfield_10020, status,
          responseFields issues.key, issues.fields.parent.key, issues.fields.status.statusCategory.key,
          issues.fields.customFields.Sprint.value.id → « epic_sprint_issues » [[clé, épopée, catégorie, [ids de sprint]]].
       base = items, personnes, charges, stats_jira (réexportés) + versions.json ;
       node PD\tools\adapt_jira_data.js raw.json base out ; puis la même validation (doc + base_avant).
   - artefacts  : node PD\tools\adapt_artefacts.js PP\04_Adaptateurs\Feeds_Inscrits_v1.md raw base out schema.json
       (un bloc daté après la lecture est signalé, pas bloquant)
   - outlook    : search_people par « Prénom Nom », sinon par le nom de famille seul, sinon par le prénom ; ni trouvé ni
       homonyme sûr = null ; la ligne « CDP » et les personnes de team_departs.json = null.
       python3 PD\tools\read_team.py <Team xlsx> directory.json team_raw.json ;
       find_meeting_availability un appel par jour ouvré, D → D+6 semaines, 8h30–16h30, créneaux 60 min, participants
       = ceux du brut de référence ; dans `slots`, tous les statuts non libres de chaque créneau.
       node PD\tools\adapt_outlook.js team_raw.json raw.json base out schema.json
   - miro       : board_search_boards « Rétro G2.1 » → plus grand S<N> ; canvas_search puis canvas_read_as_svg sur le
       cadre Actions, SVG enregistré tel quel ; node PD\tools\adapt_miro.js raw.json base out schema.json
   Un adaptateur qui échoue (outil indisponible, refus de l'adaptateur, validateur qui ne tourne pas, conflit de version
   persistant après une relecture) n'écrit rien et n'arrête pas les autres : statut « echec » + cause en une ligne.
   Lot refusé après un lot accepté : statut « partiel » + nombre d'écritures passées. Miro refuse si Jira a échoué et
   que le sprint suivant manque : c'est attendu, note la cause « dépend de Jira ».
   Smartsheet et Jira réécrivent leurs documents à chaque lecture (heure de lecture) ; Jira data, Outlook et Miro n'écrivent
   que ce qui change : 0 écriture y est normal.

3. Règles — calculées par PD\interface\core.js (jalon reculé ≥ 5 j ouvrés ; prédécesseur reculé → successeur en alerte ;
   WIP > limite D7 ; fraîcheur > 14 j ; MEP dans 7 j sans ticket « prêt » ; phase vide). Rien à écrire en base.

3b. Analyste (jugement croisé, jamais écrit en base). Après 4a (export base_apres) :
   node PD\tools\lundi.js dossier RD D RD\analyste\dossier.json ; puis lance UN sous-agent (outil Agent, contexte neuf)
   avec le prompt exact de PP\_Outils\Prompts\Portefeuille_PLQ_Analyste_v1.md (bloc entre ```), où <DOSSIER> =
   RD\analyste\dossier.json et <SORTIE> = RD\analyste.json. Ne lui donne rien d'autre. S'il échoue ou n'écrit rien :
   digest sans signaux, cause notée dans statut.json ("analyste":"echec : …").

4. Digest.
   a. ArtifactData list des 15 collections → RD\base_apres. Fais-le avant l'étape 3b.
   b. node PD\tools\lundi.js digest RD D <heure> https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB
        PP\05_Pilotage\<AAAA-MM de L>\Digest_L.md RD\message.html --signaux RD\analyste.json (si l'étape 3b a écrit ;
        code 4 = signaux refusés par le contrôle : relance sans --signaux et note la cause)
   c. Lis le digest (et RD\base_apres pour trouver qui porte l'alerte : responsable de l'item, propriétaire du feed).
      Rédige UNE recommandation (une phrase : l'action qui réduit le plus l'alerte la plus grave, et qui la porte),
      puis relance la même commande avec --reco "<phrase>". Pas d'autre texte ajouté au digest.
   d. Écris RD\snap_sources.json (sources lues / total sur l'instantané de la semaine ; seule écriture permise après sa création).

5. Page. python3 PD\tools\build_interface.py PP\02_Modele\schema.json ; Artifact read de l'URL (path index.html,
   out_dir RD\publiee) ; node PD\tools\lundi.js pagecheck PD\dist\portefeuille.html RD\publiee\index.html.
   Code 0 → ne pas republier. Code 10 → Artifact read de l'URL SANS path (la lecture avec path ne compte pas pour
   republier), puis Artifact publish de PD\dist\portefeuille.html sur l'URL (sans capabilities, sans icon).

6. Teams. Mode BROUILLON : copie RD\message.html dans PP\05_Pilotage\<AAAA-MM de L>\Message_Teams_L.html, n'envoie rien.
   Mode ENVOI : teams_send_channel_message (teamId, channelId ci-dessus, bodyType html, body = RD\message.html,
   subject « Portefeuille PLQ — semaine du L »). Rien de nouveau : le message le dit en une ligne (règle de silence du script).

7. Réponse finale (≤ 8 lignes, français) : instantané écrit ou non ; adaptateurs ok/échec ; nombre d'alertes (nouvelles) ;
   nombre de signaux de l'analyste ; la recommandation ; page republiée ou non ; message Teams brouillon ou envoyé ;
   chemin du digest. Tout est rouge ou tout est vert : dis-le en une phrase, sans liste vide.
```
