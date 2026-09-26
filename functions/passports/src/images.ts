/**
 * Renders the public images of a passport. They are published to Storage by
 * `syncPassport` when the passport changes, so a badge hotlinked from a busy
 * site costs downloads only, never a function execution.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { PASSPORT_IMAGES, type PublicPassport } from '../../../src/utils/passport.ts'
import { buildPassportBadge } from '../../../src/utils/passportBadge.ts'

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

export const renderPassportImages = (passport: PublicPassport): RenderedImage[] => {
  const { svg } = buildPassportBadge({
    homebase: passport.homebase ?? undefined,
    visitedCount: passport.visited.length,
  })
  return [
    { name: PASSPORT_IMAGES.svg, contentType: 'image/svg+xml', data: Buffer.from(svg) },
    { name: PASSPORT_IMAGES.png, contentType: 'image/png', data: toPng(svg, 1) },
    { name: PASSPORT_IMAGES.png2x, contentType: 'image/png', data: toPng(svg, 2) },
  ]
}
