# Modèle canonique v14 · Annexe motifs (reprend v1 à v14)

> À n'ouvrir que pour rouvrir un choix. Un motif ne se supprime jamais : il se déplace.

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| M1 | Un seul schéma pour feed, adaptateur et base | Le feed de l'architecte, la sortie d'un adaptateur et la base doivent se valider avec le même outil ; sinon trois schémas dérivent | Schéma « feed » distinct du schéma « base » | Plan Goutte v6→v7 : deux référentiels = deux dérives |
| M2 | 13 entités, pas 9 | Le prompt en nomme 9 ; `sprint`, `personne`, `absence` sont nécessaires au calcul de capacité D7 (jours-personne − absences, WIP par personne) ; `livrable` est la cible de dépendance D16 vers le feed architecte | Mettre absences et sprints dans `charge` (charge devient illisible) · personne en texte libre (WIP par personne impossible) | — |
| M3 | `source` sur chaque enregistrement, pas seulement sur le document | Un item de la base est assemblé de plusieurs sources (% Smartsheet, jalons feed, saisie Gérer) ; la provenance affichée dans Gérer (D3, étape 2) exige le grain enregistrement | Provenance au niveau document | — |
| M4 | `additionalProperties: false` partout | Un feed avec un champ inconnu doit échouer à la validation plutôt que passer en silence (D12 : parser cassé en silence) | Schéma permissif | — |
| M5 | `score` facultatif mais vérifié | Le portefeuille calcule ; un feed peut l'omettre ; s'il le fournit, le validateur vérifie la formule | Score obligatoire (feed alourdi) · score interdit (perte de lisibilité) | — |
| M6 | `sante` dans l'item, jamais dans `source` | D8 : santé calculée ; Smartsheet a une colonne RYG déclarée, elle est ignorée (lue nulle part) | Lire le RYG Smartsheet comme repli | — |
| M7 | `date_initiale` sur jalon et livrable | Seule façon de mesurer un recul sans historique de cellule ; la règle « ≥ 5 j ouvrés » de l'étape 4 en dépend | Lire l'historique de cellule Smartsheet à chaque lundi (coûteux, absent des feeds) | — |
| M8 | `support[]` porté par un item `run`, pas une entité | 10 extranets × 3 chiffres = un tableau, pas un item chacun (D17 : item unique « Run — Extranets ») | Entité `extranet` · un item par extranet | — |
| M9 | `charge.mode` ∈ jours_personne · wip · etp | D7 interdit les heures ; `etp` apparaît dans la maquette projet (0,6 ETP) et se convertit en jours sans heures | Heures | Plan Goutte v7 R8 : worklogs incomplets |
| M10 | Ids avec préfixe de source | Permet de reconnaître l'origine sans ouvrir `source`, et évite les collisions `L8D` (Smartsheet) / `L8D` (Jira epic) | Ids numériques | — |
| M11 | Pas d'entité `decision` | Non demandée ; la maquette projet en affiche 3 ; ajout en v2 si Franck le demande (§6 du modèle) | L'ajouter d'office | — |
| M12 | Dates posées dans deux exemples | Codes de taxes n'a aucune source datée pour décision CDP / BRD / MEP ; L8D n'a pas de jalon dans Smartsheet (`Jalon prochain` vide). Les valeurs sont celles des maquettes, marquées « à confirmer » | Laisser les exemples sans jalon (ne prouverait pas D4 ni D16) | — |
| M14 | `sante` admise seulement si `source.systeme = calcul` | Relecture du 2026-10-27 : le schéma laissait un feed déclarer une santé, et deux exemples le faisaient — contraire à D8. Règle ajoutée au validateur, exemple `exemple_base_calcul.json` ajouté pour prouver le cas positif | Interdire `sante` partout (la base ne pourrait plus la stocker) | Erreur payée : un validateur qui annonce une règle dans sa docstring sans l'appliquer donne un « OK » qui ne prouve rien ; règle : chaque règle annoncée a son cas négatif exécuté |
| M15 | `risque.item` et `absence.personne` nullables | Maquette : risques « Transverse » et « Gouvernance » sans item ; « Congés S23 » sans personne | Item fictif « Portefeuille » · une absence par personne pour un congé collectif | — |
| M16 | Jalons saisissables sur tout item | Smartsheet n'a aucun jalon au grain L (`Jalon prochain` vide sur 94 lignes) ; sans saisie, les L n'auraient jamais de jalon ni de santé rouge « jalon dépassé » | Jalons seulement sur items saisis ou promus (version initiale du §3) | — |
| M17 | `action_retro.statut` (3 états) au lieu de `fait` (booléen) ; `mep.ticket` facultatif | La maquette sprint affiche fait · en cours · à faire ; le ledger a des MEP sans ticket (« MEP G1 ») | Booléen `fait` du mandat | — |
| M18 | §5 et §6 déplacés dans `Maquettes_Champs_v1.md` ; colonnes « Ce qu'il prouve » et « Alternative » déplacées ici | Document principal à deux écrans (CLAUDE.md) ; les justifications sont des motifs | Garder tout dans un document | — |
| M19 | Exemples : ce que chacun prouve | L8D : programme + L + Sub-L de Smartsheet, risque `Top risque`, charge Scrum · Expert G1 : feed d'artefact, jalons, risques, attentes, WIP flux · Run TI : run, MEP du ledger, support par extranet, sprint, personnes · Codes de taxes : item promu, 4 jalons D4, dépendances `livrable → jalon` et `item → item` · Base calcul : santé et instantané | — | — |
| M20 | Décisions liées hors v1 | Entité non demandée ; alternative : entité `decision` en v2. Livrable archi : alternative « saisir le livrable à la main » rejetée, le modèle réserve `livrable` au feed (D3) | — | — |
| M21 | `item.budget` retiré | Décision Franck 2026-10-27 ; D15 reporte déjà le budget heures ; un texte libre sans calcul ne sert aucune règle | Garder le texte libre | — |
| M22 | SDD, PLQ, JSM STG21 non lus en v0 — **écart à D11 / D17** | Cause : le connecteur Atlassian de la session est limité à un seul projet, Franck a choisi GOU21 (2026-10-27). Conséquence : MEP run = ledger (déjà complet sur W44) ; support extranets = feed de l'artefact Triage STG21 ou saisie. Proposition pour le kickoff v2 : D11 « Jira GOU21 seulement ; SDD / PLQ / STG21 via ledger et artefact Triage » | Ouvrir un 2e connecteur · lire JSM par le navigateur (fragile, hors règle D12) | Constat étape 1 : `project = STG21` renvoyait 0 ticket sans erreur — un périmètre de connecteur se manifeste par un résultat vide, pas par un refus ; règle : tester chaque projet Jira nommé dans une décision avant de l'y inscrire |
| M13 | Validateur exécuté sur un cas négatif | Un validateur qui n'a jamais refusé un document ne prouve rien ; test : champ inconnu, id invalide, score faux → 3 erreurs, exit 1 | Relire le schéma | Règle de travail : essayer les commandes au lieu de relire |

