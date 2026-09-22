"""Étape 0 bis — pistes de départ pour les agents d'activités.

    python3 .claude/skills/populate-airfield/scripts/sources.py LFBJ

Lit tmp/{ICAO}-context.json (produit par context.py, qui appelle ce script) et
écrit tmp/{ICAO}-sources.json : des **pistes à vérifier**, pas des activités.
L'agent part de lieux réels au lieu de chercher au hasard, puis vérifie chacun
(existe encore ? nom officiel ?) et complète par la recherche web.

Sources :
- **OpenStreetMap** (Overpass) — la plus riche : restaurants, hébergements, gares
  et arrêts avec leurs lignes, locations, musées, sites, aux abords du terrain. Coordonnées fiables et
  noms tels qu'écrits sur place. Sert **uniquement de piste** : rien n'est copié
  tel quel en base (licence ODbL).
- **PoiFrance** (poifrance.cloud) — ~1 850 repères de tourisme aérien saisis
  par des pilotes : exactement ce que cherche l'agent POI pour le type `poi`. Une
  requête OSM « vue du ciel » à 50 km a été essayée puis abandonnée : lourde, elle
  expirait sur les instances publiques d'Overpass, et PoiFrance couvre le besoin.
- **JpRNavMaster** et la carte **Google My Maps « Escales sur aérodrome »** —
  restaurants d'aérodrome, 0 à 2 par terrain, pas exhaustifs et parfois périmés :
  la date de mise à jour est reprise pour que l'agent en juge.

Le point « Restaurants » de la VAC n'est pas repris : il dit au mieux « sur AD »,
sans nom, et n'est pas tenu à jour.

Les listes nationales et la réponse Overpass de chaque terrain sont mises en
cache une semaine dans tmp/cache/. Overpass a un budget de 2 minutes : au-delà,
le script continue sans pistes OSM et le signale.
"""
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

CACHE_DIR = 'tmp/cache'
CACHE_TTL_S = 7 * 24 * 3600
# Overpass est un service public souvent saturé : sans plafond, 3 instances × 2
# requêtes × délai serveur ont bloqué un lancement plus de 10 minutes. Au-delà du
# budget, on continue sans pistes OSM (PoiFrance et JpRNavMaster n'en dépendent pas).
OVERPASS_SERVER_TIMEOUT_S = 60
OVERPASS_BUDGET_S = 120

# Instances publiques : la principale renvoie souvent 504 aux heures chargées.
OVERPASS_URLS = ('https://overpass-api.de/api/interpreter',
                 'https://overpass.private.coffee/api/interpreter',
                 'https://maps.mail.ru/osm/tools/overpass/api/interpreter')
JPR_URL = ('http://www.jprendu.fr/aeroweb/_private/21_JpRNavMaster/NavMasterSearch.php'
           '?Filter=&SearchMode=L&ButtonType=J&Langue=Fr&Region=&RegionName='
           '&Orig=QuickListMain_Fr&Retry=0&SortedOn=Name&SortDesc=ASC')
MYMAPS_MID = '1jmpyI_nZ3kvRG2W57zBTW22QZd4'
MYMAPS_URL = f'https://www.google.com/maps/d/kml?mid={MYMAPS_MID}&forcekml=1'
MYMAPS_VIEW = f'https://www.google.com/maps/d/viewer?mid={MYMAPS_MID}'
POIFRANCE_URL = 'https://poifrance.cloud/script/getmarker.php'
POIFRANCE_VIEW = 'https://poifrance.cloud/public.php'

# Rayon de recherche OSM par agent, en mètres. Plus large que le rayon de
# pertinence (tolérance du point AIP).
RADIUS_M = {'restaurants': 3500, 'transport': 3500, 'poi': 6000, 'other': 6000}
# Au-delà, la liste noierait l'agent : les plus proches d'abord.
MAX_PER_AGENT = {'restaurants': 40, 'transport': 30, 'poi': 30, 'other': 30}
# Un restaurant d'aérodrome recensé à plus de 3 km du point AIP n'est pas le nôtre.
AD_MATCH_KM = 3.0

