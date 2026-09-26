import { FRANCE_FRAME, FRANCE_HEIGHT, FRANCE_PATH, FRANCE_WIDTH } from '../data/franceOutline'
import { toFramePoint } from './franceMap'
import { FONT_MONO, FONT_SANS, esc, visitedLabel } from './passportBadge'

// Shareable "pilot passport" map (4:5, social-feed friendly): metropolitan France
// with the home base and the visited airfields only, and the visited count.
// Standalone SVG like the badge: rendered to PNG by the `passports` function with
// its bundled fonts, so text positions don't depend on measured widths.

const NAVY = '#16233F'
const LAND = '#22345A'
const COAST = '#3A5078'
const GOLD = '#E7B04A'
const SOFT = '#C3CDE3'

// Tabler "plane" icon (MIT), drawn in a 24x24 box
const PLANE = 'M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2-7h-4l-2 2h-3l2-4-2-4h3l2 2h4l-2-7h3z'

export const MAP_WIDTH = 1080
export const MAP_HEIGHT = 1350

const MARGIN = 72
const MAP_TOP = 420
const MAP_BOTTOM = 1240
const MAX_NAME = 40

export interface LatLon {
  lat: number
  lon: number
}

export interface PassportMapData {
  displayName?: string
  homebase?: string
  /** Home base position; no marker without it */
  home?: LatLon
  /** Number of visited airfields, shown as is */
  visitedCount: number
  /** Positions of the visited airfields that could be located */
  visited: LatLon[]
}

export const buildPassportMap = ({ displayName, homebase, home, visitedCount, visited }: PassportMapData) => {
  const width = MAP_WIDTH
  const height = MAP_HEIGHT
  const fullName = displayName?.trim()
  const name = fullName && fullName.length > MAX_NAME ? `${fullName.slice(0, MAX_NAME - 1)}…` : fullName
  // Shrink long names to fit the width (Plex Sans Bold averages ~0.56em per character)
  const nameSize = name ? Math.max(36, Math.min(52, Math.floor((width - 2 * MARGIN) / (name.length * 0.56)))) : 52
  const base = homebase?.trim().toUpperCase().slice(0, 8)
  const count = Math.max(0, Math.floor(visitedCount))
  const label = visitedLabel(count)

  // Fit the outline in the map area, centred horizontally
  const areaWidth = width - 2 * MARGIN
  const areaHeight = MAP_BOTTOM - MAP_TOP
  const k = Math.min(areaWidth / FRANCE_WIDTH, areaHeight / FRANCE_HEIGHT)
  const offsetX = MARGIN + (areaWidth - FRANCE_WIDTH * k) / 2
  const offsetY = MAP_TOP + (areaHeight - FRANCE_HEIGHT * k) / 2
  const place = ({ lat, lon }: LatLon) => {
    const [x, y] = toFramePoint(FRANCE_FRAME, lat, lon)
    return [Math.round((offsetX + x * k) * 10) / 10, Math.round((offsetY + y * k) * 10) / 10]
  }

  const dots = visited
    .map(place)
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`)
    .join('')
  const homeMarker = home
    ? (([x, y]) => `<circle cx="${x}" cy="${y}" r="19" fill="none" stroke="#FFFFFF" stroke-width="5"/><circle cx="${x}" cy="${y}" r="7" fill="#FFFFFF"/>`)(place(home))
    : ''

  const title = `${name ? `${name} · ` : ''}${base ? `Base ${base} · ` : ''}${count} ${label} · aerotrips.fr`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<rect width="${width}" height="${height}" fill="${NAVY}"/>
<text x="${MARGIN}" y="96" font-family="${FONT_SANS}" font-size="24" font-weight="700" letter-spacing="6" fill="${SOFT}">PASSEPORT PILOTE</text>
${base ? `<text x="${width - MARGIN}" y="96" text-anchor="end" font-family="${FONT_MONO}" font-size="26" font-weight="600" letter-spacing="2" fill="${SOFT}">BASE ${esc(base)}</text>` : ''}
${name ? `<text x="${MARGIN}" y="168" font-family="${FONT_SANS}" font-size="${nameSize}" font-weight="700" fill="#FFFFFF">${esc(name)}</text>` : ''}
<text x="${MARGIN - 6}" y="318" font-family="${FONT_SANS}" font-size="150" font-weight="700" fill="${GOLD}">${count}</text>
<text x="${MARGIN}" y="378" font-family="${FONT_SANS}" font-size="46" font-weight="500" fill="#FFFFFF">${label}</text>
<path d="${FRANCE_PATH}" transform="translate(${offsetX.toFixed(1)} ${offsetY.toFixed(1)}) scale(${k.toFixed(4)})" fill="${LAND}" stroke="${COAST}" stroke-width="${(2.5 / k).toFixed(2)}" stroke-linejoin="round"/>
<g fill="${GOLD}" stroke="${NAVY}" stroke-width="3">${dots}</g>
${homeMarker}
<path d="${PLANE}" transform="translate(${MARGIN} ${height - 82}) scale(${34 / 24})" fill="none" stroke="${GOLD}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${MARGIN + 50}" y="${height - 53}" font-family="${FONT_MONO}" font-size="30" font-weight="600" fill="#FFFFFF">aerotrips.fr</text>
</svg>`

  return { svg, width, height, title }
}
