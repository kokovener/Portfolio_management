# Portefeuille PLQ — Prompt de reprise 3d v1 (Outlook)

```
Reprise du projet Portefeuille PLQ. Prompt initial : `01_Cadrage/Portefeuille_PLQ_Prompt_Initial_v1.md`
(étapes, conditions de fin et règles de travail inchangées).

État au 2026-10-27
- Étape 1 GELÉE (`02_Modele/`). Ne pas rouvrir : écart + cause + proposition v2.
- Étape 2 FAITE : artefact « Portefeuille PLQ » https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB.
- 3a Smartsheet, 3b Jira, 3c Artefacts FAITES : fiches `04_Adaptateurs/Adaptateur_*_v1.md`.
  3c : `Feeds_Inscrits_v1.md` (Expert G1 actif, architecte en attente), 14 écritures, relance identique ;
  gabarit architecte `Projets_Dev\…\feeds\archi_portfolio-feed_gabarit.html`.
- Propositions modèle v2 en attente : S5, S9, F1, A11 (3a) · E1–E4 (3b) · E5–E6 (3c).

Fais l'étape 3d : adaptateur Outlook (absences).
- Personnes : `Goutte2.1/01_Gouvernance/Team_G2.1_v1.xlsx` (lecture seule) → collection `personnes`
  (id `team.<nom>-<prenom>`, nom, rôle, voie) ; rien de `Recrutements/`.
- Absences : calendriers Outlook de ces personnes, fenêtre aujourd'hui → +6 semaines, par le connecteur
  Microsoft 365 (lecture seule) → collection `absences` (debut, fin, jours_ouvres, libellé neutre « absence »,
  jamais le motif) ; absences collectives (fériés QC) en saisie existante, pas en doublon.
- Dates en heure du Québec (America/Toronto, passage à l'heure normale le 1er nov.) ; aucune heure UTC brute.
- Si le connecteur ne lit que mon calendrier : dis-le, trace la limite, et propose la source de repli
  (disponibilités / free-busy) avant de coder.
- Enregistrements d'une lecture précédente absents : conservés et signalés, jamais supprimés.
- Même chaîne que 3a–3c : raw → base_before → node tools/adapt_outlook.js → validate (fermé par défaut)
  → batch épinglé → relance prouvée identique (données) → vérification navigateur (charge 4 semaines)
  → fiche `Adaptateur_Outlook_v1.md` (tableau source/base sur 3 lignes réelles, §Limites)
  → relecture sous-agent neuf (cause de chaque écart) → commit.

Autorisations : tu peux publier l'artefact Portefeuille si la vue change ; je pré-approuve. Lecture seule
partout ailleurs. Arrête-toi à la fin de 3d et donne-moi le prompt de 3e (Miro).
```
