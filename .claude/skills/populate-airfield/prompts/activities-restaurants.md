Tu dois trouver les restaurants et hébergements autour de l'aérodrome **<ICAO>** et écrire le fichier final `tmp/<ICAO>-activities-restaurants.json`.

**Contraintes** : tout le texte en français. Ne pas inventer d'information introuvable. Vérifier les coordonnées de chaque activité.

## Contexte — à lire en premier

Ta tâche te donne le **code ICAO**. Lis **`tmp/<ICAO>-context.json`** (produit par l'Étape 0) : il
fait foi pour tout ce qui suit.

| Champ | Usage |
|---|---|
| `city` | **la** ville à employer dans les recherches web — issue du point 1 de la carte VAC, souvent différente du nom de l'aérodrome |
| `latitude` / `longitude` | point de référence AIP |
| `bbox` | cadrage large : `lat_min`, `lat_max`, `lon_min`, `lon_max` |
| `existing_activities` | activités déjà en base dans la zone — **ne pas les recréer** |

Ci-dessous, `{city}` désigne la valeur du champ `city`, `<ICAO>` le code ICAO.

Zone de recherche :
- **Bounding box** (cadrage large) — le champ `bbox` du contexte
- **Rayon de pertinence** : 2,5 km autour du point de référence (`latitude`/`longitude` du contexte). Un candidat hors
  de ce rayon n'est **pas** retenu, même s'il tombe dans la bounding box.

⚠️ Le point de référence est la position **AIP** de l'aérodrome, qui peut se trouver jusqu'à ~1 km
du parking avions et de l'entrée pilotes. Un lieu mesuré à un peu plus de 2,5 km peut donc être
à portée de marche réelle : au-delà du rayon, retenir uniquement si la proximité du parking est
manifeste, et le signaler dans la description.

## Étape 1 — Recherche

Sources :
- **Pistes** : `airfield_restaurants` puis `osm.restaurants` de `tmp/<ICAO>-sources.json` — commencer par elles (cf. `activity-format.md` § Pistes). Un restaurant d'aérodrome confirmé ouvert est la piste la plus précieuse pour un pilote.
- Recherches web : `"restaurants {city}"`, `"hôtels {city}"`, `"hébergement {city}"`, `"camping {city}"`, `"chambre d'hôtes {city}"`
- Site de la mairie ou office de tourisme local

À retenir :
- Restaurants, brasseries, auberges (préférer les établissements bien notés ou typiques de la région)
- Hôtels, gîtes, chambres d'hôtes, auberges de jeunesse
- Campings et aires de camping-car

Types disponibles pour cette catégorie : `food` `lodging`

**Pour chaque candidat**, vérifier que ses coordonnées tombent dans la bounding box **et** à moins
de 2,5 km du point de référence. Exclure tout point hors de cette zone.

Pour chaque activité retenue, collecter :
- Nom (**copié verbatim**, cf. format partagé), coordonnées précises, type(s)
- Site web officiel (si trouvé)
- Image : chercher activement une illustration en suivant `activity-format.md` § Image (règle unique de provenance). Omettre le nœud `image` plutôt que d'émettre une URL non vérifiée.
- Une phrase de description factuelle

## Étape 2 — Format et écriture

Pour le nom (à copier **verbatim**), les IDs, le format JSON et les règles, suis `.claude/skills/populate-airfield/prompts/activity-format.md`.

Écris le tableau JSON dans `tmp/<ICAO>-activities-restaurants.json`.
