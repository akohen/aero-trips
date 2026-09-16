# Format de sortie des activités — référence partagée

Lis d'abord `.claude/skills/populate-airfield/prompts/schema.md` pour le format ProseMirror exact avant de rédiger les descriptions.

## Nom — à copier verbatim

**Le `name` est une citation, pas une rédaction.** C'est la règle la plus facile à enfreindre sans
s'en rendre compte : plus le rédacteur est capable, plus la tentation d'« améliorer » le nom est
forte. Un nom retouché casse la recherche sur le site et ne correspond plus à l'enseigne que le
pilote verra sur place.

Copier le nom **exactement** tel qu'il apparaît sur la source officielle (site officiel, Wikipédia,
office de tourisme) :

- Ne pas reformuler, traduire, abréger ni « corriger » la casse.
- Ne pas **désambiguïser** : pas d'ajout de ville, de région ni de précision entre parenthèses ou
  après un tiret — écrire `"Abbaye de Sénanque"`, jamais `"Abbaye de Sénanque (Gordes)"` ni
  `"Abbaye de Sénanque — Gordes"`. Deux lieux homonymes restent homonymes ; leur position les
  distingue.
- Ne pas **qualifier** : aucun adjectif qui ne figure pas dans le nom d'origine
  (« incontournable », « célèbre », « magnifique », « typique »…).
- Ne pas **normaliser** : conserver accents, ponctuation, esperluettes, majuscules internes et
  fautes apparentes de l'enseigne (`"Le Vin' Quatre"`, `"Ludik for rêveurs"` restent tels quels).
- Ne pas **compléter** : si l'enseigne est « Chez Marie », le nom est `"Chez Marie"`, pas
  `"Restaurant Chez Marie"`.

En cas de doute entre deux graphies, retenir celle du **site officiel du lieu**, à défaut celle de
Wikipédia. Le contrôle de l'Étape 3 relit les noms : un ajout accolé ou un qualificatif y est traité
comme une erreur à corriger.

## Coordonnées — depuis une source cartographiable

- Reprendre les coordonnées d'une source **cartographiable** (OpenStreetMap, coordonnées Wikipédia du lieu), **jamais** une estimation « au jugé ».
- Vérifier que le point tombe bien sur le lieu nommé : une commune, un port ou un terminal peut être à plusieurs km de ce que le nom évoque. Une coordonnée fausse peut rester **dans la bounding box** — la cohérence lieu↔coordonnée prime sur la seule appartenance à la zone.

## Description — une phrase factuelle (+ lien éventuel avec l'aérodrome)

- **Une seule** phrase factuelle et vérifiable par défaut.
- Pas de langage promotionnel ni de superlatifs (« incontournable », « magnifique », « célèbre »…).
- Ne rien inventer : toute information absente des sources est omise.
- **Lien avec l'aérodrome** : si un service relie explicitement l'activité à l'aérodrome — livraison de vélos sur la plateforme, navette depuis/vers l'aérodrome, retrait à l'arrivée, prise en charge des pilotes, service à l'aéro-club… — le **mentionner** (une brève seconde phrase est alors admise). N'affirmer un tel lien que s'il est **attesté par la source**, jamais par supposition.
- **Horaires et périodes d'ouverture** : si la source mentionne des horaires d'ouverture ou une période d'ouverture/fermeture saisonnière (ex. « ouvert d'avril à septembre », « fermé en décembre », « fermé le lundi »), le **préciser** dans la description (une brève phrase supplémentaire est alors admise). Ne reporter que ce qui est **attesté par la source**, sans l'inventer ni l'extrapoler.

## Image — chercher activement une illustration

**Cette section est la règle unique de provenance des images du skill** — pour les activités
**comme** pour la description de l'aérodrome. `schema.md`, les fiches de prompts et `validate.py`
y renvoient et ne la redéfinissent pas.

