/**
 * Renders the public images of a passport (badge and map). They are published to Storage by
 * `syncPassport` when the passport changes, so a badge hotlinked from a busy
 * site costs downloads only, never a function execution.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { PASSPORT_IMAGES, type PublicPassport } from '../../../src/utils/passport.ts'
import { buildPassportBadge } from '../../../src/utils/passportBadge.ts'
import { buildPassportMap, type LatLon } from '../../../src/utils/passportMap.ts'

// lib/index.js (deployed) and src/images.ts (tests) are both one level below fonts/
const FONTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts')
const fontFiles = ['IBMPlexSans-Medium.ttf', 'IBMPlexSans-Bold.ttf', 'IBMPlexMono-SemiBold.ttf'].map((f) => join(FONTS, f))

/**
 * Bundled fonts only, so the output is identical on every machine; the generic
 * families at the end of the badge's font stacks resolve to Plex.
 */
const toPng = (svg: string, zoom: number) =>
  new Resvg(svg, {
    fitTo: { mode: 'zoom', value: zoom },
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: 'IBM Plex Sans',
      sansSerifFamily: 'IBM Plex Sans',
      monospaceFamily: 'IBM Plex Mono',
    },
  }).render().asPng()

export interface RenderedImage {
  name: string
  contentType: string
  data: Buffer
}

/**
 * @param positions airfield positions by code; airfields that can't be located
 * still count, they just don't get a dot on the map.
 */
export const renderPassportImages = (passport: PublicPassport, positions: Map<string, LatLon>): RenderedImage[] => {
  const homebase = passport.homebase ?? undefined
  const { svg } = buildPassportBadge({ homebase, visitedCount: passport.visited.length })
  const map = buildPassportMap({
    displayName: passport.displayName || undefined,
    homebase,
    home: homebase ? positions.get(homebase) : undefined,
    visitedCount: passport.visited.length,
    visited: passport.visited.flatMap((code) => positions.get(code) ?? []),
  })
  return [
    { name: PASSPORT_IMAGES.svg, contentType: 'image/svg+xml', data: Buffer.from(svg) },
    { name: PASSPORT_IMAGES.png, contentType: 'image/png', data: toPng(svg, 1) },
    { name: PASSPORT_IMAGES.png2x, contentType: 'image/png', data: toPng(svg, 2) },
    { name: PASSPORT_IMAGES.map, contentType: 'image/png', data: toPng(map.svg, 1) },
  ]
}
