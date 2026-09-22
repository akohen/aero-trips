Tu dois rédiger la fiche **centre-ville** de la ville de référence de l'aérodrome **<ICAO>** et écrire
le fichier final `tmp/<ICAO>-activities-city.json` (un tableau d'**au plus une** activité).

**Contraintes** : tout le texte en français. Ne pas inventer d'information introuvable.

## Pourquoi cette fiche

La ville de la carte VAC est souvent à plusieurs km du terrain, hors de portée des autres agents.
Pour un pilote, elle compte pourtant — à condition de pouvoir s'y rendre. Une **seule** fiche la
présente dans son ensemble : ce qu'on y trouve, et comment y aller depuis le terrain. Elle **ne
liste pas** ses restaurants, hôtels et sites un par un : une grande ville touristique en compterait
des dizaines (LFRD : Dinard à 5 km, Saint-Malo à 8 km).

## Contexte — à lire en premier

Lis **`tmp/<ICAO>-context.json`** et **`tmp/<ICAO>-sources.json`**.

| Champ | Usage |
|---|---|
| `city_center` | la commune : `name` (nom officiel), `latitude`/`longitude` (**mairie**), `distance_km` au terrain, `population`, `confidence` ; `existing` = activités déjà en base à moins de 1 km de la mairie, ou qui portent son nom avec « centre » ou « ville » |
| `city_center.reason` | présent si la commune n'a pas pu être située — voir plus bas |
| `situation.raw` | la ligne VAC, ex. « 5 km SSW Dinard (35 - Ille et Vilaine) » |
| `latitude` / `longitude` | position AIP du terrain |
| `osm.transport` (sources) | arrêts proches du terrain avec les lignes qui les desservent (`lines`), gares, locations |

## Étape 1 — Faut-il une fiche ?

**Ne rien écrire** (tableau vide `[]`) et dire pourquoi en fin de réponse si :

- `city_center.existing` contient déjà une fiche de la ville (« Centre-ville de … », « Dinard -
  Centre », « Bergerac - Vieille Ville ») — ne pas la recréer. Si elle est maigre, le signaler en fin
  de réponse avec ce que tu proposes d'y ajouter : l'enrichir est une décision de relecture ;
- la ville n'offre rien à un pilote de passage : ni restaurant, ni hébergement, ni site, ni location ;
- elle est à **plus de 5 km** du terrain et **aucun transport en commun** ne la relie au terrain
  (ligne de bus ou de car, train, navette). Un taxi seul ne suffit pas : à cette distance, sans
  transport en commun, la ville n'est pas une destination à pied depuis l'avion.

Si `city_center.confidence` vaut `à vérifier`, confirmer d'abord que la commune retenue est bien la
ville de la VAC. Si `city_center.reason` est présent (commune fusionnée, station qui n'est pas une
commune, faute de frappe dans la VAC), retrouver la commune et la position de sa mairie par
recherche web, et le signaler en fin de réponse.

## Étape 2 — Recherche

- Site de l'office de tourisme et de la mairie ; Wikipédia `{city}`.
- **Liaison terrain → centre-ville** : partir de `osm.transport` (l'arrêt le plus proche du terrain
  et ses lignes), puis vérifier sur le site du réseau : la ligne mène-t-elle au centre ? nom de
  l'arrêt de descente, durée, fréquence, **saisonnalité** (ligne d'été, pas de service le
  dimanche…). Ne rien affirmer de non attesté.

## Étape 3 — La fiche

| Champ | Valeur |
|---|---|
| `name` | **`Centre-ville de {city_center.name}`** (« Centre-ville de Dinard »), convention des fiches déjà en base — le nom de la commune verbatim, sans département |
| `position` | `city_center.latitude` / `longitude`, **inchangés** — c'est à cette position que `validate.py` reconnaît la fiche |
| `type` | ce que la ville offre **effectivement** : `food`, `lodging`, `culture`, `nature`, `nautical`, `hiking`, `bike`, `car`, `transit`… Chaque type doit être justifié par la description |
| `website` | site de l'office de tourisme, à défaut celui de la mairie |

Description — **exception** à la règle d'une phrase d'`activity-format.md` : trois courts
paragraphes, dans cet ordre, puis l'image.

1. **La ville** (2 à 3 phrases factuelles) : ce qu'elle est, ce qu'on y visite.
2. **Se restaurer, se loger** : les **genres** d'établissements, **sans les nommer** — « Restaurants
   de fruits de mer et crêperies autour du port ; hôtels, chambres d'hôtes et campings. »
3. **Depuis l'aérodrome** : distance, puis le moyen d'y aller — ligne, arrêt de montée le plus
   proche du terrain, arrêt de descente, durée, saisonnalité ; taxi ; à pied ou à vélo si c'est
   raisonnable. Uniquement ce qui est attesté.

Image : une photo de la ville (Wikimedia Commons de préférence), selon `activity-format.md` § Image.

**Ce qui reste des fiches à part** (produites par les autres agents, pas par toi) : ce qui est à
portée de marche du terrain, et les services propres aux pilotes — location de vélos livrés au
terrain, location de voiture, gare. Ta fiche peut les mentionner en termes généraux.

## Format

Pour l'ID, le format JSON et le style, suis `.claude/skills/populate-airfield/prompts/activity-format.md`
(§ Nom : « Centre-ville de » + le nom de la commune ; § Description : remplacée par les trois
paragraphes ci-dessus).

Écris le tableau JSON dans `tmp/<ICAO>-activities-city.json`.
