# Portefeuille PLQ — Optimisation des requêtes de mise à jour v1

> 2026-11-02 · Mesure sur les exécutions réelles du 2 nov. (lundi 9 h 09 : 226 appels, 31 min ; quotidien 10 h 21 : 106 appels) · Motifs : `Optimisation_Requetes_v1_Annexe_Motifs.md` · Prompt d'exécution : `_Outils/Prompts/Portefeuille_PLQ_Prompt_Optimisation_Requetes_v1.md`

## 1. Qui met à jour quoi, quand

| Tâche | Quand | Relit | Écrit | Appels mesurés |
|---|---|---|---|---|
| `portefeuille-plq-lundi` (prompt Lundi v18) | lundi 7 h | Smartsheet, Jira + MEP, Jira data réel, artefacts, Gantt, Miro, fériés ; Outlook au lundi de début de sprint | instantané, base, lectures, digest, page si changée, Teams (brouillon) | 226 |
| `portefeuille-plq-quotidien` (prompt Passage v7) | lun.–ven. 9 h | Jira + MEP, Jira data (a–c, e–g) ; + artefacts le mercredi | base, lectures | 106 |
| `portefeuille-plq-jeudi` (prompt Passage v7) | jeudi 13 h | Smartsheet (Master + Jalons_Entites) | base, lectures | ≈ 30 |
| À la demande (`cadence.js plan demande`) | sur mot-clé | la source nommée | base, lectures | variable |

