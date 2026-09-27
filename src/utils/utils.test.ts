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
