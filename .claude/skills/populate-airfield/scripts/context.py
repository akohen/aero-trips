"""Étape 0 — rassemble tout le contexte nécessaire pour un aérodrome.

    python3 .claude/skills/populate-airfield/scripts/context.py LFBJ [agents...] [--no-vac] [--no-clean]

Écrit tmp/{ICAO}-context.json (relu par merge.py / validate.py / preview.py) et
affiche un résumé lisible, lu ensuite par chaque agent.

Les agents à lancer peuvent être listés après le code ICAO (airfield, transport,
poi, restaurants, other ; aucun = tous). Le script **supprime alors les fichiers de
sortie de ces seuls agents** : sans quoi un fichier resté d'un run précédent serait
silencieusement réintégré par merge.py alors qu'aucun agent ne l'a produit cette
fois-ci. Les fichiers des autres catégories sont conservés — c'est ce qui permet de
relancer une seule catégorie sans perdre les autres. `--no-clean` désactive ce
nettoyage.

Le nettoyage s'annule tout seul si une **relecture a déjà eu lieu** (le fichier
fusionné diverge des fichiers d'agents) : c'est le cas d'une reprise de session, où
détruire les sorties ferait perdre le travail de relecture. `--force` passe outre.
Pour reprendre une session, préférer `resume.py`.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
import vac as vacmod  # noqa: E402


def build(icao, use_vac=True):
    entry = c.load_airfield(icao)
    lat, lon = c.center(entry)
    box = c.bbox(lat, lon)

    situation = vacmod.read(icao) if use_vac else {'found': False, 'reason': '--no-vac'}
    # `name` en base est le nom de l'aérodrome en majuscules, pas une ville
    # exploitable en recherche web : la VAC prime, title_case(name) ne sert que
    # de repli quand aucune carte n'est publiée.
    if situation.get('city'):
        city, city_source = situation['city'], 'VAC'
    else:
        city, city_source = c.title_case(entry['name']), 'repli sur name (à vérifier)'

    activities = c.load_activities()
    nearby = []
    for a in activities:
        pos = a.get('position') or {}
        alat, alon = pos.get('latitude'), pos.get('longitude')
        if alat is None or alon is None or not c.in_bbox(alat, alon, box):
            continue
        nearby.append({
            'id': a.get('id'),
            'name': a.get('name'),
            'type': a.get('type', []),
            'latitude': alat,
            'longitude': alon,
            'distance_km': round(c.dist_km(lat, lon, alat, alon), 2),
        })
    nearby.sort(key=lambda x: x['distance_km'])

    clubs = []
    if os.path.exists(c.CLUBS_JSON):
        clubs = [{'name': x['name'], 'website': x.get('website') or None, 'phone': x.get('phone') or None}
                 for x in json.load(open(c.CLUBS_JSON)) if x.get('base_icao') == icao]

    # --- VAC : nightVFR et carburants ---------------------------------------
    # nightVFR : la VAC fait autorité, mais on ne réécrit jamais en silence une
    # valeur déjà en base — une contradiction est signalée, l'humain tranche.
    # fuels : purement additif (la section AVT est parfois incomplète), donc
    # union avec l'existant et jamais de retrait.
    base_nvfr = entry.get('nightVFR')
    vac_nvfr = situation.get('night_vfr')
    nvfr = {'base': base_nvfr, 'vac': vac_nvfr, 'raw': situation.get('night_vfr_raw')}
    if vac_nvfr is None:
        nvfr['action'] = 'aucune'
        nvfr['reason'] = 'VAC non concluante — ne pas renseigner nightVFR'
    elif base_nvfr is None:
        nvfr['action'] = 'proposer'
        nvfr['value'] = vac_nvfr
    elif bool(base_nvfr) == bool(vac_nvfr):
        nvfr['action'] = 'aucune'
        nvfr['reason'] = 'déjà conforme à la VAC'
    else:
        nvfr['action'] = 'conflit'
        nvfr['reason'] = (f'base={base_nvfr} mais VAC={vac_nvfr} — signaler à '
                          "l'utilisateur, ne rien écrire sans son accord")

    base_fuels = list(entry.get('fuels') or [])
    vac_fuels = situation.get('fuels')
    added = [f for f in (vac_fuels or []) if f not in base_fuels]
    fuels = {
        'base': base_fuels,
        'vac': vac_fuels,
        'added': added,
        'union': base_fuels + added,
        'raw': situation.get('fuels_raw'),
    }

    return {
        'icao': icao,
        'airfield_name': entry['name'],
        'airfield_name_display': c.title_case(entry['name']),
        'city': city,
        'city_source': city_source,
        'situation': situation,
        'status': entry.get('status'),
        'latitude': lat,
        'longitude': lon,
        'bbox': {'lat_min': box[0], 'lat_max': box[1], 'lon_min': box[2], 'lon_max': box[3]},
        'category_radius_km': c.CATEGORY_RADIUS_KM,
        'radius_tolerance_km': c.RADIUS_TOLERANCE_KM,
        'existing_fields': [k for k in entry if k not in c.PROTECTED_FIELDS],
        'existing_activities': nearby,
        'clubs': clubs,
        'night_vfr': nvfr,
        'fuels': fuels,
    }


def report(ctx):
    lines = []
    A = lines.append
    A(f"ICAO            : {ctx['icao']}  (statut {ctx['status']})")
    A(f"Nom aérodrome   : {ctx['airfield_name_display']}")
    A(f"VILLE           : {ctx['city']}   [source : {ctx['city_source']}]")
    s = ctx['situation']
    if s.get('found'):
        A(f"  VAC §1        : {s['raw']}")
    else:
        A(f"  VAC           : indisponible — {s.get('reason')}")
    A(f"Centre (AIP)    : {ctx['latitude']}, {ctx['longitude']}")
    b = ctx['bbox']
    A(f"Bounding box    : lat {b['lat_min']:.5f} → {b['lat_max']:.5f} | "
      f"lon {b['lon_min']:.5f} → {b['lon_max']:.5f}")
    A(f"Rayons          : " + ', '.join(f'{k} {v} km' for k, v in ctx['category_radius_km'].items())
      + f" (tolérance ±{ctx['radius_tolerance_km']} km)")
    A(f"Champs présents : {ctx['existing_fields'] or '(aucun)'}")
    A('')
    n = ctx['night_vfr']
    A(f"VFR de nuit (VAC §3) : base={n['base']}  VAC={n['vac']}  ({n['raw']!r})")
    if n['action'] == 'proposer':
        A(f"  → RENSEIGNER nightVFR = {str(n['value']).lower()}")
    elif n['action'] == 'conflit':
        A(f"  → ⚠ CONFLIT : {n['reason']}")
    else:
        A(f"  → rien à faire ({n['reason']})")
    f = ctx['fuels']
    A(f"Carburants (VAC §10) : base={f['base']}  VAC={f['vac']}")
    if f['added']:
        A(f"  → AJOUTER {f['added']} — soit fuels = {f['union']} (jamais de retrait)")
    else:
        A('  → rien à ajouter (la section AVT est parfois incomplète : ne jamais retirer)')
    if f['raw']:
        A(f"  AVT : {f['raw'][:150]}")
    A('')
    A(f"CLUBS ({len(ctx['clubs'])}) — source de vérité, ne pas deviner :")
    for club in ctx['clubs'] or []:
        A(f"  - {club['name']}  | site : {club['website'] or '(aucun)'}  | tél : {club['phone'] or '-'}")
    if not ctx['clubs']:
        A('  (aucun club basé référencé)')
    A('')
    A(f"ACTIVITÉS DÉJÀ EN BASE dans la bbox ({len(ctx['existing_activities'])}) — "
      "ne pas les recréer :")
    for a in ctx['existing_activities']:
        A(f"  - {a['name']}  [{'/'.join(a['type'])}]  {a['distance_km']} km  ({a['id']})")
    if not ctx['existing_activities']:
        A('  (aucune)')
    return '\n'.join(lines)


def clean_outputs(icao, agents):
    """Supprime les fichiers des agents sur le point d'être relancés."""
    removed = []
    for agent in agents:
        path = c.tmp_path(icao, c.AGENT_OUTPUTS[agent])
        if os.path.exists(path):
            os.remove(path)
            removed.append(path)
    return removed


