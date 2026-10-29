# Retours itération 1 — 2026-10-28

Une ligne par retour. Écran = où tu l'as vu. Prio : M (bloquant) · S (à faire) · C (confort).
Laisse vides les colonnes Impact et Statut : Claude les remplit au tri.

| ID | Écran / zone | Constat (ce que je vois) | Attendu (ce que je veux) | Prio | Impact (Claude) | Statut (Claude) |
|---|---|---|---|---|---|---|
| R01 | draw.io |  | A refaire car il n'est pas clair ni profetionnel, peut etre draw.io n'est pas le meilleur format a toi de décider|  | Doc · schéma de flux | Fait : `01_Cadrage/Portefeuille_PLQ_Flux_v3.html` (SVG dans une page, publiée en artefact) ; v2 .drawio archivé |
| R02 | Projet |  | on doit pouvoir lier une epic Jira a un projet |  | Modèle v2 (`item.epics_jira[]`) · Gérer | Fait (v12) : champ « Épopées Jira » · liens cliquables |
| R03 | Portefeuille / support |  | on peut seulement se connecter a l espage G2.1 et non a STG. pour connaire les tickets qui viennent de support il faut chercher les tickets dans Goutte2.1 avec un lien externe vers STG21. tu as un exemple dans  https://jira-plq.atlassian.net/browse/GOU21-11137 |  | Adaptateur Jira : lien web vers STG21 (vérifié sur GOU21-11137) | Fait (v12) : 2 demandes ouvertes — STG21-226 Région · STG21-206 Producteur ; périmètre Bug · Story · Tâche (réponse Franck) |
|R04|sprint / jalon | je vos les jalons de tous les projets| je devrais voir seulement ce qui est lié au sprint en cours ou au futur dans Jira. pour le sprint Jira est la source de vérité, c'ertain projet comme expertg1 ne sont pas dans le sprint et ne devrait pas apparaitre||Interface (filtre) puis Jira (épopées, R02) | Fait (v12) : un item n'entre dans le sprint que par ses tickets Jira |
|R05| sprint / capacité | je vois seulement Luc et moi | je devrais voir tout le monde Jira est la source||Adaptateur Jira (assignés du sprint) · modèle v2 (charge en points) | Fait (v12) : tableau par personne (assignés + équipe Scrum) |
|R06| poetefeuille| goutte 2.1 est mal organisé | il faut que l on travaille ensemble pour comprendre comment améliorer la source dans smartsheet ||Source Smartsheet · adaptateur Smartsheet v2 · modèle v3 | Atelier fait (28 oct.) en 2 parties : `05_Pilotage/Atelier_R06_Smartsheet_v2.md` · page v15 (phases, pause) puis v16-v17 (prévu vs réel, gates, % Jira) · commits f762dd8, cdc0ec6 ; reste S4, S5 (dates à saisir, Franck) |
|R07| portefeuille | tout est déplié pour les programmes | je veux que les niveaux soit en accordeon pour pouvoir déplier ou replier et voir les enfnats ||Interface | Fait (v10) |
|R08| portefeuille / charge par rôle | bloc de charge | pas necessaire ici, seulement pour la partie sprint ||Interface | Fait (v10) |
|R09| portefeuille / gantt | rank figé | je souhaite pouvoir réordonner des projets a l'intérieur d'une section||Modèle v2 (`item.rang`) · interface | Fait (v12) : ▲▼ au survol de la ligne |
|R10| projet / charge | c'est vide| il faudra se baser sur le lien de l'Epic Jira pour obtenir des statistiques de charges avancement etc. toutes cette partie pourrait devenir la partie Data Jira ||Modèle v2 (`stat_jira`) · adaptateur Jira · bloc « Data Jira » | Fait (v12) : avancement des tickets + sprint courant par personne |
|R11| projet / code de taxe | Pré-read CDP v1 4 scénarion v1 | ca sort d'o`, a quoi ca sert ? ||Données | Réponse : liens de l'exemple semé à l'étape 1 (docs du CDP du 9 juin) ; ils pointent vers les vrais fichiers |
|R12| projet | liens | non clicquable | ils doivent être clicable |||Données + interface : liens `file:///` remplacés par l'URL SharePoint ; tout lien non http(s) signalé | Fait (v10) · lien Gantt S1 testé |
|R13| sprint MEP c esprint ||||||À préciser (constat vide) | En attente — Franck : « ignorer pour l'instant » (28 oct.) |
|R14| Sprint | je vois le courant et le future sprint| j'aimerais aussi avoir la possibilité de voir le précédent sprint. par defaut on arrive sur le sprint courant||Adaptateur Jira (dernier sprint clos) · interface | Fait (v10) : S18 · S19 · S20 |
|R| ||||||
|R| ||||||
|R| ||||||

## Lots

| Lot | Retours | Contenu |
|---|---|---|
| 1 | R04 (filtre) · R07 · R08 · R12 · R14 | Interface + données, sans toucher au modèle gelé — **livré v10, 28 oct.** (commits 960d64a, b4d889b) |
| 2 | R02 · R03 · R04 (Jira) · R05 · R09 · R10 | Modèle v2 + adaptateur Jira v2 (Jira = vérité du sprint) — **livré v12, 28 oct.** ; tâche du lundi v2 |
| 3 | R01 | Schéma de flux refait — **livré 28 oct.** |
| Hors lot | R06 · R11 · R13 | Atelier (fait 28 oct.) · réponse · question |

## Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| T1 | R04 lot 1 : la vue Sprint ne montre que les items Scrum du programme Goutte 2.1 ; les items et le WIP de voie flux en sortent (Expert G1 disparaît du sprint) |
| T2 | R05 : la demande Jira se mesure en points par personne (`customfield_10036`), pas en jours-personne — d'où le modèle v2 |
| T3 | R03 : un ticket GOU21 est « support » s'il porte un lien web vers `plq-supportg2.atlassian.net/browse/STG21-*` ; extranet déduit du titre (règle `systemeOf` existante) |
| T4 | R14 : l'adaptateur lit le dernier sprint clos en plus de l'actif et du prochain ; la vue arrive toujours sur le sprint actif |
| T5 | R07 : programmes ouverts, sous-niveaux repliés par défaut ; l'état plié/déplié est mémorisé par navigateur |
| T6 | R12 : un lien non web reste affiché, grisé avec ⚠ et la raison, au lieu d'être un bouton mort |
| T7 | R02 : épopées initiales posées par Claude, à corriger dans Gérer : 9199 → Codes de taxes · 9604 → L8D (**erreur : c'est « grilles de taxes », déplacée le 28 oct., atelier R06 C11**) · 9934, 9781, 8354 → L0 · 5466 → Run extranets |
| T8 | R04 : le repli « voie Scrum » du lot 1 est retiré — sans ticket Jira dans le sprint, un item (et ses jalons) n'y figure pas |
| T9 | R05 : un assigné hors Team_G2.1 (Personne_15) apparaît sous son nom, marqué « hors équipe » |

## Limites connues (relecture au contexte neuf, 28 oct.)

| # | Limite | Suite |
|---|---|---|
| K1 | Points (demande) et jours disponibles (capacité) ne se comparent pas ; pas de vélocité | v3 : vélocité des 3 derniers sprints → points disponibles |
| K2 | Data Jira : comptes de tickets seulement, pas de points d'épopée ni d'historique | v3 si utile |
| K3 | La lecture du support réécrit la provenance de tout l'item Run extranets | v3 : provenance par champ (proposition S5) |
| K4 | Horodatages des adaptateurs en −04:00 alors que l'heure normale commence le 1er nov. (L5) | décision Franck |
| K5 | 22 tickets de S20 sans points : charge S20 sous-estimée tant que le grooming n'est pas fait | équipe |

## Réponses de Franck (28 oct., après lot 2)

| # | Réponse | Appliqué |
|---|---|---|
| F1 | Personne_14 = coordination | Ligne « coordination » grisée dans la capacité, pas de dispo affichée (v13) |
| F2 | Suppression de la charge maquette `goutte21.l8d.s20.dev` | Supprimée (accord explicite) |
| F3 | Seuls les tâches parentes et les bugs portent des points | Colonne « Sans points » = à estimer ; sous-tâches non lues (v13) |
| F4 | DoD du sprint = dès « Prêt pour Preprod » | Fait = catégorie Done (Prêt pour Preprod, En validation preprod, Prêt pour déploiement, Terminé) ; Annulé exclu partout (v13) |
| F5 | Support : Bug, Story ou Tâche, toute épopée | Lecture incrémentale + balayage initial 187 tickets |

| # | Constat | Suite |
|---|---|---|
| K6 | `jira.s20.personne-14.goutte21` (1 ticket, GOU21-7753 annulé) reste en base : un enregistrement non relu n'est jamais supprimé sans accord | Accord de suppression ? |

## Flux Jira expliqué par Franck (28 oct.) — appliqué v14

| # | Règle | Effet dans le portefeuille |
|---|---|---|
| F6 | Tâche parente assignée au coordonnateur, groomée par l'équipe qui met les points | Points = mesure d'équipe par item et sprint (« Équipe »), jamais d'une personne |
| F7 | Sous-tâches QA, FE, BE, UX, archi assignées aux personnes | Charge par personne = nombre de sous-tâches (à faire · en cours · faites) |
| F8 | Statuts : Prêt pour grooming → Prêt pour sprint → À faire → En cours → … | Faite = dès « Prêt pour Preprod » ; annulées exclues |

| # | Constat | Suite |
|---|---|---|
| K7 | La page Confluence « 2 - Flow Jira » (confluence-l-02, sur site) n'est pas joignable depuis mes outils | Rien à faire : la description ci-dessus suffit |
| K8 | 10 anciens enregistrements « points par personne » (avant ce flux, dont celui de K6) | Supprimés avec l'accord de Franck (28 oct.) |
| T10 | R01 : draw.io remplacé par une page HTML (SVG écrit à la main) : lisible sur claude.ai et sur téléphone, partageable par lien, versionnable en texte ; contenu mis à jour (modèle v2, 6 adaptateurs, Jira data, support STG21) |

## Agent analyste (décision Franck 28 oct.)

| # | Décision | Appliqué |
|---|---|---|
| F9 | Adaptateurs = code (pas d'agents) ; un seul agent analyste après eux | Étape 3b de la tâche du lundi dès le 2 nov. : `lundi.js dossier` → sous-agent `_Outils/Prompts/Portefeuille_PLQ_Analyste_v1.md` → `digest --signaux` (≤ 5 signaux prouvés, jamais écrits en base) |
| F10 | Essai sur la base réelle du 28 oct. | 5 signaux : codes de taxes 11 / 46 pts à mi-sprint · S20 pas prêt (9 / 13 sans points) · architecte sur trois fronts · gate L8D du 14 nov. sans ticket en S20 · 6 MEP échues « planifiée » |
| F11 | Boucle qualité | Franck juge chaque signal « juste / faux » (étape 5) → `verdicts.json` ; un signal juste 3 lundis de suite devient une règle en code |
