/**
 * Re-derives every airfield's function-owned facts from the `reports` collection.
 *
 * The `reports` Cloud Function (`applyReports`) only runs when a report is
 * written, so a change to the derivation (src/utils/reports.ts) or a missed
 * trigger leaves airfields behind. This runs the same `deriveAirfieldFacts`
 * over every airfield (landing fee, pilot `reportStats`), prints the source
 * conflicts and the changes, and writes only the airfields whose facts changed
 * (bumping `updated_at`, like the function).
 *
 * Usage:
 *   npm run recompute                 # staging
 *   npm run recompute -- --dry-run    # print only
 *   npm run recompute:prod
 * Against the emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run recompute
 */
import admin from 'firebase-admin'
import chalk from 'chalk'
import { DerivedLandingFee, deriveAirfieldFacts, FeeReport, formatLandingFee, ReportStats, sameLandingFee, sameReportStats } from '../src/utils/reports.ts'
import { db, projectId } from './firestore-admin.ts'

const dryRun = process.argv.includes('--dry-run')

type Timestamp = admin.firestore.Timestamp

const describe = (fee?: DerivedLandingFee) => fee
  ? `${formatLandingFee(fee)} (${fee.amount} €${fee.parking24h !== undefined ? `, 24 h ${fee.parking24h} €` : ''}, ${fee.source}, ${new Date(fee.checkedAt.seconds * 1000).toISOString().slice(0, 10)})`
  : 'unknown'

const main = async () => {
  console.log(chalk.bold(`Recomputing airfield facts on ${projectId}${dryRun ? ' (dry run)' : ''}`))
  const [airfields, reports] = await Promise.all([
    db.collection('airfields').select('landingFee', 'reportStats').get(),
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

  const changes: {
    ref: admin.firestore.DocumentReference,
    landingFee?: DerivedLandingFee<Timestamp>,
    reportStats?: ReportStats<Timestamp>,
  }[] = []
  let conflictCount = 0
  for (const doc of airfields.docs) {
    const { landingFee, reportStats, conflicts } = deriveAirfieldFacts(byAirfield.get(doc.id) ?? [])
    for (const { reports: pair } of conflicts) {
      conflictCount++
      console.log(chalk.yellow(`${doc.id}: conflict ${pair.map((r) => `${r.source} ${r.amount} € (${r.id})`).join(' vs ')}`))
    }
    const current = doc.get('landingFee') as DerivedLandingFee | undefined
    const currentStats = doc.get('reportStats') as ReportStats | undefined
    const feeChanged = !sameLandingFee(current, landingFee)
    const statsChanged = !sameReportStats(currentStats, reportStats)
    if (!feeChanged && !statsChanged) continue
    if (feeChanged) console.log(`${chalk.cyan(doc.id)}: ${describe(current)} → ${chalk.green(describe(landingFee))}`)
    if (statsChanged) console.log(`${chalk.cyan(doc.id)}: ${currentStats?.count ?? 0} → ${chalk.green(reportStats?.count ?? 0)} pilot report(s)`)
    changes.push({ ref: doc.ref, landingFee, reportStats })
  }

  console.log(chalk.bold(`${airfields.size} airfields, ${reports.size} reports, ${conflictCount} conflict(s), ${changes.length} change(s)`))
  if (dryRun || changes.length === 0) return

  const writer = db.bulkWriter()
  const now = admin.firestore.Timestamp.now()
  for (const { ref, landingFee, reportStats } of changes) {
    writer.update(ref, {
      landingFee: landingFee ?? admin.firestore.FieldValue.delete(),
      reportStats: reportStats ?? admin.firestore.FieldValue.delete(),
      updated_at: now,
    })
  }
  await writer.close()
  console.log(chalk.green(`Wrote ${changes.length} airfield(s)`))
}

main().then(() => process.exit(0), (e) => {
  console.error(e)
  process.exit(1)
})
