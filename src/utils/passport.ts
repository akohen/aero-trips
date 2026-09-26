// Public projection of a user profile: the "pilot passport".
//
// `profiles/{uid}` is private (it holds the email) and only readable by its owner.
// When a pilot opts in (`passportPublic: true`), the `passports` Cloud Function
// mirrors the safe subset below to `passports/{uid}`, which anyone can read and
// only the server can write. Shared by that function and the SPA, so it must stay
// dependency-free.

export const PASSPORTS = 'passports'

export interface PublicPassport {
  displayName: string
  homebase: string | null
  /** Distinct visited airfield codes, sorted. Activities and favorites stay private. */
  visited: string[]
}

const MAX_NAME = 60
const MAX_VISITED = 2000
// ICAO codes today (all 4 letters), with room for ULM-style codes later
const CODE = /^[A-Z0-9]{3,8}$/

const asCode = (value: unknown) => {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  return CODE.test(code) ? code : null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** The public passport for raw profile data, or null when the pilot hasn't opted in. */
export const toPublicPassport = (profile: unknown): PublicPassport | null => {
  if (!isRecord(profile) || profile.passportPublic !== true) return null

  const displayName = typeof profile.displayName === 'string'
    ? profile.displayName.trim().slice(0, MAX_NAME)
    : ''

  const visited = new Set<string>()
  if (Array.isArray(profile.visited)) {
    for (const v of profile.visited) {
      if (!isRecord(v) || v.type !== 'airfields') continue
      const code = asCode(v.id)
      if (code) visited.add(code)
    }
  }

  return {
    displayName,
    homebase: asCode(profile.homebase),
    visited: [...visited].sort().slice(0, MAX_VISITED),
  }
}

/** Whether a stored passport already matches the projection (ignores `updated_at`). */
export const samePassport = (stored: unknown, next: PublicPassport) =>
  isRecord(stored)
  && stored.displayName === next.displayName
  && stored.homebase === next.homebase
  && Array.isArray(stored.visited)
  && stored.visited.length === next.visited.length
  && stored.visited.every((code, i) => code === next.visited[i])

/** Images the `passports` function publishes to Storage for each public passport. */
export const PASSPORT_IMAGES = { svg: 'badge.svg', png: 'badge.png', png2x: 'badge@2x.png' } as const

export const passportImagePrefix = (uid: string) => `${PASSPORTS}/${uid}/`
export const passportImagePath = (uid: string, file: string) => `${passportImagePrefix(uid)}${file}`

/** Public, cacheable URL of a passport image (the objects are world-readable through their ACL). */
export const passportImageUrl = (bucket: string, uid: string, file: string) =>
  `https://storage.googleapis.com/${bucket}/${passportImagePath(uid, file)}`
