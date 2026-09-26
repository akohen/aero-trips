import { describe, expect, it } from 'vitest'
import type { Activity, Airfield } from '..'
import { buildLandingEntries, buildLandingSeo, LANDING_PAGES } from './landingPages'

const restaurants = LANDING_PAGES.find((p) => p.slug === 'restaurants-aerodromes')!

const airfield = (codeIcao: string, name: string, latitude: number, status = 'CAP') =>
  ({ codeIcao, name, status, runways: [], position: { latitude, longitude: 0 } }) as unknown as Airfield

// ~1 km north of the given latitude
const activity = (id: string, type: string[], latitude: number) =>
  ({ id, name: id, type, position: { latitude: latitude + 0.009, longitude: 0 } }) as unknown as Activity

const airfields = new Map([
  ['LFBB', airfield('LFBB', 'BRAVO', 45)],
  ['LFAA', airfield('LFAA', 'ALPHA', 47)],
  ['LFCC', airfield('LFCC', 'CHARLIE', 49)],
  ['LFMM', airfield('LFMM', 'MIKE', 43, 'MIL')],
])
const activities = new Map([
  ['resto-a', activity('resto-a', ['food'], 47)],
  ['bike-b', activity('bike-b', ['bike'], 45)],
  ['gite-b', activity('gite-b', ['lodging', 'food'], 45)],
  ['musee-c', activity('musee-c', ['culture'], 49)],
  ['mess-m', activity('mess-m', ['food'], 43)],
])

describe('restaurants landing page', () => {
  const entries = buildLandingEntries(restaurants, airfields, activities)

  it('lists airfields with a food activity nearby, sorted by name, highlighting only the food', () => {
    expect(entries.map((e) => e.airfield.codeIcao)).toEqual(['LFAA', 'LFBB'])
    expect(entries[1].highlights.map(([, , id]) => id)).toEqual(['gite-b'])
  })

  it('leaves out military and closed airfields', () => {
    expect(entries.some((e) => e.airfield.codeIcao === 'LFMM')).toBe(false)
  })

  it('builds an ItemList of airfield pages with the count in the title', () => {
    const seo = buildLandingSeo(restaurants, entries)
    expect(seo.url).toBe('https://aerotrips.fr/decouvrir/restaurants-aerodromes')
    expect(seo.title).toContain('2 terrains')
    expect(seo.jsonLdItem).toMatchObject({
      '@type': 'ItemList',
      numberOfItems: 2,
      itemListElement: [
        { position: 1, url: 'https://aerotrips.fr/airfields/LFAA', name: "Aérodrome d'Alpha (LFAA)" },
        { position: 2, url: 'https://aerotrips.fr/airfields/LFBB' },
      ],
    })
  })
})
