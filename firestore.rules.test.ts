// @vitest-environment node
// firestore.rules against the Firestore emulator: `npm run test:rules` (skipped by plain `npm test`).
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'

const emulator = process.env.FIRESTORE_EMULATOR_HOST

describe.skipIf(!emulator)('firestore.rules', () => {
  let env: RulesTestEnvironment

  beforeAll(async () => {
    const [host, port] = emulator!.split(':')
    env = await initializeTestEnvironment({
      projectId: 'demo-aerotrips',
      firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
    })
  })
  afterAll(() => env?.cleanup())

  const alice = () => env.authenticatedContext('alice', { firebase: { sign_in_provider: 'google.com' } }).firestore()
  const bob = () => env.authenticatedContext('bob', { firebase: { sign_in_provider: 'google.com' } }).firestore()
  const guest = () => env.authenticatedContext('guest', { firebase: { sign_in_provider: 'anonymous' } }).firestore()
  const anonymous = () => env.unauthenticatedContext().firestore()

  const today = () => {
    const now = new Date()
    return Timestamp.fromDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())))
  }
  const pilotReport = (overrides: Record<string, unknown> = {}) => ({
    target: { type: 'airfields', id: 'LFOV' },
    source: { type: 'pilot' },
    uid: 'alice',
    author: 'Alice M.',
    observedAt: today(),
    updated_at: serverTimestamp(),
    text: 'Accueil sympa',
    ...overrides,
  })

  const withoutText = (report: Record<string, unknown>) => {
    const rest = { ...report }
    delete rest.text
    return rest
  }

  beforeEach(async () => {
    await env.clearFirestore()
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'airfields/LFOV'), { codeIcao: 'LFOV', name: 'LAVAL', landingFee: { amount: 10, source: 'official' } })
      await setDoc(doc(db, 'reports/official-LFOV'), {
        target: { type: 'airfields', id: 'LFOV' }, source: { type: 'import', id: 'official' },
        observedAt: today(), updated_at: today(), landingFee: { amount: 10 },
      })
      await setDoc(doc(db, 'reports/mine'), { ...pilotReport(), updated_at: today() })
    })
  })

  describe('pilot reports', () => {
    it('lets anyone read', () => assertSucceeds(getDoc(doc(anonymous(), 'reports/mine'))))

    it('lets a member create a text report', () => assertSucceeds(setDoc(doc(alice(), 'reports/r1'), pilotReport())))

    it('lets a member create a fee-only report', () => {
      const r = withoutText(pilotReport())
      return assertSucceeds(setDoc(doc(alice(), 'reports/r1'),
        { ...r, landingFee: { amount: 12.5, note: 'payé à la tour' }, aircraftClass: 'light' }))
    })

    it('accepts a free landing', () => {
      const r = withoutText(pilotReport())
      return assertSucceeds(setDoc(doc(alice(), 'reports/r1'), { ...r, landingFee: { amount: 0 }, aircraftClass: 'light' }))
    })

    it('rejects signed-out users and guests', async () => {
      await assertFails(setDoc(doc(anonymous(), 'reports/r1'), pilotReport()))
      await assertFails(setDoc(doc(guest(), 'reports/r1'), pilotReport({ uid: 'guest' })))
    })

    it('rejects reports in someone else\'s name, or posing as an import', async () => {
      await assertFails(setDoc(doc(bob(), 'reports/r1'), pilotReport()))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ source: { type: 'import', id: 'official' } })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ source: { type: 'admin' } })))
    })

    it('rejects bad targets', async () => {
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ target: { type: 'airfields', id: 'LFXX' } })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ target: { type: 'activities', id: 'LFOV' } })))
    })

    it('rejects empty, oversized or malformed content', async () => {
      const empty = withoutText(pilotReport())
      await assertFails(setDoc(doc(alice(), 'reports/r1'), empty))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ text: '' })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ text: 'x'.repeat(2001) })))
      await assertSucceeds(setDoc(doc(alice(), 'reports/r1'), pilotReport({ text: 'x'.repeat(2000) })))
      await assertFails(setDoc(doc(alice(), 'reports/r2'), pilotReport({ rating: 5 })))
      await assertFails(setDoc(doc(alice(), 'reports/r2'), pilotReport({ author: '' })))
      await assertFails(setDoc(doc(alice(), 'reports/r2'), pilotReport({ updated_at: today() })))
    })

    it('validates the fee and its weight class', async () => {
      const fee = (landingFee: unknown, aircraftClass: unknown = 'light') => pilotReport({ landingFee, aircraftClass })
      await assertFails(setDoc(doc(alice(), 'reports/r1'), fee({ amount: -1 })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), fee({ amount: 1001 })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), fee({ amount: '12' })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), fee({ amount: 12, url: 'https://x' })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), fee({ amount: 12, note: 'x'.repeat(301) })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ landingFee: { amount: 12 } })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), fee({ amount: 12 }, 'ultralight')))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ aircraftClass: 'light' })))
      await assertSucceeds(setDoc(doc(alice(), 'reports/r1'), fee({ amount: 12, note: 'x'.repeat(300) }, 'heavy')))
    })

    it('rejects visits in the future or before 1990', async () => {
      const inDays = (days: number) => Timestamp.fromMillis(Date.now() + days * 86400e3)
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ observedAt: inDays(2) })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ observedAt: Timestamp.fromDate(new Date('1989-12-31')) })))
      await assertFails(setDoc(doc(alice(), 'reports/r1'), pilotReport({ observedAt: '2026-01-01' })))
      await assertSucceeds(setDoc(doc(alice(), 'reports/r1'), pilotReport({ observedAt: Timestamp.fromDate(new Date('2025-06-01')) })))
    })

    it('lets the author edit content only', async () => {
      await assertSucceeds(updateDoc(doc(alice(), 'reports/mine'), { text: 'Modifié', updated_at: serverTimestamp() }))
      await assertSucceeds(updateDoc(doc(alice(), 'reports/mine'),
        { landingFee: { amount: 8 }, aircraftClass: 'light', updated_at: serverTimestamp() }))
      await assertFails(updateDoc(doc(alice(), 'reports/mine'), { text: 'Sans date' }))
      await assertFails(updateDoc(doc(alice(), 'reports/mine'), { uid: 'bob', updated_at: serverTimestamp() }))
      await assertFails(updateDoc(doc(alice(), 'reports/mine'), { source: { type: 'admin' }, updated_at: serverTimestamp() }))
      await assertFails(updateDoc(doc(alice(), 'reports/mine'), { target: { type: 'airfields', id: 'LFRS' }, updated_at: serverTimestamp() }))
      await assertFails(updateDoc(doc(bob(), 'reports/mine'), { text: 'Pirate', updated_at: serverTimestamp() }))
    })

    it('lets the author delete, nobody else', async () => {
      await assertFails(deleteDoc(doc(bob(), 'reports/mine')))
      await assertFails(deleteDoc(doc(anonymous(), 'reports/mine')))
      await assertSucceeds(deleteDoc(doc(alice(), 'reports/mine')))
    })

    it('protects imported reports', async () => {
      await assertFails(updateDoc(doc(alice(), 'reports/official-LFOV'), { landingFee: { amount: 0 }, updated_at: serverTimestamp() }))
      await assertFails(deleteDoc(doc(alice(), 'reports/official-LFOV')))
    })
  })

  describe('guests (Anonymous Auth)', () => {
    it('cannot write anything members can', async () => {
      await assertFails(setDoc(doc(guest(), 'profiles/guest'), { displayName: 'Invité' }))
      await assertFails(getDoc(doc(guest(), 'profiles/guest')))
      await assertFails(setDoc(doc(guest(), 'trips/t1'), { uid: 'guest', name: 'Sortie', steps: [] }))
      await assertFails(setDoc(doc(guest(), 'activities/a1'), { name: 'Resto' }))
      await assertFails(setDoc(doc(guest(), 'events/e1'), { title: 'Fête' }))
      await assertFails(updateDoc(doc(guest(), 'airfields/LFOV'), { website: 'https://x.test' }))
    })

    it('can still read public data and propose changes, like signed-out visitors', async () => {
      await assertSucceeds(getDoc(doc(guest(), 'airfields/LFOV')))
      await assertSucceeds(setDoc(doc(guest(), 'changes/c1'), { targetDocument: 'airfields/LFOV' }))
    })
  })

  describe('members', () => {
    it('keep their existing write access', async () => {
      await assertSucceeds(setDoc(doc(alice(), 'profiles/alice'), { displayName: 'Alice' }))
      await assertFails(getDoc(doc(alice(), 'profiles/bob')))
      await assertSucceeds(setDoc(doc(alice(), 'trips/t1'), { uid: 'alice', name: 'Sortie', steps: [] }))
      await assertFails(updateDoc(doc(bob(), 'trips/t1'), { name: 'Pirate' }))
      await assertSucceeds(setDoc(doc(alice(), 'activities/a1'), { name: 'Resto' }))
      await assertSucceeds(setDoc(doc(alice(), 'events/e1'), { title: 'Fête' }))
    })
  })

  describe('airfields', () => {
    it('lets members edit, but not the function-owned facts', async () => {
      await assertSucceeds(setDoc(doc(alice(), 'airfields/LFOV'), { website: 'https://laval.test' }, { merge: true }))
      await assertSucceeds(setDoc(doc(alice(), 'airfields/LFOV'),
        { website: 'https://laval.test', landingFee: { amount: 10, source: 'official' } }, { merge: true }))
      await assertFails(updateDoc(doc(alice(), 'airfields/LFOV'), { landingFee: { amount: 0, source: 'pilot' } }))
      await assertFails(updateDoc(doc(alice(), 'airfields/LFOV'), { reportStats: { count: 99 } }))
      await assertFails(updateDoc(doc(anonymous(), 'airfields/LFOV'), { website: 'https://x.test' }))
    })
  })
})
