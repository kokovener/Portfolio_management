# Portefeuille PLQ — Passages légers v4 (quotidien 9 h · jeudi 13 h)

> Prompt des tâches planifiées `portefeuille-plq-quotidien` (cron `0 9 * * 1-5`, ligne « Passage : quotidien ») et `portefeuille-plq-jeudi` (cron `0 13 * * 4`, ligne « Passage : jeudi »). Cadrage : `05_Pilotage/Cadence_Rafraichissement_v1.md` (R36). Toute modification = `_v5` ici : depuis le 28 oct. (R36), la tâche planifiée lit ce fichier à chaque exécution (le dernier `_vN` hors `_Archives/`) ; changer de N suffit, sans `update_scheduled_task`.

```
Tu exécutes un passage léger du « Portefeuille PLQ » pour Franck Kowalczyk (gestionnaire de programme TI, Les Producteurs
de lait du Québec). Tu n'as aucune mémoire d'une session précédente : tout est ici. Ne pose aucune question. Ce passage
relit quelques sources et met à jour la base de l'artefact ; il n'écrit NI instantané, NI digest, NI message Teams, et ne
republie pas la page (seule la tâche du lundi le fait).

Passage : <quotidien | jeudi>

== Contexte ==
- Artefact https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB ; base ArtifactData, 16 collections (items jalons risques attentes
  dependances livrables meps actions_retro charges sprints personnes absences stats_jira instantanes lectures listes_jira).
- PD = C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\ ; PP = C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Portefeuille_PLQ\ ;
  G = C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Goutte2.1\ (lecture seule).
  Dans le shell Linux : /sessions/<session>/mnt/ (Projets_Dev--Portefeuille_PLQ, Portefeuille_PLQ, Goutte2.1).
  Avant toute validation : pip install -q "jsonschema>=4.18" --break-system-packages. Outils MCP différés : ToolSearch.
- PROCÉDURE DE CHAQUE ADAPTATEUR : lis entièrement le dernier PP\_Outils\Prompts\Portefeuille_PLQ_Tache_Lundi_v*.md hors
  _Archives ; applique ses sections « Interdits » et « Écriture en base », et pour chaque adaptateur dû, sa procédure de
  l'étape 2 (brut de référence, lecture, base, versions, adaptateur, validation, lecture.json). N'exécute PAS ses étapes 1
  (instantané), 3b (analyste), 4 (digest), 5 (page) ni 6 (Teams).

== Déroulé ==
D = date du jour (TZ=America/Toronto date +%F) ; heure = TZ=America/Toronto date +%Y-%m-%dT%H:%M%:z (jamais de Z, jamais inventée).
RD = PD\dist\passages\D-<passage>-HHMM\ (HHMM = heure de début, un dossier par lancement).
0. Le lundi seulement : ArtifactData get instantanes/snap.D. Absent (tâche du lundi 7 h en échec ou en cours) : n'écris rien,
   RD\statut.json {"passage","date","attente":"instantané du lundi absent"} et termine (règle : instantané avant tout recalcul).
1. node PD\tools\cadence.js plan <passage> D > RD\plan.json. Adaptateurs = champ « adaptateurs », dans cet ordre.
   Un avertissement « jour hors du passage » : continue (lancement manuel). Liste vide : écris RD\statut.json et termine.
2. ArtifactData list (limit 1000, out_dir RD\base_avant) des 16 collections ; recopie chaque version →
   RD\base_avant\versions.json {"<collection>/<id>": version}. Puis node PD\tools\cadence.js base RD\base_avant <heure>
   RD\base_avant.json : c'est la base de validation, à utiliser partout où l'étape 2 du lundi cite RD\snap\base_avant.json.
3. Pour chaque adaptateur dû, dans l'ordre : procédure de l'étape 2 du prompt du lundi, dans RD\<adaptateur>\ ;
   base\ = copie de RD\base_avant (toutes les collections ; réexporte celles qu'un adaptateur précédent de ce passage vient
   d'écrire) ; base\versions.json = node PD\tools\lundi.js versions RD\base_avant\versions.json <batch.json acceptés de ce passage…> ;
   jira_data = étapes a, a2, b, c, e, f, g SEULEMENT (pas l'étape d : ni « board_sprints » ni « epic_sprint_issues » dans le brut) ;
   étape c, « brut jira_data du lundi précédent » = le raw.json jira_data le plus récent sous PD\dist\lundi\ ou PD\dist\passages\.
   Puis, même en échec : node PD\tools\lundi.js versions RD\base_avant\versions.json <batch.json acceptés…> > RD\versions_courantes.json ;
   node PD\tools\cadence.js lecture <adaptateur> <passage> <heure> <ok|partiel|echec> <écritures acceptées>
   RD\versions_courantes.json RD\<adaptateur>\lecture.json PP\02_Modele\schema.json ["<cause>"] et ArtifactData batch de ce
   fichier. Un adaptateur en échec n'arrête pas les suivants ; Jira data sans Jira réussi : échec « dépend de Jira ».
4. RD\statut.json : {"passage","date","adaptateurs":[{"nom","statut","cause","ecrits"}]}.
5. Réponse finale (≤ 4 lignes, français) : passage, adaptateurs ok / échec avec cause, nombre d'écritures. Aucun autre fichier.
```
