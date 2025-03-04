import { Title, Text, Button, Paper, Grid, Stack } from "@mantine/core"
import BackButton from "./BackButton"
import EditButton from "./EditButton"
import { Activity, Airfield, Data } from ".."
import { findNearest, iconsList, shortener } from "../utils"
import { NearbyActivities, NearbyTrips } from "./ActivityUtils"
import { NearbyAirfields, ToiletText } from "./AirfieldUtils"
import { ButtonVACMap, ButtonViewOnMap } from "./CommonButtons"
import { IconBrandGoogleMaps } from "@tabler/icons-react"
import { Link } from "react-router-dom"
import Description from "./Description"
import FavoriteButton from "./FavoriteButton"
import VisitedButton from "./VisitedButton"
import { useEffect } from "react"

const DetailsPage = ({id, item, airfields, activities, trips, setMapView, profile} : Data & {id: string, item: Airfield|Activity}) => {
  const nearbyAirfields = findNearest(item, airfields, 50000).slice(0,8)
  const nearbyActivities = findNearest(item, activities).slice(0,8)
  const nearbyTrips = [...trips].filter(([,trip]) => trip.steps.some(step => step.type == (('codeIcao' in item) ? 'airfields' : 'activities') && step.id == id)).slice(0,8)
  const type = 'codeIcao' in item ? 'airfields' : 'activities'
  useEffect(() => {
    document.title = ('codeIcao' in item ? `${item.codeIcao} - ` : '') + item.name + ' - AeroTrips'
  }, [item]);

  return (<>
  <Title order={1}>
    <BackButton />{item.name}{('codeIcao' in item) && (<> - {item.codeIcao}</>)}
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
  <NearbyAirfields items={nearbyAirfields} />
  <NearbyTrips items={nearbyTrips} />
  <NearbyActivities items={nearbyActivities} profile={profile} />
  </Grid>
</>)
}

export default DetailsPage