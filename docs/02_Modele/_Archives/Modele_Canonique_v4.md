# Portefeuille PLQ — Modèle canonique v4

> Étape 1 · 2026-10-27 · Schéma exécutable : `schema.json` · Exemples : `exemples/*.json` · Champs des maquettes : `Maquettes_Champs_v1.md` · Validation : `Projets_Dev\Portefeuille_PLQ\tools\validate_model.py` · Motifs : `Modele_Canonique_v4_Annexe_Motifs.md` · v1 gelé le 2026-10-27 · **v2 le 2026-10-28 (OK Franck « lot 2 », retours R02 R03 R05 R09 R10)** · v3 le 2026-10-28 (R06) : `item.phase_deduite` · **v4 le 2026-10-28 (R06, 2e partie) : prévu vs réel — `jalon.precision`, `stat_jira.fenetre_reelle`, gates Goutte 2.1** ; v4 ⊃ v3 ⊃ v2 ⊃ v1. Tout changement = v5 + écart motivé en annexe.

## 1. Règles

| Règle | Énoncé |
|---|---|
| Un document | Feed, sortie d'adaptateur ou base entière ont la même forme : `{modele:"1"|"2", source, <collections>}` ; toute collection est optionnelle |
| Identifiants | `^[a-z0-9][a-z0-9._-]+$`, préfixe = origine : `goutte21.l8d`, `jira.gou21-11325`, `feed.expertg1.go-nogo`, `saisie.codes-taxes`, `team.personne-09`, `run.ti`, `dep.…` |
| Provenance | Chaque enregistrement porte `source {systeme, ref, lu_le, par}` ; `systeme` ∈ smartsheet · jira · jsm · artefact · outlook · miro · ledger · saisie · calcul |
| Périmètre Atlassian | Le connecteur de la session ne lit que GOU21 : SDD, PLQ et JSM STG21 ne sont pas lus ; MEP run = ledger ; support extranets = tickets GOU21 portant un lien web vers STG21 (v2) |
| Calculé, jamais saisi | `item.sante` (admise seulement dans un document `source.systeme = calcul`, refusée dans un feed, un adaptateur, une saisie) · `priorite.score` · `risque.score` · `pct_avancement` (source ou jalons faits / total) · `stat_jira` (lu, jamais saisi) |
| Dates | `AAAA-MM-JJ` ; horodatages ISO avec décalage `-04:00` obligatoire, `Z` refusé |
| Fraîcheur | `item.updated_at` = dernier changement de fond ; Smartsheet : `Dernière MAJ` si remplie, sinon dernière modification des cellules % et Phase (S9, v3) ; > 14 j → alerte (D8) |
| Jalon (D4) | Événement oui/non à une date. Goutte 2.1 : 4 gates par livrable — BA-3 scope figé · AC-4 GO Dev · QA-2 UAT · QA-3 MEP (id `<item>.ba-3` …) ; les 14 autres jalons d'entité restent du suivi d'équipe (le %) |
| Prévu / réel | Prévu = Smartsheet au mois (fenêtre : Début / Fin prévus du Master ; gate : Date prévue de Jalons_Entites → dernier jour du mois). Réel = gate : Date check ; travail : sprints Jira des épopées (`stat_jira.fenetre_reelle`) |
| Cascade | Calculée à l'affichage, jamais stockée : fenêtre prévue d'un parent sans la sienne = min début / max fin des enfants ; réel = union du sien et des enfants ; gate d'un parent sans les siennes = la plus tardive des enfants (faite si toutes faites) ; retard = jours ouvrés après la date prévue |
| Recul | `jalon.date_initiale` et `livrable.date_initiale` gardent la 1re date ; recul ≥ 5 j ouvrés → alerte ; prédécesseur reculé → successeur en alerte (D16) |
| Santé D8 | rouge : jalon dépassé · risque ≥ 15 · fraîcheur > 14 j ; jaune : risque ≥ 10 · attente > 5 j ouvrés après `attendue_le` ; vert sinon ; une alerte de dépendance ou de recul s'affiche, elle ne colore pas |
| Base d'artefact | Une collection `db` par entité, même nom que la clé du document ; `doc_id` = `id` |
| Feed | Bloc `<script type="application/json" id="portfolio-feed">` = un document de ce schéma ; invalide → ignoré et signalé dans le digest |

## 2. Entités (14)

