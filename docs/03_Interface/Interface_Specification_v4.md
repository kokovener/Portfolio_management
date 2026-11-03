# Portefeuille PLQ — Interface · spécification v4

> 2026-11-03 · Page v58, commit `69757e3` · Artefact « Portefeuille PLQ (Bêta) » https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB · Code : `Projets_Dev\Portefeuille_PLQ\interface\` (git) · Modèle : `02_Modele/Modele_Canonique_v18.md` · Cadence : `05_Pilotage/Cadence_Rafraichissement_v4.md` · Motifs, historique v1–v3 : `Interface_Specification_v4_Annexe_Motifs.md`

## 1. Livré

| Élément | Contenu |
|---|---|
| Build | `interface/page.html` + `interface/core.js` + `schema.json` + `config/cadence.json` → `tools/build_interface.py` → `dist/portefeuille.html` |
| Capacités | `db` (lecture `view`, écriture `owner`) · `user` ; déclarées à la publication, pas dans le code |
| Base | 17 collections : items, jalons, risques, attentes, dependances, livrables, meps, actions_retro, charges, sprints, personnes, absences, stats_jira, instantanes, lectures, listes_jira, gantts |
| Tests | `bash tests/run_all.sh` (prérequis en tête du script) : 30 suites vertes le 3 nov. 2026, dont 6 suites DOM sur horloge figée |
| Navigation | Onglets Portefeuille · Projet · Sprint ; Retour du navigateur = vue précédente ; liens `#projet/<id>`, `#sprint/<id>` |
| Onglet Projet | Sans item ouvert : programme Goutte 2.1, sinon 1er projet actif |
| En-tête figé | « PLQ · TI » · titre « (Bêta) » · onglets · « Données à jour au … » + « n sources en retard de lecture » |
| En-tête, propriétaire | Vue visiteur · + Ajouter un projet |
| En-tête, lecteur | Étiquette « lecture seule » (ou « vue visiteur ») |
| Légende de santé | Sous l'en-tête ; en vue Sprint, compacte dans la carte « Items dans le sprint » |
| Détails techniques | Bloc en bas de page, propriétaire seulement |

## 2. Vues

### Portefeuille

| Zone | Contenu |
|---|---|
| Tuiles | Projets actifs · jalons à 30 j · alertes ; un clic filtre la grille |
| Entonnoir d'admission | Comptes par étape ; un clic filtre la grille |
| Filtres | Suivi · Étape · Horizon (13 semaines à venir, ou + 13 passées) · Tout déplier / replier |
| Légende de la grille | Barres, losanges, run hachuré, ligne du jour ; badges de fraîcheur B4 et B5 |
| Grille, en-têtes | Semaines · sprints · bandes de fériés et fermetures |
| Grille, lignes | Programmes et livraisons dans l'ordre du `rang` saisi · Hors programme · Idées et qualifiés · Terminés |
| Grille, barres | Prévu Smartsheet · réel Jira · jalons · run hachuré |
| Mises en production | Compteur (depuis lundi, à venir, non confirmées en rouge) · une ligne repliable par thème · badge B3 |
| Top 5 risques | Score, item, P et I |
| Alertes | Liste, même ordre que le digest |
| Support des extranets | Ouverts · plus vieux · vs lundi ; tickets ouverts par demande STG21, avec leur sprint |

### Projet

| Zone | Contenu |
|---|---|
| En-tête | Fil d'Ariane · nature (« suivi en sprints » / « au fil de l'eau ») · titre figé · Modifier · Voir le sprint · liens · ligne Source |
| Cycle de vie | Étapes de l'item |
| Bandeau de santé | Couleur · motifs → prochaine action |
| Fiche | Responsable · type · priorité Pn (calculée) · prochain jalon · prévu · réel Jira · note du lundi |
| Dépendances | Bloqué par · alimenté par · attend · bloque · alimente · attendu par |
| Jira | Épopées · points · sous-tâches · absences des personnes |
| Livraisons | Enfants : santé, phase, étape |
| Sections repliables | Jalons · MEP · Risques · Attentes ; vides réunies sur une ligne |
| Bas de fiche | Sources · historique des instantanés · Gantt |

### Sprint

| Zone | Contenu |
|---|---|
| En-tête figé | Titre · un onglet par sprint lu (clos = précédent, actif = courant, autre = suivant) |
| Tempo et source | Barre du temps écoulé · jours ouvrés, état, source |
| Objectif | « But du sprint » Jira (+ celui du sprint précédent) |
| Tuile 1 | Items, tâches parentes, points d'équipe, sous-tâches |
| Tuile 2 | Jours-personne dev disponibles |
| Tuile 3 | Réserve run (% et jours-personne) |
| Items | Qui, sur quoi, voie, santé |
| Bloqués | Tickets bloqués du sprint |
| Capacité | Sous-tâches par personne (à faire, en cours, faites) · dispo · restantes par jour dispo · barres par rôle (demande / capacité) |
| Support | Tickets STG21 du sprint |
| Colonne droite | Actions de rétro (+ précédent) · absences · run et MEP par thème |
| Sprint futur | Préparation (backlog GOU21, ordre Jira) · capacité prévue par personne |
| Sprint clos | Bilan des sous-tâches |

