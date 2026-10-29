# Portefeuille PLQ — Kickoff v1 · Annexe motifs

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
| Fraîcheur dépend de Franck | Un item hors source non mis à jour vieillit | Alerte > 14 j dans le digest |
| Seuils D7 / D8 posés sans historique | Faux positifs les premières semaines | Révision à l'étape 5, puis chaque mois |
