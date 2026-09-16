Tu dois trouver les activités de plein air, nautiques et de loisirs autour de l'aérodrome **<ICAO>** et écrire le fichier final `tmp/<ICAO>-activities-other.json`.

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
- **Rayon de pertinence** : 5 km autour du point de référence (`latitude`/`longitude` du contexte). Un candidat hors
  de ce rayon n'est **pas** retenu, même s'il tombe dans la bounding box.

⚠️ Le point de référence est la position **AIP** de l'aérodrome, qui peut se trouver jusqu'à ~1 km
du parking avions et de l'entrée pilotes. Un lieu mesuré à un peu plus de 5 km peut donc être
à portée de marche réelle : au-delà du rayon, retenir uniquement si la proximité du parking est
manifeste, et le signaler dans la description.

## Étape 1 — Recherche

Sources :
- Recherches web : `"randonnée {city}"`, `"activités nautiques {city}"`, `"loisirs {city}"`, `"sports {city}"`, `"activités {city}"`
- Site de la mairie ou office de tourisme local

À retenir :
- Sentiers de randonnée, chemins de grande randonnée (GR), via ferrata
- Activités nautiques (canoë, kayak, voile, plongée, pêche, baignade)
- Parcs de loisirs, accrobranche, golf, sports motorisés
- Plages et plans d'eau
- Activités et lieux **aéronautiques** (type `aero`) : musée de l'air, collection d'avions,
  baptêmes de l'air, école de parachutisme, planeur, ULM, montgolfière — hors aéro-clubs basés,
  qui sont décrits dans la fiche de l'aérodrome et non comme activités
- Toute activité de loisir ne relevant pas des restaurants/hébergements, vélo/voiture ni des POI

Types disponibles pour cette catégorie : `hiking` `nautical` `other` `aero`

**Pour chaque candidat**, vérifier que ses coordonnées tombent dans la bounding box **et** à moins
de 5 km du point de référence. Exclure tout point hors de cette zone.

Pour chaque activité retenue, collecter :
- Nom (**copié verbatim**, cf. format partagé), coordonnées précises, type(s)
- Site web officiel (si trouvé)
- Image : chercher activement une illustration en suivant `activity-format.md` § Image (règle unique de provenance). Omettre le nœud `image` plutôt que d'émettre une URL non vérifiée.
- Une phrase de description factuelle

## Étape 2 — Format et écriture

Pour le nom (à copier **verbatim**), les IDs, le format JSON et les règles, suis `.claude/skills/populate-airfield/prompts/activity-format.md`.

Écris le tableau JSON dans `tmp/<ICAO>-activities-other.json`.
