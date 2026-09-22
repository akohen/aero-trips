"""Étape 0 — rassemble tout le contexte nécessaire pour un aérodrome.

    python3 .claude/skills/populate-airfield/scripts/context.py LFBJ [agents...] [--no-vac] [--no-clean] [--no-sources]

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

Appelle ensuite `sources.py`, qui écrit tmp/{ICAO}-sources.json (pistes OSM,
JpRNavMaster, My Maps) ; `--no-sources` s'en dispense.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
import city as citymod  # noqa: E402
import sources as sourcesmod  # noqa: E402
import vac as vacmod  # noqa: E402


def _club_key(name):
    """Nom réduit pour le rapprochement.

    « Aéro-club », « Aéroclub » et « ACB » désignent la même chose : seule
    l'orthographe change d'une source à l'autre, et `similar_names` ne voit
    sinon que deux tokens distincts (« aero » + « club » contre « aeroclub »),
    ce qui suffit à faire échouer le rapprochement.
    """
    return re.sub(r'\b(?:aero[ -]?club|acb)\b', 'aeroclub', c.norm(name))


def merge_clubs(manual, vac_clubs):
    """Rapproche `clubs.json` et le point ACB de la VAC — les deux servent.

    Chacun sait ce que l'autre ignore : le fichier manuel porte les `website`
    (que l'AIP ne publie qu'exceptionnellement) et des noms déjà relus, la VAC
    porte les contacts et les clubs de toutes les disciplines. Sur un club
    commun, la valeur du fichier manuel l'emporte champ par champ ; un club
    connu d'une seule source est conservé tel quel.

    Le rapprochement par nom reste heuristique (`similar_names`, comme
    `merge.py`) : le nom VAC est recomposé, le nom manuel relu, et rien ne
    garantit qu'ils s'écrivent pareil. En cas de doute le club apparaît deux
    fois — la relecture tranche, ce qui coûte moins cher qu'une fusion à tort.
    """
    # Le téléphone rattrape les noms trop éloignés pour `similar_names` (LFRD :
    # « Aéroclub de la Côte d'Emeraude » contre « La Côte d’Emeraude », même numéro).
    def phone(club):
        digits = re.sub(r'\D', '', club.get('phone') or '')
        return digits[-9:] if len(digits) >= 9 else None

    merged, matched = [], set()
    for m in manual:
        hit = next((i for i, v in enumerate(vac_clubs)
                    if i not in matched
                    and (c.similar_names(_club_key(m['name']), _club_key(v['name']))
                         or (phone(m) and phone(m) == phone(v)))), None)
        v = vac_clubs[hit] if hit is not None else {}
        if hit is not None:
            matched.add(hit)
        merged.append({
            'name': m['name'],
            'website': m['website'] or v.get('website'),
            'phone': m['phone'] or v.get('phone'),
            'email': v.get('email'),
            'name_vac': v.get('name_vac'),
            'source': 'clubs.json + VAC' if v else 'clubs.json',
        })
    merged += [dict(v, source='VAC') for i, v in enumerate(vac_clubs) if i not in matched]
    return merged


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

    # Centre-ville (mairie) de la ville VAC, pour la fiche « centre-ville ».
    if situation.get('city'):
        city_center = citymod.locate(situation['city'], situation.get('department_code'),
                                     situation.get('distance_km'), lat, lon)
    else:
        city_center = {'reason': 'pas de ville VAC — fiche centre-ville à décider à la main'}

    activities = c.load_activities()
    if 'latitude' in city_center:
        # Une fiche de la ville existe peut-être déjà, hors de la bbox du terrain :
        # tout ce qui est à moins de 1 km de la mairie, et ce qui en porte le nom
        # avec « centre » ou « ville » (« Bergerac - Vieille Ville » n'est pas
        # forcément à la mairie).
        town = c.norm(city_center['name'])

        def is_candidate(a):
            p = a.get('position') or {}
            if p.get('latitude') is None:
                return False
            d = c.dist_km(city_center['latitude'], city_center['longitude'],
                          p['latitude'], p['longitude'])
            n = c.norm(a.get('name'))
            return d <= c.CITY_CARD_MATCH_KM or (
                d <= 5 and town in n and re.search(r'\b(?:centre|ville)\b', n))

        city_center['existing'] = [{'id': a.get('id'), 'name': a.get('name'),
                                    'type': a.get('type', [])}
                                   for a in activities if is_candidate(a)]
    nearby = []
    for a in activities:
        pos = a.get('position') or {}
        alat, alon = pos.get('latitude'), pos.get('longitude')
        if alat is None or alon is None:
            continue
        # Un repère vu du ciel (`poi`) compte jusqu'à 50 km : ne pas le recréer.
        far_poi = ('poi' in (a.get('type') or [])
                   and c.dist_km(lat, lon, alat, alon) <= c.POI_AERIAL_RADIUS_KM)
        if not (c.in_bbox(alat, alon, box) or far_poi):
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

    # Clubs basés : le point ACB de la VAC fait référence (mesuré sur 60 terrains
    # tirés au sort dont la VAC a pu être lue : ~45 listes exploitables, ~80 clubs,
    # toutes disciplines — avion, planeur, ULM, parachutisme, modélisme, et les
    # associations locales qu'aucun annuaire fédéral ne regroupe). Les deux
    # sources servent : `scripts/clubs.json`, tenu à la main, porte des noms déjà
    # relus et des sites, la VAC porte les contacts — et, de loin en loin, un
    # site elle aussi (LFOO, LFIR, LFNH). Cf. `merge_clubs`.
    manual = []
    if os.path.exists(c.CLUBS_JSON):
        manual = [{'name': x['name'], 'website': x.get('website') or None,
                   'phone': x.get('phone') or None}
                  for x in json.load(open(c.CLUBS_JSON)) if x.get('base_icao') == icao]
    vac_clubs = situation.get('clubs') or []
    clubs = merge_clubs(manual, vac_clubs)
    clubs_info = {
        'sources': [s for s, n in (('clubs.json', len(manual)), ('VAC', len(vac_clubs))) if n],
        'raw': situation.get('clubs_raw'),
        'note': situation.get('clubs_note'),
        'vac_count': len(vac_clubs),
        'manual_count': len(manual),
    }

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
        'city_center': city_center,
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
        'clubs_info': clubs_info,
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
    cc = ctx['city_center']
    if 'latitude' in cc:
        A(f"CENTRE-VILLE    : {cc['name']} — {cc['point']} {cc['latitude']}, {cc['longitude']}, "
          f"{cc['distance_km']} km du terrain, {cc['population']} hab. [confiance : {cc['confidence']}]")
        for a in cc['existing']:
            A(f"  déjà en base à moins de {c.CITY_CARD_MATCH_KM:g} km : {a['name']}  "
              f"[{'/'.join(a['type'])}]  ({a['id']})")
    else:
        A(f"CENTRE-VILLE    : ⚠ {cc['reason']}")
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
    ci = ctx['clubs_info']
    A(f"CLUBS ({len(ctx['clubs'])}) — source : {' + '.join(ci['sources']) or 'aucune'} "
      "— liste de référence, ne pas la deviner :")
    for club in ctx['clubs'] or []:
        A(f"  - {club['name']}  [{club['source']}]")
        A(f"      site : {club['website'] or '(à chercher)'}  "
          f"| tél : {club['phone'] or '-'}  | mail : {club.get('email') or '-'}")
        if club.get('name_vac') and club['name_vac'] != club['name']:
            A(f"      VAC : « {club['name_vac']} » — nom recomposé pour la recherche web")
    # Deux sources qui ne se recoupent pas entièrement : soit les clubs diffèrent
    # vraiment, soit un rapprochement de noms a échoué. Ne le dire que dans ce cas.
    if len(ctx['clubs']) > max(ci['manual_count'], ci['vac_count']):
        A(f"  {ci['manual_count']} club(s) dans clubs.json, {ci['vac_count']} dans la VAC, "
          f"{len(ctx['clubs'])} après rapprochement — vérifier qu'aucun club n'est listé "
          'deux fois sous deux orthographes.')
    if ci['note']:
        A(f"  ⚠ {ci['note']}")
    if not ctx['clubs']:
        A('  (aucun club nommé — chercher sur le web et recouper)')
    # La mise en forme du point ACB varie trop pour un découpage fiable (mesuré :
    # ~40 noms faux sur 730 — horaires, libellés, notes accolées au nom suivant).
    # Le bloc brut est donc toujours montré, et c'est lui qui fait foi.
    if ci['raw']:
        A(f"  point ACB brut (fait foi sur le découpage ci-dessus) : « {ci['raw']} »")
    A('')
    A(f"ACTIVITÉS DÉJÀ EN BASE dans la bbox, et `poi` à {c.POI_AERIAL_RADIUS_KM:g} km "
      f"({len(ctx['existing_activities'])}) — "
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

    # Pistes pour les agents d'activités (OSM, JpRNavMaster, My Maps) : ~1 à 2 min,
    # Overpass étant lent. Inutile pour une reprise ou le seul agent aérodrome.
    if '--no-sources' in sys.argv or set(agents) <= {'airfield', 'clubs'}:
        print('\nPistes : non régénérées' + (f" (fichier existant : {c.tmp_path(icao, 'sources.json')})"
                                           if os.path.exists(c.tmp_path(icao, 'sources.json')) else ''))
    else:
        src, _ = sourcesmod.run(icao)
        print('\n' + sourcesmod.report(src))

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
