import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { Report } from '..'
import { authorName, deriveAirfieldFacts, groupVisits, isPilotReport, deriveLandingFee, deriveReportStats, FeeReport, formatVisitDate, parseFeeAmount, reportFeeLabel, sameReportStats, sortReports, visitDayToUtc, formatFeeAmount, formatLandingFee, landingFeeAtMost, landingFeeLevel, landingFeeDisplay, landingFeeSource, sameLandingFee, sourceKey, TimestampLike } from './reports'

const at = (date: string): TimestampLike => ({ seconds: Date.parse(date) / 1000, nanoseconds: 0 })

const report = (id: string, source: FeeReport['source'], observedAt: string, landingFee?: FeeReport['landingFee']): FeeReport =>
  ({ id, source, observedAt: at(observedAt), updated_at: at(observedAt), landingFee })

const aerops = { type: 'import', id: 'aerops' } as const
const aeropsLive = { type: 'import', id: 'aerops-live' } as const
const official = { type: 'import', id: 'official' } as const
const admin = { type: 'admin' } as const
const pilot = { type: 'pilot' } as const

describe('deriveLandingFee', () => {
  it('returns nothing for no reports (unknown, never free)', () => {
    expect(deriveLandingFee([])).toEqual({ conflicts: [] })
  })

  it('ignores reports without a usable fee', () => {
    const reports = [
      report('a', pilot, '2026-09-01'),
      report('b', aerops, '2026-09-01', { amount: -1 }),
      report('c', aerops, '2026-09-01', { amount: NaN }),
    ]
    expect(deriveLandingFee(reports).landingFee).toBeUndefined()
  })

  it('copies the chosen report', () => {
    const fee = { amount: 12.5, parking24h: 8, parkingIncludedHours: 1, note: 'FFA −50 %', url: 'https://x.test/a.pdf', pageUrl: 'https://x.test' }
    const r = report('official-LFXX', official, '2026-09-01', fee)
    expect(deriveLandingFee([r]).landingFee).toEqual({ ...fee, source: 'official', checkedAt: r.observedAt })
  })

  it('keeps free as an explicit 0 and omits absent fields', () => {
    const fee = deriveLandingFee([report('a', pilot, '2025-06-01', { amount: 0 })]).landingFee
    expect(fee).toEqual({ amount: 0, source: 'pilot', checkedAt: at('2025-06-01') })
    expect(Object.keys(fee!)).not.toContain('parking24h')
  })

  it('picks the newest report by observedAt, whatever the input order', () => {
    const reports = [
      report('old', aerops, '2024-01-01', { amount: 10 }),
      report('new', official, '2026-03-01', { amount: 11 }),
      report('mid', pilot, '2025-05-01', { amount: 12 }),
    ]
    expect(deriveLandingFee(reports).landingFee).toMatchObject({ amount: 11, source: 'official' })
    expect(deriveLandingFee([...reports].reverse()).landingFee).toMatchObject({ amount: 11, source: 'official' })
  })

  it('lets an admin report win over newer ones, the newest admin first', () => {
    const reports = [
      report('a1', admin, '2023-01-01', { amount: 5 }),
      report('a2', admin, '2024-01-01', { amount: 6 }),
      report('p', pilot, '2026-09-01', { amount: 20 }),
    ]
    expect(deriveLandingFee(reports).landingFee).toMatchObject({ amount: 6, source: 'admin' })
  })

  it('lets an old admin report win too', () => {
    const reports = [report('a', admin, '2015-01-01', { amount: 0 }), report('p', pilot, '2026-01-01', { amount: 9 })]
    expect(deriveLandingFee(reports).landingFee).toMatchObject({ amount: 0, source: 'admin' })
  })

  it('ranks sources by trust tier, then by date', () => {
    const sheet = report('official-X', official, '2026-02-01', { amount: 39.6 })
    const live = report('aerops-X', aeropsLive, '2026-10-07', { amount: 7.22 })
    const estimate = report('aerops-Y', aerops, '2026-10-07', { amount: 5 })
    // A live aeroPS price can be misconfigured: the operator's sheet wins, even older
    expect(deriveLandingFee([live, sheet]).landingFee).toMatchObject({ amount: 39.6, source: 'official' })
    expect(deriveLandingFee([estimate, live]).landingFee).toMatchObject({ amount: 7.22, source: 'aerops-live' })
    expect(deriveLandingFee([estimate]).landingFee).toMatchObject({ amount: 5, source: 'aerops' })
    // Pilots, reported here or imported: below live prices, above estimates
    const visit = report('p', pilot, '2026-10-08', { amount: 0 })
    expect(deriveLandingFee([visit, live]).landingFee).toMatchObject({ amount: 7.22, source: 'aerops-live' })
    expect(deriveLandingFee([report('community-X', pilot, '2011-12-01', { amount: 0 }), estimate]).landingFee)
      .toMatchObject({ amount: 0, source: 'pilot' })
    // A newer pilot report doesn't replace a sheet (a conflict, for review); an admin report does
    expect(deriveLandingFee([sheet, visit]).landingFee).toMatchObject({ amount: 39.6, source: 'official' })
    expect(deriveLandingFee([sheet, visit, live, report('a', admin, '2020-01-01', { amount: 1 })]).landingFee)
      .toMatchObject({ source: 'admin' })
  })

  it('ranks unknown sources last', () => {
    const unknown = report('x', { type: 'import', id: 'edeis' }, '2026-10-01', { amount: 11 })
    expect(deriveLandingFee([unknown, report('e', aerops, '2020-01-01', { amount: 5 })]).landingFee).toMatchObject({ source: 'aerops' })
    expect(deriveLandingFee([unknown]).landingFee).toMatchObject({ source: 'edeis' })
  })

  it('uses old reports when there is nothing newer', () => {
    const reports = [report('a', aerops, '2011-06-01', { amount: 0 }), report('b', official, '2018-02-01', { amount: 4 })]
    expect(deriveLandingFee(reports).landingFee).toEqual({ amount: 4, source: 'official', checkedAt: at('2018-02-01') })
  })

  it('takes parking from the chosen report only', () => {
    const reports = [
      report('a', aerops, '2025-01-01', { amount: 10, parking24h: 15 }),
      report('b', pilot, '2026-01-01', { amount: 12 }),
    ]
    expect(deriveLandingFee(reports).landingFee).not.toHaveProperty('parking24h')
  })

  it('breaks observedAt ties by updated_at, then by id', () => {
    const a = { ...report('a', aerops, '2026-01-01', { amount: 10 }), updated_at: at('2026-02-01') }
    const b = { ...report('b', official, '2026-01-01', { amount: 11 }), updated_at: at('2026-03-01') }
    expect(deriveLandingFee([a, b]).landingFee?.source).toBe('official')
    expect(deriveLandingFee([b, a]).landingFee?.source).toBe('official')

    const c = report('c', aerops, '2026-01-01', { amount: 10 })
    const d = report('d', official, '2026-01-01', { amount: 11 })
    expect(deriveLandingFee([c, d]).landingFee?.source).toBe(deriveLandingFee([d, c]).landingFee?.source)
  })

  describe('conflicts', () => {
    it('reports sources disagreeing by more than 20 % and 2 €', () => {
      const reports = [report('aerops-X', aerops, '2026-01-01', { amount: 43.81 }), report('official-X', official, '2026-09-01', { amount: 5.99 })]
      const { landingFee, conflicts } = deriveLandingFee(reports)
      expect(landingFee?.source).toBe('official')
      expect(conflicts).toEqual([{ reports: [
        { id: 'official-X', source: 'official', amount: 5.99 },
        { id: 'aerops-X', source: 'aerops', amount: 43.81 },
      ] }])
    })

    it('ignores small gaps: under 2 €, or under 20 %', () => {
      const under2 = [report('a', aerops, '2026-01-01', { amount: 5 }), report('b', official, '2026-02-01', { amount: 6.5 })]
      const under20 = [report('a', aerops, '2026-01-01', { amount: 50 }), report('b', official, '2026-02-01', { amount: 45 })]
      expect(deriveLandingFee(under2).conflicts).toEqual([])
      expect(deriveLandingFee(under20).conflicts).toEqual([])
    })

    it('only compares the newest report of each source', () => {
      const reports = [
        report('p1', pilot, '2025-01-01', { amount: 40 }),
        report('p2', pilot, '2026-01-01', { amount: 10 }),
        report('e', official, '2026-02-01', { amount: 10 }),
      ]
      expect(deriveLandingFee(reports).conflicts).toEqual([])
    })

    it('includes free versus paying', () => {
      const reports = [report('a', aerops, '2026-01-01', { amount: 0 }), report('b', pilot, '2026-02-01', { amount: 8 })]
      expect(deriveLandingFee(reports).conflicts).toHaveLength(1)
    })
  })

  it('accepts Firestore reports and keeps their Timestamp', () => {
    const observedAt = Timestamp.fromMillis(Date.UTC(2026, 0, 1))
    const r: Report = { id: 'r', target: { type: 'airfields', id: 'LFXX' }, source: aerops, observedAt, updated_at: observedAt, landingFee: { amount: 3 } }
    expect(deriveLandingFee([r]).landingFee?.checkedAt).toBe(observedAt)
  })
})

