import { describe, expect, it } from 'vitest'
import { lambert93 } from './franceMap'
import { buildPassportMap } from './passportMap'

const LFPN = { lat: 48.7498, lon: 2.1112 }
const LFKC = { lat: 42.5244, lon: 8.793 }

const dots = (svg: string) => svg.match(/<circle cx="[\d.]+" cy="[\d.]+" r="9"\/>/g) ?? []

describe('lambert93', () => {
  it('matches the reference projection of Paris', () => {
    const [x, y] = lambert93(48.8566, 2.3522)
    expect(Math.abs(x - 652_400)).toBeLessThan(1_000)
    expect(Math.abs(y - 6_862_000)).toBeLessThan(1_000)
  })
})

describe('buildPassportMap', () => {
  it('shows the count, the home base and one dot per located airfield only', () => {
    const { svg, width, height } = buildPassportMap({
      displayName: 'Camille D.', homebase: 'LFPN', home: LFPN, visitedCount: 3, visited: [LFPN, LFKC],
    })
    expect([width, height]).toEqual([1080, 1350])
    expect(svg).toContain('>3</text>')
    expect(svg).toContain('>terrains visités</text>')
    expect(svg).toContain('>BASE LFPN</text>')
    expect(svg).toContain('>Camille D.</text>')
    expect(dots(svg)).toHaveLength(2)
    expect(svg).toContain('r="19"') // home marker
  })

  it('places points inside the canvas, Corsica bottom right', () => {
    const { svg } = buildPassportMap({ visitedCount: 1, visited: [LFKC] })
    const [, x, y] = /<circle cx="([\d.]+)" cy="([\d.]+)" r="9"\/>/.exec(svg)!.map(Number)
    expect(x).toBeGreaterThan(800)
    expect(x).toBeLessThan(1080)
    expect(y).toBeGreaterThan(1000)
    expect(y).toBeLessThan(1350)
  })

  it('omits what is unknown', () => {
    const { svg } = buildPassportMap({ visitedCount: 0, visited: [] })
    expect(svg).not.toContain('BASE')
    expect(svg).not.toContain('r="19"')
    expect(svg).toContain('>terrain visité</text>')
  })

  it('escapes and shortens the name', () => {
    const { svg } = buildPassportMap({ displayName: '<b>' + 'x'.repeat(60), visitedCount: 0, visited: [] })
    expect(svg).toContain('&lt;b&gt;')
    expect(svg).toMatch(/x…<\/text>/)
  })
})
