---
name: ajout-projet-portefeuille
description: Ajoute un nouveau projet au Portefeuille PLQ à partir d'un nom, d'une ou plusieurs épopées Jira GOU21 et, s'il existe, d'un Gantt (drawio PLQ-Forge ou JSON dans SharePoint) — crée l'item, lie les épopées, inscrit le Gantt, le lit une première fois et vérifie la fiche projet. Déclencher sur « ajoute le projet X au portefeuille », « nouveau projet dans le portefeuille », « j'ai un nouveau projet avec une epic et un Gantt », « inscris ce Gantt », ou quand Franck donne un nom de projet + une clé GOU21-… + un lien SharePoint .drawio/.json.
---

# Ajout d'un projet au Portefeuille PLQ (Kickoff D21, D22)

Résultat attendu, identique d'un projet à l'autre : un item `saisie.<nom>` dans la base de l'artefact, ses épopées liées, son Gantt
inscrit et affiché en bas de la fiche projet, ses jalons (acceptation, MEP) dans la santé. Livrables en français, conversation dans
la langue de Franck. Ne pose une question que si l'info manque et change le résultat (ex. aucune épopée ni Gantt fourni) ; sinon tranche
et écris l'arbitrage dans le compte rendu final.

## Contexte (ne pas redemander)
- Artefact : https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB (base ArtifactData, 17 collections dont `items`, `jalons`, `gantts`).
- PD = C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\ (code, git) ; PP = C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Portefeuille_PLQ\.
  Shell : /sessions/<session>/mnt/Projets_Dev--Portefeuille_PLQ et …/mnt/Portefeuille_PLQ. `pip install -q "jsonschema>=4.18" --break-system-packages`.
- Fiche à suivre pour la lecture du Gantt : PP\04_Adaptateurs\Adaptateur_Gantt_v1.md ; registre : PP\04_Adaptateurs\Gantts_Inscrits_v1.md.
- Jira : cloudId 2c850515-a3e1-4f5c-b6ff-0a435839fcfb, projet GOU21 seulement.
- Heure : `TZ=America/Toronto date +%Y-%m-%dT%H:%M%:z` (jamais Z, jamais inventée). D = date du jour. RD = PD\dist\runs\D\ajout-<slug>\.

## Interdits
Jamais d'écriture dans Jira, SharePoint, Smartsheet ni dans le fichier Gantt ; jamais de suppression ; rien de Goutte2.1\01_Gouvernance\Recrutements\.

## Déroulé
1. **Base** : ArtifactData list `items`, `jalons`, `gantts` (limit 1000, out_dir RD\base) ; recopie les versions → RD\base\versions.json.
   Un item du même nom ou portant déjà l'épopée = arrêt, dis à Franck d'utiliser Gérer.
2. **Jira** (par épopée) : getJiraIssue (view evidence) → type Epic dans GOU21, assigné, statut, liens. Épopée liée (« relates to ») dont
   le résumé commence par le même nom de projet et qui n'est rattachée à aucun item = ajoutée (arbitrage noté). Enfants :
   searchJiraIssuesUsingJql `parent in (<épopées>)` → au moins un ticket « En cours » ou fait, ou Gantt commencé avant D = étape `actif`, sinon `planifie`.
3. **Gantt** (s'il est fourni) — procédure §1 de la fiche Adaptateur_Gantt_v1 :
   - `.drawio` : navigateur intégré (ToolSearch « mcp__Claude_Browser__ », max_results 64), `preview_start` sur le lien ; le lien de partage
     redirige vers la bibliothèque : lis le chemin serveur dans l'URL (`id=`), puis javascript_tool : `fetch(<site>/_api/web/GetFileByServerRelativeUrl('<chemin>')/$value)`,
     métadonnées `?$select=TimeLastModified,ETag,Author/Title&$expand=Author`, sha256 (crypto.subtle), gzip + base64 ; recopie le base64 dans RD\gantt\raw\<fichier>.gz.b64,
     `base64 -d | gunzip > RD\gantt\raw\<fichier>`, `sha256sum` = celui du navigateur (sinon recommence une fois, puis arrêt).
   - `.json` : URI connecteur `file:///<driveId>/<chemin>` (driveId : `fetch('<site>/_api/v2.0/drive')` dans le navigateur) ; read_resource ; texte tel quel.
   - RD\gantt\raw\read.json = {"read_at","gantts":{"<item id>":{"fichier","format","web_url","modifie_le" (tel que lu, Z compris : l’adaptateur convertit),"sha256" (obligatoire)}}}.
4. **Item** : écris RD\spec.json {nom, lu_le, epics_jira, etape, voie ("scrum" si épopée GOU21, sinon "flux"), parent (donné par Franck, sinon null =
   hors programme), responsable (donné, sinon l'assigné de l'épopée), gantt {format, fichier (URL web du fichier), lecture ("navigateur" ou l'URI file:///),
   proprietaire (auteur du fichier), raw (fichier local), modifie_le}} ;
   `node PD\tools\ajout_projet.js RD\spec.json RD\base PP\02_Modele\schema.json RD\item` (code 3 = refus : rapporte la cause, n'écris rien) ;
   puis ArtifactData batch de RD\item\batch.json (création, sans if_version).
5. **Registre** : ajoute la ligne RD\item\registre_ligne.md à la fin du tableau de Gantts_Inscrits_v1.md (une ligne par projet ; pas de nouvelle
   version du registre pour une ligne ajoutée).
6. **1re lecture** : copie RD\item\item.json dans RD\base\items\ et ajoute "items/<id>":1 à RD\base\versions.json ;
   `node PD\tools\adapt_gantt.js PP\04_Adaptateurs\Gantts_Inscrits_v1.md RD\gantt\raw RD\base RD\gantt\out PP\02_Modele\schema.json` ;
   `node PD\tools\lundi.js writes RD\gantt\out\batch.json RD\gantt\w` puis ArtifactData batch de ces lots ;
   `node PD\tools\lundi.js versions RD\base\versions.json RD\gantt\out\batch.json > RD\versions.json` ;
   `node PD\tools\cadence.js lecture gantt skill <read_at du Gantt> ok <n> RD\versions.json RD\gantt\lecture.json PP\02_Modele\schema.json` puis ArtifactData batch de ce fichier.
7. **Vérification** (essayer plutôt que relire) : navigateur intégré sur https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB (la page est
   dans un cadre : le lien `#projet/…` n'y route pas, et get_page_text ne voit pas son contenu) ; attends ~10 s, clique le projet dans la grille,
   défile et fais une capture : la fiche affiche le nom, les épopées, « Gantt du projet » et les jalons du Gantt. Carte absente alors que la base a le `gantt`
   = page antérieure au modèle v15 : `python3 PD\tools\build_interface.py PP\02_Modele\schema.json`, Artifact read de l'URL (lire tout le fichier rendu),
   puis publish de
   PD\dist\portefeuille.html sur l'URL (sans capabilities, sans icon).
8. **Compte rendu** (≤ 8 lignes) : item créé (id, étape, parent, responsable), épopées, Gantt (onglets, tâches, jalons et dates), signaux
   de l'adaptateur (plan ancien, fenêtre), arbitrages pris sans Franck et leur motif, et ce qui reste à Franck dans Gérer (priorité, parent).
   Commit git dans PD si du code ou un fichier suivi a changé (`git add` ciblé, message en anglais).
