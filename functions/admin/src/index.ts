/**
 * Admin actions on guest contributions (`changes`).
 *
 * `applyChange({id})`: callable, `admin` custom claim only (`npm run set-admin`). Writes a pending
 * change to its target and deletes it, the same thing `npm run manage` does from the CLI:
 * - the target is checked by `parseChange` (src/utils/changes.ts): the collections guests may
 *   edit only, never the function-owned fields, never a new airfield; contact messages are
 *   read and deleted, not applied;
 * - the description's inline (data URL) images, the only way guests can attach one, are uploaded
 *   to `img/guest/` with a download token, like a member's upload, so the `images` resizer
 *   handles them too;
 * - `updated_at` is the apply time, not the submission time: a change applied after an export
 *   would otherwise predate the snapshot and be missed by DataProvider's "updated since" query;
 * - the target write and the change's deletion are one transaction, which fails if the change
 *   is already gone (applied or deleted from another tab).
 * Rejecting a change is a plain delete from the client (firestore.rules lets admins delete them).
 */
import { randomUUID } from 'node:crypto'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { info } from 'firebase-functions/logger'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getDownloadURL, getStorage } from 'firebase-admin/storage'
import { DataImage, mayCreate, parseChange, uploadDataImages } from '../../../src/utils/changes.ts'

initializeApp()

const CHANGES = 'changes'
const GUEST_IMAGES = 'img/guest/'

const uploadImage = async ({ contentType, extension, bytes }: DataImage) => {
  const file = getStorage().bucket().file(`${GUEST_IMAGES}${randomUUID()}.${extension}`)
  await file.save(Buffer.from(bytes), {
    contentType,
    resumable: false,
    metadata: { metadata: { firebaseStorageDownloadTokens: randomUUID() } },
  })
  return getDownloadURL(file)
}

export const applyChange = onCall(
  { region: 'europe-west1', maxInstances: 2 },
  async (request) => {
    if (request.auth?.token.admin !== true) throw new HttpsError('permission-denied', 'Réservé aux administrateurs')
    const id = (request.data as { id?: unknown } | undefined)?.id
    if (typeof id !== 'string' || !id || id.includes('/')) throw new HttpsError('invalid-argument', 'Identifiant invalide')

    const db = getFirestore()
    const changeRef = db.collection(CHANGES).doc(id)
    const change = await changeRef.get()
    if (!change.exists) throw new HttpsError('not-found', 'Ce changement a déjà été traité')

    const parsed = parseChange(change.data()!)
    if (parsed.kind === 'invalid') throw new HttpsError('failed-precondition', `Changement invalide : ${parsed.reason}`)
    if (parsed.kind === 'contact') throw new HttpsError('failed-precondition', 'Un message de contact ne s\'applique pas')

    const targetRef = db.collection(parsed.collection).doc(parsed.docId)
    if (!mayCreate(parsed.collection) && !(await targetRef.get()).exists) {
      throw new HttpsError('failed-precondition', `${parsed.targetDocument} n'existe pas`)
    }

    // Before the transaction, which may be retried: an upload is not undone if it then fails
    const fields = 'description' in parsed.fields
      ? { ...parsed.fields, description: await uploadDataImages(parsed.fields.description, uploadImage) }
      : parsed.fields

    await db.runTransaction(async (tx) => {
      if (!(await tx.get(changeRef)).exists) throw new HttpsError('not-found', 'Ce changement a déjà été traité')
      tx.set(targetRef, { ...fields, updated_at: Timestamp.now() }, { merge: true })
      tx.delete(changeRef)
    })
    info('change applied', { id, target: parsed.targetDocument, by: request.auth.uid, fields: Object.keys(fields) })
    return { targetDocument: parsed.targetDocument }
  },
)
