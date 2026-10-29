# Instructions projet — Portefeuille PLQ

Outil de visibilité du portefeuille TI (3 mois glissants, sprints, jalons, dépendances, risques, charge, MEP, run).
Couche 0 au-dessus de Goutte 2.1. Décisions D1–D20 : `01_Cadrage/Portefeuille_PLQ_Kickoff_v5.md` (motifs dans l'annexe).
Ne rouvrir une décision qu'en écrivant l'écart et sa cause, puis en proposant.

## Langue, heure, style
- Livrables en français (Québec), conversation dans la langue de Franck.
- Heures du Québec (EDT −04:00 l'été, EST −05:00 du 1er nov. au 14 mars), jamais d'UTC brut.
- Code dans `C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\`, commentaires en anglais.
- Documents : quoi seulement, un point par sujet, une ligne par point, tableaux, deux écrans max.
  Motifs, options écartées, erreurs payées → `*_Annexe_Motifs.md`. Un motif se déplace, ne se supprime jamais.
- Avant de livrer un document qui porte une décision : relecture par un sous-agent au contexte neuf, sans lui
  donner le raisonnement, en lui demandant la cause de chaque écart.
- Essayer les commandes plutôt que relire le texte : un adaptateur est fini quand il a tourné sur les vraies données.
- Question à Franck seulement si (1) il détient l'info, (2) la réponse déplace un livrable, (3) elle se comprend
  sans ouvrir un fichier. Sinon trancher, appliquer, noter l'arbitrage dans le livrable.

## Règles produit
| Règle | Énoncé |
|---|---|
| Source de vérité | Le portefeuille ne modifie jamais Smartsheet, Jira, Outlook, Miro, ni un artefact source |
| Grain | Item = programme, projet ou run ; jalons, jamais tâches ; test : « oui/non à une date » = jalon |
| Goutte 2.1 | Lu au grain L + items promus par Franck ; jamais d'entité ni de story |
| Santé | Calculée (D8), jamais déclarée ; fraîcheur > 15 j ouvrés sans mise à jour Smartsheet ni activité Jira = alerte (D8 v4) |
| Capacité | Scrum = jours-personne − absences − réserve run (15 %) ; charge = points d'équipe et sous-tâches Jira ; WIP saisi abandonné (D7 v2, 28 oct.) ; aucune heure saisie |
| Dépendances | Typées (bloque · alimente · attend) ; un prédécesseur qui recule met le successeur en alerte |
| Feed | Un artefact projet n'est lu que s'il porte `<script type="application/json" id="portfolio-feed">` au modèle canonique ; sinon ignoré et signalé |
| Droits | Artefact partagé en lecture ; écriture `db` réservée au niveau owner ; Gérer masqué si `user.canEdit()` est faux ; item masqué (`visible` false) = filtre d'affichage (vue visiteur + digest), jamais une confidentialité (D20 v3) |
| Instantanés | Chaque lundi, instantané daté écrit avant tout recalcul ; jamais supprimé |
| Données personnelles | Rien de `Goutte2.1/01_Gouvernance/Recrutements/` n'entre dans la base ni dans un digest |

## Structure
```
Portefeuille_PLQ/
├── 01_Cadrage/        kickoff, annexe motifs, prompt initial, flux (HTML, artefact « Flux Portefeuille PLQ »), maquettes/ · _Archives/
├── 02_Modele/         Modele_Canonique_vN.md, schema.json, exemples
├── 03_Interface/      spécification de l'artefact, captures, notes de version (le code est dans Projets_Dev)
├── 04_Adaptateurs/    une fiche par source : champs lus, mapping, tableau source/base, limites
├── 05_Pilotage/       digests du lundi (AAAA-MM/), journal des écarts, kickoff vN
├── _Outils/           Prompts/ · Skills/
└── CLAUDE.md
```
Racine plafonnée à ces 7 entrées. Nouveau sujet → dans une phase existante.

## Versioning et archivage (hérité de Goutte 2.1)
- Documents vivants : suffixe `_vN` obligatoire ; la dernière `_vN` hors `_Archives/` fait foi ; créer `_vN+1`
  = déplacer `_vN` dans `_Archives/` adjacent (fait partie du Definition of Done).
- Enregistrements datés (digests, instantanés) : `AAAA-MM-JJ` dans le nom, partition `AAAA-MM/`, jamais archivés.
- Noms de fichiers : `[A-Za-z0-9._-]` seulement ; pas d'espace, d'accent, de double extension.
- Suppression : jamais sans accord explicite (fichier, ligne, item, brouillon). Un déplacement n'est pas une suppression.
  Seule exception permanente (Franck, 29 oct.) : l'adaptateur Jira data supprime ses charges non relues dans les sprints qu'il vient de lire (K13).
- Skill `archive-versions` en mode `audit` d'abord.

## Sources et identifiants
| Source | Référence |
|---|---|
| Goutte 2.1 (lecture) | `C:\Users\fkowalczyk\OneDrive - Les producteurs de lait du Québec\Documents\Claude\Goutte2.1\` |
| Smartsheet | `Goutte21_Master` 230627583414148 · `Jalons_Entites` 2733930749841284 |
| Jira | GOU21 seul (sprints, versions MEP, tickets liés aux demandes STG21) ; SDD et PLQ hors connecteur : MEP par le ledger (Kickoff D11 v5) |
| Artefacts | Maquettes https://claude.ai/artifact/DSpedLCbm6enVxTz9cS9nd · Expert G1 Gantt S1 https://claude.ai/artifact/E3KrS3o15gWHwuqrvpnETg · Design system https://claude.ai/artifact/SW339XsDhEpz696xhonAC1 |
| Miro | Dernier board de rétro GOU21, cadre « Actions du sprint suivant » |
| Teams | Canal du digest : `G1_Agent_Analystes` (groupId `e3fe050d-5ad9-4bd4-a483-cc4e5413ac49`, canal `19:bxs3bIvPMcXuZc0tA9xidnPdhemHhzafgN1S5FuKPV81@thread.tacv2`) |

## Fin d'étape
À chaque fin d'étape : ce qui est fait, ce qui a été tranché sans Franck et pourquoi, un conseil pour le prochain prompt.
