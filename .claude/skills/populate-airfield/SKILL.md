---
name: populate-airfield
description: Enrichir la base de données aero-trips pour un aérodrome donné : recherche web, description, clubs, et activités à proximité. Sert aussi à reprendre une session laissée en plan dans tmp/ (relecture en cours, import pas encore fait). Usage: /populate-airfield LFXX [airfield] [transport] [poi] [restaurants] [other]
argument-hint: Code ICAO de l'aérodrome (ex. LFBJ), suivi optionnellement des agents à lancer parmi : airfield, transport, poi, restaurants, other
---

Tu vas enrichir la base de données aero-trips pour l'aérodrome **$ARGUMENTS**.

**Contraintes** : ne jamais modifier `codeIcao`, `name`, `status`, `position`, `runways`. N'ajouter
que les champs absents. Tout le texte en français.

Les étapes mécaniques sont des scripts, dans `.claude/skills/populate-airfield/scripts/`. Ils
s'exécutent **depuis la racine du repo** et prennent le code ICAO en argument. Ne pas réécrire leur
logique dans le chat : les lancer, lire leur sortie.

⚠️ **Commencer par le § « Avant tout » ci-dessous** : si l'aérodrome a déjà des fichiers dans
`tmp/`, le parcours n'est pas celui d'un démarrage à neuf.

## Périmètre de recherche

| Catégorie | Types | Rayon autour du point de référence |
|---|---|---|
| `transport` | `bike` `car` `transit` | **2,5 km** — doit être atteignable depuis le terrain |
| `restaurants` | `food` `lodging` | **2,5 km** |
| `poi` | `poi` `culture` `nature` | **5 km** — un point de repère se voit du ciel de loin |
| `other` | `hiking` `nautical` `other` `aero` | **5 km** |

⚠️ Le point de référence est la position **AIP** de l'aérodrome. Elle peut se trouver à ~1 km du
parking avions et de l'entrée pilotes : un restaurant collé au parking peut ressortir à plusieurs
centaines de mètres du point AIP. Le rayon est donc un **filtre de pertinence, pas un couperet** —
`validate.py` applique 1 km de tolérance avant de signaler, et la relecture tranche.

## Avant tout — reprise d'une session existante ?

**Première chose à faire, avant l'Étape 0** : regarder si des fichiers `tmp/$ICAO-*` existent déjà.

```bash
ls tmp/$ICAO-* 2>/dev/null
```

S'il y en a (session interrompue, relecture en cours, import pas encore fait), **ne pas exécuter les
Étapes 0 à 2** — elles relanceraient les agents et pourraient écraser un travail de relecture.
Reprendre avec :

```bash
python3 .claude/skills/populate-airfield/scripts/resume.py $ICAO
```

Le script est non destructif par construction : inventaire daté de ce qui existe, régénération du
contexte et de l'aperçu, validation, et rappel des étapes restantes. C'est le **seul point d'entrée
sûr** sur une session déjà entamée.

**Pourquoi un point d'entrée dédié** — deux commandes détruiraient le travail de relecture :

- `context.py` supprime les sorties des agents qu'il s'apprête à relancer, y compris une fiche
  aérodrome retouchée à la main ;
- `merge.py` reconstruit le fichier fusionné depuis les fichiers d'agents, **faisant réapparaître
  les activités écartées en relecture** (cas vécu sur LFMA : 19 → 20, une piscine supprimée revenue).

Les deux refusent désormais d'agir quand le fichier fusionné **diverge** des fichiers d'agents —
signe qu'une relecture a eu lieu. `--force` passe outre, à n'utiliser que pour repartir de zéro.

Une fois la relecture terminée, **le fichier fusionné `tmp/$ICAO-activities.json` fait foi** et les
fichiers d'agents sont périmés.

## Étape 0 — Contexte

Parser d'abord `$ARGUMENTS` : le **premier mot** est le code ICAO, les **suivants** (s'il y en a)
sont les agents à lancer parmi `airfield`, `transport`, `poi`, `restaurants`, `other`. Si aucun
n'est spécifié, lancer **tous** les agents. Passer cette liste au script :

