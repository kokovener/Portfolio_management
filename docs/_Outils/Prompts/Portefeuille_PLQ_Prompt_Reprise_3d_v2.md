# Portefeuille PLQ — Prompt de reprise 3d + 3e v2 (Outlook, Miro)

> v2 : 3d et 3e enchaînées dans une même session (v1 = 3d seule).

```
Reprise du projet Portefeuille PLQ. Prompt initial : `01_Cadrage/Portefeuille_PLQ_Prompt_Initial_v1.md`
(étapes, conditions de fin et règles de travail inchangées).

État au 2026-10-27
- Étape 1 GELÉE (`02_Modele/`). Ne pas rouvrir : écart + cause + proposition v2.
- Étape 2 FAITE : artefact « Portefeuille PLQ » https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB.
- 3a Smartsheet, 3b Jira, 3c Artefacts FAITES : fiches `04_Adaptateurs/Adaptateur_*_v1.md` (patron à suivre).
- Propositions modèle v2 en attente : S5, S9, F1, A11 (3a) · E1–E4 (3b) · E5–E6 (3c).
- Feed architecte : en attente, hors de cette session.

Objectif : version complète des adaptateurs. Fais 3d puis 3e dans cette session, sans t'arrêter entre les deux,
sauf blocage réel (source illisible, décision qui m'appartient selon les 3 tests).

Étape 3d — Outlook (absences)
- Personnes : `Goutte2.1/01_Gouvernance/Team_G2.1_v1.xlsx` (lecture seule) → `personnes`
  (id `team.<nom>-<prenom>`, nom, rôle, voie) ; rien de `Recrutements/`.
- Absences : calendriers Outlook de ces personnes, aujourd'hui → +6 semaines, connecteur Microsoft 365
  (lecture seule) → `absences` (debut, fin, jours_ouvres, libellé neutre « absence », jamais le motif) ;
  fériés QC déjà en saisie : pas de doublon.
- Si le connecteur ne lit que mon calendrier : trace la limite, prends la source de repli (disponibilités /
  free-busy) si elle existe, sinon livre ce qui est lisible et signale le reste.
- Vérification : vue charge 4 semaines (jours ouvrés − absences).

Étape 3e — Miro (actions de rétro)
- Source : dernier board de rétro GOU21, cadre « Actions du sprint suivant » (skill retro-sprint-g21 pour
  le gabarit, lecture seule ; aucune écriture sur Miro).
- Mapping → `actions_retro` (board, texte, owner, statut a_faire · en_cours · fait, sprint) ; statut et owner
  lus de ce que le gabarit porte (tag, couleur, mention) ; ce qui n'est pas lisible : tranche, note l'arbitrage.
- Actions absentes d'une lecture : conservées et signalées, jamais supprimées.
- Vérification : actions visibles dans la vue Sprint.

Pour chacune, même chaîne que 3a–3c : raw → base_before → node tools/adapt_<source>.js → validate_model.py
(fermé par défaut ; `pip install "jsonschema>=4.18"` d'abord) → batch épinglé → relance prouvée identique
(données) → vérification navigateur → fiche `Adaptateur_<Source>_v1.md` (tableau source/base sur 3 lignes
réelles, §Limites) + annexe motifs → relecture sous-agent neuf : cause de chaque écart, et « ce que l'écriture
touche », pas seulement ce qu'elle écrit → commit.
Dates en heure du Québec (America/Toronto ; heure normale dès le 1er nov.) ; heures prises d'une horloge.

Autorisations : tu peux publier l'artefact Portefeuille si la vue change ; je pré-approuve. Lecture seule
partout ailleurs. Arrête-toi à la fin de 3e : bilan des deux étapes, puis le prompt de l'étape 4
(tâche planifiée du lundi 7 h + skill maj-actions-retro).
```
