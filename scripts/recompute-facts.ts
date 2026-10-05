/**
 * Re-derives every airfield's function-owned facts from the `reports` collection.
 *
 * The `reports` Cloud Function (`applyReports`) only runs when a report is
 * written, so a change to the derivation (src/utils/reports.ts) or a missed
 * trigger leaves airfields behind. This runs the same `deriveLandingFee` over
 * every airfield, prints the source conflicts and the changes, and writes only
 * the airfields whose fee changed (bumping `updated_at`, like the function).
 *
 * Usage:
 *   npm run recompute                 # staging
 *   npm run recompute -- --dry-run    # print only
 *   npm run recompute:prod
 * Against the emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run recompute
 */
import { firebaseConfig } from '../src/data/firebase.ts'
import admin from 'firebase-admin'
import chalk from 'chalk'
import { createRequire } from 'node:module'
import { DerivedLandingFee, deriveLandingFee, FeeReport, formatLandingFee, sameLandingFee } from '../src/utils/reports.ts'

const require = createRequire(import.meta.url)

const dryRun = process.argv.includes('--dry-run')
const env = process.env.NODE_ENV === 'production' ? 'production' : 'staging'
const emulator = process.env.FIRESTORE_EMULATOR_HOST
const projectId = emulator ? process.env.GCLOUD_PROJECT ?? 'demo-aerotrips' : firebaseConfig[env].projectId

// The checked-in service-account key belongs to production only, so staging
// runs fall back to application-default credentials (`gcloud auth
// application-default login`). The emulator needs none.
const credential = (() => {
  if (emulator) return undefined
  try {
    const creds = require('../serviceAccountKey.json')
    if (creds.project_id === projectId) return admin.credential.cert(creds)
  } catch { /* no key on disk */ }
  return admin.credential.applicationDefault()
})()

admin.initializeApp({ projectId, ...(credential && { credential }) })
const db = admin.firestore()

type Timestamp = admin.firestore.Timestamp

const describe = (fee?: DerivedLandingFee) => fee
  ? `${formatLandingFee(fee)} (${fee.amount} €${fee.parking24h !== undefined ? `, 24 h ${fee.parking24h} €` : ''}, ${fee.source}, ${new Date(fee.checkedAt.seconds * 1000).toISOString().slice(0, 10)})`
  : 'unknown'

const main = async () => {
  console.log(chalk.bold(`Recomputing landing fees on ${projectId}${dryRun ? ' (dry run)' : ''}`))
  const [airfields, reports] = await Promise.all([
    db.collection('airfields').select('landingFee').get(),
    db.collection('reports').get(),
  ])

  const byAirfield = new Map<string, FeeReport<Timestamp>[]>()
  for (const doc of reports.docs) {
    const target = doc.get('target')
    if (target?.type !== 'airfields' || typeof target.id !== 'string') continue
    const list = byAirfield.get(target.id) ?? []
    list.push({ ...doc.data(), id: doc.id } as FeeReport<Timestamp>)
    byAirfield.set(target.id, list)
  }

  const known = new Set(airfields.docs.map((doc) => doc.id))
  for (const [icao, list] of byAirfield) {
    if (!known.has(icao)) console.log(chalk.yellow(`${icao}: ${list.length} report(s) on an unknown airfield`))
  }

  const changes: { ref: admin.firestore.DocumentReference, landingFee?: DerivedLandingFee<Timestamp> }[] = []
  let conflictCount = 0
  for (const doc of airfields.docs) {
    const { landingFee, conflicts } = deriveLandingFee(byAirfield.get(doc.id) ?? [])
    for (const { reports: pair } of conflicts) {
      conflictCount++
      console.log(chalk.yellow(`${doc.id}: conflict ${pair.map((r) => `${r.source} ${r.amount} € (${r.id})`).join(' vs ')}`))
    }
    const current = doc.get('landingFee') as DerivedLandingFee | undefined
    if (sameLandingFee(current, landingFee)) continue
    console.log(`${chalk.cyan(doc.id)}: ${describe(current)} → ${chalk.green(describe(landingFee))}`)
    changes.push({ ref: doc.ref, landingFee })
  }

  console.log(chalk.bold(`${airfields.size} airfields, ${reports.size} reports, ${conflictCount} conflict(s), ${changes.length} change(s)`))
  if (dryRun || changes.length === 0) return

  const writer = db.bulkWriter()
  const now = admin.firestore.Timestamp.now()
  for (const { ref, landingFee } of changes) {
    writer.update(ref, { landingFee: landingFee ?? admin.firestore.FieldValue.delete(), updated_at: now })
  }
  await writer.close()
  console.log(chalk.green(`Wrote ${changes.length} airfield(s)`))
}

main().then(() => process.exit(0), (e) => {
  console.error(e)
  process.exit(1)
})