```bash
# tous les agents
python3 .claude/skills/populate-airfield/scripts/context.py $ICAO
# ou une sélection
python3 .claude/skills/populate-airfield/scripts/context.py $ICAO poi transport
```

⚠️ Le script **supprime les fichiers de sortie des agents qu'il s'apprête à relancer** (et affiche
ce qu'il supprime). C'est volontaire : un fichier resté d'un run précédent serait sinon
silencieusement réintégré par `merge.py` alors qu'aucun agent ne l'a produit cette fois-ci. Les
fichiers des **autres** catégories sont conservés, ce qui permet de relancer une seule catégorie
sans perdre les autres. `--no-clean` désactive ce nettoyage.

Produit `tmp/$ICAO-context.json` et affiche tout ce dont les agents ont besoin :

- **VILLE** — issue du point 1 « Situation / Location » de la **carte VAC** (dernière page, bloc
  « Informations diverses »), qui donne la ville notable de rattachement, pas toujours la commune
  d'implantation (LFPZ → *Versailles*, alors que `name` vaut « SAINT CYR L'ECOLE »). C'est le nom à
  employer dans les recherches web. Sans carte VAC publiée (militaire, privé, fermé → 404), le
  script retombe sur `titleCase(name)` et le signale : **vérifier alors la ville à la main**, une
  requête sur un nom d'aérodrome en majuscules ne donne rien de bon.
- Centre AIP, bounding box, rayons par catégorie
- `EXISTING_FIELDS` — champs déjà présents sur la fiche, à omettre du fichier de sortie
- **`CLUBS`** — clubs basés (**liste de référence**, ne pas la deviner par recherche web), issus de
  **deux sources fusionnées**, chacune sachant ce que l'autre ignore :
  - le point **ACB** de la VAC, qui liste **toutes** les disciplines présentes sur le terrain —
    avion, planeur, ULM, parachutisme, modélisme, associations locales — là où un annuaire fédéral
    n'en couvre qu'une, et qui donne téléphone et courriel ;
  - `scripts/clubs.json`, tenu à la main, qui porte des noms déjà relus et des sites. Sur un club
    commun, sa valeur l'emporte champ par champ ; le reste complète.

  Chaque club affiche `[source]`. Trois choses à savoir :
  - le nom VAC est **recomposé** pour la recherche web : « ACB » est le libellé du point, donc le
    nom arrive amputé (`de Pérouges` → **`Aéroclub de Pérouges`**). Le fragment d'origine est
    affiché à côté. Ce nom sert à **chercher**, pas à être recopié : retenir celui du site du club ;
  - le `website` est le plus souvent absent de la VAC, mais **elle en donne parfois un** (LFOO,
    LFIR, LFNH) : il est alors repris tel quel, **non vérifié** — le passer à `check_url.py` comme
    n'importe quel autre lien. `(à chercher)` veut dire qu'aucune source n'en a ;
  - `(aucun club nommé)` signifie que la VAC dit `NIL` ou « Divers de la région parisienne » : là,
    et seulement là, établir la liste par recherche web. Un `⚠` signale une extraction non fiable
    (point à cheval sur deux pages) → lire la carte VAC à la main.
- `EXISTING_ACTIVITIES` — activités déjà en base dans la zone, à ne pas recréer
- **`night_vfr`** — point 3 de la VAC (« VFR de nuit / Night VFR »), qui **fait autorité**. Le
  script dit quoi faire : `proposer` (le champ est absent en base → l'écrire), `conflit` (la base
  contredit la VAC → **ne rien écrire**, signaler à l'utilisateur, il tranche), `aucune` (déjà
  conforme, ou VAC non concluante comme « Voir Aides lumineuses »).
