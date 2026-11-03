# Portefeuille PLQ — Tâche du lundi 7 h v19 (prompt autonome)

> Prompt de la tâche planifiée `portefeuille-plq-lundi` (cron `0 7 * * 1`). Toute modification = `_v20` ici : depuis le 28 oct. (R36), la tâche planifiée lit ce fichier à chaque exécution (le dernier `_vN` hors `_Archives/`) ; changer de N suffit, sans `update_scheduled_task`.
> **v19 (2026-11-02, `05_Pilotage/Optimisation_Requetes_v1.md`, lots 1–4)** : étape 2 = `PP\_Outils\Prompts\Portefeuille_PLQ_Procedure_Adaptateurs_v*.md` (dernier N hors _Archives ; paramètres RD, BASEVAL, PASSAGE ; gardes « inchangé », courriels MEP incrémentaux, un seul ToolSearch, appels groupés) ; Miro au lundi de début de sprint (cadence v4) ; 4a = `lundi.js apply` (base_apres reconstruite) + contrôle `lectures` ; analyste 3b sur `model: "opus"` ; références des adaptateurs déplacées dans la procédure.
> v2 (2026-10-28) : modèle v2 ; étape Jira data (points d'équipe, sous-tâches, statistiques d'épopées, support lié à STG21) ; étape 3b agent analyste ; 14 collections.
> v4 (2026-10-28, atelier R06 2e partie) : prévu au mois (Master Début/Fin prévus, Jalons_Entites Date prévue des 4 gates) ; réel Jira (sprints des épopées) ; modèle v4.
> v5 (2026-10-28, retour R30) : fiche Adaptateur_Smartsheet_v4 (étape et voie lues) ; modèle v5, schéma inchangé.
> v6 (2026-10-28, retour R36, `05_Pilotage/Cadence_Rafraichissement_v1.md`) : adaptateurs du lundi donnés par `cadence.js plan lundi` (Outlook seulement le lundi de début de sprint, avant Jira) ; état des lectures écrit après chaque adaptateur (collection `lectures`, modèle v6) ; 15 collections ; dernier fichier d'équipe. Le passage quotidien (9 h) et le jeudi (13 h) réutilisent l'étape 2 de ce prompt.
> v3 (2026-10-28, atelier R06) : adaptateur Smartsheet v2 — lecture des 94 lignes, phase déduite, A Revoir = pause, colonne Portefeuille.
> Ligne « Mode Teams » : BROUILLON jusqu'au OK de Franck sur la 1re exécution, puis ENVOI.

