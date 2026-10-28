# Portefeuille PLQ — Tâche du lundi 7 h v1 (prompt autonome)

> Prompt de la tâche planifiée `portefeuille-plq-lundi` (cron `0 7 * * 1`). Toute modification = `_v2` ici, puis `update_scheduled_task`.
> Ligne « Mode Teams » : BROUILLON jusqu'au OK de Franck sur la 1re exécution, puis ENVOI.

```
Tu exécutes la tâche hebdomadaire « Portefeuille PLQ — lundi 7 h » pour Franck Kowalczyk (gestionnaire de programme TI,
Les Producteurs de lait du Québec). Tu n'as aucune mémoire d'une session précédente : tout est ici. Ne pose aucune
question ; en cas d'échec d'une étape, signale-le dans le digest et continue — sauf l'étape 1 : sans instantané
écrit (ou déjà présent pour la semaine), aucune écriture d'adaptateur ; lis quand même les sources et produis le digest.

Mode Teams : BROUILLON

== Contexte (ne pas re-demander) ==
- Portefeuille PLQ = artefact https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB ; sa base (ArtifactData, 13 collections :
  items jalons risques attentes dependances livrables meps actions_retro charges sprints personnes absences instantanes)
  est alimentée par 5 adaptateurs. La page lit la base : elle ne change que si son code change.
- Code (node, python3) : C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\ (= PD). Modèle : PP\02_Modele\schema.json,
  où PP = C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Portefeuille_PLQ\.
  Goutte 2.1 (lecture seule) : G = C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Goutte2.1\.
  Dans le shell Linux, ces dossiers sont montés sous /sessions/<session>/mnt/ (Projets_Dev--Portefeuille_PLQ, Portefeuille_PLQ, Goutte2.1) ;
  avant toute validation : pip install -q "jsonschema>=4.18" --break-system-packages. Outils MCP différés : charge-les par ToolSearch.
- Fiches à suivre, une par adaptateur (§1 chaîne, §2 règles) : PP\04_Adaptateurs\Adaptateur_{Smartsheet,Jira,Artefacts,Outlook,Miro}_v1.md.
  Forme exacte du brut attendu par chaque adaptateur : le brut de référence PD\dist\runs\2026-10-27\ (smartsheet_raw.json,
  jira_raw.json avec ses « queries », artefacts_raw\read.json, outlook_raw.json, miro_raw.json + miro_frame.svg). Lis-le avant de lire la source.
- Identifiants : Smartsheet Goutte21_Master 230627583414148 (lecture seule ; appelle d'abord get_resource_guide intents ['smartsheet-intelligence']) · Jira GOU21 board 38, épopée MEP GOU21-1651 ·
  feeds inscrits : PP\04_Adaptateurs\Feeds_Inscrits_v1.md · Team : G\01_Gouvernance\Team_G2.1_v1.xlsx (Nom, Prenom, Role seulement) ·
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
{"adaptateurs":[{"nom":"smartsheet|jira|artefacts|outlook|miro","statut":"ok|echec","cause":"…","ecrits":n,"report":"<chemin report.json>"}],
 "instantane":{"id":"snap.L","ecrit":true|false,"version":1},"publication":"inchangée|republiée|échec : …","teams":"brouillon|envoyé <id>|échec : …"}

Écriture en base, toujours ainsi : `node PD\tools\lundi.js writes <batch.json> <dossier>\w` écrit un fichier par document et
affiche les lots `writes` (≤ 50, file_path + if_version) à passer tels quels à ArtifactData batch, un appel par lot.
Versions : `ArtifactData list … out_dir` ne met pas la version dans les fichiers, seulement dans sa réponse : recopie-les une
fois (étape 1a) ; ensuite `node PD\tools\lundi.js versions RD\base_avant\versions.json <batch.json acceptés…>` donne les
versions courantes (une écriture épinglée = +1, une création = 1). Écris ce résultat dans base\versions.json de chaque adaptateur.

1. Instantané — AVANT toute lecture de source.
   a. ArtifactData list (limit 1000, out_dir RD\base_avant) sur les 13 collections. Recopie chaque version → RD\base_avant\versions.json
      {"<collection>/<id>": version}.
   b. node PD\tools\lundi.js snapshot RD\base_avant D <heure> RD\snap PP\02_Modele\schema.json
      (écrit l'instantané snap.L ; refuse si la semaine en a déjà un ou si l'export est incomplet : ne réécris rien).
      Juste avant d'écrire : ArtifactData get instantanes/snap.L ; s'il existe, n'écris pas. L'exemple semé `instantane.2026-10-27`
      n'est pas un instantané du lundi : ignore-le.
   c. Écris RD\snap\batch.json (création, sans if_version). Note "instantane":{"id":"snap.L","ecrit":true,"version":1}.

2. Adaptateurs, dans cet ordre : Smartsheet → Jira → Artefacts → Outlook → Miro. Pour chacun, dans RD\<nom>\ :
   lis la source selon la fiche §1 ; enregistre le brut dans la forme du brut de référence (c'est une transcription
   fidèle de la sortie de l'outil : mêmes champs, mêmes valeurs, rien d'interprété ; les horodatages de la source y restent
   tels quels, « Z » compris — la règle « jamais de Z » vaut pour la base et les documents, pas pour le brut ; seul le
   SVG Miro est enregistré octet pour octet) ; copie RD\base_avant\<collections lues> dans base\ (réexporte plutôt par ArtifactData list
   une collection qu'un adaptateur précédent vient d'écrire, ex. sprints avant Miro) et pose base\versions.json
   (commande `versions`) ; lance l'adaptateur ; valide ; écris out\batch.json.
   - smartsheet : lignes dont l'ID est au grain L (`^L\d+(-L\d+)?$` ou Sub-L `^L\d+([A-Z]|\.\d+)$`) ; témoins hors grain
       facultatifs ; historique des cellules % et Phase des L actifs (get_cell_history).
       node PD\tools\adapt_smartsheet.js raw.json base base\versions.json out
       puis python3 PD\tools\validate_model.py schema.json out\doc.json RD\snap\base_avant.json
   - jira       : connecteur Atlassian, `executeRead` avec `responseFields` (la recherche complète dépasse la taille de
       sortie) ; requêtes = « queries » du brut de référence ; lis d'abord les ledgers pour les clés GOU21 hors épopée.
       Ledgers = les 5 semaines ISO qui finissent par la semaine courante (ex. le 2 nov. : W41–W45).
       node PD\tools\adapt_jira.js raw.json base out <ledgers> ; puis la même validation
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
   Smartsheet et Jira réécrivent leurs documents à chaque lecture (heure de lecture) ; Outlook et Miro n'écrivent que
   ce qui change : 0 écriture y est normal.

3. Règles — calculées par PD\interface\core.js (jalon reculé ≥ 5 j ouvrés ; prédécesseur reculé → successeur en alerte ;
   WIP > limite D7 ; fraîcheur > 14 j ; MEP dans 7 j sans ticket « prêt » ; phase vide). Rien à écrire en base.

4. Digest.
   a. ArtifactData list des 13 collections → RD\base_apres.
   b. node PD\tools\lundi.js digest RD D <heure> https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB
        PP\05_Pilotage\<AAAA-MM de L>\Digest_L.md RD\message.html
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
   la recommandation ; page republiée ou non ; message Teams brouillon ou envoyé ; chemin du digest.
   Tout est rouge ou tout est vert : dis-le en une phrase, sans liste vide.
```