Viser **une image par activité** quand une source valide existe (sur une session mesurée, 3 activités
sur 29 seulement en avaient une — c'est trop peu).

Le vrai critère est la **provenance / les droits**, pas le nom de l'hébergeur : les images seront
**recopiées sur le serveur de l'application**, donc reproduire une œuvre — le droit d'auteur
s'applique après copie. Chercher dans cet ordre :

1. **Wikimedia Commons** — licence explicite, à préférer. Quasi systématique pour monuments,
   châteaux, plages, sites naturels, gares, communes. Copier l'URL de fichier
   `https://upload.wikimedia.org/...` (pas l'URL de page `commons.wikimedia.org/wiki/...`).
2. **Image du sujet lui-même**, quel que soit l'hébergeur — c'est **sa propre photo**, les droits
   sont présumés acceptables pour un annuaire qui le met en avant. Cela inclut : son site officiel
   (`/wp-content/…`, balise `og:image`), un **CDN de CMS** qui héberge son site (`wixstatic.com`,
   `squarespace-cdn.com`, `cdn.shopify.com`…), le **domaine de sa maison-mère/enseigne**
   (ex. `capfun.com` pour un camping Capfun), sa propre fiche Google Business.

**À exclure** :
- **Photos de tiers / agrégateurs** dont la provenance est douteuse : avis TripAdvisor/Booking,
  uploads d'utilisateurs sur Google Maps, banques d'images non licenciées. En cas de doute sur qui
  possède la photo, **omettre**.
- **URLs à token / signature** (paramètre de type `?X-Amz-…`, `&token=`, hash temporaire) : non pour
  l'hébergeur, mais parce qu'elles risquent d'expirer (404) avant même la copie sur le serveur.

⚠️ Nuance sur `googleusercontent.com` : acceptable **si** c'est manifestement la photo du sujet sur
sa fiche Google Business ; à écarter si c'est une photo de contributeur anonyme dont on ne peut pas
établir l'origine.

`validate.py` ne tranche **que** le mécanique (réponse HTTP, URL à token, agrégateur connu) et
classe le reste en `À JUGER` : la question « cette photo appartient-elle au sujet ? » se règle ici,
à la rédaction, pas au contrôle.

### Vérifier l'URL avant de l'émettre

**Vérifier que chaque URL renvoie 200 AVANT de l'émettre** (règle valable pour **toutes** les
sources, pas seulement Wikimedia). Si l'URL ne renvoie pas 200, **omettre le nœud `image`** : ne
jamais fabriquer, deviner ou reconstruire une URL (pas de chemin `thumb`/hash bricolé). Les images
sont recontrôlées en HTTP à l'étape de validation — mais l'agent ne doit pas s'en remettre au filet :
il n'émet que des URLs qu'il a lui-même vérifiées.

**Vérifier avec ce script, pas avec `curl`** :

```bash
python3 .claude/skills/populate-airfield/scripts/check_url.py <url> [<url>...]
```

Il répond `200 OK <url>` ou `<code> ÉCHEC <url>`, et sort en code 1 si une URL échoue. Ne retenir
que les URLs qu'il déclare `200 OK`.

Pourquoi ce script plutôt que `curl` : **l'User-Agent à utiliser dépend de l'hôte**, et se tromper
fait passer une image valide pour cassée. Wikimedia rate-limite (**429**) les UA de navigateur
génériques et veut un UA descriptif ; les CDN de sites font l'inverse et bloquent (**403**) les UA
non-navigateur. Le script choisit le bon UA par hôte, espace les requêtes et réessaie sur 429 — trois
pièges de moins. Il suit aussi les redirections et affiche l'URL finale.

Pour une image Wikimedia, obtenir l'URL `upload.wikimedia.org` **réelle** via l'API Commons
(`action=query&titles=File:...&prop=imageinfo&iiprop=url`) plutôt que de la reconstruire — c'est le
moyen d'éviter les 404 sur chemins fabriqués.

## Générer les IDs

Pour chaque activité : `slug(nom)` + `-` + 7 caractères aléatoires a-z0-9

Slug = nom en minuscules, sans accents (é→e, à→a, ç→c, etc.), espaces et apostrophes → tirets, caractères spéciaux supprimés.

Exemple : `"Abbaye de Sénanque"` → `"abbaye-de-senanque-x4k2p9q"`

## Format JSON de chaque activité

```json
{
  "id": "nom-de-lactivite-x4k2p9q",
  "name": "Nom de l'activité",
  "type": ["poi", "culture"],
  "position": { "latitude": 0.00000, "longitude": 0.00000 },
  "website": "https://...",
  "description": {
    "type": "doc",
    "content": [
      {
        "type": "image",
        "attrs": { "src": "https://upload.wikimedia.org/...", "alt": "Description de la photo.", "title": null }
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Une phrase de description factuelle." }]
      }
    ]
  }
}
```

## Règles

- Utiliser les valeurs de `type` **autorisées pour ta catégorie** (voir ta tâche).
- Omettre `website` si non trouvé.
- Omettre le nœud `image` si aucune URL valide au sens du § Image ci-dessus.
- Le nœud `image` n'a **pas** de clé `content`.
- Chaque `paragraph` a une clé `content`.
- Le JSON doit être parseable.
- Si aucune activité trouvée, écrire un tableau vide `[]`.

Écris le tableau JSON dans le fichier de sortie indiqué dans ta tâche.
