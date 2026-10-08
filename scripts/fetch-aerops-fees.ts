/**
 * Proof of concept for #18: scrapes the landing fee examples that aeroPS publishes for French airfields
 * (https://www.aerops.com/fr/airports/fee-info/{ICAO}-{name}/) and writes the raw grid to
 * scripts/aerops-fees.json, with each airfield reduced to the reference case (`reference`).
 * No Firebase: the import into Firestore comes later.
 *
 * aeroPS has no public API. Pages are listed in their sitemap and allowed by robots.txt; requests are
 * sequential and spaced out.
 *
 *   npx tsx scripts/fetch-aerops-fees.ts [--limit 10] [--only LFHS,LFPI]
 */
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const SITEMAP = 'https://www.aerops.com/fr/sitemap.xml'
const OUTPUT = './scripts/aerops-fees.json'
const UA = 'aerotrips-import/1.0 (+https://aerotrips.fr)'
const GAP_MS = 2000
/** aeroPS example class matching the reference case of #18 (4-seat SEP ≤ 1.5 t) */
const REFERENCE_CLASS = 'C172'
const LANDING = /atterrissage|landing|landung/i
const PARKING = /stationnement|parking|abstell|abri|hangar/i
const PER_DAY = /jour|nuit|day|night|tag|nacht|24 ?h|<> ?24/i
const PER_HOUR = /heure|hour|stunde/i
const MINIMUM = /minim/i

/** `amount` is the line total (quantity included), as aeroPS shows it */
type Item = { quantity: number, label: string, amount: number }
/** `training`: touch-and-go price, listed apart from the total */
type Price = { class: string, total: number, items: Item[], training?: number }

// Flat rates cover both ("LANDING AND PARKING"): count them as landing
const isParking = (item: Item) => PARKING.test(item.label) && !LANDING.test(item.label)
const isFlatRate = (item: Item) => PARKING.test(item.label) && LANDING.test(item.label)

/**
 * The reference case of #18, from the C172 example (one landing + one overnight stay):
 * - `amount`: every non-parking line (flat landing + parking rates included).
 * - `parking24h`: an hourly rate over 18–24 h (the rest is free time included with the landing), or one
 *   "per day / per night / 12<>24 h" line. 12 h, 48 h, minimum charges and missing lines: unknown, not free.
 * - `vat`: TTC. Live prices are what the aeroPS app charges; unspecified estimates are TTC too (checked on LFAQ,
 *   LFBI, LFAT, 2026-10-07), even when the amount itself is wrong (Dijon's estimate is the HT grid).
 */
const reduce = (prices: Price[]) => {
  const reference = prices.find((p) => p.class === REFERENCE_CLASS)
  if (!reference) return undefined
  const landing = reference.items.filter((i) => !isParking(i))
  const parking = reference.items.filter(isParking)
  const sum = (items: Item[]) => Math.round(items.reduce((total, i) => total + i.amount, 0) * 100) / 100
  const covers24h = parking.length > 0 && parking.every((i) => !MINIMUM.test(i.label)
    && (PER_DAY.test(i.label) ? i.quantity === 1 : PER_HOUR.test(i.label) && i.quantity >= 18 && i.quantity <= 24))
  return {
    amount: sum(landing),
    parking24h: covers24h ? sum(parking) : undefined,
    flatRate: landing.some(isFlatRate) || undefined,
    vat: 'ttc' as const,
  }
}

const { values: args } = parseArgs({ options: { limit: { type: 'string' }, only: { type: 'string' } } })

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const get = async (url: string) => {
  const response = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.text()
}

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replaceAll('&amp;', '&'))

const decode = (text: string) => text
  .replace(/<[^>]+>/g, '')
  .replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim()

// "1 234,56 €" → 1234.56
const euros = (text: string) => Number(text.replace(/[^\d,]/g, '').replace(',', '.'))

const parsePage = (html: string, code: string): Price[] => {
  const body = html.match(new RegExp(`<tbody id="price-list-${code}">([\\s\\S]*?)</tbody>`))?.[1]
  if (!body) return []
  const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map(([, row]) => [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]))
  // "Aucune donnée de prix disponible": unknown, not free
  return rows.filter((cells) => /\d/.test(cells[1] ?? '')).map((cells) => {
    const lines = [...(cells[2] ?? '').matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, li]) => decode(li))
    const training = lines.find((line) => /entraînement/i.test(line))
    const items = lines.filter((line) => line !== training).map((line) => {
      const [, quantity, label, amount] = line.match(/^(\d+)x (.*) \(([^()]*€)\)$/) ?? ['', '1', line, '']
      return { quantity: Number(quantity), label, amount: euros(amount) }
    })
    return { class: decode(cells[0]), total: euros(cells[1]), items, training: training ? euros(training) : undefined }
  })
}

const pages = []
for (const sitemap of locs(await get(SITEMAP))) {
  pages.push(...locs(await get(sitemap)).filter((url) => /\/fee-info\/LF[A-Z]{2}-/.test(url)))
}
const only = args.only?.split(',')
const selected = pages
  .map((url) => ({ url, code: url.match(/\/fee-info\/(LF[A-Z]{2})-/)![1] }))
  .filter(({ code }) => !only || only.includes(code))
  .slice(0, args.limit ? Number(args.limit) : undefined)
console.log(`${pages.length} French airfields on aeroPS, fetching ${selected.length}`)

/**
 * `live`: "prix en temps réel valides" (`price-notice-valid`), the airfield bills through aeroPS: the price is what
 * pilots pay in the app. Otherwise aeroPS's estimate ("les prix peuvent varier légèrement").
 */
const airfields: Record<string, { url: string, live: boolean, reference?: ReturnType<typeof reduce>, prices: Price[] }> = {}
for (const { url, code } of selected) {
  await sleep(GAP_MS)
  const html = await get(url).catch((error: Error) => console.log(code, error.message))
  if (!html) continue
  const prices = parsePage(html, code)
  if (prices.length === 0) {
    console.log(code, 'no price data')
    continue
  }
  // The class alone also appears in the page's stylesheet
  const live = /class="price-notice price-notice-valid"/.test(html)
  const reference = reduce(prices)
  airfields[code] = { url, live, reference, prices }
  const items = prices.find((p) => p.class === REFERENCE_CLASS)?.items
  console.log(code, live ? 'live' : 'estimate', reference
    ? `${reference.amount} € + parking ${reference.parking24h ?? '?'} € — ${items!.map((i) => `${i.quantity}x ${i.label}`).join(' | ')}`
    : `no ${REFERENCE_CLASS} example (${prices.length} rows)`)
}

writeFileSync(OUTPUT, JSON.stringify({ source: 'aerops', fetchedAt: new Date().toISOString(), airfields }, null, 2) + '\n')
console.log(`Wrote ${Object.keys(airfields).length} airfields to ${OUTPUT}`)
