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

Stored in `Airfield.webcams` (see CLAUDE.md § Webcams). Rule of thumb: preview an image only when its
capture time is known; otherwise link to the page.

### Cam-Aéro — https://cam-aero.eu/
- Coverage (2026-09-27): 108 cameras on 79 French airfields; 78 are in our data, 62 of them were up to date.
- Access: JSON list `https://cam-aero.eu/raspicamaero/mosaic/list` → `cams[] {id, lfxx_acb, time, old, replay}`;
  `lfxx_acb` = `{ICAO}_{Club}` (several cameras per airfield possible, some non-ICAO ids like `LF4724_…`).
  Latest image: `https://cam-aero.eu/raspicamaero/{lfxx_acb}` (JPEG, https, `no-cache`, METAR stamped on it).
  Pages: `…/{lfxx_acb}/replay` (last hours, when `replay` is true) and `…/{lfxx_acb}/img` (latest image).
  No CORS on the list: the browser can't read it, freshness comes from the sync.
- Freshness: `time` (capture, epoch s) + `old` flag for cameras that stopped updating.
- Rights: not asked yet. **Ask before hotlinking** (small non-profit project; offer a backlink).
- Used by: `npm run import -- --webcams` (`camAeroWebcams` in `src/utils/webcams.ts`). Dry run 2026-09-27:
  76 cameras on 61 airfields, all codes known.
- Pitfalls: ids that aren't ICAO codes (ULM fields, `LF4724_…`) are skipped.

### Club websites (manual entry)
- Examples: LFPZ (AC Courbevoie, image on `liste.petitpilote.com`), LFOF Alençon (WebP, refreshed every minute),
  LFHC Pérouges (live stream, link only), Annemasse (Google Sites embeds, link only).
- Pitfalls: images freeze silently (LFPZ: `Last-Modified` 17 Sep while checked 27 Sep), `http`-only
  images are blocked on https, some IP cameras expose their login in the URL (`usr=`/`pwd=`, e.g.
  Andernos): never store those.

## Landing fees

