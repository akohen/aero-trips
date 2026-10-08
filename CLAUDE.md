# AeroTrips

Community-driven directory of aviation destinations in France (aerotrips.fr): airfields,
nearby activities, day-trips ("trips") and events, contributed and enriched by pilots.

## Stack & architecture

- **SPA**: Vite + React + TypeScript, routed with `react-router` (v7 — import from `react-router`).
- **Backend**: Firebase — Firestore (data) + Auth. Hosted on Firebase Hosting (static, `rewrites ** → /index.html`,
  `trailingSlash: false`). **No SSR**; airfield detail pages are **statically prerendered at build time** (see SEO).
- Package manager: **npm only** (`package-lock.json` is authoritative). Never introduce pnpm/yarn.

## Data flow (non-obvious — important)

1. A **bundled JSON snapshot** (`src/data/airfields.json`, `src/data/activities.json`) is rendered
   immediately on load (perf + SEO).
2. `DataProvider` then queries Firestore for docs **modified since** the snapshot's `updated_at` and
   **merges** them on top (fresh data without reloading everything).
3. **Anonymous** contributions don't write to the collections directly: they go to the `changes`
   collection, then are reviewed/applied manually via `npm run manage` (`scripts/manage-edits.js`).
4. The JSON snapshot is regenerated from Firestore via `npm run export` (`scripts/export-data.ts`).

**External sources** (SIA, VAC, clubs, OSM, webcams…): catalogued in **`docs/data-sources.md`** — check it before
searching for a source, and add any new one there (coverage + date, access, freshness, rights, pitfalls).

Firestore collections: `airfields`, `activities`, `trips`, `events`, `changes`, `profiles`.
Domain model typed in `src/index.d.ts` (`Airfield` — key = ICAO code `codeIcao`; `Activity` +
`ActivityType`; `Trip` = list of `steps`; `Event`; `Profile`).

**Night VFR**: `Airfield.nightVFR` is `'full' | 'limited'` (absent = not licensed), from the SIA "Aérodromes agréés VFR
de nuit" table in the yearly *Complément aux cartes aéronautiques VFR*, kept in `scripts/NVFR.json`. `'limited'` means
prior approval + local procedures: travelling pilots care. `npm run import -- --nvfr` syncs Firestore both ways (deletes
the field for airfields that left the list) and bumps `updated_at`. Labels: `nightVFRLabels` (`src/utils/labels.ts`).
Filters: `nvfr` = any licensing, `nvfr-full` = without limitations (MCP: `night_vfr` / `night_vfr_unrestricted`).

**Webcams**: `Airfield.webcams` (`{url, image?, label?, source?}[]`). `url` is always shown as a link; `image` (https
only) adds a preview on the airfield page (`components/Webcams.tsx`, falls back to the link if it fails to load).
Prerender and MCP output links only. Helpers in `src/utils/webcams.ts` (React-free): `isValidWebcam` rejects http
previews and URLs carrying credentials (`usr=`/`pwd=`, some club IP cameras publish them) — apply it everywhere.
`npm run import -- --webcams` syncs **Cam-Aéro** both ways (drops cameras flagged `old`), rewrites only
`source: 'cam-aero'` entries and never touches manual ones; bumps `updated_at`. Sources: `docs/data-sources.md`.

