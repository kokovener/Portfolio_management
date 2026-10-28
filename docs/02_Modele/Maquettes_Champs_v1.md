# Maquettes → modèle canonique v1 · champs et sources

> Étape 1 · 2026-10-27 · Maquettes : `01_Cadrage/maquettes/project/*.dc.html` · Modèle : `Modele_Canonique_v1.md` · Motifs : `Modele_Canonique_v1_Annexe_Motifs.md`

## 1. Champs avec source

| Vue | Champ | Entité.champ | Source |
|---|---|---|---|
| Portefeuille | projets actifs · programmes · entonnoir Idée → Terminé | item.etape, item.type | calcul · saisie |
| Portefeuille | jalons 30 j · jalons glissés | jalon.date, date_initiale | artefact · saisie |
| Portefeuille | alertes (fraîcheur · WIP · jalon · dépendance · MEP) | règles de l'étape 4 | calcul |
| Portefeuille | Architecte : en cours / limite WIP | charge.mode=wip, personne.wip_limite | calcul · saisie |
| Portefeuille | grille semaines · sprints · « S23 congés » | sprint, absence (personne = null) | jira · saisie |
| Portefeuille | barre d'item (fenêtre, %, phase, ⛓) | item.fenetre, pct_avancement, phase_source, dependance | smartsheet · artefact · saisie |
| Portefeuille | MAJ il y a N j | item.updated_at | smartsheet (`Dernière MAJ`, sinon modification de ligne) · artefact · saisie |
| Portefeuille | ligne MEP planifiées (losanges) | mep.date, statut | jira · ledger |
| Portefeuille | Run extranets : ouverts, âge, tendance | item.support[] | artefact Triage STG21 (feed) ou saisie — JSM non lisible |
| Portefeuille | charge par rôle 4 semaines (%) | Σ charge / (jours ouvrés − absences) | calcul |
| Portefeuille | Top 5 risques (dont Transverse, Gouvernance) | risque.score ; item = null pour les risques de portefeuille | artefact · saisie · smartsheet |
| Portefeuille | « Rafraîchi … · 5 sources OK » | instantane.sources_ok / sources_total | calcul |
| Projet | fiche : responsable, type · parent, fenêtre, prochain jalon, dépend de | item.*, jalon, dependance | saisie · artefact |
| Projet | priorité « P1 — valeur · urgence · effort · risque » | priorite.score → rang P1…Pn ; risque = max(risque.score ouvert) ramené sur 1–5 (÷ 5, arrondi) | calcul |
| Projet | santé calculée + motifs | item.sante | calcul |
| Projet | charge demandée (ETP, WIP, super-utilisateurs, absences) | charge (role super_utilisateur), absence | saisie · outlook · calcul |
| Projet | jalons N (dont faits) · progression % | jalon, item.pct_avancement | artefact · calcul |
| Projet | jalon avec plage « 31 oct. → 4 nov. » | jalon.date = fin de plage ; le début n'est pas gardé (D4) | artefact |
| Projet | risques · attentes | risque, attente | artefact · saisie |
| Projet | sources du projet (lu le…) · historique instantanés | *.source.lu_le, instantane | calcul |
| Sprint | S20 dates, objectif, jours ouvrés | sprint | jira |
| Sprint | jours-personne dispo · réserve run | charge, absence, sprint.reserve_run_pct | calcul |
| Sprint | projets dans le sprint (contenu, voie, personnes, santé) | item.contenu_sprint, personnes, sante | jira (epics `[L8D-Dev]`) · saisie |
| Sprint | WIP par personne | charge.mode=wip | calcul |
| Sprint | jalons du sprint · absences · MEP du sprint | jalon, absence, mep | artefact · outlook · jira |
| Sprint | actions de la rétro | action_retro | miro |

## 2. Champs sans source — arbitrages v1 (décision Franck)

| Vue | Champ | Arbitrage v1 |
|---|---|---|
| Projet | Décisions liées (3 décisions datées) | hors modèle v1 ; `decision` en v2 si demandé |
| Projet | Budget (clé API, heures) | retiré du modèle (décision Franck 2026-10-27) |
| Projet | Gérer → sélecteur Santé (Jaune / Vert / Rouge) | retiré : santé calculée (D8) |
| Sprint | santé « attente » (4e couleur) | retirée : 3 couleurs (D8) ; l'attente est un motif |
| Sprint | Et si… scénario | pas un champ : conversation Claude |
| Sprint | stories · points par item | hors grain D4 ; `contenu_sprint` en texte |
| Portefeuille | Importer Excel | reporté (D15) |
| L8D, Codes de taxes | jalons et dates posées (modèle §4) | à confirmer dans Gérer à l'étape 2 |
| Codes de taxes | livrable archi « ADR codes de taxes » | existe seulement quand le feed architecte est branché (étape 3) |
| Run extranets | chiffres support | JSM STG21 non lisible (connecteur limité à GOU21) ; v0 = bloc feed ajouté à l'artefact Triage STG21 par Franck, sinon saisie dans Gérer |
| MEP run (G1, IIS, extranets) | tickets SDD / PLQ | non lisibles ; source = ledger hebdo, déjà mappé sur `mep` |
