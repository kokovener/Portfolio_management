# Checkpoint — 2026-11-02 (projets de l'architecte)

| # | Fait | Preuve |
|---|---|---|
| 1 | Run du lundi commité (verrou `index.lock` laissé par la tâche retiré) | commit `466ce74` |
| 2 | Roadmap de l'architecte lue telle que livrée (`donnees-programme` 1.0) : programme + 14 projets, 38 jalons, 2 dépendances, Gantt 2 onglets | commits `65fc782`, `59c6660` ; `dist/runs/2026-11-02/archi/` |
| 3 | Méthane (architecte) → Méthane P2 : dépendance saisie « alimente » | `dep.archi-methane-alimente-p2` |
| 4 | Livrable semé « ADR codes de taxes » supprimé (accord de Franck) | `deleted/` du run |
| 5 | Tâche du lundi v18 (+ prompts des tâches lundi et quotidien : K14) | `_Outils/Prompts/Portefeuille_PLQ_Tache_Lundi_v18.md` |
| 6 | Docs : Kickoff v10 (D12), Adaptateur Artefacts v3, Feeds_Inscrits v2, CLAUDE.md | relecture au contexte neuf : 15 écarts, 0 bloquant ; lignes 1–6, 8–10, 12, 14, 15 corrigées |

## Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| A1 | Tâche = jalon « fin de tâche » ; `risque_principal` non repris (pas de P·I) |
| A2 | Gantt sur le programme, onglets « Horizon engagé » / « Au carnet », sans barre initiale (modèle inchangé) |
| A3 | Étape et fenêtre des projets suivent la roadmap à chaque lecture |
| A4 | Fraîcheur des 15 items = date des données de Luc |
| A5 | Préfixes = axes : garde-fou seulement (`config/archi_axes.json`) |

## Reste ouvert

| # | Point | Qui |
|---|---|---|
| O1 | Gantt Méthane P2 en échec ce matin : session SharePoint expirée dans le navigateur intégré | Franck : se reconnecter |
| O2 | 11 incohérences de la roadmap (ex. « en cours » qui débute en 2027) et 2 jalons dépassés (SC-02, SC-24) | Franck → Luc |
| O3 | R46, R47 ; code K6–K8, K10 ; modèle v17 cite encore le livrable ADR (L10) | itération 4 |