**Landing fees / reports** (#18; pilot reports #39 build on it): every price is a document of the **`reports`**
collection (`Report` in `src/index.d.ts`: `target`, `source` = `import` (id) / `admin` / `pilot`, `observedAt`,
`landingFee`), the single source. `Airfield.landingFee` is **function-owned**: a copy of the chosen report (TTC amount,
parking, note, url, source, `checkedAt`), written only by `applyReports` (`functions/reports/`, codebase
`reports`) on any report write, `updated_at` bumped only when it changed. `AirfieldForm` never writes it back (the
rules don't enforce it yet: signed-in clients can still update whole airfield documents). The logic lives only in **`src/utils/reports.ts`** (React/SDK-free):
`deriveLandingFee` (newest report of the best trust tier, `SOURCE_TIERS`: admin > `official` sheets > `aerops-live` >
pilots (reported here or imported) > `aerops` estimates > unknown sources; an outdated sheet gets a newer one, is removed
or overridden by an admin report; prices are TTC; conflicts between sources), `sameLandingFee`, `formatLandingFee`.
Absent = unknown, never free (free = `amount: 0`). Reference case: visiting aircraft, MTOW 1.15 t, mandatory
assistance included (`docs/data-sources.md`, *Landing fees*).
**`npm run import:fees -- all|official|aerops|community`** (no source = all; staging; `import:fees:prod`; dry run
unless `--apply`) writes
reports `{source}-{ICAO}` from `scripts/fees.json` (operator sheets, hand-checked, committed; the `populate-airfield` skill proposes new ones
through `tmp/<ICAO>-fee.json` + `add_fee.py`, never through the airfield document), `scripts/aerops-fees.json`
(`npx tsx scripts/fetch-aerops-fees.ts`, gitignored) or `scripts/community-fees.json` (free only, imported as
pilot reports: `npx tsx scripts/build-community-fees.ts`, committed). Staging needs `serviceAccountKey.staging.json`.
**`npm run recompute`** (staging; `recompute:prod`; `--dry-run`) re-derives every airfield after a logic change:
prints conflicts and changes, writes only what changed. Reports are never loaded by `DataProvider` nor exported.
**Display** goes through `landingFeeDisplay` (same file): label, parking lines, note, dated source line
(`landingFeeSource`, wording per source) linked to `url`, `pageUrl`; non-http(s) links dropped. Rendered by
`components/LandingFee.tsx` (airfield info block: price + parking, the rest in a click-to-open popover), `scripts/prerender.ts` and MCP `landingFeeLines` (`get_airfield`;
search rows show the amount). Unknown shows « inconnue · Signaler », which opens the visit report form with the fee
section open (see *Visit reports*).
**Filters** `fee-free` (amount exactly 0) and `fee-15` (shown, rounded amount < 15 €), one at a time in the modal:
`LANDING_FEE_FILTERS` / `landingFeeAtMost`; unknown never matches. MCP: `free_landing`, `max_landing_fee`.
**Icon** in `AirfieldTitle` / `AirfieldIcon` (lists, cards, map popups; the pins have no icons): `landingFeeLevel` free /
< 15 € / 15 € and more (paid fees cluster at 7–14 €), one glyph per level (photo cards draw icons white), the price in the tooltip (`LandingFeeIcon`).

**Visit reports** (#39, phases 1–2): pilots (signed-in members only; guests are phase 3) post short dated
`reports` with `source: {type: 'pilot'}`, `uid`, `author` (`authorName`: « Jean D. », copied at write time), `text`
(plain, ≤ 2000) and/or the `landingFee` they paid (`{amount, note?}`, TTC, standard visitor price) with
`aircraftClass` (`light` = MTOW ≤ 1.2 t, the reference case; `heavy` fees stay on the report card and never set the
airfield's fee nor raise a conflict). `observedAt` = the visit day as **midnight UTC** (`visitDayToUtc`, shown with
`formatVisitDate` in UTC). **`isPilotReport` = pilot source + `uid`**: imported pilot data (`community`, no uid) feeds
the fee only, never the list, `reportStats` or emails. Published at once; moderation = delete the report (`applyReports` then recomputes).
Pilot fees rank below `official` and `aerops-live` (`SOURCE_TIERS`), so they fill gaps and beat estimates only.
`applyReports` also writes **`Airfield.reportStats`** (`{count, lastVisit}`, pilot reports only; not displayed yet) —
both facts via `deriveAirfieldFacts`. `notifyNewReport` (codebase **`notifications`**, which holds the Mailgun secret)
emails each new pilot report, flagging a fee that disagrees with the airfield's; imports send nothing.
UI: `useReports` (`src/hooks/`) reads one airfield's reports after render (`where('target.id', '==', icao)`, no index),
writes optimistically with rollback, and exposes `facts` (`deriveAirfieldFacts` over them): the airfield page shows
that fee rather than the one DataProvider loaded at startup, which stays stale until a reload. `components/Reports.tsx`: `ReportButton` (« Raconter ma visite » in the
airfield info block, then the thanks line), `ReportsSection` (bottom of the page, only when there are reports: cards,
own-report menu), `VisitedPrompt` after the « visited » icon, `ReportFormHost`. The Add page (`routes/AddData.tsx`)
opens the same form without an airfield: it shows an airfield picker, saves through `newReport` and navigates to the
airfield page. `useReportForm` (signed out → Google popup, then the form), lazy `ReportForm.tsx` (date picker defaulting to today, text, fee block always
shown with « Toujours exact », weight class and note once a fee is entered, « Marquer comme visité » checked by default,
per-airfield localStorage draft). Its modal and the date dropdown sit above the header/navbar (`zIndex` 1500 / 1501,
like the other modals).
The profile page's « Terrains visités » (`components/VisitsPanel.tsx`) lists the pilot's own reports per airfield
(`useUserReports`, `where('uid', '==', uid)`; `groupVisits`: latest visit first, then airfields with no report by ICAO
code): date and fee only, each a link to `reportPath` (`/airfields/{ICAO}#report-{id}`); `ReportsSection` scrolls to and
outlines that card once the reports load. Edit/delete stay on the airfield page. Reports come first: « Ajouter une visite » (primary,
the report form with the picker) and a link per airfield without a report; `onPublished` hands the new report to
`useUserReports().add`. The bulk add (multi-select, one `profile.update`) is folded below the list and then invites a
report. Airfields without a report can be removed (no confirmation). The title counts
`countVisitedAirfields` like the passport: an airfield reported on but not marked visited is listed with « Marquer comme visité ».
Shows 15 rows then « Voir les N autres terrains »; a filter field (name or ICAO, whole list) appears above 25. Never on `/profile/{uid}`.
Rules: `firestore.rules` `reports` (owner-only edit/delete, field whitelist, limits mirrored from `reports.ts`); airfield
updates may no longer touch `landingFee` / `reportStats`. Every write rule goes through `isMember()` (signed in, not
anonymous), so enabling Anonymous Auth opens nothing by itself; phase 3 opens report creates to guests explicitly. Not yet: guests, prerender/MCP.

**List/map filters live in the URL** (shareable queries): `App.tsx` derives them from the query string on every render
through `src/utils/filterParams.ts`. Never copy them into React state: react-router v7 applies location changes in a
transition, so a copy renders ahead of the URL and the list's `page` write (`CardList`/`TableList`) erases them.
Update both groups in one `setFilters` call, not two back-to-back `setSearchParams`.

## Commands

- `npm run test:rules` — `firestore.rules.test.ts` in the Firestore emulator (needs Java: Homebrew `openjdk` is picked
  up by default; skipped by `npm test`). Emulators with functions also need `java` on `PATH`.
- `npm version patch|minor` — tag a release (postversion: `git push --follow-tags`) → deploys.
- `npm run backup` — dated Firestore export to `backups/`. Admin scripts need `serviceAccountKey.json` at the root.

## SEO

- Client-rendered SPA, **but airfield detail pages are statically prerendered at build time** so crawlers
  get real HTML (title/meta/JSON-LD + a crawlable body) with no JS. Activities/trips/events stay SPA-only.
- **`scripts/prerender.ts`** runs as npm **`postbuild`** (fires in CI via `npm run build`). It reads the
  committed JSON snapshots (**no Firebase**), reuses `findNearest`, and for each airfield injects a per-page
  `<head>` + `#root` body into the built `dist/index.html` shell → `dist/airfields/{ICAO}/index.html`.
  These are **dist artifacts** (gitignored, regenerated each build). Descriptions are serialized with
  `@tiptap/html` `generateHTML` + a targeted URL/`on*` scrub (happy-dom does **not** make DOMPurify work in Node).
- **`src/utils/itemSeo.ts` → `buildItemSeo()`** is the **single source of truth** for title/description/
  JSON-LD (Airport + BreadcrumbList), shared by the prerender script AND `DetailsPage`'s runtime `useEffect`.
  Change SEO metadata **only here** to keep both in sync.
  It also owns `NEARBY_ACTIVITIES_LIMIT`, `countFood` and `nearbyActivitiesHeading`: the airfield title and the
  nearby-activities H2 say "restaurants" only when a food activity is among the listed ones (matches the
  "restaurant aérodrome <ville>" searches). Prerender and SPA must list the same activities, or the title lies.
- **Landing pages** (`/decouvrir/{slug}`): **`src/utils/landingPages.ts`** (`LANDING_PAGES`) is a React-free config of
  **rules** over the data (`highlights(nearby)` → the activities that qualify an airfield), not hand-picked lists.
  Optional `listed(airfield, highlights)` qualifies on the airfield itself, and `sections` splits the list (first match wins).
  Pages: `restaurants-aerodromes`, `aerodromes-vfr-de-nuit` (unrestricted first, cards show nearby food/lodging),
  `location-velo-aerodromes` (activities of type `bike`: hire, self-service bikes, greenways),
  `aerodromes-sans-taxe-atterrissage` (`landingFee.amount === 0`, nearby food highlighted, airfields with a restaurant
  first; section tests get the highlights too). Free airfields also say « atterrissage gratuit » in their meta description.
  Prerendered to `dist/decouvrir/{slug}/index.html`, rendered in the SPA by
  `routes/LandingPage.tsx`, listed in the sitemap by `npm run export` (also added by hand to `public/sitemap.xml`).
  A page with no airfields (data not exported yet) is neither prerendered nor listed in the sitemap.
  Uses the airfield page's nearby list (`nearbyActivities`), so an airfield titled "restaurants" is on the hub, and
  leaves out `MIL`/`OFF` airfields.
  `usePageSeo` (`src/hooks/`) applies any `ItemSeo` to `<head>`; `App.tsx` must not reset the title on those paths.
- French elision: write "aérodrome" + `deName(name)` (`src/utils/utils.ts`) → "d'Abbeville" / "de Laval".
- `firebase.json` sends `X-Robots-Tag: noindex` on `**/edit`, `/profile` and `/changes` (forms and private pages).
- Approach is **template injection, not React SSR**: `createRoot` wipes `#root` on mount (brief cold-load
  flash, harmless). PWA precache excludes prerendered pages (written after `vite build`) — keep it that way.
- **URLs**: canonical + `sitemap.xml` use the no-slash form (`/airfields/{ICAO}`); `firebase.json`
  `trailingSlash: false` serves it directly (200). Don't reintroduce a trailing-slash mismatch.
  `sitemap.xml`/`robots.txt` live in `public/`; sitemap is regenerated by `npm run export`.
- Airfield names are UPPERCASE in the data → use `titleCase()` (`src/utils/utils.ts`) for display.
- Verify hosting behavior with the **Firebase emulator** (`npx firebase emulators:start --only hosting
  --project demo-aerotrips` — a `demo-` project runs offline, no auth). `vite preview` is **not**
  representative (SPA-fallback-first; only hits nested files with a trailing slash).

## Embeddable widget

- `/embed/{ICAO}` is a **standalone HTML page** (not the SPA shell) that clubs, airfields and tourism sites
  load in an `<iframe>`: airfield photo (or a runway diagram drawn from `runways` when there is none), counts
  of nearby addresses by need, and a CTA to the airfield page. Empty airfields get an "Ajouter une adresse" CTA.
- Built by **`src/utils/embedWidget.ts`** (`buildEmbedHtml`, `buildEmbedSnippet`), written by
  `scripts/prerender.ts` to `dist/embed/{ICAO}/index.html`. Same `findNearest` radius as the airfield page.
- Options via query string: `?theme=dark`, `?accent=<hex6>` (validated in the page).
- **No gtag** in the widget (it would set cookies on a third-party site); links carry `utm_source=widget`.
  `<base target="_blank">` so links never navigate inside the iframe.
- Hosting sends `X-Robots-Tag: noindex` + `frame-ancestors *` on `/embed/**`; the PWA `navigateFallbackDenylist`
  must keep `/^\/embed\//`, or a visitor's service worker would serve the SPA inside the iframe.
- The snippet includes a plain `<a>` after the iframe: that link, not the iframe, is the SEO backlink.

## Pilot passport

- Built on `profile.visited` (airfields + activities the user marked as visited). Only distinct **airfields**
  count towards the passport (`countVisitedAirfields`).
- **Small badge** (pill: home base + visited count + aerotrips.fr): **`src/utils/passportBadge.ts`** →
  `buildPassportBadgeSvg()`, a React-free standalone SVG string (so it can later be served as-is by a function).
  Shown and shared from the profile page's "Profil public" section via `src/components/PassportBadge.tsx`: PNG
  download, copy-to-clipboard, Web Share (files) — rasterized client-side through `<img>` + canvas at 3x.
- The SVG is drawn through `<img>`/canvas, where web fonts don't load: keep **system font stacks** and the
  per-character width estimates in sync if you change sizes. Georgia has no lining figures — don't use it for numbers.
- **Public passport (opt-in)**: `profiles/{uid}` holds the email and is owner-only, so it is never made public.
  When `profile.passportPublic` is true, the **`functions/passports/`** Cloud Function (codebase `passports`,
  `europe-west1`, `onDocumentWritten('profiles/{uid}')`) mirrors `toPublicPassport()` (**`src/utils/passport.ts`**:
  display name, home base, sorted distinct visited airfield codes — no email, activities or favorites) to
  **`passports/{uid}`**; turning it off or deleting the profile deletes the passport. Unchanged projections are
  not rewritten. Clients never write `passports`; `/profile/{uid}` (`UserDetails`) reads it.
- Server-side consumers (future hosted badge URL, OG images, map image) must read **`passports`**, never `profiles`.
- **Hosted images** are rendered at **write time**, never per view, by `syncPassport` into `passports/{uid}/` of the
  default bucket (URL: `passportImageUrl()`); rendering details in `functions/passports/CLAUDE.md`.
- The profile page offers the image link, HTML (`srcset` 2x, linked to `/profile/{uid}`) and BBCode snippets
  (`badgeEmbedCodes`) once the profile is public; `/profile/{uid}` shows the hosted PNG, local SVG as fallback.
- **Map image** (`map.png`, 1080×1350, rendered with the badge): `src/utils/passportMap.ts` → `buildPassportMap()`.
  Metropolitan France + Corsica with **only** the home base and the visited airfields, and the visited count (no
  other counters, by design). Projection is **Lambert-93** (`src/utils/franceMap.ts`); the outline is generated
  data, `src/data/franceOutline.ts`, from **`scripts/build-france-outline.ts`** (Natural Earth 1:10m, public domain,
  simplified; keeps the Atlantic islands). Don't hand-edit it; rerun the script. The function reads airfield
  positions from Firestore (`airfields/{ICAO}`, `position` only) at render time; unknown codes still count but get
  no dot.
- UI: the "Profil public" section shows the badge and **"Ma carte"**, each with a `ShareImageMenu` (download / copy /
  share the client-rendered PNG, then hosted-copy embeds, disabled until public); the map there is a thumbnail, the
  full one sits next to the visits list (`PassportMapImage`). `Profile` builds the map SVG once, client-side, with
  `usePassportMapSvg`, which **dynamic-imports** `passportMap` so the outline (≈21 KB chunk) stays out of the eager
  bundle — keep it that way. `/profile/{uid}` shows the hosted `map.png`, drawing it locally only if it 404s.
- Not yet: backfill of past visits, OG image for `/profile/{uid}`.

## Firestore rules

- **`firestore.rules`** is the source of truth (wired in `firebase.json`), imported from the production console
  on 2026-09-25. **Deployed by the release CI** (tag workflow, together with `functions:mcp`, `functions:reports`,
  `functions:passports`, `functions:notifications` and hosting); manual deploy: `npx firebase deploy --only firestore:rules`. Staging's console rules could not be
  read at import time — deploying there overwrites whatever is in its console. Test changes with `npm run test:rules`.

## Images

- User uploads go to Storage under `img/{uid}/{random}` (`src/utils/image.ts`); the tiptap description
  stores the resulting download URL as the image node's `src`.
- **`functions/images/`** (codebase `images`, Cloud Function v2, `europe-west1`) downscales uploads
  **in place**: `onObjectFinalized` → `resizeInPlace()` rewrites the **same object** to max 1000px on the
  longest edge, re-encoding anything over 200KB even when already in bounds. The stored `src` is
  therefore correct immediately and forever — no client needs a fallback.
- This **replaces** `firebase/storage-resize-images`, which wrote `<path>_1000x1000` and deleted the
  original, leaving the stored `src` pointing at a file that no longer existed (24% of production
  images) and forcing every consumer to guess between two names. Static consumers (MCP, prerender)
  can't guess. **Don't reintroduce a variant-naming scheme.**
- **Deployed by hand, not by the release CI** (on purpose: standalone, rarely changed, and a bug rewrites users'
  originals). Resizer invariants and the deploy procedure: `functions/images/CLAUDE.md`.
- **`npm run heal`** (`scripts/heal-image-urls.ts`) repairs data left behind by the old extension:
  copies each orphaned `<path>_WxH` back to `<path>` and rewrites the few Firestore refs that name a
  variant directly. Dry run by default; `--apply` to write, `--production` to target prod,
  `--delete-variants` to clean up afterwards. Idempotent.

## Change notifications

- **`functions/notifications/`** (codebase `notifications`, `europe-west1`): `onDocumentCreated('changes/{id}')`
  emails the new document as JSON to the maintainer via the Mailgun REST API (`fetch`, no SDK).
  Creates only — `npm run manage` applying/deleting a change sends nothing. `retry: false` to avoid duplicate mail.
  `notifyNewReport` (`onDocumentCreated('reports/{id}')`) does the same for **pilot** visit reports only, readable text
  first (author, date, text, fee, a ⚠️ line when the fee disagrees with the airfield's), then the JSON.
- **Deployed by the release CI** (it bundles `src/utils/reports.ts`, so it must ship with the app). Mailgun config
  and secret grants: `functions/notifications/CLAUDE.md`.

## MCP server (public API)

- A **read-only MCP server** exposes the dataset at `https://aerotrips.fr/mcp` for AI assistants:
  `search_airfields`, `get_airfield`, `search_activities`, `get_activity`, `find_nearby`.
- Lives in **`functions/mcp/`** (its own npm package), deployed as a **Firebase Cloud Function v2**
  (`europe-west1`); `firebase.json` rewrites `/mcp` and `/mcp/**` to it **before** the SPA catch-all.
  It bundles the JSON snapshots and the `src/` utils it reuses (no Firestore at runtime): data is only as fresh as
  the last `npm run export` + deploy. Transport, build and testing: `functions/mcp/CLAUDE.md`.
- Filtering **reuses `filterAirfields`/`filterActivities`** so MCP answers match the site. This is
  why `src/utils/utils.ts` must stay **React-free** (icons live in `src/utils/icons.tsx`, labels in
  `src/utils/labels.ts`).

### Discovery

- **`server.json`** (repo root) is the single source of truth for MCP metadata, in the official
  registry format (`ServerDetail` schema). `scripts/prerender.ts` copies it to
  `dist/.well-known/mcp/server-cards.json` at postbuild — the path from **SEP-2127, still an open
  PR**; no well-known path is ratified yet, so revisit when one lands.
- `description` is capped at **100 chars** by the schema; validate before publishing, or the
  registry rejects it. No static `tools` array on purpose — it would drift from `tools.ts`.
- `firebase.json` hosting `ignore` must **not** contain `**/.*`, or `.well-known` never deploys.
- `public/llms.txt` describes the site and the MCP server for AI crawlers (llmstxt.org format).
- Not yet published to `registry.modelcontextprotocol.io` (steps in `functions/mcp/CLAUDE.md`).

## Conventions

- User-facing content and UI are in **French**; code, comments, identifiers and **commit messages** in
  **English** (even though some past commits are in French).
- **Bundle perf**: map routes (`MapPage`, `TripDetails`) are **lazy-loaded** to keep Leaflet out of the
  initial bundle; Leaflet components (e.g. `AirfieldMarker`) are **kept separate** from utilities used off
  the map. Avoid reintroducing a Leaflet/tiptap import into the eager graph of the home/airfield pages.
