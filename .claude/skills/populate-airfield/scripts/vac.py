"""Carte VAC (SIA) — extraction du bloc « Informations diverses / Miscellaneous ».

La dernière page d'une carte VAC porte un bloc normalisé « Informations diverses /
Miscellaneous » dont le point 1 donne la ville notable de référence, qui n'est pas
toujours la commune d'implantation :

    1 - Situation / Location : 4 km WNW Versailles (78 - Yvelines).

C'est la bonne source pour le nom de ville à utiliser dans les recherches web :
`name` en base est le nom de l'aérodrome en majuscules ("DIEPPE SAINT AUBIN"),
pas un nom de ville exploitable.

Le même bloc donne le point 3 « VFR de nuit / Night VFR » et le point 10 « AVT »
(avitaillement), d'où `night_vfr` et `fuels`.

L'extraction de texte du PDF place la **valeur avant son libellé** (mise en page en
deux colonnes), d'où des regex qui remontent en arrière depuis le marqueur numéroté.

Utilisable en CLI (`python3 vac.py LFPZ`) ou importé (`read(icao)`).
"""
import io
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

UA = 'Mozilla/5.0'
MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

# "4 km WNW Versailles (78 - Yvelines)." — séparateur département variable
# ("24-Dordogne", "87 Haute-Vienne", "50 – Manche"), décimale . ou ,
SITUATION_RX = re.compile(
    r'^\s*([\d.,]+)\s*km\s+([NSEWO]{1,3})\s+(.+?)\s*'
    r'\(\s*(\d{2,3})\s*[-–—]?\s*([^)]*?)\s*\)\s*\.?\s*$'
)


def airac(reference=None):
    """Cycle AIRAC courant, au format attendu par l'URL du SIA (cf. src/data/airac.ts)."""
    cur = datetime(2023, 12, 28, 10, 0, tzinfo=timezone.utc)
    reference = reference or datetime.now(timezone.utc)
    while cur + timedelta(days=28) < reference:
        cur += timedelta(days=28)
    return f'{cur.day:02d}_{MONTHS[cur.month - 1]}_{cur.year}'


def vac_url(icao):
    return (f'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_{airac()}'
            f'/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.{icao}.pdf')


# Carburants : libellés VAC → valeurs du modèle (src/index.d.ts). SP95 = SP98.
FUEL_PATTERNS = [
    (re.compile(r'100\s*LL', re.I), '100LL'),
    (re.compile(r'JET\s*A\s*-?\s*1', re.I), 'JETA1'),
    (re.compile(r'UL\s*91', re.I), 'UL91'),
    (re.compile(r'SP\s*9[58]', re.I), 'SP98'),
]


def _block_before(text, label_rx, num):
    """Texte précédant le marqueur numéroté `<Libellé> :<num> -`.

    Remonte jusqu'au marqueur précédent (num-1), sinon prend une fenêtre courte.
    """
    m = re.search(label_rx + r'\s*:?\s*' + str(num) + r'\s*-', text)
    if not m:
        return None
    head = text[:m.start()]
    prev = None
    for x in re.finditer(r'[\s.:]' + str(num - 1) + r'\s*-', head):
        prev = x
    return (head[prev.end():] if prev else head[-500:]).strip()


def parse_night_vfr(text):
    """Point 3 — True / False / None (non renseigné)."""
    block = _block_before(text, r'VFR de nuit\s*/\s*Night\s*VFR', 3)
    if not block:
        return None, None
    value = block.splitlines()[-1].strip() if block.splitlines() else ''
    low = value.lower()
    if re.search(r'\bnon\s+agr[ée]{2}|not\s+approved', low):
        return False, value
    if re.search(r'\bagr[ée]{2}\b|\bapproved\b', low):
        return True, value
    # "NIL." et tout autre libellé : non renseigné, on ne touche pas au champ.
    return None, value


def parse_fuels(text):
    """Point 10 (AVT) — liste de carburants, [] si NIL, None si illisible."""
    block = _block_before(text, r'AVT', 10)
    if block is None:
        return None, None
    found, seen = [], set()
    for rx, code in FUEL_PATTERNS:
        if rx.search(block) and code not in seen:
            seen.add(code)
            found.append(code)
    if not found and re.search(r'\bNIL\b', block, re.I):
        return [], block
    return (found or None), block


def read(icao, timeout=30):
    """Renvoie un dict décrivant la situation, ou {'found': False, 'reason': ...}.

    Ne lève pas : tous les aérodromes n'ont pas de carte VAC (militaires, privés,
    fermés → 404), et pypdf peut être absent. L'appelant retombe alors sur
    title_case(name).
    """
    url = vac_url(icao)
    try:
        from pypdf import PdfReader
    except ImportError:
        return {'found': False, 'reason': 'pypdf absent (pip install pypdf)', 'url': url}

    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        raw = urllib.request.urlopen(req, timeout=timeout).read()
    except urllib.error.HTTPError as e:
        reason = 'pas de carte VAC publiée' if e.code == 404 else f'HTTP {e.code}'
        return {'found': False, 'reason': reason, 'url': url}
    except Exception as e:
        return {'found': False, 'reason': f'{type(e).__name__}: {e}', 'url': url}

    try:
        reader = PdfReader(io.BytesIO(raw))
    except Exception as e:
        return {'found': False, 'reason': f'PDF illisible ({e})', 'url': url}

    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or '')
        except Exception:
            pages.append('')
    text = '\n'.join(pages)

    out = {'found': False, 'url': url}

    m = re.search(r'([^\n]*?)\s*Situation\s*/\s*Location\s*:', text)
    if m and m.group(1).strip():
        raw_line = m.group(1).strip()
        out.update({'found': True, 'raw': raw_line})
        parsed = SITUATION_RX.match(raw_line)
        if parsed:
            km, bearing, city, dept_code, dept_name = parsed.groups()
            out.update({
                'city': city.strip(),
                'distance_km': float(km.replace(',', '.')),
                'bearing': bearing,
                'department_code': dept_code,
                'department': dept_name.strip() or None,
            })
    else:
        out['reason'] = 'section Situation/Location introuvable'

    nvfr, nvfr_raw = parse_night_vfr(text)
    fuels, fuels_raw = parse_fuels(text)
    out['night_vfr'] = nvfr
    out['night_vfr_raw'] = nvfr_raw
    out['fuels'] = fuels
    out['fuels_raw'] = (fuels_raw or '').replace('\n', ' ')[-220:] or None
    return out


def situation(icao, timeout=30):
    """Compat : ancien nom de `read()`."""
    return read(icao, timeout)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('usage : python3 vac.py ICAO [ICAO...]', file=sys.stderr)
        sys.exit(1)
    for code in sys.argv[1:]:
        print(json.dumps({code.upper(): read(code.upper())}, ensure_ascii=False))