| Entité | Obligatoire | Facultatif | Sources |
|---|---|---|---|
| **item** | id · nom · type (programme·projet·run) · voie (scrum·flux) · etape (idee·qualifie·planifie·actif·termine) · promu · source · updated_at | parent · priorite{valeur,urgence,effort,score} · sante{couleur,motifs,calcule_le} · responsable · fenetre{debut,fin} · pct_avancement · phase_source · **phase_deduite** · contenu_sprint · personnes[] · note_lundi · support[] (run) · liens[] · **epics_jira[]** · **rang** | smartsheet (L, Sub-L, lignes cochées `Portefeuille`) · artefact · jira GOU21 · ledger (run) · saisie |
| **jalon** | id · item · nom · date · statut (fait·en_cours·a_venir·a_risque·depasse) · source | date_initiale · fait_le · **precision** (jour·mois) | artefact · saisie · smartsheet (gates, Jalons_Entites) |
| **risque** | id · item (null = portefeuille) · titre · probabilite 1–5 · impact 1–5 · source | score · mitigation · ouvert | artefact · smartsheet (`Top risque`, P·I saisis) · saisie |
| **attente** | id · item · tiers · objet · attendue_le · source | recue_le | artefact · ledger (BLOQ) · saisie |
| **dependance** | id · type (bloque·alimente·attend) · de{kind,id} · vers{kind,id} · source | note | saisie · artefact ; `kind` ∈ item · jalon · livrable |
| **livrable** | id · nom · statut · source | item · date · date_initiale · responsable | artefact (feed architecte) seulement |
| **mep** | id · date · systeme · statut (planifiee·prete·completee·annulee) · source | ticket · libelle · item · responsable | jira GOU21 (versions) · ledger (G1, IIS, extranets) |
| **action_retro** | id · board · texte · statut (a_faire·en_cours·fait) · source | sprint · owner | miro |
| **charge** | id · item · periode{sprint·semaine, ref} · role · mode (jours_personne·wip·etp·**points**·**taches**) · valeur · source | personne · **nom** · **tickets** · **sans_points** · **faites** · **en_cours** | jira (points d'équipe · sous-tâches par personne) · calcul · saisie |
| **sprint** | id · nom · debut · fin · etat (futur·actif·clos) · source | objectif · jours_ouvres · reserve_run_pct | jira (board 38, `customfield_10020`) |
| **personne** | id · nom · role · voie (scrum·flux·hors) · source | wip_limite | Team_G2.1_vN.xlsx |
| **absence** | id · personne (null = collective) · debut · fin · jours_ouvres · source | libelle | outlook · saisie (congés) |
| **stat_jira** | id · item · epics[] · tickets{total,faits,en_cours,a_faire} · source | sprint{ref,tickets,faits,points,points_faits} · **fenetre_reelle{debut,fin,jusqu_au,sprints,ouverts}** | jira (épopées de l'item, calendrier des sprints) |
| **instantane** | id · date · pris_le · items[] · source | sources_ok · sources_total | calcul (lundi 7 h), jamais supprimé |

## 3. Champs possédés par le portefeuille (Gérer)

| Entité | Saisissables | Lecture seule (provenance + date affichées) |
|---|---|---|
| item | nom · type · parent · voie · etape · promu · priorite (3 notes) · responsable · fenetre (sauf Goutte 2.1 quand Smartsheet la porte) · note_lundi · liens · epics_jira · rang | sante · pct_avancement · phase_source · phase_deduite · contenu_sprint · support · updated_at |
| jalon · risque · attente · dependance | tout, sur tout item, quand la source n'en fournit pas (Smartsheet n'a aucun jalon au grain L) | enregistrements venant d'un feed, de Smartsheet ou du ledger |
| charge | mode etp / wip (voie flux) | jours_personne (calcul) |
| personne · absence | wip_limite · absence collective | nom · role · absences Outlook |
| livrable · mep · action_retro · sprint · stat_jira · instantane | — | tout |

## 4. Exemples (`validate_model.py` : OK, 5 documents, références croisées cohérentes ; 2 cas négatifs refusés)

| Fichier | Données réelles | Données posées, à confirmer dans Gérer |
|---|---|---|
| `exemple_l8d.json` | L8 (2 %), L8D (3 %, AF / UX), lignes Smartsheet, risque `Top risque` de L8 | P4·I4 du risque · jalon gate AC-4 14 nov. · priorité · charge S20 |
| `exemple_expert_g1.json` | 8 jalons, 2 risques, 3 attentes = `ROWS` du Gantt S1 | priorité 4·4·2 · WIP |
| `exemple_run_ti.json` | 4 MEP du ledger W44 · S19 actif (sprint 71) · équipe xlsx | support par extranet · dates S20 |
| `exemple_codes_taxes.json` | pré-lecture CDP 9 juin 2026 · recommandation S2 | dates décision CDP / BRD / MEP · livrable ADR archi (feed à brancher) |
| `exemple_base_calcul.json` | santé calculée et instantané : seul document où `sante` est admise | — |

## 5. Changements v2 (2026-10-28)

| # | Changement | Retour | Effet |
|---|---|---|---|
| V1 | `item.epics_jira[]` (clés `GOU21-n`), saisi dans Gérer | R02 | rattache les tickets Jira à l'item : sprint, charge, statistiques |
| V2 | `item.rang`, ordre manuel parmi les frères | R09 | la grille se réordonne par ▲▼ ; sans rang = après, par nom |
| V3 | `charge.mode` ∈ + `points` (équipe, par item) · `taches` (sous-tâches par personne) ; `charge.nom` · `tickets` · `sans_points` · `faites` · `en_cours` | R05 + flux Jira Franck | points = mesure d'équipe ; charge d'une personne = ses sous-tâches ; assigné hors équipe gardé sous son nom |
| V4 | Entité `stat_jira` (collection `stats_jira`) | R10 | bloc « Data Jira » du projet : avancement des tickets, contenu du sprint |
| V5 | `item.support[]` lu dans Jira (liens STG21) | R03 | remplace les chiffres de maquette ; tendance dès la 2e lecture |
| V6 | `modele` ∈ {"1","2"} | — | feeds v1 (Expert G1) inchangés |
| V8 | v4 : `jalon.precision` · `stat_jira.fenetre_reelle` · `modele` ∈ {…,"4"} ; `item.fenetre` lue dans Smartsheet pour Goutte 2.1 | R06 (2e partie) | Gantt prévu (barre claire) vs réel (trait Jira) ; 4 gates par livrable ; cascade aux niveaux supérieurs |
| V7 | v3 : `item.phase_deduite` (booléen, lu) ; `modele` ∈ {"1","2","3"} | R06 | ligne Smartsheet sans phase : phase = la moins avancée des enfants actifs, affichée « (déduite) » |

Propositions en attente : S5 (lien `rowId=` utilisé tel quel, champ dédié non créé), F1 (fraîcheur source seule, appliquée par l'adaptateur), A11, E1–E13. S9 reprise en v3 (règle Fraîcheur).
