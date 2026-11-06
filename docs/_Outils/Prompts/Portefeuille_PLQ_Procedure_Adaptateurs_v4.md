# Portefeuille PLQ — Procédure des adaptateurs v4

> Lue par le prompt du lundi (`Portefeuille_PLQ_Tache_Lundi_v19`, étape 2) et par les passages (`Portefeuille_PLQ_Tache_Passage_v8`) : le dernier `_vN` hors `_Archives/` fait foi. Toute modification = `_v5` ici.
> v1 (2026-11-02, `05_Pilotage/Optimisation_Requetes_v1.md`, lot 4) : « Écriture en base » et étape 2 extraites du prompt Lundi v18 sans en changer le sens, paramétrées (RD, BASEVAL, PASSAGE) ; règles R1, R4–R7 et gardes S3 ; courriels MEP incrémentaux (S4) ; fiches Jira v11, Smartsheet v7 ; références des adaptateurs déplacées du contexte du prompt du lundi (le passage ne lit plus ce prompt, R10).
> v2 (2026-11-03, Franck : « lecture Jira data par script, sans transcription manuelle ») : Jira data lu par la page « Collecteur Jira » (connecteur Atlassian appelé par la page, réponses brutes en base) puis `tools/jira_data_collecte.js` ; plus aucune transcription du brut Jira data ; étapes a–g et d inchangées dans leur JQL. Fiche `04_Adaptateurs/Adaptateur_Jira_v13.md` ; motifs J30–J35 dans son annexe.

> v3 (2026-11-05, Franck) : sources MEP — calendrier « Calendar - MEP » plus lu ; courriels = dossier Outlook « MEP » + destinataire adresse-masquee@exemple.test, sans `query` « MEP » ; confirmations de Franck lues par `adapt_jira.js` dans `config/mep_confirmations.json`. Fiche `04_Adaptateurs/Adaptateur_Jira_v13.md` ; motifs J38–J42.