# (agent, clé d'ensemble Overpass, filtres) — chaque filtre devient
# `nwr{filtre}(around:R,lat,lon);`.
OSM_FILTERS = [
    ('restaurants', ['[amenity~"^(restaurant|cafe|fast_food|biergarten|pub)$"][name]',
                     '[tourism~"^(hotel|motel|guest_house|hostel|chalet|camp_site|'
                     'caravan_site|apartment|alpine_hut)$"][name]']),
    ('transport', ['[railway~"^(station|halt)$"]',
                   '[public_transport=station]',
                   '[highway=bus_stop][name]',
                   '[amenity~"^(bicycle_rental|car_rental|taxi|car_sharing|boat_rental)$"]',
                   '[shop=bicycle]["service:bicycle:rental"=yes]']),
    # Collines et parcs de quartier n'ont d'intérêt que notables (Wikidata) ;
    # les œuvres d'art de rond-point, jamais.
    ('poi', ['[tourism~"^(museum|attraction|viewpoint|gallery)$"][name]',
             '[historic~"^(castle|manor|monastery|ruins|archaeological_site|fort|'
             'monument|city_gate|tower|church|chapel|mill)$"][name]',
             '[natural~"^(waterfall|cave_entrance|beach|cliff|spring)$"][name]',
             '[natural=peak][name][wikidata]',
             '[leisure~"^(nature_reserve|garden)$"][name]']),
    ('other', ['[leisure~"^(golf_course|water_park|marina|swimming_area|beach_resort|'
               'horse_riding|miniature_golf|ice_rink)$"][name]',
               '[leisure=park][name][wikidata]',
               '[tourism~"^(theme_park|zoo|aquarium|picnic_site)$"][name]',
               '[sport~"^(canoe|climbing|free_flying|parachuting|gliding|karting|'
               'motocross|surfing|kitesurfing|scuba_diving)$"][name]',
               '[route~"^(hiking|foot|mtb)$"][name]']),
]

# Tags recopiés dans la piste : ce qui aide l'agent à vérifier et à décrire.
KEEP_TAGS = ('amenity', 'tourism', 'historic', 'natural', 'leisure', 'sport', 'shop',
             'railway', 'public_transport', 'highway', 'man_made', 'bridge', 'route',
             'place', 'water', 'cuisine', 'stars', 'website', 'contact:website', 'phone',
             'contact:phone', 'opening_hours', 'operator', 'network', 'ref',
             'wikidata', 'wikipedia', 'wikimedia_commons', 'image', 'heritage',
             'addr:city', 'description')


def _get(url, data=None, ua=c.UA_BROWSER, timeout=60):
    req = urllib.request.Request(url, data=data, headers={'User-Agent': ua})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _cached(name, url, data=None):
    """Liste nationale, mise en cache une semaine (une requête par session suffit)."""
    path = os.path.join(CACHE_DIR, name)
    if os.path.exists(path) and time.time() - os.path.getmtime(path) < CACHE_TTL_S:
        return open(path, 'rb').read()
    raw = _get(url, data=data)
    os.makedirs(CACHE_DIR, exist_ok=True)
    open(path, 'wb').write(raw)
    return raw


# --- JpRNavMaster -----------------------------------------------------------

def _text(fragment):
    return ' '.join(html.unescape(re.sub(r'<br\s*/?>', ' | ', re.sub(r'<(?!br)[^>]+>', '', fragment,
                                                                        flags=re.I),
                                         flags=re.I)).split())


def jpr(icao):
    """Restaurants JpRNavMaster de ce terrain. Page encodée en latin-1, dont
    certains accents sont déjà perdus à la source (« L'A?rodrome »)."""
    page = _cached('jpr-restaurants.html', JPR_URL).decode('latin-1')
    out = []
    for block in re.split(r'title="Tous les détails pour ', page)[1:]:
        if not block.startswith(icao + '"'):
            continue
        cell = re.search(r'<td colspan=3[^>]*>(.*?)</td>\s*</td>\s*<td>(.*?)</td>', block, re.S)
        if not cell:
            continue
        body, updated = cell.groups()
        name = re.search(r"<font size=2>(.*?)</font>", body, re.S)
        site = re.search(r"href\s*='([^']+)'", body)
        details = _text(body)
        if name:
            details = details.replace(_text(name.group(1)), '', 1).strip(' |')
        out.append({
            'name': _text(name.group(1)) if name else None,
            'source': 'JpRNavMaster',
            'ref': JPR_URL,
            'website': site.group(1) if site else None,
            'details': details,
            'updated': _text(updated) or None,
            'closed': 'FERM' in details.upper(),
        })
    return out


# --- Google My Maps ---------------------------------------------------------

