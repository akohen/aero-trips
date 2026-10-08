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
| `night_vfr` | contrôle du VFR de nuit : base vs VAC — **ne jamais écrire** `nightVFR` (voir plus bas) |
| `fuels` | ce qu'il faut faire du champ `fuels` (voir plus bas) |
| `webcams.existing` | webcams déjà en base — n'en proposer que de **nouvelles** (voir plus bas) |
| `landing_fee` | taxe en base (`current`), fiche déjà relue dans `scripts/fees.json` (`sheet`) et ce qu'il faut faire (`action`) — voir § Taxe d'atterrissage |

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
- Webcams : `"webcam <ICAO>"`, `"webcam aérodrome {city}"`, et la page webcam / météo des sites
  de clubs (voir `webcams` plus bas)
- Taxe d'atterrissage, selon `landing_fee.action` : `"redevances aéroport {city}"`, `"guide des
  redevances <ICAO>"`, `"tarifs aéronautiques {city}"`, la page « pilotes » / « aviation générale » du
  site de l'aérodrome ou du gestionnaire, et les `airfield_facts` des notes de l'éclaireur

### Taxe d'atterrissage — fichier à part, jamais dans la fiche

`landingFee` est calculé par une fonction à partir de rapports : **ne jamais l'écrire** dans
`tmp/<ICAO>-airfield.json`, et **ne pas parler de la taxe dans la description** (ni montant, ni
« gratuit ») — elle s'affiche déjà sur la fiche, avec sa source et sa date. Suivre `landing_fee.action` :

- **`rien`** : ne pas chercher.
- **`vérifier`** : une fiche est déjà relue (`landing_fee.sheet`). Ne proposer une entrée que pour une
  **édition plus récente** (`validFrom` postérieur) ou une erreur manifeste, en le disant en fin de réponse.
- **`chercher`** : trouver la **grille tarifaire de l'exploitant** (guide des redevances, délibération
  municipale, page tarifs de l'aéroclub gestionnaire), ou une page officielle (exploitant, mairie, club
  basé) qui dit qu'il n'y a **pas de taxe**. Les tarifs aeroPS, les forums, les cartes communautaires et
  les avis de pilotes ne suffisent pas : ils sont déjà importés à part. Rien d'officiel → pas de fichier.

**Cas de référence** (celui de toutes les fiches) : avion léger **visiteur** (non basé), **MTOW
1,15 t** (C172S / DR400-180), **un atterrissage**, tarif standard **sans réduction**, **TTC**, frais et
assistance **obligatoires inclus**. Pièges vus : grilles **HT** presque partout (TVA 20 % → `ht` +
`vat: 0.2`, `amount` = TTC) ; ligne « basés » au lieu de « visiteurs » ; tranches de masse (prendre
celle qui couvre 1,15 t ; « arrondie à la tonne supérieure » → la tranche 2 t, le dire en `note`) ;
forfaits incluant le stationnement (`parkingIncludedHours`) ; assistance obligatoire facturée à part
(à **ajouter** au montant). Réductions (FFA, club), frais évitables (sans PPR, hors horaires,
paiement) et tarifs saisonniers vont dans `note`, pas dans le montant. « Gratuit si avitaillement » ou
« si repas » n'est **pas** gratuit : pas de fichier, ou le tarif normal avec la condition en `note`.

