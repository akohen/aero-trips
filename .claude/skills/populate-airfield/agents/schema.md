# Format ProseMirror — référence partagée

Tous les champs `description` utilisent ce format. Le JSON doit être directement parseable.

## Nœud racine

```json
{ "type": "doc", "content": [ ...nœuds... ] }
```

## Nœuds de contenu

### Paragraphe

```json
{ "type": "paragraph", "content": [{ "type": "text", "text": "Texte ici." }] }
```

- Doit toujours avoir une clé `content` (tableau non vide).
- Ne jamais omettre `content` sur un `paragraph`.

### Image

```json
{ "type": "image", "attrs": { "src": "https://...", "alt": "Description.", "title": null } }
```

- Doit avoir `attrs` avec `src`, `alt`, `title` (null si absent).
- Ne **pas** ajouter de clé `content` sur un nœud `image`.

### Lien inline (dans un paragraphe)

Les liens s'écrivent comme texte avec `marks`, jamais comme nœud séparé :

```json
{
  "type": "text",
  "marks": [{
    "type": "link",
    "attrs": {
      "href": "https://...",
      "target": "_blank",
      "rel": "noopener noreferrer nofollow",
      "class": null
    }
  }],
  "text": "texte du lien"
}
```

## Règles de validation

| Règle | Correct | Incorrect |
|-------|---------|-----------|
| `paragraph` a `content` | ✓ | `{ "type": "paragraph" }` sans `content` |
| `image` a `attrs` sans `content` | ✓ | `{ "type": "image", "content": [...] }` |
| Liens dans `marks` | ✓ | Nœud `link` standalone |
| Texte brut dans `content` | `[{ "type": "text", "text": "..." }]` | `"content": "texte"` (string) |

## Règle stricte sur les URLs d'images

Seules deux sources sont acceptées :

1. **Wikimedia Commons** : URL commençant par `https://upload.wikimedia.org/`
2. **Site officiel vérifié** : domaine du site officiel de l'aérodrome ou de l'activité (ex. `https://www.aeroclub-xyz.fr/images/photo.jpg`)

**Rejeter** toute URL provenant de blogs, CDN tiers, réseaux sociaux, ou contenant des paramètres de type token (`?token=`, `?key=`, etc.).

Si aucune image valide n'est trouvée, omettre entièrement le nœud `image` — ne pas inventer d'URL.
