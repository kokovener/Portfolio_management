# Portefeuille PLQ — Prompt de reprise étape 5 v1 (première semaine réelle)

> À coller dans une nouvelle session après l'exécution du lundi 2 nov. (ou du lundi suivant si Franck n'a pas fini ses saisies).

```
Reprise du projet Portefeuille PLQ. Prompt initial : `01_Cadrage/Portefeuille_PLQ_Prompt_Initial_v1.md`
(étapes, conditions de fin et règles de travail inchangées).

État au 2026-10-27
- Étapes 1 (GELÉE), 2, 3 faites. Étape 4 FAITE : `05_Pilotage/Tache_Lundi_v1.md` (+ annexe) ; tâche planifiée
  `portefeuille-plq-lundi` (prompt `_Outils/Prompts/Portefeuille_PLQ_Tache_Lundi_v2.md` depuis le 28 oct., mode Teams indiqué dans la tâche) ;
  skill `maj-actions-retro` ; artefact v9 ; 1er instantané `snap.2026-10-27`, ensuite `snap.<lundi>`.
- Modèle v2 fait le 28 oct. (retours itération 1, lot 2 : `05_Pilotage/2026-10/Retours_Iteration1_2026-10-28.md`).
  Propositions en attente pour v3 : S5, S9, F1, A11 · E1–E13 (dont E11–E13 de l'étape 4).

Objectif : étape 5. Arrête-toi à la fin : je relis la liste des écarts et le kickoff v2.
1. Lis le dernier digest `05_Pilotage/<AAAA-MM>/Digest_<lundi>.md`, `dist/lundi/<lundi>/statut.json` et `alertes.json`.
   Si la tâche n'a pas tourné ou a échoué, dis pourquoi (statut.json, réponse de la tâche) avant toute autre chose.
2. Liste les items saisis par moi dans Gérer depuis le 27 oct. (source saisie) — j'en ajoute 2 hors programme.
3. Compare le digest à ce que je sais être vrai : UNE question à choix multiple par lot de 4 items
   (« juste » / « faux : … »), puis chaque écart avec sa cause (seuil, source, adaptateur, modèle, saisie).
4. Propose une correction par écart ; je décide ; note chaque décision dans `01_Cadrage/Portefeuille_PLQ_Kickoff_v2.md`
   (v1 → `_Archives/`), motifs dans l'annexe v2. Une décision qui touche le modèle gelé = proposition v2, pas une édition.

À traiter aussi
- Signaux de l'analyste (section du digest) : je juge chacun « juste » ou « faux : … » ; écris RD\verdicts.json
  {"<titre>":"juste|faux : cause"} dans le dossier du lundi (le dossier suivant les transmet à l'analyste).
- L3 de Tache_Lundi_v1 : Smartsheet et Jira n'écrivent que ce qui change (comme Outlook et Miro).
- Si j'ai validé le brouillon Teams : passe la tâche en « Mode Teams : ENVOI » (prompt maître v2 + update_scheduled_task).

Même règles qu'avant : relecture sous-agent neuf de chaque livrable qui porte une décision (cause de chaque écart,
et ce que l'écriture touche) ; commit à chaque fin de sous-étape ; bilan à la fin.
```