> v4 (2026-11-05, Franck, suite au passage jeudi 13 h 02) : Smartsheet — Master lu en UN appel avec `columns` (12 colonnes, plafond 166 lignes, 99 lues) ; gates lues en UN appel, filtre `Jalon` IN les 5 libellés exacts (dont la variante « (KICKOFF ÉQUIPE) ») + contrôle 1 ligne par (entité, gate) ; clé « derniere_maj » nommée. Pour la forme des appels Smartsheet, cette procédure prime sur la fiche v8 §1. Motifs S25–S27 dans `04_Adaptateurs/Adaptateur_Smartsheet_v8_Annexe_Motifs.md`.
```
== Paramètres (fournis par le prompt appelant) ==
RD       dossier du lancement (lundi : PD\dist\lundi\L\ ; passage : PD\dist\passages\D-<passage>-HHMM\)
BASEVAL  base de validation (lundi : RD\snap\base_avant.json ; passage : RD\base_avant.json)
PASSAGE  argument passage de cadence.js lecture (lundi | quotidien | jeudi | demande)
Le prompt appelant fournit aussi D (date du jour), la liste ordonnée des adaptateurs dus (cadence.js plan) et
RD\base_avant\ (export des 17 collections + versions.json). PD, PP, G : voir le prompt appelant.
Dans le shell Linux, PD = /sessions/<session>/mnt/Projets_Dev--Portefeuille_PLQ, PP = …/mnt/Portefeuille_PLQ, G = …/mnt/Goutte2.1.

== Références des adaptateurs ==
- Fiches (§1 chaîne, §2 règles) : PP\04_Adaptateurs\Adaptateur_Artefacts_v3.md, Adaptateur_{Miro,Gantt}_v1.md, Adaptateur_Outlook_v3.md,
  Adaptateur_Smartsheet_v8.md et Adaptateur_Jira_v13.md (§1, §1c sources MEP et §1b data).
- Forme exacte du brut attendu par chaque adaptateur : Smartsheet = PD\dist\passages\2026-10-29-demande-r50-1623\smartsheet\raw.json
  (94 lignes, colonne Portefeuille, profondeur, gates, commentaires) ; Jira data = produit par PD\tools\jira_data_collecte.js (v2, aucune transcription) ;
  les autres = brut de référence PD\dist\runs\2026-10-27\ (jira_raw.json avec ses « queries », artefacts_raw\read.json,
  outlook_raw.json, miro_raw.json + miro_frame.svg) ; Gantt = PD\dist\runs\2026-10-30\ajout-methane-p2\gantt\raw\ (read.json +
  methane-gantt.drawio). Lis-le avant de lire la source (une fois par session).
- Identifiants : Smartsheet Goutte21_Master 230627583414148 et Jalons_Entites 2733930749841284 (lecture seule ; appelle d'abord
  get_resource_guide intents ['smartsheet-intelligence']) · Jira GOU21 board 38, épopée MEP GOU21-1651 · feeds inscrits :
  PP\04_Adaptateurs\Feeds_Inscrits_v2.md · Team : le dernier G\01_Gouvernance\Team_G2.1_v*.xlsx hors _Archives (Nom, Prenom,
  Role seulement) · ledgers : G\Daily_Brief\_ledger\AAAA-WNN.md · Miro : board « Rétro G2.1 S<N> » le plus récent, cadre
  « Actions » · départs : PD\config\team_departs.json.
- Gardes et fenêtres : node PD\tools\garde.js (fenetre | dernier | smartsheet | jira_data | gantt), décrit en tête du script.

== Écriture en base, toujours ainsi ==
`node PD\tools\lundi.js writes <batch.json> <dossier>\w` écrit un fichier par document et affiche les lots `writes` (≤ 50,
file_path + if_version) à passer tels quels à ArtifactData batch, un appel par lot.
Versions : `ArtifactData list … out_dir` ne met pas la version dans les fichiers, seulement dans sa réponse : elles sont
recopiées une fois dans RD\base_avant\versions.json ; ensuite `node PD\tools\lundi.js versions RD\base_avant\versions.json
<batch.json acceptés…>` donne les versions courantes (une écriture épinglée = +1, une création = 1). Écris ce résultat dans
base\versions.json de chaque adaptateur.

== Règles communes (R1, R5, R6) ==
R1  Amorce, faite par le prompt appelant juste après le calcul du plan (bash) et la lecture de cette procédure, AVANT tout appel d'outil MCP : UN SEUL
    ToolSearch groupé (« select: » avec les noms complets tels que listés dans les outils différés de la session) chargeant
    ArtifactData, les outils propres au prompt appelant (lundi en mode ENVOI : teams_send_channel_message) et ceux de TOUS
    les adaptateurs du plan. Par adaptateur :
    smartsheet = get_resource_guide, get_sheet_version, get_sheet_summary, get_sheet_aggregates, find_in_sheet, get_cell_history, execute_discussions_read ;
    jira = Atlassian executeRead, searchJiraIssuesUsingJql, getJiraIssue, discover + M365
    outlook_email_search, teams_list_channel_messages ; jira_data(_reel) = searchJiraIssuesUsingJql (garde) + mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer (collecteur ; déjà chargés si gantt est au plan) ;
    gantt = tous les outils mcp__Claude_Browser__ listés + M365 read_resource ;
    outlook(_equipe) = search_people, find_meeting_availability ; miro = board_search_boards, canvas_search, canvas_read_as_svg ;
    feries (lundi) = outlook_calendar_search ; artefacts = outil Artifact (déjà chargé).
R6  Chaque adaptateur : `mkdir -p RD/<nom> && TZ=America/Toronto date +%Y-%m-%dT%H:%M%:z > RD/<nom>/debut.txt` dans le MÊME bloc
    parallèle que le premier appel outil de l'adaptateur. read_at du brut et <heure> de la commande lecture = le contenu de
    ce fichier, jamais une heure de mémoire ni estimée.
R5  Chaque adaptateur : collecte tous ses appels outil d'abord ; aucun bash entre deux appels outil du même adaptateur, sauf la
    pagination qui dépend d'un résultat et les commandes des gardes (écriture de garde.json / meta.json, garde.js, fenetre,
    dernier) qui décident de la suite, et pour Jira l'écriture de mep_sources_new.json + mep_merge.js avant « ledger_keys »,
    pour le Gantt le contrôle base64 -d | gunzip | sha256sum avant un second essai ; raw.json écrit en une seule commande (Write ou un seul bash), puis l'adaptateur.
Garde vraie (code 0 de garde.js) : le brut repris est dans RD\<nom>\ ; lance quand même l'adaptateur et la validation sur
    ce brut (aucun appel outil : ses signaux restent au rapport et au digest) ; 0 écriture → lecture « inchange » ; s'il émet
    des écritures (base changée entre-temps, ex. saisie dans Gérer), écris-les → lecture « ok », cause « brut repris (garde) ».

== Étape 2 — adaptateurs ==
Liste et ordre : ceux du plan (cadence.js plan, champ adaptateurs ; config PD\config\cadence.json). jira_data_reel = jira_data
AVEC l'étape d ; jira_data = étapes a, a2, b, c, e, f, g SEULEMENT (sans « board_sprints » ni « epic_sprint_issues » :
l'adaptateur garde alors le réel déjà en base) ; outlook_equipe = Outlook sans disponibilités :
node PD\tools\adapt_outlook.js --equipe team_raw.json base out schema.json.
Après chaque adaptateur, même en échec : node PD\tools\lundi.js versions RD\base_avant\versions.json <batch.json acceptés…>
> RD\versions_courantes.json ; node PD\tools\cadence.js lecture <adaptateur> PASSAGE <contenu de RD\<nom>\debut.txt>
<ok|partiel|echec|inchange> <écritures acceptées> RD\versions_courantes.json RD\<nom>\lecture.json PP\02_Modele\schema.json
["<cause>"] puis ArtifactData batch de ce fichier (writes tels quels). « inchange » = garde vraie (règle « Garde vraie » plus haut), 0 écriture,
compte comme une lecture fraîche ; statut.json porte le même statut. Pour chacun, dans RD\<nom>\ :
lis la source selon la fiche §1 ; enregistre le brut dans la forme du brut de référence (c'est une transcription fidèle de la
sortie de l'outil : mêmes champs, mêmes valeurs, rien d'interprété ; les horodatages de la source y restent tels quels, « Z »
compris — la règle « jamais de Z » vaut pour la base et les documents, pas pour le brut ; seul le SVG Miro est enregistré octet
pour octet) ; copie RD\base_avant\<collections lues> dans base\ (réexporte plutôt par ArtifactData list une collection qu'un
adaptateur précédent de ce lancement vient d'écrire, ex. sprints avant Miro) et pose base\versions.json (commande `versions`) ;
lance l'adaptateur ; valide ; écris out\batch.json.

- smartsheet :
    Garde (S3), premier bloc parallèle : date (R6) + get_resource_guide + get_sheet_version 230627583414148 + get_sheet_version
    2733930749841284 + execute_discussions_read list_discussions {sheet_id: 230627583414148, target_type: "SHEET"}.
    Écris RD\smartsheet\garde.json {"sheet_version","gates_sheet_version","commentaires":[[rowId, commentId, texte, auteur,
    createdAt]…]} puis node PD\tools\garde.js smartsheet RD :
      code 0 → brut précédent repris dans RD\smartsheet\raw.json (read_at = debut.txt) : aucune lecture des lignes ; base,
               adapt_smartsheet et validation comme ci-dessous (règle « Garde vraie »).
      code 1 → lecture complète ci-dessous ; le brut porte « sheet_version », « gates_sheet_version » (de garde.json) et
               « commentaires » (déjà lus : list_discussions n'est pas rappelé).
    TOUTES les lignes : get_sheet_summary sans filtre, AVEC columns = [« ID », « Nom », « Niveau », « Portefeuille »,
    « Phase actuelle », « Trimestre cible », « Début prévu », « Fin prévue », « % avancement », « Notes hebdo », « Top risque »,
    « Dernière MAJ »] (sans columns, les 25 colonnes plafonnent la réponse à ~80 lignes ; avec, plafond 166 au 5 nov.).
    isSampled doit valoir false ET rowsActual = rowsInSheet ; sinon, UNE 2e passe dans le même adaptateur : même appel +
    filtre « ID » NOT_IN (ID déjà lus) ; encore incomplet = statut « echec ». Champs du brut de
    référence + « portefeuille »: true si la colonne Portefeuille existe et est cochée ; historique des cellules % et Phase
    (get_cell_history) des lignes qui deviennent items : L/Sub-L actifs ou déjà en base, lignes cochées, ligne d'un item dont
    un lien porte rowId=. La phase d'une ligne parent vide est déduite par l'adaptateur (pas par toi).
    Hiérarchie réelle (R50) : find_in_sheet sheet 230627583414148, term « L », columns [1499755846078340] (ID), 4 appels avec
    filter « =COUNT(ANCESTORS([ID]@row)) = 0 », « = 1 », « = 2 », « >= 3 » → champ « profondeur » 0 / 1 / 2 / 3 de chaque ligne
    du brut (la somme doit faire le nombre de lignes, sinon statut « echec ») ; sans lui, L8A/L8B/L8C retombent sous L8.
    Colonnes Début prévu / Fin prévue / Dernière MAJ → « debut_prevu » / « fin_prevue » / « derniere_maj » (AAAA-MM-JJ ;
    cellule vide = clé absente). Puis Jalons_Entites : get_sheet_summary
    filtres « ID Entité » IN (<ID des lignes cochées Portefeuille ou reliées par rowId=>) ET « Jalon » IN [« BA-3 BRD validé
    client », « AC-4 GO Dev formel », « AC-4 GO Dev formel (KICKOFF ÉQUIPE) », « QA-2 UAT OK préprod », « QA-3 MEP réussie »]
    (libellés exacts : IN ne fait pas de « commence par »), columns ID Entité, Jalon, Statut, Date prévue, Date check ; un seul
    appel (48 lignes au 5 nov.). Contrôle, sur les entités renvoyées ET sur celles du brut précédent : exactement 1 ligne par
    (entité, gate). 0 ligne → get_sheet_aggregates group_by « Jalon », filtre « ID Entité » EQUAL <entité> : un libellé qui
    commence par le code manquant → get_sheet_summary de cette entité, filtre « ID Entité » EQUAL <entité> ET « Jalon » EQUAL
    <ce libellé> ; aucun → gate absente. 2 lignes → garde la cochée (sinon la 1re). Tout cas → signal
    `gate_libelle_inconnu` (entité, libellé) au digest ; la liste des 5 libellés se corrige en _v5.
    Code de gate = les 4 premiers caractères du libellé : « gates » =
    [{entite, gate:"ba-3"|"ac-4"|"qa-2"|"qa-3", rowId, coche, date_prevue, date_check}] (forme du brut de référence).
    Le get_sheet_summary du Master et les 4 find_in_sheet partent dans un seul bloc parallèle ; puis, dans un 2e bloc,
    get_sheet_summary de Jalons_Entites (ses ID viennent du Master lu) et les get_cell_history.
    Commentaires (R27) : « commentaires » [[rowId, commentId, texte, auteur, createdAt]] pour chaque commentaire de
    list_discussions (get_discussion si les commentaires manquent ; liste vide = aucun commentaire, à écrire quand même).
    base = items, risques, jalons, attentes.
    node PD\tools\adapt_smartsheet.js raw.json base base\versions.json out
    puis python3 PD\tools\validate_model.py schema.json out\doc.json BASEVAL
- jira       : connecteur Atlassian, `executeRead` avec `responseFields` (la recherche complète dépasse la taille de
    sortie) ; requêtes = « queries » du brut de référence ; lis d'abord les ledgers pour les clés GOU21 hors épopée.
    Ledgers = les 5 semaines ISO qui finissent par la semaine courante (ex. le 2 nov. : W41–W45).
    Passe les 5 chemins même si le dernier n'existe pas encore (le briefing quotidien l'écrit après 7 h) : l'adaptateur
    le saute et émet le signal `ledger_absent` ; il refuse seulement si aucun ledger n'existe.
    Fenêtre des courriels (S4) : node PD\tools\garde.js fenetre RD → « jira_depuis » (= lu_le de la dernière lecture ok de
    jira dans RD\base_avant\lectures, −1 j) ; null = aucune lecture ok : D−30 j, sans fusion, comme avant.
    Sources MEP (D18 v8, AVANT adapt_jira ; 1er appel de chaque source dans un seul bloc parallèle avec la date (R6) et les
    premières requêtes Jira, SAUF « ledger_keys » (elle attend le fichier fusionné) ; aucun retry : une source vide ou en échec = notée dans « queries », jamais rejouée ; seule la
    pagination des courriels fait d'autres appels) → RD\jira\mep_sources_new.json (forme exacte de
    PD\dist\runs\2026-10-30\mep_sources\raw.json, lis-le d'abord ; données personnelles : jamais commité, jamais cité au digest) :
      · plus de calendrier (Franck, 5 nov. 2026 : jamais disponible) ; aucun champ « calendar » dans le brut ;
      · courriels, 2 lectures dans le même bloc, SANS query ni order (Franck, 5 nov. 2026 : tout ce qui passe par miseenprod) :
        outlook_email_search folderName "MEP", afterDateTime = jira_depuis (D−30 j si null), limit 25 ; et
        outlook_email_search recipient "adresse-masquee@exemple.test", même afterDateTime, limit 25 ; pagine chacune avec
        offset = nextOffset tant qu'il existe, au plus 8 pages → [[receivedDateTime, senderName, subject, summary]] tels
        que lus, les deux lectures concaténées (mep_merge.js retire les doublons) ; n'en retire aucun ; une lecture
        tronquée est signalée `courriels_partiels` ;
      · Teams : teams_list_channel_messages teamId b5a64c3d-a885-4880-bddb-84cf680fac0a, channelId
        19:ae8d0be389654709aac0f7900adff90a@thread.tacv2, limit 50 ; garde messageType "message" créés après D−30 j →
        [[createdDateTime, from.displayName, subject, bodyPreview sans balises HTML]].
    Fusion (S4, dès les sources M365 lues, AVANT la requête « ledger_keys » ci-dessous : les clés citées se cherchent dans le
    fichier fusionné RD\jira\mep_sources.json, pas dans la seule lecture du jour ; si jira_depuis non null) : node PD\tools\mep_merge.js <sortie de « node PD\tools\garde.js dernier mep RD »>
    RD\jira\mep_sources_new.json D RD\jira\mep_sources.json (sans précédent : « - ») ; si jira_depuis est null :
    copie mep_sources_new.json en mep_sources.json.
    Jira : ajoute à raw.json « mep_tickets_hors_epopee » = même appel et mêmes responseFields que « mep_tickets » (forme
    {key, summary, status, cat, assignee, status_changed, versions_in_description}), jql project = GOU21 AND summary ~ "MEP"
    AND (parent != GOU21-1651 OR parent is EMPTY) AND updated >= -30d (liste vide = [] ; 0 ticket au 30 oct.) ; et toute clé
    GOU21 citée par un courriel ou un post (Billet de MEP : GOU21-…) absente des tickets lus → dans la requête « ledger_keys »
    (signal `mep_cle_non_lue` sinon).
    node PD\tools\adapt_jira.js raw.json base out --sources=RD\jira\mep_sources.json <ledgers> ; puis la même validation
    (doc + BASEVAL). Sans mep_sources.json (connecteur M365 en panne) : lance sans --sources ; l'adaptateur le dit (signal
    `sources_mep_absentes`).
- jira_data  : après l'écriture de Jira (réexporte sprints). DERNIERE = « jira_data_depuis » de node PD\tools\garde.js fenetre RD
    (lu_le le plus récent entre lecture.jira-data et lecture.jira-data-reel au statut ok, −1 j ; null = aucune lecture ok).
    Garde (S3, jamais pour jira_data_reel : l'étape d du lundi est due ; DERNIERE null = pas de garde) : premier bloc
    parallèle = date (R6) + un seul searchJiraIssuesUsingJql searchResultMode count
    « project = GOU21 AND updated >= "<DERNIERE>" » ; puis node PD\tools\garde.js jira_data RD <count> :
      code 0 (0 ticket ET carte `sprints` tirée de RD\jira\raw.json identique au brut jira_data le plus récent) → ce brut
               repris dans RD\jira_data\raw.json (read_at = debut.txt) : pas de collecte ; base, adapt_jira_data et
               validation comme ci-dessous (règle « Garde vraie »).
      code 1 → collecte ci-dessous.
    Collecte PAR SCRIPT (v2) — tu ne transcris AUCUNE réponse Jira et tu ne les lis pas.
    COLLECTEUR = https://claude.ai/artifact/7rXqx5fsSENbJ1Db8Na1mG (page « Collecteur Jira » de Franck, source
    PD\collecteur\jira_data_collecteur.html ; ce n'est pas un artefact source : y écrire la demande est permis).
    A = RD\jira_data (jira_data) ou RD\jira_data_reel (jira_data_reel) ; REEL = « --reel » pour jira_data_reel, sinon rien.
    Chemins : bash prend la forme Linux (/sessions/<session>/mnt/Projets_Dev--Portefeuille_PLQ/…), ArtifactData (file_path,
    out_dir) la forme Windows de PD (C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\…) : même dossier, deux écritures.
    1. jira_data_reel (pas de garde) : la date R6 (A\debut.txt) s'écrit dans le MÊME bloc que l'ArtifactData get de l'étape 2
       — RUN se calcule après. jira_data : debut.txt est déjà écrit avec le count de la garde.
       RUN = <D>-<passage>-<HHMM de A\debut.txt> ; node PD\tools\jira_data_collecte.js demande RD RUN REEL → A\demande.json
       (sprints de RD\jira\raw.json, items à épopées de RD\base_avant, DERNIERE, clés de support encore ouvertes du brut précédent).
    2. ArtifactData get COLLECTEUR demandes/courante (lis sa version), puis ArtifactData set demandes/courante, file_path =
       A\demande.json, if_version = cette version (document absent : sans if_version).
    3. mcp__Claude_Browser__navigate COLLECTEUR : la page démarre seule (demande « a_faire » sans état, ou état « en_cours »
       de plus de 10 min) et lit a, a2, b, c, e, f, g (+ d si REEL) par le connecteur, pages suivies jusqu'à isLast, comptes de
       recoupement compris. Puis, au plus 12 fois : mcp__Claude_Browser__computer wait 10 s ; ArtifactData get COLLECTEUR
       etats/RUN ; arrête dès « fini » ou « echec » (essais réels : 16 à 20 s).
       - aucun état après 3 attentes : mcp__Claude_Browser__computer screenshot (scale 0.5). Dialogue « Cet artéfact utilise des
         connecteurs » = statut « echec », cause « collecteur : autorisation du connecteur à redonner par Franck » — ne clique
         JAMAIS dessus. Sinon une seule fois navigate de nouveau et reprends le compte.
       - encore « en_cours » ou sans état à la 12e attente : statut « echec », cause « collecteur : pas fini en 2 min ».
    4. « fini » → ArtifactData get etats/RUN out_dir A\export puis ArtifactData list collection lectures/RUN/reponses,
       query {"limit":1000}, out_dir A\export ; node PD\tools\jira_data_collecte.js assemble A\export RD REEL →
       A\raw.json + rapport d'une ligne. Code ≠ 0 (collecte « echec », export incomplet, chaîne de pages coupée, recoupement
       de compte faux, REEL contraire à la demande) = statut « echec », cause = le message du script, aucune écriture.
       Ses « signaux » (clés de support précédentes non relues) vont au digest.
    Forme du brut (rappel, produite par le script) : celle de PD\dist\runs\2026-11-03\collecteur\jira_data\raw.json
    (jira_data) et de PD\dist\runs\2026-11-03\collecteur_reel\jira_data_reel\raw.json (jira_data_reel, avec board_sprints et
    epic_sprint_issues) ; JQL de chaque étape : en tête de PD\collecteur\jira_data_collecteur.html.
    base = items, personnes, charges, stats_jira, listes_jira, attentes (réexportés) + versions.json ;
    node PD\tools\adapt_jira_data.js A\raw.json A\base A\out ; puis la même validation (doc + BASEVAL).
- artefacts  : chaque ligne « actif » de Feeds_Inscrits_v2 (y compris la roadmap de l'architecte, artefact de Personne_09 partagé
    avec Franck) : Artifact read (path index.html, out_dir RD\artefacts\raw\<dossier>), toutes les lectures dans un seul bloc
    parallèle avec la date (R6) — la lecture avec path rend le HTML brut même pour un artefact non possédé ; le résumé sans
    path dit à tort « JSON absent », ne t'y fie jamais ; recopie dans raw\read.json la version et le sha256 rendus par l'outil
    (forme : PD\dist\runs\2026-11-02\archi\artefacts_raw\read.json).
    node PD\tools\adapt_artefacts.js PP\04_Adaptateurs\Feeds_Inscrits_v2.md raw base out schema.json
    (un bloc daté après la lecture est signalé, pas bloquant ; format programme-1.0 = bloc donnees-programme de l'architecte,
    traduit par l'adaptateur, jamais par toi) ; base = items, jalons, risques, attentes, dependances, livrables, gantts
    (un bloc peut porter son Gantt : gantts/<préfixe>.gantt, épinglé comme le reste) ; validation (doc + BASEVAL).
    Roadmap de l'architecte au digest (lundi, sans rien ajouter à la main) : signaux archi_changement (ses « changements de la
    semaine »), archi_nouveau (tâche ou projet apparu), recul (fin prévue repoussée), archi_incoherence (statut contraire aux
    dates), archi_axe, archi_dependance, archi_etape (étape ou fenêtre d'un projet changée), archi_supprime (tâche retirée :
    jalon supprimé, K14) ; les alertes de recul ≥ 5 j o. et de jalon dépassé des projets feed.archi.* viennent des règles.
- gantt      : registre PP\04_Adaptateurs\Gantts_Inscrits_v1.md (lignes « actif » ; aucune = statut ok, 0 écriture).
    Lecture « navigateur » (.drawio) : outils mcp__Claude_Browser__ (chargés à l'amorce R1).
    Garde (R7), pour chaque ligne : preview_start sur l'URL Fichier (même bloc que la date R6) ; page de connexion Microsoft au
    lieu du fichier = statut « echec » IMMÉDIAT, cause « session SharePoint expirée », sans capture d'écran, sans second essai,
    sans rien saisir. Sinon javascript_tool : métadonnées seulement, fetch("<site>/_api/web/GetFileByServerRelativeUrl('<chemin
    serveur décodé de l'URL>')?$select=TimeLastModified,ETag", Accept application/json;odata=nometadata) → écris
    RD\gantt\meta.json {"<item>":{"modifie_le":"<TimeLastModified tel que lu>","etag":"<ETag>"}} (toutes les lignes) puis
    node PD\tools\garde.js gantt RD :
      code 0 (TimeLastModified identique au read.json Gantt le plus récent sous PD\dist\) → brut et sha256 repris dans
               RD\gantt\raw\ (read_at = debut.txt) : 0 appel outil de plus ; adapt_gantt comme ci-dessous (règle « Garde vraie »).
      code 1 → lecture du contenu : javascript_tool : t = await (await fetch("<site>/_api/web/GetFileByServerRelativeUrl('<chemin
               serveur décodé>')/$value")).text() ; sha256 de t (crypto.subtle, UTF-8) ; gzip (CompressionStream) puis base64 →
               recopie le base64 dans RD\gantt\raw\<fichier>.gz.b64, puis base64 -d | gunzip > RD\gantt\raw\<fichier> et
               sha256sum : différent du navigateur = recommence une fois, sinon « echec ».
    Lecture « file:///… » (.json) : read_resource sur l'URI ; enregistre le texte tel quel ; sha256sum.
    RD\gantt\raw\read.json = {"read_at":"<contenu de debut.txt>","gantts":{"<item>":{"fichier","format","web_url",
    "modifie_le":"<TimeLastModified tel que lu (Z compris ; l'adaptateur convertit en heure du Québec)>","etag","sha256"
    (obligatoire)}}} ; forme : PD\dist\runs\2026-10-30\ajout-methane-p2\gantt\raw\read.json ; base = items, jalons, gantts
    (réexportés) + versions.json ;
    node PD\tools\adapt_gantt.js PP\04_Adaptateurs\Gantts_Inscrits_v1.md RD\gantt\raw base out PP\02_Modele\schema.json
    (fichier inchangé = 0 écriture ; Gantt refusé = signal gantt_ignore, le Gantt en base reste affiché)
- outlook    : search_people par « Prénom Nom », sinon par le nom de famille seul, sinon par le prénom ; ni trouvé ni
    homonyme sûr = null ; la ligne « CDP » et les personnes de team_departs.json = null. Premières recherches de toutes les
    personnes dans un seul bloc parallèle, replis ensuite groupés.
    python3 PD\tools\read_team.py <Team xlsx> directory.json team_raw.json ;
    find_meeting_availability un appel par jour ouvré, D → D+6 semaines, 8h30–16h30, créneaux 60 min, participants
    = ceux du brut de référence, tous dans un seul bloc parallèle ; dans `slots`, tous les statuts non libres de chaque créneau.
    node PD\tools\adapt_outlook.js team_raw.json raw.json base out schema.json
- miro       : board_search_boards « Rétro G2.1 » → plus grand S<N> ; canvas_search puis canvas_read_as_svg sur le
    cadre Actions, SVG enregistré tel quel ; node PD\tools\adapt_miro.js raw.json base out schema.json
- feries (2f, CHAQUE lundi seulement — PASSAGE = lundi —, après les adaptateurs, sans enregistrement `lectures`) :
    outlook_calendar_search sur le calendrier de Franck, requêtes « Fermeture » puis « Férié » (un bloc parallèle), de D à
    D+190 j ; transcris { read_at, events: [{subject, start, end, all_day}] } dans RD\feries\calendar_raw.json (seuls les sujets
    qui COMMENCENT par Fermeture / Férié comptent ; l'adaptateur filtre) ; base = absences (réexportées) + versions.json ;
    node PD\tools\adapt_feries.js PD\config\feries.json RD\feries\calendar_raw.json base out PP\02_Modele\schema.json D
    puis ArtifactData batch. Digest : une ligne par signal `fermeture_non_relue` (jamais supprimée), `config_courte` (ajouter
    les fériés de l'année dans PD\config\feries.json) et `fetes_sans_fermeture` (rappel à Franck).
Un adaptateur qui échoue (outil indisponible, refus de l'adaptateur, validateur qui ne tourne pas, conflit de version
persistant après une relecture) n'écrit rien et n'arrête pas les autres : statut « echec » + cause en une ligne.
Lot refusé après un lot accepté : statut « partiel » + nombre d'écritures passées. Miro refuse si Jira a échoué et
que le sprint suivant manque : c'est attendu, note la cause « dépend de Jira » ; Jira data sans Jira réussi : échec
« dépend de Jira ».
Tous les adaptateurs n'écrivent que ce qui change (Smartsheet et Jira aussi depuis la v1 de cette procédure, R9) : 0 écriture
est normal ; la fraîcheur est portée par la lecture (`lectures`), y compris « inchange ».
```
