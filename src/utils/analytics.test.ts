import { afterEach, describe, expect, it, vi } from 'vitest'
import { authState, identifyAuthState, resetAnalytics } from './analytics'

describe('authState', () => {
  it('maps the Firebase user', () => {
    expect(authState(null)).toBe('signed-out')
    expect(authState({ isAnonymous: true })).toBe('guest')
    expect(authState({ isAnonymous: false })).toBe('member')
  })
})

describe('identifyAuthState', () => {
  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    resetAnalytics()
  })

  it('sends only the auth state, once per change', () => {
    const identify = vi.fn()
    ;(window as { umami?: unknown }).umami = { identify }
    identifyAuthState('signed-out')
    identifyAuthState('signed-out')
    identifyAuthState('member')
    expect(identify.mock.calls).toEqual([[{ auth: 'signed-out' }], [{ auth: 'member' }]])
  })

  it('does nothing without the tracker', () => {
    expect(() => identifyAuthState('member')).not.toThrow()
  })
})