Écrire **`tmp/<ICAO>-fee.json`** (au format d'une entrée de `scripts/fees.json`) :

```json
{
  "codeIcao": "<ICAO>",
  "amount": 12.6,
  "ht": 10.5,
  "vat": 0.2,
  "parking24h": 8.4,
  "note": "Tranche 1 t à 1,999 t. Stationnement : 2 h gratuites puis par 24 h. FFA −50 %.",
  "url": "https://exemple.fr/guide-des-redevances-2026.pdf",
  "pageUrl": "https://exemple.fr/espace-pilotes",
  "validFrom": "2026-03-01",
  "checkedAt": "2026-10-08"
}
```

- Obligatoires : `amount` (TTC, `0` = gratuit), `url` (le document ou la page qui donne le tarif,
  `https` effective via `check_url.py`), `validFrom` (date d'entrée en vigueur écrite sur la grille ;
  à défaut, la date de la page, sinon celle du jour) et `checkedAt` (aujourd'hui), au format AAAA-MM-JJ.
- Facultatifs : `ht` + `vat` quand la source est HT ; `parking24h` (une nuit / 24 h, TTC) ;
  `parkingIncludedHours` ; `note` (courte, en français) ; `pageUrl` (page **stable** qui liste la
  dernière grille : les PDF changent d'URL à chaque édition).
- Gratuit : `{"codeIcao": "<ICAO>", "amount": 0, "note": "Pas de taxe d'atterrissage pour les
  avions de passage, d'après le site de l'aéroclub.", "url": "https://…", "validFrom": "…",
  "checkedAt": "…"}`.
- Le **dire en fin de réponse** : montant retenu, ligne de la grille, et ce qui reste douteux.

### Clubs basés — liste de référence (ne pas la deviner)

La liste des clubs basés sur l'aérodrome t'est fournie dans le champ `clubs` du contexte. Elle
fusionne **deux sources** — le point **ACB** de la carte VAC et le fichier `clubs.json` quand il
existe — dont chaque club porte la trace dans son champ `source` (`clubs_info.sources` récapitule).
**Ne pas la découvrir par recherche web** : partir de cette liste.

**Notes de l'éclaireur** — si `tmp/<ICAO>-club-notes.json` existe (agent `clubs`, lancé avant toi), il a déjà cherché et
vérifié le site de chaque club : reprendre ses `clubs[].website` et `clubs[].name` (le nom que le
club se donne) sans refaire la recherche. Ses `airfield_facts` (vélos ou voiture du club, taxi,
restaurant, carburant, accueil des visiteurs) vont dans le paragraphe technique — sauf la **taxe
d'atterrissage**, qui sert au fichier de taxe (§ Taxe d'atterrissage) et jamais à la description, **reformulés et
datés s'ils sont anciens** (« le club indiquait en 2019… ») — ou écartés s'ils semblent périmés.
Ses `webcams` sont des candidates pour le champ `webcams` : les reprendre (sans `source` ni `note`)
après les contrôles ci-dessous.

⚠️ Pour les clubs venus de la VAC, la liste est un **découpage automatique** du point ACB, dont la
mise en forme varie d'une carte à l'autre : un horaire, un libellé ou une note peut s'y retrouver
pris pour un nom de club (« sauf MAR / except TUE », « Piste / RWY »), ou un club absorbé par le
précédent. **Le texte brut `clubs_info.raw` fait foi** : le relire, et corriger le découpage d'après
lui — écarter un faux club, ajouter un club manqué, rattacher un numéro au bon club.

- Inclure **tous** les clubs de cette liste dans le paragraphe technique, **chacun lié à son
  `website`** (nœud `link` en `marks`, cf. `schema.md`). Certains aérodromes ont plusieurs clubs, et
  l'AIP recense toutes les disciplines (avion, planeur, ULM, parachutisme…).
- **Le `name` est un nom de recherche, pas un verbatim.** « ACB » étant le libellé du point de la
  VAC, le nom y arrive amputé et le script le recompose (`de Pérouges` → `Aéroclub de Pérouges`) ;
  `name_vac` montre le fragment d'origine. Chercher le club avec ce nom, puis retenir **le nom que
  le club se donne sur son propre site**. C'est la seule exception à la règle verbatim : elle ne
  vaut que pour les clubs dont le `source` mentionne la VAC, jamais pour les activités. Un club
  venu de `clubs.json` porte en revanche un nom déjà relu : le reprendre **verbatim**.
- **`website` est rempli quand une des deux sources le connaît**, sinon il vaut `None` et c'est à
  la recherche web de le trouver. La VAC en publie rarement, mais cela arrive (LFOO, LFIR, LFNH) :
  cette URL est reprise **telle quelle et non vérifiée** — un domaine nu y est simplement préfixé
  en `https://`, ce qui peut être faux. Les sites de `clubs.json` sont parfois en `http://` avec
  redirection.
- Dans tous les cas, **vérifier chaque lien** avec
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

Ne pas inclure dans la description d'informations sur les pistes et les fréquences, ni sur la taxe
d'atterrissage (elle va dans `tmp/<ICAO>-fee.json`, voir plus haut).
Ne pas inclure d'information sur les carburants disponibles, sauf s'il y a une procédure d'accès particulière (eg. demander au club au préalable...)

Collecter les **champs de sortie** (seuls champs autorisés dans le JSON final, hors champs déjà présents) :
- `website` : site officiel de l'aérodrome ou du gestionnaire
- `toilet` : `"public"` | `"private"` | `"no"`
- `nightVFR` : **ne jamais l'écrire**, il vient de la liste SIA des aérodromes agréés VFR de nuit
  (`scripts/NVFR.json`, synchronisée par `npm run import -- --nvfr`). Si `night_vfr.action` vaut
  `"signaler"`, la base diverge du point 3 de la VAC : **le signaler en fin de réponse** avec la
  ligne VAC (`raw`), l'utilisateur tranche.
- `fuels` : liste parmi `"100LL"`, `"JETA1"`, `"SP98"`, `"UL91"` (SP95 = SP98). Suivre `fuels` du
  contexte, issu du point 10 (AVT) de la carte VAC :
  - si `added` est non vide → écrire `fuels` = la valeur `union` du contexte ;
  - sinon → **omettre** le champ.
  - ⚠️ **Purement additif** : la section AVT est parfois incomplète, donc ne **jamais** retirer un
    carburant déjà présent en base, même absent de la VAC.
- `image` : URL d'une photo de l'aérodrome. La règle de provenance, la vérification HTTP et le choix
  du User-Agent sont décrits dans `.claude/skills/populate-airfield/prompts/activity-format.md`
  § Image — **règle unique**, elle vaut aussi pour l'aérodrome. À défaut d'URL vérifiée : pas d'image ;
  une URL trouvée mais non contrôlable (429, réseau) va dans une clé de premier niveau
  `image_candidates` (même format que pour les activités), reprise à l'Étape 2.6.

- `webcams` : caméras qui montrent le terrain (piste, parking, manche à air), **nouvelles
  uniquement** — le champ est additif, l'import les ajoute à `webcams.existing`. Une entrée :
  - `url` (obligatoire) : la page publique de la caméra, `https` effective via `check_url.py` ;
  - `image` (facultatif) : l'URL **directe** de l'image (`src` de la balise `<img>` de la page),
    **`https` uniquement** et répondant 200 avec `check_url.py`. C'est elle qui donne l'aperçu sur
    le site : pas d'`image` pour un flux vidéo, un lecteur intégré (iframe) ou une image `http://` —
    l'entrée reste alors un simple lien ;
  - `label` (facultatif) : seulement quand il y en a plusieurs (« Piste 29 », « Parking »).
  - ⚠️ **Jamais** d'URL portant des identifiants (`usr=`, `pwd=`, `user:pass@`) — certaines caméras
    IP sont publiées ainsi : les omettre et **le signaler en fin de réponse**.
  - **Jamais** de caméra `cam-aero.eu` : elles sont synchronisées par `npm run import -- --webcams`.
  - Pas de caméra de ville ou de station sans vue sur le terrain.
  - Aucune nouvelle webcam trouvée → omettre le champ.

## Étape 2 — Rédiger et écrire le fichier

Le JSON final ne peut contenir **que ces clés** : `codeIcao`, `website`, `toilet`, `fuels`, `webcams`, `description`. Tout autre champ est interdit. Les champs listés dans `existing_fields` sont déjà présents et doivent être omis du fichier de sortie.

```json
{
  "codeIcao": "<ICAO>",
  "website": "https://...",
  "toilet": "public",
  "fuels": ["100LL"],
  "webcams": [
    { "url": "https://aeroclub-exemple.fr/webcam", "image": "https://aeroclub-exemple.fr/webcam/piste.jpg" }
  ],
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
- Omettre `website`, `toilet` et `webcams` si non trouvés ; pour `fuels`, suivre le contexte VAC ci-dessus
- Omettre le nœud `image` de la description si pas d'URL valide
- Les infos clubs/gestionnaire vont dans le texte des paragraphes, **pas comme clés JSON**
- Le nœud `image` n'a pas de clé `content`
- **Style factuel** : rédiger sobrement, sans superlatifs ni tournures promotionnelles (« incomparable », « les joies de… »). Employer le vocabulaire juste (une association de vol est « aéronautique », jamais « aviaire »).
- Le JSON doit être parseable

Écrire ce JSON dans `tmp/<ICAO>-airfield.json` — et, s'il y a lieu, la taxe dans
`tmp/<ICAO>-fee.json` (§ Taxe d'atterrissage).
