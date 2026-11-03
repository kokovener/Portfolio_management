# Checkpoint avant partage à l'équipe — 3 nov. 2026

Page v58 publiée (commits `b97b49b`, `fe508ef`, `3eb9598`). Tests : 32/32 verts. Les lecteurs ne peuvent pas écrire (vérifié au niveau « interact »).

## Fait
| # | Point | Résultat |
|---|---|---|
| F1 | Titre | « Portefeuille PLQ (Bêta) » (en-tête et onglet) |
| F2 | Barre de défilement horizontale | Les marqueurs collés au bord de l'horizon ne débordent plus ; vérifié en live |
| F3 | Livraisons terminées affichées en rouge | Un item terminé n'est jamais rouge ; la fraîcheur ne vaut que pour les items actifs ou planifiés |
| F4 | « Détails techniques », ids, noms d'adaptateurs | Visibles pour le propriétaire seulement |
| F5 | « test note » sur L8D | Supprimée de la base (accord de Franck) |
| A | Chiffres contradictoires | Dépendances lues du côté de l'item (« alimenté par ») ; alerte bloqués = carte du sprint ; date de fraîcheur = source principale du bloc ; tendance du support vs le lundi de la semaine ; « Idées et qualifiés » partout ; un programme n'est plus « hors programme » ; pas de bouton sprint sur un projet au fil de l'eau |
| B | Texte pour un lecteur sans contexte | MEP en toutes lettres ; « j ouvrés », « jours-personne » ; « en sprints / au fil de l'eau » ; « orange » ; phases Smartsheet en français ; notes de conception du Sprint en info-bulle ; une seule date en en-tête ; pourcentages nommés ; accords 0 et 1 ; santé du programme précisée |

## Reste — données à corriger à la source (Franck)
| # | Point | Où |
|---|---|---|
| C1 | Le risque n° 1 nomme le départ d'une personne | Smartsheet, colonne Top risque de L8 |
| C2 | « AF-2 · UX-2 validation client · gate AC-4 » (la gate AC-4 a été retirée) | Gérer, contenu du sprint de L8D |
| C3 | 3 MEP passées non confirmées (SDD-2942, PLQ-9437, PLQ-9462) | Confirmer ou annuler |
| C4 | Méthane en double (roadmap de Luc vs Gantt P2), dates contradictoires | Avec Luc |
| C5 | « L0 Plateform », « L0.1 Coeur  UX/UI » ; 7 items actifs sans responsable | Smartsheet |
| C6 | Gantt Méthane P2 non relu depuis le 30 oct. (SharePoint refusé) | Prochain lundi |
| D1 | Liens vers la roadmap de Luc, Expert G1, Smartsheet, Miro : refus pour un lecteur sans accès | Partager ces sources ou prévenir l'équipe |

## Reste — améliorations non bloquantes (backlog)
| # | Point |
|---|---|
| E1 | Santé du programme = pire santé de ses livraisons (aujourd'hui : santé propre, précisée en clair) — rouvrirait D8 |
| E2 | Lignes Jira et absences masquées sur un projet au fil de l'eau |
| E3 | Dates de la fiche et du Gantt d'un programme alignées ; « horizon engagé » signalé |
| E4 | Un seul instantané par date (27 oct. en double, ancien format d'id) |
| E5 | Rôles en clair dans la capacité (« Coordo », « AF ») ; compteurs avec unité |
| E6 | Source citée une fois par section, lien « Ouvrir la source » à la place de l'URL |

## Arbitrages pris sans Franck
| Arbitrage | Motif |
|---|---|
| « Bêta » avec accent | Livrables en français du Québec |
| Terminé = vert, sans motif | Même périmètre que l'alerte de fraîcheur |
| Badge « lu il y a » daté par la source principale du bloc, les autres en info-bulle (R36 disait : la plus ancienne) | Écart constaté : « Jira lu il y a 4 j » alors que Jira était lu la veille (la date venait d'Outlook) ; « à relire » reste levé par toute source en retard |
| « AF-2 … gate AC-4 » non corrigé | Contenu saisi, pas du code : à Franck (C2) |
| Santé du programme : texte précisé, pas de remontée | La remontée changerait D8 : proposée en E1 |
| Détail | `Audit_Donnees_Partage_2026-11-03.md` (même dossier) |