if __name__ == '__main__':
    icao = c.icao_arg()
    args = [a for a in sys.argv[2:] if not a.startswith('--')]
    unknown = [a for a in args if a not in c.AGENT_OUTPUTS]
    if unknown:
        c.die(f'agent(s) inconnu(s) : {unknown} — attendu parmi {list(c.AGENT_OUTPUTS)}')
    agents = args or list(c.AGENT_OUTPUTS)

    ctx = build(icao, use_vac='--no-vac' not in sys.argv)
    os.makedirs('tmp', exist_ok=True)
    path = c.tmp_path(icao, 'context.json')
    json.dump(ctx, open(path, 'w'), ensure_ascii=False, indent=2)
    print(report(ctx))

    print(f"\nAgents à lancer : {', '.join(agents)}")
    state = c.review_state(icao)
    if '--no-clean' in sys.argv:
        print('  nettoyage désactivé (--no-clean)')
    elif state['diverged'] and '--force' not in sys.argv:
        print('  ⚠ NETTOYAGE ANNULÉ — ' + c.describe_review(state))
        print('    Ces modifications n\'existent que dans le fichier fusionné : les supprimer')
        print('    reviendrait à perdre la relecture déjà faite.')
        print('    → pour reprendre la session : resume.py ' + icao)
        print('    → pour repartir de zéro malgré tout : --force')
    else:
        removed = clean_outputs(icao, agents)
        for r in removed:
            print(f'  supprimé (sera régénéré) : {r}')
        kept = [c.tmp_path(icao, c.AGENT_OUTPUTS[a]) for a in c.AGENT_OUTPUTS if a not in agents]
        kept = [k for k in kept if os.path.exists(k)]
        for k in kept:
            print(f'  conservé (catégorie non relancée) : {k}')
        if not removed and not kept:
            print('  (aucun fichier de run précédent)')

    print(f'\nContexte écrit : {path}')
