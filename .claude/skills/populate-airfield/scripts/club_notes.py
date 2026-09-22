"""Étape 1 — contrôle et résumé des notes de l'éclaireur des clubs.

    python3 .claude/skills/populate-airfield/scripts/club_notes.py LFBJ

À lancer juste après l'agent `clubs`, avant les autres : ils lisent
tmp/{ICAO}-club-notes.json, un fichier mal formé les priverait des notes sans
bruit. Affiche ce que l'éclaireur a trouvé ; sort en code 1 sur un problème.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

TOPICS = {'velos', 'voiture', 'taxi', 'ville', 'restaurant', 'carburant', 'accueil', 'autre'}
AGENTS = {'restaurants', 'transport', 'poi', 'other'}


def check(notes):
    problems = []
    for key in ('clubs', 'airfield_facts', 'leads'):
        if not isinstance(notes.get(key), list):
            problems.append(f'`{key}` absent ou pas un tableau')
    for club in notes.get('clubs') or []:
        if not club.get('name'):
            problems.append(f'club sans `name` : {club}')
        site = club.get('website')
        if site and not site.startswith('https://'):
            problems.append(f"{club.get('name')!r} : site non https ({site})")
    for f in notes.get('airfield_facts') or []:
        if f.get('topic') not in TOPICS:
            problems.append(f"fait {f.get('text', '')[:40]!r} : topic {f.get('topic')!r} inconnu")
        if not f.get('source'):
            problems.append(f"fait {f.get('text', '')[:40]!r} : sans `source`")
    for x in notes.get('leads') or []:
        if x.get('for_agent') not in AGENTS:
            problems.append(f"piste {x.get('name')!r} : for_agent {x.get('for_agent')!r} inconnu")
        if not x.get('source'):
            problems.append(f"piste {x.get('name')!r} : sans `source`")
    return problems


def report(notes):
    lines = []
    A = lines.append
    for club in notes.get('clubs') or []:
        A(f"  {club.get('name')} — {club.get('website') or 'pas de site'}"
          f"  ({len(club.get('pages_read') or [])} page(s) lue(s))")
    facts = notes.get('airfield_facts') or []
    A(f'  {len(facts)} info(s) sur le terrain :')
    for f in facts:
        A(f"    [{f.get('topic')}] {f.get('text')}  ({f.get('date') or 'non daté'})")
    leads = notes.get('leads') or []
    A(f'  {len(leads)} piste(s) de lieux :')
    for x in leads:
        A(f"    → {x.get('for_agent')} : {x.get('name')}  ({x.get('date') or 'non daté'})")
    return '\n'.join(lines)


if __name__ == '__main__':
    icao = c.icao_arg()
    path = c.tmp_path(icao, 'club-notes.json')
    if not os.path.exists(path):
        c.die(f"{path} absent — l'agent clubs a-t-il tourné ?")
    try:
        notes = json.load(open(path))
    except json.JSONDecodeError as e:
        c.die(f'{path} illisible : {e}')
    print(f'=== Notes des clubs ({path}) ===')
    print(report(notes))
    problems = check(notes)
    for p in problems:
        print(f'  ✗ {p}')
    sys.exit(1 if problems else 0)
