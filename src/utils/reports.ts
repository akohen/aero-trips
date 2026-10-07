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
  /** Parking included in the amount (flat rates), in hours */
  parkingIncludedHours?: number
  note?: string
  /** The document the price comes from (fee sheet PDF, aeroPS page) */
  url?: string
  /** Stable page listing the latest fee sheet: what pilots should open first */
  pageUrl?: string
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
  parkingIncludedHours?: number
  note?: string
  url?: string
  pageUrl?: string
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

/** 'official', 'aerops'… for imports, else the source type ('admin', 'pilot'). */
export const sourceKey = (source: FeeReportSource) => source.type === 'import' ? source.id : source.type

/**
 * Trust tiers, lower wins; within a tier, the newest report. Admin corrections first; then operator fee sheets
 * ('official': an outdated one gets a newer sheet, is removed, or is overridden by an admin report); then prices billed
 * through the aeroPS app ('aerops-live', sometimes misconfigured); then pilots, whether reported here or imported
 * (discounts, based rates and mistakes happen: a disagreement with a sheet shows up as a conflict, for review); last
 * aeroPS estimates ('aerops', often the wrong tariff line). Unknown sources rank last until given a tier.
 */
export const SOURCE_TIERS: Record<string, number> = { admin: 0, official: 1, 'aerops-live': 2, pilot: 3, aerops: 4 }
const DEFAULT_TIER = 5

export const sourceTier = (source: FeeReportSource) => SOURCE_TIERS[sourceKey(source)] ?? DEFAULT_TIER

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
 * the newest report of the best trust tier (`SOURCE_TIERS`), so an admin report always wins.
 * Parking comes from the same report. Reports without a fee are ignored.
 * `conflicts` lists sources that disagree, still resolved by the rule above.
 */
export const deriveLandingFee = <T extends TimestampLike>(reports: FeeReport<T>[]): {
  landingFee?: DerivedLandingFee<T>
  conflicts: LandingFeeConflict[]
} => {
  const candidates = reports.filter(hasFee).sort(newestFirst)
  const chosen = [...candidates].sort((a, b) => sourceTier(a.source) - sourceTier(b.source))[0]

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
  if (isAmount(fee.parkingIncludedHours)) landingFee.parkingIncludedHours = fee.parkingIncludedHours
  if (fee.note) landingFee.note = fee.note
  if (fee.url) landingFee.url = fee.url
  if (fee.pageUrl) landingFee.pageUrl = fee.pageUrl
  return { landingFee, conflicts }
}

/** Whether a stored airfield fee already matches the derived one (the function skips the write then). */
export const sameLandingFee = (a?: DerivedLandingFee, b?: DerivedLandingFee) => {
  if (!a || !b) return !a && !b
  return a.amount === b.amount
    && a.parking24h === b.parking24h
    && a.parkingIncludedHours === b.parkingIncludedHours
    && a.note === b.note
    && a.url === b.url
    && a.pageUrl === b.pageUrl
    && a.source === b.source
    && compareTime(a.checkedAt, b.checkedAt) === 0
}

/** "Gratuit", "≈ 10 €": the values are indicative, so rounded to the euro. Parking amounts too. */
export const formatFeeAmount = (amount: number) =>
  amount === 0 ? 'Gratuit' : amount < 1 ? '< 1 €' : `≈ ${Math.round(amount)} €`

export const formatLandingFee = (fee: Pick<DerivedLandingFee, 'amount'>) => formatFeeAmount(fee.amount)

/**
 * Fees count as "≤ max €" by their shown (rounded) amount, so a « ≈ 10 € » airfield is under 10 €; free (max 0) means
 * exactly 0, not « < 1 € ». Unknown never matches.
 */
export const landingFeeAtMost = (fee: Pick<DerivedLandingFee, 'amount'> | undefined, max: number) =>
  fee !== undefined && (max === 0 ? fee.amount === 0 : Math.round(fee.amount) <= max)

/**
 * Price level shown as an icon in lists, same thresholds as the filters: free, under 15 € (paid fees cluster at
 * 7–14 €, median 12 €), 15 € and more.
 */