describe('sourceKey', () => {
  it('uses the import id, else the type', () => {
    expect(sourceKey(aerops)).toBe('aerops')
    expect(sourceKey(admin)).toBe('admin')
    expect(sourceKey(pilot)).toBe('pilot')
  })
})

describe('sameLandingFee', () => {
  const fee = { amount: 10, source: 'aerops', checkedAt: at('2026-01-01') }
  it('compares every field, timestamps by value', () => {
    expect(sameLandingFee(undefined, undefined)).toBe(true)
    expect(sameLandingFee(fee, undefined)).toBe(false)
    expect(sameLandingFee(fee, { ...fee, checkedAt: Timestamp.fromMillis(Date.parse('2026-01-01')) })).toBe(true)
    expect(sameLandingFee(fee, { ...fee, checkedAt: at('2026-01-02') })).toBe(false)
    expect(sameLandingFee(fee, { ...fee, parking24h: 5 })).toBe(false)
    expect(sameLandingFee(fee, { ...fee, note: 'x' })).toBe(false)
    expect(sameLandingFee(fee, { ...fee, parkingIncludedHours: 24 })).toBe(false)
    expect(sameLandingFee(fee, { ...fee, pageUrl: 'https://x.test' })).toBe(false)
  })
})

describe('formatLandingFee', () => {
  it('rounds to the euro', () => {
    expect(formatFeeAmount(10)).toBe('≈ 10 €')
    expect(formatFeeAmount(11.99)).toBe('≈ 12 €')
    expect(formatFeeAmount(0.5)).toBe('< 1 €')
    expect(formatFeeAmount(0)).toBe('Gratuit')
  })

  it('formats the fee amount', () => {
    expect(formatLandingFee({ amount: 0 })).toBe('Gratuit')
    expect(formatLandingFee({ amount: 9.5 })).toBe('≈ 10 €')
  })
})


