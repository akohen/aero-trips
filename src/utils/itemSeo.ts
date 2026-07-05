import { Activity, Airfield } from ".."
import { titleCase } from "./utils"

const ROOT_URL = 'https://aerotrips.fr'

// Default site-wide meta strings (must match index.html and DetailsPage's cleanup)
export const DEFAULT_TITLE = 'AeroTrips'
export const DEFAULT_DESCRIPTION = "Découvrez des idées de sorties aériennes en France : terrains d'aviation, activités à proximité, événements et itinéraires partagés par la communauté."

export type ItemSeo = {
  title: string
  description: string
  url: string
  ogType: string
  jsonLdItem: Record<string, unknown>
  jsonLdBreadcrumb: Record<string, unknown>
}

// Single source of truth for per-page SEO metadata, shared by the client
// (DetailsPage useEffect) and the build-time prerender script.
export const buildItemSeo = (
  item: Airfield | Activity,
  { nearbyFoodCount }: { nearbyFoodCount: number },
): ItemSeo => {
  const isAirfield = 'codeIcao' in item
  const type = isAirfield ? 'airfields' : 'activities'
  const id = isAirfield ? item.codeIcao : item.id
  const displayName = titleCase(item.name)
  const url = `${ROOT_URL}/${type}/${id}`

  const title = isAirfield
    ? `Aérodrome de ${displayName} (${item.codeIcao}) — activités à proximité | AeroTrips`
    : `${displayName} — activité à proximité d'un aérodrome | AeroTrips`

  const foodMention = nearbyFoodCount > 0 ? ', dont des restaurants,' : ''
  const description = isAirfield
    ? `Que faire près de l'aérodrome de ${displayName} (${item.codeIcao}) ? Activités et bonnes adresses${foodMention} à proximité, pistes, services et sorties partagées par la communauté des pilotes.`
    : `${displayName} — activité à découvrir en avion à proximité d'un aérodrome, avec les terrains et sorties AeroTrips les plus proches.`

  const jsonLdItem: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': isAirfield ? 'Airport' : 'TouristAttraction',
    name: isAirfield ? `Aérodrome de ${displayName}` : displayName,
    description,
    url,
    address: {
      '@type': 'PostalAddress',
      addressLocality: displayName,
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: item.position.latitude,
      longitude: item.position.longitude,
    },
  }
  if (isAirfield) {
    jsonLdItem.alternateName = item.codeIcao
    jsonLdItem.iataCode = item.codeIcao
    if (item.fuels && item.fuels.length > 0) {
      jsonLdItem.amenityFeature = item.fuels.map((f) => ({
        '@type': 'LocationFeatureSpecification',
        name: `Carburant ${f}`,
        value: true,
      }))
    }
  }
  if (item.website) jsonLdItem.sameAs = item.website

  const jsonLdBreadcrumb: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${ROOT_URL}/` },
      {
        '@type': 'ListItem', position: 2,
        name: isAirfield ? 'Aérodromes' : 'Activités',
        item: `${ROOT_URL}/${type}`,
      },
      { '@type': 'ListItem', position: 3, name: isAirfield ? `${displayName} (${item.codeIcao})` : displayName, item: url },
    ],
  }

  return { title, description, url, ogType: 'place', jsonLdItem, jsonLdBreadcrumb }
}
