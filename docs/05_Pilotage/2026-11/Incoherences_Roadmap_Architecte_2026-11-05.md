# Incohérences — Roadmap de l'architecte

Source : artefact « Roadmap de l'architecte » (Personne_09), bloc `donnees-programme` 1.0, `date_donnees` 2026-11-02, lu le 5 nov. 2026 · 38 tâches, 14 projets. Contenu identique à la lecture du 2 nov.
Contrôles exécutés par script sur les données (dates, statuts, % , références), pas à l'œil.

## 1. Tâches en retard (fin prévue dépassée, non terminées)

| ID | Tâche | Fin prévue | Avancement | Écart |
|---|---|---|---|---|
| SC-24 | Service de recherche (Core UI) | 2 oct. 2026 | 95 % | 24 j o. de retard, fin prévue non replanifiée |
| SC-02 | Service de filtres FilterSpec | 30 oct. 2026 | 95 % | 4 j o. de retard, fin prévue non replanifiée |

## 2. Statut incohérent avec l'avancement ou les dates

| ID | Statut | Avancement | Dates prévues | Incohérence |
|---|---|---|---|---|
| DA-01 | à faire | 40 % | débuté 1er oct. 2026 | « à faire » alors que commencée et à 40 % |
| SC-06 | à faire | 25 % | débute avr. 2027 | 25 % d'avancement avant le début |
| SC-25 | en cours | 85 % | débute mars 2027 | « en cours » 4 mois avant son début |
| SC-26 | en cours | 65 % | débute avr. 2027 | idem |
| SE-06 | en cours | 50 % | débute avr. 2029 | idem, 2 ans et demi avant |
| IN-07 | en cours | 0 % | débute juin 2027 | en cours, 0 %, futur |
| DA-04 | en cours | 0 % | débute oct. 2027 | idem |
| IF-06 | en cours | 0 % | débute janv. 2028 | idem, et « au carnet » |
| DA-06 | en cours | 0 % | débute févr. 2028 | idem, et « au carnet » |

## 3. Avancement en décalage avec le temps écoulé (au 5 nov.)

| ID | Tâche | Temps écoulé | Avancement | Constat |
|---|---|---|---|---|
| GO-11 | Outillage d'analyse et de délégation | 60 % | 0 % | fin 30 nov. irréaliste ou % non mis à jour |
| IN-01 | Méthane Phase II | 60 % | 0 % | idem |
| SC-15 | Coordonnées, ISQ et Région | 80 % | 20 % | fin 6 nov. (demain) irréaliste |
| DA-11 | POC 2 — G1 sur copie BD G2.1 | 39 % | 20 % | retard probable |

## 4. Incohérences entre sources

| ID | Roadmap | Autre source | Écart |
|---|---|---|---|
| IN-01 | Méthane Phase II fin **30 nov. 2026** | Gantt Méthane P2 (même auteur) : déploiement 30 déc. → 5 janv., MEP **8 janv. 2027** | ~5 semaines ; la roadmap ne reflète pas son propre Gantt |

## 5. Séquencement illogique

| Constat | Tâches |
|---|---|
| Analyse planifiée **après** la réalisation | SC-25 « Analyse Méthane » (mars 2027) après IN-01 Méthane Phase II (fin nov. 2026) |
| Analyse planifiée **après** la réalisation | SC-26 « Analyse pour Audit » (avr.–juin 2027) après DA-01 « Audit central par CDC » (fin févr. 2027) |
| Corrections de la phase I **après** la phase II | IN-07 (juin 2027) après IN-01 (fin nov. 2026) |
| « Lien fort » mais 1 à 2 ans d'écart | IN-01 (nov. 2026) ↔ SE-05 (févr. 2027) et IF-06 (2028) |

## 6. Références à des tâches absentes de la roadmap

