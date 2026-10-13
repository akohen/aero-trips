/**
 * Email notifications to the maintainer.
 *
 * `notifyNewChange`: every new document in `changes`.
 * Anonymous contributions (and contact-form messages) land in `changes` and
 * wait for a review on `/admin/changes` (or `npm run manage`). Nothing announces
 * them, so this function mails a summary (what it targets, which fields it
 * changes, or the contact message) with a link to its review page, then the
 * document (inline images elided). Updates and deletes (applying or dropping a
 * change) deliberately do not trigger it.
 *
 * `notifyNewReport`: every new pilot visit report (#39). Reports are published
 * at once; moderation is deleting the report, after which `applyReports`
 * recomputes the airfield. Imports and admin reports send nothing (a bulk
 * import would mail hundreds). Flags a fee that disagrees with the airfield's.
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { defineSecret, projectID } from 'firebase-functions/params'
import { info } from 'firebase-functions/logger'
import { initializeApp } from 'firebase-admin/app'
import { DocumentReference, GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { parseChange } from '../../../src/utils/changes.ts'
import { changeSummary } from './changeMail.ts'
import { DerivedLandingFee, disagree, formatVisitDate, isPilotReport, reportFeeLabel, landingFeeSource } from '../../../src/utils/reports.ts'

initializeApp()

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
  // Guests' pasted images are inlined: hundreds of KB of base64 nobody reads in a mail
  if (typeof value === 'string' && value.startsWith('data:')) return `[image en ligne, ${Math.round(value.length * 3 / 4 / 1024)} Ko]`
  return value
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const PRODUCTION = 'aero-trips'

const siteUrl = () => projectID.value() === PRODUCTION ? 'https://aerotrips.fr' : `https://${projectID.value()}.web.app`

// Anything but production (staging, emulator) is flagged, so a test mail never passes for a real one
const subjectTag = () => projectID.value() === PRODUCTION ? '[AeroTrips]' : `[${projectID.value()}]`

const send = async (subject: string, text: string, html: string) => {
  const form = new FormData()
  form.append('from', SENDER)
  form.append('to', RECIPIENT)
  form.append('subject', `${subjectTag()} ${subject}`)
  form.append('text', text)
  form.append('html', html)

  const response = await fetch(`${MAILGUN_API_URL}/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY.value()}`).toString('base64')}` },
    body: form,
  })
  if (!response.ok) {
    throw new Error(`Mailgun responded ${response.status}: ${await response.text()}`)
  }
}

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
    const parsed = parseChange(data)
    const current = parsed.kind === 'edit' ? (await getFirestore().doc(parsed.targetDocument).get()).data() : undefined
    const { subject, summary, review } = changeSummary(snapshot.id, parsed, current, siteUrl())
    const json = JSON.stringify(data, replacer, 2)
    const text = `${summary.join('\n')}\n\nRelire : ${review}\n\nDocument changes/${snapshot.id}\n${json}`

    await send(
      subject,
      text,
      `<pre style="white-space: pre-wrap">${escapeHtml(summary.join('\n'))}</pre>`
        + `<p><a href="${escapeHtml(review)}">Relire et appliquer</a></p>`
        + `<p>Document <code>changes/${escapeHtml(snapshot.id)}</code></p><pre>${escapeHtml(json)}</pre>`,
    )
    info('change notification sent', { changeId: snapshot.id, kind: parsed.kind })
  },
)

export const notifyNewReport = onDocumentCreated(
  {
    document: 'reports/{reportId}',
    region: 'europe-west1',
    secrets: [MAILGUN_API_KEY],
    // Same as above: a lost email is harmless, a duplicate is noise.
    retry: false,
    maxInstances: 1,
  },
  async (event) => {
    const snapshot = event.data
    if (!snapshot) return
    const data = snapshot.data()
    if (!isPilotReport(data as { source: { type: 'pilot' }, uid?: string })) return

    const icao = typeof data.target?.id === 'string' ? data.target.id : '?'
    const lines = [
      `${data.author ?? '?'} (${data.uid}) — visite du ${data.observedAt instanceof Timestamp ? formatVisitDate(data.observedAt) : '?'}`,
      ...(data.text ? ['', data.text] : []),
    ]
    const fee = reportFeeLabel(data)
    if (fee) {
      lines.push('', fee + (data.landingFee.note ? ` — ${data.landingFee.note}` : ''))
      // applyReports may run first and pick this very report: then nothing disagrees, as intended.
      const current = (await getFirestore().doc(`airfields/${icao}`).get()).get('landingFee') as DerivedLandingFee | undefined
      if (current && data.aircraftClass !== 'heavy' && disagree(current.amount, data.landingFee.amount)) {
        lines.push(`⚠️ Différent du tarif affiché : ${current.amount} € (${landingFeeSource(current)})`)
      }
    }
    const json = JSON.stringify(data, replacer, 2)
    const link = `https://aerotrips.fr/airfields/${encodeURIComponent(icao)}`
    const text = `${lines.join('\n')}\n\n${link}\n\nDocument reports/${snapshot.id}\n${json}`

    await send(
      `Compte rendu de visite : ${icao}${fee ? ` · ${fee}` : ''}`,
      text,
      `<pre style="white-space: pre-wrap">${escapeHtml(text)}</pre>`,
    )
    info('report notification sent', { reportId: snapshot.id, icao })
  },
)
