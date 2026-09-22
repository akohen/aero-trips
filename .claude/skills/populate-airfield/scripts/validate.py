"""Étape 3 — contrôles automatiques sur les fichiers produits.

    python3 .claude/skills/populate-airfield/scripts/validate.py LFBJ

Ne vérifie que ce qui est mécanique ; le jugement éditorial (style factuel,
anglicismes, noms verbatim, provenance réelle d'une image) reste à la relecture,
guidée par prompts/activity-format.md.

Trois contrôles :
  1. Structure ProseMirror + clés autorisées côté aérodrome.
  2. Images : réponse HTTP, URL à token, agrégateur. La provenance n'est PAS
     jugée ici — la règle unique est celle d'prompts/activity-format.md, qui
     accepte l'image du sujet lui-même quel que soit l'hébergeur (CDN de CMS,
     maison-mère…). Le script classe donc en OK / REJET / À JUGER.
  3. Distances au point de référence AIP, par rapport au rayon de la catégorie.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

AIRFIELD_ALLOWED_KEYS = {'codeIcao', 'website', 'toilet', 'fuels', 'nightVFR', 'description'}

# URLs signées / à durée de vie limitée : expireront avant même la recopie sur
# le serveur de l'application (cf. activity-format.md).
TOKEN_RX = re.compile(r'[?&](x-amz-|token=|signature=|sig=|expires=|key-pair-id=|se=&|sp=)', re.I)
# Agrégateurs / avis : provenance de la photo indéterminable.
AGGREGATORS = ('tripadvisor.', 'booking.com', 'expedia.', 'yelp.', 'airbnb.',
               'hotels.com', 'agoda.', 'trivago.', 'lastminute.', 'thefork.')

VALID_TYPES = set(c.TYPE_CATEGORY)

# Indices de reformulation d'un `name` (cf. prompts/activity-format.md § Nom).
PROMO_WORDS = ('incontournable', 'celebre', 'magnifique', 'superbe', 'authentique', 'charmant',
               'reputee', 'repute', 'emblematique', 'exceptionnel', 'incomparable', 'joyau',
               'meilleur', 'typique', 'pittoresque')
# "… (Gordes)" ou "… — Carpentras" : désambiguïsation accolée.
SUFFIX_RX = re.compile(r'\((?!\d)[^)]{2,}\)\s*$|\s[—–-]\s+.+$')

problems = []


def check_name(name, city):
    """Signale les noms qui portent la marque d'une reformulation."""
    if not name:
        return
    n = c.norm(name)
    for w in PROMO_WORDS:
        if w in n.split():
            problem(f'nom {name!r} : contient « {w} » — qualificatif promotionnel, '
                    'le `name` se recopie verbatim.')
            break
    m = SUFFIX_RX.search(name.strip())
    if m:
        tail = m.group(0).strip()
        # Un suffixe qui reprend la ville est presque toujours une désambiguïsation ajoutée.
        hint = ' (reprend la ville)' if city and c.norm(city) in c.norm(tail) else ''
        problem(f'nom {name!r} : suffixe accolé « {tail} »{hint} — vérifier qu\'il figure bien '
                'dans le nom d\'origine, sinon revenir au nom de la source.')


def problem(msg):
    problems.append(msg)
    print(f'  ✗ {msg}')


def check_doc(doc, where):
    """Contrôles structurels ProseMirror (cf. prompts/schema.md)."""
    if doc is None:
        return
    if not isinstance(doc, dict) or doc.get('type') != 'doc':
        problem(f'{where} : `description` doit être un nœud racine {{"type":"doc"}}.')
        return
    for node in c.iter_nodes(doc, skip_marks=True):
        t = node.get('type')
        if t == 'paragraph':
            if not isinstance(node.get('content'), list) or not node['content']:
                problem(f'{where} : nœud `paragraph` sans `content` (tableau non vide).')
        elif t == 'image':
            if 'content' in node:
                problem(f'{where} : nœud `image` avec une clé `content` (interdite).')
            if not node.get('attrs', {}).get('src'):
                problem(f'{where} : nœud `image` sans `attrs.src`.')
        elif t == 'link':
            problem(f'{where} : nœud `link` autonome — un lien est un `mark` sur un nœud `text`.')
        elif t == 'text':
            if not isinstance(node.get('text'), str):
                problem(f'{where} : nœud `text` sans clé `text`.')
            for mark in node.get('marks') or []:
                if mark.get('type') == 'link' and not mark.get('attrs', {}).get('href'):
                    problem(f'{where} : mark `link` sans `attrs.href`.')


