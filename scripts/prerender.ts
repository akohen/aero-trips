/**
 * Build-time static prerendering of airfield detail pages (SEO).
 *
 * Runs as `postbuild` (via tsx) after `vite build`. For every airfield in the
 * committed src/data/airfields.json it writes dist/airfields/{ICAO}/index.html:
 * a copy of the built SPA shell with per-page <title>/meta/JSON-LD (from the
 * shared buildItemSeo) AND a crawlable body (H1, targeted intro, runways,
 * description, "activités/restaurants à proximité" and "terrains à proximité"
 * as internal links). Googlebot reads this on first pass; the SPA boots and
 * replaces #root on mount. No Firebase, no headless browser.
 */
import fs from 'fs'
import path from 'path'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import { findNearest, iconsList, titleCase } from '../src/utils/utils.ts'
import { buildItemSeo } from '../src/utils/itemSeo.ts'
import type { Activity, Airfield } from '../src'

const DIST = 'dist'

// --- Load data (same JSON the app bundles) --------------------------------
const airfieldsData = JSON.parse(fs.readFileSync('src/data/airfields.json', 'utf8'))
const activitiesData = JSON.parse(fs.readFileSync('src/data/activities.json', 'utf8'))
const airfields = new Map<string, Airfield>(
  airfieldsData.airfields.map((a: Airfield) => [a.codeIcao, a]),
)
const activities = new Map<string, Activity>(
  activitiesData.activities.map((a: Activity) => [a.id, a]),
)

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')

// --- Helpers --------------------------------------------------------------
const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const fmtDist = (m: number) =>
  m > 2500 ? `${Math.round(m / 1000)} km` : `${Math.round(m / 100) * 100} m`

// Embed JSON-LD without letting content break out of the <script> element.
const jsonLd = (obj: unknown) => JSON.stringify(obj).replace(/</g, '\\u003c')

