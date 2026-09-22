"""Carte VAC (SIA) — extraction du bloc « Informations diverses / Miscellaneous ».

La dernière page d'une carte VAC porte un bloc normalisé « Informations diverses /
Miscellaneous » dont le point 1 donne la ville notable de référence, qui n'est pas
toujours la commune d'implantation :

    1 - Situation / Location : 4 km WNW Versailles (78 - Yvelines).

C'est la bonne source pour le nom de ville à utiliser dans les recherches web :
`name` en base est le nom de l'aérodrome en majuscules ("DIEPPE SAINT AUBIN"),
pas un nom de ville exploitable.

Le même bloc donne le point 3 « VFR de nuit / Night VFR », le point 10 « AVT »
(avitaillement) et le point « ACB » (clubs basés), d'où `night_vfr`, `fuels` et
`clubs`.

L'extraction de texte du PDF place la **valeur avant son libellé** (mise en page en
deux colonnes), d'où des regex qui remontent en arrière depuis le marqueur numéroté.

Le **numéro** d'un point varie d'un terrain à l'autre (ACB est 15 ici, 12 là ;
LFPZ numérote 16 « Transports » quand LFMA y met « Restaurants ») : seul le
**libellé** est stable, c'est donc lui qui sert de point d'ancrage.

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

# "4 km WNW Versailles (78 - Yvelines)." — mesuré sur les 418 cartes publiées,
# presque chaque morceau varie : unité (« Km », « NM »), cap absent ou écrit
# « S-E », « E/SE », « N-N/W », « ESE-Valence », ville précédée de « de » ou
# de « - », département avant ou après son nom (« (Somme - 80) », « (2B - Haute
# Corse) », « (2A Corse du Sud) »), et une queue après la parenthèse (LFRD
# « … Vilaine). HN »). La parenthèse, elle, est toujours là.
SITUATION_RX = re.compile(
    r'^[\s:]*([\d.,]+)\s*((?i:km|nm))\s+'
    r'(?:([NSEWO](?:[\s/-]?[NSEWO]){0,2})\b\s*[-–]?\s*)?'
    r'(?:de\s+|d[\'’])?'
    r'(.+?)\s*\(([^)]*)\)'
)
DEPT_CODE = r'(2\s?[AB]|\d{2,3})'


def parse_situation(raw):
    """Ligne « Situation / Location » → dict, ou None si elle ne se lit pas."""
    m = SITUATION_RX.match(raw)
    if not m:
        return None
    dist, unit, bearing, city, dept = m.groups()
    km = float(dist.replace(',', '.')) * (1.852 if unit.lower() == 'nm' else 1)
    # LFLB « 8,3 km NNW Chambéry - 6,5 km SW Aix Les Bains » : la première
    # ville est la ville de référence.
    city = re.split(r'\s*[-–,]\s+[\d.,]+\s*(?i:km|nm)\b', city)[0].strip(' -–')
    dept = dept.strip()
    code, name = None, dept
    if d := re.match(DEPT_CODE + r'\b\s*[-–—]?\s*(.*)$', dept):
        code, name = d.groups()
    elif d := re.match(r'(.*?)\s*[-–—]?\s*' + DEPT_CODE + r'$', dept):
        name, code = d.groups()
    if code:
        code = re.sub(r'\s', '', code).upper()
    return {
        'city': city,
        'distance_km': round(km, 1),
        'bearing': re.sub(r'[^NSEWO]', '', bearing).replace('O', 'W') if bearing else None,
        'department_code': code,
        'department': name.strip(' -–—') or None,
    }


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


MARKER_RX = re.compile(r'(\d{1,2})\s*-')

# Pied de page / en-tête répétés à chaque page du PDF : quand un point est à
# cheval sur deux pages, ils atterrissent au milieu de la valeur.
FOOTER_RX = re.compile(
    r'AMDT\s*\d{2}/\d{2}'
    r'|©\s*Service de l[\'’]Information A[ée]ronautique,?\s*France'
    r'|AD\s*2\s*[A-Z]{4}\s*TXT\s*\d*'
    r'|AIP\s+FRANCE'
    r'|\b\d{2}\s+[A-Z]{3}\s+\d{4}\b'
)


def _chain(text):
    """Marqueurs « 1 - », « 2 - »… du bloc, dans l'ordre.

    Un « 14 - » tombé au milieu d'un numéro de téléphone casserait la
    numérotation : ne retenir que la suite croissante l'élimine. Sans ce filtre,
    la valeur lue démarre au mauvais endroit et sort tronquée en plein mot
    (constaté sur LFKG, LFNH, LFNU, LFCT).
    """
    out, expect = [], 1
    for m in MARKER_RX.finditer(text):
        if int(m.group(1)) == expect:
            out.append(m)
            expect += 1
    return out


def _item(text, label_rx):
    """Valeur du point portant ce libellé → (numéro, valeur, tronquée ?).

    `tronquée` signale qu'un pied de page s'est glissé dans la valeur : le point
    était à cheval sur deux pages et ce qui reste n'est pas fiable.
    """
    chain = _chain(text)
    for i, m in enumerate(chain):
        head = text[chain[i - 1].end() if i else max(0, m.start() - 500):m.start()]
        label = re.search(label_rx + r'\s*:?\s*$', head)
        if not label:
            continue
        value = head[:label.start()]
        cut = FOOTER_RX.sub(' ', value)
        truncated = cut != value
        # Les retours à la ligne sont conservés : `parse_night_vfr` ne lit que la
        # dernière ligne du bloc, la valeur y étant sur sa propre ligne.
        lines = [re.sub(r'\s*←\s*|[ \t]+', ' ', ln).strip() for ln in cut.splitlines()]
        return int(m.group(1)), '\n'.join(ln for ln in lines if ln), truncated
    return None, None, False


def parse_night_vfr(text):
    """Point 3 — True / False / None (non renseigné)."""
    _, block, _ = _item(text, r'VFR de nuit\s*/\s*Night\s*VFR')
    if not block:
        return None, None
    value = block.splitlines()[-1]
    low = value.lower()
    if re.search(r'\bnon\s+agr[ée]{2}|not\s+approved', low):
        return False, value
    if re.search(r'\bagr[ée]{2}\b|\bapproved\b', low):
        return True, value
    # "NIL." et tout autre libellé : non renseigné, on ne touche pas au champ.
    return None, value


def parse_fuels(text):
    """Point 10 (AVT) — liste de carburants, [] si NIL, None si illisible."""
    _, block, _ = _item(text, r'AVT')
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


# Coordonnées d'un club telles que la VAC les écrit, tous séparateurs confondus
# (« TEL : », « TEL/FAX : », « E-mail : », « Site : », parfois rien du tout).
CONTACT_RX = re.compile(
    r'(?:T[EÉée][LlIi]|FAX|Portable|Mobile)\s*(?:/\s*FAX\s*)?[:/]?\s*[\d\s().+/–-]{8,}'
    # « E- mail » : l'extraction PDF glisse parfois une espace dans le libellé.
    r'|(?:E\s*-?\s*mail\s*[:/]?\s*)?[\w.+-]+@[\w.-]+'
    # Le site, avec ou sans libellé — « Site : », « site web : », « site inter net
    # / website : » (l'extraction coupe « internet » en deux). Le libellé est
    # absorbé avec l'URL, sinon il resterait tout seul et passerait pour un nom.
    r'|(?:site\s*(?:web|inter\s*net)?\s*/?\s*(?:website)?\s*[:/]\s*)?(?:https?://|www\.)\S+'
    # Même chose quand le domaine arrive nu (LFNH « … website : acdcv.com »).
    r'|site\s*(?:web|inter\s*net)?\s*/?\s*(?:website)?\s*[:/]\s*\S+'
    # Numéro français posé sans « TEL : » devant.
    r'|\b0\d(?:[\s.–-]?\d\d){4}\b',
    re.I)
PHONE_RX = re.compile(r'[\d][\d\s().+/–-]{7,}')
EMAIL_RX = re.compile(r'[\w.+-]+@[\w.-]+')
# Le site, quand la VAC en donne un : URL complète (LFOO), URL précédée de son
# libellé (LFIR « Site internet : http://acrevel.fr »), ou simple domaine
# (LFNH « acdcv.com », LFET « www.reveailetoi.fr »).
WEBSITE_RX = re.compile(
    r'(?:https?://|www\.)\S+'
    r'|\b[\w-]+(?:\.[\w-]+)*\.(?:fr|com|net|org|eu|info|asso\.fr)\b(?:/\S*)?',
    re.I)
# L'adresse postale suit le nom du club sans ponctuation fiable : on coupe au
# code postal, ou au mot qui ouvre une adresse.
ADDRESS_RX = re.compile(
    r'[,–-]?\s*(?:\b\d{5}\b'
    # Le numéro de voie est parfois séparé du nom de la voie par une virgule
    # (« - 300, rue Maurice Delpouys ») : il part avec l'adresse, pas avec le nom.
    r'|(?:\d{1,4}\s*[,–-]?\s*)?(?:rue|chemin|route|avenue|av\.|bd|boulevard|impasse|all[ée]e|place|BP|'
    r'A[ée]rodrome|A[ée]roport)\b'
    r'|\bAD\s+(?=[A-Z])).*$',
    re.I)
# Queues qui ne font pas partie du nom : un renvoi en guise de téléphone
# (« TEL : voir exploitant »), des horaires (« - HJ », « HJ SAM et DIM
# uniquement », « 0800-1500 tous les jours »).
TAIL_RX = re.compile(
    r'\s*(?:(?:TEL|FAX|E-?mail)\s*[:/]?\s*(?:voir|see)\b.*'
    r'|[-–]?\s*\bHJ\b.*'
    r'|\b\d{4}\s*-\s*\d{4}\b.*'
    r'|[-–]\s*(?:HN|H24|O/R\b.*))\s*$',
    re.I)
# Valeurs qui ne nomment aucun club (« NIL. », « Divers de la région parisienne »).
EMPTY_RX = re.compile(r'\s*(?:NIL|Divers.*|N[ée]ant)?\s*\.?\s*$', re.I)


def _website(raw):
    """URL du club telle qu'on peut la soumettre à `check_url.py`.

    La VAC écrit parfois le domaine nu (« acdcv.com ») : on préfixe alors en
    `https`. Un `http://` explicite est conservé tel quel — c'est `check_url.py`
    qui suivra la redirection et donnera l'URL effective.
    """
    url = raw.strip().rstrip('.,;:)')
    if not re.match(r'^https?://', url, re.I):
        url = 'https://' + url
    return url


def _club_name(raw):
    """Fragment de la VAC → (nom cherchable, fragment nettoyé), ou None.

    « ACB » est le **libellé du point** : le nom qui suit s'y rattache et arrive
    donc amputé (« de Pérouges », « du Quercy »). La VAC abrège aussi le mot en
    tête de nom. On rétablit « Aéroclub », que le web connaît — l'abréviation
    AIP « ACB », non. Le fragment d'origine est conservé pour que la relecture
    puisse recouper.
    """
    vac = TAIL_RX.sub('', ADDRESS_RX.sub('', raw))
    vac = re.sub(r'\s*\((?:voir|see)[^)]*\)', '', vac, flags=re.I).strip(' .,;:/-–').strip()
    # « E-mail : www.reveailetoi.fr » (LFET) : la VAC étiquette parfois un site
    # comme un courriel. Le libellé resté seul n'est pas un nom de club — le
    # rendre à None rattache la coordonnée au club précédent. Même chose pour un
    # second numéro (« TEL : … ou / or 06… », LFRD, LFQD, LFLA) ou un contact
    # nominatif (« président : 06… », LFGF).
    if not vac or re.fullmatch(
            r'(?:E\s*-?\s*mail|Mail|T[EÉée][LlIi]|FAX|Web|Site(?:\s*(?:web|inter\s*net))?|website'
            r'|ou(?:\s*/\s*or)?|et(?:\s*/\s*and)?|pr[ée]sident)',
            vac, re.I):
        return None
    # Seuls « de / du / des / d' » signalent un nom amputé de son « ACB » : un nom
    # qui s'ouvre sur « Les Ailes… » est déjà complet.
    if re.match(r'^(?:de|du|des|d[\'’])\b', vac, re.I):
        return f'Aéroclub {vac}', vac
    # « ACB Cauchois », « AC de Valenciennes » → la même abréviation, en tête de nom.
    return re.sub(r'^ACB\b\s*|^AC\s+(?=de|du|des|d[\'’])', 'Aéroclub ', vac).strip(), vac


def parse_clubs(text):
    """Point « ACB » — clubs basés → (liste, valeur brute, note).

    Renvoie `(None, ...)` si le point est absent ou illisible, `[]` s'il ne
    nomme personne. Le découpage s'appuie sur les coordonnées : ce qui précède
    un bloc « TEL/E-mail » est un nom, ce qui le suit en est un autre.
    """
    num, block, truncated = _item(text, r'ACB')
    value = ' '.join(block.split()) if block else block
    if value is None:
        return None, None, 'point ACB absent de la carte VAC'
    if truncated:
        return None, value, ('point ACB à cheval sur deux pages — extraction non '
                             'fiable, lire la carte VAC à la main')
    if EMPTY_RX.fullmatch(value):
        return [], value, None

    clubs, cur, pos = [], None, 0

    def start(found):
        name, vac = found
        clubs.append({'name': name, 'name_vac': vac, 'phone': None, 'email': None,
                      'website': None})
        return clubs[-1]

    for m in CONTACT_RX.finditer(value):
        found = _club_name(value[pos:m.start()])
        pos = m.end()
        if found:
            cur = start(found)
        if cur is None:
            continue
        contact = m.group(0)
        email = EMAIL_RX.search(contact)
        site = None if email else WEBSITE_RX.search(contact)
        if email:
            cur['email'] = cur['email'] or email.group(0)
        elif site:
            cur['website'] = cur['website'] or _website(site.group(0))
        else:
            phone = PHONE_RX.search(contact)
            if phone:
                cur['phone'] = cur['phone'] or re.sub(r'\s+', ' ', phone.group(0)).strip(' .,;:/-–')
    tail = _club_name(value[pos:])
    if tail:
        start(tail)
    return clubs, value, None


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

    # Valeur avant le libellé (cartes civiles), ou après (cartes militaires :
    # « 1 - Situation / Location : 2,8 km S Cognac (16 - Charente) »).
    m = re.search(r'([^\n]*?)\s*Situation\s*/?\s*Location\s*:[ \t]*([^\n]*)', text)
    candidates = [v.strip() for v in m.groups() if v.strip()] if m else []
    raw_line = next((v for v in candidates if parse_situation(v)),
                    next((v for v in candidates if not re.fullmatch(r'\d+\s*-', v)), None))
    if raw_line:
        out.update({'found': True, 'raw': raw_line})
        out.update(parse_situation(raw_line) or {})
    else:
        out['reason'] = 'section Situation/Location introuvable'

    nvfr, nvfr_raw = parse_night_vfr(text)
    fuels, fuels_raw = parse_fuels(text)
    clubs, clubs_raw, clubs_note = parse_clubs(text)
    out['clubs'] = clubs
    out['clubs_raw'] = clubs_raw
    out['clubs_note'] = clubs_note
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
