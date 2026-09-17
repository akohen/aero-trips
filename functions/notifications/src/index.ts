/**
 * Email notification for every new document in `changes`.
 *
 * Anonymous contributions (and contact-form messages) land in `changes` and
 * wait for a manual review via `npm run manage`. Nothing announces them, so
 * this function mails the raw document to the maintainer as soon as it is
 * created. Updates and deletes (e.g. `manage` applying or dropping a change)
 * deliberately do not trigger it.
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { defineSecret } from 'firebase-functions/params'
import { info } from 'firebase-functions/logger'
import { DocumentReference, GeoPoint, Timestamp } from 'firebase-admin/firestore'

const MAILGUN_API_KEY = defineSecret('MAILGUN_API_KEY')
// The sending domain is hosted in Mailgun's EU region.
const MAILGUN_API_URL = 'https://api.eu.mailgun.net'
const MAILGUN_DOMAIN = 'mg.aerotrips.fr'
const SENDER = `AeroTrips <notifications@${MAILGUN_DOMAIN}>`

const RECIPIENT = 'alexandre@kohen.fr'

/** Firestore-specific values don't JSON-serialize usefully on their own. */
function replacer(_key: string, value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof GeoPoint) return { latitude: value.latitude, longitude: value.longitude }
  if (value instanceof DocumentReference) return value.path
  return value
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const notifyNewChange = onDocumentCreated(
  {
    document: 'changes/{changeId}',
    region: 'europe-west1',
    secrets: [MAILGUN_API_KEY],
    // A lost notification is harmless (the change is still reviewed via
    // `manage`); retrying could send the same email repeatedly.
    retry: false,
    maxInstances: 1,
  },
  async (event) => {
    const snapshot = event.data
    if (!snapshot) return

    const data = snapshot.data()
    const json = JSON.stringify(data, replacer, 2)
    const target = typeof data.targetDocument === 'string' ? data.targetDocument : snapshot.id

    const form = new FormData()
    form.append('from', SENDER)
    form.append('to', RECIPIENT)
    form.append('subject', `[AeroTrips] Nouveau changement : ${target}`)
    form.append('text', `Document changes/${snapshot.id}\n\n${json}`)
    form.append('html', `<p>Document <code>changes/${escapeHtml(snapshot.id)}</code></p><pre>${escapeHtml(json)}</pre>`)

    const response = await fetch(`${MAILGUN_API_URL}/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY.value()}`).toString('base64')}` },
      body: form,
    })
    if (!response.ok) {
      throw new Error(`Mailgun responded ${response.status}: ${await response.text()}`)
    }
    info('change notification sent', { changeId: snapshot.id, target })
  },
)