- **`fuels`** — point 10 de la VAC (AVT). **Purement additif** : la section AVT est parfois
  incomplète (mesuré : sur 20 aérodromes, 18 identiques à la base, 1 ajout réel, 1 où la VAC
  omettait un carburant pourtant présent). Écrire `union`, ne **jamais** retirer un carburant.

## Étapes 1 & 2 — Recherche en parallèle

Lancer **en parallèle** (un seul message, tous les Agent tool calls ensemble) les agents
sélectionnés :

| Agent | Fiche de tâche | Fichier de sortie |
|---|---|---|
| Airfield | `prompts/airfield.md` | `tmp/$ICAO-airfield.json` |
| Transport | `prompts/activities-transport.md` | `tmp/$ICAO-activities-transport.json` |
| POI | `prompts/activities-poi.md` | `tmp/$ICAO-activities-poi.json` |
| Restaurants | `prompts/activities-restaurants.md` | `tmp/$ICAO-activities-restaurants.json` |
| Autres | `prompts/activities-other.md` | `tmp/$ICAO-activities-other.json` |

### Comment appeler chaque agent

| Paramètre | Valeur |
|---|---|
| `subagent_type` | **`general-purpose`** |
| `model` | **`sonnet`** |
| `prompt` | les trois lignes ci-dessous |

```
Tu es l'agent « POI » pour l'aérodrome LFBJ.
Lis .claude/skills/populate-airfield/prompts/activities-poi.md et applique-le intégralement.
Ton contexte est dans tmp/LFBJ-context.json.
```

**`subagent_type: general-purpose`** : c'est le seul type intégré qui dispose à la fois de la
recherche web et de l'écriture de fichiers. Ne **pas** utiliser `Explore`, qui est en lecture seule
— l'agent ne pourrait pas écrire son fichier de sortie.

**Outils requis** — l'agent échoue ou sous-livre silencieusement s'il en manque un :

| Outil | Usage |
|---|---|
| `Read` | sa fiche de prompt et `tmp/<ICAO>-context.json` |
| `WebSearch`, `WebFetch` | la recherche proprement dite |
| `Bash` | `python3 scripts/check_url.py` (vérification HTTP des images et des liens de clubs) et l'API Commons |
| `Write` | son fichier `tmp/<ICAO>-*.json` |

Les fiches font vérifier les URLs par `scripts/check_url.py` plutôt que par `curl` : le script
choisit le bon User-Agent selon l'hôte (Wikimedia rate-limite les UA de navigateur, les CDN
bloquent les UA non-navigateur), et `Bash(python3:*)` est déjà autorisé dans
`.claude/settings.local.json` — donc aucune permission supplémentaire à accorder.

**`model: sonnet`** (et non `haiku`) : la tâche enchaîne recherche web, API Commons, vérification
HTTP avec le bon User-Agent et recoupement de coordonnées. Mesuré sur haiku : 23 activités sur 28
sans image, 3 des 6 URLs produites fabriquées (404), plus des reformulations de noms, des
anglicismes et des coordonnées fausses de plusieurs km. Les contrôles de l'Étape 3 existent en
grande partie pour rattraper ces défauts.

⚠️ Contrepartie d'un modèle plus capable : la tentation de **reformuler les noms** augmente. La
règle verbatim (`prompts/activity-format.md` § Nom) est stricte et `validate.py` la contrôle —
un nom reformulé est une régression, pas une amélioration.

Attendre la fin de tous les agents avant de continuer.

## Étape 2.5 — Fusion des activités

```bash
python3 .claude/skills/populate-airfield/scripts/merge.py $ICAO
```

Fusionne `tmp/$ICAO-activities-*.json` → `tmp/$ICAO-activities.json`. Refuse de s'exécuter si le
fichier fusionné porte déjà des décisions de relecture (cf. § « Avant tout »).

- Les doublons **entre agents** sont écartés (rapprochement nom + position : les `id` portent un
  suffixe aléatoire, et à un même point coexistent des services distincts — une navette n'est pas
  une location de voiture).
