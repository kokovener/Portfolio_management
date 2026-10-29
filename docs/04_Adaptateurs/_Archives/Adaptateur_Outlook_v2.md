# Adaptateur Outlook v2 — personnes et absences

> Étape 3d · 2026-10-27 · Entrées : `Goutte2.1/01_Gouvernance/Team_G2.1_v1.xlsx` (lecture seule) + disponibilités Microsoft 365 · Code : `Projets_Dev\Portefeuille_PLQ\tools\read_team.py`, `tools/adapt_outlook.js` · Tests : `node tests/test_adapt_outlook.js <team_raw> <outlook_raw> <base_before>` (15) · `node tests/test_core.js <schema.json> dist/seed/base_seed.json` (14) · Exécution : `dist/runs/2026-10-27/` · Motifs : `Adaptateur_Outlook_v1_Annexe_Motifs.md`
> **v2 2026-10-28 (R36, cadence)** : mode équipe `node tools/adapt_outlook.js --equipe <team_raw.json> <base> <out> <schema.json>` = personnes seulement, absences ni lues ni touchées (à la demande « rafraîchis l'équipe ») ; absences relues le lundi de début de sprint (`config/cadence.json`) ; fichier d'équipe = dernier `Team_G2.1_v*.xlsx` hors `_Archives/`.

## 1. Chaîne d'exécution

| # | Étape | Outil · sortie |
|---|---|---|
| 1 | Résoudre chaque ligne de Team_G2.1 dans l'annuaire | `search_people` (Person/OrganizationUser) → `outlook_directory.json` |
| 2 | Lire Team_G2.1 (Nom, Prenom, Role seulement) | `python tools/read_team.py <xlsx> <annuaire> team_raw.json` ; refuse tout chemin `Recrutements` |
| 3 | Lire les disponibilités, un appel par jour ouvré, 8h30–16h30 heure du Québec, aujourd'hui → +6 sem. | `find_meeting_availability` (13 personnes + Franck organisateur facultatif, créneaux 60 min) → `outlook_raw.json` |
| 4 | Lire la base (personnes, absences) et leurs versions | `ArtifactData list` → `outlook_base_before/` + `versions.json` |
| 5 | Transformer et valider | `node tools/adapt_outlook.js <team_raw> <outlook_raw> <base> <out> <schema.json>` → `doc.json`, `batch.json`, `report.json` ; `validate_model.py` appelé, arrêt s'il ne tourne pas |
| 6 | Écrire | `ArtifactData batch` épinglé (`if_version`) sur les documents existants |
| 7 | Prouver la relance | relecture de la base → nouvelle exécution → 0 écriture (rien n'est réécrit quand seule l'heure de lecture change) |

## 2. Règles

| Sujet | Règle |
|---|---|
| Source des absences | Disponibilités (free/busy) : statut « absent du bureau » (`oof`) seulement ; jamais l'objet, jamais le motif |
| Demi-journée absente | ≥ 2 créneaux couvrant ≥ 2 h, tous `oof` ; matin = créneaux finissant ≤ 12h ; après-midi = créneaux commençant ≥ 13h30 |
| Période | demi-journées consécutives fusionnées (week-end sauté) ; `jours_ouvres` = demi-journées × 0,5 ; libellé « absence » |
| Id d'absence | `outlook.<nom>-<prenom>.<début>` ; une période qui chevauche une absence Outlook en base reprend son id (et sa partie passée, hors fenêtre) |
| Fériés · congés collectifs | jour couvert par une absence collective en base (saisie Gérer) : non lu, pas de doublon |
| Demi-journée sans assez de créneaux | non conclue, signalée ; jamais devinée |
| Absence Outlook plus vue | conservée, signalée ; jamais supprimée |
| Personne | id `team.<nom>-<prenom>` ; l'id déjà en base prime (sinon nom à ≤ 2 fautes près, sinon annuaire, sinon Team_G2.1) ; homonyme = non écrit, signalé |
| Rôle → voie (D7) | QA, Dev → scrum · Architecte (WIP 2), BA (2), PM (3), Coordo (3) → flux · AF, UX, Directeur, expert → hors (hors capacité : décision Franck 27 oct.) |
| Départs | `Projets_Dev\…\config\team_departs.json` : personne partie encore listée dans Team_G2.1 → non écrite, signalée à chaque lecture |
| `wip_limite` | valeur de la base gardée (saisie Gérer) ; à défaut D7 |
| Capacité (vue) | `absJoursDansPeriode` jour par jour : `jours_ouvres` réparti sur la période, plafonné à 1 j par jour (férié + absence perso = 1 j) |

## 3. Valeur lue à la source / valeur dans la base (3 lignes réelles ; annuaire 19h16, disponibilités 19h18, Team_G2.1 19h24 EDT, 27 oct.)

| Ligne | Lu à la source | Dans la base (ArtifactData) |
|---|---|---|
| Team_G2.1 ligne 8 | « Kowalzzyk Franck · Project manager/Scrum master » · annuaire « Franck Kowalczyk » | `team.kowalczyk-franck` v2 : Franck Kowalczyk · pm · flux · WIP 3 (id semé gardé) |
| Team_G2.1 ligne 13 + disponibilités | « Personne_05 · UX/UI Designer » ; 3 nov. 9h30–12h00 : 4 créneaux sur 4 `oof` ; 12h–13h30 `oof` tous les jours | `team.personne-05` v1 : ux · scrum ; `outlook.personne-05.2026-11-03` v1 : 3 nov. → 3 nov. · 0,5 j · « absence » ; midi récurrent non retenu |
| Team_G2.1 ligne 9 | « Personne_07 · Analyste d'affaires » · absent de l'annuaire | `team.personne-07` v1 : ba · flux · WIP 2 ; aucune absence lisible (signalé) |

## 4. Résultat

| Mesure | Valeur |
|---|---|
| Lus | 16 lignes Team · 31 jours ouvrés (27 oct. → 8 déc.) · 322 créneaux · 14 personnes lisibles sur 15 |
| Écritures | 16 : 15 personnes (11 créées, 4 mises à jour v1 → v2) · 1 absence |
| Relance | 0 écriture sur la base relue ; base relue = écrit 16 / 16 |
| Signaux | 5 : 2 écarts d'orthographe (Kowalzzyk, Bourgoin) · Personne_07 hors annuaire · ligne CDP non écrite · 28 oct. matin et après-midi non concluants |
| Ce que l'écriture touche | capacité dev × 3 (3 dev au lieu d'1 semé) : vue Portefeuille Dev 14,5 / 76,5 j-p (19 %) ; vue Sprint S19 45 / 45 j-p dev ; listes Personne de Gérer (charge flux, WIP) : 3 → 4 personnes flux (+ Personne_07) ; ids semés (`team.kowalczyk-franck`, `team.personne-09`) gardés : charges seed non orphelines |
| Vue (navigateur, 27 oct. 19h28 EDT, v5 ; v6 republiée après relecture) | Sprint S19 · carte Absences : « Personne_05 3 nov.–3 nov. · 0,5 j · Outlook » ; base 84 enregistrements |