describe('landingFeeAtMost', () => {
  it('compares the shown amount, free meaning exactly 0, unknown never', () => {
    expect(landingFeeAtMost(undefined, 10)).toBe(false)
    expect(landingFeeAtMost({ amount: 0 }, 0)).toBe(true)
    expect(landingFeeAtMost({ amount: 0.4 }, 0)).toBe(false)
    expect(landingFeeAtMost({ amount: 0 }, 10)).toBe(true)
    expect(landingFeeAtMost({ amount: 10.4 }, 10)).toBe(true)
    expect(landingFeeAtMost({ amount: 10.5 }, 10)).toBe(false)
  })
})

describe('landingFeeSource', () => {
  it('words each source with its date, in Paris time', () => {
    expect(landingFeeSource({ source: 'official', checkedAt: at('2026-04-01T00:00:00Z') })).toBe('Guide tarifaire, en vigueur depuis avril 2026')
    expect(landingFeeSource({ source: 'pilot', checkedAt: at('2026-09-12') })).toBe('Signalé par un pilote en septembre 2026')
    expect(landingFeeSource({ source: 'aerops', checkedAt: at('2026-10-07T09:27:13Z') })).toBe('Estimation aeroPS, relevée le 7 oct. 2026')
    expect(landingFeeSource({ source: 'aerops-live', checkedAt: at('2026-10-07') })).toBe('aeroPS, relevé le 7 oct. 2026')
    expect(landingFeeSource({ source: 'edeis', checkedAt: at('2026-03-01') })).toBe('edeis, mars 2026')
    // 31 Dec 23:30 UTC is already 1 Jan in Paris
    expect(landingFeeSource({ source: 'pilot', checkedAt: at('2011-12-31T23:30:00Z') })).toBe('Signalé par un pilote en janvier 2012')
  })
})

