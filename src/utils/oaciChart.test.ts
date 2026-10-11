import { afterEach, describe, expect, it, vi } from 'vitest'
import { OACI_ATTRIBUTION, OACI_EDITION, OACI_TILES_URL, loadOaciPreference, saveOaciPreference } from './oaciChart'

describe('oaciChart', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('serves the current edition from the bucket', () => {
    expect(OACI_TILES_URL).toBe(`https://storage.googleapis.com/aero-trips.appspot.com/oaci/${OACI_EDITION}/{z}/{x}/{y}.webp`)
  })

  it('credits the SIA, the edition and the licence', () => {
    expect(OACI_ATTRIBUTION).toContain(`éd. ${OACI_EDITION}`)
    expect(OACI_ATTRIBUTION).toContain('Licence Ouverte')
    expect(OACI_ATTRIBUTION).toContain('SIA</a>')
  })

  it('remembers the choice, off by default', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
    })
    expect(loadOaciPreference()).toBe(false)
    saveOaciPreference(true)
    expect(loadOaciPreference()).toBe(true)
    saveOaciPreference(false)
    expect(loadOaciPreference()).toBe(false)
  })

  it('falls back to off when storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    expect(loadOaciPreference()).toBe(false)
    expect(() => saveOaciPreference(true)).not.toThrow()
  })
})
