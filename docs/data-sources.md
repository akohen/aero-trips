# Data sources

External sources that feed (or could feed) AeroTrips, grouped by what they provide. No single
source covers everything: each entry says what it knows that the others don't, and where it falls
short. Add a source here as soon as it is found, even if it is not used yet (→ *Leads*).

Entry fields: **Coverage** (with the date it was measured), **Access** (format, URL pattern),
**Freshness**, **Rights**, **Used by** (script / skill / manual), **Pitfalls**.
Re-check the coverage date before relying on a figure.

## Airfield reference data

### SIA — AIXM 4.5 + XML exports
- Coverage: every French airfield (metropolitan + overseas): position, runways, status.
- Access: `scripts/AIXM4.5_all_FR_OM_<date>.xml`, `scripts/XML_SIA_<date>.xml` (gitignored, 2023-10 / 2024-01 editions).
- Used by: `scripts/data-import.js`, the initial import only (2024-01). Not re-synced since.
- Pitfalls: names are UPPERCASE → `titleCase()`.

### SIA — VAC charts (eAIP Atlas-VAC)
- Access: `https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_{AIRAC}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.{ICAO}.pdf`
  (AIRAC cycle computed in `vac.py` / `src/data/airac.ts`). Linked from the airfield page (`ButtonVACMap`).
- Provides: town name, ACB point (every based club, all disciplines, phone/email), night VFR (item 3),
  fuels (item 10, AVT).
- Used by: `populate-airfield` skill (`vac.py`, `context.py`).
- Pitfalls: military/private/closed airfields have no VAC (404). ACB parsing is heuristic (~5 % wrong
  splits). AVT section sometimes incomplete → fuels are additive only. The "Restaurants" item is not
  maintained and not used.

### SIA — Night VFR list
- Source: *Complément aux cartes aéronautiques VFR*, table "Aérodromes agréés VFR de nuit" (yearly).
- Coverage: 162 airfields (1st edition 2026, p. 44-47).
- Access: transcribed by hand into `scripts/NVFR.json` (`full` / `limited`).
- Used by: `npm run import -- --nvfr` (reference for `Airfield.nightVFR`); the skill only cross-checks it against the VAC.

## Clubs

### `scripts/clubs.json` (hand-maintained)
- Coverage: 431 clubs with name, base ICAO, email, phone, website, position.
- Rights / origin: not recorded (gitignored). Wins field by field over the VAC when both know a club.
- Used by: `populate-airfield` skill (`context.py`).

### Club websites
- Provides what nobody else does: club bikes/car, taxi, airfield restaurant, visitor info.
- Pitfalls: pages age; every note carries its source URL and the date it shows (`club_notes.py`).

## Activities (leads — never copied as-is)

All fetched by `.claude/skills/populate-airfield/scripts/sources.py` into `tmp/<ICAO>-sources.json`
(cached one week). Rules for sorting and checking them: `prompts/activity-format.md` § Pistes.

### OpenStreetMap (Overpass)
- Coverage: the richest source: restaurants, lodging, transit stops with their lines, rentals, sights.
- Access: Overpass API, three public instances in fallback (main one often 504s at peak hours).
- Rights: ODbL → leads only, nothing is copied.

### PoiFrance
- Coverage: aerial-tourism landmarks entered by pilots, up to 50 km (`poi` agent).
- Access: `https://poifrance.cloud/script/getmarker.php` (view: `/public.php`).

### JpRNavMaster
- Coverage: airfield restaurants, 0–2 per airfield, sometimes outdated (update date shown).
- Access: `http://www.jprendu.fr/aeroweb/_private/21_JpRNavMaster/NavMasterSearch.php` (http only).

### Google My Maps « Escales sur aérodrome »
- Coverage: airfield restaurants, same caveats as JpRNavMaster.
- Access: KML export, `mid=1jmpyI_nZ3kvRG2W57zBTW22QZd4`.

## Towns

### geo.api.gouv.fr
- Provides: official town name, town hall position, population (`city.py`).
- Coverage: 405 of 416 VAC town names matched (measured for the skill).
- Pitfalls: merged communes and VAC typos need a manual lookup.

## Images

### Wikimedia Commons
- Used by: `populate-airfield` skill (Commons API, `check_url.py`) for airfield/activity photos.
- Pitfalls: rate-limits browser User-Agents (`check_url.py` picks the right one).

## Maps

### Natural Earth 1:10m admin-0 countries
- Used by: `scripts/build-france-outline.ts` → `src/data/franceOutline.ts` (passport map). Public domain.

## Webcams

Not in the data model yet. Rule of thumb: preview an image only when its capture time is known;
otherwise link to the page.

### Cam-Aéro — https://cam-aero.eu/
- Coverage (2026-09-27): 108 cameras on 79 French airfields; 78 are in our data, 62 of them were up to date.
- Access: JSON list `https://cam-aero.eu/raspicamaero/mosaic/list` → `cams[] {id, lfxx_acb, time, old, replay}`;
  `lfxx_acb` = `{ICAO}_{Club}` (several cameras per airfield possible, some non-ICAO ids like `LF4724_…`).
  Latest image: `https://cam-aero.eu/raspicamaero/{lfxx_acb}` (JPEG, https, `no-cache`, METAR stamped on it).
- Freshness: `time` (capture, epoch s) + `old` flag for cameras that stopped updating.
- Rights: not asked yet. **Ask before hotlinking** (small non-profit project; offer a backlink).
- Used by: — (planned import script).
- Pitfalls: no public page per camera found yet (link target to decide).

### Club websites (manual entry)
- Examples: LFPZ (AC Courbevoie, image on `liste.petitpilote.com`), LFOF Alençon (WebP, refreshed every minute),
  LFHC Pérouges (live stream, link only), Annemasse (Google Sites embeds, link only).
- Pitfalls: images freeze silently (LFPZ: `Last-Modified` 17 Sep while checked 27 Sep), `http`-only
  images are blocked on https, some IP cameras expose their login in the URL (`usr=`/`pwd=`, e.g.
  Andernos): never store those.

## Leads (not evaluated yet)

- Webcams: aeroVFR interactive map (https://www.aerovfr.com/2024/02/carte-interactive-des-webcams-des-aerodromes/),
  opencctv.org, airportwebcams.net, the rsaetampes.free.fr webcam directory.