describe('landingFeeDisplay', () => {
  it('says unknown when there is no fee, never free', () => {
    expect(landingFeeDisplay(undefined)).toEqual({ label: "Taxe d'atterrissage : inconnue", known: false, parking: [] })
  })

  it('shows free landings and their source', () => {
    const display = landingFeeDisplay({ amount: 0, source: 'pilot', checkedAt: at('2011-06-01'), note: 'n', url: 'https://x.test' })
    expect(display).toEqual({ label: 'Atterrissage gratuit', known: true, parking: [], note: 'n', source: 'Signalé par un pilote en juin 2011', url: 'https://x.test' })
  })

  it('shows paid fees with parking, included or per 24 h', () => {
    const display = landingFeeDisplay({ amount: 39.6, parkingIncludedHours: 24, parking24h: 0, pageUrl: 'https://x.test', source: 'official', checkedAt: at('2026-02-01') })
    expect(display.label).toBe("Taxe d'atterrissage : ≈ 40 €")
    expect(display.parking).toEqual(['Stationnement 24 h inclus', 'Stationnement 24 h : gratuit'])
    expect(display.pageUrl).toBe('https://x.test')
    expect(display).not.toHaveProperty('url')
    expect(landingFeeDisplay({ amount: 5, url: 'javascript:alert(1)', source: 'admin', checkedAt: at('2026-10-07') })).not.toHaveProperty('url')
    expect(landingFeeDisplay({ amount: 5, parkingIncludedHours: 1, parking24h: 6.3, source: 'aerops', checkedAt: at('2026-10-07') }).parking)
      .toEqual(['1 h de stationnement incluse', 'Stationnement 24 h : ≈ 6 €'])
    expect(landingFeeDisplay({ amount: 5, parkingIncludedHours: 3, source: 'aerops', checkedAt: at('2026-10-07') }).parking)
      .toEqual(['3 h de stationnement incluses'])
  })
})

describe('landingFeeLevel', () => {
  it('buckets the shown amount: free, < 15 €, 15 € and more; unknown has none', () => {
    expect(landingFeeLevel(undefined)).toBeUndefined()
    expect(landingFeeLevel({ amount: 0 })).toBe('free')
    expect(landingFeeLevel({ amount: 0.4 })).toBe('cheap')
    expect(landingFeeLevel({ amount: 14.4 })).toBe('cheap')
    expect(landingFeeLevel({ amount: 14.5 })).toBe('high')
    expect(landingFeeLevel({ amount: 104 })).toBe('high')
  })
})

describe('heavier aircraft', () => {
  it('never sets the airfield fee nor conflicts with it', () => {
    const reports = [
      report('official-LFXX', official, '2026-01-01', { amount: 10 }),
      { ...report('p', pilot, '2026-09-01', { amount: 40 }), aircraftClass: 'heavy' as const },
    ]
    expect(deriveLandingFee(reports)).toEqual({ landingFee: { amount: 10, source: 'official', checkedAt: at('2026-01-01') }, conflicts: [] })
    expect(deriveLandingFee([reports[1]]).landingFee).toBeUndefined()
  })

  it('counts light pilot fees like any pilot fee', () => {
    const r = { ...report('p', pilot, '2026-09-01', { amount: 12 }), aircraftClass: 'light' as const }
    expect(deriveLandingFee([r]).landingFee?.amount).toBe(12)
  })
})

