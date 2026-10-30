# Cadence de rafraîchissement v3 · Annexe motifs

> À n'ouvrir que pour rouvrir un choix. Un motif ne se supprime jamais : il se déplace.

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| M1 | Fraîcheur par bloc de la page, pas par source | Franck (R36) : l'équipe change rarement, le sprint chaque jour, Smartsheet chaque semaine. Une même source (Jira) alimente des blocs aux besoins différents (sprint quotidien, réel des épopées hebdo) | Une cadence par source (1re proposition, jugée trop simple par Franck) | 1re réponse à R36 raisonnée par source et au calendrier : un tableau de cadences sans sonde ni événement. Règle : partir de l'usage (qui lit quel bloc, quand), pas de la plomberie |
| M2 | Sonde avant relecture | Une relecture complète coûte des appels d'outil et des jetons ; `get_sheet_version` et la date d'un fichier coûtent presque rien | Tout relire chaque jour (coût × 5) · ne relire que le lundi (sprint faux 4 jours sur 5) | — |
| M3 | Jira relu chaque jour sans sonde | Le sprint bouge chaque jour (statuts, sous-tâches) ; aucune sonde Jira bon marché ne dit « rien n'a changé » sur 3 sprints | Sonde JQL `updated >= dernière lecture` (même coût que la lecture des sprints) | — |
| M4 | Le lundi reste la photo complète | L'instantané daté avant tout recalcul est une règle produit (CLAUDE.md) ; les digests comparent semaine à semaine | Instantané quotidien (base qui grossit sans lecteur) | — |
| M5 | Équipe avant Jira data | Jira data rattache un assigné à une personne de l'équipe ; lu dans l'autre ordre, un nouvel arrivant reste « hors équipe » une semaine | — | Personne_15 ajouté au fichier d'équipe le 28 oct. (fichier modifié 14h04 EDT) et toujours « hors équipe » : l'équipe n'est relue que le lundi (dernière lecture 27 oct.), rien ne détecte un changement du fichier ; et l'équipe seule ne suffit pas, Jira data doit être relu après elle |
| M6 | Pas de passage quotidien le lundi | La tâche du lundi relit tout à 7 h ; un 2e passage serait une relecture sans changement | Quotidien 7 j sur 7 | — |
| M8 | Équipe = mode d'Outlook, pas un 7e adaptateur | La collection `personnes` est écrite par `adapt_outlook.js` ; un mode `--equipe` évite 6 semaines de disponibilités pour un changement de fichier | Nouvel adaptateur Équipe (duplique la lecture du fichier) | 1re version du cadrage : une étape « équipe » sans adaptateur derrière (relecture au contexte neuf, bloquant) |
| M9 | Outlook avant Jira data, le lundi aussi | Sinon un nouvel arrivant reste « hors équipe » chaque lundi (l'ordre v5 lisait Outlook en dernier) | Corriger seulement le quotidien | 1re version : tâche du lundi déclarée « inchangée » alors que son ordre reproduisait le cas Personne_15 (relecture, bloquant) |
| M10 | Réel Jira lu seulement au lundi et au changement de sprint, et conservé entre deux | L'étape d coûte une requête sur toutes les épopées ; le réel ne bouge qu'à la frontière des sprints | Étape d chaque jour | Constat relecture : sans étape d, `adapt_jira_data.js` réécrit la stat sans `fenetre_reelle` et l'efface |
| M11 | Pas de sonde ledger | `adapt_jira.js` lit déjà le ledger à chaque passage, et Jira est relu chaque jour | Sonde « ledger modifié » (1re version, inutile) | — |
| M12 | Fraîcheur d'un bloc = sa plus ancienne entrée | La capacité combine Jira (1 j) et absences (7 j) : l'afficher « fraîche » sur la seule date Jira serait faux | Fraîcheur de la source principale | — |
| M13 | Horaires fixes plutôt que sondes (décision Franck F1–F5) | Franck connaît le rythme réel des sources : daily briefing ~8 h 37 (écrit le ledger lu pour les MEP), tâches du jeudi (12 h statut TI), sprints de 3 semaines ; un horaire lisible bat une sonde | Sondes `get_sheet_version` et date du fichier d'équipe (2e version du cadrage) ; passage quotidien à 7 h (lisait le ledger de la veille) | — |
| M14 | Absences seulement au début du sprint | La capacité se planifie au lancement du sprint ; une absence posée en cours de sprint ne change plus l'engagement | Chaque lundi (2e version) | — |
| M7 | Sonde en échec = changé (2e version ; caduc depuis M13, gardé pour l'historique) | Mieux vaut une relecture de trop qu'un bloc faux affiché frais | Sonde en échec = inchangé | — |

## v2 (2026-10-30) — B12 Gantt

| # | Choix | Motif | Options écartées |
|---|---|---|---|
| C-G1 | Gantt relu le lundi seulement (et à la demande) | Demande de Franck (« mis à jour tous les lundis ») ; un Gantt change à la régénération par le producteur, pas chaque jour ; la lecture du drawio passe par le navigateur (coûteuse) | Passage quotidien |

## Cadence-v3 (2026-10-30, checkpoint après deux sessions parallèles)

| # | Décision | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| v3 | B3 reste dans l'adaptateur `jira` (pas de nouvel adaptateur dans `cadence.json`) | Les sources MEP M365 sont lues dans l'étape Jira du prompt du lundi v17 ; le passage quotidien réutilise cette étape, donc B3 suit sans toucher au code | Adaptateur `mep` séparé dans `cadence.json` | La v2 (Gantt, 11h05 EDT) a été écrite avant l'arrivée des sources MEP (11h45) par une session parallèle ; B3 décrivait encore « Jira + ledger ». |
