/**
 * Builds scripts/community-fees.json, the « free » landing fees no bulk source has (#18), for `npm run import:fees --
 * community`. Only `amount: 0` entries: paying amounts come from operator sheets and aeroPS.
 *
 * - `community`: the « gratuit » entries of the community map « carte taxes d'atterrissage » (C. Rousseau), via
 *   Natim/france-ga-pilot-maps (`docs/landing_fees.csv`, MIT), plus Natim's own free rows. Unconditional only
 *   (« gratuit si avitaillement », « taxe offerte si repas » are not free); dated from the note (the CSV's date is the
 *   2024 snapshot), entries without a date skipped. Tier above aeroPS estimates, below live prices: old, but pilot
 *   reports (airfield.directory, 2025–2026) confirmed every free entry they mention.
 * - `aerotrips`: our airfield descriptions saying « pas de taxe d'atterrissage », dated by the airfield's `updated_at`.
 *
 *   npx tsx scripts/build-community-fees.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import type { JSONContent } from '@tiptap/core'

const NATIM_CSV = 'https://raw.githubusercontent.com/Natim/france-ga-pilot-maps/main/docs/landing_fees.csv'
const NATIM_REPO = 'https://github.com/Natim/france-ga-pilot-maps'
const OUTPUT = './scripts/community-fees.json'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

type Entry = { source: string, amount: 0, observedAt: string, note: string, url?: string }

const parseCsvLine = (line: string) => {
  const cells: string[] = []
  let cell = '', quoted = false
  for (const char of line) {
    if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { cells.push(cell); cell = '' }
    else cell += char
  }
  return [...cells, cell]
}

/** "24/03/2019", "décembre 2011", "2017" → ISO date; undefined when the note has none */
const noteDate = (text: string) => {
  const day = text.match(/(\d\d)\/(\d\d)\/(\d{4})/)
  if (day) return `${day[3]}-${day[2]}-${day[1]}`
  const month = text.toLowerCase().match(new RegExp(`(${MONTHS.join('|')}) (\\d{4})`))
  if (month) return `${month[2]}-${String(MONTHS.indexOf(month[1]) + 1).padStart(2, '0')}-01`
  const year = text.match(/\b(20\d\d)\b/)
  return year ? `${year[1]}-01-01` : undefined
}

const community = async () => {
  const response = await fetch(NATIM_CSV)
  if (!response.ok) throw new Error(`${NATIM_CSV}: HTTP ${response.status}`)
  const entries: Record<string, Entry> = {}
  for (const [icao, fee, observedOn, , note = ''] of (await response.text()).trim().split('\n').slice(1).map(parseCsvLine)) {
    if (Number(fee) !== 0) continue
    const fromMap = note.includes('C. Rousseau')
    // Map notes: "carte taxes d'atterrissage (C. Rousseau), snapshot 2024-06-02; gratuit - restreint - décembre 2011"
    const text = fromMap ? note.replace(/^.*snapshot \d{4}-\d\d-\d\d; ?/, '') : note
    if (!/^gratuit\b/i.test(text.trim())) {
      console.log(icao, 'skipped, conditional:', text.slice(0, 80))
      continue
    }
    const observedAt = fromMap ? noteDate(text) : observedOn
    if (!observedAt) {
      console.log(icao, 'skipped, no date:', text.slice(0, 80))
      continue
    }
    entries[icao] = {
      source: 'community',
      amount: 0,
      observedAt,
      note: fromMap
        ? 'Signalé gratuit sur la carte communautaire des taxes d\'atterrissage (C. Rousseau).'
        : 'Signalé gratuit (Natim/france-ga-pilot-maps).',
      url: NATIM_REPO,
    }
  }
  return entries
}

const text = (node?: JSONContent): string => !node ? '' : (node.text ?? '') + ' ' + (node.content ?? []).map(text).join(' ')

const NO_FEE = /pas de taxe d.atterrissage|n.applique pas de taxe d.atterrissage|atterrissage gratuit/i

const descriptions = () => {
  const { airfields } = JSON.parse(readFileSync('./src/data/airfields.json', 'utf8'))
  const entries: Record<string, Entry> = {}
  for (const airfield of airfields) {
    if (!NO_FEE.test(text(airfield.description)) || !airfield.updated_at) continue
    entries[airfield.codeIcao] = {
      source: 'aerotrips',
      amount: 0,
      observedAt: new Date(airfield.updated_at.seconds * 1000).toISOString().slice(0, 10),
      note: 'Pas de taxe d\'atterrissage, d\'après la fiche de l\'aérodrome.',
    }
  }
  return entries
}

const map = await community()
const ours = descriptions()
// Our own descriptions win over the map for the same airfield (fresher, one report per airfield and source file)
const airfields = Object.fromEntries(Object.entries({ ...map, ...ours }).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(OUTPUT, JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), airfields }, null, 2) + '\n')
console.log(`Wrote ${Object.keys(airfields).length} free airfields to ${OUTPUT}: ${Object.keys(ours).join(' ')} from our descriptions, the rest from the community map`)
