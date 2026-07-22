Tu dois enrichir les données de l'aérodrome **$ICAO** situé près de **$VILLE** (lat $LAT, lon $LON) et écrire le fichier final `tmp/$ICAO-airfield.json`.

**Contraintes** : tout le texte en français. Ne pas inventer d'information introuvable. Omettre les champs absents plutôt que mettre des valeurs fictives.

## Format de sortie

Lis d'abord `.claude/skills/populate-airfield/agents/schema.md` pour le format ProseMirror exact avant de rédiger la description.

## Étape 1 — Recherche

Effectue des recherches web sur les sources suivantes :
- Recherches : `"aérodrome $ICAO"`, `"aéroclub $VILLE"`, `"$ICAO airfield"`, Wikipedia `$ICAO`
- Sites spécifiques : ourairports.com, basulm.ffplum.fr, fr.airfield.directory

### Clubs basés — liste de référence (ne pas la deviner)

La liste des clubs basés sur l'aérodrome t'est fournie ci-dessous, extraite de la base `clubs.json` (source de vérité). **Ne pas la découvrir par recherche web** : partir de cette liste.

`$CLUBS`

- Inclure **tous** les clubs de cette liste dans le paragraphe technique, **chacun lié à son `website`** (nœud `link` en `marks`, cf. `schema.md`). Certains aérodromes ont plusieurs clubs.
- Le `name` est déjà celui de la base : le reprendre **verbatim** (ne pas reformuler).
- Les `website` de la base sont parfois en `http://` avec redirection : **vérifier chaque lien avec un User-Agent navigateur** (`curl -A "Mozilla/5.0" -IL <url>`) et retenir l'URL `https` **effective** (finale après redirection). Si un club n'a pas de `website` (valeur `None` ou chaîne vide), le citer sans lien.
- La recherche web ne sert plus qu'à **enrichir** le paragraphe (formations proposées, gestionnaire), **pas** à établir la liste des clubs.

Collecter les **notes de recherche** suivantes (usage interne uniquement, ne pas inclure dans le JSON final) :
- Infos clubs (enrichissement) : formations proposées → serviront à rédiger le paragraphe technique
- Infos gestionnaire : nom (**copié verbatim**), site web → servira à rédiger le paragraphe technique
- Notes localisation : altitude, paysage, distances aux villes proches
- Notes tourisme : patrimoine, points forts de la ville/région

Champs déjà présents dans la base (ne pas les inclure dans le fichier de sortie) : `$EXISTING_FIELDS`

Ne pas inclure dans la description d'informations sur les pistes et les fréquences.
Ne pas inclure d'information sur les carburants disponibles, sauf s'il y a une procédure d'accès particulière (eg. demander au club au préalable...)

Collecter les **champs de sortie** (seuls champs autorisés dans le JSON final, hors champs déjà présents) :
- `website` : site officiel de l'aérodrome ou du gestionnaire
- `toilet` : `"public"` | `"private"` | `"no"`
- `nightVFR` : `true` uniquement si explicitement confirmé
- `fuels` : liste parmi `"100LL"`, `"JETA1"`, `"SP98"`, `"UL91"` (SP95 = SP98)
- `image` : URL d'une photo de l'aérodrome — **Wikimedia Commons ou site officiel uniquement**. Vérifier que l'URL commence par `https://upload.wikimedia.org/` ou appartient au domaine officiel.
  - ⚠️ **Vérifier que l'URL renvoie 200 avant de l'émettre**, avec un User-Agent de navigateur (`curl -A "Mozilla/5.0" -I <url>`) — le User-Agent est obligatoire, sans lui Wikimedia et de nombreux CDN renvoient un 403 et une image valide serait écartée à tort. Si l'URL ne renvoie pas 200, **ne pas inclure d'image** : ne jamais fabriquer ni deviner une URL, ne pas construire un chemin `thumb`/hash à la main.
  - Pour une image Wikimedia, obtenir l'URL `upload.wikimedia.org` **réelle** via l'API Commons (`action=query&titles=File:...&prop=imageinfo&iiprop=url`) plutôt que de la reconstruire.

## Étape 2 — Rédiger et écrire le fichier

Le JSON final ne peut contenir **que ces clés** : `codeIcao`, `website`, `toilet`, `fuels`, `nightVFR`, `description`. Tout autre champ est interdit. Les champs listés dans `$EXISTING_FIELDS` sont déjà présents et doivent être omis du fichier de sortie.

```json
{
  "codeIcao": "$ICAO",
  "website": "https://...",
  "toilet": "public",
  "fuels": ["100LL"],
  "nightVFR": true,
  "description": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Paragraphe localisation (2-3 phrases)." }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "Paragraphe technique. Clubs basés : " },
          {
            "type": "text",
            "marks": [{ "type": "link", "attrs": { "href": "https://...", "target": "_blank", "rel": "noopener noreferrer nofollow", "class": null } }],
            "text": "Nom du club"
          },
          { "type": "text", "text": " — formations proposées." }
        ]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Paragraphe tourisme (2-3 phrases)." }]
      },
      {
        "type": "image",
        "attrs": { "src": "https://upload.wikimedia.org/...", "alt": "Description de la photo.", "title": null }
      }
    ]
  }
}
```

**Règles** :
- Omettre `website`, `toilet`, `fuels`, `nightVFR` si non trouvés
- Omettre le nœud `image` de la description si pas d'URL valide
- Les infos clubs/gestionnaire vont dans le texte des paragraphes, **pas comme clés JSON**
- Le nœud `image` n'a pas de clé `content`
- **Style factuel** : rédiger sobrement, sans superlatifs ni tournures promotionnelles (« incomparable », « les joies de… »). Employer le vocabulaire juste (une association de vol est « aéronautique », jamais « aviaire »).
- Le JSON doit être parseable

Écrire ce JSON dans `tmp/$ICAO-airfield.json`.
