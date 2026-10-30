# Portefeuille PLQ — Kickoff v7 · Annexe motifs (reprend v1 à v7)

> À n'ouvrir que pour rouvrir une décision. Un motif ne se supprime jamais : il se déplace. Numéros = §1 du kickoff.

| # | Décision | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| D1 | Cowork | Les adaptateurs ont besoin des connecteurs, du dossier Goutte 2.1 et des tâches planifiées ; un projet claude.ai n'a ni tâche planifiée ni accès au dossier local | Projet claude.ai (bon pour converser, pas pour automatiser) | — |
| D2 | Base de l'artefact | Franck seul édite ; zéro outil à ajouter ; Claude lit et écrit la base ; le modèle survit à une bascule Smartsheet | Smartsheet dès v0 (utile seulement à plusieurs éditeurs) · Jira Plans (ne couvre ni le flux ni l'architecte) | — |
| D3 | Architecte = source | Il livre déjà un JSON ; un droit d'édition créerait un 2e chemin d'écriture à maintenir | Édition de ses lignes dans l'interface (envisagée puis retirée le 27 oct.) | — |
| D4 | Items + jalons, grain L + promus | Plan Goutte v7 §12 R7 : Smartsheet ne doit pas devenir 2e source de vérité de Jira ; même logique pour le portefeuille · le grain L seul cachait les sujets transverses (Codes de taxes) qui portent des décisions CDP et des dépendances : d'où la promotion explicite par Franck, jamais automatique | Dupliquer entités / stories · descendre au grain entité pour tout Goutte (29 L × N entités = bruit) | Plan Goutte v6→v7 : recopier un référentiel dans un second document a produit deux dérives ; règle : citer, ne pas recopier |
| D5 | 3 mois, semaines | Horizon demandé par Franck ; la semaine est la seule unité commune aux deux voies | Mois seulement · sprints seulement | — |
| D6 | Deux voies | Franck, l'architecte et les analystes ne sont pas en sprint ; forcer un sprint fausse la capacité | Tout en sprints | — |
| D7 | Jours-personne + WIP, pas d'heures saisies | La capacité à l'heure meurt de sa maintenance ; worklogs Jira incomplets (plan Goutte v7 §12 R8) ; la réserve run rend visible ce que le ledger montre déjà | % d'allocation par personne · heures | Ledger Goutte W44 : MEP G1, IIS, extranets consomment la capacité dev sans figurer dans aucun plan |
| D8 | Santé calculée | Un statut déclaré n'est pas défendable (constat du plan Goutte §1) ; les seuils sont des valeurs de départ, revus à l'étape 5 | RAG déclaré par l'owner | — |
| D9 | Étapes et priorité simples | Entonnoir PMI (identifier, catégoriser, évaluer, sélectionner) réduit à 5 états ; une formule additive se lit en CDP sans explication | Pondérations, WSJF | — |
| D10 | Périmètre v0 | Deux projets saisis à la main testent le chemin Gérer ; Run TI rend visible la capacité réellement libre | Goutte + Expert G1 seuls | — |
| D11 | Sources v0 | Toutes déjà connectées ; aucune nouvelle intégration | SharePoint comme dépôt JSON (inutile : l'artefact suffit) · courriel comme entrée (contourne le modèle) | — |
| D12 | Bloc feed | Parser le JavaScript de chaque artefact casse en silence au premier artefact différent ; ajouter le bloc à ses propres artefacts est une préparation de source par son owner, pas une écriture du portefeuille | Parser `ROWS` de chaque Gantt | — |
| D13 | Vue équipe d'abord | Les chiffres doivent survivre deux lundis avant d'aller au CDP | Vue CDP d'abord | — |
| D14 | Modèle avant interface | Le formulaire Gérer dépend du schéma ; changer le schéma après casse le formulaire | Dashboard d'abord | — |
| D16 | Dépendances typées | Oubli de la v1 relevé par Franck le 27 oct. : Codes de taxes dépend de livrables architecte ; sans dépendance, un glissement amont reste invisible jusqu'au jalon aval · le feed architecte devient la cible naturelle | Dépendances libres en texte (non exploitables par les règles) | — |
| D17 | Run — Extranets par extranet | 10 extranets supportés dans JSM STG21 ; un seul chiffre « support » masque l'extranet qui dérape · le board a déjà un artefact de triage (skill maj-triage-stg21) : même source, pas de 2e lecture | Support agrégé en un item | — |
| D18 | MEP sur la grille | Le ledger montre déjà des MEP (G1, IIS, extranets) hors de tout plan ; une MEP est un jalon au sens D4 (date, oui/non) et un consommateur de capacité dev | MEP cachées dans le run | Ledger W44 : MEP planifiées connues seulement le jour même |
| D19 | Actions de rétro dans la vue sprint | Les actions vivent dans Miro et meurent entre deux rétros ; les montrer dans la vue sprint les relie à la capacité et aux jalons · la skill retro-sprint-g21 reprend déjà les actions précédentes : le portefeuille lit le même cadre | Recopier les actions dans Jira | — |
| D20 | Droits par niveau de partage | La base de l'artefact porte des règles d'écriture par niveau (interact · admin · owner), pas par personne ni par ligne ; question de Franck du 27 oct. (« moi oui, mes développeurs non ») couverte par owner-only | Droits par ligne (non disponibles) · page publique (interdite par la capacité db avec règles) | — |
| D15 | Reports | Import Excel : seulement quand le flux d'idées dépasse la saisie manuelle · vues CDP / auditeur : attendent des chiffres fiables · budget heures : dépend du taux horaire (décision ouverte D1 du plan Goutte v7 §16) | — | — |

## Limites assumées

| Limite | Conséquence | Déclencheur de révision |
|---|---|---|
| Base de l'artefact | Confortable jusqu'à ~50–100 items et un éditeur | Dépassement ou 2e éditeur → bascule Smartsheet, modèle inchangé |
| Partage par lien | Tout lecteur voit tout ; pas de droits par ligne | Besoin de confidentialité par projet → Smartsheet ou vues séparées |
| Fraîcheur dépend de Franck | Un item hors source non mis à jour vieillit | Alerte > 15 j ouvrés sans Smartsheet ni Jira dans le digest (v4) |
| Seuils D7 / D8 posés sans historique | Faux positifs les premières semaines | Révision à l'étape 5, puis chaque mois |

## v2 (2026-10-28, retours R23 R24 R28)

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| D7-v2 | Volet Flux de D7 (WIP saisi par personne, limites Archi 2 · BA 2 · PM 3) abandonné ; données de test supprimées (accord Franck) | Personne ne tenait la saisie : seule donnée = un test (Luc 1/2, Franck 1/3) ; la tuile « WIP le plus chargé » n'apportait rien (R24), « charge saisie » incomprise (R28), gestion d'équipe attendue dans Outlook (R23) ; la capacité réelle vient de Jira (sous-tâches) et d'Outlook (absences) | Pause réversible (données gardées) · garder un formulaire « absences collectives » | Une donnée saisie à la main sans propriétaire ni rituel ne vit pas : avant d'ajouter une saisie, nommer qui la tient et quand |
| D7-v2b | Plus de saisie d'absences collectives dans le portefeuille | Franck : l'équipe se gère dans Outlook (R23) | Formulaire conservé | Les fériés et fermetures ne comptent dans la capacité que s'ils sont dans les calendriers Outlook |

## D20-v3 (2026-10-29, retours R37 R38)

| Écart | Cause | Option écartée | Erreur payée |
|---|---|---|---|
| Un item peut être masqué aux visiteurs alors que D20 exclut tout droit par ligne | Franck (R37) : cacher du bruit, pas une information confidentielle (réponse du 29 oct.) ; un filtre d'affichage suffit et ne touche pas aux règles `db` | Stockage privé par item (sous-collection propriétaire) : nécessaire seulement si confidentiel ; plus long, deux sources pour un item | — |
| Le digest Teams applique le même filtre | Le canal est lu par l'équipe : un item masqué dans la page mais cité dans le digest contredirait la case | Digest complet pour Franck seul | — |
| Limite assumée : la base reste lisible par quiconque ouvre la page (outils du navigateur) | Conséquence directe du filtre d'affichage | — | Ne jamais présenter « masqué » comme « confidentiel » |

## D7-v3, D11-v3, D19-v3 (2026-10-29, retours R40 R41, relecture au contexte neuf)

| Écart | Cause | Option écartée | Erreur payée |
|---|---|---|---|
| D7-v2b disait « les fériés ne comptent que s'ils sont dans Outlook » ; v3 les lit dans `config/feries.json` | Outlook ne porte aucun férié (recherches du 29 oct. : 0) ; Franck : « prends les jours du Québec, j'ajoute les autres au calendrier » | Rouvrir la saisie collective dans Gérer | Une évolution classée « règle seule » au modèle peut rouvrir une décision : relire le kickoff à chaque version du modèle |
| D19 : la page écrit le statut d'une action | Franck (R40) ; même règle que la skill `maj-actions-retro` (statut seul) | Écrire dans Miro (interdit) | — |

## D8-v4 (2026-10-29, retour R44)

| Écart | Cause | Option écartée | Erreur payée |
|---|---|---|---|
| Fraîcheur : 14 j calendaires → 15 j ouvrés | Franck : 15 j ouvrés = un sprint de 3 semaines, rythme réel de l'équipe | 14 j calendaires (seuil sans lien avec le sprint) | — |
| Fraîcheur : Smartsheet seul → Smartsheet ou activité Jira | 7 alertes sur 11 au 29 oct. disaient « Smartsheet non mis à jour depuis 21 j » alors que Codes de taxes avait 16 tickets dans le sprint : le signal mesurait la feuille, pas le projet | Lire la date `updated` de chaque ticket (adaptateur et brut plus lourds) ; tickets dans le sprint lu = activité, datée par la lecture | Un indicateur de fraîcheur lu dans une seule source mesure la source : le confronter à l'activité réelle avant de l'afficher |
| F1 (fiche Smartsheet v5, motif S6 : fraîcheur lue dans la source seule) rouvert : l'activité Jira peut masquer un % Smartsheet périmé (risque R2 de F1) | Franck préfère mesurer l'activité du projet ; le % reste daté dans la ligne de la grille (« MAJ il y a N j » au-delà de 7 j) | Garder F1 seul | — |
| Même règle pour la pastille et la liste d'alertes | Sinon une pastille rouge sans alerte, ou l'inverse | Règle propre aux alertes | — |

## D11-D17-D18-v5 (2026-10-29, checkpoint)

| Écart | Motif | Option écartée | Erreur payée |
|---|---|---|---|
| Kickoff : SDD, PLQ et JSM STG21 lus ; réel : connecteur Atlassian limité à GOU21 depuis le 27 oct. (modèle v2) | Franck 29 oct. : acter GOU21 seul ; le ledger porte déjà les MEP SDD / PLQ ; le support se lit par les tickets GOU21 liés à STG21 | Demander l'accès SDD / PLQ au connecteur (lecture du run en itération 4) | Relecture à froid du checkpoint : le périmètre avait été réduit dans le modèle sans réviser le Kickoff ; règle : une limite d'outil qui réduit une décision se reporte dans le Kickoff le jour même |

## D21-D22-v6 (2026-10-30, Franck : « cas qui risque d'arriver plus d'une fois »)

| # | Décision | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| D21 | Skill d'ajout de projet | Un ajout touche 4 systèmes (base, registre Gantt, Jira, SharePoint) et 6 contrôles ; une skill rend le résultat identique d'un projet à l'autre ; Franck a choisi la skill le 30 oct. | Interface Gérer seule (la page ne lit pas SharePoint : le Gantt resterait à faire en conversation) · conversation libre (étapes et contrôles variables) | — |
| D22 | Gantt reproduit, pas copié | Franck, 30 oct. : « dans le futur ce sera un JSON et pas une image, il faut le reproduire » ; les données nourrissent santé, recul et prochain jalon, l'image ne nourrit rien | Image du drawio en bas de fiche · image + jalons extraits | — |
| D22 | Tâches du Gantt = affichage, pas items | D4 (jalons, jamais tâches) tient : 43 tâches de Méthane P2 en items ou jalons noieraient le portefeuille | Une tâche = un jalon | — |

## D22-v7 (2026-10-30, Franck : « le graphe Expert G1 devrait aussi avoir son Gantt »)

| # | Décision | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| D22 | Le Gantt d'un artefact projet passe par son bloc feed | D12 : un artefact n'est lu que par son bloc feed ; lire le tableau `ROWS` du JavaScript de la page casserait en silence au premier changement de la page | Parser le `<script>` de la page côté portefeuille · inscrire l'artefact au registre Gantt (le registre lit des fichiers SharePoint) | — |
| D22 | Le producteur ajoute la ligne `gantts` avec un outil (`feeds/expertg1_gantt.js`) | La page de l'artefact est sa propriété (D12) ; l'outil lit ses constantes de données en bac à sable, jamais le code d'affichage, et réécrit le bloc en place (idempotent) | Réécrire le bloc entier (diff illisible pour les sessions Expert G1) | — |
| D22 | Lignes jalon du Gantt d'un feed = affichage seulement | Le bloc porte déjà sa collection `jalons` ; les reprendre du Gantt ferait des doublons | Créer les jalons depuis le Gantt comme pour un fichier | — |
