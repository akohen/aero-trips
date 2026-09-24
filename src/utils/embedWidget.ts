/**
 * Embeddable "À faire autour de {ICAO}" widget (banner layout).
 *
 * `buildEmbedHtml` returns a self-contained HTML page, written by the
 * prerender script to dist/embed/{ICAO}/index.html and meant to be loaded in
 * an <iframe> on club / airfield / tourism sites. It is deliberately NOT the
 * SPA: no React, no gtag (it would set cookies on a third-party site without
 * its consent banner), inline CSS, and a few lines of JS for the query-string
 * options (`?theme=dark`, `?accent=0f766e`). Clicks are attributed through
 * utm parameters on the outgoing links instead.
 *
 * React-free, like the rest of src/utils, so the prerender script and the
 * site's "Intégrer" modal can both use it.
 */
import type { Activity, ActivityType, Airfield, Runway } from '..'
import { getImgNode } from './itemImages'
import { titleCase } from './utils'

const ROOT_URL = 'https://aerotrips.fr'

// Recommended iframe heights: the page fills its viewport, stacking the photo
// above the text below WIDE_BREAKPOINT and placing it alongside above it.
export const EMBED_HEIGHT = { narrow: 300, wide: 150 }
const WIDE_BREAKPOINT = 520

// Tabler Icons (MIT) path data, the same icons as src/utils/icons.tsx.
const ICON_PATHS = {
  food: ['M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1', 'M12 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2', 'M16 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2', 'M8 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2'],
  lodging: ['M5 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0', 'M22 17v-3h-20', 'M2 8v9', 'M12 14h10v-2a3 3 0 0 0 -3 -3h-7v5'],
  culture: ['M5 3h1a1 1 0 0 1 1 1v2h3v-2a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2h3v-2a1 1 0 0 1 1 -1h1a1 1 0 0 1 1 1v4.394a2 2 0 0 1 -.336 1.11l-1.328 1.992a2 2 0 0 0 -.336 1.11v7.394a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-7.394a2 2 0 0 0 -.336 -1.11l-1.328 -1.992a2 2 0 0 1 -.336 -1.11v-4.394a1 1 0 0 1 1 -1', 'M10 21v-5a2 2 0 1 1 4 0v5'],
  transit: ['M4 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0', 'M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0', 'M4 17h-2v-11a1 1 0 0 1 1 -1h14a5 7 0 0 1 5 7v5h-2m-4 0h-8', 'M16 5l1.5 7l4.5 0', 'M2 10l15 0', 'M7 5l0 5', 'M12 5l0 5'],
  arrow: ['M17 7l-10 10', 'M8 7l9 0l0 9'],
  plus: ['M12 5l0 14', 'M5 12l14 0'],
}
const icon = (k: keyof typeof ICON_PATHS) =>
  `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[k].map((d) => `<path d="${d}"/>`).join('')}</svg>`

// What a pilot looks for once landed. An activity can count in several groups.
export const EMBED_GROUPS: { icon: keyof typeof ICON_PATHS, one: string, many: string, types: ActivityType[] }[] = [
  { icon: 'food', one: 'restaurant', many: 'restaurants', types: ['food'] },
  { icon: 'lodging', one: 'hébergement', many: 'hébergements', types: ['lodging'] },
  { icon: 'culture', one: 'activité', many: 'activités', types: ['culture', 'poi', 'hiking', 'nature', 'nautical', 'aero', 'other'] },
  { icon: 'transit', one: 'transport', many: 'transports', types: ['transit', 'car', 'bike'] },
]

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const utm = (icao: string) => `utm_source=widget&utm_medium=embed&utm_campaign=${encodeURIComponent(icao)}`

/**
 * Top-down sketch of the runways, for airfields without a photo (most of
 * them). Heading comes from the designation, length is to scale, unpaved
 * strips are drawn as a dashed outline. Parallel runways are offset.
 */
