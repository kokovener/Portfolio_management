# Portefeuille PLQ — sauvegarde

Copie générée par `tools/backup_github.js` (date dans le message de commit). Ne pas modifier ici : la source fait foi.

| Dossier | Contenu | Fichiers |
|---|---|---|
| `code/` | Fichiers suivis du dépôt local `Projets_Dev/Portefeuille_PLQ` (hors `dist/`) | 34 |
| `docs/` | Dossier projet OneDrive `Portefeuille_PLQ` | 53 |

## Pseudonymisation

| Règle | Effet |
|---|---|
| Personnes | Nom complet et identifiant `team.*` remplacés par `Personne_NN` (table locale, jamais publiée) |
| Adresses | Toute adresse `@lait.qc.ca` remplacée par une adresse `@exemple.test` |
| Exclus | `dist/` (exports et preuves de run), départs d'équipe, fichiers non texte |
| Contrôle | Le push est refusé si un nom, une adresse ou un secret subsiste |
| Nom seul | Remplacé s'il a 4 lettres ou plus et commence par une majuscule |
| Limite connue | Les prénoms seuls ne sont pas remplacés ; le propriétaire du dépôt est conservé |

Aucun fichier non texte ignoré.