| Référence | Citée par | Mention |
|---|---|---|
| SC-05 | DA-01, SC-06 | « attend un chantier non planifié » |
| SE-04 | IN-01 | idem |
| DA-08 | SC-15 | idem |
| DA-02 | DA-07, SE-06 | idem |
| IF-04 | SE-06 | idem |
| IF-01 | DA-06, IF-11, IF-09 | « attend l'équipe : IF-01 (fin 2027-10) » |
| DM-01 | IN-04 | « attend l'équipe : DM-01 (fin non planifiée) » |

7 prérequis bloquants hors plan → les dates des 10 tâches dépendantes ne sont pas fiables.

## 7. Durées incohérentes avec la saisie

| ID | Commentaire | Durée dans les dates |
|---|---|---|
| SC-24 | « durée saisie 10 j » | 2 j o. (1–2 oct.) |
| GO-11 | « durée saisie 1,5 mois » | 43 j o. (~2 mois) |
| DA-07 | « 4 j » | 6 j o. |
| SC-21 | « 8 j » | 9 j o. |
| SC-12, SC-07 | « 5 j » | 6 j o. |

## 8. Dates sur jour férié (Québec)

| ID | Date | Férié |
|---|---|---|
| SE-02 | début 1er janv. 2027 | Jour de l'an |
| SC-26 | fin 24 juin 2027 | Fête nationale |
| IN-07 | début 24 juin 2027 | Fête nationale |
| IF-05 | fin 25 déc. 2028 | Noël |
| SC-30 | début 25 déc. 2028 | Noël |
| UI-08 | début 1er janv. 2029 | Jour de l'an |
| IF-09 | fin 30 mars 2029 | Vendredi saint |
| SE-06 | début 2 avr. 2029 | Lundi de Pâques |

## 9. Qualité des données

| Constat | Portée |
|---|---|
| Aucun jalon : 38 lignes de type « tâche », aucune date « oui/non » | toute la roadmap |
| Dépendances typées dans `depend_de` : 2 seulement (IF-08→SE-02, IN-04→SE-01) ; les « liens forts » et prérequis sont en commentaire libre | non exploitables pour l'alerte de dépendance |
| Priorité absente | 13 tâches (GO-11, DA-07, SC-20, SC-28, DA-04, SC-09, IF-06, DA-06, IF-11, IF-05, UI-06, IF-08, IF-09) |
| Efforts, complexité, confiance non fournis | toutes → charge de l'architecte non mesurable |
| Durées gabarit : 110 j o. répétés (IN-07, UI-07, SE-12, SC-30, IN-04) | estimation par défaut probable |
| Initial = prévu partout (référence figée le 2 nov.) alors que SC-02 et SC-24 étaient déjà en retard | écart initial/prévu à 0, retard invisible dans le Gantt |
| Chantiers « au carnet (au-delà de l'horizon engagé) » datés au jour près jusqu'en oct. 2029, certains « en cours » | 11 tâches |
| Charge : jusqu'à 7 tâches en parallèle (nov. 2026 avec les 2 retards ; 1er févr. 2027) pour un architecte | capacité |

## 10. À demander à l'architecte

| # | Demande |
|---|---|
| 1 | Clore ou replanifier SC-02 et SC-24 |
| 2 | Corriger les statuts du §2 (en cours = démarré) |
| 3 | Mettre à jour les % ou les fins de GO-11, IN-01, SC-15, DA-11 |
| 4 | Aligner IN-01 sur le Gantt Méthane P2 (MEP 8 janv. 2027) |
| 5 | Planifier ou retirer les 7 références absentes (§6) |
| 6 | Saisir les liens dans `depend_de` et ajouter des jalons (MEP, acceptation) |

_Arbitrages : temps écoulé calculé en jours ouvrés du lundi au vendredi ; fériés = fériés statutaires du Québec ; « lien fort » lu comme dépendance implicite ; IN-01 comparé au Gantt Méthane P2 lu le 30 oct._