- Les doublons avec **la base** sont seulement **signalés** : le rapprochement par nom reste
  heuristique, et écarter à tort coûte plus cher que signaler. La relecture tranche.

Relayer les doublons signalés à l'utilisateur.

## Étape 2.6 — Backfill des images manquantes

Les agents sous-livrent les images (cas mesurés : 9 sur 28, 23 sur 28). `validate.py` affiche le
compte `N/M activité(s) sans image`. Si ce compte est notable, relancer une passe ciblée.

Lancer **en parallèle** un mini-agent par activité sans image — mêmes `subagent_type` et `model`
qu'à l'Étape 1 (`general-purpose` / `sonnet` : trouver une image est exactement ce que haiku rate)
— avec nom, ville, position, site web éventuel, et ce prompt :

> Cherche une image pour l'activité "<NOM>" (<type, ville, site officiel, position>).
> Applique `.claude/skills/populate-airfield/prompts/activity-format.md` § Image : règle de
> provenance, vérification HTTP 200, et **User-Agent adapté à l'hôte** (descriptif pour Wikimedia,
> navigateur ailleurs — le tableau est dans la fiche).
> Si image valide trouvée, réponds **uniquement** avec ce JSON :
> `{ "src": "https://...", "alt": "Description factuelle courte." }`
> Sinon réponds exactement : `AUCUNE IMAGE TROUVÉE`.

Réintégrer chaque image en **tête** de la description (nœud `image`, cf. `prompts/schema.md` :
`attrs` avec `src`/`alt`/`title:null`, pas de clé `content`). Les images passeront le même contrôle
HTTP que les autres à l'Étape 3.

## Étape 2.7 — (à la demande) Rejoindre le centre-ville

**Ne pas exécuter d'office.** Nécessite `tmp/$ICAO-airfield.json` et `tmp/$ICAO-activities.json`.

**Pourquoi ici** : l'agent airfield tourne en parallèle des agents d'activités ; à ce moment les
`id` d'activités n'existent pas encore. Le lien aérodrome → fiche n'est possible qu'après la fusion.

1. Repérer dans `tmp/$ICAO-activities.json` les activités de mobilité (`transit`, `bike`, `car`).
2. Enrichir le paragraphe technique de `tmp/$ICAO-airfield.json` d'un passage « rejoindre le
   centre-ville » : distance a/d → centre, puis liens vers les fiches. Chaque lien est un nœud
   `text` avec un `mark` `link` (cf. `prompts/schema.md`), `href` en chemin racine
   `/activities/{id}` (route `/activities/:activityId`, cf. `src/App.tsx`). Vérifier que chaque
   `{id}` existe dans le fichier d'activités.
3. **N'affirmer un service de liaison** navette/taxi depuis/vers l'aérodrome que s'il est **attesté**
   par la description de l'activité ; sinon s'en tenir aux moyens disponibles en ville sans
   prétendre qu'ils desservent le terrain.
4. Reprendre l'Étape 3 puis régénérer l'aperçu (Étape 4).

## Étape 3 — Validation

```bash
python3 .claude/skills/populate-airfield/scripts/validate.py $ICAO
```

Le script contrôle ce qui est **mécanique** et sort en code 1 s'il trouve quelque chose :

- structure ProseMirror (`paragraph` avec `content`, `image` sans `content`, liens en `marks`),
  clés autorisées côté aérodrome (`codeIcao`, `website`, `toilet`, `fuels`, `nightVFR`,
  `description` — toute autre clé est une erreur), types d'activité connus ;
- **noms d'activités** : suffixe accolé (`"… (Gordes)"`, `"… — Carpentras"`) ou qualificatif
  promotionnel, signes d'une reformulation — le `name` se recopie verbatim ;
- images : **réponse HTTP** avec le bon User-Agent par hôte, URL à token, agrégateur. La provenance
  est classée `OK` / `REJET` / `À JUGER` — `À JUGER` renvoie au jugement humain, la règle étant
  celle d'`prompts/activity-format.md` § Image ;
