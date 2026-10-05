/**
 * Derives the function-owned airfield facts from the `reports` collection.
 *
 * Every landing fee is a report (imports, admin corrections, later pilot
 * reports, #39). On any write to a report, this reads all the reports on the
 * same airfield, derives the fee with `deriveLandingFee` and writes it to
 * `airfields/{ICAO}.landingFee` (or deletes it), bumping `updated_at` only
 * when the result changed, so the SPA's delta merge picks it up. Creates,
 * edits and deletes are handled alike: deleting a report falls back to the
 * next best one. Clients never write `landingFee` (AirfieldForm leaves it out).
 * `npm run recompute` runs the same derivation over every airfield.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { info, warn } from 'firebase-functions/logger'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { DerivedLandingFee, deriveLandingFee, FeeReport, sameLandingFee } from '../../../src/utils/reports.ts'

initializeApp()

const REPORTS = 'reports'
const AIRFIELDS = 'airfields'

/** The airfield a report is about, if any (activities carry no derived facts yet). */
const airfieldOf = (data: FirebaseFirestore.DocumentData | undefined) =>
  data?.target?.type === AIRFIELDS && typeof data.target.id === 'string' ? data.target.id as string : undefined

const recompute = (icao: string) => getFirestore().runTransaction(async (tx) => {
  const db = getFirestore()
  const airfieldRef = db.collection(AIRFIELDS).doc(icao)
  // Single-field filter, type checked here: no composite index needed.
  const [airfield, reports] = await Promise.all([
    tx.get(airfieldRef),
    tx.get(db.collection(REPORTS).where('target.id', '==', icao)),
  ])
  if (!airfield.exists) {
    warn('reports target an unknown airfield', { icao })
    return
  }

  const { landingFee, conflicts } = deriveLandingFee(reports.docs
    .filter((doc) => airfieldOf(doc.data()) === icao)
    .map((doc) => ({ ...doc.data(), id: doc.id }) as FeeReport<Timestamp>))
  if (conflicts.length) warn('landing fee sources disagree', { icao, conflicts })

  const current = airfield.get('landingFee') as DerivedLandingFee | undefined
  if (sameLandingFee(current, landingFee)) return

  tx.update(airfieldRef, {
    landingFee: landingFee ?? FieldValue.delete(),
    updated_at: Timestamp.now(),
  })
  info('landing fee updated', { icao, landingFee: landingFee ?? null })
})

export const applyReports = onDocumentWritten(
  {
    document: `${REPORTS}/{reportId}`,
    region: 'europe-west1',
    // Idempotent: a retried run derives the same fee and writes nothing new.
    retry: true,
    maxInstances: 5,
  },
  async (event) => {
    // A report moved to another airfield changes both.
    const targets = new Set([airfieldOf(event.data?.before?.data()), airfieldOf(event.data?.after?.data())])
    for (const icao of targets) {
      if (icao) await recompute(icao)
    }
  },
)
