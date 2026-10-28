# Portefeuille PLQ — Prompt de reprise étape 4 v1 (tâche du lundi + skill maj-actions-retro)

> À coller dans une nouvelle session. Décisions de Franck du 27 oct. déjà intégrées.

```
Reprise du projet Portefeuille PLQ. Prompt initial : `01_Cadrage/Portefeuille_PLQ_Prompt_Initial_v1.md`
(étapes, conditions de fin et règles de travail inchangées).

État au 2026-10-27
- Étape 1 GELÉE (`02_Modele/`). Ne pas rouvrir : écart + cause + proposition v2.
- Étape 2 FAITE : artefact « Portefeuille PLQ » https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB (v7).
- Étape 3 FAITE : 5 adaptateurs, fiches `04_Adaptateurs/Adaptateur_{Smartsheet,Jira,Artefacts,Outlook,Miro}_v1.md`
  (chaîne, règles, limites) ; code `Projets_Dev\Portefeuille_PLQ\tools\adapt_*.js`, base 87 enregistrements.
- Propositions modèle v2 en attente : S5, S9, F1, A11 · E1–E4 · E5–E6 · E7–E8 (Outlook) · E9–E10 (Miro).
- Canal Teams du digest : G1_Agent_Analystes (CLAUDE.md, ligne Teams).

Objectif : étape 4. Arrête-toi à la fin : je relis l'instantané, le digest et le message Teams.

4a — Tâche planifiée « Portefeuille PLQ — lundi 7 h » (patron skill suivi-planifie, adapté à la base d'artefact)
- Prompt entièrement autonome : ids des sheets, URL de l'artefact, chemins Projets_Dev, fiches à suivre.
- Ordre : 1) instantané daté de la base (collection `instantanes`, id `snap.AAAA-MM-JJ`) écrit AVANT tout
  recalcul, jamais supprimé ; 2) les 5 adaptateurs dans l'ordre Smartsheet → Jira → Artefacts → Outlook → Miro,
  chacun selon sa fiche (brut tel que rendu par l'outil, base_before, node, validateur fermé, batch épinglé) ;
  un adaptateur qui échoue n'arrête pas les autres, il est signalé ; 3) règles : jalon reculé ≥ 5 j ouvrés ;
  prédécesseur reculé → successeur en alerte ; WIP > limite D7 ; fraîcheur > 14 j ; MEP dans 7 j sans ticket
  « prêt » ; 4) digest `05_Pilotage/AAAA-MM/Digest_AAAA-MM-JJ.md` : alertes + signaux des adaptateurs
  (report.json : personnes non lisibles, demi-journées non concluantes, actions à échéance passée, absences
  plus vues…) ; 5) republication de l'artefact seulement si la page change ; 6) message dans G1_Agent_Analystes avec
  le lien — brouillon d'abord, envoi après mon OK lors de la 1re exécution.
- Rien de `Recrutements/` ; aucune heure inventée (horloge America/Toronto ; heure normale depuis le 1er nov.).
- Fin : une exécution manuelle produit l'instantané, le digest et le message ; je les relis.

4b — Skill `maj-actions-retro` (lancée après chaque rétro)
- Lit le dernier board « Rétro G2.1 S<N> », cadre « Actions » (fiche Adaptateur_Miro_v1 §1–2), exécute
  `tools/adapt_miro.js`, puis me demande le statut des actions ouvertes du sprint précédent (une question,
  choix multiple) et l'écrit dans la base (statut gardé par l'adaptateur aux lectures suivantes).
- Aucune écriture sur Miro. Actions absentes d'une lecture : conservées, signalées.
- Fin : skill installée, lancée une fois sur le board S18 (actions 1 et 2 à échéance passée).

Décisions déjà appliquées (ne les redemande pas)
- AF et UX hors capacité ; Personne_07 parti (`config/team_departs.json`) ; charge `run.ti.s19.dev` supprimée.
- Dernier board de rétro = « Rétro G2.1 S18 » (uXjVEYiDVMw=).

Même règles qu'avant : relecture sous-agent neuf de chaque livrable qui porte une décision (cause de chaque écart,
et ce que l'écriture touche) ; commit à chaque fin de sous-étape ; bilan + prompt de l'étape 5 à la fin.
```