> v7 (2026-10-28, retours R32–R35) : Jira data lit aussi la liste « préparation » (étape e : statuts PrêtPourSprint🚀 / PrêtPourGrooming✅, ordre du backlog) et écrit les listes de tickets (collection `listes_jira`, modèle v7) ; 16 collections.
> v8 (2026-10-28, Kickoff v2 D7) : règle WIP retirée (volet flux abandonné), modèle v8.
> v9 (2026-10-29, K13) : seule suppression permise = charges Jira data non relues (accord permanent Franck).
> v10 (2026-10-29, R27) : attentes lues — Jira data étape f (Bloqué, « is blocked by »), Smartsheet commentaires bloquants (bloquant, BLOQ, bloque, bloqué).
> v11 (2026-10-29, R27 bis) : étape g — tickets « Bloqué » des sprints lus (liste `jira.liste.bloques`, modèle v10).
> v12 (2026-10-29, R41) : étape 2f fériés — chaque lundi, fériés du Québec (config) + fermetures du calendrier de Franck → absences collectives (modèle v11, fiche Outlook v3).
> v14 (2026-10-29, R49) : fiche Adaptateur_Smartsheet_v6 (ligne cochée Portefeuille = item quelle que soit la phase ; parent recalculé ; R50 : profondeur lue, la hiérarchie de la feuille prime sur l'ID) ; page v45 (parties « Qualifiés et en pause » et « Terminés », repliées, avant les MEP).
> v16 (2026-10-30, Kickoff D22 v7) : fiche Adaptateur_Artefacts_v2 (un bloc feed peut porter son Gantt, collection gantts).
> v17 (2026-10-30, Kickoff D18 v8, règles du Statut TI hebdo) : MEP lues aussi dans le calendrier « Calendar - MEP », les courriels et le canal Teams « 05 - Déploiements » (`mep_sources.json`, option `--sources`) ; priorité calendrier > Jira > courriel > Teams > ledger ; fiche Adaptateur_Jira_v10 ; modèle v17 (source `teams`).
> v18 (2026-11-02, Kickoff D12 v10) : roadmap de l'architecte lue telle que livrée (bloc `donnees-programme` 1.0, Feeds_Inscrits_v2 colonne Format, fiche Adaptateur_Artefacts_v3) ; ses changements de la semaine, tâches nouvelles, reculs et incohérences au digest.
> v15 (2026-10-30, modèle v15) : adaptateur Gantt après Artefacts (fiche Adaptateur_Gantt_v1, registre Gantts_Inscrits_v1) ; 17 collections (gantts) ; page avec la carte « Gantt du projet ».
> v13 (2026-10-29, checkpoint) : ledger de la semaine absent à 7 h = sauté avec un signal (`ledger_absent`), pas un échec Jira ; heures EST (−05:00) dès le 1er nov. dans la page aussi ; marqueur de fin `"fin"` dans statut.json (le passage de 9 h l'attend le lundi) ; alertes « nouvelles » comparées aux règles du jour.
```
Tu exécutes la tâche hebdomadaire « Portefeuille PLQ — lundi 7 h » pour Franck Kowalczyk (gestionnaire de programme TI,
Les Producteurs de lait du Québec). Tu n'as aucune mémoire d'une session précédente : tout est ici. Ne pose aucune
question ; en cas d'échec d'une étape, signale-le dans le digest et continue — sauf l'étape 1 : sans instantané
écrit (ou déjà présent pour la semaine), aucune écriture d'adaptateur ; lis quand même les sources et produis le digest.

Mode Teams : BROUILLON

== Contexte (ne pas re-demander) ==
- Portefeuille PLQ = artefact https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB ; sa base (ArtifactData, 17 collections :
  items jalons risques attentes dependances livrables meps actions_retro charges sprints personnes absences stats_jira instantanes lectures listes_jira gantts)
  est alimentée par 7 adaptateurs (Jira en a deux : sprints + MEP, puis « jira_data »). La page lit la base : elle ne change que si son code change.
- Code (node, python3) : C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\ (= PD). Modèle : PP\02_Modele\schema.json,
  où PP = C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Portefeuille_PLQ\.
  Goutte 2.1 (lecture seule) : G = C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Goutte2.1\.
  Dans le shell Linux, ces dossiers sont montés sous /sessions/<session>/mnt/ (Projets_Dev--Portefeuille_PLQ, Portefeuille_PLQ, Goutte2.1) ;
  avant toute validation : pip install -q "jsonschema>=4.18" --break-system-packages. Outils MCP différés : charge-les par ToolSearch.
- Adaptateurs (fiches, bruts de référence, identifiants Smartsheet, Jira, feeds, Team, ledgers, Miro, départs) : dans la
  procédure de l'étape 2, PP\_Outils\Prompts\Portefeuille_PLQ_Procedure_Adaptateurs_v*.md (dernier N hors _Archives).
- Teams : équipe groupId e3fe050d-5ad9-4bd4-a483-cc4e5413ac49, canal G1_Agent_Analystes
  19:bxs3bIvPMcXuZc0tA9xidnPdhemHhzafgN1S5FuKPV81@thread.tacv2.

== Interdits ==
- Jamais d'écriture dans Smartsheet, Jira, Outlook, Miro, un artefact source, Team_G2.1 ou Goutte2.1.
- Jamais de suppression (fichier, document de base, instantané), SAUF les exceptions K13 et K14 : les `delete` que l'adaptateur Jira data
  met lui-même dans son batch.json (charges Jira de ses sprints lus, marquées "purge":"K13") — accord permanent de Franck du
  29 oct. 2026 ; et l'exception K14 : les `delete` que l'adaptateur artefacts met lui-même dans son batch.json (jalons et
  dépendances feed.archi.* retirés de la roadmap de l'architecte, marqués "purge":"K14") — accord permanent de Franck du 2 nov. 2026 ;
  `lundi.js writes` refuse toute autre suppression. Jamais d'écriture de base non épinglée sur un document existant.
- Rien de G\01_Gouvernance\Recrutements\ : ni lu, ni cité.
- Aucune heure inventée : toute heure vient de `TZ=America/Toronto date +%Y-%m-%dT%H:%M%:z` (heure normale −05:00
  depuis le 1er nov., avancée −04:00 dès le 14 mars 2027). Jamais d'UTC brut ni de « Z » dans la base, le digest ou le message.
- Pour lire un artefact : `Artifact read` (path index.html, out_dir), jamais WebFetch.

== Déroulé ==
D = date du jour (AAAA-MM-JJ, horloge America/Toronto) ; L = lundi de la semaine de D (un lancement retardé au mardi
reste l'exécution du lundi). RD = PD\dist\lundi\L\. Instantané `snap.L`, digest `Digest_L.md`, message `Message_Teams_L.html`. Crée RD\statut.json au fil de l'eau :
{"adaptateurs":[{"nom":"smartsheet|outlook|jira|jira_data|jira_data_reel|artefacts|gantt|miro","statut":"ok|partiel|echec|inchange","cause":"…","ecrits":n,"report":"<chemin report.json>"}],
 "instantane":{"id":"snap.L","ecrit":true|false,"version":1},"publication":"inchangée|republiée|échec : …","teams":"brouillon|envoyé <id>|échec : …"}

0. Amorce (aucun appel d'outil MCP avant) : mkdir -p RD ; node PD\tools\cadence.js plan lundi L > RD\plan.json (L et non D : un lancement
   retardé au mardi reste l'exécution du lundi et ne doit pas rendre une liste vide « jour hors du passage ») ; lis entièrement
   le dernier PP\_Outils\Prompts\Portefeuille_PLQ_Procedure_Adaptateurs_v*.md hors _Archives (bloc entre ```) ; puis son
   amorce R1 (un seul ToolSearch : ArtifactData, outils du plan, teams_send_channel_message en mode ENVOI).
   Écriture en base : section « Écriture en base » de cette procédure, à appliquer partout ici (étape 1 comprise).

1. Instantané — AVANT toute lecture de source.
   a. ArtifactData list (limit 1000, out_dir RD\base_avant) sur les 17 collections. Recopie chaque version → RD\base_avant\versions.json
      {"<collection>/<id>": version}.
   b. node PD\tools\lundi.js snapshot RD\base_avant D <heure> RD\snap PP\02_Modele\schema.json
      (écrit l'instantané snap.L ; refuse si la semaine en a déjà un ou si l'export est incomplet : ne réécris rien).
      Juste avant d'écrire : ArtifactData get instantanes/snap.L ; s'il existe, n'écris pas. L'exemple semé `instantane.2026-10-27`
      n'est pas un instantané du lundi : ignore-le.
   c. Écris RD\snap\batch.json (création, sans if_version). Note "instantane":{"id":"snap.L","ecrit":true,"version":1}.

2. Adaptateurs du plan de l'étape 0 (champ adaptateurs, dans cet ordre).
   Ex. lundi 16 nov. : smartsheet, jira, jira_data_reel, artefacts, gantt ; lundi de début de sprint (9 nov., 30 nov., 21 déc.…) :
   smartsheet, outlook, jira, jira_data_reel, artefacts, gantt, miro.
   Applique l'étape 2 de la procédure avec RD = PD\dist\lundi\L\, BASEVAL = RD\snap\base_avant.json, PASSAGE = lundi
   (fériés 2f compris).

3. Règles — calculées par PD\interface\core.js (jalon reculé ≥ 5 j ouvrés ; prédécesseur reculé → successeur en alerte ;
   fraîcheur > 15 j ouvrés Smartsheet et Jira ; bloqués du sprint ; risque ≥ 15 ; attentes > 5 j o. ; MEP dans 7 j sans ticket « prêt » ; phase vide). Rien à écrire en base.

3b. Analyste (jugement croisé, jamais écrit en base). Après 4a (base_apres) :
   node PD\tools\lundi.js dossier RD D RD\analyste\dossier.json ; puis lance UN sous-agent (outil Agent avec model: "opus",
   contexte neuf ; seul endroit du déroulé où le modèle se choisit)
   avec le prompt exact de PP\_Outils\Prompts\Portefeuille_PLQ_Analyste_v1.md (bloc entre ```), où <DOSSIER> =
   RD\analyste\dossier.json et <SORTIE> = RD\analyste.json. Ne lui donne rien d'autre. S'il échoue ou n'écrit rien :
   digest sans signaux, cause notée dans statut.json ("analyste":"echec : …").

4. Digest.
   a. Avant l'étape 3b. Si RD\base_apres existe déjà (relance de la semaine), déplace-le d'abord en RD\base_apres_<HHMM> (rien
      supprimé). Puis node PD\tools\lundi.js apply RD\base_avant RD\base_apres <batch.json acceptés, dans l'ordre : RD\snap\batch.json
      si l'instantané a été écrit à l'étape 1, out\batch.json de chaque adaptateur ok, RD\<nom>\lecture.json
      de chacun, RD\feries\out\batch.json si ok> (base_apres reconstruite en local, versions comprises ; un adaptateur « partiel »
      → export complet ci-dessous, sans apply) ; puis ArtifactData list lectures (limit 1000, out_dir RD\base_apres) : si une lecture ok
      ou inchange de ce lancement (statut.json) manque dans base_apres ou n'y porte pas l'heure de ce lancement, déplace
      RD\base_apres en RD\base_apres_local_<HHMM> et exporte les 17 collections comme avant (ArtifactData list → RD\base_apres),
      cause notée dans statut.json ("base_apres":"export complet : …").
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

7. Fin. Ajoute "fin":"<heure>" à RD\statut.json (même si des étapes ont échoué) : le passage de 9 h attend ce marqueur le lundi.
8. Réponse finale (≤ 8 lignes, français) : instantané écrit ou non ; adaptateurs ok/échec ; nombre d'alertes (nouvelles) ;
   nombre de signaux de l'analyste ; la recommandation ; page republiée ou non ; message Teams brouillon ou envoyé ;
   chemin du digest. Tout est rouge ou tout est vert : dis-le en une phrase, sans liste vide.
```
