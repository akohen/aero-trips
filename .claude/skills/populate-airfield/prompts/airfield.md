Tu dois enrichir les données de l'aérodrome **<ICAO>** et écrire le fichier final
`tmp/<ICAO>-airfield.json`.

## Contexte — à lire en premier

Ta tâche te donne le **code ICAO**. Lis **`tmp/<ICAO>-context.json`** (produit par l'Étape 0) : il
fait foi pour tout ce qui suit.

| Champ | Usage |
|---|---|
| `city` | ville de référence (point 1 de la carte VAC) — à employer dans les recherches et pour situer le terrain ; souvent différente du nom de l'aérodrome |
| `situation.raw` | la ligne VAC complète, ex. « 4 km WNW Versailles (78 - Yvelines). » |
| `airfield_name_display` | nom de l'aérodrome en casse normale |
| `latitude` / `longitude` | position AIP |
| `existing_fields` | champs déjà présents sur la fiche — **à omettre** du fichier de sortie |
| `clubs` | clubs basés — **liste de référence** (point ACB de la VAC, ou `clubs.json`) ; voir plus bas |
| `clubs_info` | d'où vient la liste (`source`), la ligne ACB brute (`raw`) et les réserves éventuelles (`note`) |
| `night_vfr` | ce qu'il faut faire du champ `nightVFR` (voir plus bas) |
| `fuels` | ce qu'il faut faire du champ `fuels` (voir plus bas) |

Ci-dessous, `{city}` désigne la valeur du champ `city`, `<ICAO>` le code ICAO.

**Contraintes** : tout le texte en français. Ne pas inventer d'information introuvable. Omettre les champs absents plutôt que mettre des valeurs fictives.

## Format de sortie

Lis d'abord `.claude/skills/populate-airfield/prompts/schema.md` (format ProseMirror) et
`.claude/skills/populate-airfield/prompts/activity-format.md` § Image (règle de provenance des
images) avant de rédiger la description.

## Étape 1 — Recherche

Effectue des recherches web sur les sources suivantes :
- Recherches : `"aérodrome <ICAO>"`, `"aéroclub {city}"`, `"<ICAO> airfield"`, Wikipedia `<ICAO>`
- Sites spécifiques : ourairports.com, basulm.ffplum.fr, fr.airfield.directory

### Clubs basés — liste de référence (ne pas la deviner)

La liste des clubs basés sur l'aérodrome t'est fournie dans le champ `clubs` du contexte. Elle
vient du point **ACB** de la carte VAC, ou de `clubs.json` quand ce fichier connaît le terrain
(`clubs_info.source` dit lequel). **Ne pas la découvrir par recherche web** : partir de cette liste.

- Inclure **tous** les clubs de cette liste dans le paragraphe technique, **chacun lié à son
  `website`** (nœud `link` en `marks`, cf. `schema.md`). Certains aérodromes ont plusieurs clubs, et
  l'AIP recense toutes les disciplines (avion, planeur, ULM, parachutisme…).
- **Le `name` est un nom de recherche, pas un verbatim.** « ACB » étant le libellé du point de la
  VAC, le nom y arrive amputé et le script le recompose (`de Pérouges` → `Aéroclub de Pérouges`) ;
  `name_vac` montre le fragment d'origine. Chercher le club avec ce nom, puis retenir **le nom que
  le club se donne sur son propre site**. C'est la seule exception à la règle verbatim : elle ne
  vaut que pour les clubs issus de la VAC (`clubs_info.source == "VAC"`), jamais pour les activités.
- **`website` vaut `None` sur les clubs issus de la VAC** : l'AIP ne publie pas de site. C'est à la
  recherche web de le trouver. Pour ceux de `clubs.json`, le site est parfois en `http://` avec
  redirection.
- Dans les deux cas, **vérifier chaque lien** avec
  `python3 .claude/skills/populate-airfield/scripts/check_url.py <url>`, qui suit les redirections et
  affiche l'URL finale — retenir cette URL `https` **effective**. Sans site trouvé, citer le club
  sans lien. `phone` et `email` du contexte aident à confirmer qu'un site trouvé est bien le bon.
- Si la liste est **vide** (la VAC dit `NIL` ou « Divers de la région parisienne »), ou si le
  contexte affiche un `⚠` d'extraction non fiable : là, et seulement là, établir la liste par
  recherche web, et **signaler en fin de réponse** qu'elle ne vient pas de la VAC.
- La recherche web ne sert sinon qu'à **enrichir** le paragraphe (formations proposées, gestionnaire)
  et à trouver les sites, **pas** à établir la liste des clubs.

Collecter les **notes de recherche** suivantes (usage interne uniquement, ne pas inclure dans le JSON final) :
- Infos clubs (enrichissement) : formations proposées → serviront à rédiger le paragraphe technique
- Infos gestionnaire : nom (**copié verbatim**), site web → servira à rédiger le paragraphe technique
- Notes localisation : altitude, paysage, distances aux villes proches
- Notes tourisme : patrimoine, points forts de la ville/région

Champs déjà présents dans la base (ne pas les inclure dans le fichier de sortie) : champ `existing_fields` du contexte.

Ne pas inclure dans la description d'informations sur les pistes et les fréquences.
Ne pas inclure d'information sur les carburants disponibles, sauf s'il y a une procédure d'accès particulière (eg. demander au club au préalable...)

Collecter les **champs de sortie** (seuls champs autorisés dans le JSON final, hors champs déjà présents) :
- `website` : site officiel de l'aérodrome ou du gestionnaire
- `toilet` : `"public"` | `"private"` | `"no"`
- `nightVFR` : **ne pas chercher sur le web** — suivre `night_vfr` du contexte, qui vient du point 3
  de la carte VAC :
  - `action: "proposer"` → écrire `nightVFR` à la valeur indiquée ;
  - `action: "conflit"` → **ne rien écrire** : la base contredit la VAC. Omettre le champ et
    **signaler le conflit** en fin de réponse pour que l'utilisateur tranche ;
  - `action: "aucune"` → omettre le champ.
- `fuels` : liste parmi `"100LL"`, `"JETA1"`, `"SP98"`, `"UL91"` (SP95 = SP98). Suivre `fuels` du
  contexte, issu du point 10 (AVT) de la carte VAC :
  - si `added` est non vide → écrire `fuels` = la valeur `union` du contexte ;
  - sinon → **omettre** le champ.
  - ⚠️ **Purement additif** : la section AVT est parfois incomplète, donc ne **jamais** retirer un
    carburant déjà présent en base, même absent de la VAC.
- `image` : URL d'une photo de l'aérodrome. La règle de provenance, la vérification HTTP et le choix
  du User-Agent sont décrits dans `.claude/skills/populate-airfield/prompts/activity-format.md`
  § Image — **règle unique**, elle vaut aussi pour l'aérodrome. À défaut d'URL vérifiée : pas d'image.

## Étape 2 — Rédiger et écrire le fichier

Le JSON final ne peut contenir **que ces clés** : `codeIcao`, `website`, `toilet`, `fuels`, `nightVFR`, `description`. Tout autre champ est interdit. Les champs listés dans `existing_fields` sont déjà présents et doivent être omis du fichier de sortie.

```json
{
  "codeIcao": "<ICAO>",
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
- Omettre `website` et `toilet` si non trouvés ; pour `fuels` et `nightVFR`, suivre le contexte VAC ci-dessus
- Omettre le nœud `image` de la description si pas d'URL valide
- Les infos clubs/gestionnaire vont dans le texte des paragraphes, **pas comme clés JSON**
- Le nœud `image` n'a pas de clé `content`
- **Style factuel** : rédiger sobrement, sans superlatifs ni tournures promotionnelles (« incomparable », « les joies de… »). Employer le vocabulaire juste (une association de vol est « aéronautique », jamais « aviaire »).
- Le JSON doit être parseable

Écrire ce JSON dans `tmp/<ICAO>-airfield.json`.
