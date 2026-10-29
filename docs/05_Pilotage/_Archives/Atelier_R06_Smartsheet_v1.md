# Atelier R06 — Goutte 2.1 dans Smartsheet v1

> 2026-10-28 · Franck + Claude · Source : `Goutte21_Master` 230627583414148, lue en direct (94 lignes, lecture seule) · Motifs : `Atelier_R06_Smartsheet_v1_Annexe_Motifs.md` · Fiche : `04_Adaptateurs/Adaptateur_Smartsheet_v2.md` · Modèle v3

## 1. Écarts constatés

| # | Ligne | Feuille | Portefeuille (avant) | Cause |
|---|---|---|---|---|
| E1 | L3-L4 · L5 · L6 | A Revoir · modif. 8 juil. | actifs, rouges (fraîcheur 112 j) | Adaptateur : A Revoir lu comme actif |
| E2 | L8D | Phase vide ; L8D1 Paie Acompte = Dev | sans phase, alerte « phase » | Structure : phase portée par l'Unit, adaptateur arrêté au Sub-L |
| E3 | Codes de taxes | Existe : L8D1.1.2, entité, AF / UX, 56 % | item saisi sous le programme, sans % ni phase | Adaptateur (entités jamais lues) + saisie non reliée |
| E4 | L0 / L0.1 | L0.1 sans phase ; % = moyenne de ses 10 entités | L0.1 en alerte « phase » | Structure : phase non remontée sur la ligne parent |
| E5 | L8 · L8E | Phases vides ; L8E et ses 3 Units en Backlog | L8 et L8E en alerte « phase » ; L8E actif | Structure : idem E4 |
| E6 | Toutes | `Trimestre cible` rempli sur 6 lignes (texte libre) ; `Jalon prochain`, `Dernière MAJ`, `Dépendances` vides (lecture filtrée « non vide » du 28 oct. : 0 ligne) | aucune fenêtre ni jalon Goutte 2.1 | Saisie + adaptateur (Trimestre lu, non converti en fenêtre) — **reporté** |
| E7 | L1, L2, L3-L4, L5, L6 | `Niveau` = Entité alors que l'ID est un L | signal « Niveau ≠ ID » à chaque lecture (sans effet sur l'affichage : grain lu par l'ID) | Saisie |

## 2. Décisions de Franck

| # | Décision |
|---|---|
| F12 | « A Revoir » = en pause, hors actif |
| F13 | Phase vide d'une ligne parent = déduite des enfants (la moins avancée des enfants actifs) |
| F14 | Le défaut de structure (codes de taxes, L8D1.1.3) se corrige dans la feuille |

## 3. Changements (5)

| # | Où | Changement | Écart | Qui | Statut |
|---|---|---|---|---|---|
| C1 | Feuille | Ajouter une colonne case à cocher nommée exactement `Portefeuille` ; cocher L8D1.1.3 Grilles de taxes ; plus tard, cocher une ligne sous le grain seulement si elle a sa propre épopée Jira GOU21 | E3 | Claude (autorisé par Franck) | Fait 28 oct. 15h40 EDT |
| C2 | Feuille | `Niveau` = L sur L1, L2, L3-L4, L5, L6 | E7 | Claude (autorisé par Franck) | Fait 28 oct. 15h40 EDT |
| C3 | Adaptateur | A Revoir et Backlog → étape qualifié (groupe « Candidats et en pause », pas d'alerte fraîcheur) | E1, E5 | Claude | Fait |
| C4 | Adaptateur + modèle v3 | Phase vide déduite des enfants, affichée « (déduite) » (`item.phase_deduite`) | E2, E4, E5 | Claude | Fait |
| C5 | Adaptateur | Ligne cochée `Portefeuille` lue à tout niveau, sous son plus proche ancêtre ; item saisi relié par `rowId=` rafraîchi, jamais doublé | E3 | Claude | Fait |

## 4. Résultat (base écrite le 28 oct., page v15)

| Ligne | Avant | Après |
|---|---|---|
| L3-L4 · L5 · L6 | actifs, rouges | qualifiés (en pause), gris |
| L8D · L8 · L0.1 | sans phase, alerte | Dev · BA · AF / UX (déduites) |
| L8E | actif, alerte | qualifié, Backlog (déduite) |
| Codes de taxes | sous le programme, sans % | sous L8D · AF / UX · 56 % · alerte fraîcheur 20 j (% de la ligne inchangé depuis le 8 oct. 09h20 EDT) |
| Alertes « phase » | 4 | 0 |
| L8D1.1.3 Grilles de taxes | absent | item promu sous L8D · AF / UX · 77 % (lu après C1) |
| Signaux « Niveau ≠ ID » | 5 | 0 (après C2) |

## 5. Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| A1 | « exemple L8D1.1.3 » lu comme : promouvoir des lignes choisies sous le grain, pas toutes les entités → case `Portefeuille` = « item promu par Franck » de la règle produit, placé dans la source (écart à la lettre « jamais d'entité » : annexe R11) |
| A7 | Critère de promotion : la ligne a sa propre épopée Jira GOU21 (codes de taxes : GOU21-9199) |
| A2 | Backlog sur un item déjà en base = même traitement que A Revoir (qualifié) |
| A3 | L'étape et le parent des items Smartsheet suivent la feuille à chaque lecture |
| A4 | Codes de taxes relié à L8D1.1.2 par un lien posé en base (modifiable dans Gérer) |
| A5 | E6 (fenêtres, jalons) reporté : hors des 5 changements |
| A6 | Tâche du lundi v3 : lecture des 94 lignes (le 2 nov. tourne avec l'adaptateur v2) |

## 6. Suite

| # | Quoi | Quand |
|---|---|---|
| S1 | ~~Franck applique C1 et C2~~ fait par Claude via le connecteur, sur autorisation de Franck | 28 oct. |
| S2 | Le lundi 2 nov. lit la colonne `Portefeuille` ; vérifier L8D1.1.3 sous L8D dans le digest | 2 nov. |
| S3 | E6 : lire `Trimestre cible` → fenêtre, ou jalons d'entité dans `Jalons_Entites` | prochain atelier |
| S4 | L8D1 porte Dev alors que ses entités sont AF / UX ou Backlog : L8D s'affiche « Dev (déduite) » — Franck confirme la phase de L8D1 | avant le 2 nov. |
