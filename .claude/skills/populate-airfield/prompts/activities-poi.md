Tu dois trouver les points d'intérêt remarquables visibles depuis les airs et les sites culturels/naturels autour de l'aérodrome **<ICAO>** et écrire le fichier final `tmp/<ICAO>-activities-poi.json`.

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
- **Rayon de pertinence**, autour du point de référence (`latitude`/`longitude` du contexte) :
  - type `poi` (repère **vu du ciel**) : **50 km**. Ce qui intéresse en vol est le plus souvent bien
    au-delà de la portée à pied : un littoral, un château, un viaduc, une île. Ne retenir à cette
    distance que ce qui se **repère effectivement en vol** — un menhir ou une chapelle, non ;
  - types `culture` et `nature` (lieux **qui se visitent** depuis le terrain) : **5 km**.
  Un site à la fois visitable et remarquable du ciel dans les 5 km prend les deux types.

⚠️ Le point de référence est la position **AIP** de l'aérodrome, qui peut se trouver jusqu'à ~1 km
du parking avions et de l'entrée pilotes. Un lieu mesuré à un peu plus de 5 km peut donc être
à portée de marche réelle : au-delà du rayon, retenir uniquement si la proximité du parking est
manifeste, et le signaler dans la description.

## Étape 1 — Recherche

Sources :
- **Pistes** : `poifrance` (repères vus du ciel, jusqu'à 50 km) et `osm.poi` (à pied) de `tmp/<ICAO>-sources.json` — commencer par elles (cf. `activity-format.md` § Pistes)
- Recherches web : `"visiter {city}"`, `"monuments {city}"`, `"patrimoine {city}"`, `"paysages {city}"`, Wikipedia `{city}`
- Site de la mairie ou office de tourisme local

À retenir :
- Points de repère remarquables visibles depuis les airs (châteaux, abbayes, viaducs, éoliennes, reliefs, plans d'eau…)
- Sites culturels et historiques (monuments, musées, sites archéologiques)
- Sites naturels remarquables (gorges, forêts, lacs, falaises, cols)

Types disponibles pour cette catégorie : `poi` `culture` `nature`

**Pour chaque candidat**, vérifier que ses coordonnées tombent dans le rayon de son type (50 km pour
`poi`, 5 km pour `culture`/`nature`). Au-delà de la bounding box, seul le type `poi` est possible.

Pour chaque activité retenue, collecter :
- Nom (**copié verbatim**, cf. format partagé), coordonnées précises, type(s)
- Site web officiel (si trouvé)
- Image : chercher activement une illustration en suivant `activity-format.md` § Image (règle unique de provenance). Omettre le nœud `image` plutôt que d'émettre une URL non vérifiée.
- Une phrase de description factuelle. Ne **pas** ajouter de formule du type « bien visible depuis
  les airs » : le type `poi` le dit déjà, et la formule répétée sur chaque fiche sonne creux. Ne
  décrire l'aspect vu du ciel que s'il apporte une information concrète (forme, couleur, repère
  pour s'orienter).

## Étape 2 — Format et écriture

Pour le nom (à copier **verbatim**), les IDs, le format JSON et les règles, suis `.claude/skills/populate-airfield/prompts/activity-format.md`.

Écris le tableau JSON dans `tmp/<ICAO>-activities-poi.json`.
