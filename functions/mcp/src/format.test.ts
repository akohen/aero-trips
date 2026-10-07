import { describe, expect, it } from 'vitest'
import { activityRow, airfieldRow, header, itemImageMarkdown, itemLink, itemUrl, landingFeeLines } from './format.ts'
import type { Activity, Airfield } from '../../../src'

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
  it('appends the snapshot date and the source, with no directive', () => {
    const lines = header(['Résultat']).split('\n')
    expect(lines[0]).toBe('Résultat')
    expect(lines.at(-1)).toMatch(/^Données au \d{2}\/\d{2}\/\d{4} — source : AeroTrips \(https:\/\/aerotrips\.fr\)\.$/)
    // Imperatives belong in the tool schema, not in tool-result text.
    expect(header(['x'])).not.toMatch(/Inclure/)
  })
})

describe('itemImageMarkdown', () => {
  const withImage = {
    ...activity,
    description: { type: 'doc', content: [{ type: 'image', attrs: { src: 'https://storage.googleapis.com/a.jpg' } }] },
  } as unknown as Activity

  it('emits the item photograph as markdown', () => {
    expect(itemImageMarkdown(withImage)).toBe('![La Tannière](https://storage.googleapis.com/a.jpg)')
  })

  it('emits nothing when the item has no real photograph', () => {
    // Never a generic stock fallback: the model would present it as this place.
    expect(itemImageMarkdown(activity)).toBe('')
    expect(itemImageMarkdown(airfield)).toBe('')
  })

  it('puts the photo on the search row only when one exists', () => {
    expect(activityRow(withImage)).toContain('![La Tannière](https://storage.googleapis.com/a.jpg)')
    expect(activityRow(activity)).not.toContain('![')
  })
})

describe('landing fee', () => {
  const checkedAt = { seconds: Date.parse('2026-10-07') / 1000, nanoseconds: 0 }
  const paid = { ...airfield, landingFee: {
    amount: 10.2, parking24h: 6.3, note: 'Estimation aeroPS.', url: 'https://aerops.test/LFAB', source: 'aerops', checkedAt,
  } } as unknown as Airfield
  const free = { ...airfield, landingFee: { amount: 0, source: 'pilot', checkedAt } } as unknown as Airfield

  it('adds the fee to search rows only when known', () => {
    expect(airfieldRow(paid)).toContain("taxe d'atterrissage ≈ 10 €")
    expect(airfieldRow(free)).toContain('atterrissage gratuit')
    expect(airfieldRow(airfield)).not.toContain('atterrissage')
  })

  it('details amount, parking, note and the linked, dated source', () => {
    expect(landingFeeLines(paid)).toEqual([
      "Taxe d'atterrissage : ≈ 10 € (avion léger visiteur, TTC), indicatif",
      'Stationnement 24 h : ≈ 6 €',
      'Précisions : Estimation aeroPS.',
      'Source : [Estimation aeroPS, relevée le 7 oct. 2026](https://aerops.test/LFAB)',
    ])
    expect(landingFeeLines(free)).toEqual(['Atterrissage gratuit, indicatif', 'Source : Signalé par un pilote en octobre 2026'])
    expect(landingFeeLines(airfield)).toEqual(["Taxe d'atterrissage : inconnue"])
  })
})
