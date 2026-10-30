# Portefeuille PLQ — Revue UX/UI v2

> 2026-10-29 · Artefact « Portefeuille PLQ » page v45, vue propriétaire, données réelles, volet 800 px + 375 px · Grille : heuristiques Nielsen, WCAG 2.2 AA, gestalt · Motifs et preuves : `Revue_UX_v2_Annexe_Motifs.md`
> Effort : S ≤ ½ j · M ≤ 2 j · Impact : ★★★ décision / confiance · ★★ lecture · ★ confort · Décisions Franck 2026-10-29 : 19 oui, 3 non (U03, U04, U07 le 30 oct.)
> v2 (2026-10-29 soir) : 19 constats livrés en page v46, un commit par U (`Projets_Dev/Portefeuille_PLQ`, 2fa4cd3 → 1b9b06c) ; 18 suites de tests vertes ; relecture d'implémentation au contexte neuf faite

## Transverse

| ID | Constat | Proposition | Effort | Impact | Décision | Livré (page v46) |
|---|---|---|---|---|---|---|
| U01 | Onglets et fraîcheur disparaissent au défilement | En-tête collant (titre court, onglets, fraîcheur) | S | ★★ | oui | c3a9a68 |
| U02 | Légende santé en bande permanente sous l'en-tête (Portefeuille, Projet) — rouvre R16 « toujours visible » | Légende en une ligne compacte (comme Sprint, R42) ; détail au survol | S | ★ | oui | ef88083 |
| U03 | Santé lue par la couleur seule ; pastille grise 2,2:1 (sombre) / 1,6:1 (clair), orange 2,6:1 (clair) | Forme + couleur (● vert, ▲ orange, ■ rouge, ○ gris) ; contraste ≥ 3:1 | S | ★★★ | non | — |
| U04 | Texte 10–12 px majoritaire ; gris secondaire 3,8:1 en thème clair | Base 13 px, minimum 12 px ; `--mute` clair ≥ 4,5:1 | S | ★★ | non | — |
| U05 | Jargon technique visible : ids de ligne Smartsheet, « adaptateur-… », codes R37 / D8, « Base · 204 enregistrements » | Masquer derrière « Détails techniques » (infobulle ou repli) ; libellés métier seuls | S | ★★ | oui | 8d2b757 |
| U06 | Deux horodatages concurrents (« Instantané 27 oct. » et « base lue 29 oct. ») | Une ligne : « Données du 29 oct. 19h13 · instantané du lundi 27 oct. » ; alerte si source périmée | S | ★★ | oui | 378d1d3 |
| U07 | Débordement horizontal à 375 px (bloqués, capacité) | Lignes en cartes empilées sous 760 px | M | ★ | abandonné (Franck 30 oct. : pas de version mobile) | — |

## Vue Portefeuille

| ID | Constat | Proposition | Effort | Impact | Décision | Livré (page v46) |
|---|---|---|---|---|---|---|
| U08 | Chiffres divergents sans périmètre dit : tuile « 10 projets actifs » (projets) vs entonnoir « 12 Actif » (+ 2 runs) ; entonnoir « Terminé 0 » (90 j) vs « Terminés · 2 » (tous) ; MEP « 5 sur l'horizon » (depuis lundi) vs « 0 à venir » (depuis auj.) | Périmètre dans chaque libellé (« 12 actifs dont 2 runs », « terminés 90 j », « 5 MEP cette semaine et après, dont 0 à venir ») ; MEP passée encore « planifiée » signalée | S | ★★★ | oui | 2fa4cd3 |
| U09 | Tuiles et entonnoir non cliquables | Clic tuile / étape = filtre de la grille (alertes → lignes en alerte ; alerte « bloqués » → vue Sprint) | M | ★★ | oui | 784cf36 · b4d0428 |
| U10 | Noms tronqués (« L0 Plateform Génériq… »), nom complet au survol seulement | Colonne libellés élargie ou nom sur 2 lignes | S | ★★ | oui | fc585ec |
| U11 | Losanges de jours consécutifs superposés (Expert G1 : 26, 27, 28 oct.) ; le même jour est déjà fusionné | Fusion étendue aux jalons à ≤ 2 j d'écart (pastille « 3 », liste au survol) | M | ★ | oui | ef716cb |
| U12 | Alertes en paragraphes avec listes de 9 clés Jira | 1 ligne par alerte : type · item · action ; clés repliées | S | ★★ | oui | 5f8981f |
| U13 | Entonnoir en pied de page, loin des tuiles | Remonter sous les tuiles (ou le fusionner avec elles) | S | ★ | oui | 9eb18a4 |

