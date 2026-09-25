import { describe, expect, it } from 'vitest'
import { samePassport, toPublicPassport } from './passport'

const profile = {
  passportPublic: true,
  displayName: '  Camille D.  ',
  email: 'camille@example.com',
  homebase: 'LFPN',
  favorites: [{ type: 'airfields', id: 'LFAT' }],
  visited: [
    { type: 'airfields', id: 'LFPZ' },
    { type: 'airfields', id: 'LFAT' },
    { type: 'airfields', id: 'LFPZ' },
    { type: 'activities', id: 'abc123' },
  ],
}

describe('toPublicPassport', () => {
  it('returns null unless the pilot opted in', () => {
    expect(toPublicPassport({ ...profile, passportPublic: false })).toBeNull()
    expect(toPublicPassport({ ...profile, passportPublic: 'true' })).toBeNull()
    expect(toPublicPassport({ ...profile, passportPublic: undefined })).toBeNull()
    expect(toPublicPassport(undefined)).toBeNull()
  })

  it('keeps only the public subset', () => {
    const passport = toPublicPassport(profile)
    expect(passport).toEqual({ displayName: 'Camille D.', homebase: 'LFPN', visited: ['LFAT', 'LFPZ'] })
    expect(JSON.stringify(passport)).not.toContain('example.com')
    expect(JSON.stringify(passport)).not.toContain('abc123')
  })

  it('sanitizes user-controlled fields', () => {
    const passport = toPublicPassport({
      passportPublic: true,
      displayName: 'x'.repeat(200),
      homebase: '<script>',
      visited: [{ type: 'airfields', id: 'lfpn' }, { type: 'airfields', id: '../x' }, { type: 'airfields', id: 42 }, null, 'LFAT'],
    })
    expect(passport?.displayName).toHaveLength(60)
    expect(passport?.homebase).toBeNull()
    expect(passport?.visited).toEqual(['LFPN'])
  })

  it('handles missing optional fields', () => {
    expect(toPublicPassport({ passportPublic: true })).toEqual({ displayName: '', homebase: null, visited: [] })
  })
})

describe('samePassport', () => {
  const next = { displayName: 'A', homebase: 'LFPN', visited: ['LFAT', 'LFPZ'] }

  it('ignores the timestamp', () => {
    expect(samePassport({ ...next, updated_at: new Date() }, next)).toBe(true)
  })

  it('detects any change', () => {
    expect(samePassport({ ...next, displayName: 'B' }, next)).toBe(false)
    expect(samePassport({ ...next, homebase: null }, next)).toBe(false)
    expect(samePassport({ ...next, visited: ['LFAT'] }, next)).toBe(false)
    expect(samePassport(undefined, next)).toBe(false)
  })
})
