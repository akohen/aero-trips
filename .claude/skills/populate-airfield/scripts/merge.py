"""Étape 2.5 — fusionne les fichiers d'activités des agents et signale les doublons.

    python3 .claude/skills/populate-airfield/scripts/merge.py LFBJ

Lit tmp/{ICAO}-activities-*.json, écrit tmp/{ICAO}-activities.json.

Deux niveaux de doublons :
  - entre agents        → écartés (un même lieu trouvé deux fois n'a aucun intérêt) ;
  - contre la base      → seulement SIGNALÉS. La relecture manuelle tranche : le
                          rapprochement par nom reste heuristique et écarter à tort
                          une activité coûte plus cher que la signaler.

Les `id` portent un suffixe aléatoire : dédupliquer par `id` ne suffit pas. Et la
proximité seule ne suffit pas non plus — au même point (terminal, gare, port)
coexistent des services distincts. D'où le croisement nom + position.
"""
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

CLOSE_DEG = 0.0005  # ~55 m


def close(a_lat, a_lon, b_lat, b_lon):
    if None in (a_lat, a_lon, b_lat, b_lon):
        return False
    return abs(a_lat - b_lat) < CLOSE_DEG and abs(a_lon - b_lon) < CLOSE_DEG


def pos_of(a):
    p = a.get('position') or {}
    return p.get('latitude'), p.get('longitude')


def main():
    icao = c.icao_arg()
    files = sorted(glob.glob(c.tmp_path(icao, 'activities-*.json')))
    if not files:
        c.die(f'aucun fichier tmp/{icao}-activities-*.json — les agents ont-ils tourné ?')

    seen, merged, dropped = [], [], []
    for path in files:
        try:
            batch = json.load(open(path))
        except json.JSONDecodeError as e:
            c.die(f'{path} : JSON invalide — {e}')
        if not isinstance(batch, list):
            c.die(f'{path} : un tableau JSON est attendu.')
        for a in batch:
            name = c.norm(a.get('name', ''))
            lat, lon = pos_of(a)
            hit = next((s for s in seen
                        if (name and s[0] == name)
                        or (close(lat, lon, s[1], s[2]) and c.similar_names(name, s[0]))), None)
            if hit:
                dropped.append((a.get('name'), os.path.basename(path), hit[3]))
                continue
            seen.append((name, lat, lon, a.get('name')))
            merged.append(a)

    out = c.tmp_path(icao, 'activities.json')
    json.dump(merged, open(out, 'w'), ensure_ascii=False, indent=2)
    print(f'{len(merged)} activité(s) fusionnée(s) depuis {len(files)} fichier(s) → {out}')
    for name, src, kept in dropped:
        print(f'  doublon inter-agents écarté : {name!r} ({src}) — déjà retenu comme {kept!r}')

    # --- Rapprochement avec les activités déjà en base (signalement seul) ---
    ctx_path = c.tmp_path(icao, 'context.json')
    if not os.path.exists(ctx_path):
        print(f'\n(pas de {ctx_path} : contrôle des doublons avec la base ignoré — '
              'lancer context.py)')
        return
    existing = json.load(open(ctx_path)).get('existing_activities', [])
    flags = []
    for a in merged:
        name = c.norm(a.get('name', ''))
        lat, lon = pos_of(a)
        for e in existing:
            same_name = c.similar_names(name, c.norm(e.get('name', '')))
            near = close(lat, lon, e.get('latitude'), e.get('longitude'))
            if same_name or near:
                why = 'nom proche' if same_name and not near else (
                    'même position' if near and not same_name else 'nom + position')
                flags.append((a.get('name'), e.get('name'), e.get('id'), why))
                break
    print(f'\n=== Doublons possibles avec la base ({len(flags)}) ===')
    for new, old, oid, why in flags:
        print(f'  {new!r}  ≈  {old!r} ({oid})  [{why}] — à trancher en relecture')
    if not flags:
        print('  (aucun)')


if __name__ == '__main__':
    main()