def mymaps(lat, lon):
    kml = _cached('mymaps-escales.kml', MYMAPS_URL).decode('utf-8')
    out = []
    for pm in re.findall(r'<Placemark>(.*?)</Placemark>', kml, re.S):
        coords = re.search(r'<coordinates>\s*([-\d.]+),([-\d.]+)', pm)
        if not coords:
            continue
        plon, plat = float(coords.group(1)), float(coords.group(2))
        d = c.dist_km(lat, lon, plat, plon)
        if d > AD_MATCH_KM:
            continue
        name = re.search(r'<name>(.*?)</name>', pm, re.S)
        desc = re.search(r'<description>(.*?)</description>', pm, re.S)
        # « Le Plan de Vol / Auxerre » : la ville suit la barre.
        label = html.unescape(re.sub(r'<!\[CDATA\[|\]\]>', '', name.group(1))).strip() if name else ''
        out.append({
            'name': label.split(' / ')[0].strip() or None,
            'source': 'Google My Maps « Escales sur aérodrome »',
            'ref': MYMAPS_VIEW,
            'latitude': plat, 'longitude': plon, 'distance_km': round(d, 2),
            'details': _text(re.sub(r'<!\[CDATA\[|\]\]>', '', desc.group(1))) if desc else None,
        })
    return out


# --- PoiFrance -------------------------------------------------------------

def poifrance(lat, lon):
    """Repères de tourisme aérien à moins de 50 km. Lignes `[id, code, NOM, lat, lon]` ;
    noms en capitales, donc à reprendre sur une source officielle (règle verbatim)."""
    rows = json.loads(_cached('poifrance.json', POIFRANCE_URL, data=b'').decode('utf-8-sig'))
    out = []
    for _, code, name, plat, plon in rows:
        plat, plon = float(plat), float(plon)
        d = c.dist_km(lat, lon, plat, plon)
        if d <= c.POI_AERIAL_RADIUS_KM:
            out.append({'name': name, 'source': 'PoiFrance', 'ref': POIFRANCE_VIEW, 'code': code,
                        'latitude': round(plat, 6), 'longitude': round(plon, 6),
                        'distance_km': round(d, 2)})
    return sorted(out, key=lambda x: x['distance_km'])


# --- OpenStreetMap ----------------------------------------------------------

def overpass_query(lat, lon):
    sets = ''.join(
        '(' + ''.join(f'nwr{f}(around:{RADIUS_M[agent]},{lat},{lon});' for f in filters)
        + f')->.{agent};.{agent} out center tags;'
        for agent, filters in OSM_FILTERS)
    # Lignes desservant les arrêts : relations `route` dont ils sont membres.
    routes = ('rel(bn.transport)[route~"^(bus|coach|tram|train|light_rail|ferry)$"]->.routes;'
              '.routes out body;')
    return f'[out:json][timeout:{OVERPASS_SERVER_TIMEOUT_S}];' + sets + routes


def overpass(q, deadline):
    """Éléments renvoyés, ou lève. Une réponse **partielle** (délai dépassé côté
    serveur) arrive en 200 avec une `remark` : la prendre pour complète a donné
    2 arrêts sans ligne sur LFNA — on passe alors à l'instance suivante."""
    errors = []
    for url in OVERPASS_URLS:
        left = deadline - time.monotonic()
        if left < 5:
            errors.append('budget de temps épuisé')
            break
        try:
            data = json.loads(_get(url, data=urllib.parse.urlencode({'data': q}).encode(),
                                   ua=c.UA_WIKIMEDIA,
                                   timeout=min(OVERPASS_SERVER_TIMEOUT_S + 10, left)))
        except Exception as e:
            errors.append(f'{urllib.parse.urlsplit(url).netloc} : {type(e).__name__} {e}')
            continue
        if 'remark' in data:
            errors.append(f"{urllib.parse.urlsplit(url).netloc} : réponse partielle ({data['remark'][:80]})")
            continue
        return data['elements']
    raise RuntimeError('Overpass indisponible — ' + ' ; '.join(errors))


def _position(el):
    if 'lat' in el:
        return el['lat'], el['lon']
    ctr = el.get('center') or {}
    return ctr.get('lat'), ctr.get('lon')


