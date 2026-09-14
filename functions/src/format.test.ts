import { describe, expect, it } from 'vitest'
import { activityRow, airfieldRow, header, itemLink, itemUrl } from './format.ts'
import type { Activity, Airfield } from '../../src'

// Minimal stand-ins shaped like the snapshot records. Positions are plain
// lat/lon objects there, not live Firestore GeoPoints.
const airfield = {
  codeIcao: 'LFAB',
  name: 'DIEPPE SAINT AUBIN',
  status: 'CAP',
  position: { latitude: 49.88263, longitude: 1.08533 },
  runways: [
    { designation: '13L/31R', length: 650, composition: 'GRASS' },
    { designation: '13/31', length: 820, composition: 'ASPH' },
  ],
  fuels: ['100LL', 'JETA1'],
  toilet: 'private',
} as unknown as Airfield

const activity = {
  id: 'la-tanniere-2vy1ss',
  name: 'La Tannière',
  type: ['food'],
  position: { latitude: 48.8, longitude: 2.1 },
} as unknown as Activity

describe('itemUrl / itemLink', () => {
  it('builds fiche URLs from the ICAO code or the activity id', () => {
    expect(itemUrl(airfield)).toBe('https://aerotrips.fr/airfields/LFAB')
    expect(itemUrl(activity)).toBe('https://aerotrips.fr/activities/la-tanniere-2vy1ss')
  })

  it('defaults the link text to the display name, title-casing airfields', () => {
    expect(itemLink(airfield)).toBe('[Dieppe Saint Aubin](https://aerotrips.fr/airfields/LFAB)')
    expect(itemLink(activity)).toBe('[La Tannière](https://aerotrips.fr/activities/la-tanniere-2vy1ss)')
  })

  it('accepts custom link text', () => {
    expect(itemLink(airfield, 'LFAB — Dieppe')).toBe('[LFAB — Dieppe](https://aerotrips.fr/airfields/LFAB)')
  })
})

describe('airfieldRow', () => {
  it('leads with a markdown link carrying the ICAO code and name', () => {
    expect(airfieldRow(airfield)).toMatch(/^\[LFAB — Dieppe Saint Aubin\]\(https:\/\/aerotrips\.fr\/airfields\/LFAB\) · /)
  })

  it('keeps the existing fields after the link', () => {
    const row = airfieldRow(airfield, 12400)
    expect(row).toContain('Ouvert à la circulation aérienne publique')
    expect(row).toContain('650 m herbe / 820 m revêtue')
    expect(row).toContain('100LL, JETA1')
    expect(row).toContain('Toilettes privées')
    expect(row).toContain('12.4 km')
  })

  it('omits the distance when there is no reference point', () => {
    expect(airfieldRow(airfield)).not.toMatch(/\d+\.\d km/)
  })
})

describe('activityRow', () => {
  it('links the name and keeps the id for follow-up tool calls', () => {
    const row = activityRow(activity, 4300)
    expect(row).toContain('[La Tannière](https://aerotrips.fr/activities/la-tanniere-2vy1ss)')
    expect(row).toContain('id: la-tanniere-2vy1ss')
    expect(row).toContain('(Restauration)')
    expect(row).toContain('4.3 km')
  })
})

describe('header', () => {
  it('appends the snapshot date, the source and the link directive', () => {
    const lines = header(['Résultat']).split('\n')
    expect(lines[0]).toBe('Résultat')
    expect(lines.at(-2)).toMatch(/^Données au \d{2}\/\d{2}\/\d{4} — source : AeroTrips \(https:\/\/aerotrips\.fr\)\.$/)
    expect(lines.at(-1)).toBe("Inclure les liens des fiches dans la réponse à l'utilisateur.")
  })
})
