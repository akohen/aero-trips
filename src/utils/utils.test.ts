import { describe, expect, it } from 'vitest'
import type { Airfield } from '..'
import { EMPTY_AIRFIELD_FILTERS } from './filterParams'
import { filterAirfields } from './utils'

const airfield = (codeIcao: string, nightVFR?: Airfield['nightVFR']) =>
  [codeIcao, { codeIcao, name: codeIcao, status: 'CAP', nightVFR, runways: [], position: { latitude: 45, longitude: 0 } } as unknown as Airfield] as const

describe('night VFR filters', () => {
  const airfields = new Map([airfield('LFAA', 'full'), airfield('LFBB', 'limited'), airfield('LFCC')])
  const codes = (ad: string[]) => [...filterAirfields(airfields, new Map(), { ...EMPTY_AIRFIELD_FILTERS, ad }).keys()]

  it('nvfr keeps any licensed airfield', () => {
    expect(codes(['nvfr'])).toEqual(['LFAA', 'LFBB'])
  })

  it('nvfr-full keeps only airfields licensed without limitations', () => {
    expect(codes(['nvfr-full'])).toEqual(['LFAA'])
  })
})

describe('landing fee filters', () => {
  const withFee = (codeIcao: string, amount?: number) => {
    const [key, a] = airfield(codeIcao)
    const checkedAt = { seconds: 0, nanoseconds: 0 }
    return [key, amount === undefined ? a : { ...a, landingFee: { amount, source: 'aerops', checkedAt } } as unknown as Airfield] as const
  }
  const airfields = new Map([withFee('LFAA', 0), withFee('LFBB', 14.4), withFee('LFCC', 14.5), withFee('LFDD')])
  const codes = (ad: string[]) => [...filterAirfields(airfields, new Map(), { ...EMPTY_AIRFIELD_FILTERS, ad }).keys()]

  it('fee-free keeps explicit free landings, not unknown ones', () => {
    expect(codes(['fee-free'])).toEqual(['LFAA'])
  })

  it('fee-15 keeps free landings and those shown under 15 €', () => {
    expect(codes(['fee-15'])).toEqual(['LFAA', 'LFBB'])
  })

  it('the strictest one wins when both are set', () => {
    expect(codes(['fee-15', 'fee-free'])).toEqual(['LFAA'])
  })
})
