---
name: populate-airfield
description: Enrichir la base de données aero-trips pour un aérodrome donné : recherche web, description, clubs, et activités à moins de 5 km. Usage: /populate-airfield LFXX [airfield] [transport] [poi] [restaurants] [other]
argument-hint: Code ICAO de l'aérodrome (ex. LFBJ), suivi optionnellement des agents à lancer parmi : airfield, transport, poi, restaurants, other
---

Tu vas enrichir la base de données aero-trips pour l'aérodrome **$ARGUMENTS**.

**Contraintes** : ne jamais modifier `codeIcao`, `name`, `status`, `position`, `runways`. N'ajouter que les champs absents. Tout le texte en français.

## Étape 0 — Parsing des arguments + données existantes + bounding box

Les arguments sont : `$ARGUMENTS`

- Le **premier mot** est le code ICAO (ex. `LFBJ`)
- Les **mots suivants** (s'il y en a) sont les agents à lancer parmi : `airfield`, `transport`, `poi`, `restaurants`, `other`
- Si aucun agent n'est spécifié, lancer **tous les agents** (comportement par défaut)

Extraire le code ICAO et la liste des agents à lancer. Mémoriser : ICAO, RUN_AIRFIELD, RUN_BIKE_CAR, RUN_POI, RUN_RESTAURANTS, RUN_OTHER (booléens).

Exécuter ce script Python (remplacer `$ICAO` par le code ICAO extrait) pour extraire toutes les valeurs nécessaires :

```python
import json, math
with open('src/data/airfields.json') as f:
    data = json.load(f)
entry = next(a for a in data['airfields'] if a.get('codeIcao') == '$ICAO')
lat = entry['position']['latitude']
lon = entry['position']['longitude']
lat_min, lat_max = lat - 0.05, lat + 0.05
lon_delta = 0.05 / math.cos(lat * math.pi / 180)
lon_min, lon_max = lon - lon_delta, lon + lon_delta

with open('src/data/activities.json') as f:
    acts = json.load(f)['activities']  # activities.json = { updated_at, activities: [...] }
existing_ids = [a['id'] for a in acts if lat_min <= a['position']['latitude'] <= lat_max and lon_min <= a['position']['longitude'] <= lon_max]

# Champs déjà présents dans l'entrée (à exclure du fichier de sortie)
protected = {'codeIcao', 'name', 'status', 'position', 'runways'}
existing_fields = [k for k in entry if k not in protected]

print(f"VILLE={entry['name']}, LAT={lat}, LON={lon}")
print(f"LAT_MIN={lat_min:.5f}, LAT_MAX={lat_max:.5f}, LON_MIN={lon_min:.5f}, LON_MAX={lon_max:.5f}")
print(f"EXISTING_IDS={existing_ids}")
print(f"EXISTING_FIELDS={existing_fields}")
```

Noter : LAT, LON, VILLE, LAT_MIN, LAT_MAX, LON_MIN, LON_MAX, EXISTING_IDS, EXISTING_FIELDS.

Lire les fichiers agents nécessaires selon les agents sélectionnés :
- Si RUN_AIRFIELD : `.claude/skills/populate-airfield/agents/airfield.md`
- Si RUN_BIKE_CAR : `.claude/skills/populate-airfield/agents/activities-transport.md`
- Si RUN_POI : `.claude/skills/populate-airfield/agents/activities-poi.md`
- Si RUN_RESTAURANTS : `.claude/skills/populate-airfield/agents/activities-restaurants.md`
- Si RUN_OTHER : `.claude/skills/populate-airfield/agents/activities-other.md`

Dans chaque fichier lu, remplacer toutes les variables (`$ICAO`, `$VILLE`, `$LAT`, `$LON`, `$LAT_MIN`, `$LAT_MAX`, `$LON_MIN`, `$LON_MAX`, `$EXISTING_IDS`, `$EXISTING_FIELDS`) par leurs valeurs.

## Étapes 1 & 2 — Recherche en parallèle

Lancer **en parallèle** (un seul message, tous les Agent tool calls ensemble) uniquement les agents sélectionnés, tous avec le modèle haiku :

| Agent | Condition | Prompt | Fichier de sortie |
|---|---|---|---|
| Airfield | RUN_AIRFIELD | contenu substitué de `airfield.md` | `tmp/$ICAO-airfield.json` |
| Bike & Car | RUN_BIKE_CAR | contenu substitué de `activities-transport.md` | `tmp/$ICAO-activities-transport.json` |
| POI | RUN_POI | contenu substitué de `activities-poi.md` | `tmp/$ICAO-activities-poi.json` |
| Restaurants | RUN_RESTAURANTS | contenu substitué de `activities-restaurants.md` | `tmp/$ICAO-activities-restaurants.json` |
| Autres | RUN_OTHER | contenu substitué de `activities-other.md` | `tmp/$ICAO-activities-other.json` |

Attendre la fin de tous les agents avant de passer à l'étape suivante.

## Étape 2.5 — Fusion des fichiers d'activités

Si au moins un agent d'activités a été lancé (RUN_BIKE_CAR, RUN_POI, RUN_RESTAURANTS ou RUN_OTHER), fusionner tous les fichiers `tmp/$ICAO-activities-*.json` présents en un seul tableau dans `tmp/$ICAO-activities.json`.

⚠️ Les `id` portent un suffixe aléatoire : dédupliquer par `id` ne suffit pas — un même lieu trouvé par deux agents survivrait en double.

⚠️ **La proximité seule ne suffit pas non plus** : à un même point (terminal d'aéroport, port, gare) coexistent des services **distincts** (navette ≠ location de voiture ≠ restaurant). Ne fusionner sur la proximité que si les **noms se ressemblent aussi** — sinon on supprime à tort un service légitime. Dédupliquer avec ce script (remplacer `$ICAO`) :

```python
import json, glob, unicodedata

ICAO = '$ICAO'

def norm(s):
    s = unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()
    return ' '.join(s.split())

def tokens(n):
    return {t for t in n.split() if len(t) > 3}

def similar_names(a, b):
    # même nom, ou l'un contient l'autre, ou forte similarité Jaccard des tokens (>3 lettres).
    # Seuil élevé : des services distincts au même lieu ("Navette … Aéroport Montpellier" vs
    # "Locations de voiture … Aéroport Montpellier") ne partagent que des tokens génériques
    # (aeroport, montpellier) → Jaccard faible → NON fusionnés.
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return True
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return False
    return len(ta & tb) / len(ta | tb) >= 0.6

files = sorted(glob.glob(f'tmp/{ICAO}-activities-*.json'))
seen, merged, dropped = [], [], []
for path in files:
    for a in json.load(open(path)):
        n = norm(a.get('name', ''))
        pos = a.get('position', {})
        lat, lon = pos.get('latitude'), pos.get('longitude')
        dup = False
        for (sn, slat, slon) in seen:
            close = (None not in (lat, lon, slat, slon)
                     and abs(lat - slat) < 0.0005 and abs(lon - slon) < 0.0005)  # ~55 m
            # doublon si noms identiques, OU proximité ET noms similaires
            if (n and sn == n) or (close and similar_names(n, sn)):
                dup = True
                break
        if dup:
            dropped.append(a.get('name'))
            continue
        seen.append((n, lat, lon))
        merged.append(a)

json.dump(merged, open(f'tmp/{ICAO}-activities.json', 'w'), ensure_ascii=False, indent=2)
print(f'{len(merged)} activités fusionnées depuis {len(files)} fichier(s) -> tmp/{ICAO}-activities.json')
if dropped:
    print('Doublons écartés :', dropped)
```

Signaler les doublons écartés s'il y en a. Si aucun agent d'activités n'a été lancé, sauter cette étape.

## Étape 3 — Validation

Lire et vérifier les fichiers produits :
- Si RUN_AIRFIELD : lire `tmp/$ICAO-airfield.json`
- Si au moins un agent d'activités : lire `tmp/$ICAO-activities.json`

Vérifications pour chaque fichier :

- JSON parseable (pas d'erreur de syntaxe)
- Chaque nœud `paragraph` a une clé `content` (tableau)
- Chaque nœud `image` a `attrs` et n'a **pas** de clé `content`
- Les liens sont dans `marks`, pas comme nœuds standalone
- Toutes les URLs d'images commencent par `https://upload.wikimedia.org/` ou appartiennent au domaine officiel de l'aérodrome/activité (pas de CDN tiers, pas de token dans l'URL)
- Le fichier airfield ne contient **que** les clés autorisées : `codeIcao`, `website`, `toilet`, `fuels`, `nightVFR`, `description` — toute autre clé (ex. `clubs`, `gestionnaire`) est une erreur à signaler
- **Noms verbatim** : aucun `name` d'activité ne doit contenir un ajout accolé (ville/région entre parenthèses ou après un tiret : `"… (Gordes)"`, `"… — Carpentras"`) ni un qualificatif promotionnel (« incontournable », « célèbre », « magnifique »…). Un tel nom est le signe d'une reformulation — signaler et corriger vers le nom d'origine.
- **Descriptions factuelles, sans langage promotionnel** — pour les activités **ET** pour la description de l'aérodrome. Traquer superlatifs et tournures fleuries (« incomparable », « les joies de… », « détente incomparable »…) ainsi que les impropriétés (ex. « institution *aviaire* » pour « aéronautique »).

### Vérifications automatiques (exécuter ce script, remplacer `$ICAO`)

Ce script contrôle deux points qu'une relecture visuelle rate facilement : (1) les URLs d'images **résolvent** réellement (les agents fabriquent parfois des URLs Wikimedia plausibles mais inexistantes) ; (2) la **distance de chaque activité au centre de l'aérodrome**, triée décroissante — une coordonnée peut être fausse **tout en restant dans la bounding box** (cas vécu : un château à 8 km de sa vraie position). Vérifier à la main les points en tête de liste.

```python
import json, os, math, urllib.request

ICAO = '$ICAO'

# --- centre de l'aérodrome ---
base = json.load(open('src/data/airfields.json'))['airfields']
entry = next(a for a in base if a.get('codeIcao') == ICAO)
clat, clon = entry['position']['latitude'], entry['position']['longitude']

def dist_km(lat, lon):
    R = 6371.0
    p1, p2 = math.radians(clat), math.radians(lat)
    dphi = math.radians(lat - clat); dl = math.radians(lon - clon)
    a = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def image_srcs(node, out):
    if isinstance(node, dict):
        if node.get('type') == 'image':
            src = node.get('attrs', {}).get('src')
            if src: out.append(src)
        for v in node.values():
            image_srcs(v, out)
    elif isinstance(node, list):
        for v in node: image_srcs(v, out)

# --- collecter toutes les images (airfield + activités) ---
srcs = []
for p in (f'tmp/{ICAO}-airfield.json', f'tmp/{ICAO}-activities.json'):
    if os.path.exists(p):
        image_srcs(json.load(open(p)), srcs)

print('=== Images ===')
for u in srcs:
    try:
        req = urllib.request.Request(u, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
        code = urllib.request.urlopen(req, timeout=15).status
    except Exception as e:
        code = f'ERREUR ({e})'
    flag = '' if code == 200 else '  <-- A VERIFIER'
    print(f'{code}  {u}{flag}')
if not srcs:
    print('(aucune image)')

# --- distances des activités ---
ap = f'tmp/{ICAO}-activities.json'
if os.path.exists(ap):
    acts = json.load(open(ap))
    rows = sorted(((dist_km(a['position']['latitude'], a['position']['longitude']), a['name']) for a in acts), reverse=True)
    print('\n=== Distance au centre (décroissante — vérifier les plus éloignées) ===')
    for d, name in rows:
        print(f'{d:5.1f} km  {name}')
```

Signaler tout problème trouvé (image ≠ 200, activité anormalement éloignée). Si les fichiers sont valides, confirmer les chemins produits.

## Étape 4 — Aperçu web

Générer une page HTML autonome de relecture des données **à insérer**, pour que l'utilisateur les
visualise avant l'insertion en base. Exécuter ce script Python (remplacer `$ICAO` par le code ICAO) :

```python
import json, html, os, math

ICAO = '$ICAO'
airfield_path = f'tmp/{ICAO}-airfield.json'
activities_path = f'tmp/{ICAO}-activities.json'

airfield = json.load(open(airfield_path)) if os.path.exists(airfield_path) else None
activities = json.load(open(activities_path)) if os.path.exists(activities_path) else None

# --- Ville + centre de l'aérodrome (depuis la base) ---
ville = ICAO
clat = clon = None
try:
    base = json.load(open('src/data/airfields.json'))
    entry = next(a for a in base['airfields'] if a.get('codeIcao') == ICAO)
    ville = entry.get('name', ICAO)
    clat, clon = entry['position']['latitude'], entry['position']['longitude']
except Exception:
    pass

def dist_km(pos):
    if clat is None or not pos:
        return None
    lat, lon = pos.get('latitude'), pos.get('longitude')
    if lat is None or lon is None:
        return None
    R = 6371.0
    p1, p2 = math.radians(clat), math.radians(lat)
    dphi = math.radians(lat - clat); dl = math.radians(lon - clon)
    a = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

# --- ProseMirror -> HTML (schéma agents/schema.md : doc, paragraph, text(+link), image) ---
def render(node):
    if node is None:
        return ''
    t = node.get('type')
    if t == 'doc':
        return ''.join(render(c) for c in node.get('content', []))
    if t == 'paragraph':
        inner = ''.join(render(c) for c in node.get('content', []))
        return f'<p>{inner}</p>' if inner else ''
    if t == 'text':
        text = html.escape(node.get('text', ''))
        for mark in node.get('marks', []):
            if mark.get('type') == 'link':
                href = html.escape(mark.get('attrs', {}).get('href', ''), quote=True)
                text = f'<a href="{href}" target="_blank" rel="noopener noreferrer nofollow">{text}</a>'
        return text
    if t == 'image':
        attrs = node.get('attrs', {})
        src = html.escape(attrs.get('src', ''), quote=True)
        alt = html.escape(attrs.get('alt') or '', quote=True)
        return f'<img src="{src}" alt="{alt}" loading="lazy">'
    # type inconnu : ignorer silencieusement
    return ''

def badge(label):
    return f'<span class="badge">{html.escape(label)}</span>'

def osm_link(pos):
    lat, lon = pos.get('latitude'), pos.get('longitude')
    url = f'https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=15/{lat}/{lon}'
    return f'<a href="{url}" target="_blank" rel="noopener">{lat}, {lon}</a>'

parts = []

# --- Section aérodrome ---
if airfield:
    badges = []
    for f in airfield.get('fuels', []):
        badges.append(badge(f))
    toilet_map = {'public': 'Toilettes : publiques', 'private': 'Toilettes : privées', 'no': 'Toilettes : non'}
    if 'toilet' in airfield:
        badges.append(badge(toilet_map.get(airfield['toilet'], f"Toilettes : {airfield['toilet']}")))
    if airfield.get('nightVFR'):
        badges.append(badge('VFR de nuit'))
    website = ''
    if airfield.get('website'):
        w = html.escape(airfield['website'], quote=True)
        website = f'<p class="website"><a href="{w}" target="_blank" rel="noopener">{html.escape(airfield["website"])}</a></p>'
    desc = render(airfield.get('description'))
    parts.append(f'''<section class="card airfield">
      <h2>Aérodrome {html.escape(ICAO)}</h2>
      <div class="badges">{''.join(badges) or '<em>aucun champ</em>'}</div>
      {website}
      <div class="desc">{desc}</div>
    </section>''')

# --- Section carte (entre aérodrome et activités) ---
map_points = []
if activities:
    for i, a in enumerate(activities, 1):
        pos = a.get('position') or {}
        mlat, mlon = pos.get('latitude'), pos.get('longitude')
        if mlat is not None and mlon is not None:
            map_points.append({'i': i, 'name': a.get('name', a.get('id', '?')), 'lat': mlat, 'lon': mlon})
map_center = {'lat': clat, 'lon': clon, 'icao': ICAO} if clat is not None else None
if map_points or map_center:
    parts.append('<section><h2>Carte</h2><div id="map"></div></section>')

# --- Section activités ---
if activities:
    cards = []
    for i, a in enumerate(activities, 1):
        aid = html.escape(a.get('id', ''), quote=True)
        name = html.escape(a.get('name', a.get('id', '?')))
        types = ''.join(badge(t) for t in a.get('type', []))
        website = ''
        if a.get('website'):
            w = html.escape(a['website'], quote=True)
            website = f'<p class="website"><a href="{w}" target="_blank" rel="noopener">{html.escape(a["website"])}</a></p>'
        desc = render(a.get('description'))
        d = dist_km(a.get('position'))
        dist = f'<span class="dist">✈ {d:.1f} km de {html.escape(ICAO)}</span>' if d is not None else ''
        pos = f'<p class="pos">📍 {osm_link(a["position"])} {dist}</p>' if a.get('position') else ''
        has_img = 'image' in json.dumps(a.get('description', {}))
        img_flag = '' if has_img else '<span class="noimg" title="pas d\'image">🚫🖼️</span>'
        cards.append(f'''<article class="card activity" data-id="{aid}" data-name="{name}">
          <div class="cardhead"><span class="idx">#{i}</span><h3>{name}</h3>{img_flag}</div>
          <div class="badges">{types}</div>
          <div class="desc">{desc}</div>
          {pos}
          {website}
          <div class="controls">
            <label class="chk del"><input type="checkbox" class="c-del"> 🗑 Supprimer</label>
            <label class="chk imp"><input type="checkbox" class="c-imp"> ✏️ À améliorer</label>
            <input type="text" class="note" placeholder="note (ce qu'il faut corriger / ajouter)…">
          </div>
        </article>''')
    parts.append(f'''<section>
      <h2>Activités à insérer ({len(activities)})</h2>
      <div class="grid">{''.join(cards)}</div>
    </section>''')

body = '\n'.join(parts) or '<p><em>Aucune donnée à afficher.</em></p>'

# Barre d'outils fixe + JS 100 % client : les cases cochées produisent un bloc d'instructions copiable.
toolbar = '''
<div class="toolbar">
  <div class="tbrow">
    <strong>Retours de relecture</strong>
    <span class="hint">Coche les cartes (Supprimer / À améliorer), puis copie le bloc et colle-le dans le chat.</span>
    <button id="copybtn" onclick="copyOut()">📋 Copier</button>
  </div>
  <textarea id="out" readonly rows="4" onclick="this.select()"></textarea>
</div>'''

script = r'''
<script>
function build(){
  const del=[], imp=[];
  document.querySelectorAll('article.activity').forEach(a=>{
    const id=a.dataset.id, name=a.dataset.name;
    const note=(a.querySelector('.note').value||'').trim();
    if(a.querySelector('.c-del').checked){ del.push(id); }
    if(a.querySelector('.c-imp').checked){ imp.push('- '+id+(note?' : '+note:'')+'  ('+name+')'); }
  });
  let out='';
  if(del.length) out+='SUPPRIMER: '+del.join(', ')+'\n';
  if(imp.length) out+='AMÉLIORER:\n'+imp.join('\n')+'\n';
  if(!out) out='(rien de coché — coche « Supprimer » ou « À améliorer » sur les cartes)';
  document.getElementById('out').value=out;
}
function copyOut(){
  const t=document.getElementById('out'); t.select();
  navigator.clipboard.writeText(t.value).then(()=>{
    const b=document.getElementById('copybtn'); const o=b.textContent;
    b.textContent='✓ Copié'; setTimeout(()=>b.textContent=o,1500);
  });
}
document.addEventListener('change',e=>{ if(e.target.matches('.c-del,.c-imp')) build(); });
document.addEventListener('input',e=>{ if(e.target.matches('.note')) build(); });
document.addEventListener('DOMContentLoaded',build);
</script>'''

# --- Carte Leaflet : centre aérodrome (✈) + activités numérotées (numéro = #index des fiches) ---
map_init_js = r'''
(function(){
  if (typeof L === 'undefined') return;
  var map = L.map('map', { scrollWheelZoom: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  var bounds = [];
  if (MAP_CENTER) {
    L.marker([MAP_CENTER.lat, MAP_CENTER.lon], {
      icon: L.divIcon({ className: 'apmark', html: '✈', iconSize: [28,28], iconAnchor: [14,14] })
    }).addTo(map).bindPopup('Aérodrome ' + MAP_CENTER.icao);
    bounds.push([MAP_CENTER.lat, MAP_CENTER.lon]);
  }
  MAP_POINTS.forEach(function(p){
    L.marker([p.lat, p.lon], {
      icon: L.divIcon({ className: 'nummark', html: String(p.i), iconSize: [24,24], iconAnchor: [12,12] })
    }).addTo(map).bindPopup('#' + p.i + ' ' + p.name);
    bounds.push([p.lat, p.lon]);
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [30,30], maxZoom: 14 });
})();
'''
leaflet = ''
if map_points or map_center:
    data_js = ('const MAP_POINTS = ' + json.dumps(map_points, ensure_ascii=False) + ';\n'
               + 'const MAP_CENTER = ' + json.dumps(map_center, ensure_ascii=False) + ';')
    leaflet = ('<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>\n'
               '<script>' + data_js + '</script>\n'
               '<script>' + map_init_js + '</script>')

doc = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aperçu {html.escape(ICAO)} — {html.escape(ville)}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<style>
  body {{ font-family: system-ui, sans-serif; max-width: 1100px; margin: 0 auto;
          padding: 1.5rem 1.5rem 12rem; color: #1a1a1a; line-height: 1.5; }}
  header h1 {{ margin: 0 0 .25rem; }}
  header .sub {{ color: #666; margin: 0 0 1.5rem; }}
  h2 {{ border-bottom: 2px solid #eee; padding-bottom: .3rem; }}
  .card {{ border: 1px solid #e2e2e2; border-radius: 10px; padding: 1rem 1.2rem; margin: 1rem 0;
           background: #fafafa; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }}
  .grid .card {{ margin: 0; display: flex; flex-direction: column; }}
  .cardhead {{ display: flex; align-items: baseline; gap: .5rem; }}
  .cardhead h3 {{ margin: .2rem 0; flex: 1; }}
  .idx {{ background: #495057; color: #fff; border-radius: 6px; padding: .05rem .45rem;
          font-size: .8rem; font-weight: 700; }}
  .noimg {{ font-size: .9rem; opacity: .6; }}
  .badges {{ display: flex; flex-wrap: wrap; gap: .4rem; margin: .5rem 0; }}
  .badge {{ background: #1971c2; color: #fff; border-radius: 999px; padding: .1rem .7rem;
            font-size: .8rem; }}
  .desc img, .card img {{ max-width: 100%; height: auto; border-radius: 8px; margin: .5rem 0; }}
  .desc p {{ margin: .5rem 0; }}
  .website a, .pos a {{ font-size: .85rem; }}
  .pos {{ color: #444; }}
  .dist {{ color: #1971c2; font-size: .8rem; margin-left: .4rem; white-space: nowrap; }}
  .controls {{ margin-top: auto; padding-top: .6rem; border-top: 1px dashed #ddd; display: flex;
               flex-wrap: wrap; gap: .6rem; align-items: center; }}
  .chk {{ font-size: .85rem; cursor: pointer; user-select: none; }}
  .chk.del {{ color: #c92a2a; }} .chk.imp {{ color: #e8590c; }}
  .note {{ flex: 1 1 100%; padding: .3rem .5rem; border: 1px solid #ccc; border-radius: 6px;
           font-size: .85rem; }}
  article.activity:has(.c-del:checked) {{ background: #fff0f0; border-color: #f3b0b0; opacity: .75; }}
  article.activity:has(.c-imp:checked) {{ background: #fff7ee; border-color: #f6c68a; }}
  .toolbar {{ position: fixed; left: 0; right: 0; bottom: 0; background: #fff;
              border-top: 2px solid #1971c2; box-shadow: 0 -4px 12px rgba(0,0,0,.08);
              padding: .7rem 1.5rem; z-index: 10; }}
  .toolbar .tbrow {{ display: flex; align-items: center; gap: .8rem; max-width: 1100px;
                     margin: 0 auto .4rem; }}
  .toolbar .hint {{ color: #666; font-size: .85rem; flex: 1; }}
  .toolbar textarea {{ width: 100%; max-width: 1100px; display: block; margin: 0 auto;
                       font-family: ui-monospace, monospace; font-size: .85rem; border: 1px solid #ccc;
                       border-radius: 6px; padding: .5rem; box-sizing: border-box; }}
  #copybtn {{ background: #1971c2; color: #fff; border: 0; border-radius: 6px; padding: .4rem .9rem;
              font-size: .9rem; cursor: pointer; }}
  #map {{ height: 440px; border-radius: 10px; margin: 1rem 0; z-index: 0; }}
  .nummark {{ background: #1971c2; color: #fff; border-radius: 50%; text-align: center;
              line-height: 24px; font-weight: 700; font-size: .8rem; border: 2px solid #fff;
              box-shadow: 0 1px 4px rgba(0,0,0,.4); }}
  .apmark {{ background: #c92a2a; color: #fff; border-radius: 50%; text-align: center;
             line-height: 28px; font-size: 1rem; border: 2px solid #fff;
             box-shadow: 0 1px 4px rgba(0,0,0,.4); }}
</style></head>
<body>
<header>
  <h1>Aperçu — {html.escape(ICAO)}</h1>
  <p class="sub">{html.escape(ville)}</p>
</header>
{body}
{toolbar}
{leaflet}
{script}
</body></html>'''

out = f'tmp/{ICAO}-preview.html'
with open(out, 'w') as f:
    f.write(doc)
print(f'Aperçu généré : {os.path.abspath(out)}')
```

Indiquer ensuite à l'utilisateur d'ouvrir le fichier dans son navigateur (`open tmp/$ICAO-preview.html`
sur macOS), de **cocher** les activités à supprimer / améliorer, puis de **coller le bloc généré**
dans le chat — voir l'Étape 5.

## Étape 5 — Retours de relecture (optionnelle, en boucle)

Cette étape ne se déclenche **que si l'utilisateur colle un bloc de retours** issu de l'aperçu. Le bloc a la forme :

```
SUPPRIMER: id-1, id-2
AMÉLIORER:
- id-3 : note explicative
- id-4 : note explicative
```

Les deux sections sont indépendantes (l'une ou l'autre peut être absente). Appliquer sur `tmp/$ICAO-activities.json` :

**1. `SUPPRIMER`** — retirer les activités dont l'`id` est listé (remplacer `$ICAO`, coller les ids) :

```python
import json
ICAO = '$ICAO'
to_delete = {  # ← coller ici les ids de la ligne SUPPRIMER
    'id-1', 'id-2',
}
path = f'tmp/{ICAO}-activities.json'
acts = json.load(open(path))
kept = [a for a in acts if a.get('id') not in to_delete]
json.dump(kept, open(path, 'w'), ensure_ascii=False, indent=2)
print(f'{len(acts) - len(kept)} supprimée(s), {len(kept)} restante(s)')
```

**2. `AMÉLIORER`** — pour chaque `id` et sa note, appliquer le correctif le plus adapté :
- **Correctif direct** (reformuler une description, corriger une coordonnée/un nom, ajuster un `type`) : éditer l'entrée dans `tmp/$ICAO-activities.json`.
- **Correctif nécessitant une recherche** (trouver une image, confirmer un fait, vérifier un lien avec l'aérodrome) : relancer une **mini-passe ciblée** (agent haiku) sur cette seule activité, en lui passant la note comme consigne et les règles de `agents/activity-format.md`, puis réintégrer le résultat.
- Ne jamais modifier `codeIcao`, `name`, `status`, `position` d'un aérodrome ni introduire une source d'image interdite.

**3. Reprendre la validation et l'aperçu** : après application, réexécuter les **vérifications automatiques de l'Étape 3** (images HTTP + distances) sur le fichier mis à jour, puis **régénérer l'aperçu** (Étape 4). Réafficher le chemin de l'aperçu pour un nouveau tour de relecture.

Répéter tant que l'utilisateur renvoie des retours. S'arrêter quand il valide — les données restent dans `tmp/`, prêtes pour l'insertion en base (Étape 6).

## Étape 6 — Proposer l'import en base (optionnelle)

Une fois les données validées, **proposer à l'utilisateur** d'importer les fichiers dans Firestore
(collections `airfields` + `activities`), sans le lancer d'office. L'outil est `npm run import`
(`scripts/import-data.ts`, cible **production**), qui écrit en **merge** (les champs absents des fichiers
ne sont pas supprimés) et affiche un diff colorisé avant d'appliquer.

Les fichiers à passer sont ceux dont le suffixe correspond au type attendu par le script :
`*airfield.json` → collection `airfields`, `*activities.json` → collection `activities`.

**Dry-run (recommandé d'abord)** — affiche le diff puis demande confirmation interactive :

```bash
npm run import -- --import tmp/$ICAO-airfield.json tmp/$ICAO-activities.json
```

**Appliquer sans prompt** (après relecture du diff) — ajouter `--apply` :

```bash
npm run import -- --import tmp/$ICAO-airfield.json tmp/$ICAO-activities.json --apply
```

Prérequis : `serviceAccountKey.json` à la racine du repo. Après un import réussi, rappeler à
l'utilisateur de régénérer le snapshot bundlé avec `npm run export`.
