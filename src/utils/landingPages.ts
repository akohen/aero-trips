import { Activity, Airfield } from ".."
import { DEFAULT_IMAGE, ItemSeo, NEARBY_ACTIVITIES_LIMIT, ROOT_URL } from "./itemSeo"
import { deName, findNearest, titleCase } from "./utils"

// Thematic landing pages (/decouvrir/{slug}). Each page is a rule evaluated over the data,
// not a hand-picked list, so a new address shows up on the right pages at the next build.
// React-free: shared by the prerender script, the sitemap export and the SPA route.

export type Nearby = [distance: number, activity: Activity, id: string]

export type LandingEntry = {
  airfield: Airfield
  // Activities that earn the airfield its place on the page (e.g. the restaurants)
  highlights: Nearby[]
}

export type LandingPage = {
  slug: string
  h1: string
  title: (count: number) => string
  description: (count: number) => string
  // Hand-written paragraphs, so pages are not interchangeable lists
  intro: string[]
  // Activities qualifying the airfield; it is listed when there is at least one
  highlights: (nearby: Nearby[]) => Nearby[]
}

const isFood = ([, a]: Nearby) => a.type.includes('food')

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: 'restaurants-aerodromes',
    h1: 'Aérodromes avec un restaurant à proximité',
    title: (n) => `Restaurants d'aérodrome : ${n} terrains où déjeuner en avion | AeroTrips`,
    description: (n) =>
      `${n} aérodromes en France avec un restaurant sur le terrain ou à proximité : adresses, distance depuis la piste et fiches des terrains, partagées par la communauté des pilotes.`,
    intro: [
      "Déjeuner au bout d'une navigation reste l'une des meilleures raisons de voler. Voici les aérodromes pour lesquels la communauté AeroTrips a repéré au moins un restaurant, sur le terrain ou à proximité, avec la distance depuis l'aérodrome.",
      "Les horaires changent souvent, surtout hors saison : pensez à appeler avant de partir, et consultez la carte VAC et les NOTAM pour préparer votre vol. Vous connaissez une adresse qui manque ? Ajoutez-la depuis la fiche de l'aérodrome.",
    ],
    highlights: (nearby) => nearby.filter(isFood),
  },
]

export const landingPageUrl = (page: LandingPage) => `/decouvrir/${page.slug}`

// Airfields that can't be flown to by private pilots are left out of every page
const LISTED_STATUSES: Airfield['status'][] = ['CAP', 'RST', 'PRV']

// Same list as the airfield page (see NEARBY_ACTIVITIES_LIMIT), so both always agree
export const nearbyActivities = (airfield: Airfield, activities: Map<string, Activity>) =>
  findNearest(airfield, activities).slice(0, NEARBY_ACTIVITIES_LIMIT) as Nearby[]

export const buildLandingEntries = (
  page: LandingPage,
  airfields: Map<string, Airfield>,
  activities: Map<string, Activity>,
): LandingEntry[] =>
  [...airfields.values()]
    .filter((af) => LISTED_STATUSES.includes(af.status))
    .map((airfield) => ({ airfield, highlights: page.highlights(nearbyActivities(airfield, activities)) }))
    .filter((e) => e.highlights.length > 0)
    .sort((a, b) => titleCase(a.airfield.name).localeCompare(titleCase(b.airfield.name), 'fr'))

export const buildLandingSeo = (page: LandingPage, entries: LandingEntry[]): ItemSeo => {
  const url = `${ROOT_URL}${landingPageUrl(page)}`
  const description = page.description(entries.length)
  return {
    title: page.title(entries.length),
    description,
    url,
    ogType: 'website',
    image: DEFAULT_IMAGE,
    jsonLdItem: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: page.h1,
      description,
      url,
      numberOfItems: entries.length,
      itemListElement: entries.map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `Aérodrome ${deName(titleCase(e.airfield.name))} (${e.airfield.codeIcao})`,
        url: `${ROOT_URL}/airfields/${e.airfield.codeIcao}`,
      })),
    },
    jsonLdBreadcrumb: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${ROOT_URL}/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: url },
      ],
    },
  }
}
