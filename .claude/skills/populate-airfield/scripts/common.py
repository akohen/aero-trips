"""Helpers partagés par les scripts du skill populate-airfield.

Tous les scripts s'exécutent depuis la racine du repo et prennent le code ICAO
en premier argument.
"""
import glob
import json
import math
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from urllib.parse import urlsplit

AIRFIELDS_JSON = 'src/data/airfields.json'
ACTIVITIES_JSON = 'src/data/activities.json'
CLUBS_JSON = 'scripts/clubs.json'

# Rayons par catégorie, en km (cf. SKILL.md § Périmètre de recherche).
CATEGORY_RADIUS_KM = {
    'transport': 2.5,
    'restaurants': 2.5,
    'poi': 5.0,
    'other': 5.0,
}
# Marge de tolérance : la position AIP de l'aérodrome est son point de référence,
# qui peut se trouver à ~1 km du parking avions / de l'entrée pilotes.
RADIUS_TOLERANCE_KM = 1.0

# Agent → fichier qu'il produit (suffixe après "{ICAO}-").
AGENT_OUTPUTS = {
    'airfield': 'airfield.json',
    'transport': 'activities-transport.json',
    'poi': 'activities-poi.json',
    'restaurants': 'activities-restaurants.json',
    'other': 'activities-other.json',
}

# Champs de l'aérodrome que le skill ne doit jamais toucher.
PROTECTED_FIELDS = {'codeIcao', 'name', 'status', 'position', 'runways'}


def die(msg):
    print(f'ERREUR : {msg}', file=sys.stderr)
    sys.exit(1)


def icao_arg(argv=None):
    argv = sys.argv if argv is None else argv
    if len(argv) < 2:
        die(f'usage : python3 {argv[0]} ICAO')
    return argv[1].strip().upper()


def load_airfield(icao):
    if not os.path.exists(AIRFIELDS_JSON):
        die(f'{AIRFIELDS_JSON} introuvable — lancer le script depuis la racine du repo.')
    entries = json.load(open(AIRFIELDS_JSON))['airfields']
    entry = next((a for a in entries if a.get('codeIcao') == icao), None)
    if entry is None:
        near = [a['codeIcao'] for a in entries if a.get('codeIcao', '').startswith(icao[:2])][:12]
        die(f'aérodrome {icao} absent de {AIRFIELDS_JSON}. Codes proches : {", ".join(near)}')
    return entry


def load_activities():
    if not os.path.exists(ACTIVITIES_JSON):
        return []
    return json.load(open(ACTIVITIES_JSON))['activities']


def center(entry):
    return entry['position']['latitude'], entry['position']['longitude']


def dist_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def bbox(lat, lon, half_deg=0.05):
    lon_delta = half_deg / math.cos(math.radians(lat))
    return (lat - half_deg, lat + half_deg, lon - lon_delta, lon + lon_delta)


def in_bbox(lat, lon, box):
    lat_min, lat_max, lon_min, lon_max = box
    return lat_min <= lat <= lat_max and lon_min <= lon <= lon_max


def title_case(s):
    """Équivalent Python de titleCase() (src/utils/utils.ts)."""
    return re.sub(r"(^|[\s\-'/])([a-zà-ÿ])",
                  lambda m: m.group(1) + m.group(2).upper(), (s or '').lower())


def norm(s):
    """Nom normalisé pour comparaison : sans accents, minuscules, espaces compactés."""
    s = unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r"[^a-z0-9]+", ' ', s)
    return ' '.join(s.split())


def similar_names(a, b, threshold=0.6):
    """Deux noms désignent-ils vraisemblablement le même lieu ?

    Égalité, inclusion, ou forte similarité Jaccard des tokens de plus de 3 lettres.
    Seuil élevé à dessein : au même point (terminal, port, gare) coexistent des
    services distincts ("Navette … Aéroport Montpellier" vs "Location de voitures …
    Aéroport Montpellier") qui ne partagent que des tokens génériques.
    """
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return True
    ta = {t for t in a.split() if len(t) > 3}
    tb = {t for t in b.split() if len(t) > 3}
    if not ta or not tb:
        return False
    return len(ta & tb) / len(ta | tb) >= threshold


def iter_nodes(node, skip_marks=False):
    """Parcourt récursivement un document ProseMirror (dicts et listes).

    `skip_marks` ignore le contenu des tableaux `marks` : un mark est lui aussi un
    dict `{"type": "link", ...}` et serait sinon confondu avec un nœud de contenu.
    """
    if isinstance(node, dict):
        yield node
        for k, v in node.items():
            if skip_marks and k == 'marks':
                continue
            yield from iter_nodes(v, skip_marks)
    elif isinstance(node, list):
        for v in node:
            yield from iter_nodes(v, skip_marks)


