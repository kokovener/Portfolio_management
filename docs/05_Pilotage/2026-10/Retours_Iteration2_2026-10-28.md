# Retours itération 2 — 2026-10-28

Une ligne par retour. Écran = où tu l'as vu (Portefeuille · Projet · Sprint · Gérer · digest · Teams). Prio : M (bloquant) · S (à faire) · C (confort).
Laisse vides les colonnes Impact et Statut : Claude les remplit au tri.
Contexte : page v15 (atelier R06), modèle v3, adaptateur Smartsheet v2. Itération 1 : `Retours_Iteration1_2026-10-28.md` (R01–R14).

| ID | Écran / zone | Constat (ce que je vois) | Attendu (ce que je veux) | Prio | Impact (Claude) | Statut (Claude) |
|---|---|---|---|---|---|---|
| R15 | sprint / MEP | toute groupée | les regroupée par theme : extranet / Goutte 2.1 / Autre / SDD et pouvoir plié / déplié les categories. par defaut Goutte2.1 est celle ouverte | S | Interface · règle thème MEP (calculée à l'affichage) | Fait (v22) : MEP du sprint par thème Goutte 2.1 · Extranet · SDD · Autre, accordéon, Goutte 2.1 ouvert |
| R16 | tous les ecrans | je vois des points rouge, orange vert | c'Est quoi ? il faut une legende visible tout le temps | S | Interface | Fait (v19) : bandeau sous l'en-tête, 3 écrans — Rouge · Orange · Vert · Gris avec leur règle ; survol = motif |
| R17 | portefeuill | boutton fleche pour d.placer | je souhaite un bouton en debut de ligne pour faire du drag and drop | C | Interface (remplace ▲▼, garde `item.rang`) | Fait (v27) : poignée ⠿ en début de ligne (glisser-déposer dans la section, ↑ ↓ au clavier) ; ▲▼ retirés |
| R18 | portefeuil | vue future | je souhaite avoir la possibilité de voir les 3 dernier mois egalement si je le souhaite | S | Interface · historique limité aux lectures depuis le 27 oct. (ledger W40+) | Fait (v30) : sélecteur « Horizon » : 13 semaines à venir (défaut) ou + 13 semaines passées ; passé limité aux données lues (réel Jira depuis S15, MEP du ledger W40+) |
| R19 | portefeuille é mep | | meme regle que R15 | S | Interface (ligne MEP du Gantt) | Fait (v22) : une ligne MEP par thème sur le Gantt, même règle, repliable |
| R20 | sprint / jalon dans le sprint |  | retirer le bloc  | S | Interface | Fait (v20) : bloc et tuile « jalons dans le sprint » retirés ; jalons visibles au Gantt et dans la fiche projet |
| R21 | sprint | | ajouté les oblectif du sprint dans une boite avant R20 | S | Interface (l'adaptateur Jira lisait déjà le « But du sprint ») | Fait (v24) : bandeau pleine largeur sous le titre du sprint ; S19 « Terminer le sprint » ; S20 sans objectif saisi dans Jira |
| R22 | sprint | | action de la retro en premier dasn la colonne  | C | Interface | Fait (v21) : actions de la rétro en tête de la colonne de droite ; objectif du sprint en bandeau pleine largeur (R21, choix Franck) |
| R23 | sprint gestion d'equipe | | retirer cette parie pour le moment, ca doit etre géere  via outlook | S | Interface · touche D7 (WIP flux saisi) | Fait (v26) : carte « Gérer · équipe » retirée (WIP et absences collectives) |
| R24 | portefeuille | bloc vert WIP avec luc le plus chargé | a supprimer ca n'importe rien | S | Interface · touche D7 | Fait (v26) : tuile WIP retirée |
| R25 | tout |  | essaye de mettre cela un peu au couleur PLQ mais en gardant le fait que je suis en mode sombre | C | Interface (jetons de couleur, design system PLQ) | Fait (v28) : mode sombre aux couleurs PLQ (fonds marine navy-900, accent cyan-500, blocs blé / pâturage à la valeur de marque, boutons blue-600) ; contrastes ≥ 4,5:1 vérifiés |
| R26 | portefeuille gantt | barre du gant en findue qui semple pas intégré | améliore le graphisme du gantt avec desvrai barre | S | Interface (Gantt) | Fait (v29) : vraies barres (prévu = barre teintée pleine, réel = trait bleu dessous, non daté = bord ajouré au lieu du fondu) ; légende mise à jour |
| R27 | projet / attente d'un tiers | vide la plupart du temps | il peut prendre en compte si il ya des tickets bloqués dans l'epic, ou des commentaiores bloquants dans smartsheet | S | Adaptateurs Jira + Smartsheet (commentaires) · modèle v5 (`attente` lue) | Fait (29 oct.) : attentes lues — Jira (statut Bloqué, lien « est bloqué par » ; 12 attentes écrites : codes de taxes 6, run extranets 5, L0 1) et Smartsheet (commentaire bloquant / BLOQ / bloque / bloqué ; 0 commentaire sur la feuille aujourd'hui) ; modèle v9, Jira v7, Smartsheet v5, tâches lundi v10 / passages v3 · complément Franck (v33) : carte « Bloqués dans le sprint » (tickets Bloqué du sprint, sous-tâches sous leur parente, assigné, durée) — 11 tickets bloqués lus, dont 9 en S19 (S19 courant) |
| R28 | projet charge saisie | | je ne comprend pas cette partie | S | Réponse + interface · touche D7 | Fait (v26) : « charge saisie » = WIP/ETP saisis à la main — retirée avec l'onglet « Charge flux » ; décision Franck : volet flux de D7 abandonné (Kickoff v2, modèle v8), 2 charges de test supprimées |
| R29 | projet | lien sharepoint | je ne souhaite pas afficher les liens sharepoint dans cette app pour le moment  | S | Données (base) | Fait (28 oct.) : 2 liens SharePoint supprimés de « Codes de taxes » (accord explicite Franck) ; lien Smartsheet gardé (il relie l'item à sa ligne, R30) |
| R30 | projet | code de taxe | contrôlé pourquoi le projet n'Est pas marqué comme actif alors qu il est dans smartsheet et le sprint  | M | Adaptateur Smartsheet — **bug confirmé** : l'item saisi lié par rowId garde `etape=planifié` et `voie=flux` saisis ; la source dit AF/UX et l'épopée 9199 est au sprint | Fait (v18) : codes de taxes actif · scrum ; étape et voie lues de Smartsheet, lecture seule dans Gérer ; modèle v5, adaptateur Smartsheet v4, tâche du lundi v5 |
| R31 | projet | projet · voie flux · item promu | je ne comprend pas ca  | S | Réponse + libellés en clair (dépend de R30 : voie flux erronée) | Fait (v18) : « Projet · suivi en sprints Jira · sous-livraison de L8D » ; « promu » retiré des lignes du Gantt |
| R32 | portefeuille  | tickets de support| avoir le nom des tickets | S | Interface (titre du ticket GOU21 lié ; le titre STG21 n'est pas lisible) | Fait (v32) : carte Support du portefeuille = demandes STG21 (lien) avec leurs tickets GOU21 (clé, titre, sprint ou « sans sprint ») |
| R33 | sprint  | tickets de support| créé un block avec les tickets de support dans le sprint | S | Interface (+ sprint du ticket, adaptateur Jira) | Fait (v31, 29 oct.) : bloc « Support dans le sprint · STG21 » (clé GOU21, titre, extranet, lien STG21, état) sur les 3 vues ; le reste résumé (sans sprint, autre sprint) ; lu au passage de 9 h |
| R34 | sprint future sprint  | | ajouter un bloc avec les tichets pret pour sprint et pret pour grooming dans le future sprint (statut jira) | S | Adaptateur Jira (statuts Prêt pour sprint / grooming) · modèle v5 | Fait (v25) : bloc « Préparation » du sprint futur, tout le backlog GOU21 (choix Franck), ordre Jira, marqué « dans S20 » ; 20 tickets lus le 28 oct. (1 prêt sprint, 19 prêt grooming) |
| R35 | sprint future sprint  | | adapter la vue car la plupart des information sont pour le current sprint, pas le future | S | Interface (vue Sprint selon l'état actif / futur / clos) | Fait (v25) : vue selon l'état — futur : préparation, capacité prévue, sans sous-tâches ni support ; objectif et actions du sprint précédent gardés (Franck /V7) ; clos : « bilan » |
| R36 | equipe  | jean daniel hors equipe | il est ajouté au fichier excel. ce qui m'amene a une reflexion : toutes composantes de cette app n'ont pas besoin du meme taux de rafraichissement ni d'etrenecessairement rafraichit au meme moment. vomment on gere ca ? | S | Données (relire Team_G2.1) · question de cadence = proposition (tâche du lundi) | Fait (v23, 28 oct.) : cadence `05_Pilotage/Cadence_Rafraichissement_v1.md` (F1–F5) ; tâches quotidien 9 h (lun–ven), jeudi 13 h, lundi v6 ; fraîcheur par bloc sur la page ; Jean-Daniel ajouté (équipe à la demande) — rattaché à ses sous-tâches au passage de 9 h du 29 oct. |

## Lots

| Lot | Retours | Contenu |
|---|---|---|
| A — données fausses | R30 · R31 | Bug adaptateur Smartsheet (item saisi lié) + libellés compréhensibles |
| B — retraits rapides | R16 · R20 · R22 · R29 | Légende, retraits, ordre, liens masqués — interface seule |
| C — MEP par thème | R15 · R19 | Extranet · Goutte 2.1 · SDD · Autre, accordéon, Goutte 2.1 ouvert |
| D — équipe et cadence | R36 | Relire Team_G2.1 ; proposer une cadence par source |
| E — vue Sprint | R21 · R34 · R35 · R33 · R32 | Objectif, sprint futur (prêt pour sprint / grooming), support dans le sprint, noms des tickets |
| F — WIP flux | R23 · R24 · R28 | Retrait du WIP saisi : écart à D7 écrit puis proposé |
| G — automatisation | R27 · R18 | Attentes lues dans Jira / Smartsheet ; 3 mois passés |
| H — visuel | R17 · R25 · R26 | Glisser-déposer, couleurs PLQ en sombre, barres de Gantt |

## Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| T11 | Prio remplie par Claude (colonne vide) : M = donnée fausse affichée ; S = demandé explicitement ; C = confort |
| T12 | Ordre : données fausses d'abord, puis retraits (gain immédiat, sans risque), puis ajouts, design en dernier (une seule passe de style) |
| T13 | R19 traité avec R15 (même règle) ; R31 avec R30 (même cause) ; R23/R24/R28 ensemble (même décision D7) |
| T15 | R30 : voie = scrum pour toute ligne Goutte 2.1, sans tester les sprints Jira (proposé « si épopée au sprint ») : même résultat, pas de couplage entre adaptateurs (modèle v5 M39) |
| T16 | R31 : « voie » et « promu » ne s'affichent plus ; libellés « suivi en sprints Jira / au fil de l'eau » et « sous-livraison de … » |
| T17 | R15 : règle de thème (ordre de priorité) — système « Extranet… » → Extranet (SDD-2970 Extranet Qualité y va) · ticket SDD → SDD · système « Infra… » → Autre · autre ticket GOU21 → Goutte 2.1 (choix Franck : GOU21-10748 G1) · reste → Autre ; aujourd'hui 1 · 8 · 12 · 3 |
| T14 | Modèle v5 groupé une seule fois pour R27 · R32 · R34 (au premier des trois qui le demande) |

## Limites connues (relecture au contexte neuf, 28 oct.)

| # | Limite | Suite |
|---|---|---|
| K9 | R30 : un item saisi auquel on ajoute `rowId=` reste modifiable dans Gérer jusqu'au lundi suivant (la lecture seule suit `source.systeme`) | acceptée |
| K11 | R36 : le passage de 9 h ne vérifie pas que le daily briefing a fini (gigue jusqu'à 8 h 37 + durée) ; ledger possiblement incomplet ce jour-là, rattrapé le lendemain | à surveiller au 1er passage |
| K12 | R36 : Jean-Daniel restait « hors équipe » après l'ajout à l'équipe — ses charges de sous-tâches gardaient son nom Jira, et le passage suivant aurait créé des doublons (id différent). Corrigé 28 oct. 21 h 30 : id conservé, 4 charges rattachées | fait |
| K13 | Une charge de sous-tâches qui sort d'un sprint dans Jira reste en base et compte encore (1 sous-tâche S20 de Jean-Daniel et de Sandy au 29 oct.) — jamais supprimée sans accord | fait 29 oct. : Franck = suppression automatique (accord permanent) ; 2 charges supprimées ; adaptateur Jira v6, tâche lundi v9 |
| K14 | R27 : la date d'une attente Jira = 1er jour vu bloqué (29 oct. pour les 12) ; un ticket bloqué depuis longtemps ne passe orange qu'après 5 j ouvrés | lire la date de passage à « Bloqué » (historique) si utile |
| K10 | R30 : ligne reliée devenue introuvable → étape et voie figées en lecture seule, un signal seulement | à traiter si le cas arrive |