- distances au point AIP, comparées au rayon de la catégorie (tolérance 1 km).

Une image ≠ 200 se corrige en retrouvant l'URL réelle (API Commons pour Wikimedia) ou, à défaut, en
retirant le nœud `image`. Une activité hors rayon est le plus souvent une **coordonnée fausse** —
une erreur de plusieurs km reste possible à l'intérieur de la bounding box.

Relire ensuite à la main ce qu'aucun script ne peut juger :

- **Noms verbatim** : le script signale les cas évidents, mais lui seul ne voit pas une
  reformulation « propre » (traduction, casse normalisée, « Restaurant » ajouté devant l'enseigne).
  Recouper avec la source quand un nom paraît trop lisse.
- **Descriptions factuelles** (activités **et** aérodrome) : traquer superlatifs et tournures
  fleuries (« incomparable », « les joies de… ») et les impropriétés (« institution *aviaire* » pour
  « aéronautique »).
- **Relecture FR** : anglicismes et artefacts de traduction laissés par les agents (cas vécus :
  « Bistro *characteristic* », « *dynamic* »).
- **Clubs** : tous les clubs de `$CLUBS` figurent dans la description, chacun lié à son site (URL
  `https` effective après redirection), et aucun club inventé.

## Étape 4 — Aperçu web

```bash
python3 .claude/skills/populate-airfield/scripts/preview.py $ICAO
```

Génère `tmp/$ICAO-preview.html` : fiches rendues, carte Leaflet (aérodrome + activités numérotées),
et badges d'alerte (hors rayon, doublon possible avec la base, sans image).

Indiquer à l'utilisateur d'ouvrir le fichier (`open tmp/$ICAO-preview.html`), de **cocher** les
activités à supprimer / améliorer, puis de **coller le bloc généré** dans le chat.

## Étape 5 — Retours de relecture (en boucle)

Ne se déclenche **que si l'utilisateur colle un bloc de retours** :

```
SUPPRIMER: id-1, id-2
AMÉLIORER:
- id-3 : note explicative
```

Les deux sections sont indépendantes.

**`SUPPRIMER`** :

```bash
python3 .claude/skills/populate-airfield/scripts/prune.py $ICAO id-1 id-2
```

Le script retire les activités du fichier fusionné **et** des fichiers d'agents d'origine — sans
quoi une nouvelle fusion les ferait réapparaître.

**`AMÉLIORER`** — pour chaque `id` et sa note :
- **correctif direct** (reformuler, corriger une coordonnée, un nom, un `type`) : éditer l'entrée ;
- **correctif nécessitant une recherche** (trouver une image, confirmer un fait, vérifier un lien
  avec l'aérodrome) : relancer un mini-agent sur cette seule activité, avec la note comme consigne
  et les règles d'`prompts/activity-format.md`, puis réintégrer le résultat.
- Ne jamais modifier `codeIcao`, `name`, `status`, `position` d'un aérodrome.

Puis **réexécuter `validate.py` et `preview.py`** et réafficher le chemin de l'aperçu pour un
nouveau tour. Répéter tant que l'utilisateur renvoie des retours.

## Étape 6 — Import en base (à proposer, jamais d'office)

Une fois les données validées, **proposer** l'import dans Firestore. L'outil est `npm run import`
(`scripts/import-data.ts`, cible **production**) : écriture en **merge** (les champs absents ne sont
pas supprimés), diff colorisé avant application. Le suffixe du fichier détermine la collection :
`*airfield.json` → `airfields`, `*activities.json` → `activities`.

```bash
# Dry-run : affiche le diff puis demande confirmation
npm run import -- --import tmp/$ICAO-airfield.json tmp/$ICAO-activities.json

# Appliquer sans prompt, après relecture du diff
npm run import -- --import tmp/$ICAO-airfield.json tmp/$ICAO-activities.json --apply
```

Prérequis : `serviceAccountKey.json` à la racine. Après un import réussi, rappeler de régénérer le
snapshot bundlé avec `npm run export`.
