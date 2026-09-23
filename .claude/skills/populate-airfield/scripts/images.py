"""Étape 2.6 — contrôle les images candidates et promeut celles qui répondent 200.

    python3 .claude/skills/populate-airfield/scripts/images.py LFBJ

Quand un hôte d'images est saturé (Wikimedia répond 429 à plusieurs agents qui
l'interrogent en parallèle), les agents ne peuvent pas vérifier leurs URLs. Plutôt
que de les perdre, ils les consignent dans `image_candidates` (activity-format.md
§ Image). Ce script les reprend **une à une, en séquence** — un seul client, donc
plus de rate-limit — sur la fiche aérodrome et sur chaque activité :

  - la première candidate qui répond 200 devient le nœud `image` (en tête de la
    description d'une activité, en fin de celle de l'aérodrome) ;
  - une candidate qui répond 404/403 est fausse : écartée ;
  - une candidate encore en 429 / erreur réseau est conservée pour un prochain passage.

La clé `image_candidates` disparaît dès qu'il ne reste rien à retenter : elle ne doit
pas partir à l'import (validate.py la signale).

Les activités sont mises à jour dans le fichier fusionné **et** dans leur fichier
d'agent (même `id`), pour ne pas créer de faux écart de relecture (review_state).
Code de retour 1 s'il reste des candidates à retenter.
"""
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

RETRY_LATER = 'retry'


def check(cand):
    """→ ('ok' | 'bad' | RETRY_LATER, statut)."""
    status = c.http_status(cand.get('src') or '')
    if status == 200:
        return 'ok', status
    if status == 429 or str(status).startswith('ERREUR'):
        return RETRY_LATER, status
    return 'bad', status


def resolve(item, label, at_end=False):
    """Traite les candidates d'une fiche. → (promue ?, candidates restantes)."""
    cands = item.get('image_candidates')
    if not cands:
        return False, 0
    doc = item.setdefault('description', {'type': 'doc', 'content': []})
    content = doc.setdefault('content', [])
    if c.image_srcs(doc):
        print(f'  = {label} : a déjà une image — candidates abandonnées')
        del item['image_candidates']
        return False, 0
    remaining = []
    for cand in cands:
        verdict, status = check(cand)
        if verdict == 'ok':
            node = {'type': 'image', 'attrs': {'src': cand['src'], 'alt': cand.get('alt'),
                                               'title': None}}
            content.append(node) if at_end else content.insert(0, node)
            print(f'  ✓ {label} : {cand["src"]}')
            del item['image_candidates']
            return True, 0
        if verdict == RETRY_LATER:
            remaining.append(cand)
        print(f'  {"…" if verdict == RETRY_LATER else "✗"} {label} : HTTP {status}  {cand.get("src")}')
    if remaining:
        item['image_candidates'] = remaining
    else:
        del item['image_candidates']
    return False, len(remaining)


def main():
    icao = c.icao_arg()
    promoted = pending = 0

    af_path = c.tmp_path(icao, 'airfield.json')
    if os.path.exists(af_path):
        airfield = json.load(open(af_path))
        if airfield.get('image_candidates'):
            ok, left = resolve(airfield, 'aérodrome', at_end=True)
            promoted += ok
            pending += left
            json.dump(airfield, open(af_path, 'w'), ensure_ascii=False, indent=2)

    merged_path = c.tmp_path(icao, 'activities.json')
    if not os.path.exists(merged_path):
        c.die(f'{merged_path} introuvable — lancer merge.py d\'abord.')
    merged = json.load(open(merged_path))
    updated = {}
    for a in merged:
        if a.get('image_candidates'):
            ok, left = resolve(a, a.get('name', a.get('id', '?')))
            promoted += ok
            pending += left
            updated[a.get('id')] = a
    json.dump(merged, open(merged_path, 'w'), ensure_ascii=False, indent=2)

    # Même résultat dans les fichiers d'agents, pour que review_state n'y voie pas une relecture.
    for path in sorted(glob.glob(c.tmp_path(icao, 'activities-*.json'))):
        batch = json.load(open(path))
        hit = False
        for i, a in enumerate(batch):
            if a.get('id') in updated:
                batch[i] = updated[a['id']]
                hit = True
        if hit:
            json.dump(batch, open(path, 'w'), ensure_ascii=False, indent=2)

    missing = sum(1 for a in merged if not c.has_image(a))
    print(f'\n{promoted} image(s) promue(s) ; {pending} candidate(s) à retenter plus tard ; '
          f'{missing}/{len(merged)} activité(s) encore sans image.')
    if pending:
        print('  → relancer images.py dans quelques minutes (hôte saturé ou injoignable).')
    sys.exit(1 if pending else 0)


if __name__ == '__main__':
    main()