export const runwayPlanSvg = (runways: Runway[], w = 150, h = 100) => {
  const cx = w / 2, cy = h / 2
  const valid = runways
    .map((r) => ({ r, hdg: parseInt(String(r.designation ?? ''), 10) * 10 }))
    .filter(({ r, hdg }) => Number.isFinite(hdg) && r.length > 0)
  if (valid.length === 0) return ''
  const maxLen = Math.max(...valid.map(({ r }) => r.length))
  const span = Math.min(w, h) * 0.72
  // Group by strip orientation (09/27 and 27/09 are the same line) so that
  // parallel runways can be offset side by side.
  const byHdg = new Map<number, { r: Runway, hdg: number }[]>()
  for (const v of valid) {
    const k = v.hdg % 180
    byHdg.set(k, [...(byHdg.get(k) ?? []), v])
  }

  const parts: string[] = []
  for (const [hdg, rs] of byHdg) {
    const t = (hdg * Math.PI) / 180
    const ux = Math.sin(t), uy = -Math.cos(t) // along the runway, SVG y points down
    rs.sort((a, b) => b.r.length - a.r.length).forEach(({ r, hdg: own }, i) => {
      const off = rs.length > 1 ? (i - (rs.length - 1) / 2) * 13 : 0
      const x0 = cx - uy * off, y0 = cy + ux * off
      const len = (r.length / maxLen) * span
      const unpaved = r.composition === 'GRASS' || r.composition === 'WATER'
      const wd = unpaved ? 5 : 7
      parts.push(
        `<rect class="${unpaved ? 'ru' : 'rp'}" x="${(x0 - len / 2).toFixed(1)}" y="${(y0 - wd / 2).toFixed(1)}" ` +
        `width="${len.toFixed(1)}" height="${wd}" rx="1" transform="rotate(${hdg - 90} ${x0.toFixed(1)} ${y0.toFixed(1)})"/>`,
      )
      if (i === 0) {
        const [a, b] = String(r.designation).split('/')
        const d = len / 2 + 10
        const label = (sx: number, txt?: string) => txt
          ? `<text class="rl" x="${(x0 + sx * ux * d).toFixed(1)}" y="${(y0 + sx * uy * d + 3).toFixed(1)}">${esc(txt)}</text>`
          : ''
        // A threshold sits at the end you land from: "09" west, "27" east.
        const flip = own % 360 >= 180 ? -1 : 1
        parts.push(label(-flip, a), label(flip, b))
      }
    })
  }
  return `<svg class="plan" viewBox="0 0 ${w} ${h}" aria-hidden="true">${parts.join('')}</svg>`
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

/**
 * @param nearby activities around the airfield, as returned by findNearest
 *               (same radius as the airfield page, so the counts match).
 */
export const buildEmbedHtml = (af: Airfield, nearby: [number, Activity, string][]) => {
  const icao = af.codeIcao
  const name = titleCase(af.name)
  const afUrl = `${ROOT_URL}/airfields/${encodeURIComponent(icao)}?${utm(icao)}`
  const photo = getImgNode(af.description)?.attrs.src
  const safePhoto = photo && /^https:\/\//i.test(photo) ? photo : undefined

  const counts = EMBED_GROUPS
    .map((g) => ({ g, n: nearby.filter(([, a]) => a.type?.some((t) => g.types.includes(t))).length }))
    .filter(({ n }) => n > 0)

  const visual = safePhoto
    ? `<img src="${esc(safePhoto)}" alt="Aérodrome de ${esc(name)}" decoding="async">`
    : runwayPlanSvg(af.runways)

  const body = nearby.length > 0
    ? `<div class="lead">
        <strong>À faire autour de ${esc(name)}</strong>
        <div class="counts">${counts.map(({ g, n }) => `<span>${icon(g.icon)}${plural(n, g.one, g.many)}</span>`).join('')}</div>
      </div>
      <a class="cta" href="${afUrl}">${nearby.length > 1 ? `Voir les ${nearby.length} adresses` : 'Voir l\'adresse'} ${icon('arrow')}</a>`
    : `<div class="lead">
        <strong>À faire autour de ${esc(name)}</strong>
        <div class="counts">Aucune adresse recensée pour l'instant. Vous en connaissez une ?</div>
      </div>
      <a class="cta" href="${ROOT_URL}/edit/${af.position.latitude}/${af.position.longitude}?${utm(icao)}">${icon('plus')} Ajouter une adresse</a>`

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<link rel="canonical" href="${ROOT_URL}/airfields/${encodeURIComponent(icao)}">
<title>À faire autour de ${esc(name)} (${esc(icao)}) | AeroTrips</title>
<base target="_blank">
<style>
:root{--a:#1c7ed6;--bg:#fff;--ink:#1d2530;--mut:#667281;--ln:#e4e8ee;--soft:#eef3f8}
:root.dk{--bg:#1a2129;--ink:#e8edf3;--mut:#9aa6b5;--ln:#2d3743;--soft:#222b35;color-scheme:dark}
*{box-sizing:border-box}
html,body{height:100%;margin:0;background:transparent}
body{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink)}
a{color:inherit;text-decoration:none}
a:focus-visible{outline:2px solid var(--a);outline-offset:2px;border-radius:6px}
.w{height:100%;display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--ln);border-radius:12px;overflow:hidden}
.v{position:relative;flex:1 1 90px;min-height:90px;display:grid;place-items:center;overflow:hidden;background:color-mix(in srgb,var(--a) 9%,var(--soft))}
.v img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.v .tag{position:absolute;left:10px;top:10px;font:600 12px/1 ui-monospace,Menlo,monospace;background:rgba(10,16,24,.62);color:#fff;padding:4px 7px;border-radius:4px}
.v .plan{width:150px;height:100px;max-height:100%}
.v.np .tag{background:color-mix(in srgb,var(--a) 14%,transparent);color:var(--a)}
.rp{fill:var(--ink);opacity:.78}
.ru{fill:none;stroke:var(--mut);stroke-width:1.2;stroke-dasharray:3 2}
.rl{fill:var(--mut);font:9px ui-monospace,Menlo,monospace;text-anchor:middle}
.bd{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:12px 16px 10px}
.lead{flex:1 1 200px;min-width:0;display:grid;gap:3px}
.lead strong{font-size:15px;line-height:1.25}
.counts{display:flex;flex-wrap:wrap;gap:4px 12px;color:var(--mut);font-size:13px}
.counts span{display:inline-flex;align-items:center;gap:4px}
.i{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.counts .i{color:var(--a)}
.cta{display:inline-flex;align-items:center;gap:6px;background:var(--a);color:#fff;font-weight:600;padding:9px 14px;border-radius:8px;white-space:nowrap}
.cta:hover{filter:brightness(1.08)}
.f{flex-basis:100%;font-size:11.5px;color:var(--mut)}
.f b{color:var(--ink)}
@media (min-width:${WIDE_BREAKPOINT}px){.w{flex-direction:row}.v{flex:0 0 36%;min-height:0}.bd{flex:1;align-content:center}}
</style>
</head>
<body>
<div class="w">
  <a class="v${safePhoto ? '' : ' np'}" href="${afUrl}" aria-label="Aérodrome de ${esc(name)} (${esc(icao)}) sur AeroTrips">${visual}<span class="tag">${esc(icao)}</span></a>
  <div class="bd">
      ${body}
    <div class="f">Sur <b>AeroTrips</b>, l'annuaire des sorties en avion</div>
  </div>
</div>
<script>
(function(){var q=new URLSearchParams(location.search),r=document.documentElement,a=q.get('accent');
if(q.get('theme')==='dark')r.classList.add('dk');
if(a&&/^[0-9a-f]{6}$/i.test(a))r.style.setProperty('--a','#'+a);})();
</script>
</body>
</html>
`
}

/** The code a site owner pastes: the iframe plus a plain link, which is the actual backlink. */
export const buildEmbedSnippet = (
  af: Airfield,
  { wide = false, theme, accent }: { wide?: boolean, theme?: 'dark', accent?: string } = {},
) => {
  const icao = af.codeIcao
  const name = titleCase(af.name)
  const params = new URLSearchParams()
  if (theme) params.set('theme', theme)
  if (accent && /^#?[0-9a-f]{6}$/i.test(accent)) params.set('accent', accent.replace('#', ''))
  const q = params.toString()
  return `<iframe src="${ROOT_URL}/embed/${esc(icao)}${q ? `?${q}` : ''}" width="100%" height="${wide ? EMBED_HEIGHT.wide : EMBED_HEIGHT.narrow}" ` +
    `style="border:0;max-width:${wide ? 720 : 360}px" loading="lazy" title="À faire autour de l'aérodrome de ${esc(name)} (${icao})"></iframe>\n` +
    `<p><a href="${ROOT_URL}/airfields/${icao}">Activités autour de l'aérodrome de ${esc(name)} (${icao}) sur AeroTrips</a></p>`
}
