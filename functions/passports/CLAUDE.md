# Passports function

- `syncPassport` renders the badge and map at write time (`src/images.ts`, `@resvg/resvg-js` with the **IBM Plex**
  TTFs bundled in `fonts/`, OFL) and uploads `badge.svg`, `badge.png`, `badge@2x.png` (and `map.png`) to the
  **default bucket** under `passports/{uid}/`, world-readable (per-object ACL), `Cache-Control: public, max-age=3600`,
  overwritten in place. Hotlinks cost egress only. Opt-out deletes the prefix. URL: `passportImageUrl()` →
  `https://storage.googleapis.com/{bucket}/passports/{uid}/…`.
- Bump `IMAGES_VERSION` when the rendering changes (passports re-render on their next profile write).
- The resizer ignores this prefix (`img/` only).
