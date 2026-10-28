# Portefeuille PLQ — Prompt initial v1

> À coller dans la première session Cowork du projet, après l'étape 0 du kickoff (§2). Remplacer `[canal Teams]`.

```
Contexte
Je suis Franck, gestionnaire de programme TI aux Producteurs de lait du Québec. On démarre le projet
« Portefeuille PLQ » : un outil de visibilité de portefeuille (3 mois glissants, sprints, risques, charge)
construit avec Claude Cowork, les connecteurs Smartsheet / Atlassian / Microsoft 365 et des artefacts partagés.
Le brainstorming est fait. Les décisions D1 à D20 sont actées dans `01_Cadrage/Portefeuille_PLQ_Kickoff_v1.md`,
motivées dans `01_Cadrage/Portefeuille_PLQ_Kickoff_v1_Annexe_Motifs.md`, et le CLAUDE.md du projet porte les
règles produit. Ne rouvre pas une décision sans me le dire : si tu veux en changer une, écris l'écart, sa cause,
et propose.

Dossiers attachés à cette session
- `…\Documents\Claude\Portefeuille_PLQ\` — documents (ce projet)
- `…\Documents\Claude\Goutte2.1\` — lecture seule : plan v7, équipe, ledger
- `C:\Users\fkowalczyk\Projets_Dev\Portefeuille_PLQ\` — code, commentaires en anglais

Entrants (lis-les tous avant de produire quoi que ce soit)
1. `01_Cadrage/Portefeuille_PLQ_Flux_v2.drawio` — flux utilisateurs et accès aux données.
2. Maquettes https://claude.ai/artifact/DSpedLCbm6enVxTz9cS9nd (copie : `01_Cadrage/maquettes/project/`) — 3 vues
   cibles ; chiffres illustratifs, noms réels.
3. `Goutte2.1/05_Gestion_Projet/Planification/Plan_Reinit_Goutte21_v7.md` §2, §11, §12, §13.4, §16 — existe déjà,
   à consommer, pas à refaire.
4. `Goutte2.1/01_Gouvernance/Team_G2.1_v1.xlsx` — rôles, personnes, et liste des absences Outlook à lire.
5. `Goutte2.1/Daily_Brief/_ledger/2026-W44.md` — exemple de run TI visible (MEP, infra, extranets).
6. Smartsheet `Goutte21_Master` (230627583414148) et `Jalons_Entites` (2733930749841284) — lecture au grain L ;
   L actif = phase ≠ Backlog et ≠ Done.
7. Jira GOU21 (sprints) ; SDD, PLQ, JSM STG21 (run) — lecture seule.
8. Artefact « Expert G1 — Gantt S1 » https://claude.ai/artifact/E3KrS3o15gWHwuqrvpnETg — exemple d'artefact projet.
9. Design system https://claude.ai/artifact/SW339XsDhEpz696xhonAC1 — l'interface le suit.
10. Miro : dernier board de rétro GOU21 (skill retro-sprint-g21 pour le gabarit et le cadre « Actions »).
11. JSM STG21 par extranet (skill maj-triage-stg21 pour la structure du board) — 10 extranets.
12. `Goutte2.1/01_Gouvernance/Comites/Codes_Taxes_*` — exemple d'item promu avec dépendance vers un livrable architecte.

Étapes — une à la fois, arrêt après chacune, condition de fin vérifiée en l'exécutant
Étape 1 — Modèle canonique v1 : `02_Modele/Modele_Canonique_v1.md` + `02_Modele/schema.json`.
  Entités : item (type programme | projet | run ; parent ; voie scrum | flux ; étape D9 ; priorité D9 ; santé D8 ;
  updated_at ; source ; promu oui/non), jalon (test D4 : oui/non à une date), risque (score P×I, skill
  risk-scoring-standard), attente de tiers, dépendance typée D16 (item→item, jalon→jalon, y compris vers un
  livrable du feed architecte), MEP (date, ticket, système, statut), action de rétro (board, texte, owner, fait),
  charge (Scrum : personnes × sprint ; Flux : WIP), instantané.
  Fin : 4 exemples réels valides contre le schéma (L8D, Expert G1, Run TI, Codes de taxes avec sa dépendance
  architecte) ; chaque champ des 3 maquettes a une source ou une saisie, et la liste des champs sans source
  m'est remise. Gelé après mon OK.
Étape 2 — Interface v0 : artefact partagé avec capacité db, 3 vues des maquettes, vue portefeuille par défaut,
  formulaire Gérer limité aux champs possédés par le portefeuille et masqué si `user.canEdit()` est faux,
  règles db : écriture owner seulement (D20), champs de source en lecture seule avec
  provenance et date. Code dans `Projets_Dev\Portefeuille_PLQ\`.
  Fin : les 3 vues s'affichent avec les 3 exemples de l'étape 1 ; une saisie dans Gérer est relue dans la base
  par ArtifactData et réapparaît dans la vue après rechargement.
Étape 3 — Adaptateurs, un par un, chacun exécuté sur les vraies données avant le suivant : Smartsheet (L actifs :
  % et phase, items promus) ; Jira (sprint courant et suivant ; run SDD/PLQ ; MEP = versions et tickets MEP ;
  JSM STG21 par extranet : ouverts, âge, tendance) ; artefacts (bloc feed — je commence par ajouter le bloc à
  Expert G1 — Gantt S1, tu me donnes le bloc à coller ; le feed architecte expose ses livrables comme cibles de
  dépendance) ; Outlook (absences 6 semaines des personnes de Team_G2.1) ; Miro (cadre « Actions » du dernier
  board de rétro). Chaque adaptateur écrit dans la base via le modèle, jamais dans la page.
  Fin : pour chaque adaptateur, un tableau « valeur lue à la source / valeur dans la base » sur 3 lignes réelles.
Étape 4 — Tâche planifiée du lundi 7 h (patron : skill suivi-planifie, adapté à la base d'artefact) :
  instantané daté, lecture des sources, règles (jalon reculé ≥ 5 j ouvrés ; prédécesseur reculé → successeur en
  alerte ; WIP > limite D7 ; fraîcheur > 14 j ; MEP dans 7 j sans ticket « prêt »), republication de l'artefact
  Portefeuille, message dans [canal Teams] avec le lien. Plus une skill `maj-actions-retro` lancée après chaque
  rétro (lit le cadre Actions du board Miro, met à jour la base).
  Fin : une exécution manuelle produit l'instantané, le digest et le message Teams ; je les relis.
Étape 5 — Première semaine réelle : je saisis 2 projets hors programme ; après le lundi suivant, tu compares le
  digest à ce que je sais être vrai, item par item, et proposes les corrections (seuils, sources, modèle).
  Fin : liste des écarts avec leur cause ; décision sur chacun, notée dans le kickoff v2.

Règles de travail
- Livrables en français, concis : un point par sujet, une ligne par point, tableaux, deux écrans ; motifs,
  options écartées et erreurs payées dans `*_Annexe_Motifs.md` ; jamais supprimer un motif, le déplacer.
- Avant de me livrer un document qui porte une décision, fais-le relire par un sous-agent au contexte neuf,
  sans lui donner ton raisonnement, et demande-lui la cause de chaque écart.
- Essaie tes commandes au lieu de relire ton texte.
- Ne me pose une question que si je détiens l'information, que la réponse déplace un livrable, et qu'elle se
  comprend sans ouvrir un fichier. Sinon tranche, applique, et note l'arbitrage dans le livrable.
- Jamais d'écriture dans les sources. Jamais de suppression sans accord explicite. Rien de `Recrutements/`.
- À chaque fin d'étape : ce qui est fait, ce qui a été tranché sans moi et pourquoi, un conseil pour mon
  prochain prompt.

Commence par l'étape 1.
```
