/**
 * Imports landing fees as reports (#18). Writes reports only, never airfields: `applyReports` derives
 * `Airfield.landingFee` on each write (or `npm run recompute`, if the function isn't deployed there).
 *
 * One report per airfield and source, id `{source}-{ICAO}`, so a re-import updates instead of piling up.
 * Unchanged reports are not rewritten; the source's reports on airfields it no longer lists are deleted.
 * Never touches other sources' reports.
 *
 * Sources:
 *   official  scripts/fees.json         operator fee sheets, checked by hand; observedAt = validFrom
 *   aerops    scripts/aerops-fees.json  from `fetch-aerops-fees.ts`; source `aerops-live` when the airfield bills
 *                                       through aeroPS, `aerops` for estimates (lowest trust tiers); observedAt = fetch
 *
 * Usage (dry run unless --apply):
 *   npm run import:fees -- official [--apply]       # staging
 *   npm run import:fees:prod -- aerops [--apply]
 */
import admin from 'firebase-admin'
import chalk from 'chalk'
import { readFileSync } from 'node:fs'
import { FeeReportSource, formatLandingFee, ReportLandingFee } from '../src/utils/reports.ts'
import { db, projectId } from './firestore-admin.ts'

type Entry = { icao: string, source: FeeReportSource, observedAt: Date, landingFee: ReportLandingFee }

type OfficialFile = {
  source: string,
  airfields: Record<string, ReportLandingFee & { validFrom: string }>,
}

type AeropsFile = {
  fetchedAt: string,
  airfields: Record<string, {
    url: string,
    live: boolean,
    reference?: { amount: number, parking24h?: number, flatRate?: boolean },
  }>,
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8'))

/** Firestore rejects undefined values */
const compact = <T extends object>(object: T) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== '')) as T

const SOURCES: Record<string, () => Entry[]> = {
  official: () => {
    const { source, airfields } = readJson<OfficialFile>('./scripts/fees.json')
    return Object.entries(airfields).map(([icao, e]) => ({
      icao,
      source: { type: 'import', id: source },
      observedAt: new Date(e.validFrom),
      landingFee: compact({
        amount: e.amount,
        parking24h: e.parking24h,
        parkingIncludedHours: e.parkingIncludedHours,
        note: e.note,
        url: e.url,
        pageUrl: e.pageUrl,
      }),
    }))
  },
  aerops: () => {
    const { fetchedAt, airfields } = readJson<AeropsFile>('./scripts/aerops-fees.json')
    return Object.entries(airfields).flatMap(([icao, { url, live, reference }]) => reference ? [{
      icao,
      source: { type: 'import', id: live ? 'aerops-live' : 'aerops' },
      observedAt: new Date(fetchedAt),
      landingFee: compact({
        amount: reference.amount,
        parking24h: reference.parking24h,
        note: [
          reference.flatRate && 'Forfait atterrissage et stationnement.',
          live ? 'Tarif facturé via l\'appli aeroPS.' : 'Estimation aeroPS, HT ou TTC non précisé.',
        ].filter(Boolean).join(' '),
        url,
      }),
    }] : [])
  },
}

// Firestore doesn't keep map key order: compare by content
const canonical = (value: unknown): unknown => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]))
  : value

const main = async () => {
  const name = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  if (!name || !SOURCES[name]) {
    console.log(chalk.red(`Usage: import-fees.ts <${Object.keys(SOURCES).join('|')}> [--apply]`))
    process.exit(1)
  }
  const apply = process.argv.includes('--apply')
  const entries = SOURCES[name]()
  console.log(chalk.bold(`Importing ${entries.length} ${name} landing fees into ${projectId}${apply ? '' : ' (dry run)'}`))

  const prefix = `${name}-`
  const [airfields, existing] = await Promise.all([
    db.collection('airfields').select().get(),
    db.collection('reports')
      .where(admin.firestore.FieldPath.documentId(), '>=', prefix)
      .where(admin.firestore.FieldPath.documentId(), '<', `${prefix}`)
      .get(),
  ])
  const known = new Set(airfields.docs.map((doc) => doc.id))
  const current = new Map(existing.docs.map((doc) => [doc.id, doc.data()]))

  const writes: { id: string, data: object }[] = []
  const kept = new Set<string>()
  for (const { icao, source, observedAt, landingFee } of entries) {
    if (!known.has(icao)) {
      console.log(chalk.yellow(`${icao}: unknown airfield, skipped`))
      continue
    }
    const id = `${prefix}${icao}`
    kept.add(id)
    const data = {
      target: { type: 'airfields', id: icao },
      source,
      observedAt: admin.firestore.Timestamp.fromDate(observedAt),
      landingFee,
    }
    const before = current.get(id)
    if (before) {
      const stored = { target: before.target, source: before.source, observedAt: before.observedAt, landingFee: before.landingFee }
      if (JSON.stringify(canonical(stored)) === JSON.stringify(canonical(data))) continue
    }
    const was = before?.landingFee ? `${before.landingFee.amount} €` : 'new'
    console.log(`${chalk.cyan(icao)} ${chalk.dim(source.type === 'import' ? source.id : source.type)}: ${was} → ${chalk.green(`${landingFee.amount} €`)} ${chalk.dim(formatLandingFee(landingFee))}`)
    writes.push({ id, data })
  }
  const deletes = [...current.keys()].filter((id) => !kept.has(id))
  deletes.forEach((id) => console.log(chalk.red(`${id}: no longer in the source, deleted`)))

  console.log(chalk.bold(`${writes.length} write(s), ${kept.size - writes.length} unchanged, ${deletes.length} delete(s)`))
  if (!apply || writes.length + deletes.length === 0) return

  const writer = db.bulkWriter()
  const now = admin.firestore.Timestamp.now()
  for (const { id, data } of writes) writer.set(db.collection('reports').doc(id), { ...data, updated_at: now })
  for (const id of deletes) writer.delete(db.collection('reports').doc(id))
  await writer.close()
  console.log(chalk.green(`Applied. applyReports derives the airfields; run \`npm run recompute\` where it isn't deployed.`))
}

main().then(() => process.exit(0), (e) => {
  console.error(e)
  process.exit(1)
})
