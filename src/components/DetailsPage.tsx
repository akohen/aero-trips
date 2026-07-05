import { Title, Text, Button, Paper, Grid, Stack } from "@mantine/core"
import BackButton from "./BackButton"
import EditButton from "./EditButton"
import { Activity, Airfield, Data } from ".."
import { findNearest, iconsList, shortener, titleCase } from "../utils/utils"
import { buildItemSeo, DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "../utils/itemSeo"
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
    const { title, description, url, ogType, jsonLdItem, jsonLdBreadcrumb } = buildItemSeo(item, { nearbyFoodCount })

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
    setMeta('meta[property="og:type"]', 'og:type', ogType)
    setMeta('meta[name="twitter:title"]', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'twitter:description', description)

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
    setSchema('item', jsonLdItem)
    setSchema('breadcrumb', jsonLdBreadcrumb)

    return () => {
      document.title = DEFAULT_TITLE
      setMeta('meta[name="description"]', 'description', DEFAULT_DESCRIPTION)
      setMeta('meta[property="og:title"]', 'og:title', DEFAULT_TITLE)
      setMeta('meta[property="og:description"]', 'og:description', DEFAULT_DESCRIPTION)
      setMeta('meta[property="og:url"]', 'og:url', 'https://aerotrips.fr/')
      setMeta('meta[property="og:type"]', 'og:type', 'website')
      setMeta('meta[name="twitter:title"]', 'twitter:title', DEFAULT_TITLE)
      setMeta('meta[name="twitter:description"]', 'twitter:description', DEFAULT_DESCRIPTION)
      document.querySelector('script[data-schema="item"]')?.remove()
      document.querySelector('script[data-schema="breadcrumb"]')?.remove()
    }
  }, [item, nearbyFoodCount]);

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