def classify_url(url):
    low = url.lower()
    if TOKEN_RX.search(low):
        return 'REJET', 'URL signée / à token — expirera'
    if any(h in low for h in AGGREGATORS):
        return 'REJET', 'agrégateur / site d\'avis — provenance indéterminable'
    if low.startswith('https://upload.wikimedia.org/'):
        return 'OK', 'Wikimedia Commons'
    if 'commons.wikimedia.org/wiki/' in low:
        return 'REJET', 'URL de page Commons — utiliser l\'URL de fichier upload.wikimedia.org'
    if not low.startswith('https://'):
        return 'REJET', 'non https'
    if 'googleusercontent.com' in low:
        return 'À JUGER', 'Google : photo du sujet (fiche Business) OK, contributeur anonyme non'
    return 'À JUGER', 'vérifier que l\'image appartient bien au sujet (activity-format.md)'


def main():
    icao = c.icao_arg()
    entry = c.load_airfield(icao)
    clat, clon = c.center(entry)

    af_path, act_path = c.tmp_path(icao, 'airfield.json'), c.tmp_path(icao, 'activities.json')
    airfield = json.load(open(af_path)) if os.path.exists(af_path) else None
    activities = json.load(open(act_path)) if os.path.exists(act_path) else None
    if airfield is None and activities is None:
        c.die(f'ni {af_path} ni {act_path} — rien à valider.')

    # --- 1. Structure ---
    print('=== Structure ===')
    if airfield is not None:
        extra = set(airfield) - AIRFIELD_ALLOWED_KEYS
        if extra:
            problem(f'aérodrome : clés interdites {sorted(extra)} '
                    '(les infos clubs/gestionnaire vont dans le texte, pas en clés JSON).')
        if airfield.get('codeIcao') != icao:
            problem(f'aérodrome : codeIcao={airfield.get("codeIcao")!r}, attendu {icao!r}.')
        check_doc(airfield.get('description'), 'aérodrome')
    ctx_path = c.tmp_path(icao, 'context.json')
    city = json.load(open(ctx_path)).get('city') if os.path.exists(ctx_path) else None
    for a in activities or []:
        check_name(a.get('name'), city)
        where = f'activité {a.get("name", a.get("id", "?"))!r}'
        for key in ('id', 'name', 'position', 'type'):
            if not a.get(key):
                problem(f'{where} : champ `{key}` manquant.')
        bad = set(a.get('type') or []) - VALID_TYPES
        if bad:
            problem(f'{where} : type(s) inconnu(s) {sorted(bad)}.')
        check_doc(a.get('description'), where)
    if not problems:
        print('  ✓ rien à signaler')

    # --- 2. Images ---
    print('\n=== Images ===')
    srcs = []
    if airfield is not None:
        srcs += [(s, 'aérodrome') for s in c.image_srcs(airfield.get('description'))]
    for a in activities or []:
        srcs += [(s, a.get('name', '?')) for s in c.image_srcs(a.get('description'))]
    for url, owner in srcs:
        verdict, why = classify_url(url)
        status = c.http_status(url)
        ok = status == 200
        if not ok:
            problem(f'image de {owner} : HTTP {status} — retrouver l\'URL réelle '
                    '(API Commons pour Wikimedia) ou retirer le nœud `image`.')
        elif verdict == 'REJET':
            problem(f'image de {owner} : {why}.')
        mark = '✓' if ok and verdict == 'OK' else ('?' if ok else '✗')
        print(f'  {mark} HTTP {status:<4} provenance {verdict:<8} {owner}')
        print(f'      {why}')
        print(f'      {url}')
    if not srcs:
        print('  (aucune image)')
    n_missing = sum(1 for a in (activities or []) if not c.has_image(a))
    if activities:
        print(f'\n  {n_missing}/{len(activities)} activité(s) sans image.')

    # --- 3. Distances ---
    if activities:
        print('\n=== Distance au point de référence AIP (décroissante) ===')
        print('  NB : le point AIP peut être à ~1 km du parking avions ; le rayon est')
        print('  indicatif, pas un couperet. Vérifier surtout la cohérence lieu ↔ coordonnées.')
        rows = []
        for a in activities:
            p = a.get('position') or {}
            if p.get('latitude') is None:
                continue
            d = c.dist_km(clat, clon, p['latitude'], p['longitude'])
            limit = c.radius_for(a.get('type'))
            rows.append((d, a.get('name'), '/'.join(a.get('type') or []), limit))
        for d, name, types, limit in sorted(rows, reverse=True):
            over = d > limit + c.RADIUS_TOLERANCE_KM
            print(f'  {d:5.1f} km  (max {limit} km)  [{types}]  {name}'
                  + ('   <-- HORS RAYON' if over else ''))
            if over:
                problem(f'{name!r} à {d:.1f} km : au-delà du rayon {limit} km '
                        f'(+{c.RADIUS_TOLERANCE_KM} km de tolérance) — coordonnées erronées ?')

    print(f'\n=== Bilan : {len(problems)} problème(s) ===')
    for p in problems:
        print(f'  - {p}')
    if not problems:
        print('  ✓ fichiers valides :', ', '.join(p for p in (af_path, act_path) if os.path.exists(p)))
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
