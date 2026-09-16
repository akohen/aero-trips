"""Étape 5 — applique la ligne SUPPRIMER d'un bloc de retours de relecture.

    python3 .claude/skills/populate-airfield/scripts/prune.py LFBJ id-1 id-2 ...

Retire les activités listées de tmp/{ICAO}-activities.json ET des fichiers
tmp/{ICAO}-activities-*.json d'origine, sinon une nouvelle fusion (merge.py) les
ferait réapparaître.
"""
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402


def main():
    icao = c.icao_arg()
    ids = {x.strip().strip(',') for x in sys.argv[2:] if x.strip().strip(',')}
    if not ids:
        c.die('aucun id fourni — usage : prune.py ICAO id-1 id-2 ...')

    merged_path = c.tmp_path(icao, 'activities.json')
    if not os.path.exists(merged_path):
        c.die(f'{merged_path} introuvable.')

    known = {a.get('id') for a in json.load(open(merged_path))}
    unknown = ids - known
    if unknown:
        print(f'⚠ id(s) absent(s) de {merged_path} : {sorted(unknown)}')

    total = 0
    for path in [merged_path] + sorted(glob.glob(c.tmp_path(icao, 'activities-*.json'))):
        acts = json.load(open(path))
        kept = [a for a in acts if a.get('id') not in ids]
        if len(kept) != len(acts):
            json.dump(kept, open(path, 'w'), ensure_ascii=False, indent=2)
            print(f'  {len(acts) - len(kept)} retirée(s) de {path} ({len(kept)} restante(s))')
            total += len(acts) - len(kept)
    print(f'{total} suppression(s) appliquée(s).')


if __name__ == '__main__':
    main()