def image_srcs(doc):
    return [n.get('attrs', {}).get('src') for n in iter_nodes(doc)
            if n.get('type') == 'image' and n.get('attrs', {}).get('src')]


def has_image(activity):
    return bool(image_srcs(activity.get('description')))


def tmp_path(icao, suffix):
    return f'tmp/{icao}-{suffix}'


# Wikimedia applique une politique d'User-Agent : les UA de navigateur génériques
# sont rate-limités (429) alors qu'un UA descriptif passe. Les CDN de sites font
# l'inverse et bloquent les UA non-navigateur. D'où un choix par hôte.
UA_BROWSER = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
              '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
UA_WIKIMEDIA = 'aerotrips-populate/1.0 (+https://aerotrips.fr)'


def user_agent(url):
    return UA_WIKIMEDIA if 'wikimedia.org' in urlsplit(url).netloc else UA_BROWSER


_last_hit = {}
MIN_GAP_S = 1.0  # Wikimedia renvoie 429 si on enchaîne les requêtes sans pause.


def _throttle(url):
    host = urlsplit(url).netloc
    wait = MIN_GAP_S - (time.monotonic() - _last_hit.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    _last_hit[host] = time.monotonic()


def _try(url, method):
    _throttle(url)
    req = urllib.request.Request(url, method=method, headers={'User-Agent': user_agent(url)})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status


def http_status(url, retries=3):
    """Statut HTTP, User-Agent navigateur obligatoire (sans lui, 403 fréquents).

    Bascule sur GET quand HEAD est refusé, et réessaie sur 429 : un
    rate-limit ferait passer une image parfaitement valide pour cassée.
    """
    for attempt in range(retries + 1):
        last = None
        for method in ('HEAD', 'GET'):
            try:
                return _try(url, method)
            except urllib.error.HTTPError as e:
                last = e.code
                if method == 'HEAD' and e.code in (403, 405, 501):
                    continue
                break
            except Exception as e:
                last = f'ERREUR ({type(e).__name__})'
                if method == 'HEAD':
                    continue
                break
        if last == 429 and attempt < retries:
            time.sleep(5 * (attempt + 1))
            continue
        return last
    return last


def agent_files(icao):
    """Fichiers produits par les agents d'activités, du plus ancien au plus récent."""
    return sorted(glob.glob(tmp_path(icao, 'activities-*.json')))


def review_state(icao):
    """Compare le fichier fusionné aux fichiers d'agents dont il est issu.

    Un écart signifie qu'une **relecture a eu lieu** : activités supprimées,
    ajoutées ou retouchées à la main après la fusion. Ces modifications ne
    figurent que dans le fichier fusionné — refaire une fusion les écraserait.

    Renvoie un dict ; `diverged` est le drapeau à tester avant toute opération
    destructive.
    """
    per = {}
    for path in agent_files(icao):
        try:
            for a in json.load(open(path)):
                if a.get('id'):
                    per[a['id']] = a
        except (json.JSONDecodeError, OSError):
            continue

    merged_path = tmp_path(icao, 'activities.json')
    merged = None
    if os.path.exists(merged_path):
        try:
            merged = {a['id']: a for a in json.load(open(merged_path)) if a.get('id')}
        except (json.JSONDecodeError, OSError):
            merged = None

    state = {
        'has_agent_files': bool(per),
        'has_merged': merged is not None,
        'n_agent': len(per),
        'n_merged': len(merged) if merged is not None else 0,
        'deleted': [], 'added': [], 'modified': [], 'diverged': False,
    }
    if merged is None or not per:
        return state

    state['deleted'] = sorted(set(per) - set(merged))
    state['added'] = sorted(set(merged) - set(per))
    state['modified'] = sorted(i for i in set(per) & set(merged) if per[i] != merged[i])
    state['diverged'] = bool(state['deleted'] or state['added'] or state['modified'])
    return state


def describe_review(state, merged_name='le fichier fusionné'):
    """Résumé lisible d'un review_state divergent."""
    bits = []
    if state['deleted']:
        bits.append(f"{len(state['deleted'])} supprimée(s) en relecture "
                    f"({', '.join(state['deleted'][:3])}{'…' if len(state['deleted']) > 3 else ''})")
    if state['added']:
        bits.append(f"{len(state['added'])} ajoutée(s) à la main")
    if state['modified']:
        bits.append(f"{len(state['modified'])} retouchée(s)")
    return f"{merged_name} diverge des fichiers d'agents : " + ', '.join(bits)
