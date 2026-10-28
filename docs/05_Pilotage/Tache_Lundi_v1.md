# Tâche du lundi et actions de rétro v1

> Étape 4 · 2026-10-27 · Prompt : `_Outils/Prompts/Portefeuille_PLQ_Tache_Lundi_v2.md` (v2 le 28 oct. : étape Jira data, 14 collections) · Tâche planifiée `portefeuille-plq-lundi` · Skill `maj-actions-retro` · Code : `Projets_Dev\Portefeuille_PLQ\tools\lundi.js`, `tools\statut_actions.js` · Tests : `tests/test_lundi.js` (10), `tests/test_statut_actions.js` (3) · Motifs : `Tache_Lundi_v1_Annexe_Motifs.md`

## 1. Dispositif

| Élément | Valeur |
|---|---|
| Tâche | « Portefeuille PLQ — lundi 7 h », cron `0 7 * * 1` (départ réel 7h02), mode d'approbation Auto |
| Ordre | instantané → Smartsheet → Jira → Artefacts → Outlook → Miro → digest → page → Teams |
| Instantané | un par semaine, `instantanes/snap.<lundi>`, créé avant toute lecture ; ses items ne sont jamais réécrits ; seul ajout : `sources_ok` / `sources_total` ; sans instantané, aucun adaptateur n'écrit |
| Digest | `05_Pilotage/AAAA-MM/Digest_<lundi>.md` : sources non lues · alertes, une ligne par règle (nouvelle oui/non) · santé qui change · portefeuille · 15 signaux max · 1 recommandation |
| Page | republiée seulement si le code construit ≠ page publiée (`lundi.js pagecheck`) |
| Teams | G1_Agent_Analystes · une ligne par règle, « nouveau » en tête ; rien de nouveau = « Rien de nouveau depuis lundi dernier » · mode BROUILLON jusqu'au OK de Franck, puis ENVOI |
| Skill `maj-actions-retro` | lit le cadre Actions, une question à Franck, écrit le seul `statut` ; l'adaptateur Miro le garde |

## 2. Exécution manuelle (2026-10-27, sous-agent au contexte neuf, prompt seul)

| Mesure | Valeur |
|---|---|
| Instantané | `snap.2026-10-27` écrit à 20h11 EDT avant les adaptateurs (14 items) ; complété 5/5 sources (v2) |
| Adaptateurs | 5 / 5 ok · écritures : Smartsheet 10 · Jira 26 · Artefacts 15 (dont nouveau jalon `feed.expertg1.m2`) · Outlook 0 · Miro 0 |
| Alertes | 16 : 2 prédécesseur reculé · 1 jalon reculé (+10 j ouvrés) · 9 fraîcheur · 4 phase vide ; comparaison : 1re exécution |
| Page | republiée v8 (point double dans l'alerte « dépassé »), puis v9 après relecture (alerte livrable reculé, libellé MEP) |
| Teams | brouillon `05_Pilotage/2026-10/Message_Teams_2026-10-27.html`, non envoyé |
| Frictions du prompt | 15 relevées par l'exécutant ; 11 corrigées dans le prompt v1 avant création de la tâche (annexe §2) |

## 3. Skill `maj-actions-retro` — 1re exécution (board « Rétro G2.1 S18 », 27 oct. 20h29 EDT)

| Action | Avant | Après (Franck) |
|---|---|---|
| 1 Bitbucket cloud pour test (échéance 23 oct.) | a_faire | fait |
| 2 Équipe Teams (échéance 21 oct.) | a_faire | fait |
| 3 Règles de validation des critères d'acceptation | a_faire | fait |
| 4 Alertes pour les déploiements · 5 Règles de code | a_faire | a_faire (inchangé) |
| Relance de l'adaptateur sur la base relue | — | 0 écriture ; signaux « échéance passée » disparus |

## 4. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| T1 | Instantané = résumé par item du schéma (étape, santé, %, jalons, risques) ; l'export complet reste local (`dist/lundi/<date>/base_avant/`) |
| T2 | L'exemple semé `instantane.2026-10-27` est gardé et ignoré par le digest (seuls les `snap.*` comptent) |
| T3 | `sources_ok` / `sources_total` posés après les lectures, par une mise à jour épinglée ; les items de l'instantané ne bougent jamais |
| T4 | Alerte « nouvelle » = absente de `alertes.json` du lundi précédent (fichier versionné dans git) |
| T5 | Digest : fraîcheur et phase vide regroupées en une ligne ; signal « phase » non répété (même fait que l'alerte) |
| T6 | Heure affichée avec le décalage réel (EDT jusqu'au 31 oct., EST ensuite) |
| T7 | Une seule recommandation, rédigée par Claude après lecture du digest et de la base |
| T8 | `maj-actions-retro` : seul `statut` change ; `source` reste celle de Miro |
| T9 | Une question = un appel AskUserQuestion, découpé en questions de ≤ 4 actions ; non coché = inchangé |
| T10 | Écritures par fichiers (`lundi.js writes`) ; versions déduites des écritures acceptées (`lundi.js versions`) |
| T11 | Instantané et digest nommés par le lundi de la semaine ; une exécution retardée (app fermée) reste celle du lundi ; la santé est calculée au jour réel |
| T12 | Livrable reculé ≥ 5 j ouvrés = alerte « jalon » (avant : visible seulement par sa dépendance) ; alerte MEP : « pas encore prête », plus « aucun ticket prêt » |
| T13 | Instantané du 27 oct. gardé sous `snap.2026-10-27` (pris avant la règle T11) ; dès le 2 nov. : `snap.<lundi>` |

## 5. Écarts au modèle gelé (proposition v2)

| # | Écart | Proposition |
|---|---|---|
| E11 | Statut d'action saisi par Franck, provenance non stockée (source = Miro) | `action_retro.statut_source` (par, le) |
| E12 | `sources_ok` inconnu au moment de l'instantané (pris avant les lectures) | le garder, renseigné après les lectures (T3) |
| E13 | Règle projet « heures en EDT » fausse du 1er nov. au 8 mars | « heure de Toronto avec son décalage (EDT / EST) » |

## 6. Limites et décisions à prendre

| # | Point | Qui |
|---|---|---|
| L1 | Message Teams en BROUILLON : bascule en ENVOI après relecture | Franck : OK sur le brouillon du 27 oct. |
| L2 | La tâche ne tourne que si l'app Claude est ouverte (sinon au lancement suivant) | Franck |
| L3 | Smartsheet et Jira réécrivent tous leurs documents chaque lundi (36 écritures, seule l'heure de lecture change) | étape 5 : n'écrire que ce qui change |
| L4 | Brut = transcription de la sortie de l'outil (Outlook : 31 appels, ~15 Ko chacun) : reproductible, pas octet pour octet | accepté |
| L5 | Bloc Expert G1 daté 23h59 pour une lecture à 20h16 : horodatage du producteur | Franck : régénération du Gantt |
| L6 | Actions 4 et 5 sans responsable / échéance (4) | équipe, rétro S19 |
| L7 | **Artefact privé** (« lisible par vous seul ») : le lien du message Teams ne s'ouvrira pas pour l'équipe (D20 : partage en lecture) | Franck : menu Partager de l'artefact, organisation en lecture |
| L8 | Livrable `feed.archi.adr-codes-taxes` conservé sans source active : il porte l'alerte la plus grave, aucune règle de fraîcheur ne le vise | Franck → Personne_09 : feed architecte |
| L9 | Signaux Miro du digest du 27 oct. antérieurs aux statuts saisis (actions 1–3 faites à 20h3x) | — |
