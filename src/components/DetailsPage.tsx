import { Title, Text, Button, Paper, Grid, Stack } from "@mantine/core"
import BackButton from "./BackButton"
import EditButton from "./EditButton"
import { Activity, Airfield, Data } from ".."
import { findNearest, iconsList, shortener, titleCase } from "../utils/utils"
import { ButtonVACMap, ButtonViewOnMap } from "./CommonButtons"
import { IconBrandGoogleMaps, IconRoute } from "@tabler/icons-react"
import { Link } from "react-router"
import Description from "./Description"
import FavoriteButton from "./FavoriteButton"
import VisitedButton from "./VisitedButton"
import { useEffect } from "react"
import { useDraftTrip } from "../hooks/useDraftTrip"
import { Nearby } from "./Nearby"
import { NearbyTrips } from "./ActivityUtils"
import { ToiletText } from "./AirfieldUtils"

const DetailsPage = ({id, item, airfields, activities, trips, events, setMapView, profile} : Data & {id: string, item: Airfield|Activity}) => {
  const nearbyAirfields = findNearest(item, airfields, 50000).slice(0,8)
  const nearbyActivities = findNearest(item, activities).slice(0,8)
  const nearbyTrips = [...trips].filter(([,trip]) => trip.steps.some(step => step.type == (('codeIcao' in item) ? 'airfields' : 'activities') && step.id == id)).slice(0,8)
  const airfieldEvents = 'codeIcao' in item
    ? [...events.values()].filter(e => e.airfieldId === id).sort((a, b) => b.startDate.seconds - a.startDate.seconds).slice(0,5)
    : []
  const type = 'codeIcao' in item ? 'airfields' : 'activities'
  const nearbyFoodCount = nearbyActivities.filter(([, a]) => a.type.includes('food')).length
  const { draft, setDraft } = useDraftTrip()
  const isInDraft = draft.steps.some(s => s.type === type && s.id === id)
  const addToDraft = () => {
    if (!isInDraft) setDraft({ ...draft, steps: [...draft.steps, { type, id }] })
  }
  useEffect(() => {
    const isAirfield = 'codeIcao' in item
    const displayName = titleCase(item.name)
    const url = `https://aerotrips.fr/${type}/${id}`

    const title = isAirfield
      ? `Aérodrome de ${displayName} (${item.codeIcao}) — activités à proximité | AeroTrips`
      : `${displayName} — activité à proximité d'un aérodrome | AeroTrips`

    const foodMention = nearbyFoodCount > 0 ? ', dont des restaurants,' : ''
    const description = isAirfield
      ? `Que faire près de l'aérodrome de ${displayName} (${item.codeIcao}) ? Activités et bonnes adresses${foodMention} à proximité, pistes, services et sorties partagées par la communauté des pilotes.`
      : `${displayName} — activité à découvrir en avion à proximité d'un aérodrome, avec les terrains et sorties AeroTrips les plus proches.`

    document.title = title

    const setMeta = (sel: string, attr: string, val: string) => {
      let el = document.querySelector(sel)
      if (!el) {
        el = document.createElement('meta')
        if (sel.includes('property')) { el.setAttribute('property', attr) } else { el.setAttribute('name', attr) }
        document.head.appendChild(el)
      }
      el.setAttribute('content', val)
    }

    setMeta('meta[name="description"]', 'description', description)
    setMeta('meta[property="og:title"]', 'og:title', title)
    setMeta('meta[property="og:description"]', 'og:description', description)
    setMeta('meta[property="og:url"]', 'og:url', url)
    setMeta('meta[property="og:type"]', 'og:type', 'place')
    setMeta('meta[name="twitter:title"]', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'twitter:description', description)

    // JSON-LD structured data
    const schemaType = isAirfield ? 'Airport' : 'TouristAttraction'
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': schemaType,
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
      schema.alternateName = item.codeIcao
      schema.iataCode = item.codeIcao
      if (item.fuels && item.fuels.length > 0) {
        schema.amenityFeature = item.fuels.map((f) => ({
          '@type': 'LocationFeatureSpecification',
          name: `Carburant ${f}`,
          value: true,
        }))
      }
    }
    if (item.website) schema.sameAs = item.website

    // Breadcrumb: Accueil › Aérodromes/Activités › item
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://aerotrips.fr/' },
        {
          '@type': 'ListItem', position: 2,
          name: isAirfield ? 'Aérodromes' : 'Activités',
          item: `https://aerotrips.fr/${type}`,
        },
        { '@type': 'ListItem', position: 3, name: isAirfield ? `${displayName} (${item.codeIcao})` : displayName, item: url },
      ],
    }

    const setSchema = (key: string, value: object) => {
      let el = document.querySelector(`script[data-schema="${key}"]`) as HTMLScriptElement | null
      if (!el) {
        el = document.createElement('script')
        el.setAttribute('type', 'application/ld+json')
        el.setAttribute('data-schema', key)
        document.head.appendChild(el)
      }
      el.textContent = JSON.stringify(value)
    }
    setSchema('item', schema)
    setSchema('breadcrumb', breadcrumb)

    return () => {
      document.title = 'AeroTrips'
      setMeta('meta[name="description"]', 'description', 'Découvrez des idées de sorties aériennes en France : terrains d\'aviation, activités à proximité, événements et itinéraires partagés par la communauté.')
      setMeta('meta[property="og:title"]', 'og:title', 'AeroTrips')
      setMeta('meta[property="og:description"]', 'og:description', 'Découvrez des idées de sorties aériennes en France : terrains d\'aviation, activités à proximité, événements et itinéraires partagés par la communauté.')
      setMeta('meta[property="og:url"]', 'og:url', 'https://aerotrips.fr/')
      setMeta('meta[property="og:type"]', 'og:type', 'website')
      setMeta('meta[name="twitter:title"]', 'twitter:title', 'AeroTrips')
      setMeta('meta[name="twitter:description"]', 'twitter:description', 'Découvrez des idées de sorties aériennes en France : terrains d\'aviation, activités à proximité, événements et itinéraires partagés par la communauté.')
      document.querySelector('script[data-schema="item"]')?.remove()
      document.querySelector('script[data-schema="breadcrumb"]')?.remove()
    }
  }, [item, id, type, nearbyFoodCount]);

  return (<>
  <Title order={1}>
    <BackButton />{('codeIcao' in item) ? (<>Aérodrome de {titleCase(item.name)} - {item.codeIcao}</>) : titleCase(item.name)}
    {profile && <VisitedButton item={{ type, id }} profile={profile} icon />}
    {profile && <FavoriteButton item={{ type, id }} profile={profile} icon />}
    <EditButton />
  </Title>
  {('codeIcao' in item) ? (
    <Text {...(item.status != 'CAP' ? {c:'red',fw:'bold'} : {})}>{iconsList.get(item.status)?.label}</Text>
  ) : (
    <Text>{item.type.map<React.ReactNode>(t => (<span key={t}>{iconsList.get(t)?.label} </span>)).reduce((a,b) => [a,' - ',b])}</Text>
  )}

  <Grid grow mt="md">
    <Grid.Col span={3}>
    <Paper
      shadow="md"
      radius="md"
      p='xs'
      withBorder
      bg="gray.0"
    >
      <Stack gap={"xs"}>
      {('codeIcao' in item) && <>
        <div>
          <Title order={4}>Pistes</Title>
          {item.runways.map((r,i) => (<div key={i}>{r.designation} - {r.length}m {r.composition == 'GRASS' ? 'Non revêtue' : 'Revêtue'}</div>))}
        </div>
        {item.nightVFR && <Text>Agréé VFR de nuit</Text>}
        {(item.fuels && item.fuels.length > 0) ? `Avitaillement: ${item.fuels?.join(' ')}` : `Pas d'avitaillement disponible`}
        <ToiletText airfield={item} />
        <ButtonVACMap airfield={item} />
      </>}
      
      <ButtonViewOnMap item={item} setMapView={setMapView} />
      <Button
        component={Link}
        to={`https://www.google.fr/maps/place/${item.position.latitude},${item.position.longitude}`}
        target="_blank"
        leftSection={<IconBrandGoogleMaps size={20} />}
      >
        Google Maps
      </Button>
      {profile && (
        <Button
          onClick={addToDraft}
          disabled={isInDraft}
          leftSection={<IconRoute size={20} />}
        >
          {isInDraft ? 'Ajouté à la sortie' : 'Ajouter à la sortie'}
        </Button>
      )}
      {item.website && <Text><b>Site internet</b> <Link to={item.website}>{shortener(item.website, 35)}</Link></Text>}
      {item.updated_at && (
        <Text size="xs" ta={"right"}>
          Mis à jour le {new Date(item.updated_at.seconds * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </Text>
      )}
      </Stack>
    </Paper>
  </Grid.Col>
  {item.description && <Grid.Col span={6}><Description content={item.description} /></Grid.Col>}
  <NearbyTrips items={nearbyTrips} events={airfieldEvents} />
  <Grid.Col span={12}>
    <Title order={4}>Activités à proximité</Title>
    <Nearby items={nearbyActivities} profile={profile} />
  </Grid.Col>
  <Grid.Col span={12}>
    <Title order={4}>Terrains à proximité</Title>
    <Nearby items={nearbyAirfields} profile={profile} />
  </Grid.Col>
  </Grid>
</>)
}

export default DetailsPage