Reference case (#18): a visiting light aircraft, MTOW 1.15 t (C172S / DR400-180), one landing, standard price
without discounts, TTC, **mandatory assistance and fees included** (avoidable ones — payment method, missing PPR —
and discounts go in the note). Checked 2026-10-06 on 11 airfields: aeroPS estimates were wrong on all 9 checked,
its 2 live prices right; Natim right on 6.

### Operator fee sheets (« guide des redevances », tariff pages)
- Coverage: one per airfield or operator (Edeis, SEARD, CCI, towns…). 11 transcribed in `scripts/fees.json` (2026-10-06).
- Access: PDFs, a new URL each edition; links break (Tours' « 2026 » link served HTML). Store the stable tariff /
  pilot page as `pageUrl` next to the document `url`.
- Freshness: yearly, but **not by calendar year** (1 Jan, 1 Feb, 1 Mar, 1 Apr, 10 Apr, 1 Jul seen) → `validFrom`
  (+ `validUntil` when stated). Seasonal sheets (Courchevel: summer / winter).
- Rights: public tariffs (facts), link to the source.
- Used by: `scripts/fees.json` (hand-transcribed; import to `reports` to come).
- Pitfalls: HT almost everywhere (VAT 20 %); based vs visiting aircraft lines; commercial per-tonne grid vs GA flat
  fee (Metz); MTOW « arrondie à la tonne supérieure » (Dijon, Périgueux, Tours: 1.15 t → 2 t line); sharp class edges
  (Montluçon ×4 at 1.2 t); packages including parking (Brest, Metz, Avignon, Dinard/Rennes); mandatory assistance
  (Biarritz 49.20 € HT, more than the landing fee).

### aeroPS — https://www.aerops.com/fr/airports/fee-info/{ICAO}-{name}/
- Coverage (2026-10-07): 131 French airfields listed, 117 with prices, 115 with the C172 example (114 in our data);
  **31 live**, 84 estimates. Only paying airfields: no source of « free ».
- Access: HTML pages listed in the sitemap, allowed by robots.txt; no public API. Fixed examples (ULM, C172, SR22,
  PA34, PC12), the C172 one = one landing + one overnight stay. `scripts/fetch-aerops-fees.ts` → `scripts/aerops-fees.json`
  (raw grid + `reference`: landing, `parking24h`, flat-rate and VAT flags).
- Freshness: **live** pages (`price-notice-valid`, « prix en temps réel valides ») are the airfield's own billing
  through the aeroPS app: what pilots actually pay, TTC. Can still be misconfigured (Brest: the app charges visitors
  the based-aircraft 7.22 € while the guide says 33 € HT) → the operator sheet wins over a live price.
  Estimates (« les prix peuvent varier légèrement ») are often wrong: based-aircraft rate (Biarritz), commercial grid
  (Metz), HT (Dijon), FFA −50 % rate (Périgueux), outdated grid (Courchevel, Dinard/Rennes).
- Rights: no reuse clause; individual prices are facts, but bulk extraction may fall under the EU database right
  (aeroPS GmbH, Germany). Import the reference values only, link back to their page.
- Used by: import sources `aerops-live` (below sheets and pilots) and `aerops` (estimates, lowest tier).
- Pitfalls: no VAT wording on the page; flat « landing and parking » rates (9) can't be split; parking only when the
  example covers 18–24 h or one per-day/night line (12 h, 48 h, « redevance minimale »: unknown); the stylesheet
  of every page contains `price-notice-valid`, match the span's class attribute.

### Natim/france-ga-pilot-maps — https://github.com/Natim/france-ga-pilot-maps
- Coverage (2026-10-06): `docs/landing_fees.csv`, 410 rows (TTC, < 2 t): 12 from parsed Edeis PDFs
  (`data/landing_fee_sources.csv`, plus a `.pending.csv` backlog of operator PDF / page URLs — useful leads),
  ~70 hand-entered in 2026 (« HT x € (TVA 20 %) », no source recorded), ~325 from the community map below.
- Rights: MIT. Credit the repo.
- Used by: leads to verify against the operator sheets, not imported as-is.
- Pitfalls: 2026 values sometimes already outdated (grids change in spring), uses the 1.2–2 t class (Montluçon).

### Google My Maps « carte taxes d'atterrissage » (C. Rousseau), via Natim
- Coverage: ~325 airfields, ~244 « gratuit », KML snapshot 2024-06-02; observations from 2011 to 2022 (date in the
  note text, not in `observed_on`).
- Rights: reused through Natim's MIT repo; prices are facts. Credit the map's author.
- Used by: `scripts/build-community-fees.ts` → `scripts/community-fees.json` (unconditional « gratuit » only, dated from
  the note; 243 airfields, 166 dated 2011) → `npm run import:fees -- community`, tier `community`: above aeroPS
  estimates, below live prices. Pilot reports on airfield.directory (2025–2026) confirmed every free entry they
  mention. Conflicts: LFCD, LFGY, LFOC, LFPM charge per aeroPS live (live wins); LFBS per an aeroPS estimate (free wins).
- Pitfalls: conditional free cases parsed as free by Natim (LFLM « taxe offerte si repas », LFRI « gratuit si
  avitaillement »); old amounts (ADP fields 7.10 € vs 14.40 € today).

### Airfield Directory — https://airfield.directory/airfield/{ICAO}
- Coverage (2026-10-07): 425 French airfields listed; 101 with pilot reports (PIREPs, 170 in all, mostly 2025–2026),
  75 mentioning a fee, 16 saying landing is free (LFAB, LFDE, LFGF, LFGQ, LFGT, LFGW, LFGY, LFGZ, LFHO, LFLX, LFMS,
  LFNE, LFRW, LFSA, LFSU, LFXU, LFYG). Extract: `scripts/airfield-directory-pireps.json` (gitignored).
- Access: HTML pages (sitemap `sitemap_airfields_europe_en.xml`), PIREPs as JSON-LD (`reviewBody`, `datePublished`).
  robots.txt disallows `/airfield/*.json` and `/api/`; `Content-Signal: ai-train=no, ai-input=yes`.
- Rights: data **CC BY-SA 4.0** (attribution + share-alike on adapted data); site code/design not licensed. Their
  structured fees are aeroPS's (« pricing information from Aerops »): nothing new there, use the PIREPs.
- Used by: leads and confirmations only, never imported or linked. Every « free » PIREP matches the community map's « gratuit », even entries dated
  2011 — the old free list holds up. Paid PIREPs confirm checked sheets (LFBZ ≈ 100 € all-in < 2 t, LFMV
  27,92 + 3,40 €) and Brest's app rate (6,85 € in 2025).
- Pitfalls: free text in several languages, aircraft of any weight, conditional cases (LFAY free on weekends,
  LFLX free < 2 t, LFLC waived). LFGY: « no fees, donations welcome » (2026) vs aeroPS live 3 €.

### AeroTrips airfield descriptions
- Coverage (2026-10-07): 7 of 432 mention the fee; « pas de taxe » on LFAE, LFAK, LFQW, LFSJ; amounts on LFRF (~5 €),
  LFEQ (12 €); LFLD links its guide. Contributed by pilots/clubs, no date beyond `updated_at`.
- Used by: `build-community-fees.ts` (« pas de taxe » → source `aerotrips`, dated by `updated_at`).

### Checked, not usable (2026-10-07)
- **OpenStreetMap**: no landing-fee tag on any of the 439 `LF` aerodromes (only `internet_access:fee`).
- **Aerotaxe** (`aerotaxe.aenet.fr`, TTC fees + map, cited by aerovfr.com): domain gone (NXDOMAIN).
- **AeroClub Explorer** (aeroclub-explorer.org): European pilot reviews with `landing_fee`, Supabase SPA, started
  2026; few reports, rights unknown. Same idea as #39: watch, don't import.
- **Pilot-Hub**, **Lightwings** (ULM), **BASULM** (ULM, login), **CartaBossy** / Bottlang (paid guides, no reuse):
  no reusable per-airfield fee data.
- Absence from aeroPS / operator lists does **not** mean free: never infer `amount: 0`.

## Leads (not evaluated yet)

- Webcams: aeroVFR interactive map (https://www.aerovfr.com/2024/02/carte-interactive-des-webcams-des-aerodromes/),
  opencctv.org, airportwebcams.net, the rsaetampes.free.fr webcam directory.