## 3. Écritures du propriétaire

| Où | Saisissable | Lecture seule |
|---|---|---|
| Modifier › Item | Nom · type · parent · priorité (valeur, urgence, effort) · responsable · fenêtre · note du lundi · liens · épopées Jira · visible · promu | Santé · % · phase source · contenu sprint · support · mis à jour |
| Modifier › Item, voie et étape | Saisissables sur un item saisi | « lu dans Smartsheet » sur un item Smartsheet |
| Modifier › + Jalon, + Risque, + Attente, + MEP | Création ; modification des seuls enregistrements `saisie` | Enregistrements lus |
| Modifier › + MEP | Numéro de billet unique : tout doublon refusé | — |
| Modifier › + Dépendance | Type · côté de cet item · extrémité item, jalon ou livrable · note | — |
| En-tête | + Ajouter un projet (`saisie.<nom>`), formulaire dans la vue Projet | — |
| Grille | Ordre par glisser ou ↑ ↓ dans une section (`rang`) | — |
| Sprint | Actions de rétro : faite / rouvrir | Texte de l'action (Miro) |

## 4. Règles appliquées

| Règle | Application |
|---|---|
| Droits D20 | Toute écriture du §3 masquée si `user.canEdit()` est faux ; écriture refusée hors owner (règle `db`) |
| Vue visiteur | Items `visible` false et leurs descendants filtrés (affichage, pas confidentialité) |
| Vue d'équipe | Ids, noms d'adaptateurs, détails techniques : propriétaire seulement |
| Modèle | Chaque écriture validée contre `schema.json` ; `sante` jamais écrite |
| Écriture | Document complet (`set`) ; heures du Québec |
| Provenance | Un item lu garde sa `source` quand il est modifié ; `saisie` posée à la création seulement |
| Recul | 1re date gardée dans `date_initiale` |
| Suppression | Aucune dans l'interface : clore (risque non ouvert, jalon fait, attente reçue) |
| Santé | Calculée (D8) ; étapes idée et qualifié = gris (portefeuille, projet) ; terminé jamais rouge ; fraîcheur sur actif et planifié seulement |
| MEP passée encore « planifiée » | « non confirmée » : rouge dans la grille, pas d'alerte |
| Fraîcheur des blocs | Badge « lu il y a … » daté par la source principale du bloc ; « à relire » dès qu'une de ses sources dépasse sa cible |
| Libellés | MEP en toutes lettres · jours ouvrés · jours-personne · en sprints · au fil de l'eau · orange · accord au singulier pour 0 et 1 |
| Décision Franck (F1) | Gérer ne rajeunit pas `updated_at` d'un item lu dans une source |

## 5. Gantt

| Cas | Rendu |
|---|---|
| Gantt de fichier inscrit | Reconstruit des données · un onglet par page · chemin critique en rouge · lignes jalon = jalons du projet |
| Gantt de feed | Affichage seulement · fraîcheur B9 |
| Programme | Calculé : prévu, réel Jira, jalons · livraisons qualifiées grisées « en pause » · jamais écrit en base |
| Sous-projet | Sa part du Gantt de l'ancêtre, sinon du programme |
| Commun | Lignes faites estompées · ouvre sur aujourd'hui · colonne des titres figée · colonnes mensuelles au-delà de 60 semaines |

## 6. Arbitrages pris sans Franck (en vigueur)

| # | Arbitrage |
|---|---|
| A1 | Santé, alertes, priorité, % recalculés à chaque affichage ; la santé stockée sert l'instantané seulement |
| A2 | Écriture par document complet |
| A3 | Pas de suppression ; clôture par statut |
| A4 | Admin (Editor) voit les écritures mais n'écrit pas, jusqu'au 2e éditeur |
| A9 | Non affichés : vues CDP et auditeur, Importer Excel, décisions liées, « Et si… », budget |
| A10 | Lecture des collections sans pagination |
| A11 | Dépendance saisie ni modifiable ni clôturable |
| A16 | Badge de fraîcheur daté par la source principale du bloc, les autres en info-bulle |
| A17 | Terminé = vert, sans motif |
| A18 | Barres par rôle de la carte Capacité (Sprint) décrites telles que codées ; leur retrait relève de D7 v2 (à confirmer par Franck) |