## 4bis. Décisions de Franck appliquées (27 oct.)

| Écriture | Effet |
|---|---|
| `personnes` Personne_01, Ba, Personne_05 : voie `hors` (v2) | sortent des listes de capacité ; rien d'autre ne change |
| `personnes/team.personne-07` supprimée | listes Personne flux 4 → 3 ; aucune charge ne la référençait |
| `charges/run.ti.s19.dev` supprimée | Dev 4 semaines : 14,5 / 76,5 → 10 / 76,5 j-p (13 %) |
| Relance après écriture | 0 écriture |

## 5. Vérification — disponibilité 4 semaines (27 oct. → 23 nov., 20 jours ouvrés), `core.absJoursDansPeriode` sur la base relue (la carte « Charge par rôle » compte, elle, les sprints entiers S19 + S20)

| Personnes | Jours ouvrés | Absences | Disponibles |
|---|---|---|---|
| Personne_05 (ux) | 20 | 0,5 | 19,5 |
| 13 autres lisibles | 20 | 0 | 20 |
| Personne_07 | 20 | non lisible | 20 (par défaut) |

## 6. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| O1 | Calendriers des autres non partagés (404) → repli disponibilités, statut `oof` seul |
| O2 | Demi-journée : ≥ 2 créneaux couvrant ≥ 2 h, tous `oof` ; pause du midi (12h–13h30) exclue |
| O3 | Id de personne : base d'abord, puis annuaire, puis Team_G2.1 ; écart signalé, fichier source non corrigé |
| O4 | Ligne « CDP » : instance, pas une personne → non écrite |
| O5 | Correspondance rôle → voie de §2 — AF et UX passés hors capacité par Franck (27 oct.) |
| O6 | `wip_limite` de la base gardée, D7 à défaut |
| O7 | Absence Outlook disparue : gardée et signalée (cohérent avec 3a–3c) |
| O8 | Capacité jour par jour, plafonnée à 1 j (correction de `core.js`, artefact republié v5 puis v6) |
| O9 | Absence en cours au début de la fenêtre : id et partie passée repris (pas de double compte) |
| O10 | Aucune réécriture si seule l'heure de lecture change |
| O11 | Brut Outlook (disponibilités, courriels) gardé en local comme preuve, exclu de git |

## 7. Écarts au modèle gelé (proposition v2)

| # | Écart | Proposition |
|---|---|---|
| E7 | `source.systeme` n'a pas de valeur pour un fichier (Team_G2.1) : `saisie` utilisé, comme le seed | ajouter `fichier` |
| E8 | Absence sans demi-journée : début et fin sont des dates, la demi-journée n'est que dans `source.ref` | `absence.demi` (matin · apres-midi) |

## 8. Limites et décisions à prendre

| # | Point | Qui |
|---|---|---|
| L1 | Free/busy seulement : une absence saisie « occupé » ou sans réponse automatique n'est pas vue | Franck : consigne d'équipe « absence = Absent du bureau » |
| L2 | Personne_07 parti (Franck, 27 oct.) : retiré de la base, exclu par `team_departs.json` ; Team_G2.1 le liste encore | Franck : corriger Team_G2.1 (lecture seule pour Claude) |
| L3 | Jour où l'équipe est majoritairement occupée : pas de créneau proposé → demi-journée non concluante (28 oct.) | accepté ; relu chaque lundi |
| L4 | Lecture par Claude dans une session (31 appels) : pas d'exécution sans session | étape 4 (tâche du lundi) |
| L5 | Aucun férié QC dans la fenêtre ; la règle anti-doublon n'a tourné que sur jeu de test | 1re vérification réelle : fêtes de fin d'année |
| L6 | Signaux de l'adaptateur (Personne_07 non lisible, jour non concluant) seulement dans `report.json` : la vue montre Personne_07 à 20 j sans marque | étape 4 : signaux dans le digest du lundi |
| L7 | Réserve run comptée deux fois : charge semée `run.ti.s19.dev` supprimée avec l'accord de Franck (27 oct.) ; copie gardée dans `dist/runs/2026-10-27/suppressions/` | fait |
| L8 | Absence de plusieurs jours commençant ou finissant par une demi-journée : coupée par une période, proratisée au jour (écart E8) | modèle v2 |