## Vue Projet

| ID | Constat | Proposition | Effort | Impact | Décision | Livré (page v46) |
|---|---|---|---|---|---|---|
| U14 | Motif du rouge caché dans la ligne source grise | Bandeau en tête : santé + motif + prochaine action | S | ★★★ | oui | ac7f051 · b4d0428 |
| U15 | Gérer toujours ouvert pour le propriétaire : ⅓ de l'écran est un formulaire, sources et historique relégués dessous | Tiroir « Modifier » replié par défaut ; sources et historique dans la colonne lecture | M | ★★ | oui — bouton « Modifier » ouvrant une fenêtre modale | 0d7b682 · 6d3f17b · b4d0428 |
| U16 | Les sous-livraisons (enfants) ne sont pas listées dans la fiche | Bloc « Livraisons » : nom, santé, étape, lien | M | ★★★ | oui | fd872d3 |
| U17 | Étapes Idée → Terminé dessinées comme des onglets (affordance de clic trompeuse) | Stepper non cliquable (chevrons) | S | ★ | oui | b212a86 |

## Vue Sprint

| ID | Constat | Proposition | Effort | Impact | Décision | Livré (page v46) |
|---|---|---|---|---|---|---|
| U18 | Aucun repère de temps ni d'avancement du sprint | « J9 / 15 · 6 j restants » + % sous-tâches faites dans l'en-tête | S | ★★★ | oui | ad415c6 |
| U19 | Capacité en tableau brut ; surcharge invisible (ex. 20 sous-tâches pour 14,5 j dispo) | Barre « à faire + en cours » vs dispo par personne ; surbrillance au-delà de la médiane d'équipe | M | ★★ | gardé (Franck 30 oct.) | dc1b3a9 · 2acef46 |
| U20 | Couleurs des tuiles (or, vert) sans sens RAG alors que la couleur porte la santé ailleurs | Tuiles neutres ; couleur seulement si seuil franchi | S | ★ | oui | 5eaf040 |
| U21 | Actions de rétro non triées : « fait » en tête, « Rouvrir » au même poids que « Faite » | « À faire » en tête ; « fait » repliées ; « Rouvrir » en lien discret | S | ★★ | oui | 61ca0a5 |
| U22 | Bloqués : 9 lignes dont 4 sous-tâches (déjà indentées) | Sous-tâches repliées sous le parent (compteur) | S | ★ | oui | 172d7aa · e243e4d |

## Arbitrages pris sans Franck

| # | Arbitrage |
|---|---|
| A1 | Revue faite en vue propriétaire ; la vue visiteur hérite des mêmes constats sauf U15 |
| A2 | « depuis auj. » sur les bloqués non retenu : historique démarré aujourd'hui, se corrige seul |
| A3 | Capacité (U19) : seuil relatif à l'équipe, pas d'heures (règle produit Capacité) |
| A4 | Relecture au contexte neuf (code) : 7 constats corrigés, causes en annexe |
| A5 | U19 : seuil = 1,5 × la médiane de l'équipe (au-delà de la médiane seule, la moitié de l'équipe serait toujours signalée) ; 4 personnes sur 10 en S19 |
| A6 | U09 : un filtre liste des items ; la tuile compte des jalons ou des alertes → libellé du filtre « items portant… / rattachés à… » |
| A7 | U15 : fenêtre modale reste ouverte après un enregistrement (saisies en série) ; se ferme par Échap, ✕ ou le fond |
| A8 | U22 : en-tête « N (+ M sous-tâches) » ; l'alerte et le digest gardent le total des tickets bloqués (périmètre dit des deux côtés) |
| A9 | U18 : « jours ouvrés » du sprint = jours de semaine (comme Jira) ; fériés retirés seulement de la capacité |
| A10 | Filtre de tuile conservé d'une vue à l'autre (puce visible) ; remis à zéro en vue visiteur |

## Reste à faire

| # | Point |
|---|---|
| — | Aucun : U19 gardé (page v47), U07 abandonné, suites DOM sur horloge figée (1d67f18) |
