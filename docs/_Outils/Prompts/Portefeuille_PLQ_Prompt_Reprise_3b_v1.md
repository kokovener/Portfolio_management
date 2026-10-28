# Portefeuille PLQ — Prompt de reprise · étape 3b

```
Reprise du projet Portefeuille PLQ. Prompt initial : `01_Cadrage/Portefeuille_PLQ_Prompt_Initial_v1.md`
(étapes, conditions de fin et règles de travail inchangées).

État au 2026-10-27
- Étape 1 GELÉE : `02_Modele/` (modèle v1, schema.json, annexe M1–M22). Ne pas rouvrir : écart + cause + proposition v2.
- Étape 2 FAITE : artefact « Portefeuille PLQ » https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB (v4, db : lecture view,
  écriture owner ; 13 collections = clés du modèle, doc_id = id). Spec : `03_Interface/Interface_Specification_v1.md`.
- Étape 3a FAITE : `04_Adaptateurs/Adaptateur_Smartsheet_v1.md` (+ annexe). 9 L actifs en base.
- Décisions Franck : F0 phase vide = actif + alerte ; F1 fraîcheur d'un item lu = source seule (Gérer ne la remet pas à zéro).
- Propositions modèle v2 en attente : fraîcheur Smartsheet par historique des cellules % et Phase (S9), `updated_at`
  source seule (F1), référence source d'un item promu (S5), statut sur `dependance` (A11).
- Code : `C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\` (git, 5 commits) : interface/ (page.html, core.js),
  tools/ (build_interface.py, build_seed.js, adapt_smartsheet.js, validate_model.py), tests/ (core, page DOM, adaptateur),
  dist/runs/AAAA-MM-JJ/ (exécutions).

Chaîne d'un adaptateur (patron 3a, à reproduire)
connecteur → `dist/runs/<date>/<source>_raw.json` → `ArtifactData list` (out_dir base_before + versions) →
`node tools/adapt_<source>.js` → validate_model.py → `ArtifactData batch` épinglé (if_version) → republier si la vue change →
vérifier dans le navigateur intégré (connecté à claude.ai) → fiche `04_Adaptateurs/Adaptateur_<Source>_v1.md` avec le tableau
« lu à la source / dans la base » sur 3 lignes réelles → relecture sous-agent au contexte neuf → commit.

Pièges déjà payés
- Projets_Dev refuse les suppressions : demander le droit de suppression avant git (index.lock).
- Read refuse les chemins 8.3 (FKOWAL~1) ; les .d.ts de la skill artifact-capabilities sont hors dossiers connectés.
- jsdom pour test_page_dom.js : `npm i jsdom@24.1.3` dans /tmp/jd, puis NODE_PATH=/tmp/jd/node_modules.
- Connecteur Atlassian = GOU21 seulement (SDD, PLQ, STG21 renvoient 0 sans erreur) : MEP run via ledger.
- Un grain se lit par la clé structurée, pas par une colonne déclarative ; une valeur d'exemple n'est pas une donnée.

Fais l'étape 3b : adaptateur Jira GOU21 (sprint courant et suivant → `sprints` ; versions et tickets MEP → `meps`,
recoupés avec le ledger `Goutte2.1/Daily_Brief/_ledger/2026-W44.md`). Puis donne-moi le bloc feed à coller dans
l'artefact « Expert G1 — Gantt S1 » (début de 3c) et arrête-toi.
```
