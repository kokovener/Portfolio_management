# Portefeuille PLQ — Kickoff v7

> Sortie du brainstorming du 2026-10-27 · Owner : Franck · Motifs : `Portefeuille_PLQ_Kickoff_v7_Annexe_Motifs.md` · **v2 2026-10-28 : D7 révisée (volet flux abandonné, Franck R23 R24 R28)** · **v3 2026-10-29 : D7 (fériés), D19 (statut saisi), D20 (item masqué = filtre d'affichage) — Franck R37 R38 R40 R41** · **v4 2026-10-29 : D8 fraîcheur = 15 j ouvrés, Smartsheet ou Jira (Franck R44)** · **v5 2026-10-29 (checkpoint) : D11 D17 D18 = Jira GOU21 seul (Franck)** · **v6 2026-10-30 : D21 ajout d'un projet par skill, D22 Gantt de projet reproduit (Franck)** · **v7 2026-10-30 : D22 étendu au Gantt porté par le bloc feed d'un artefact projet (Expert G1, Franck)** · Prompt : `Portefeuille_PLQ_Prompt_Initial_v1.md`

## 1. Décisions actées

| # | Sujet | Décision |
|---|---|---|
| D1 | Type de projet | **Cowork** : dossier local + CLAUDE.md + connecteurs + tâches planifiées |
| D2 | Stockage | Base de l'artefact (capacité `db`) · bascule Smartsheet si > 50–100 items ou si un 2e éditeur apparaît |
| D3 | Éditeurs | Franck seul (interface Gérer + conversation Claude) · architecte = source lue (son JSON / artefact), jamais éditeur |
| D4 | Grain | Items et jalons, jamais tâches · test : « peut-on répondre oui / non à une date ? » = jalon ; « combien de temps ? » = tâche · ex. « Gestion des codes de taxes » = item promu, ses jalons = pré-lecture CDP, décision CDP, BRD validé, MEP · Goutte 2.1 lu au grain L + items promus par Franck (entité ou sujet transverse) · aucune écriture du portefeuille dans une source |
| D5 | Horizon et grille | 3 mois glissants · grille en semaines · sprints GOU21 en surcouche |
| D6 | Voies | Scrum (dev GOU21) et Flux (PM, architecte, analystes) sur la même grille |
| D7 | Capacité | Scrum = jours-personne par sprint − **fériés du Québec (`config/feries.json`) et fermetures (calendrier de Franck, sujet « Fermeture… »)** − absences Outlook − réserve run (15 % par défaut, réglable) · charge Jira = points d'équipe par item, sous-tâches par personne · **v2 : volet Flux (WIP saisi par personne) abandonné le 2026-10-28** · aucune heure saisie |
| D8 | Santé | Rouge : jalon dépassé, ou risque ≥ 15, ou fraîcheur > 15 j ouvrés (**v4** : ni mise à jour Smartsheet ni activité Jira des épopées dans le sprint ; 15 j ouvrés = un sprint de 3 semaines) · Jaune : risque ≥ 10, ou attente de tiers > 5 j ouvrés · Vert sinon · calculée, jamais déclarée |
| D9 | Étapes et priorité | Idée · Qualifié · Planifié · Actif · Terminé · priorité = valeur + urgence − effort (chacun 1–5), risque affiché à côté |
| D10 | Périmètre v0 | Goutte 2.1 (L actifs = phase ≠ Backlog et ≠ Done) + Expert G1 + Run TI + 2 projets saisis à la main |
| D11 | Sources v0 | Smartsheet Goutte21_Master · Jira GOU21 (sprints, versions = MEP, tickets liés aux demandes STG21) · **v5 : SDD et PLQ (run) hors périmètre tant que le connecteur ne lit que GOU21 ; leur MEP viennent du ledger, le run reste saisi dans Gérer** · artefacts projet via bloc feed · Outlook (absences des personnes de Team_G2.1) · Miro (cadre « Actions » du dernier board de rétro) · **v3 : fériés = fichier de config versionné ; fermetures = calendrier de Franck** |
| D12 | Artefacts projet | Lisibles seulement via un bloc feed au modèle canonique ; Franck ajoute le bloc à ses propres artefacts (préparation de source, pas écriture du portefeuille) ; le JSON de l'architecte est lu tel que livré |
| D13 | Vue livrée en premier | Équipe (digest Teams du lundi) · CDP et auditeur en v1 |
| D14 | Ordre de construction | Mise en place → modèle canonique (gelé) → interface → adaptateurs → tâche du lundi → 1re semaine réelle |
| D15 | Reporté | Import Excel candidats · vues CDP / auditeur · budget heures · écriture Jira (epic auto) |
| D16 | Dépendances | Entre items et entre jalons, typées (bloque · alimente · attend), y compris vers un livrable de l'architecte (feed) · un prédécesseur qui recule met le successeur en alerte · visibles sur la ligne de l'item et dans la fiche |
| D17 | Support extranets | Item « Run — Extranets » : demandes STG21 vues par leurs tickets GOU21 liés (**v5**), par extranet (10) : ouverts, âge, tendance · même board que l'artefact « Triage Supportg2 Stg21 » |
| D18 | MEP | Ligne « MEP planifiées » sur la grille (losanges datés) + liste dans la vue sprint · source : versions / tickets MEP Jira GOU21, recoupés avec le ledger ; **v5 : MEP SDD / PLQ = lignes du ledger seules** |
| D19 | Actions de rétro | Carte « Actions de la rétro » dans la vue sprint, lue dans le cadre « Actions » du dernier board Miro (skill retro-sprint-g21) · mise à jour par la tâche du lundi et par une skill lancée après chaque rétro · **v3 : statut posé aussi depuis la vue Sprint (Faite / Rouvrir, propriétaire) ; un marqueur « Statut : » sur la carte Miro l'emporte** |
| D20 | Droits | Artefact partagé en lecture (niveau « interact ») à l'équipe · règles `db` : écriture réservée au niveau owner (Franck) ; un 2e éditeur = passage au niveau admin, jamais par personne · l'interface masque Gérer quand `user.canEdit()` est faux · pas de droit par ligne (limite assumée) · **v3 : Franck peut masquer un item (case « visible ») et ses descendants : absent de la vue des visiteurs et du digest Teams, toujours présent dans la base — masquage du bruit, jamais confidentialité ; bouton « Vue visiteur » pour vérifier** |
| D21 | Ajout d'un projet (v6) | Skill `ajout-projet-portefeuille` : nom + épopée(s) Jira + Gantt (facultatif) → item `saisie.<nom>`, épopées liées, Gantt inscrit, 1re lecture, page vérifiée · Gérer reste l'outil des corrections · « + Ajouter un projet » reste pour un projet sans Jira ni Gantt |
| D22 | Gantt de projet (v6, v7) | Un Gantt de projet (drawio PLQ-Forge, JSON, ou **v7 : collection `gantts` du bloc feed d'un artefact projet**, id `<préfixe>.gantt`) est **reproduit** depuis ses données en bas de la fiche projet, jamais copié en image · fichier : relu chaque lundi, réécrit seulement s'il change ; bloc feed : relu avec le feed, un seul par item, préparé par Franck avec `feeds/expertg1_gantt.js` (D12) · ses lignes jalon (acceptation, MEP) deviennent des jalons du projet et comptent dans la santé ; ses tâches restent de l'affichage (D4) · modèle v15, `04_Adaptateurs/Adaptateur_Gantt_v1.md` |

## 2. Mise en place (étape 0, avant le prompt)

| # | Action |
|---|---|
| 1 | Créer `C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Portefeuille_PLQ\` avec `01_Cadrage/ 02_Modele/ 03_Interface/ 04_Adaptateurs/ 05_Pilotage/ _Outils/ CLAUDE.md` |
| 2 | Y copier : ce kickoff, l'annexe motifs, le prompt initial, `Portefeuille_PLQ_Flux_v2.drawio` (remplacé depuis par `Portefeuille_PLQ_Flux_v3.html`), le dossier `maquettes/` → `01_Cadrage/` · `_v0` et `_v1.drawio` → `01_Cadrage/_Archives/` |
| 3 | Créer `C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\` (code : page HTML, scripts feed, tests) |
| 4 | CLAUDE.md : règles Goutte 2.1 (`_vN`, `_Archives/`, jeu de caractères, suppression = accord explicite, heure du Québec EDT / EST) + règles produit §4 |
| 5 | Ouvrir la session Cowork sur `Portefeuille_PLQ\` et attacher aussi `…\Documents\Claude\Goutte2.1\` (lecture) et `Projets_Dev\Portefeuille_PLQ\` |
| 6 | Connecteurs actifs : Smartsheet · Atlassian · Microsoft 365 · Miro · Artifact · Scheduled tasks · skills `suivi-planifie` (patron de la tâche, à adapter : identifiants = URL de l'artefact), `risk-scoring-standard`, `archive-versions`, `maj-triage-stg21` (structure du board support), `retro-sprint-g21` (emplacement du cadre Actions) |

## 3. Entrants

| Entrant | Où |
|---|---|
| Flux | `01_Cadrage/Portefeuille_PLQ_Flux_v3.html` (artefact « Flux Portefeuille PLQ ») |
| Maquettes 3 vues | https://claude.ai/artifact/DSpedLCbm6enVxTz9cS9nd · copie locale `01_Cadrage/maquettes/project/*.dc.html` |
| Plan Goutte 2.1 | `Goutte2.1/05_Gestion_Projet/Planification/Plan_Reinit_Goutte21_v7.md` §2, §11, §12 (R7, R8), §13.4, §16 |
| Équipe, rôles, absences à lire | `Goutte2.1/01_Gouvernance/Team_G2.1_v1.xlsx` |
| Ledger hebdo (run visible) | `Goutte2.1/Daily_Brief/_ledger/2026-W44.md` |
| Smartsheet | `Goutte21_Master` 230627583414148 · `Jalons_Entites` 2733930749841284 |
| Jira | GOU21 seul (sprints, versions MEP, tickets liés aux demandes STG21) ; SDD et PLQ hors connecteur (D11 v5) |
| Miro | Dernier board de rétro (gabarit d'équipe, cadre « Actions du sprint suivant ») |
| Codes de taxes (exemple d'item promu) | `Goutte2.1/01_Gouvernance/Comites/Codes_Taxes_Pre-read_CDP_v1.docx` + `Codes_Taxes_4_Scenarios_v1.pptx` |
| Artefact feed exemple | « Expert G1 — Gantt S1 » https://claude.ai/artifact/E3KrS3o15gWHwuqrvpnETg |
| Design system | https://claude.ai/artifact/SW339XsDhEpz696xhonAC1 |
| Canal Teams du digest | `G1_Agent_Analystes` (CLAUDE.md du projet) |

## 4. Règles produit (CLAUDE.md du projet)

| Règle | Énoncé |
|---|---|
| Source de vérité | Le portefeuille ne modifie jamais Smartsheet, Jira, Outlook, Miro, ni un artefact source |
| Grain | Un item = programme, projet ou run ; on suit des jalons, jamais des tâches |
| Santé et fraîcheur | D8 ; un item sans mise à jour Smartsheet ni activité Jira depuis 15 j ouvrés passe en alerte |
| Capacité | D7 |
| Feed | `<script type="application/json" id="portfolio-feed">` au modèle canonique ; absent → ignoré et signalé dans le digest |
| Instantanés | Chaque lundi, instantané daté écrit avant tout recalcul ; jamais supprimé |
| Données personnelles | Rien de `Recrutements/` n'entre dans la base ni dans un digest |
| Livrables | Quoi seulement, deux écrans ; motifs dans `*_Annexe_Motifs.md` ; relecture sous-agent avant toute décision livrée |
