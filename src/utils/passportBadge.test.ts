import { describe, expect, it } from 'vitest'
import { buildPassportBadgeSvg, countVisitedAirfields, svgDataUrl } from './passportBadge'

const width = (svg: string) => Number(/width="(\d+)"/.exec(svg)?.[1])

describe('countVisitedAirfields', () => {
  it('counts distinct airfields only', () => {
    expect(countVisitedAirfields({
      visited: [
        { type: 'airfields', id: 'LFPN' },
        { type: 'airfields', id: 'LFPN' },
        { type: 'airfields', id: 'LFAT' },
        { type: 'activities', id: 'abc' },
      ],
    })).toBe(2)
  })

  it('handles a missing profile or list', () => {
    expect(countVisitedAirfields(undefined)).toBe(0)
    expect(countVisitedAirfields({})).toBe(0)
  })
})

describe('buildPassportBadgeSvg', () => {
  it('shows the home base, the count and the site', () => {
    const svg = buildPassportBadgeSvg({ homebase: 'LFPN', visitedCount: 26 })
    expect(svg).toContain('>LFPN</text>')
    expect(svg).toContain('>26</text>')
    expect(svg).toContain('>terrains visités</text>')
    expect(svg).toContain('aerotrips.fr')
    expect(svg).toContain('aria-label="Base LFPN · 26 terrains visités · aerotrips.fr"')
  })

  it('uses the singular for zero or one airfield', () => {
    expect(buildPassportBadgeSvg({ homebase: 'LFPN', visitedCount: 1 })).toContain('>terrain visité</text>')
    expect(buildPassportBadgeSvg({ homebase: 'LFPN', visitedCount: 0 })).toContain('0 terrain visité ·')
  })

  it('drops the home base segment when there is none', () => {
    const withBase = buildPassportBadgeSvg({ homebase: 'LFPN', visitedCount: 3 })
    const without = buildPassportBadgeSvg({ visitedCount: 3 })
    expect(without).not.toContain('Base ')
    expect(width(without)).toBeLessThan(width(withBase))
  })

  it('grows with the number of digits', () => {
    expect(width(buildPassportBadgeSvg({ homebase: 'LFPN', visitedCount: 120 })))
      .toBeGreaterThan(width(buildPassportBadgeSvg({ homebase: 'LFPN', visitedCount: 12 })))
  })

  it('escapes the home base', () => {
    const svg = buildPassportBadgeSvg({ homebase: '<b>&"', visitedCount: 2 })
    expect(svg).not.toContain('<B>')
    expect(svg).toContain('&lt;B&gt;&amp;&quot;')
  })

  it('produces a data URL usable as an image source', () => {
    const url = svgDataUrl(buildPassportBadgeSvg({ homebase: 'LFPN', visitedCount: 2 }))
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,%3Csvg')).toBe(true)
  })
})
