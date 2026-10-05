// Reports: dated observations about an airfield (landing fee today; pilot text and fuel later, #39).
//
// Every landing fee is a report (imports, admin corrections, pilot reports). The `reports` Cloud
// Function (`applyReports`) and `npm run recompute` derive the single `Airfield.landingFee` from an
// airfield's reports with `deriveLandingFee`, the only place holding that logic. Shared by the SPA,
// the function, scripts, prerender and MCP, so it must stay React-free and SDK-free: timestamps are
// typed structurally, which fits client and admin Timestamps and their JSON snapshot alike.

/** Firestore Timestamp (client or admin SDK), or its `{seconds, nanoseconds}` JSON form. */
export interface TimestampLike {
  seconds: number
  nanoseconds: number
}

export type FeeReportSource = { type: 'pilot' } | { type: 'import', id: string } | { type: 'admin' }

/** Prices are TTC. */
export interface ReportLandingFee {
  amount: number
  parking24h?: number
  note?: string
  url?: string
}

/** The part of a `Report` the derivation reads. */
export interface FeeReport<T extends TimestampLike = TimestampLike> {
  id: string
  source: FeeReportSource
  observedAt: T
  updated_at?: T
  landingFee?: ReportLandingFee
}

/** Mirrors `Airfield.landingFee` (src/index.d.ts). */
export interface DerivedLandingFee<T extends TimestampLike = TimestampLike> {
  amount: number
  parking24h?: number
  note?: string
  url?: string
  source: string
  checkedAt: T
}

export interface LandingFeeConflict {
  /** Newest report of each disagreeing source, with its amount. */
  reports: { id: string, source: string, amount: number }[]
}

/** Two sources conflict when their amounts differ by more than both thresholds. */
export const CONFLICT_RATIO = 0.2
export const CONFLICT_MIN_EUROS = 2

/** 'aerops', 'edeis'… for imports, else the source type ('admin', 'pilot'). */
export const sourceKey = (source: FeeReportSource) => source.type === 'import' ? source.id : source.type

const isAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const hasFee = <T extends TimestampLike>(r: FeeReport<T>): r is FeeReport<T> & { landingFee: ReportLandingFee } =>
  isAmount(r.landingFee?.amount) && typeof r.observedAt?.seconds === 'number'

const compareTime = (a?: TimestampLike, b?: TimestampLike) =>
  (a?.seconds ?? 0) - (b?.seconds ?? 0) || (a?.nanoseconds ?? 0) - (b?.nanoseconds ?? 0)

/** Newest first: by observedAt, then the latest written, then id so ties stay deterministic. */
const newestFirst = (a: FeeReport, b: FeeReport) =>
  compareTime(b.observedAt, a.observedAt) || compareTime(b.updated_at, a.updated_at) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)

const disagree = (a: number, b: number) => {
  const diff = Math.abs(a - b)
  return diff > CONFLICT_MIN_EUROS && diff > CONFLICT_RATIO * Math.max(a, b)
}

/**
 * The landing fee to show on an airfield, from all its reports:
 * an admin report wins (the newest one if several), otherwise the newest report.
 * Parking comes from the same report. Reports without a fee are ignored.
 * `conflicts` lists sources that disagree, still resolved by the rule above.
 */
export const deriveLandingFee = <T extends TimestampLike>(reports: FeeReport<T>[]): {
  landingFee?: DerivedLandingFee<T>
  conflicts: LandingFeeConflict[]
} => {
  const candidates = reports.filter(hasFee).sort(newestFirst)
  const chosen = candidates.find((r) => r.source?.type === 'admin') ?? candidates[0]

  const latestBySource = new Map<string, { id: string, source: string, amount: number }>()
  for (const r of candidates) {
    const source = sourceKey(r.source)
    if (!latestBySource.has(source)) latestBySource.set(source, { id: r.id, source, amount: r.landingFee.amount })
  }
  const latest = [...latestBySource.values()]
  const conflicts = latest.flatMap((a, i) => latest.slice(i + 1)
    .filter((b) => disagree(a.amount, b.amount))
    .map((b) => ({ reports: [a, b] })))

  if (!chosen) return { conflicts }

  const fee = chosen.landingFee
  const landingFee: DerivedLandingFee<T> = {
    amount: fee.amount,
    source: sourceKey(chosen.source),
    checkedAt: chosen.observedAt,
  }
  // Firestore rejects undefined values: only set what the report has.
  if (isAmount(fee.parking24h)) landingFee.parking24h = fee.parking24h
  if (fee.note) landingFee.note = fee.note
  if (fee.url) landingFee.url = fee.url
  return { landingFee, conflicts }
}

/** Whether a stored airfield fee already matches the derived one (the function skips the write then). */
export const sameLandingFee = (a?: DerivedLandingFee, b?: DerivedLandingFee) => {
  if (!a || !b) return !a && !b
  return a.amount === b.amount
    && a.parking24h === b.parking24h
    && a.note === b.note
    && a.url === b.url
    && a.source === b.source
    && compareTime(a.checkedAt, b.checkedAt) === 0
}

/** "Gratuit", "≈ 10 €": the values are indicative, so rounded to the euro. Parking amounts too. */
export const formatFeeAmount = (amount: number) =>
  amount === 0 ? 'Gratuit' : amount < 1 ? '< 1 €' : `≈ ${Math.round(amount)} €`

export const formatLandingFee = (fee: Pick<DerivedLandingFee, 'amount'>) => formatFeeAmount(fee.amount)
