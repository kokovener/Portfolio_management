# Adaptateur Smartsheet v3 · Annexe motifs

> Reprend intégralement l'annexe v1 (S0–S10) ; lignes R06 ajoutées en fin de tableau.

> À n'ouvrir que pour rouvrir un choix. Un motif ne se supprime jamais : il se déplace.

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| S0 | Phase vide = actif + alerte | Décision Franck 2026-10-27 (question étape 2) | Exclure · actif sans alerte | — |
| S1 | Grain par l'ID | L1, L2, L3-L4, L5, L6 ont `Niveau = Entité` alors que leur ID est un L ; filtrer sur `Niveau` aurait perdu L6 Transporteur, présent dans la maquette | Filtrer sur `Niveau` | Constat étape 1 « 11 L + 6 Sub-L » faux : il comptait la colonne Niveau. Règle : identifier un grain par la clé structurée, contrôler les colonnes déclaratives |
| S2 | Historique des cellules % et Phase | Le connecteur ne renvoie pas la date de modification de ligne ; `Dernière MAJ` est vide partout ; 2 appels par L actif (limite 30 / min) | Historique de toutes les colonnes · date de lecture | — |
| S3 | Champs possédés à la création seulement | Modèle §3 : nom, étape, parent sont au portefeuille ; Done → Terminé car un L livré ne doit pas rester actif | Écraser à chaque lecture | — |
| S4 | Pas de risque créé sans P·I | Modèle : « Top risque, P·I saisis » ; un P·I posé par défaut serait un faux score D8 | P3·I3 par défaut | — |
| S5 | Lien `rowId=` | Aucun champ du modèle gelé ne relie un item saisi à une ligne ; `liens` existe déjà | Champ `ref_source` (modèle v2) | — |
| S6 → F1 | Fraîcheur = source seule pour un item lu (décision Franck 2026-10-27) | Une note du lundi masquait l'absence de mise à jour Smartsheet (risque R2 : % faux) ; écart au schéma (`updated_at` « source ou saisie ») proposé pour le modèle v2 | Saisie postérieure gardée (choix initial S6, retiré) | Relecture : une règle littérale du modèle peut contredire son intention (D8) ; la remonter au décideur plutôt que l'appliquer |
| S7 | Correction de l'exemple L8D | L'exemple étape 1 portait « AF / UX » (maquette) ; la source dit vide | Garder la valeur d'exemple | Une valeur d'exemple tirée d'une maquette doit être marquée « posée » dans le champ lui-même, pas seulement dans le document |
| S8 | Constat fraîcheur | 8 L actifs sur 9 sans modification depuis plus de 14 j (L6 : 111 j) : signal réel, pas défaut de l'adaptateur | — | — |
| S9 | Écart déclaré au modèle gelé (fraîcheur) | Modèle §1 : « `Dernière MAJ` si remplie, sinon date de modification de la ligne » ; cause : le connecteur ne renvoie pas `modifiedAt` de ligne ; proposition v2 : « sinon dernière modification des cellules % et Phase » | Lire l'historique de chaque colonne (22 appels par L) | Relecture 2026-10-27 : un contournement d'une règle gelée doit être écrit comme écart + cause + proposition, pas seulement comme choix d'implémentation |
| S10 | Relecture du 2026-10-27 (sous-agent) | Écarts retenus et corrigés dans la fiche : export filtré présenté comme brut ; réserve « items promus » non écrite ; S6–S8 absents du §5 ; exception Done de S3 ; risque « mis à jour » sans changement ; alerte placée dans la colonne base ; notation priorité. Écart remonté à Franck : S6 (une note masque la fraîcheur source) | — | — |
| S11 | Grain v1 « L / Sub-L seulement » maintenu par défaut | La question « jusqu'où descendre » a reçu « exemple L8D1.1.3 » (Franck) : une entité est un projet du portefeuille quand Franck le dit, pas parce qu'elle est une entité ; lire les 61 entités aurait noyé la vue | Lire toutes les entités · lire les Units actives | — |
| S12 | Promotion par colonne `Portefeuille` dans la feuille | Réponse F14 : « c'est la feuille qu'il faut optimiser » ; D4 dit déjà « item promu par Franck sous le grain L » — la case déplace ce geste dans la source, sans rouvrir D4 ; règle produit « jamais d'entité » respectée : une entité n'entre que promue | Promotion dans Gérer seulement (v1 : non relié, d'où codes de taxes orphelin) · niveau Niveau = « Portefeuille » (mélange deux sens) | Constat R06 : « codes de taxes absent de Smartsheet » était faux — il était à L8D1.1.2, invisible parce que le grain filtrait les entités. Règle : avant d'écrire « absent de la source », chercher le nom dans toute la feuille (`find_in_sheet`), pas dans l'extrait filtré |
| S13 | Parent d'un item relié ou coché = structure de la feuille | Sans cela, codes de taxes restait sous le programme alors que la feuille le place sous L8D ; F14 : la feuille fait foi pour la structure | Garder le parent saisi (S3) | — |
| S14 | Étape suit la phase pour les items Smartsheet | F12 (A Revoir = pause) ne peut s'appliquer à L3-L4/L5/L6 déjà en base que si l'étape est relue ; planifié conservé quand la phase est active (choix d'un humain plus précis) | Étape à la création seulement (S3) | Erreur payée : S3 figeait l'étape ; un item mis en pause dans la source restait rouge 112 j. Règle : un champ dérivé d'un champ source doit être relu à chaque lecture |
| S15 | Backlog sur un item en base → qualifié | L8E : ses 3 Units sont Backlog ; même nature que A Revoir (pas de travail en cours) ; supprimer l'item est interdit sans accord | Laisser actif (fausse alerte) · supprimer | — |
| S16 | Lien `rowId=` posé par Claude sur codes de taxes | Le mécanisme S5 existait ; il n'avait jamais tourné sur une vraie ligne (réserve v1). Le lien est un champ Gérer, modifiable par Franck | Attendre la case `Portefeuille` (doublon `goutte21.l8d1.1.2` + item saisi) | — |
| S17 | Phase déduite = la moins avancée des enfants actifs | Choix F13 (option recommandée) ; donne L8 = BA alors que L8D est en Dev : le parent montre son maillon le plus lent | La plus avancée · la plus fréquente | — |
| S18 | Lecture des 94 lignes, plus l'extrait filtré | La déduction de phase et le plus proche ancêtre exigent les enfants ; `get_sheet_summary` renvoie 94 lignes non échantillonnées sous la limite de jetons | Lire au grain + enfants directs (deux appels, même coût) | — |
| S19 | % des parents et des entités non modifiés | Constat R06 : parent = `ROUND(AVG(CHILDREN()))` ; entité = formule croisée sur Jalons_Entites (poids des jalons binaires faits) ; L3-L4/L5/L6 = saisie manuelle. Le % est déjà calculé à la source : le relire suffit | Recalculer le % dans l'adaptateur | — |
| S20 | Fraîcheur d'un item relié = source (8 oct.) | F1 appliqué tel quel : codes de taxes passe de « saisi 27 oct. » à « % modifié 8 oct. » → alerte fraîcheur (20 j) ; signal vrai : Jalons_Entites n'a pas bougé depuis le 8 oct. | Garder la date de saisie | — |
| S21 | Relecture du 2026-10-28 (sous-agent, atelier R06) | Voir `05_Pilotage/Atelier_R06_Smartsheet_v1_Annexe_Motifs.md` | — | — |
| S22 | Trois colonnes de date ajoutées par Claude | Accord explicite de Franck (28 oct., question « Colonnes ») ; colonnes vides, aucune donnée existante modifiée | Franck les crée | — |
| S23 | Gate cochée sans Date prévue → date = Date check | Un jalon exige une date (modèle) ; la date réelle vaut mieux que rien ; sans aucune date, ne rien inventer | Date de lecture (fausse) | — |
| S24 | Fenêtre Smartsheet prioritaire, vide = Gérer conservée | Franck : le prévu vit dans le Master ; une fenêtre saisie dans Gérer avant ne doit pas disparaître tant que la feuille est vide | Effacer la fenêtre Gérer | — |

## v4 (retour R30, 2026-10-28)

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| A-v4-1 | Exception « planifié conservé » retirée ; étape et voie relues aussi pour l'item saisi relié | Voir modèle v5 M38 : le champ protégé masquait la source (codes de taxes affiché planifié · flux en AF / UX, au sprint) | Signal seul | Une exception de protection ajoutée « pour ne pas écraser Franck » a caché une donnée fausse pendant 1 jour ; règle : un champ est lu OU saisi, jamais protégé à moitié |

## v5 (R27, 2026-10-29)

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| S-R27 | Mot-clé bloquant / BLOQ / bloque / bloqué (Franck) | Seuls les commentaires qui signalent un blocage deviennent une attente | Tout commentaire récent (bruit) | — |
