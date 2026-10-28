# Portefeuille PLQ — Interface v0 · spécification v1

> Étape 2 · 2026-10-27 · Artefact « Portefeuille PLQ » https://claude.ai/artifact/BraUay1hn8SFkM23maWHaB (version 2) · Code : `Projets_Dev\Portefeuille_PLQ\` (git) · Modèle : `02_Modele/Modele_Canonique_v1.md` (gelé) · Motifs : `Interface_Specification_v1_Annexe_Motifs.md`

## 1. Livré

| Élément | Contenu |
|---|---|
| Page | `interface/page.html` + `interface/core.js` + `schema.json` → `tools/build_interface.py` → `dist/portefeuille.html` |
| Capacités | `db` règle racine : lecture `view`, écriture `owner` · `user` |
| Base | 13 collections = clés du modèle ; `doc_id` = `id` ; semée par `tools/build_seed.js` (5 exemples fusionnés, 45 enregistrements) |
| Tests | `tests/test_core.js` (13 règles) · `tests/test_page_dom.js` (13 contrôles, base simulée) · `validate_model.py` sur la base semée |
| Lien profond | `#projet/<id>` · `#sprint/<id>` |

## 2. Vues

| Vue | Affiche | Calculé à l'affichage |
|---|---|---|
| Portefeuille (défaut) | 4 tuiles · filtres voie / étape · grille 13 semaines (sprints, congés collectifs, barres, losanges, MEP, ligne du jour) · charge par rôle 4 sem. · top 5 risques · alertes · support extranets · entonnoir | santé D8, alertes étape 4, WIP, charge D7 |
| Projet | fiche (priorité Pn, prochain jalon, dépend de / alimente) · charge · jalons et progression · risques · attentes · sources · instantanés · Gérer | rang P, risque 1–5, % = faits / total si la source n'en donne pas |
| Sprint | tuiles · capacité vs demande · items du sprint · WIP par personne · jalons · absences · run et MEP · actions de rétro · Gérer équipe | j-p dev nets, réserve run |

## 3. Gérer — champs saisissables (modèle §3)

| Où | Saisissable | Lecture seule (provenance + date affichées) |
|---|---|---|
| Projet · Item | nom · type · parent · voie · étape · promu · valeur / urgence / effort · responsable · fenêtre · note du lundi · liens | santé · % avancement · phase source · contenu sprint · support · mis à jour |
| Projet · + Jalon / + Risque / + Attente | création ; modification des seuls enregistrements `saisie` | enregistrements feed, Smartsheet, ledger |
| Projet · + Dépendance | type D16, sens, extrémité item / jalon / livrable | — |
| Projet · Charge flux | WIP ou ETP par personne et semaine | jours-personne (calcul) |
| Sprint · Équipe | limite WIP · absence collective | nom, rôle, absences Outlook |
| Portefeuille | + Ajouter un projet (`saisie.<nom>`) | — |

## 4. Règles appliquées

| Règle | Application |
|---|---|
| Droits D20 | Gérer et « + Ajouter » masqués si `user.canEdit()` est faux ; écriture refusée hors owner par la règle `db` |
| Modèle | chaque écriture validée contre `schema.json` (validateur JS embarqué) ; `sante` jamais écrite |
| Écriture | document complet (`set`) ; `updated_at` et `source.lu_le` en EDT `-04:00` |
| Recul | 1re date gardée dans `date_initiale` à la création et au 1er déplacement d'un jalon saisi |
| Suppression | aucune dans l'interface : clore (risque non ouvert, jalon fait, attente reçue) |

## 5. Conditions de fin

| Condition | Preuve | État |
|---|---|---|
| 3 vues avec les exemples (4 réels + base calcul : 5 documents du modèle gelé) | artefact publié v2, navigateur, 2026-10-27 18h10 EDT : Portefeuille, Projet L8D, Sprint S19 rendus sur la base réelle | fait |
| Règles `db` | `as_level admin` et `interact` : écriture refusée · `view` et `interact` : lecture OK | fait |
| Saisie Gérer → ArtifactData → vue après rechargement | Franck : note du lundi L8D « test note » · ArtifactData : `items/goutte21.l8d` version 2, `updated_at` 18h06 EDT · rechargement : note affichée dans la fiche et dans Gérer | fait |

## 6. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| A1 | Santé, alertes, priorité, % recalculés à chaque affichage ; la santé stockée sert l'instantané seulement |
| A2 | Écriture par document complet, pas par champ |
| A3 | Pas de suppression dans Gérer ; clôture par statut |
| A4 | Admin (Editor) voit Gérer mais n'écrit pas : limite D20 assumée jusqu'au 2e éditeur |
| A5 | Jours fériés non retirés des jours ouvrés en v0 |
| A6 | Attente non comptée comme demande sur le rôle visé en v0 (tiers en texte libre) |
| A7 | Charge 4 semaines : sprints chevauchants comptés en entier ; flux = Σ WIP / Σ limites |
| A8 | MEP passée encore « planifiée » : affichée, non alertée (règle = 7 j à venir) |
| A9 | Non affichés : vues CDP / auditeur, Importer Excel, décisions liées, Et si…, budget |
| A10 | Lecture des collections sans pagination (< 100 docs chacune en v0) |
| A11 | Dépendance saisie : ni modifiable ni clôturable (pas de statut au modèle v1) ; charge : modifiable, close à 0 |
| A12 | Champ possédé saisi sur un enregistrement de source : provenance = `saisie` par la règle §3, l'enregistrement garde sa `source` |
| A13 | Étapes Idée / Qualifié : pastille grise, pas de santé ; alerte fraîcheur sur Actif et Planifié seulement |
| A14 | ETP converti en j-p (ETP × jours ouvrés) ; rôle direction / cdp → `expert` dans une charge |
| A15 | Charge flux : seules les personnes en voie flux sont proposées |
| F1 | Décision Franck : Gérer ne rajeunit pas `updated_at` d'un item lu dans une source (artefact v4) |