def osm(lat, lon, icao):
    """Pistes OSM par agent, les plus proches d'abord.

    Chaque réponse complète est mise en cache une semaine par aérodrome : relancer
    un terrain ne réinterroge pas Overpass."""
    path = os.path.join(CACHE_DIR, f'{icao}-osm.json')
    if os.path.exists(path) and time.time() - os.path.getmtime(path) < CACHE_TTL_S:
        elements = json.load(open(path))
    else:
        try:
            elements = overpass(overpass_query(lat, lon), time.monotonic() + OVERPASS_BUDGET_S)
        except RuntimeError as e:
            return None, str(e)
        os.makedirs(CACHE_DIR, exist_ok=True)
        json.dump(elements, open(path, 'w'))

    # Les éléments reviennent dans l'ordre des ensembles de la requête : on les
    # rattache à leur agent en rejouant les filtres sur les tags.
    routes_by_stop = {}
    for el in elements:
        if el['type'] == 'relation' and el.get('tags', {}).get('route') in (
                'bus', 'coach', 'tram', 'train', 'light_rail', 'ferry') and 'members' in el:
            t = el['tags']
            label = ' '.join(x for x in (t.get('route'), t.get('ref'), t.get('name')) if x)
            for m in el['members']:
                routes_by_stop.setdefault((m['type'], m['ref']), set()).add(label)

    by_agent = {a: [] for a, _ in OSM_FILTERS}
    seen = set()
    for el in elements:
        if 'members' in el:
            continue
        plat, plon = _position(el)
        if plat is None or (el['type'], el['id']) in seen:
            continue
        seen.add((el['type'], el['id']))
        tags = el.get('tags', {})
        d = c.dist_km(lat, lon, plat, plon)
        agent = _classify(tags)
        # Un itinéraire ou une zone est ramené dès qu'il touche le rayon, mais son
        # centre peut tomber bien au-delà (LFGG : un point à 8,7 km).
        if not agent or d * 1000 > RADIUS_M[agent]:
            continue
        cand = {
            'name': tags.get('name'),
            'source': 'OSM',
            'ref': f"https://www.openstreetmap.org/{el['type']}/{el['id']}",
            'latitude': round(plat, 6), 'longitude': round(plon, 6),
            'distance_km': round(d, 2),
            'tags': {k: v for k, v in tags.items() if k in KEEP_TAGS},
        }
        lines = routes_by_stop.get((el['type'], el['id']))
        if lines:
            cand['lines'] = sorted(lines)
        by_agent[agent].append(cand)

    for agent, cands in by_agent.items():
        cands[:] = _dedupe(sorted(cands, key=lambda x: x['distance_km']))
        if agent == 'transport':
            cands[:] = _group_stops(cands)
        by_agent[agent] = sorted(cands[:MAX_PER_AGENT[agent]], key=lambda x: x['distance_km'])
    return by_agent, None


def _classify(tags):
    """Rejoue les filtres Overpass → agent (None si aucun ne s'applique)."""
    def has(k, rx):
        return k in tags and re.fullmatch(rx, tags[k])
    if has('amenity', r'restaurant|cafe|fast_food|biergarten|pub') or has(
            'tourism', r'hotel|motel|guest_house|hostel|chalet|camp_site|caravan_site|apartment|alpine_hut'):
        return 'restaurants'
    if (has('railway', r'station|halt') or tags.get('public_transport') == 'station'
            or tags.get('highway') == 'bus_stop'
            or has('amenity', r'bicycle_rental|car_rental|taxi|car_sharing|boat_rental')
            or (tags.get('shop') == 'bicycle' and tags.get('service:bicycle:rental') == 'yes')):
        return 'transport'
    if has('leisure', r'golf_course|water_park|marina|swimming_area|beach_resort|horse_riding|'
                      r'miniature_golf|ice_rink|park') or has(
            'tourism', r'theme_park|zoo|aquarium|picnic_site') or 'sport' in tags or 'route' in tags:
        return 'other'
    if has('tourism', r'museum|attraction|viewpoint|gallery') or 'historic' in tags or has(
            'natural', r'waterfall|cave_entrance|peak|beach|cliff|spring') or has(
            'leisure', r'nature_reserve|garden'):
        return 'poi'
    return None


def _dedupe(cands):
    """Un même lieu saisi deux fois (« Gîte Vent de Sud » / « Gite Vent de Sud »)."""
    out = []
    for x in cands:
        if not any(c.norm(x['name'] or '') == c.norm(y['name'] or '')
                   and c.dist_km(x['latitude'], x['longitude'], y['latitude'], y['longitude']) < 0.3
                   for y in out):
            out.append(x)
    return out


def _group_stops(cands, keep=3):
    """Un seul arrêt suffit en général : le plus proche qui mène au centre-ville.
    Le script ne sait pas lequel y mène, d'où les `keep` plus proches desservis
    par une ligne connue (un par nom : un nœud par sens de circulation) ; l'agent
    choisit. Faute de ligne connue, le plus proche seulement."""
    stops, others, seen = [], [], set()
    for x in cands:
        if x['tags'].get('highway') != 'bus_stop' and x['tags'].get('public_transport') not in (
                'platform', 'stop_position'):
            others.append(x)
        elif x['name'] not in seen:
            seen.add(x['name'])
            stops.append(x)
    served = [x for x in stops if x.get('lines')]
    return sorted(others + (served[:keep] or stops[:1]), key=lambda x: x['distance_km'])


