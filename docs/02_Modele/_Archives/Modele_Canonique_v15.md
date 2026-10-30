# Portefeuille PLQ — Modèle canonique v15

> 2026-10-30 (v15 : Gantt de projet) · Schéma exécutable : `schema.json` · Exemples : `exemples/*.json` · Champs des maquettes : `Maquettes_Champs_v1.md` · Validation : `Projets_Dev\Portefeuille_PLQ\tools\validate_model.py` · Motifs et historique des versions v1–v15 : `Modele_Canonique_v15_Annexe_Motifs.md` · v1 gelé le 2026-10-27 · Tout changement = v16 + écart motivé en annexe.

## 1. Règles

| Règle | Énoncé |
|---|---|
| Un document | Feed, sortie d'adaptateur ou base entière ont la même forme : `{modele, source, <collections>}` (`modele` ∈ liste du schéma, 1 → 15) ; toute collection est optionnelle |
| Identifiants | `^[a-z0-9][a-z0-9._-]+$`, préfixe = origine : `goutte21.l8d`, `jira.gou21-11325`, `feed.expertg1.go-nogo`, `saisie.codes-taxes`, `team.personne-09`, `run.ti`, `dep.…` |
| Provenance | Chaque enregistrement porte `source {systeme, ref, lu_le, par}` ; `systeme` ∈ smartsheet · jira · jsm · artefact · outlook · miro · ledger · saisie · calcul · **sharepoint** (v15) |
| Périmètre Atlassian | Le connecteur de la session ne lit que GOU21 : SDD, PLQ et JSM STG21 ne sont pas lus ; MEP run = ledger ; support extranets = tickets GOU21 portant un lien web vers STG21 (v2) |
| Calculé, jamais saisi | `item.sante` (admise seulement dans un document `source.systeme = calcul`, refusée dans un feed, un adaptateur, une saisie) · `priorite.score` · `risque.score` · `pct_avancement` (source ou jalons faits / total) · `stat_jira` (lu, jamais saisi) |
| Dates | `AAAA-MM-JJ` ; horodatages ISO avec le décalage du Québec (`-04:00` EDT, `-05:00` EST du 1er nov. au 14 mars 2027), `Z` refusé |
| Fraîcheur | `item.updated_at` = dernier changement de fond ; Smartsheet : `Dernière MAJ` si remplie, sinon dernière modification des cellules % et Phase (S9, v3) · **v14 : âge = jours ouvrés depuis le plus récent de `updated_at` et de la dernière lecture Jira data où l'item (ou un descendant) a des tickets de ses épopées dans le sprint ; alerte > 15 j ouvrés (Kickoff D8 v4)** |
| Jalon (D4) | Événement oui/non à une date. Goutte 2.1 : 4 gates par livrable — BA-3 scope figé · AC-4 GO Dev · QA-2 UAT · QA-3 MEP (id `<item>.ba-3` …) ; les 14 autres jalons d'entité restent du suivi d'équipe (le %) |
| Prévu / réel | Prévu = Smartsheet au mois (fenêtre : Début / Fin prévus du Master ; gate : Date prévue de Jalons_Entites → dernier jour du mois). Réel = gate : Date check ; travail : sprints Jira des épopées (`stat_jira.fenetre_reelle`) |
| Cascade | Calculée à l'affichage, jamais stockée : fenêtre prévue d'un parent sans la sienne = min début / max fin des enfants ; réel = union du sien et des enfants ; gate d'un parent sans les siennes = la plus tardive des enfants (faite si toutes faites) ; retard = jours ouvrés après la date prévue |
| Recul | `jalon.date_initiale` et `livrable.date_initiale` gardent la 1re date ; recul ≥ 5 j ouvrés → alerte ; prédécesseur reculé → successeur en alerte (D16) |
| Santé D8 | rouge : jalon dépassé · risque ≥ 15 · fraîcheur > 15 j ouvrés (v14) ; jaune : risque ≥ 10 · attente > 5 j ouvrés après `attendue_le` ; vert sinon ; une alerte de dépendance ou de recul s'affiche, elle ne colore pas |
| Fériés (v11) | Absence collective (`personne` null), une par jour ouvré : `ferie.<date>` (fériés du Québec, `config/feries.json`, source calcul) · `fermeture.<date>` (événement du calendrier de Franck dont le sujet commence par « Fermeture » ou « Férié », source outlook) ; retirée de la capacité de chaque personne ; jamais supprimée sans accord |
| Masquage (v13) | `item.visible = false` (absent = visible) : l'item, ses descendants et leurs enregistrements sortent de la vue visiteur et du digest (`core.publicBase`) ; filtre d'affichage, pas un droit (Kickoff D20 v3) ; la vue visiteur et le digest recalculent cascade, santé, alertes de dépendance et charge sans l'item masqué (limite K15) |
| Alertes (v14, R44) | Calculées à l'affichage, une ligne par cause, ordre : recul ≥ 5 j o. avec ce qu'il entraîne par les dépendances (un recul atteint par un autre est dans sa chaîne) · jalon dépassé · bloqués du sprint actif (clés seules) · risque ≥ 15 · attentes > 5 j o. par item (hors attentes lues dans Jira = bloqués) · MEP ≤ 7 j non prête · fraîcheur (un item et ses descendants périmés = une ligne) · phase vide |
| Support (v14, R43) | `tendance` = ouverts − ouverts à la 1re lecture de la semaine en cours (le lundi : de la semaine précédente), rangée sous la date du lundi de cette semaine ; un extranet absent d'une semaine lue = 0 ; `lundis` garde les 2 dernières semaines ; `tendance_vs` = lundi de référence |
| Gantt (v15) | Un `gantt` par item (`gantt.<item>`), lu dans un fichier inscrit (`04_Adaptateurs/Gantts_Inscrits_v1.md`) ; affichage seulement : ses tâches ne deviennent ni items ni jalons (D4) ; seules les lignes `jalon` deviennent des jalons `<item>.gantt.<onglet>.<nom>` (date = fin) et comptent dans la santé ; réécrit seulement si l'empreinte du fichier change |
| Base d'artefact | Une collection `db` par entité, même nom que la clé du document ; `doc_id` = `id` |
| Feed | Bloc `<script type="application/json" id="portfolio-feed">` = un document de ce schéma ; invalide → ignoré et signalé dans le digest |

