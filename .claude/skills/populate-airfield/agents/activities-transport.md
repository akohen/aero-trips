Tu dois trouver les services de mobilité (vélo, voiture, transport) à proximité de **$VILLE** (lat $LAT, lon $LON) et écrire le fichier final `tmp/$ICAO-activities-transport.json`.

**Contraintes** : tout le texte en français. Ne pas inventer d'information introuvable. Vérifier les coordonnées de chaque activité.

Zone de recherche — bounding box exacte :
- Latitude : $LAT_MIN à $LAT_MAX
- Longitude : $LON_MIN à $LON_MAX

IDs déjà présents à exclure : $EXISTING_IDS

## Étape 1 — Recherche

Sources :
- Recherches web : `"location vélo $VILLE"`, `"location voiture $VILLE"`, `"gare $VILLE"`, `"navette $VILLE"`, `"taxi $VILLE"`
- Site de la mairie ou office de tourisme local

Inclure uniquement les services de mobilité dans un rayon de 2500 m du centre ($LAT, $LON) :
- Locations de vélo (vélos classiques, VTT, vélos électriques). Ne pas inclure de magasins qui proposent uniquement de la vente ou entretien de vélo, sans proposer de location. Faire particulièrement attention aux possibilités de livraison des vélos.
- Locations de voiture
- Gares SNCF ou routières
- Navettes, taxis, services de transport local

Types disponibles pour cette catégorie : `bike` `car` `transit`

**Pour chaque candidat**, vérifier que ses coordonnées respectent :
- `$LAT_MIN ≤ latitude ≤ $LAT_MAX`
- `$LON_MIN ≤ longitude ≤ $LON_MAX`

Exclure tout point hors de cette zone.

Pour chaque activité retenue, collecter :
- Nom (**copié verbatim**, cf. format partagé), coordonnées précises, type(s)
- Site web officiel (si trouvé)
- Image : **Wikimedia Commons ou site officiel uniquement** (URL commençant par `https://upload.wikimedia.org/` ou domaine officiel). Si aucune URL valide, ne pas inclure d'image.
- Une phrase de description factuelle

## Étape 2 — Format et écriture

Pour le nom (à copier **verbatim**), les IDs, le format JSON et les règles, suis `.claude/skills/populate-airfield/agents/activity-format.md`.

Écris le tableau JSON dans `tmp/$ICAO-activities-transport.json`.
