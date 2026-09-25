/**
 * Mirrors opted-in profiles to the public `passports` collection.
 *
 * `profiles/{uid}` holds the email and is readable by its owner only. When a
 * pilot turns on `passportPublic`, this keeps `passports/{uid}` in sync with
 * the safe subset computed by `toPublicPassport` (name, home base, visited
 * airfields); when they turn it off or delete their profile, the passport is
 * deleted. Clients never write `passports` (see firestore.rules), so the two
 * can't drift apart.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { info } from 'firebase-functions/logger'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { PASSPORTS, samePassport, toPublicPassport } from '../../../src/utils/passport.ts'

initializeApp()

export const syncPassport = onDocumentWritten(
  {
    document: 'profiles/{uid}',
    region: 'europe-west1',
    // Idempotent: a retried run converges to the same passport.
    retry: true,
    maxInstances: 5,
  },
  async (event) => {
    const { uid } = event.params
    const next = toPublicPassport(event.data?.after?.data())
    const ref = getFirestore().collection(PASSPORTS).doc(uid)

    if (!next) {
      // Nothing to remove unless the profile was public before this write.
      if (!toPublicPassport(event.data?.before?.data())) return
      await ref.delete()
      info('passport unpublished', { uid })
      return
    }

    // Most profile writes (favorites, visited activities) don't touch the passport.
    const current = await ref.get()
    if (current.exists && samePassport(current.data(), next)) return

    await ref.set({ ...next, updated_at: FieldValue.serverTimestamp() })
    info('passport published', { uid, visited: next.visited.length })
  },
)
