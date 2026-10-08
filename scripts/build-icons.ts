/**
 * Renders the PNG icons (favicon fallback, web app manifest, iOS home screen)
 * from public/icon.svg. Rerun after changing the SVG:
 *
 *   npx tsx scripts/build-icons.ts
 */
import { mkdirSync, readFileSync } from 'node:fs'
import sharp from 'sharp'

const svg = readFileSync('public/icon.svg')
/** The dial's face colour, used to fill the full-bleed variants */
const BACKGROUND = '#1e1f25'

const render = (size: number) => sharp(svg, { density: 72 * size / 64 }).resize(size, size).png()

/** Full-bleed square: the dial at `scale` of the side on its own face colour. */
const fullBleed = async (size: number, scale: number) => {
  const inner = Math.round(size * scale)
  return sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: await render(inner).toBuffer(), gravity: 'center' }])
    .png()
}

mkdirSync('public/icons', { recursive: true })
await render(96).toFile('public/icon.png')
await render(192).toFile('public/icons/icon-192.png')
await render(512).toFile('public/icons/icon-512.png')
// Maskable icons may be cropped to a circle of 80% of the side (the safe zone).
await (await fullBleed(512, 0.8)).toFile('public/icons/icon-maskable-512.png')
// iOS fills transparency with black and only rounds the corners.
await (await fullBleed(180, 0.88)).toFile('public/icons/apple-touch-icon.png')
