// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildPassportBadge } from '../../../src/utils/passportBadge.ts'
import { renderPassportImages } from './images.ts'

const passport = { displayName: 'Camille', homebase: 'LFPN', visited: ['LFAT', 'LFPN', 'LFPZ'] }
// LFPZ deliberately missing: it still counts, it just gets no dot
const positions = new Map([
  ['LFPN', { lat: 48.75, lon: 2.11 }],
  ['LFAT', { lat: 50.51, lon: 1.63 }],
])

// Width and height from a PNG's IHDR chunk
const pngSize = (data: Buffer) => ({ width: data.readUInt32BE(16), height: data.readUInt32BE(20) })

describe('renderPassportImages', () => {
  const images = Object.fromEntries(renderPassportImages(passport, positions).map((i) => [i.name, i]))
  const { width, height } = buildPassportBadge({ homebase: 'LFPN', visitedCount: 3 })

  it('renders the SVG and the 1x and 2x PNGs', () => {
    expect(Object.keys(images).sort()).toEqual(['badge.png', 'badge.svg', 'badge@2x.png', 'map.png'])
    expect(images['badge.svg'].contentType).toBe('image/svg+xml')
    expect(images['badge.svg'].data.toString()).toContain('>3</text>')
  })

  it('produces PNGs at the badge size and twice that', () => {
    expect(images['badge.png'].data.subarray(1, 4).toString()).toBe('PNG')
    expect(pngSize(images['badge.png'].data)).toEqual({ width, height })
    expect(pngSize(images['badge@2x.png'].data)).toEqual({ width: width * 2, height: height * 2 })
  })

  it('renders the 4:5 map', () => {
    expect(images['map.png'].contentType).toBe('image/png')
    expect(pngSize(images['map.png'].data)).toEqual({ width: 1080, height: 1350 })
  })
})