## Constats de lecture des sources (utiles à l'étape 3)

| Source | Constat |
|---|---|
| Smartsheet `Goutte21_Master` | 94 lignes, 11 L + 6 Sub-L ; `Phase actuelle` vide sur L8, L8D, L8E (donc « L actif = phase ≠ Backlog et ≠ Done » laisse passer les vides : à trancher) ; `Jalon prochain`, `Dépendances`, `Dernière MAJ` vides partout ; `Statut santé` RYG déclaré |
| Jira GOU21 | sprint = `customfield_10020` (S19 actif, id 71, board 38) ; points = `customfield_10036` ; epics nommés `[L8D-Dev] …` → rattachement item par préfixe |
| JSM STG21 | `project = STG21` renvoie 0 ticket avec ce compte : clé ou droit à confirmer via `maj-triage-stg21` |
| Artefact Expert G1 | pas encore de bloc feed ; `ROWS` lisible mais non parsé (D12) ; le bloc à coller sera fourni à l'étape 3 |
| Team_G2.1_v1.xlsx | 16 personnes, rôles en texte libre (« Dev Back », « expert ») → table de correspondance vers `personne.role` ; « Kowalzzyk » à corriger dans le xlsx (source, pas touchée) |
| Ledger W44 | lignes `MEP | date | libellé | ticket | responsable | statut` directement mappables sur `mep` |


