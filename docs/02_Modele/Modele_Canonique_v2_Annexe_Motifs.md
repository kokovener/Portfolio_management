# Modèle canonique v1 · Annexe motifs

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