# --- Rapprochement avec la base -------------------------------------------

def mark_existing(cands, existing):
    """Signale les pistes déjà en base (même logique heuristique que merge.py),
    plus l'inclusion d'un nom dans l'autre : « Hôtel Le Cap » en OSM est « Le Cap »
    en base (LFNA)."""
    def same(n1, n2):
        a, b = sorted((c.norm(n1), c.norm(n2)), key=len)
        return c.similar_names(n1, n2) or (len(a) >= 5 and f' {a} ' in f' {b} ')

    for x in cands:
        for a in existing:
            if (x.get('name') and a.get('name') and same(x['name'], a['name'])
                    and ('latitude' not in x
                         or c.dist_km(x['latitude'], x['longitude'], a['latitude'], a['longitude']) < 1)):
                x['existing'] = a['id']
                break


def build(ctx):
    lat, lon, icao = ctx['latitude'], ctx['longitude'], ctx['icao']
    out = {'icao': icao, 'generated': date.today().isoformat(), 'errors': [],
           'airfield_restaurants': [], 'poifrance': [], 'osm': {}}
    for name, fn in (('JpRNavMaster', lambda: jpr(icao)), ('My Maps', lambda: mymaps(lat, lon))):
        try:
            out['airfield_restaurants'] += fn()
        except Exception as e:
            out['errors'].append(f'{name} : {type(e).__name__}: {e}')
    try:
        out['poifrance'] = poifrance(lat, lon)
    except Exception as e:
        out['errors'].append(f'PoiFrance : {type(e).__name__}: {e}')
    by_agent, err = osm(lat, lon, icao)
    if err:
        out['errors'].append(err)
    out['osm'] = by_agent or {}
    # Toute la base, pas seulement la bbox du contexte : PoiFrance va jusqu'à 50 km.
    existing = [{'id': a.get('id'), 'name': a.get('name'),
                 'latitude': a['position']['latitude'], 'longitude': a['position']['longitude']}
                for a in c.load_activities()
                if (a.get('position') or {}).get('latitude') is not None]
    mark_existing(out['airfield_restaurants'], existing)
    mark_existing(out['poifrance'], existing)
    for cands in out['osm'].values():
        mark_existing(cands, existing)
    return out


def report(src):
    lines = []
    A = lines.append
    A(f"PISTES ({src['generated']}) — à vérifier, jamais à recopier : tmp/{src['icao']}-sources.json")
    ar = src['airfield_restaurants']
    A(f"  restaurants d'aérodrome (JpRNavMaster / My Maps) : {len(ar)}")
    for x in ar:
        flag = ' ⚠ FERMÉ selon la source' if x.get('closed') else ''
        dup = f"  [déjà en base : {x['existing']}]" if x.get('existing') else ''
        A(f"    - {x['name']}  [{x['source'].split(' ')[0]}{', MàJ ' + x['updated'] if x.get('updated') else ''}]"
          f"{flag}{dup}")
    pf = src['poifrance']
    A(f"  PoiFrance (repères vus du ciel, {c.POI_AERIAL_RADIUS_KM:g} km) : {len(pf)}"
      + (f", dont {sum(1 for x in pf if x.get('existing'))} déjà en base" if any(x.get('existing') for x in pf) else ''))
    for agent, cands in src['osm'].items():
        n_dup = sum(1 for x in cands if x.get('existing'))
        A(f"  OSM {agent:12}: {len(cands)} piste(s)" + (f", dont {n_dup} déjà en base" if n_dup else ''))
    for e in src['errors']:
        A(f"  ⚠ {e}")
    return '\n'.join(lines)


def run(icao):
    ctx = json.load(open(c.tmp_path(icao, 'context.json')))
    src = build(ctx)
    path = c.tmp_path(icao, 'sources.json')
    json.dump(src, open(path, 'w'), ensure_ascii=False, indent=2)
    return src, path


if __name__ == '__main__':
    icao = c.icao_arg()
    if not os.path.exists(c.tmp_path(icao, 'context.json')):
        c.die(f'tmp/{icao}-context.json absent — lancer context.py d\'abord')
    src, path = run(icao)
    print(report(src))
    print(f'\nPistes écrites : {path}')