## v2 — 2026-10-28 (retours itération 1, lot 2)

| # | Décision | Motif | Option écartée | Erreur payée / preuve |
|---|---|---|---|---|
| M23 | v2 additive (sur-ensemble), `modele` accepte "1" et "2" | Le feed Expert G1 est collé par Franck en v1 ; une rupture l'aurait invalidé sans gain | `modele` const "2" partout | — |
| M24 | `epics_jira` tableau, pas une épopée unique | Un item porte plusieurs épopées (L0 : 9934, 9781, 8354) | `epic_jira` chaîne | Lecture 28 oct. |
| M25 | Charge Jira en `points`, pas en `jours_personne` | Jira donne des Story Points, pas de temps ; convertir inventerait un taux (règle « aucune heure saisie ») | Conversion points → jours | — |
| M26 | `stat_jira` entité séparée plutôt que champs sur `item` | Un item Smartsheet garde sa provenance ; un enregistrement = une source | Champs `item.jira{}` | Règle Provenance §1 |
| M27 | `rang` saisi, l'ordre de priorité D9 reste calculé | Franck réordonne à la main dans une section (R09) ; la priorité Pn n'est pas modifiée | Trier la grille par Pn | — |
| M28 | Support lu par les liens STG21 de GOU21 | Remplace l'artefact Triage / la saisie prévus en v1 (M22) | Feed de l'artefact Triage STG21 | GOU21-11137 ↔ STG21-286 (exemple fourni par Franck) |

## v3 (atelier R06, 2026-10-28)

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| M30 | `item.phase_deduite` booléen plutôt que suffixe dans `phase_source` | La page affiche « (déduite) » et Gérer valide chaque enregistrement contre le schéma (`additionalProperties: false`) : un champ inconnu ferait refuser toute saisie sur L8D | « Dev (déduite) » dans `phase_source` (casse la règle `/dev/i` de couleur et les filtres) · suffixe dans `source.ref` (invisible) | Constat R06 : un champ ajouté en base avant la page refuse les saisies Gérer de l'ancienne page ; règle : publier la page au nouveau schéma **avant** d'écrire le nouveau champ |
| M31 | S9 reprise dans la règle Fraîcheur | La règle v2 citait « date de modification de la ligne », que le connecteur n'expose pas ; l'adaptateur appliquait déjà l'historique des cellules | Laisser l'écart déclaré | — |

