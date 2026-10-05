import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { Report } from '..'
import { deriveLandingFee, FeeReport, formatFeeAmount, formatLandingFee, sameLandingFee, sourceKey, TimestampLike } from './reports'

const at = (date: string): TimestampLike => ({ seconds: Date.parse(date) / 1000, nanoseconds: 0 })

const report = (id: string, source: FeeReport['source'], observedAt: string, landingFee?: FeeReport['landingFee']): FeeReport =>
  ({ id, source, observedAt: at(observedAt), updated_at: at(observedAt), landingFee })

const aerops = { type: 'import', id: 'aerops' } as const
const edeis = { type: 'import', id: 'edeis' } as const
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
    const r = report('aerops-LFXX', aerops, '2026-09-01', { amount: 12.5, parking24h: 8, note: 'FFA −50 %', url: 'https://x.test' })
    expect(deriveLandingFee([r]).landingFee).toEqual({
      amount: 12.5, parking24h: 8, note: 'FFA −50 %', url: 'https://x.test', source: 'aerops', checkedAt: r.observedAt,
    })
  })

  it('keeps free as an explicit 0 and omits absent fields', () => {
    const fee = deriveLandingFee([report('a', pilot, '2025-06-01', { amount: 0 })]).landingFee
    expect(fee).toEqual({ amount: 0, source: 'pilot', checkedAt: at('2025-06-01') })
    expect(Object.keys(fee!)).not.toContain('parking24h')
  })

  it('picks the newest report by observedAt, whatever the input order', () => {
    const reports = [
      report('old', aerops, '2024-01-01', { amount: 10 }),
      report('new', edeis, '2026-03-01', { amount: 11 }),
      report('mid', pilot, '2025-05-01', { amount: 12 }),
    ]
    expect(deriveLandingFee(reports).landingFee).toMatchObject({ amount: 11, source: 'edeis' })
    expect(deriveLandingFee([...reports].reverse()).landingFee).toMatchObject({ amount: 11, source: 'edeis' })
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

  it('uses old reports when there is nothing newer', () => {
    const reports = [report('a', aerops, '2011-06-01', { amount: 0 }), report('b', edeis, '2018-02-01', { amount: 4 })]
    expect(deriveLandingFee(reports).landingFee).toEqual({ amount: 4, source: 'edeis', checkedAt: at('2018-02-01') })
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
    const b = { ...report('b', edeis, '2026-01-01', { amount: 11 }), updated_at: at('2026-03-01') }
    expect(deriveLandingFee([a, b]).landingFee?.source).toBe('edeis')
    expect(deriveLandingFee([b, a]).landingFee?.source).toBe('edeis')

    const c = report('c', aerops, '2026-01-01', { amount: 10 })
    const d = report('d', edeis, '2026-01-01', { amount: 11 })
    expect(deriveLandingFee([c, d]).landingFee?.source).toBe(deriveLandingFee([d, c]).landingFee?.source)
  })

  describe('conflicts', () => {
    it('reports sources disagreeing by more than 20 % and 2 €', () => {
      const reports = [report('aerops-X', aerops, '2026-01-01', { amount: 43.81 }), report('edeis-X', edeis, '2026-09-01', { amount: 5.99 })]
      const { landingFee, conflicts } = deriveLandingFee(reports)
      expect(landingFee?.source).toBe('edeis')
      expect(conflicts).toEqual([{ reports: [
        { id: 'edeis-X', source: 'edeis', amount: 5.99 },
        { id: 'aerops-X', source: 'aerops', amount: 43.81 },
      ] }])
    })

    it('ignores small gaps: under 2 €, or under 20 %', () => {
      const under2 = [report('a', aerops, '2026-01-01', { amount: 5 }), report('b', edeis, '2026-02-01', { amount: 6.5 })]
      const under20 = [report('a', aerops, '2026-01-01', { amount: 50 }), report('b', edeis, '2026-02-01', { amount: 45 })]
      expect(deriveLandingFee(under2).conflicts).toEqual([])
      expect(deriveLandingFee(under20).conflicts).toEqual([])
    })

    it('only compares the newest report of each source', () => {
      const reports = [
        report('p1', pilot, '2025-01-01', { amount: 40 }),
        report('p2', pilot, '2026-01-01', { amount: 10 }),
        report('e', edeis, '2026-02-01', { amount: 10 }),
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

