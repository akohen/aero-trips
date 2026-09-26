import type { Profile } from '..'

// Small "pilot passport" badge (pill): home base + number of visited airfields.
// Built as a standalone SVG string, shared by the profile page (preview, client-side
// PNG) and the `passports` function, which rasterizes it with the IBM Plex fonts it
// bundles and publishes it to Storage. Browsers drawing it through <img>/canvas can't
// load web fonts, hence the fallback stacks and the per-character width estimates,
// which must fit both Plex and the common system fonts.

const NAVY = '#16233F'
const GOLD = '#E7B04A'
const INK = '#1E2B45'
const MUTED = '#5A6273'
const RULE = '#D5D9E0'

export const FONT_MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"
export const FONT_SANS = "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

// Tabler "plane" icon (MIT), drawn in a 24x24 box
const PLANE = 'M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2-7h-4l-2 2h-3l2-4-2-4h3l2 2h4l-2-7h3z'

export const BADGE_HEIGHT = 48

export interface PassportBadgeData {
  homebase?: string
  visitedCount: number
}

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Distinct visited airfields; activities don't count towards the badge. */
export const countVisitedAirfields = (profile?: Pick<Profile, 'visited'>) =>
  new Set(profile?.visited?.filter(v => v.type === 'airfields').map(v => v.id)).size

export const visitedLabel = (count: number) => (count > 1 ? 'terrains visités' : 'terrain visité')

export const buildPassportBadge = ({ homebase, visitedCount }: PassportBadgeData) => {
  const base = homebase?.trim().toUpperCase().slice(0, 8)
  const count = String(Math.max(0, Math.floor(visitedCount)))
  const label = visitedLabel(visitedCount)
  const height = BADGE_HEIGHT
  const mid = height / 2

  // Left segment: plane icon, then the home base ICAO code when there is one
  const iconX = 12
  const baseX = iconX + 20 + 8
  const left = base ? baseX + base.length * 10.5 + 14 : iconX + 20 + 12

  // Right segment: count · label | aerotrips.fr (widths are conservative estimates)
  const countX = left + 14
  const labelX = countX + count.length * 14 + 6
  const ruleX = labelX + label.length * 6.6 + 12
  const siteX = ruleX + 1 + 12
  const width = Math.ceil(siteX + 12 * 7.4 + 14)

  const title = `${base ? `Base ${base} · ` : ''}${count} ${label} · aerotrips.fr`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs><clipPath id="pill"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${mid - 1}"/></clipPath></defs>
<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${mid - 1}" fill="#FFFFFF"/>
<rect x="0" y="0" width="${left}" height="${height}" fill="${NAVY}" clip-path="url(#pill)"/>
<path d="${PLANE}" transform="translate(${iconX} ${mid - 10}) scale(${20 / 24})" fill="none" stroke="${GOLD}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
${base ? `<text x="${baseX}" y="${mid}" dominant-baseline="central" font-family="${FONT_MONO}" font-size="17" font-weight="600" letter-spacing="1" fill="#FFFFFF">${esc(base)}</text>` : ''}
<text x="${countX}" y="${mid}" dominant-baseline="central" font-family="${FONT_SANS}" font-size="22" font-weight="700" fill="${INK}">${count}</text>
<text x="${labelX}" y="${mid}" dominant-baseline="central" font-family="${FONT_SANS}" font-size="14" font-weight="500" fill="${INK}">${label}</text>
<rect x="${ruleX}" y="${mid - 10}" width="1" height="20" fill="${RULE}"/>
<text x="${siteX}" y="${mid}" dominant-baseline="central" font-family="${FONT_MONO}" font-size="12" font-weight="600" fill="${MUTED}">aerotrips.fr</text>
<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${mid - 1}" fill="none" stroke="${NAVY}" stroke-width="2"/>
</svg>`

  return { svg, width, height, title }
}

export const buildPassportBadgeSvg = (data: PassportBadgeData) => buildPassportBadge(data).svg

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

export interface BadgeEmbed {
  /** Public 1x PNG */
  src: string
  /** Public 2x PNG, for high-density screens */
  src2x: string
  /** Where the badge links to: the pilot's public profile */
  href: string
  width: number
  height: number
  alt: string
}

/** Snippets to paste the hosted badge elsewhere: plain image URL, HTML (sites, email signatures), BBCode (forums). */
export const badgeEmbedCodes = ({ src, src2x, href, width, height, alt }: BadgeEmbed) => ({
  url: src,
  html: `<a href="${esc(href)}"><img src="${esc(src)}" srcset="${esc(src2x)} 2x" width="${width}" height="${height}" alt="${esc(alt)}"></a>`,
  bbcode: `[url=${href}][img]${src}[/img][/url]`,
})