## v4 (atelier R06, 2e partie, 2026-10-28)

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| M32 | Jalon portefeuille = 4 gates (décision Franck) | Les 18 jalons d'entité sont un suivi d'équipe (le %) ; le pilotage a besoin des points de décision : scope figé, GO Dev, UAT, MEP | 18 jalons (Gantt illisible) · MEP seule (aucun signal avant la fin) | Constat : `Date check` vide sur 1 064 / 1 064 lignes de Jalons_Entites — on savait si un jalon était fait, jamais quand ; règle : un jalon sans date n'est pas un jalon (D4) |
| M33 | Prévu au mois (décision Franck), `date` = dernier jour du mois | Une date au jour serait inventée ; le dernier jour évite un faux retard en cours de mois ; `precision` garde l'information pour l'affichage (« fin nov. ») | Trimestre (trop grossier pour une MEP) · jour | — |
| M34 | Réel du travail = sprints Jira des épopées, dans `stat_jira` (pas dans `item`) | Jira fait foi du sprint (R04) ; `stat_jira` est déjà « lu, jamais saisi » ; écrire dans `item` aurait mélangé source Smartsheet et source Jira sur le même enregistrement (limite K3) | Dates d'épopée Jira (vides : GOU21-9199 n'a ni start ni due date) · premier passage « En cours » (historique coûteux) | — |
| M35 | Cascade calculée, jamais stockée | Une valeur dérivée stockée dérive dès qu'un enfant change ; même règle que la santé (D8) | Écrire la fenêtre du parent en base | — |
| M36 | Réel d'un parent = union du sien et des enfants | L8D a une épopée propre (depuis le 18 août) mais son livrable codes de taxes a commencé le 28 juil. : le réel du parent doit couvrir le travail de ses livrables | Le sien seul (masquait 3 semaines de travail) | Erreur du test initial : supposé « enfants seulement » ; corrigé par le test sur données réelles |
| M37 | Dev-1 : % tickets Jira (faits / non annulés), points en complément | Réponse Franck : tout n'est pas estimé au début du Dev ; compter les tickets ne demande aucune estimation | Points seuls (faux 0 % tant que rien n'est estimé) | — |

## v5 (retour R30, 2026-10-28)

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| M38 | `etape` et `voie` lues pour tout item relié à une ligne Smartsheet, lecture seule dans Gérer (OK Franck) | Une valeur saisie au semis ne se périme jamais si rien ne la relit : la source dit AF / UX et l'épopée est au sprint, la page disait « planifié · flux » | Garder la saisie et signaler l'écart (le signal se perd dans le digest) · libellés seuls | « Codes de taxes » semé le 27 oct. en `planifie` / `flux`, puis relié par `rowId=` : l'adaptateur rafraîchissait phase et % mais protégeait l'étape (exception planifié → actif) et ignorait la voie. Règle : un champ que la source porte doit être relu par l'adaptateur, ou déclaré saisi dans §3 — jamais les deux |
| M39 | Voie = scrum pour toute ligne Goutte 2.1, sans tester les sprints Jira | Les lignes de Goutte21_Master sont développées dans GOU21 ; c'était déjà la valeur à la création ; tester les sprints obligerait l'adaptateur Smartsheet à lire la base Jira (couplage entre adaptateurs) | Voie scrum seulement si une épopée a un ticket dans un sprint (proposé à Franck, remplacé par plus simple, même résultat sur la base réelle) | — |

## v6 (retour R36, 2026-10-28)

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| M40 | Entité `lecture` : un document par adaptateur, réécrit | La fraîcheur d'un bloc ne peut pas se lire dans les données : Jira data, Outlook et Miro n'écrivent que ce qui change, donc un `source.lu_le` ancien ne dit pas « pas relu » | Déduire la fraîcheur des `source.lu_le` (gardé comme repli tant qu'aucune lecture n'existe) · un document par passage (la base grossit sans lecteur) | — |
| M41 | `modele` « 5 » absent de l'énumération | v5 a changé une règle, pas le format : aucun document ne porte « 5 » | Ajouter « 5 » pour la symétrie | — |