/** « < 15 € »: the largest shown (rounded) amount still cheap */
const CHEAP_MAX = 14

export type LandingFeeLevel = 'free' | 'cheap' | 'high'

export const landingFeeLevel = (fee?: Pick<DerivedLandingFee, 'amount'>): LandingFeeLevel | undefined => {
  if (!fee) return undefined
  if (landingFeeAtMost(fee, 0)) return 'free'
  return landingFeeAtMost(fee, CHEAP_MAX) ? 'cheap' : 'high'
}

/** Filter values (`ADfilter.ad`, URL `adMisc`) → the max shown amount they allow. */
export const LANDING_FEE_FILTERS: Record<string, number> = { 'fee-free': 0, 'fee-15': CHEAP_MAX }

// Paris time, so a midnight-UTC date (fee sheets' validFrom) keeps its day wherever it is rendered (prerender, MCP)
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
const dayMonthYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' })
const toDate = (t: TimestampLike) => new Date(t.seconds * 1000)

/** "Guide tarifaire, en vigueur depuis avril 2026", "Signalé par un pilote en décembre 2011": where the shown fee comes from, and its date. */
export const landingFeeSource = (fee: Pick<DerivedLandingFee, 'source' | 'checkedAt'>) => {
  const date = toDate(fee.checkedAt)
  switch (fee.source) {
    case 'official': return `Guide tarifaire, en vigueur depuis ${monthYear.format(date)}`
    // Month only: imported reports (community map) are dated to the month, and the line stays short
    case 'pilot': return `Signalé par un pilote en ${monthYear.format(date)}`
    case 'admin': return `Vérifié par AeroTrips le ${dayMonthYear.format(date)}`
    case 'aerops-live': return `aeroPS, relevé le ${dayMonthYear.format(date)}`
    case 'aerops': return `Estimation aeroPS, relevée le ${dayMonthYear.format(date)}`
    default: return `${fee.source}, ${monthYear.format(date)}`
  }
}

/** What the airfield page, prerender and MCP show; each renders it its own way. */
export interface LandingFeeDisplay {
  /** "Taxe d'atterrissage : ≈ 10 €", "Atterrissage gratuit", "Taxe d'atterrissage : inconnue" */
  label: string
  known: boolean
  /** Parking lines: "Stationnement 24 h : ≈ 12 €", "1 h de stationnement incluse" */
  parking: string[]
  note?: string
  /** Source line, linked to `url` (the document the price comes from) */
  source?: string
  url?: string
  /** Stable page listing the latest fee sheet */
  pageUrl?: string
}

/** Reference case of paid amounts (in the page's details popover, the prerender's title attribute, MCP inline) */
export const LANDING_FEE_REFERENCE = 'Avion léger visiteur, TTC'

// Rendered as href by the page, prerender and MCP
const isWebUrl = (url?: string): url is string => !!url && /^https?:\/\//i.test(url)

const parkingIncluded = (hours: number) => hours >= 24
  ? `Stationnement ${hours} h inclus`
  : `${hours} h de stationnement incluse${hours > 1 ? 's' : ''}`

export const landingFeeDisplay = (fee?: DerivedLandingFee): LandingFeeDisplay => {
  if (!fee) return { label: "Taxe d'atterrissage : inconnue", known: false, parking: [] }
  const parking = [
    ...(fee.parkingIncludedHours ? [parkingIncluded(fee.parkingIncludedHours)] : []),
    ...(fee.parking24h !== undefined
      ? [fee.parking24h === 0 ? 'Stationnement 24 h : gratuit' : `Stationnement 24 h : ${formatFeeAmount(fee.parking24h)}`]
      : []),
  ]
  return {
    label: fee.amount === 0 ? 'Atterrissage gratuit' : `Taxe d'atterrissage : ${formatLandingFee(fee)}`,
    known: true,
    parking,
    ...(fee.note && { note: fee.note }),
    source: landingFeeSource(fee),
    ...(isWebUrl(fee.url) && { url: fee.url }),
    ...(isWebUrl(fee.pageUrl) && { pageUrl: fee.pageUrl }),
  }
}
