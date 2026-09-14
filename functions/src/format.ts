/**
 * Output formatting and the size caps that keep a tool response affordable for
 * the model consuming it. Every cap lives here so there is one place to tune.
 */
import { labels } from '../../src/utils/labels.ts'
import { descriptionToText } from '../../src/utils/descriptionText.ts'
import { titleCase } from '../../src/utils/utils.ts'
import { SITE_URL, SNAPSHOT_DATE } from './data.ts'
import type { ToolOutcome } from './logging.ts'
import type { Activity, Airfield } from '../../src'

export const MAX_RESULTS = 50
export const DEFAULT_LIMIT = 20
/** Description snippet shown on a search row. */
export const MAX_DESC_SNIPPET = 120
/** Full description shown by get_airfield / get_activity. */
export const MAX_DESC_FULL = 4000
/** Final backstop on a whole tool response. */
export const MAX_RESPONSE_CHARS = 40000

export const label = (key: string) => labels.get(key) ?? key

/** Metres -> "12.4 km". Distances come out of haversine-distance in metres. */
export const km = (metres: number) => `${(metres / 1000).toFixed(1)} km`

export const isAirfield = (item: Airfield | Activity): item is Airfield => 'codeIcao' in item

export const displayName = (item: Airfield | Activity) =>
  isAirfield(item) ? titleCase(item.name) : item.name

export const itemUrl = (item: Airfield | Activity) =>
  isAirfield(item) ? `${SITE_URL}/airfields/${item.codeIcao}` : `${SITE_URL}/activities/${item.id}`

/**
 * Markdown rather than a bare URL: models relaying an answer carry the link
 * construct through a paraphrase, where a dangling URL on its own line reads as
 * metadata and gets dropped.
 */
export const itemLink = (item: Airfield | Activity, text: string = displayName(item)) =>
  `[${text}](${itemUrl(item)})`

/**
 * Descriptions reach the model as plain-ish markdown with images stripped:
 * the CDN image URLs in the data routinely exceed 300 characters and say
 * nothing a reader needs.
 */
export const description = (item: Airfield | Activity, maxLength: number) =>
  descriptionToText(item.description, { maxLength, images: false })

/**
 * One search-result line per item. Pure string builders, kept here rather than
 * in tools.ts so they can be unit-tested: this module's runtime graph is only
 * src/utils + data.ts, with no firebase-functions in it.
 */
export const airfieldRow = (airfield: Airfield, distance?: number) => [
  itemLink(airfield, `${airfield.codeIcao} — ${displayName(airfield)}`),
  label(airfield.status),
  runwaySummary(airfield),
  airfield.fuels?.length ? airfield.fuels.join(', ') : undefined,
  airfield.nightVFR ? 'VFR nuit' : undefined,
  airfield.toilet && airfield.toilet !== 'no' ? label(airfield.toilet) : undefined,
  distance !== undefined ? km(distance) : undefined,
].filter(Boolean).join(' · ')

export const activityRow = (activity: Activity, distance?: number) => {
  const snippet = description(activity, MAX_DESC_SNIPPET)
  const head = [
    `${itemLink(activity)} (${activity.type.map(label).join(', ')})`,
    distance !== undefined ? km(distance) : undefined,
    // Kept alongside the link even though it is the URL's last path segment:
    // this is what get_activity consumes, and making the model parse a URL to
    // recover it is a needless failure mode.
    `id: ${activity.id}`,
  ].filter(Boolean).join(' · ')
  return snippet ? `${head}\n  ${snippet}` : head
}

export const runwaySummary = (airfield: Airfield) =>
  airfield.runways
    .map(r => `${r.length} m${r.composition ? ` ${r.composition === 'GRASS' ? 'herbe' : 'revêtue'}` : ''}`)
    .join(' / ')

/**
 * Footer on every successful response: the snapshot date so the model can flag
 * staleness, the source, and one short instruction to pass the links on.
 *
 * The directive sits next to the data the model is reading, which is why it is
 * followed more reliably than the server instructions alone. Keep it to a single
 * line — a longer or more promotional footer, repeated on every call, reads as
 * spam and models start suppressing it.
 */
export const header = (lines: string[]) => [
  ...lines,
  `Données au ${SNAPSHOT_DATE} — source : AeroTrips (${SITE_URL}).`,
  "Inclure les liens des fiches dans la réponse à l'utilisateur.",
].join('\n')

export const truncateResponse = (text: string) =>
  text.length <= MAX_RESPONSE_CHARS
    ? text
    : `${text.slice(0, MAX_RESPONSE_CHARS)}\n\n… (tronqué)`

/**
 * Tool outcomes. These are plain objects, not the MCP content shape: the
 * logging wrapper (see logging.ts) needs the result count before converting.
 */
export const textResult = (text: string, count?: number): ToolOutcome => ({
  text: truncateResponse(text),
  ...(count !== undefined ? { count } : {}),
})

export const errorResult = (text: string): ToolOutcome => ({ text, isError: true })
