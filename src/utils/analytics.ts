// Umami session properties. Only coarse, non-identifying values: a uid, email or name here
// would turn audience measurement into user tracking and lose the CNIL consent exemption.

export type AuthState = 'signed-out' | 'guest' | 'member'

type Umami = { identify: (data: Record<string, string>) => void }

export const authState = (user: { isAnonymous: boolean } | null): AuthState =>
  !user ? 'signed-out' : user.isAnonymous ? 'guest' : 'member'

let sent: AuthState | undefined

/** Attaches the auth state to the Umami session, once per change. No-op when the tracker is blocked or opted out. */
export function identifyAuthState(state: AuthState) {
  if (typeof window === 'undefined' || state === sent) return
  const umami = (window as { umami?: Umami }).umami
  if (umami) {
    sent = state
    umami.identify({ auth: state })
  } else if (document.readyState !== 'complete') {
    // The deferred tracker may still be loading: try once more when the page has loaded.
    window.addEventListener('load', () => identifyAuthState(state), { once: true })
  }
}

/** For tests. */
export const resetAnalytics = () => { sent = undefined }
