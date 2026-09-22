"""Position du centre-ville de la ville de référence de la VAC.

    python3 .claude/skills/populate-airfield/scripts/city.py LFRD

Sert la fiche « centre-ville » (prompts/activities-city.md) : la VAC donne la ville
et sa distance au terrain, pas sa position. geo.api.gouv.fr la donne, avec la
population, en une requête et sans dépendre d'Overpass.

Le point retenu est la **mairie**, bon repère du centre-ville ; le centroïde de la
commune peut en être loin (communes étendues, littorales, fusionnées).

La VAC écrit la ville librement, d'où un rapprochement en plusieurs temps (mesuré
sur les 416 cartes lisibles) :
- orthographe : apostrophe typographique (« Sables d’Olonne »), « St » abrégé ;
- nom court : « Salon » est Salon-de-Provence, « Cherbourg » Cherbourg-en-Cotentin ;
- département : celui de la VAC est celui du **terrain**, pas toujours celui de la
  ville (LFBK → Montluçon est dans l'Allier, LFNT → Avignon dans le Vaucluse) ;
- homonymes : « Mortagne » ramenait Villiers-sous-Mortagne.
Le garde-fou est la **distance de la VAC** : la ville retenue doit se trouver à peu
près à la distance annoncée du terrain. Sinon, rien n'est retenu — l'agent
cherchera, plutôt que de partir d'une fausse position.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

GEO_API = 'https://geo.api.gouv.fr/communes'


def _clean(name):
    name = name.replace('’', "'").strip(' .')
    name = re.sub(r'^(?:du|de la|de|des)\s+', '', name, flags=re.I)  # « du Plessis Belleville »
    name = re.sub(r'\bSte?\b\.?-?\s*', lambda m: 'Sainte-' if 'e' in m.group(0)[:3] else 'Saint-', name)
    # « Perouges et / and Meximieux » : la première ville.
    return re.split(r'\s+(?:et|and|/)\s+', name)[0].strip()


def _search(name, dept=None):
    q = {'nom': name, 'fields': 'nom,code,mairie,centre,population', 'boost': 'population',
         'limit': 10}
    if dept:
        q['codeDepartement'] = dept
    try:
        req = urllib.request.Request(f'{GEO_API}?{urllib.parse.urlencode(q)}',
                                     headers={'User-Agent': c.UA_WIKIMEDIA})
        return json.load(urllib.request.urlopen(req, timeout=20))
    except Exception:
        return []


def locate(name, dept, vac_km, ad_lat, ad_lon):
    """→ dict (nom officiel, position de la mairie, population, écart à la VAC),
    ou dict avec `reason` si aucune commune ne colle à la distance de la VAC."""
    wanted = _clean(name)
    key = c.norm(wanted)
    candidates = _search(wanted, dept) or []
    candidates += [x for x in _search(wanted) if x['code'] not in {y['code'] for y in candidates}]

    scored = []
    for x in candidates:
        pt = (x.get('mairie') or x.get('centre') or {}).get('coordinates')
        if not pt:
            continue
        d = c.dist_km(ad_lat, ad_lon, pt[1], pt[0])
        nom = c.norm(x['nom'])
        # Nom exact, puis nom qui commence par celui de la VAC (« Salon » →
        # Salon-de-Provence), puis qui le contient ; à égalité, la plus peuplée.
        rank = 0 if nom == key else 1 if nom.startswith(key) else 2 if key in nom else 3
        # Tolérance sur la distance VAC : large pour un nom sûr — la VAC mesure
        # une grande ville à sa lisière, pas à sa mairie (LFQB : Troyes annoncée à
        # 2 km) — et stricte sinon, faute de quoi un voisin homonyme passe
        # (« Les Noës-près-Troyes »).
        tol = max(5.0, vac_km or 0) if rank <= 1 else max(3.0, 0.5 * (vac_km or 0))
        if vac_km is not None and abs(d - vac_km) > tol:
            continue
        scored.append((rank, -(x.get('population') or 0), x, pt, d))
    if not scored:
        return {'name_vac': name, 'reason': (f'aucune commune « {wanted} » à ~{vac_km} km du terrain '
                                             '— position à chercher')}
    rank, _, x, pt, d = min(scored, key=lambda s: s[:2])
    return {
        'name': x['nom'],
        'name_vac': name,
        'insee': x['code'],
        'latitude': round(pt[1], 6),
        'longitude': round(pt[0], 6),
        'point': 'mairie' if x.get('mairie') else 'centroïde',
        'population': x.get('population'),
        'distance_km': round(d, 1),
        # Un nom qui ne fait que contenir celui de la VAC reste douteux.
        'confidence': 'haute' if rank <= 1 else 'à vérifier',
    }


if __name__ == '__main__':
    icao = c.icao_arg()
    import vac  # noqa: E402
    s = vac.read(icao)
    lat, lon = c.center(c.load_airfield(icao))
    if not s.get('city'):
        c.die(f"ville VAC illisible : {s.get('reason') or s.get('raw')}")
    print(json.dumps(locate(s['city'], s.get('department_code'), s.get('distance_km'), lat, lon),
                     ensure_ascii=False, indent=2))
