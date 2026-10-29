# Adaptateur Outlook v1 — annexe des motifs

> On n'ouvre ce fichier que pour rouvrir un arbitrage de `Adaptateur_Outlook_v1.md`. Un motif se déplace, ne se supprime jamais.

| # | Motif | Options écartées | Erreur payée / cause réutilisable |
|---|---|---|---|
| O1 | `outlook_calendar_search` avec `calendarOwnerEmail` répond 404 (ErrorItemNotFound) : les calendriers de l'équipe ne sont pas partagés avec Franck, malgré l'étendue `Calendars.Read.Shared`. Les disponibilités (`find_meeting_availability`) lisent tout le monde et exposent `oof` sans objet ni motif : c'est le repli prévu par le prompt et le moyen le plus respectueux de la vie privée. | Lire le calendrier de Franck seul (ne couvre qu'une personne) ; demander les partages (délai, intrusif). | Une étendue accordée ne prouve pas l'accès : tester un appel réel sur une autre personne avant de concevoir. |
| O2 | La lecture réelle montre un `oof` récurrent de Personne_05 12h–13h30 tous les jours : une règle « au moins un créneau oof dans la journée » aurait produit 31 jours d'absence. Les créneaux de 60 min qui chevauchent midi sont donc exclus des deux demi-journées ; ≥ 2 créneaux évitent de conclure sur un seul. | Journée entière seulement (perd les demi-journées) ; un créneau suffit (faux positifs). | Le motif d'une règle de détection se trouve dans les données réelles, pas dans la spécification : lancer la lecture avant d'écrire la règle. |
| O2b | `findMeetingTimes` ne renvoie que les créneaux où la majorité est libre : un jour très chargé n'a aucun créneau du matin (28 oct.). La demi-journée est alors non concluante plutôt que « présente ». | Supposer présent (masque une absence) ; appels par personne (450 appels). | Absence de donnée ≠ donnée négative : signaler. |
| O3 | Team_G2.1 porte « Kowalzzyk » et « Bourgoin » ; l'annuaire « Kowalczyk », « Personne_02 ». L'id semé à l'étape 2 est `team.kowalczyk-franck` : prendre l'orthographe source aurait créé un doublon de Franck. | Table d'alias codée en dur (à maintenir). | Un identifiant dérivé d'un nom saisi à la main hérite de ses fautes : dériver d'un référentiel. |
| O4 | « CDP » n'a pas de prénom ni de calendrier : c'est le comité. | Écrire une personne `cdp` (rôle existe dans l'enum) — fausserait les listes Personne. | — |
| O5 | AF et UX participent au daily Team Rocket (calendrier) → sprint ; BA, architecte, PM, coordo sont les rôles à WIP de D7 ; directeur et experts ne portent pas de charge projet. Personne_11 est AF dans Team_G2.1 mais « analyste d'affaires » dans l'annuaire : Team_G2.1 fait foi pour le rôle. | Voie par personne (non maintenable). | — |
| O6 | `wip_limite` est réglable dans Gérer : l'écraser par D7 à chaque lecture effacerait une saisie de Franck. | — | — |
| O7 | Même règle que 3a–3c (« jamais supprimé ») ; le risque est une capacité sous-estimée tant que Franck ne retire pas l'absence annulée — signalé à chaque lecture. | Supprimer automatiquement (interdit sans accord). | — |
| O8 | `absJoursDansPeriode` comptait les jours de semaine de la période, sans lire `jours_ouvres` : une demi-journée retirait 1 j. Correction proratisée + test ; republication de l'artefact (pré-approuvée). | Stocker deux enregistrements par demi-journée (illisible). | Un champ du modèle non lu par la vue est un bug latent : tester la vue avec une valeur non entière. |
| E7 | Le seed de l'étape 2 avait déjà mis `saisie` pour Team_G2.1 ; garder la même valeur évite deux provenances pour la même donnée. | — | — |
| L2 | Risque en base « Manque de visibilité long terme suite au départ de François » (L8 Paies) + absence de l'annuaire → départ probable. Non tranché : Team_G2.1 est la source, et c'est à Franck de la corriger. | Retirer la personne côté portefeuille (contredit la source). | — |

## Relecture sous-agent neuf (27 oct., terminée avant 19h39 EDT à l'horloge) — écarts et causes

| # | Écart trouvé | Cause | Suite |
|---|---|---|---|
| R1 | Absence en cours au début de la fenêtre comptée deux fois (nouvel id au jour de lecture + ancien gardé) | id tiré de `debut`, tronqué par la fenêtre glissante ; O7 garde l'ancien | O9 : id repris par chevauchement + partie passée reportée ; test |
| R2 | Férié saisi après une absence Outlook qui le couvre : jour retiré deux fois | anti-doublon seulement à la lecture ; `absJoursDansPeriode` additionnait | O8 : plafond 1 j par jour dans `core.js` ; test |
| R3 | Id de personne instable si l'annuaire rate une personne ; homonymes s'écrasent ; « Marc-André » mal découpé | id dérivé d'un texte libre, coupe au premier espace, pas de détection de collision | O3 : base d'abord, rapprochement ≤ 2 fautes, collision signalée ; tests. Payé : le correctif a d'abord produit `team.marc-andre-personne-10` (prénom composé) — tester les prénoms composés |
| R4 | Fiche : « 3 → 6 personnes flux » ; réel 3 → 4 | compté avant l'arbitrage O5 (AF en scrum) | fiche corrigée |
| R5 | 2 créneaux qui se chevauchent (1 h 30) suffisaient pour une demi-journée | règle comptait des créneaux, pas des minutes | O2 : couverture ≥ 2 h ; test |
| R6 | `oof` du midi déborde sur le créneau 13h–14h | bornes fixes ignorant la plage observée | après-midi = créneaux ≥ 13h30 |
| R7 | Signaux invisibles dans l'application | modèle et vue sans place pour les signaux | L6 → étape 4 (digest) |
| R8 | « plus vue » signalée pour une absence décalée | comparaison par id | comparaison par chevauchement |
| R9 | Réserve run comptée deux fois (charge semée 4,5 j-p) | valeur de maquette figée à 1 dev | L7 : suppression demandée à Franck |
| R10 | §5 attribué à une fonction qui ne fait pas ce calcul | deux définitions de « 4 semaines » | §5 précisé |
| R11 | Personnes `systeme = saisie` confondues avec Gérer | E7 | modèle v2 |
| R12 | Réécriture des 15 personnes à chaque lecture | pas de diff avant `set` | O10 |
| R13 | Demi-journée au bord d'une période multi-jours mal proratisée | E8 | L8 |
| R14 | Heures de lecture et commandes de test imprécises dans la fiche | fiche écrite depuis l'heure Outlook seule | fiche corrigée |
| R15 | Brut (disponibilités de 14 personnes, courriels) gardé localement sans règle | brut = preuve d'exécution | O11 : exclu de git |
| R16 | Heure de relecture d'abord écrite « 19h45 » sans horloge (réelle : avant 19h39) | heure estimée, pas lue | Payé : toute heure écrite vient de `date` (TZ America/Toronto) |
| D1 | Franck (27 oct.) : AF et UX hors capacité ; Personne_07 parti ; suppression de `run.ti.s19.dev` acceptée. O5 remplacé : AF/UX étaient en scrum parce qu'ils assistent au daily — présence au daily ≠ capacité de sprint. | — | Une participation à un rituel ne dit pas la capacité : demander. |
| D2 | Team_G2.1 est en lecture seule pour Claude : le départ est porté par `config/team_departs.json` (source = réponse de Franck), pas par une modification de la source. | Supprimer la ligne côté base seulement (recréée à la lecture suivante). | Une suppression en base d'une donnée encore dans la source revient au prochain passage : bloquer à l'entrée. |

## v2 (R36, 2026-10-28)

Voir `05_Pilotage/Cadence_Rafraichissement_v1_Annexe_Motifs.md` M8, M10 (mode équipe, réel conservé).

## v3 (R41, 2026-10-29)

Voir `02_Modele/Modele_Canonique_v11_Annexe_Motifs.md` M45–M48.
