# Portefeuille PLQ — Modèle canonique v1

> Étape 1 · 2026-10-27 · Schéma exécutable : `schema.json` · Exemples : `exemples/*.json` · Champs des maquettes : `Maquettes_Champs_v1.md` · Validation : `Projets_Dev\Portefeuille_PLQ\tools\validate_model.py` · Motifs : `Modele_Canonique_v1_Annexe_Motifs.md` · **Gelé le 2026-10-27 (OK Franck).** Tout changement = v2 + écart motivé en annexe.

## 1. Règles

| Règle | Énoncé |
|---|---|
| Un document | Feed, sortie d'adaptateur ou base entière ont la même forme : `{modele:"1", source, <collections>}` ; toute collection est optionnelle |
| Identifiants | `^[a-z0-9][a-z0-9._-]+$`, préfixe = origine : `goutte21.l8d`, `jira.gou21-11325`, `feed.expertg1.go-nogo`, `saisie.codes-taxes`, `team.personne-09`, `run.ti`, `dep.…` |
| Provenance | Chaque enregistrement porte `source {systeme, ref, lu_le, par}` ; `systeme` ∈ smartsheet · jira · jsm · artefact · outlook · miro · ledger · saisie · calcul |
| Périmètre Atlassian | Le connecteur de la session ne lit que GOU21 : SDD, PLQ et JSM STG21 ne sont pas lus en v0 ; MEP run = ledger ; support extranets = artefact Triage STG21 (feed) ou saisie |
| Calculé, jamais saisi | `item.sante` (admise seulement dans un document `source.systeme = calcul`, refusée dans un feed, un adaptateur, une saisie) · `priorite.score` · `risque.score` · `pct_avancement` (source ou jalons faits / total) |
| Dates | `AAAA-MM-JJ` ; horodatages ISO avec décalage `-04:00` obligatoire, `Z` refusé |
| Fraîcheur | `item.updated_at` = dernier changement de fond ; Smartsheet : `Dernière MAJ` si remplie, sinon date de modification de la ligne ; > 14 j → alerte (D8) |
| Recul | `jalon.date_initiale` et `livrable.date_initiale` gardent la 1re date ; recul ≥ 5 j ouvrés → alerte ; prédécesseur reculé → successeur en alerte (D16) |
| Santé D8 | rouge : jalon dépassé · risque ≥ 15 · fraîcheur > 14 j ; jaune : risque ≥ 10 · attente > 5 j ouvrés après `attendue_le` ; vert sinon ; une alerte de dépendance ou de recul s'affiche, elle ne colore pas |
| Base d'artefact | Une collection `db` par entité, même nom que la clé du document ; `doc_id` = `id` |
| Feed | Bloc `<script type="application/json" id="portfolio-feed">` = un document de ce schéma ; invalide → ignoré et signalé dans le digest |

## 2. Entités (13)

| Entité | Obligatoire | Facultatif | Sources |
|---|---|---|---|
| **item** | id · nom · type (programme·projet·run) · voie (scrum·flux) · etape (idee·qualifie·planifie·actif·termine) · promu · source · updated_at | parent · priorite{valeur,urgence,effort,score} · sante{couleur,motifs,calcule_le} · responsable · fenetre{debut,fin} · pct_avancement · phase_source · contenu_sprint · personnes[] · note_lundi · support[] (run) · liens[] | smartsheet (L, Sub-L) · artefact · jira GOU21 · ledger (run) · saisie |
| **jalon** | id · item · nom · date · statut (fait·en_cours·a_venir·a_risque·depasse) · source | date_initiale · fait_le | artefact · saisie |
| **risque** | id · item (null = portefeuille) · titre · probabilite 1–5 · impact 1–5 · source | score · mitigation · ouvert | artefact · smartsheet (`Top risque`, P·I saisis) · saisie |
| **attente** | id · item · tiers · objet · attendue_le · source | recue_le | artefact · ledger (BLOQ) · saisie |
| **dependance** | id · type (bloque·alimente·attend) · de{kind,id} · vers{kind,id} · source | note | saisie · artefact ; `kind` ∈ item · jalon · livrable |
| **livrable** | id · nom · statut · source | item · date · date_initiale · responsable | artefact (feed architecte) seulement |
| **mep** | id · date · systeme · statut (planifiee·prete·completee·annulee) · source | ticket · libelle · item · responsable | jira GOU21 (versions) · ledger (G1, IIS, extranets) |
| **action_retro** | id · board · texte · statut (a_faire·en_cours·fait) · source | sprint · owner | miro |
| **charge** | id · item · periode{sprint·semaine, ref} · role · mode (jours_personne·wip·etp) · valeur · source | personne | calcul (jira + absences) · saisie |
| **sprint** | id · nom · debut · fin · etat (futur·actif·clos) · source | objectif · jours_ouvres · reserve_run_pct | jira (board 38, `customfield_10020`) |
| **personne** | id · nom · role · voie (scrum·flux·hors) · source | wip_limite | Team_G2.1_vN.xlsx |
| **absence** | id · personne (null = collective) · debut · fin · jours_ouvres · source | libelle | outlook · saisie (congés) |
| **instantane** | id · date · pris_le · items[] · source | sources_ok · sources_total | calcul (lundi 7 h), jamais supprimé |

## 3. Champs possédés par le portefeuille (Gérer)

| Entité | Saisissables | Lecture seule (provenance + date affichées) |
|---|---|---|
| item | nom · type · parent · voie · etape · promu · priorite (3 notes) · responsable · fenetre · note_lundi · liens | sante · pct_avancement · phase_source · contenu_sprint · support · updated_at |
| jalon · risque · attente · dependance | tout, sur tout item, quand la source n'en fournit pas (Smartsheet n'a aucun jalon au grain L) | enregistrements venant d'un feed, de Smartsheet ou du ledger |
| charge | mode etp / wip (voie flux) | jours_personne (calcul) |
| personne · absence | wip_limite · absence collective | nom · role · absences Outlook |
| livrable · mep · action_retro · sprint · instantane | — | tout |

## 4. Exemples (`validate_model.py` : OK, 5 documents, références croisées cohérentes ; 2 cas négatifs refusés)

| Fichier | Données réelles | Données posées, à confirmer dans Gérer |
|---|---|---|
| `exemple_l8d.json` | L8 (2 %), L8D (3 %, AF / UX), lignes Smartsheet, risque `Top risque` de L8 | P4·I4 du risque · jalon gate AC-4 14 nov. · priorité · charge S20 |
| `exemple_expert_g1.json` | 8 jalons, 2 risques, 3 attentes = `ROWS` du Gantt S1 | priorité 4·4·2 · WIP |
| `exemple_run_ti.json` | 4 MEP du ledger W44 · S19 actif (sprint 71) · équipe xlsx | support par extranet · dates S20 |
| `exemple_codes_taxes.json` | pré-lecture CDP 9 juin 2026 · recommandation S2 | dates décision CDP / BRD / MEP · livrable ADR archi (feed à brancher) |
| `exemple_base_calcul.json` | santé calculée et instantané : seul document où `sante` est admise | — |
