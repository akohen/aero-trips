import { Title, Text, Button, Paper, Grid, Stack, Anchor } from "@mantine/core"
import BackButton from "./BackButton"
import EditButton from "./EditButton"
import { Activity, Airfield, Data } from ".."
import { deName, findNearest, shortener, titleCase } from "../utils/utils"
import { iconsList } from "../utils/icons"
import { buildItemSeo, countFood, NEARBY_ACTIVITIES_LIMIT, nearbyActivitiesHeading } from "../utils/itemSeo"
import { usePageSeo } from "../hooks/usePageSeo"
import { ButtonVACMap, ButtonViewOnMap } from "./CommonButtons"
import { IconBrandGoogleMaps, IconCode, IconRoute } from "@tabler/icons-react"
import { Link, useLocation, useNavigate } from "react-router"
import Description from "./Description"
import FavoriteButton from "./FavoriteButton"
import VisitedButton from "./VisitedButton"
import { lazy, Suspense } from "react"
import { useDraftTrip } from "../hooks/useDraftTrip"
import { Nearby } from "./Nearby"
import { NearbyTrips } from "./ActivityUtils"
import { ToiletText } from "./AirfieldUtils"
// Lazy: only webmasters open it, keep it out of the airfield page bundle.
const EmbedModal = lazy(() => import("./EmbedModal"))

// Opens the "Intégrer sur votre site" modal; linkable (e.g. /airfields/LFBE#integrer) for outreach emails.
const EMBED_HASH = '#integrer'

const DetailsPage = ({id, item, airfields, activities, trips, events, setMapView, profile} : Data & {id: string, item: Airfield|Activity}) => {
  const nearbyAirfields = findNearest(item, airfields, 50000).slice(0,10)
  const nearbyActivities = findNearest(item, activities).slice(0, NEARBY_ACTIVITIES_LIMIT) as [number, Activity, string][]
  const nearbyTrips = [...trips].filter(([,trip]) => trip.steps.some(step => step.type == (('codeIcao' in item) ? 'airfields' : 'activities') && step.id == id)).slice(0,8)
  const airfieldEvents = 'codeIcao' in item
    ? [...events.values()].filter(e => e.airfieldId === id).sort((a, b) => b.startDate.seconds - a.startDate.seconds).slice(0,5)
    : []
  const type = 'codeIcao' in item ? 'airfields' : 'activities'
  const nearbyFoodCount = countFood(nearbyActivities)
  const location = useLocation()
  const navigate = useNavigate()
  const embedOpened = location.hash === EMBED_HASH
  const setEmbedHash = (hash: string) =>
    navigate({ pathname: location.pathname, search: location.search, hash }, { replace: true, preventScrollReset: true })
  const { draft, setDraft } = useDraftTrip()
  const isInDraft = draft.steps.some(s => s.type === type && s.id === id)
  const addToDraft = () => {
    if (!isInDraft) setDraft({ ...draft, steps: [...draft.steps, { type, id }] })
  }
  const seo = buildItemSeo(item, { nearbyFoodCount })
  usePageSeo(seo)

  return (<>
  <Title order={1}>
    <BackButton />{('codeIcao' in item) ? (<>Aérodrome {deName(titleCase(item.name))} - {item.codeIcao}</>) : titleCase(item.name)}
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
      {('codeIcao' in item) && (
        <Anchor component="button" type="button" size="sm" ta="left" onClick={() => setEmbedHash(EMBED_HASH)}>
          <IconCode size={16} style={{ verticalAlign: 'middle' }} /> Intégrer sur votre site
        </Anchor>
      )}
      {item.updated_at && (
        <Text size="xs" ta={"right"}>
          Mis à jour le {new Date(item.updated_at.seconds * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </Text>
      )}
      </Stack>
    </Paper>
  </Grid.Col>
  {item.description && <Grid.Col span={6}><Description content={item.description} label={'codeIcao' in item ? titleCase(item.name) : item.name} /></Grid.Col>}
  <NearbyTrips items={nearbyTrips} events={airfieldEvents} />
  <Grid.Col span={12}>
    <Title order={2} size="h4">{nearbyActivitiesHeading(item, nearbyFoodCount)}</Title>
    <Nearby items={nearbyActivities} profile={profile} />
    {('codeIcao' in item) && nearbyActivities.length > 0 && (
      <Anchor component="button" type="button" size="sm" mt="xs" onClick={() => setEmbedHash(EMBED_HASH)}>
        Intégrer ces adresses sur votre site →
      </Anchor>
    )}
  </Grid.Col>
  <Grid.Col span={12}>
    <Title order={4}>Terrains à proximité</Title>
    <Nearby items={nearbyAirfields} profile={profile} />
  </Grid.Col>
  </Grid>
  {('codeIcao' in item) && embedOpened && (
    <Suspense fallback={null}>
      <EmbedModal airfield={item} opened onClose={() => setEmbedHash('')} />
    </Suspense>
  )}
</>)
}

export default DetailsPage