import { Activity, Airfield } from ".."
import { DEFAULT_IMAGE, ItemSeo, NEARBY_ACTIVITIES_LIMIT, ROOT_URL } from "./itemSeo"
import { deName, findNearest, titleCase } from "./utils"

// Thematic landing pages (/decouvrir/{slug}). Each page is a rule evaluated over the data,
// not a hand-picked list, so a new address shows up on the right pages at the next build.
// React-free: shared by the prerender script, the sitemap export and the SPA route.

export type Nearby = [distance: number, activity: Activity, id: string]

export type LandingEntry = {
  airfield: Airfield
  // Activities shown on the airfield's card (e.g. the restaurants)
  highlights: Nearby[]
  // Index in the page's `sections`, 0 when it has none
  section: number
}

export type LandingSection = {
  h2: string
  intro: string
  test: (airfield: Airfield) => boolean
}

export type LandingPage = {
  slug: string
  h1: string
  title: (count: number) => string
  description: (count: number) => string
  // Hand-written paragraphs, so pages are not interchangeable lists
  intro: string[]
  // Activities shown on the airfield's card, among its nearby list
  highlights: (nearby: Nearby[]) => Nearby[]
  // Whether the airfield is on the page; defaults to having at least one highlight
  listed?: (airfield: Airfield, highlights: Nearby[]) => boolean
  // Splits the list, in this order; an airfield goes to the first section it passes
  sections?: LandingSection[]
}

const isFood = ([, a]: Nearby) => a.type.includes('food')
const isBike = ([, a]: Nearby) => a.type.includes('bike')
const isFoodOrLodging = ([, a]: Nearby) => a.type.includes('food') || a.type.includes('lodging')

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
  {
    slug: 'aerodromes-vfr-de-nuit',
    h1: 'Aérodromes agréés VFR de nuit',
    title: (n) => `VFR de nuit : ${n} aérodromes agréés en France | AeroTrips`,
    description: (n) =>
      `Les ${n} aérodromes agréés VFR de nuit en France, avec ou sans limitations, et les restaurants et hébergements à proximité pour une arrivée de nuit.`,
    intro: [
      "En France, le VFR de nuit n'est possible qu'au départ et à destination d'un aérodrome agréé. Voici les terrains agréés VFR de nuit d'après la liste publiée par le SIA dans le complément aux cartes aéronautiques VFR, avec les restaurants et hébergements repérés à proximité par la communauté AeroTrips.",
      "Le balisage, les horaires et les conditions d'utilisation de nuit sont propres à chaque terrain : consultez la carte VAC et les NOTAM avant de partir.",
    ],
    highlights: (nearby) => nearby.filter(isFoodOrLodging),
    listed: (airfield) => Boolean(airfield.nightVFR),
    sections: [
      {
        h2: 'Agréés sans limitations',
        intro: "Pas d'agrément préalable : ces terrains sont ouverts au VFR de nuit à tout pilote qualifié, dans les conditions publiées sur la carte VAC (horaires, balisage, PPR éventuel).",
        test: (airfield) => airfield.nightVFR === 'full',
      },
      {
        h2: 'Agréés avec limitations',
        intro: "Pour ces terrains, un agrément préalable est nécessaire, avec la connaissance des procédures locales : il s'obtient auprès de l'exploitant, parfois par téléphone, parfois après un vol avec un instructeur. Renseignez-vous avant de prévoir une arrivée de nuit.",
        test: () => true,
      },
    ],
  },
  {
    slug: 'location-velo-aerodromes',
    h1: 'Aérodromes avec location de vélos à proximité',
    title: (n) => `Location de vélos : ${n} aérodromes où poser l'avion et pédaler | AeroTrips`,
    description: (n) =>
      `${n} aérodromes en France avec une location de vélos, des vélos en libre-service ou une voie verte à proximité : adresses, distance depuis la piste et fiches des terrains.`,
    intro: [
      "Pas de voiture à l'arrivée ? Un vélo suffit souvent pour rejoindre le centre-ville, la plage ou un site à visiter. Voici les aérodromes pour lesquels la communauté AeroTrips a repéré une location de vélos, des vélos en libre-service ou une voie verte à proximité, avec la distance depuis l'aérodrome.",
      "Certains loueurs livrent les vélos au terrain, d'autres demandent de réserver, surtout en saison : appelez avant de partir. Vous connaissez une adresse qui manque ? Ajoutez-la depuis la fiche de l'aérodrome.",
    ],
    highlights: (nearby) => nearby.filter(isBike),
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
    .filter(({ airfield, highlights }) => page.listed ? page.listed(airfield, highlights) : highlights.length > 0)
    .map((e) => ({ ...e, section: Math.max(0, page.sections?.findIndex((s) => s.test(e.airfield)) ?? 0) }))
    .sort((a, b) => a.section - b.section || titleCase(a.airfield.name).localeCompare(titleCase(b.airfield.name), 'fr'))

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