## v7 (retours R32–R35, 2026-10-28)

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| M42 | Une liste par document, réécrite entière | Un ticket qui sort de « prêt » ou que le support ferme disparaît de la liste sans supprimer de document (la suppression demande l'accord de Franck) | Un document par ticket (documents périmés à supprimer ou à marquer) | — |
| M43 | Une seule entité pour R32, R33, R34 | Une seule évolution du modèle au lieu de trois (T14) | Champs ajoutés à `item.support` et à `sprint` | — |
| M44 | Ordre = ordre de lecture `ORDER BY Rank` (`rang`) | Franck (R34) : même ordre que Jira | Tri par statut ou par points | Les statuts portent des émojis (« PrêtPourSprint🚀 ») : la JQL par nom est refusée, on filtre par id (10020, 10021) |

## v8 (D7 v2, 2026-10-28)

Voir `01_Cadrage/Portefeuille_PLQ_Kickoff_v2_Annexe_Motifs.md` D7-v2 : la saisie WIP sans propriétaire est abandonnée ; un énuméré retiré exige de nettoyer la base AVANT de publier le schéma (sinon la base devient invalide à la validation du lundi).

## v9 (R27, 2026-10-29)

Voir `04_Adaptateurs/Adaptateur_Jira_v7_Annexe_Motifs.md` J-R27 et `Adaptateur_Smartsheet_v5_Annexe_Motifs.md` S-R27. Une attente lue n'est jamais supprimée : sa fin = `recue_le`.

## v10 (R27 bis, 2026-10-29)

Voir `04_Adaptateurs/Adaptateur_Jira_v8_Annexe_Motifs.md` J-R27b.

## v11 (R41, 2026-10-29)

| # | Écart | Cause | Option écartée | Erreur payée |
|---|---|---|---|---|
| M45 | Fériés lus d'un fichier versionné, plus saisis | v8 a retiré « Gérer équipe » (D7 v2) et avec lui la seule saisie d'absence collective ; Outlook ne porte aucun férié (recherche « férié », « Noël », « Fermeture » jusqu'au 7 mai 2027 : 0) | Rouvrir une saisie collective dans Gérer (réintroduit un écran retiré) ; lire le calendrier « Fêtes du Canada » (absent du compte) | Un retrait d'écran retire aussi les données qu'il était seul à produire : lister ce que l'écran écrivait avant de le retirer |
| M46 | Fermetures propres à PLQ = calendrier de Franck, sujet « Fermeture… » / « Férié… » | Franck (29 oct.) : « prends les jours du Québec, j'ajoute les autres au calendrier » ; filtre par préfixe pour ne pas prendre une réunion qui contient le mot | Toute journée entière de Franck (prendrait ses congés personnels pour toute l'équipe) | — |
| M47 | Vendredi saint retenu, lundi de Pâques non | Loi sur les normes : l'un ou l'autre au choix de l'employeur ; le vendredi par défaut | Les deux | — |
| M48 | Un enregistrement par jour, pas une période | Ajout ou retrait d'un jour de fermeture sans recalculer une période ; même plafond 1 j/jour que les absences personnelles | Période fusionnée (comme Outlook) | — |

## v12 (R40, 2026-10-29)

| # | Écart | Cause | Option écartée | Erreur payée |
|---|---|---|---|---|
| M49 | `action_retro.statut` passe de lecture seule à saisissable | Le statut était déjà écrit par la skill `maj-actions-retro` (même règle : statut seul, source Miro gardée) ; Franck (R40) veut le poser depuis la vue Sprint | Écrire le statut dans Miro (interdit : le portefeuille n'écrit jamais une source) | — |
| M50 | Un marqueur « Statut : » sur la carte Miro l'emporte | Miro reste la source de l'action ; le gabarit actuel n'a pas de marqueur, donc le choix de la page tient | La page l'emporte toujours (deux vérités divergentes sans signal) | — |
| M51 | « Rouvrir » remet à « à faire », pas « en cours » | Demande de Franck : faite ou à rouvrir ; « en cours » reste lisible depuis Miro | Cycle à 3 états | — |

## v13 (R37 R38, 2026-10-29)

| # | Écart | Cause | Option écartée | Erreur payée |
|---|---|---|---|---|
| M52 | `item.visible` facultatif, absent = visible | Aucun document existant à migrer ; la valeur par défaut demandée (case cochée) n'écrit rien | `visible: true` écrit sur tous les items (35 écritures pour rien) | — |
| M53 | Un item masqué masque ses descendants et leurs enregistrements | Un enfant visible d'un parent masqué apparaîtrait « hors programme » et trahirait le parent | Masquer l'item seul | — |
| M54 | Filtre dans `core.js` (`publicBase`), partagé page + digest | Une seule règle, testée une fois ; le digest ne peut pas diverger de la vue visiteur | Filtre écrit deux fois | — |
| M55 | Le feed d'artefact ne peut pas imposer `visible` | Champ possédé par Franck (ajouté à OWNED de l'adaptateur artefacts) | — | — |

## Historique des versions (déplacé du document principal le 2026-10-29, relecture au contexte neuf)

En-tête v1–v13 : Étape 1 · 2026-10-27 · Schéma exécutable : `schema.json` · Exemples : `exemples/*.json` · Champs des maquettes : `Maquettes_Champs_v1.md` · Validation : `Projets_Dev\Portefeuille_PLQ\tools\validate_model.py` · Motifs : `Modele_Canonique_v13_Annexe_Motifs.md` · v1 gelé le 2026-10-27 · **v2 le 2026-10-28 (OK Franck « lot 2 », retours R02 R03 R05 R09 R10)** · v3 le 2026-10-28 (R06) : `item.phase_deduite` · **v4 le 2026-10-28 (R06, 2e partie) : prévu vs réel — `jalon.precision`, `stat_jira.fenetre_reelle`, gates Goutte 2.1** · **v5 le 2026-10-28 (R30, OK Franck) : étape et voie lues pour un item relié à Smartsheet — règle seule, schéma inchangé** · **v6 le 2026-10-28 (R36, cadence) : entité `lecture`** · **v7 le 2026-10-28 (R32–R35) : entité `liste_jira`** · **v8 le 2026-10-28 (D7 v2) : WIP et ETP saisis retirés** (`charge.mode` sans wip·etp, `personne.wip_limite` supprimé) ; un document v7 qui en porte est refusé. · **v9 le 2026-10-29 (R27) : attentes lues dans Jira et Smartsheet** (règle seule, schéma inchangé). · **v10 le 2026-10-29 (R27 bis) : `liste_jira.nature` bloques ; ticket : parent · assigne · sous_tache**. **v11 le 2026-10-29 (R41) : fériés et fermetures = absences collectives lues** (règle seule, schéma inchangé). **v12 le 2026-10-29 (R40) : statut d'une action de rétro saisissable** (règle seule, schéma inchangé). **v13 le 2026-10-29 (R37) : `item.visible`, `modele` ∈ {…,"13"}**. Tout changement = v14 + écart motivé en annexe.

| # | Changement | Retour | Effet |
|---|---|---|---|
| V1 | `item.epics_jira[]` (clés `GOU21-n`), saisi dans Gérer | R02 | rattache les tickets Jira à l'item : sprint, charge, statistiques |
| V2 | `item.rang`, ordre manuel parmi les frères | R09 | la grille se réordonne par ▲▼ ; sans rang = après, par nom |
| V3 | `charge.mode` ∈ + `points` (équipe, par item) · `taches` (sous-tâches par personne) ; `charge.nom` · `tickets` · `sans_points` · `faites` · `en_cours` | R05 + flux Jira Franck | points = mesure d'équipe ; charge d'une personne = ses sous-tâches ; assigné hors équipe gardé sous son nom |
| V4 | Entité `stat_jira` (collection `stats_jira`) | R10 | bloc « Data Jira » du projet : avancement des tickets, contenu du sprint |
| V5 | `item.support[]` lu dans Jira (liens STG21) | R03 | remplace les chiffres de maquette ; tendance dès la 2e lecture |
| V6 | `modele` ∈ {"1","2"} | — | feeds v1 (Expert G1) inchangés |
| V7 | v3 : `item.phase_deduite` (booléen, lu) ; `modele` ∈ {"1","2","3"} | R06 | ligne Smartsheet sans phase : phase = la moins avancée des enfants actifs, affichée « (déduite) » |
| V8 | v4 : `jalon.precision` · `stat_jira.fenetre_reelle` · `modele` ∈ {…,"4"} ; `item.fenetre` lue dans Smartsheet pour Goutte 2.1 | R06 (2e partie) | Gantt prévu (barre claire) vs réel (trait Jira) ; 4 gates par livrable ; cascade aux niveaux supérieurs |
| V9 | v5 : item relié à une ligne Smartsheet (grain L ou saisi relié par `rowId=`) → `etape` lue de la phase (Done → terminé · Backlog / A Revoir → qualifié · sinon actif) et `voie` = scrum ; lecture seule dans Gérer | R30 | « Codes de taxes » passe actif / scrum ; un « planifié » saisi ne masque plus la source |
| V10 | v6 : entité `lecture` (collection `lectures`) · `modele` ∈ {…,"6"} | R36 | la page affiche « lu il y a … » et « périmé » par bloc selon `config/cadence.json` ; un passage qui n'écrit rien (données inchangées) compte quand même comme lu |
| V11 | v7 : entité `liste_jira` (collection `listes_jira`) · `modele` ∈ {…,"7"} | R32 R33 R34 | préparation du sprint futur dans l'ordre du backlog Jira ; noms et sprint des tickets de support |
| V12 | v8 : WIP et ETP saisis retirés (Kickoff v2, D7 v2) | R23 R24 R28 | tuile WIP, « Gérer · équipe », « charge saisie », onglet « Charge flux » et alerte WIP retirés ; 2 charges de test supprimées, `wip_limite` retiré de 3 personnes |
| V13 | v11 : fériés et fermetures lus (`ferie.*`, `fermeture.*`), écrits chaque lundi par `tools/adapt_feries.js` | R41 | Outlook ne porte aucun férié ; depuis la v8 aucune absence collective n'était saisissable : la capacité ignorait les Fêtes (S23 : 15 → 13 j par personne) |
| V14 | v12 : statut d'action de rétro saisi dans la page (seul champ écrit, source Miro gardée) | R40 | « Faite » / « Rouvrir » sans passer par la skill |
| V16 | v14 : alertes groupées et complètes ; fraîcheur 15 j ouvrés Smartsheet ou Jira ; tendance du support vs le lundi | R43 R44 | 11 alertes → 4 au 29 oct. |
| V15 | v13 : `item.visible` (Gérer, case cochée par défaut) | R37 R38 | item masqué pour les visiteurs et le digest ; bouton « Vue visiteur » |

## v14 (R43 R44, 2026-10-29)

| # | Écart | Cause | Option écartée | Erreur payée |
|---|---|---|---|---|
| M56 | Tendance du support vs le lundi, plus vs la veille | Depuis la cadence quotidienne (R36), « lecture précédente » = la veille : « = » ne disait plus rien ; la règle d'origine visait le lundi précédent | Tendance sur 7 jours glissants (pas de valeur stockée au bon jour) | Un changement de cadence change le sens de toute comparaison « vs lecture précédente » : les relire quand la cadence change |
| M57 | Activité Jira datée par la lecture, pas par le ticket | Le brut Jira data ne porte pas la date `updated` ; un ticket dans le sprint en cours suffit pour un seuil d'un sprint | Ajouter `updated` au brut (transcription plus lourde) | — |
| M58 | Attentes lues dans Jira exclues de l'alerte « attente » | Ce sont les tickets bloqués : déjà dans la ligne « bloqués du sprint » (Franck : clés seules, sprint seulement) | Double affichage | — |
| M59 | Les lignes « dépendance » disparaissent, remplacées par la chaîne du recul | 4 lignes pour une seule cause au 29 oct. | — | — |