// tiptap output is constrained (StarterKit + Image + Youtube), but harden the
// pre-hydration snapshot: drop xmlns noise, on* handlers, and unsafe URLs.
const SAFE_URL = /^(https?:|\/|#|mailto:|tel:)/i
const scrub = (html: string) =>
  html
    .replace(/\sxmlns="[^"]*"/g, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\b(href|src)="([^"]*)"/gi, (m, attr, url) =>
      SAFE_URL.test(String(url).trim()) ? m : `${attr}="#"`)

const descriptionToHtml = (content: unknown) => {
  if (!content) return ''
  try {
    return scrub(generateHTML(content as Parameters<typeof generateHTML>[0], [StarterKit, Image, Youtube]))
  } catch {
    return ''
  }
}

// --- Per-page <head> ------------------------------------------------------
// Replace the region from <title> through the default twitter meta with the
// per-page tags; everything else in the shell (gtag, canonical script, hashed
// asset <script>/<link>) is preserved verbatim.
const titleStart = template.indexOf('<title>')
const twitterIdx = template.indexOf('name="twitter:description"')
const headRegionEnd = template.indexOf('/>', twitterIdx) + 2
const headRegion = template.slice(titleStart, headRegionEnd)
if (titleStart < 0 || twitterIdx < 0) {
  throw new Error('prerender: could not locate <head> injection anchors in dist/index.html')
}

const buildHead = (seo: ReturnType<typeof buildItemSeo>) =>
  [
    `<title>${esc(seo.title)}</title>`,
    `<link rel="canonical" href="${seo.url}" />`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    `<meta property="og:site_name" content="AeroTrips" />`,
    `<meta property="og:type" content="${seo.ogType}" />`,
    `<meta property="og:url" content="${seo.url}" />`,
    `<meta property="og:title" content="${esc(seo.title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${esc(seo.title)}" />`,
    `<meta name="twitter:description" content="${esc(seo.description)}" />`,
    `<script type="application/ld+json" data-schema="item">${jsonLd(seo.jsonLdItem)}</script>`,
    `<script type="application/ld+json" data-schema="breadcrumb">${jsonLd(seo.jsonLdBreadcrumb)}</script>`,
  ].join('\n    ')

// --- Per-page body (injected into #root) ----------------------------------
const nearbyList = (
  items: [distance: number, item: Activity | Airfield, id: string][],
  href: (item: Activity | Airfield, id: string) => string,
  label: (item: Activity | Airfield, id: string) => string,
) =>
  '<ul>' +
  items
    .map(([dist, item, id]) =>
      `<li><a href="${href(item, id)}">${esc(label(item, id))} — à ${fmtDist(dist)}</a></li>`)
    .join('') +
  '</ul>'

const buildBody = (
  af: Airfield,
  nearbyActs: [number, Activity, string][],
  nearbyAds: [number, Airfield, string][],
) => {
  const ville = titleCase(af.name)
  const status = iconsList.get(af.status)?.label ?? ''
  const parts: string[] = []

  parts.push(`<h1>Aérodrome de ${esc(ville)} - ${esc(af.codeIcao)}</h1>`)
  if (status) parts.push(`<p>${esc(status)}</p>`)
  parts.push(
    `<p>Que faire à proximité de l'aérodrome de ${esc(ville)} (${esc(af.codeIcao)}) ? ` +
      `Découvrez les activités et restaurants à proximité, les informations sur les pistes ` +
      `et services, et des idées de sorties en avion partagées par la communauté des pilotes.</p>`,
  )

  parts.push('<h2>Pistes</h2><ul>')
  parts.push(
    af.runways
      .map((r) => `<li>${esc(r.designation ?? '')} - ${r.length}m ${r.composition === 'GRASS' ? 'Non revêtue' : 'Revêtue'}</li>`)
      .join(''),
  )
  parts.push('</ul>')
  if (af.nightVFR) parts.push('<p>Agréé VFR de nuit</p>')
  parts.push(
    `<p>${af.fuels && af.fuels.length > 0 ? `Avitaillement : ${esc(af.fuels.join(' '))}` : "Pas d'avitaillement disponible"}</p>`,
  )
  if (af.toilet === 'private') parts.push('<p>Toilettes privées</p>')
  if (af.toilet === 'public') parts.push('<p>Toilettes publiques</p>')

  const descHtml = descriptionToHtml(af.description)
  if (descHtml) parts.push(`<div>${descHtml}</div>`)

  if (af.website) {
    parts.push(`<p>Site internet : <a href="${esc(af.website)}" rel="nofollow">${esc(af.website)}</a></p>`)
  }

  if (nearbyActs.length > 0) {
    parts.push('<h2>Activités à proximité</h2>')
    parts.push(nearbyList(nearbyActs, (_i, id) => `/activities/${esc(id)}`, (i) => i.name))
  }
  if (nearbyAds.length > 0) {
    parts.push('<h2>Terrains à proximité</h2>')
    parts.push(
      nearbyList(
        nearbyAds,
        (i) => `/airfields/${esc((i as Airfield).codeIcao)}`,
        (i) => `${(i as Airfield).codeIcao} - ${i.name}`,
      ),
    )
  }

  return parts.join('\n      ')
}

// --- Generate -------------------------------------------------------------
let count = 0
for (const af of airfields.values()) {
  const nearbyActs = findNearest(af, activities).slice(0, 8) as [number, Activity, string][]
  const nearbyAds = findNearest(af, airfields, 50000).slice(0, 8) as [number, Airfield, string][]
  const nearbyFoodCount = nearbyActs.filter(([, a]) => a.type.includes('food')).length

  const seo = buildItemSeo(af, { nearbyFoodCount })
  const body = buildBody(af, nearbyActs, nearbyAds)

  const html = template
    .replace(headRegion, buildHead(seo))
    .replace('<div id="root"></div>', `<div id="root">\n      ${body}\n    </div>`)

  const dir = path.join(DIST, 'airfields', af.codeIcao)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
  count++
}

console.log(`Prerendered ${count} airfields`)
