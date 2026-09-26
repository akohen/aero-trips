/**
 * Mirrors opted-in profiles to the public `passports` collection and renders
 * their public images.
 *
 * `profiles/{uid}` holds the email and is readable by its owner only. When a
 * pilot turns on `passportPublic`, this keeps `passports/{uid}` in sync with
 * the safe subset computed by `toPublicPassport` (name, home base, visited
 * airfields) and publishes the badge images to Storage under `passports/{uid}/`
 * (world-readable, cacheable). When they turn it off or delete their profile,
 * both are deleted. Clients never write `passports` (see firestore.rules), so
 * the two can't drift apart.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { info } from 'firebase-functions/logger'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import {
  PASSPORTS,
  passportImagePath,
  passportImagePrefix,
  samePassport,
  toPublicPassport,
} from '../../../src/utils/passport.ts'
import { renderPassportImages } from './images.ts'

initializeApp()

/** Bump when the images change, so each passport is re-rendered on its next profile write. */
const IMAGES_VERSION = 1
// Objects are overwritten in place: a short max-age bounds how stale a hotlinked badge gets.
const CACHE_CONTROL = 'public, max-age=3600'

export const syncPassport = onDocumentWritten(
  {
    document: 'profiles/{uid}',
    region: 'europe-west1',
    // Idempotent: a retried run converges to the same passport and images.
    retry: true,
    maxInstances: 5,
    memory: '512MiB',
  },
  async (event) => {
    const { uid } = event.params
    const next = toPublicPassport(event.data?.after?.data())
    const ref = getFirestore().collection(PASSPORTS).doc(uid)
    const bucket = getStorage().bucket()

    if (!next) {
      // Nothing to remove unless the profile was public before this write.
      if (!toPublicPassport(event.data?.before?.data())) return
      await Promise.all([ref.delete(), bucket.deleteFiles({ prefix: passportImagePrefix(uid) })])
      info('passport unpublished', { uid })
      return
    }

    // Most profile writes (favorites, visited activities) don't touch the passport.
    const current = await ref.get()
    const stored = current.data()
    if (current.exists && samePassport(stored, next) && stored?.imagesVersion === IMAGES_VERSION) return

    // Images first: once the document exists, its images do too.
    await Promise.all(renderPassportImages(next).map((image) =>
      bucket.file(passportImagePath(uid, image.name)).save(image.data, {
        resumable: false,
        public: true,
        contentType: image.contentType,
        metadata: { cacheControl: CACHE_CONTROL },
      })))

    await ref.set({ ...next, imagesVersion: IMAGES_VERSION, updated_at: FieldValue.serverTimestamp() })
    info('passport published', { uid, visited: next.visited.length })
  },
)
