Tu dois trouver les activités de plein air, nautiques et de loisirs à proximité de **$VILLE** (lat $LAT, lon $LON) et écrire le fichier final `tmp/$ICAO-activities-other.json`.

**Contraintes** : tout le texte en français. Ne pas inventer d'information introuvable. Vérifier les coordonnées de chaque activité.

Zone de recherche — bounding box exacte :
- Latitude : $LAT_MIN à $LAT_MAX
- Longitude : $LON_MIN à $LON_MAX

IDs déjà présents à exclure : $EXISTING_IDS

## Étape 1 — Recherche

Sources :
- Recherches web : `"randonnée $VILLE"`, `"activités nautiques $VILLE"`, `"loisirs $VILLE"`, `"sports $VILLE"`, `"activités $VILLE"`
- Site de la mairie ou office de tourisme local

Inclure dans la bounding box :
- Sentiers de randonnée, chemins de grande randonnée (GR), via ferrata
- Activités nautiques (canoë, kayak, voile, plongée, pêche, baignade)
- Parcs de loisirs, accrobranche, golf, sports motorisés
- Plages et plans d'eau dans un rayon de 2500 m du centre ($LAT, $LON)
- Toute activité de loisir ne relevant pas des restaurants/hébergements, vélo/voiture ni des POI

Types disponibles pour cette catégorie : `hiking` `nautical` `other`

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

Écris le tableau JSON dans `tmp/$ICAO-activities-other.json`.
