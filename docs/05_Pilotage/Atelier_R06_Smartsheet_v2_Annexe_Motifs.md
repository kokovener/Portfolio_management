# Atelier R06 v2 · Annexe motifs (reprend v1)

> À n'ouvrir que pour rouvrir un choix. Un motif ne se supprime jamais : il se déplace. Motifs techniques : `04_Adaptateurs/Adaptateur_Smartsheet_v3_Annexe_Motifs.md` (S11–S24), `Adaptateur_Jira_v3_Annexe_Motifs.md` (JR1–JR4), `02_Modele/Modele_Canonique_v4_Annexe_Motifs.md` (M30–M37). Résultat détaillé de la 1re partie : `_Archives/Atelier_R06_Smartsheet_v1.md` §4.

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
| R12 | Critère de promotion = épopée Jira propre (A1 en v2, A7 en v1) | Un projet du portefeuille a un suivi Jira à lui (R02 : épopée liée → sprint, Data Jira) ; une entité sans épopée n'aurait ni charge ni statistiques | Laisser le critère à l'appréciation (non vérifiable le lundi) | — |
| R13 | L8D1.1.2 retiré de C1 | Déjà relié par `rowId=` : la cocher ne changerait rien (aucun doublon par construction) | La cocher « pour que la source le dise » | — |
| R14 | L8D « Dev (déduite) » laissé tel quel, signalé à Franck (S4) | La déduction lit les enfants directs ; L8D1 porte Dev saisi par Franck alors que ses entités sont AF / UX ou Backlog : incohérence de source, pas de règle | Déduction récursive jusqu'aux entités (écraserait une phase saisie) | — |
| R15 | C1 et C2 écrits dans Smartsheet par Claude | Autorisation explicite de Franck (28 oct. : « tu peux le faire toi-même avec le connecteur ») ; exception ponctuelle à la règle produit « le portefeuille ne modifie jamais Smartsheet » — la tâche du lundi reste en lecture seule. Colonne ajoutée en position 4 (après Niveau), id 8595181536055172 ; relecture filtrée : 6 lignes conformes | Franck saisit lui-même | — |