describe('pilot reports', () => {
  it('sorts newest visit first', () => {
    const reports = [report('a', pilot, '2026-01-01'), report('b', pilot, '2026-09-01'), report('c', pilot, '2026-05-01')]
    expect(sortReports(reports).map(r => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('publishes first names and initials', () => {
    expect(authorName('Jean-Pierre Dupont')).toBe('Jean-Pierre D.')
    expect(authorName('  marie  de la tour ')).toBe('marie D. L. T.')
    expect(authorName('Alex')).toBe('Alex')
    expect(authorName('')).toBe('Pilote')
    expect(authorName(null)).toBe('Pilote')
  })

  it('parses amounts typed with a comma or a euro sign', () => {
    expect(parseFeeAmount('12,50')).toBe(12.5)
    expect(parseFeeAmount(' 12.5 € ')).toBe(12.5)
    expect(parseFeeAmount('0')).toBe(0)
    expect(parseFeeAmount('1 000')).toBe(1000)
    for (const bad of ['', 'abc', '-3', '12,555', '1001', '1e3']) expect(parseFeeAmount(bad)).toBeUndefined()
  })

  it('labels the fee paid, exactly, with the weight class', () => {
    expect(reportFeeLabel({ landingFee: { amount: 12.5 } })).toBe('Taxe payée : 12,50\u00a0€')
    expect(reportFeeLabel({ landingFee: { amount: 10 } })).toBe('Taxe payée : 10\u00a0€')
    expect(reportFeeLabel({ landingFee: { amount: 0 } })).toBe('Atterrissage gratuit')
    expect(reportFeeLabel({ landingFee: { amount: 40 }, aircraftClass: 'heavy' })).toBe('Taxe payée : 40\u00a0€ (avion > 1,2 t)')
    expect(reportFeeLabel({})).toBeUndefined()
  })

  it('stores visit days as midnight UTC and shows the same day', () => {
    const day = visitDayToUtc(new Date(2026, 7, 12, 23, 30))
    expect(day.toISOString()).toBe('2026-08-12T00:00:00.000Z')
    expect(formatVisitDate({ seconds: day.getTime() / 1000, nanoseconds: 0 })).toBe('12/08/2026')
  })

  it('counts pilot reports posted on the site only in the stats', () => {
    const reports = [
      report('official-LFXX', official, '2026-10-01', { amount: 10 }),
      { ...report('a', pilot, '2026-01-01'), uid: 'u1' },
      { ...report('b', pilot, '2026-09-01', { amount: 12 }), uid: 'u2' },
      report('community-LFXX', pilot, '2026-10-02', { amount: 11 }),
    ]
    expect(deriveReportStats(reports)).toEqual({ count: 2, lastVisit: at('2026-09-01') })
    expect(deriveReportStats([reports[0]])).toBeUndefined()
    expect(isPilotReport(reports[3])).toBe(false)
    expect(deriveAirfieldFacts(reports)).toEqual({
      landingFee: { amount: 10, source: 'official', checkedAt: at('2026-10-01') },
      reportStats: { count: 2, lastVisit: at('2026-09-01') },
      conflicts: [],
    })
  })

  it('compares stats by value', () => {
    const stats = { count: 2, lastVisit: at('2026-09-01') }
    expect(sameReportStats(stats, { ...stats, lastVisit: Timestamp.fromDate(new Date('2026-09-01')) })).toBe(true)
    expect(sameReportStats(stats, { ...stats, count: 3 })).toBe(false)
    expect(sameReportStats(undefined, undefined)).toBe(true)
    expect(sameReportStats(stats, undefined)).toBe(false)
  })
})

describe('groupVisits', () => {
  const visit = (id: string, icao: string, observedAt: string) => ({ ...report(id, pilot, observedAt), target: { id: icao } })

  it('lists the latest visit first, then the airfields with no report by ICAO code', () => {
    const rows = groupVisits(['LFPZ', 'LFAT', 'LFOU', 'LFQA'], [
      visit('a', 'LFOU', '2026-05-01'), visit('b', 'LFQA', '2026-08-01'), visit('c', 'LFOU', '2026-09-01'),
    ])
    expect(rows.map(r => [r.id, r.reports.map(x => x.id)])).toEqual([
      ['LFOU', ['c', 'a']], ['LFQA', ['b']], ['LFAT', []], ['LFPZ', []],
    ])
  })

  it('keeps an airfield reported on but no longer marked visited', () => {
    expect(groupVisits([], [visit('a', 'LFAT', '2026-05-01')]).map(r => r.id)).toEqual(['LFAT'])
  })
})
