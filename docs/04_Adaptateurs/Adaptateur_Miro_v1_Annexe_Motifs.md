# Adaptateur Miro v1 — annexe des motifs

> On n'ouvre ce fichier que pour rouvrir un arbitrage de `Adaptateur_Miro_v1.md`. Un motif se déplace, ne se supprime jamais.

| # | Motif | Options écartées | Erreur payée / cause réutilisable |
|---|---|---|---|
| M1 | Le cadre « 8. Actions » du board S18 n'a que des cartouches texte (Quoi / Responsable / Échéance) et des pastilles de vote : aucune couleur ni tag ne porte un statut. Le prompt demande de lire ce que le gabarit porte : il ne porte rien. `a_faire` est la seule valeur non inventée ; le statut décidé plus tard ne doit pas être écrasé à chaque lecture. | Déduire `fait` d'une échéance passée ; lire les pastilles. | — |
| M2 | Marqueurs choisis pour être ajoutables à la main sur une carte sans changer le gabarit. | Couleur de carte (illisible au lecteur d'écran, ambiguë). | — |
| M3 | « David / Alain / Franck » et « Yacine » : prénoms seuls, parfois plusieurs ; aucun rapprochement sûr avec `team.*`. | Prendre le premier prénom. | — |
| M5 | Le board réel nomme le cadre « 8. Actions », pas « Actions du sprint suivant » ; la skill retro-sprint-g21 cherche aussi « Actions » sauf « Actions de la rétro ». | Exiger le titre exact (0 action lue). | Un nom de cadre dans une consigne est une description, pas une clé : lire le board d'abord. |
| M7 | La skill retro-sprint-g21 dit que l'équipe est passée aux canaux Teams le 20 oct. : l'Action 2 est probablement faite, mais le prouver = une autre source et un jugement ; l'équipe statue. | Marquer `fait`. | — |
| R1 | Relance : la référence portait l'origine du statut (« par défaut » puis « repris de la base ») → la 2e exécution réécrivait les 5 actions. | — | Payé (test « rerun : 0 écriture ») : ne rien mettre dans `source.ref` qui dépende de la base lue. |
| R2 | Heure de lecture d'abord écrite 19h52 sans horloge ; horloge : 19h39 juste après la lecture → 19h38. | — | Payé une 2e fois dans la même session (voir Outlook R16) : `date` avant d'écrire une heure. |

## Relecture sous-agent neuf (27 oct., terminée avant 19h47 EDT à l'horloge) — écarts et causes

| # | Écart trouvé | Cause | Suite |
|---|---|---|---|
| V1 | Échéances « 23 octobre », « 1er nov », « Oct 23 », « 23/10 », ISO, « S19 » non comprises ni signalées | parseur limité à « jour abrév. » ; null silencieux | formats élargis, « S<N> » = fin du sprint, illisible signalé ; tests |
| V2 | Passage d'année faux (déc. → janv.) | année forcée à celle de la lecture | année la plus proche du début du sprint ; tests |
| V3 | Entités HTML numériques laissées en clair | 5 entités nommées seulement | décodage numérique + accents courants |
| V4 | « pas fait » = fait ; ✅ dans le texte = fait ; « bloqué » ignoré | regex sans négation, emoji cherché partout | statut seulement sur ligne « Statut » ou emoji seul ; négation ; bloqué = en_cours + signal |
| V5 | Post-its jamais lus réellement | type `sticky` inventé par la transcription manuelle | lecture du SVG réel ; types sticky / sticky_note |
| V6 | Variantes de nom de board ignorées, copies bloquantes | regex stricte, pas de départage | variantes, copies ignorées et signalées, égalité refusée |
| V7 | Écriture même si S<N+1> absent de la base ; validateur « OK » | signal seulement ; le validateur ne voit pas les sprints | M8 : arrêt (fermé par défaut) |
| V8 | Filtre de la vue : `"s9" < "s10"` faux ; actions accumulées à l'infini | comparaison de chaînes ; commentaire « un board à la fois » contraire à « jamais supprimé » | M9 : comparaison numérique, actions faites non reportées ; test |
| V9 | Texte vide de la vue périmé (« Actions du sprint suivant », « étape 3 ») | page non mise à jour après M5 | corrigé (v7) |
| V10 | Carte recréée = doublon visible | id lié à la carte Miro | L4 précisé |
| V11 | « Responsables : » → owner « s : … » ; owner effacé sans signal | regex non bornée ; signal sur texte seulement | borne de mot, signal `owner_change` |
| V12 | Brut = transcription manuelle (types inventés), pas la sortie de l'outil ; « 21 éléments » vs 20 | adaptateur nourri par une copie interprétée | SVG du résultat enregistré tel quel, parsé par l'adaptateur ; 20 + le cadre = 21 |

| Erreur payée | Cause réutilisable |
|---|---|
| 1re version du parseur SVG : 0 élément (le `<g>` du cadre avalait ses enfants) | Parser les balises ouvrantes, jamais un conteneur entier par regex |
| Un brut « nettoyé » à la main fait passer les tests sur une donnée qui n'existe pas | Le brut d'un adaptateur = la sortie de l'outil, telle quelle ; l'interprétation est dans le code |
