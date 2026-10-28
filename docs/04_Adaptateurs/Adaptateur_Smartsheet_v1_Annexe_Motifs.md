# Adaptateur Smartsheet v1 · Annexe motifs

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
