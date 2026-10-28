# Portefeuille PLQ — Prompt de reprise : atelier R06 (organisation de Goutte 2.1 dans Smartsheet) v1

> À coller dans un nouveau chat du projet Portefeuille PLQ. Remplacer la ligne « Mes exemples » avant d'envoyer.

```
Reprise du projet Portefeuille PLQ — atelier R06 avec moi.
Retour R06 (05_Pilotage/2026-10/Retours_Iteration1_2026-10-28.md) : « Goutte 2.1 est mal organisé dans le portefeuille ;
il faut que l'on travaille ensemble pour comprendre comment améliorer la source dans Smartsheet ».

Mes exemples (2 ou 3 lignes qui me gênent, avec ce que j'attends) :
- <ex. L3-L4 Producteur 1&2 : « A Revoir » depuis 112 j alors que … ; j'attends …>
- <…>

État au 28 oct. 2026 (lis avant de répondre, rien d'autre) :
- 04_Adaptateurs/Adaptateur_Smartsheet_v1.md (+ annexe) : comment Goutte21_Master (230627583414148) est lu —
  grain L par l'ID, % et Phase, fraîcheur = dernière modif. des cellules % et Phase.
- 02_Modele/Modele_Canonique_v2.md : items, epics_jira, rang.
- Constats connus : 5 L dont Niveau = Entité (L1, L2, L3-L4, L5, L6) ; phase vide sur L0.1, L8, L8D, L8E ;
  « Dernière MAJ », « Jalon prochain », « Dépendances » vides partout ; L3-L4, L5, L6 « A Revoir » sans mise à jour
  depuis 112 j ; codes de taxes absent de Smartsheet (item saisi, promu) ; épopées Jira rattachées à la main dans Gérer.

Déroulé de l'atelier :
1. Lis la feuille en direct (lecture seule, get_resource_guide intents ['smartsheet-intelligence'] d'abord) : les lignes
   L, sous-L et leurs colonnes utiles. Montre-moi en un tableau, pour mes exemples, ce que la feuille contient et ce que le
   portefeuille en affiche.
2. Pour chaque écart : la cause (structure de la feuille, saisie, règle de l'adaptateur, modèle) en une ligne.
3. Propose au plus 5 changements, classés : dans la feuille (c'est moi qui les fais), dans l'adaptateur, dans le modèle.
   Une question à choix multiple par décision (AskUserQuestion), pas de texte ouvert.
4. Écris 05_Pilotage/Atelier_R06_Smartsheet_v1.md (quoi seulement, tableaux) + annexe des motifs ; relecture par un
   sous-agent au contexte neuf (cause de chaque écart) avant de me le livrer.
5. Ce qui touche l'adaptateur ou le modèle : applique-le (code, tests sur les vraies données, fiche _v2, commit) ;
   ce qui touche la feuille : liste-le pour moi, je l'applique.

Interdits : aucune écriture dans Smartsheet ni dans Goutte2.1 ; aucune suppression sans mon accord.
Hors périmètre : R13 (parqué). Le 1er lundi réel tourne le 2 nov. (prompt de reprise étape 5 ensuite).
Fin d'étape : ce qui est fait, ce que tu as tranché sans moi et pourquoi, un conseil pour le prochain prompt.
```
