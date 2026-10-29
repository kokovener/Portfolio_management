# Portefeuille PLQ — Cadence de rafraîchissement v1

> Retour R36 · 2026-10-28 · Modèle et horaires : décisions Franck (F1–F5) · relu au contexte neuf · Motifs : `Cadence_Rafraichissement_v1_Annexe_Motifs.md` · Tâche du lundi v5 → v6

## 1. Décisions Franck (28 oct.)

| # | Décision |
|---|---|
| F1 | Tout passage quotidien tourne **après le daily briefing : 9 h** |
| F2 | Smartsheet est relu **le jeudi à 13 h**, après les tâches planifiées du jeudi |
| F3 | Équipe (B6) : **à la demande** seulement |
| F4 | Absences (B7) : **le lundi de début de chaque sprint** ; sprints de 3 semaines, prochain le **lundi 9 nov. 2026** |
| F5 | Feeds d'artefacts (B9) : **lundi et mercredi** |

## 2. Règles

| # | Règle |
|---|---|
| C1 | Chaque bloc de la page a une fraîcheur cible ; il affiche « lu il y a … » (la plus ancienne de ses entrées) et passe en alerte « périmé » au-delà |
| C2 | Le lundi 7 h reste la photo : instantané, digest, message Teams, relecture de tout sauf l'équipe (F3) et les absences hors début de sprint (F4) |
| C3 | Les passages de 9 h et du jeudi 13 h n'écrivent ni instantané, ni digest, ni message Teams ; ils écrivent la base avec les mêmes adaptateurs |
| C4 | Ordre, dans tout passage : Smartsheet → Outlook (équipe, puis absences) → Jira → Jira data → Artefacts → Miro |
| C5 | Les §3 et §4 vivent dans `Projets_Dev\Portefeuille_PLQ\config\cadence.json` ; les changer ne touche pas au code |
| C6 | À la demande : « rafraîchis <bloc ou source> » relit seulement ce qui est demandé, dans l'ordre C4 |

## 3. Blocs et fraîcheur

| Réf | Bloc de la page | Entrées (adaptateur) | Fraîcheur cible | Relu |
|---|---|---|---|---|
| B1 | Sprint : items, sous-tâches, points · Data Jira · capacité | Jira data (a–c) + absences (B7) | 1 jour ouvré | chaque jour ouvré 9 h |
| B2 | Support extranets | Jira data (c) | 1 jour ouvré | chaque jour ouvré 9 h |
| B3 | MEP (Gantt et sprint) · sprints | Jira (lit le ledger du daily briefing) | 1 jour ouvré | chaque jour ouvré 9 h |
| B4 | Gantt prévu, phases, gates · risques Smartsheet | Smartsheet (Master + Jalons_Entites) | 7 jours | jeudi 13 h · lundi 7 h |
| B5 | Réel Jira (sprints des épopées) | Jira data (d) | 7 jours | lundi 7 h |
| B6 | Équipe (noms, rôles, « hors équipe ») | Outlook, mode équipe, puis Jira data | à la demande | « rafraîchis l'équipe » |
| B7 | Absences | Outlook | 1 sprint (21 j) | lundi 7 h de début de sprint (9 nov., 30 nov., 21 déc. 2026…) |
| B8 | Actions de rétro | Miro | après la rétro | skill `maj-actions-retro` · lundi 7 h en filet |
| B9 | Jalons, risques, attentes des feeds | Artefacts | 2 à 5 jours | lundi 7 h · mercredi 9 h |
| B10 | Saisies (Gérer) | base | immédiat | à l'enregistrement |
| B11 | Santé, alertes, top 5 risques, entonnoir, sources | calculés à l'affichage | = leurs entrées | — |

## 4. Passages planifiés

| Passage | Quand | Relit |
|---|---|---|
| Photo (`portefeuille-plq-lundi`, v6) | lundi 7 h | B1–B5, B8, B9 ; B7 si lundi de début de sprint ; instantané, digest, Teams |
| Quotidien (`portefeuille-plq-quotidien`) | lundi–vendredi 9 h | B1–B3 ; + B9 le mercredi |
| Smartsheet (`portefeuille-plq-jeudi`) | jeudi 13 h | B4 |

## 5. Livrables

| # | Livrable | Où |
|---|---|---|
| L1 | `config/cadence.json` (§3, §4 ; sprint d'ancrage 2026-11-09, 21 j) | Projets_Dev |
| L2 | `tools/cadence.js plan <passage> <date>` : adaptateurs dus, ordonnés C4, avec motif | Projets_Dev, testé |
| L3 | Collection d'état des lectures (date de chaque lecture par source ; modèle v6) | base |
| L4 | `adapt_outlook.js --equipe` : personnes seulement, absences inchangées | Projets_Dev, testé |
| L5 | `adapt_jira_data.js` : sans étape d, garde le `fenetre_reelle` déjà en base (aujourd'hui il l'efface) | Projets_Dev, testé |
| L6 | Page : « lu il y a … » et alerte « périmé » par bloc | interface |
| L7 | Tâche du lundi v6 · tâches quotidienne et jeudi + prompts dans `_Outils/Prompts/` | Scheduled · _Outils |

## 6. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| A1 | Le quotidien tourne aussi le lundi à 9 h : la photo de 7 h précède le daily briefing, Jira et MEP sont relus après lui (F1) |
| A2 | Le début de sprint se calcule (ancre 9 nov. + 21 j) et se recoupe avec le sprint actif Jira ; un écart est signalé dans le digest |
| A3 | L'état des lectures (L3) est une collection de la base, jamais saisie dans Gérer |
| A4 | La photo du lundi garde Smartsheet (B4) : le digest doit refléter la semaine, même si le jeudi l'a déjà lu |
| A5 | Les 3 tâches planifiées lisent leur prompt sur disque à chaque exécution (un seul texte à maintenir) ; les interdits restent recopiés dans la tâche |
| A6 | Le lundi, le passage de 9 h n'écrit rien tant que l'instantané de la semaine n'existe pas (règle « instantané avant tout recalcul ») |
| A7 | Les passages valident contre une base de validation construite de l'export complet (`cadence.js base`), faute d'instantané en semaine |
