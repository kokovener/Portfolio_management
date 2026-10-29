# Atelier R06 · Annexe motifs

> À n'ouvrir que pour rouvrir un choix. Un motif ne se supprime jamais : il se déplace. Motifs techniques détaillés : `04_Adaptateurs/Adaptateur_Smartsheet_v2_Annexe_Motifs.md` (S11–S21) et `02_Modele/Modele_Canonique_v3_Annexe_Motifs.md` (M30–M31).

| # | Choix | Motif | Options écartées | Erreur déjà payée (réutilisable) |
|---|---|---|---|---|
| R1 | Exemples tirés par Claude | Le prompt de reprise portait encore les gabarits `<ex. …>` : Claude a lu les 94 lignes et proposé 6 écarts candidats plutôt que d'attendre | Demander les exemples avant toute lecture | Un prompt à trous se livre rempli ou se signale ; règle : relire ses propres gabarits avant d'envoyer |
| R2 | C1 = colonne `Portefeuille` (arbitrage Claude A1) | Franck a répondu « exemple L8D1.1.3 » à la question du grain (au lieu de l'option recommandée « Units actifs ») et F14 « c'est dans la feuille que vient le souci » : le grain L/Sub-L ne suffit pas, mais lire les 51 entités (56 lignes Niveau = Entité, dont 5 L) noierait la vue ; D4 prévoit déjà la promotion par Franck — la case la déplace dans la source | Lire toutes les entités · lire les Units actives · renuméroter la WBS | Chiffre « 61 entités » écrit sans recompter (relecture) : même erreur que R3 — compter sur la clé, pas sur `Niveau` |
| R3 | C2 = corriger `Niveau` (écart E7, pas E1) | 5 L portent Niveau = Entité ; l'adaptateur lit l'ID donc l'affichage n'en dépend pas, mais tout autre lecteur de la feuille (rapports, skills) se trompe, et le signal revient chaque lundi | Laisser le signal permanent | Étape 1 : « 11 L + 6 Sub-L » faux car compté sur Niveau ; relecture R06 : C2 avait d'abord été rattaché à E1, qu'il ne corrige pas |
| R4 | Phase déduite plutôt que saisie | F13 ; % des parents déjà calculé à la source (`ROUND(AVG(CHILDREN()))`) : la phase devient cohérente avec le % sans saisie supplémentaire | Franck remplit la phase des 4 parents (dérive dès la prochaine bascule d'un enfant) | — |
| R5 | « La moins avancée » | Option recommandée et retenue : un parent montre son maillon le plus lent (L8 = BA alors que L8D est en Dev) | La plus avancée · la majoritaire | — |
| R6 | A Revoir → qualifié | F12 « en pause, hors actif » ; le modèle n'a pas d'étape « en pause » : qualifié est grisé et sans alerte ; groupe renommé « Candidats et en pause » | Étape `pause` (modèle v4, page, instantanés) · sortir les items de la base (suppression interdite) | Constat : 3 L rouges 112 j étaient un faux signal (pause décidée le 8 juil., Notes hebdo « Livraison à reprendre ») |
| R7 | E6 reporté | 5 changements au plus (consigne) ; E6 demande un choix de source (Trimestre cible texte libre vs Jalons_Entites daté) qui mérite son propre atelier | Lire `Trimestre cible` tel quel (« 3eme 2026 », « 2024.0 » : texte libre, non fiable) | — |
| R8 | Constat « codes de taxes absent de Smartsheet » corrigé | Il est à L8D1.1.2 (phase saisie le 29 mai, 16h15 EDT) ; le constat venait d'un extrait filtré au grain L | — | Règle : chercher un nom dans toute la feuille avant d'écrire « absent » |
| R9 | Écritures dans l'ordre page → base | Gérer valide chaque enregistrement contre le schéma embarqué ; écrire `phase_deduite` avant la page v15 aurait fait refuser les saisies sur L8D, L8, L0.1, L8E | Base d'abord | — |
| R10 | Relecture par sous-agent au contexte neuf | Consigne CLAUDE.md ; écarts et causes ci-dessous | — | — |
| R11 | Écart déclaré à la règle produit « Goutte 2.1 : jamais d'entité ni de story » | Cause : la même règle admet les « items promus par Franck », et le schéma définit `promu` comme « item ajouté par Franck sous le grain L (entité, sujet transverse) » ; une entité n'entre que cochée par Franck. Proposition pour CLAUDE.md : « Lu au grain L + lignes cochées `Portefeuille` (items promus) ; jamais d'entité non cochée ni de story » | Lire les entités sans case · refuser toute entité (codes de taxes resterait orphelin) | — |
| R12 | Critère de promotion = épopée Jira propre (A7) | Un projet du portefeuille a un suivi Jira à lui (R02 : épopée liée → sprint, Data Jira) ; une entité sans épopée n'aurait ni charge ni statistiques | Laisser le critère à l'appréciation (non vérifiable le lundi) | — |
| R13 | L8D1.1.2 retiré de C1 | Déjà relié par `rowId=` : la cocher ne changerait rien (aucun doublon par construction) | La cocher « pour que la source le dise » | — |
| R14 | L8D « Dev (déduite) » laissé tel quel, signalé à Franck (S4) | La déduction lit les enfants directs ; L8D1 porte Dev saisi par Franck alors que ses entités sont AF / UX ou Backlog : incohérence de source, pas de règle | Déduction récursive jusqu'aux entités (écraserait une phase saisie) | — |
| R15 | C1 et C2 écrits dans Smartsheet par Claude | Autorisation explicite de Franck (28 oct. : « tu peux le faire toi-même avec le connecteur ») ; exception ponctuelle à la règle produit « le portefeuille ne modifie jamais Smartsheet » — la tâche du lundi reste en lecture seule. Colonne ajoutée en position 4 (après Niveau), id 8595181536055172 ; relecture filtrée : 6 lignes conformes | Franck saisit lui-même | — |

## Relecture au contexte neuf (2026-10-28)

| # | Écart relevé | Cause | Suite |
|---|---|---|---|
| V1 | Fraîcheur de codes de taxes attribuée à Jalons_Entites | Hypothèse écrite comme constat : seule la cellule % de Goutte21_Master est datée | Corrigé (§4) |
| V2 | « 61 entités » | Chiffre non recompté | Corrigé (R2 : 51) |
| V3 | C2 rattaché à E1 | Cause de E1 confondue avec un défaut de saisie sans effet sur l'affichage | E7 créé, C2 rattaché à E7 |
| V4 | C1 non exécutable (« toute ligne… projet suivi ») | Critère renvoyé à Franck | Critère A7 : épopée Jira propre |
| V5 | Entités en base sans écart écrit à la règle produit | Assimilation case = item promu non déclarée | R11 |
| V6 | Cocher L8D1.1.2 sans effet | Lien `rowId=` déjà posé | Retiré de C1 (R13) |
| V7 | L8D « Dev » alors que ses descendants sont AF / UX | Incohérence de source (L8D1 = Dev) non relevée | S4, R14 |
| V8 | « depuis le 29 mai » | Date de modification de la cellule Phase, pas de création | Corrigé (R8) |
| V9 | E6 non prouvé par le brut | Lecture filtrée « non vide » faite mais non transcrite | Preuve citée dans E6 ; brut complété |
| V10 | « page v15 » sans trace | Pas de note de version dans 03_Interface | Tracé dans Retours_Iteration1 (R06) |
| V11 | L8 absent de l'état « avant » de §1 | Ligne E5 incomplète | Corrigé |
| V12 | Fiche : « Archi » abrégé | Libellé source = « Archi / Coordo / Confo » | Fiche corrigée |
