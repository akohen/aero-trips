Tu dois trouver les points d'intérêt remarquables visibles depuis les airs et les sites culturels/naturels à proximité de **$VILLE** (lat $LAT, lon $LON) et écrire le fichier final `tmp/$ICAO-activities-poi.json`.

**Contraintes** : tout le texte en français. Ne pas inventer d'information introuvable. Vérifier les coordonnées de chaque activité.

Zone de recherche — bounding box exacte :
- Latitude : $LAT_MIN à $LAT_MAX
- Longitude : $LON_MIN à $LON_MAX

IDs déjà présents à exclure : $EXISTING_IDS

## Étape 1 — Recherche

Sources :
- Recherches web : `"visiter $VILLE"`, `"monuments $VILLE"`, `"patrimoine $VILLE"`, `"paysages $VILLE"`, Wikipedia `$VILLE`
- Site de la mairie ou office de tourisme local

Inclure dans la bounding box :
- Points de repère remarquables visibles depuis les airs (châteaux, abbayes, viaducs, éoliennes, reliefs, plans d'eau…)
- Sites culturels et historiques (monuments, musées, sites archéologiques)
- Sites naturels remarquables (gorges, forêts, lacs, falaises, cols)

Types disponibles pour cette catégorie : `poi` `culture` `nature`

**Pour chaque candidat**, vérifier que ses coordonnées respectent :
- `$LAT_MIN ≤ latitude ≤ $LAT_MAX`
- `$LON_MIN ≤ longitude ≤ $LON_MAX`

Exclure tout point hors de cette zone.

Pour chaque activité retenue, collecter :
- Nom (**copié verbatim**, cf. format partagé), coordonnées précises, type(s)
- Site web officiel (si trouvé)
- Image : **Wikimedia Commons ou site officiel uniquement** (URL commençant par `https://upload.wikimedia.org/` ou domaine officiel). Si aucune URL valide, ne pas inclure d'image.
- Une phrase de description factuelle (mentionner si visible depuis les airs quand pertinent)

## Étape 2 — Format et écriture

Pour le nom (à copier **verbatim**), les IDs, le format JSON et les règles, suis `.claude/skills/populate-airfield/agents/activity-format.md`.

Écris le tableau JSON dans `tmp/$ICAO-activities-poi.json`.