| R16 | 2e partie de l'atelier rouverte par Franck | « l'atelier n'est pas fini » : jalons et dates n'avaient pas de source ; E6 avait été reporté (R7) | — | Reporter un sujet « hors des 5 changements » sans l'avoir montré à Franck l'a fait revenir le jour même ; règle : un report se valide avec le décideur |
| R17 | Gates = 4 jalons sur 18 (F15) | Points de décision du flux v7 : scope figé, GO Dev, UAT, MEP ; les autres jalons restent le % d'équipe | 18 jalons · MEP seule | — |
| R18 | Prévu dans Smartsheet, réel ailleurs (F16) | Smartsheet = engagement (baseline) ; réel = gate cochée + Date check, travail = sprints Jira | Dates Jira d'épopée (vides, E10) | — |
| R19 | Colonnes créées par Claude (C6) | Accord Franck à la question « Colonnes » ; 3 colonnes vides, aucune donnée existante touchée | Franck les crée | — |
| R20 | Dev-1 en tickets Jira (F17) | « tout n'est pas toujours estimé lorsqu'on débute » ; le nombre de tickets ne dépend d'aucune estimation ; garde-fou si le total augmente | Points seuls | — |
| R21 | Pas de jalon inventé aujourd'hui | Date prévue vide partout : le Gantt montre le réel Jira seul jusqu'à la saisie de Franck (S5) ; les 5 jalons saisis à la main restent | Poser des dates de maquette (erreur S7 de l'étape 3) | — |
| R22 | Tâche du lundi v4 = copie intégrale dans la tâche planifiée | Le texte de la tâche fait foi et doit rester autonome | Pointer vers le fichier | — |
| R23 | GOU21-9604 déplacée vers Grilles de taxes (C11) | Le nom de l'épopée est « Gestion des grilles de taxes » ; T7 l'avait posée sur L8D « à corriger dans Gérer » | La laisser sur L8D (le réel et le % de L8D mesuraient les grilles) | Erreur payée : une épopée rattachée sans lire son nom ; règle : rattacher une épopée en citant son résumé Jira |
| R24 | Suppressions F18 | 12 charges et 1 statistique L8D comptaient les tickets des grilles en double après le déplacement ; la gate saisie AC-4 (à venir, 14 nov.) contredisait Jalons_Entites (AC-4 cochée pour les 2 livrables) | Les garder signalées | Un id de jalon saisi (`gate-ac4`) hors du format `<item>.ac-4` n'est pas reconnu comme gate ; règle : toute gate suit le format `<item>.<gate>` |
| R25 | Écart déclaré à Jalons_Binaires_v7 (F17) | v7 dit « points livrés / planifiés » ; Franck veut des tickets ; le portefeuille n'écrit pas dans Goutte 2.1, il affiche son propre calcul | Modifier v7 (document diffusé, gelé) | — |

## Relecture au contexte neuf (2026-10-28)

| # | Écart relevé | Cause | Suite |
|---|---|---|---|
| V1 | Fraîcheur de codes de taxes attribuée à Jalons_Entites | Hypothèse écrite comme constat : seule la cellule % de Goutte21_Master est datée | Corrigé (§4) |
| V2 | « 61 entités » | Chiffre non recompté | Corrigé (R2 : 51) |
| V3 | C2 rattaché à E1 | Cause de E1 confondue avec un défaut de saisie sans effet sur l'affichage | E7 créé, C2 rattaché à E7 |
| V4 | C1 non exécutable (« toute ligne… projet suivi ») | Critère renvoyé à Franck | Critère : épopée Jira propre (A1 en v2) |
| V5 | Entités en base sans écart écrit à la règle produit | Assimilation case = item promu non déclarée | R11 |
| V6 | Cocher L8D1.1.2 sans effet | Lien `rowId=` déjà posé | Retiré de C1 (R13) |
| V7 | L8D « Dev » alors que ses descendants sont AF / UX | Incohérence de source (L8D1 = Dev) non relevée | S4, R14 |
| V8 | « depuis le 29 mai » | Date de modification de la cellule Phase, pas de création | Corrigé (R8) |
| V9 | E6 non prouvé par le brut | Lecture filtrée « non vide » faite mais non transcrite | Preuve citée dans E6 ; brut complété |
| V10 | « page v15 » sans trace | Pas de note de version dans 03_Interface | Tracé dans Retours_Iteration1 (R06) |
| V11 | L8 absent de l'état « avant » de §1 | Ligne E5 incomplète | Corrigé |
| V12 | Fiche : « Archi » abrégé | Libellé source = « Archi / Coordo / Confo » | Fiche corrigée |

## Relecture au contexte neuf — v2 (2026-10-28)

| # | Écart relevé | Cause | Suite |
|---|---|---|---|
| W1 | Épopée des grilles rattachée à L8D | T7 non revu après la promotion de L8D1.1.3 | C11, R23 |
| W2 | Critère A1 non respecté par la ligne cochée | Critère écrit sans vérification contre la base | C11 |
| W3 | Gate saisie AC-4 de L8D « à venir » contre la source | Id hors format, non reconnu comme gate | Supprimée (F18), R24 |
| W4 | F17 sans écart déclaré à v7 | Décision appliquée sans relire le modèle source | F17 complété, R25 |
| W5 | Garde-fou périmètre « Fait » sans test | Codé, non vérifié | Test ajouté (12 tests Jira data) |
| W6 | L0 « à saisir » sans action | S5 incomplet | S5 complété |
| W7 | E10, E11 sans trace transcrite | Lecture faite, non enregistrée (même cause que V9) | `r06c/constats.json` |
| W8 | « page v17 » sans trace | Pas de note de version | Retours_Iteration1 (R06) mis à jour |
| W9 | « % tickets sur chaque ligne » | Seulement les lignes qui ont une épopée | C9 corrigé |
| W10 | Mineurs : A1/A7, « 18 déc. » sans année, 17/49 dans la fiche Jira | Rédaction | Corrigés |
| W11 | Deux bruts de référence jira_data dans la tâche v4 | Ajout v4 par une ligne en fin de forme | Gardé : la ligne « board_sprints, epic_sprint_issues (forme de r06c\jira_raw.json) » complète la forme ; le texte de la tâche planifiée fait foi et reste identique au fichier |