## 2. Entités (17)

| Entité | Obligatoire | Facultatif | Sources |
|---|---|---|---|
| **item** | id · nom · type (programme·projet·run) · voie (scrum·flux) · etape (idee·qualifie·planifie·actif·termine) · promu · source · updated_at | parent · priorite{valeur,urgence,effort,score} · sante{couleur,motifs,calcule_le} · responsable · fenetre{debut,fin} · pct_avancement · phase_source · **phase_deduite** · contenu_sprint · personnes[] · note_lundi · support[] (run) · liens[] · **epics_jira[]** · **rang** · **visible** (v13) | smartsheet (L, Sub-L, lignes cochées `Portefeuille`) · artefact · jira GOU21 · ledger (run) · saisie |
| **jalon** | id · item · nom · date · statut (fait·en_cours·a_venir·a_risque·depasse) · source | date_initiale · fait_le · **precision** (jour·mois) | artefact · saisie · smartsheet (gates, Jalons_Entites) · **sharepoint** (lignes jalon d'un Gantt, v15) |
| **risque** | id · item (null = portefeuille) · titre · probabilite 1–5 · impact 1–5 · source | score · mitigation · ouvert | artefact · smartsheet (`Top risque`, P·I saisis) · saisie |
| **attente** | id · item · tiers · objet · attendue_le · source | recue_le | artefact · ledger (BLOQ) · saisie · **jira** (Bloqué, « est bloqué par », v9) · **smartsheet** (commentaire bloquant, v9) |
| **dependance** | id · type (bloque·alimente·attend) · de{kind,id} · vers{kind,id} · source | note | saisie · artefact ; `kind` ∈ item · jalon · livrable |
| **livrable** | id · nom · statut · source | item · date · date_initiale · responsable | artefact (feed architecte) seulement |
| **mep** | id · date · systeme · statut (planifiee·prete·completee·annulee) · source | ticket · libelle · item · responsable | jira GOU21 (versions) · ledger (G1, IIS, extranets) |
| **action_retro** | id · board · texte · statut (a_faire·en_cours·fait) · source | sprint · owner | miro |
| **charge** | id · item · periode{sprint·semaine, ref} · role · mode (jours_personne·**points**·**taches**) · valeur · source | personne · **nom** · **tickets** · **sans_points** · **faites** · **en_cours** | jira (points d'équipe · sous-tâches par personne) · calcul · saisie |
| **sprint** | id · nom · debut · fin · etat (futur·actif·clos) · source | objectif · jours_ouvres · reserve_run_pct | jira (board 38, `customfield_10020`) |
| **personne** | id · nom · role · voie (scrum·flux·hors) · source | — | Team_G2.1_vN.xlsx |
| **absence** | id · personne (null = collective) · debut · fin · jours_ouvres · source | libelle | outlook (free/busy des personnes ; **fermetures** du calendrier de Franck, v11) · **calcul** (`config/feries.json`, v11) |
| **stat_jira** | id · item · epics[] · tickets{total,faits,en_cours,a_faire} · source | sprint{ref,tickets,faits,points,points_faits} · **fenetre_reelle{debut,fin,jusqu_au,sprints,ouverts}** | jira (épopées de l'item, calendrier des sprints) |
| **lecture** (v6) | id (`lecture.<adaptateur>`) · adaptateur (smartsheet·outlook·outlook_equipe·jira·jira_data·jira_data_reel·artefacts·miro·**gantt**) · passage (lundi·quotidien·jeudi·demande·skill) · lu_le · statut (ok·partiel·echec) · source | ecrits · cause | calcul (`tools/cadence.js lecture`), un document par adaptateur, réécrit à chaque passage |
| **liste_jira** (v7) | id (`jira.liste.support` · `jira.liste.preparation`) · nature (support·preparation·**bloques**) · tickets[] {cle, titre, + statut · categorie · type · points · epic · item · sprints[] · rang · stg21[] · extranet · cree_le · **parent · assigne · sous_tache**} · source | — | jira (adaptateur Jira data) ; liste réécrite entière à chaque lecture |
| **gantt** (v15) | id · item · format (drawio·json) · empreinte · onglets[] {nom, debut, fin, groupes[] {nom, taches[] {nom, debut, fin}}} · source | titre · fichier_modifie_le · calcule_le · onglets[].titre · sous_titre · hors_planning · taches[].ref · segments[] · critique · jalon · fait | sharepoint (adaptateur Gantt) |
| **instantane** | id · date · pris_le · items[] · source | sources_ok · sources_total | calcul (lundi 7 h), jamais supprimé |

## 3. Champs possédés par le portefeuille (Gérer)

| Entité | Saisissables | Lecture seule (provenance + date affichées) |
|---|---|---|
| item | nom · type · parent · voie et etape (sauf item relié à une ligne Smartsheet, v5) · promu · priorite (3 notes) · responsable · fenetre (sauf Goutte 2.1 quand Smartsheet la porte) · note_lundi · liens · epics_jira · rang · visible (v13) | sante · pct_avancement · phase_source · phase_deduite · contenu_sprint · support · updated_at · etape et voie d'un item relié à Smartsheet (v5) |
| jalon · risque · attente · dependance | tout, sur tout item, quand la source n'en fournit pas (Smartsheet n'a aucun jalon au grain L) | enregistrements venant d'un feed, de Smartsheet ou du ledger |
| charge | — (v8) | tout (Jira, calcul) |
| personne · absence | — (v8) | nom · role · absences Outlook · fériés (calcul) et fermetures (v11) |
| action_retro (v12) | statut (bouton Faite / Rouvrir de la vue Sprint, skill `maj-actions-retro`) ; un marqueur « Statut : » lu sur la carte Miro l'emporte à la lecture suivante | texte · owner · board · sprint · source |
| livrable · mep · sprint · stat_jira · instantane · lecture · liste_jira · gantt (v15) | — | tout |

## 4. Exemples (`validate_model.py` : OK, 5 documents, références croisées cohérentes ; 2 cas négatifs refusés)

| Fichier | Données réelles | Données posées, à confirmer dans Gérer |
|---|---|---|
| `exemple_l8d.json` | L8 (2 %), L8D (3 %, AF / UX), lignes Smartsheet, risque `Top risque` de L8 | P4·I4 du risque · jalon gate AC-4 14 nov. · priorité · charge S20 |
| `exemple_expert_g1.json` | 8 jalons, 2 risques, 3 attentes = `ROWS` du Gantt S1 | priorité 4·4·2 |
| `exemple_run_ti.json` | 4 MEP du ledger W44 · S19 actif (sprint 71) · équipe xlsx | support par extranet · dates S20 |
| `exemple_codes_taxes.json` | pré-lecture CDP 9 juin 2026 · recommandation S2 | dates décision CDP / BRD / MEP · livrable ADR archi (feed à brancher) |
| `exemple_base_calcul.json` | santé calculée et instantané : seul document où `sante` est admise | — |

## 5. Propositions en attente

S5 (lien `rowId=` utilisé tel quel, champ dédié non créé), F1 (fraîcheur source seule, appliquée par l'adaptateur), A11, E1–E13. S9 reprise en v3 (règle Fraîcheur).