Hors périmètre (ne touchent pas l'outil) : `daily-briefing-goutte21`, `statut-ti-hebdo-brouillon`, `goutte-rag-hebdo` ; 4 tâches désactivées.

## 2. Où partent les tokens (constat)

| # | Constat | Mesure |
|---|---|---|
| T1 | Le coût est dans le **nombre de tours** (1 tour = 1 appel d'outil ou 1 message), pas dans les octets : chaque tour rejoue tout le contexte | 106 appels + 3 messages / jour ; 226 appels + 6 messages le lundi |
| T2 | Jira data = 1 requête par item et par statut, en série | 46 appels Atlassian / jour, dont 20 `count` qui tiennent en un seul bloc parallèle |
| T3 | Le brut est retranscrit à la main par le modèle (sortie) | jira_data 58 Ko/jour, 87 Ko le lundi ; MEP 20 Ko/jour ; Smartsheet 27 Ko ×2/semaine |
| T4 | Base exportée collection par collection | 17 appels par passage, 34 le lundi (avant + après) |
| T5 | Le lundi, Jira et Jira data sont lus deux fois (7 h puis 9 h) | 2 sessions le 2 nov. (9 h 09 en attente, 10 h 21) pour 8 écritures |
| T6 | Courriels MEP relus en entier chaque jour (D−30, 3 pages) alors que rien n'a changé | 72 courriels, 20 Ko retranscrits / jour |
| T7 | Smartsheet relu en entier même sans cellule changée (lundi après jeudi) | 8 appels + 27 Ko ; le 2 nov. : 0 cellule changée |
| T8 | Miro (SVG complet du board) lu chaque lundi pour un cadre qui change toutes les 3 semaines | 1 SVG lourd / semaine |
| T9 | Rework : heures estimées puis corrigées (147 écritures), Gantt en échec avec 5 appels navigateur + capture | ≈ 30 tours perdus le 2 nov. |
| T10 | Jira et Smartsheet réécrivent tous leurs documents à chaque lecture (`lu_le`) | 28 écritures / jour identiques ; la fraîcheur vient déjà de `lectures` |

## 3. Stratégie globale — ce qu'on change

| # | Décision | Gain estimé | Code |
|---|---|---|---|
| S1 | **Le quotidien ne tourne plus le lundi** : cron `0 9 * * 2-5` (Franck, ou `update_scheduled_task` autorisé pour cette seule tâche) + `jours` [2,3,4,5] + `cadence.js plan` rend une **liste vide** hors des jours du passage (sauf `--force`, lancement manuel) ; l'étape 0 (garde instantané / tâche du lundi en cours) **reste** pour les lancements manuels | −106 appels / semaine, −1 session | cron, cadence.json, cadence.js, Passage v8 |
| S2 | **Miro seulement le lundi de début de sprint** (comme Outlook) et par la skill `maj-actions-retro` | −2 SVG / 3 semaines | cadence.json |
| S3 | **Garde « inchangé » avant lecture**. Smartsheet : `get_sheet_version` ×2 **et** `list_discussions` (1 appel) égaux au `raw.json` précédent → brut repris. Jira data : `count updated >= <dernière lecture ok de jira_data ou jira_data_reel, −1 j>` = 0 **et** carte `sprints` de l'adaptateur Jira du passage identique → brut repris. Dans les deux cas : 0 écriture, lecture notée `inchange` | −7 appels Smartsheet le lundi ; −40 appels Jira les jours calmes | adapt_smartsheet (champs version), schéma + cadence.js lecture (statut `inchange`), prompts |
| S4 | **Courriels MEP en incrémental** : `afterDateTime` = dernière lecture ok de jira −1 j, fusion avec le `mep_sources.json` précédent par script, fenêtre D−30 conservée | −2 pages, −15 Ko / jour | nouveau `tools/mep_merge.js` |
| S5 | **`base_apres` reconstruite en local** (base_avant + lots acceptés) ; une seule `list` sur `lectures` pour contrôle | −16 appels / lundi | `lundi.js apply` |
| S6 | Rien d'autre ne change : cadence (F1–F5), ordre C4, instantané, digest, Teams, analyste | — | — |

## 4. Par requête — ce qu'on change dans les prompts

| # | Étape | Règle ajoutée | Gain |
|---|---|---|---|
| R1 | Tous | Un seul `ToolSearch` groupé en amorce (Atlassian, ArtifactData, M365, Smartsheet selon le plan) | −3 tours |
| R2 | Jira data b | Les 20 `count` **dans un seul bloc parallèle** | −19 tours / jour |
| R3 | Jira data a, a2, e, f, g | Première page de chaque requête dans **un seul bloc parallèle** ; pages suivantes en bloc | −6 tours / jour |
| R4 | Jira data c | Fenêtre des candidats = dernière lecture ok de jira_data ou jira_data_reel **−1 j** (marge), `-8d` seulement le lundi ou sans lecture ok ; liens relus en un bloc parallèle | −10 appels / jour |
| R5 | Tous les adaptateurs | **Collecter d'abord, écrire ensuite** : aucun `bash` entre deux appels outil d'un même adaptateur ; `raw.json` écrit en une commande | −10 tours / jour |
| R6 | Tous les adaptateurs | `read_at` = sortie de `date` lancée **dans le même bloc** que le premier appel outil, écrite dans `RD\<nom>\debut.txt` ; jamais estimée | −20 tours de rework |
| R7 | Gantt | Métadonnées `$select=TimeLastModified` d'abord ; page de connexion = `echec` immédiat, **sans capture, sans second essai** ; `TimeLastModified` inchangé = brut repris, 0 appel de plus | −4 tours / échec |
| R8 | Page (étape 5) | Inchangé : `pagecheck` code 0 = aucune lecture sans path | — |
| R9 | Jira, Smartsheet | N'écrire que les documents dont le contenu change (`lu_le` exclu de la comparaison), comme Jira data | −28 écritures / jour, moins de conflits de version |
| R10 | Quotidien | Ne lit plus le prompt du lundi en entier : la procédure de l'étape 2 est extraite dans `Portefeuille_PLQ_Procedure_Adaptateurs_v1.md`, lue par les deux prompts, paramétrée par `RD`, la base de validation et `<passage>` | −6 k tokens par tour, chaque tour |

## 5. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| A1 | Pas d'appel REST direct depuis le sandbox (Jira, Smartsheet, Graph, Miro) : réseau fermé, vérifié le 2 nov. (`curl` → 000) |
| A2 | Le quotidien du lundi est retiré plutôt que réduit à Jira : la photo de 7 h satisfait la cible « 1 j ouvré » ; le ledger du lundi n'apporte que le briefing du matin |
| A3 | Miro suit la cadence des sprints (21 j) et non « chaque lundi en filet » : le cadre Actions ne change qu'après la rétro |
| A4 | Les 17 `list` de `base_avant` restent : la validation croisée a besoin de la base entière ; seul `base_apres` est reconstruit |
| A5 | Ordre de réalisation : code d'abord (S1 cadence, S2, S3, S4, S5, R9), prompts ensuite en **une seule version** chacun (Procedure v1, Lundi v19, Passage v8) ; le cron reste à Franck |
| A6 | Les trois SKILL.md des tâches planifiées lisent « le dernier `_vN` hors `_Archives` » (vérifié le 2 nov.) : aucune modification de tâche hors le cron de S1 |
| A7 | Relecture au contexte neuf du 2 nov. : 13 écarts, 2 bloquants (S1 sans cron, étape 0 retirée) — corrigés ici ; motifs en annexe |
