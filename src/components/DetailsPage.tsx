import { Title, Group, Flex, Text, Button, Paper, Grid } from "@mantine/core"
import BackButton from "./BackButton"
import EditButton from "./EditButton"
import { Activity, Airfield, Trip } from ".."
import { findNearest, iconsList } from "../utils"
import { NearbyActivities, NearbyTrips } from "./ActivityUtils"
import { NearbyAirfields, ToiletText } from "./AirfieldUtils"
import { ButtonVACMap, ButtonViewOnMap } from "./CommonButtons"
import { IconBrandGoogleMaps } from "@tabler/icons-react"
import { Link } from "react-router-dom"
import Description from "./Description"

const DetailsPage = ({id, item, airfields, activities, trips} : 
{id: string, item: Airfield|Activity, airfields: Map<string,Airfield>, activities:Map<string,Activity>, trips:Map<string,Trip>}) => {
  const nearbyAirfields = findNearest(item, airfields, 50000).slice(0,8)
  const nearbyActivities = findNearest(item, activities).slice(0,8)
  const nearbyTrips = [...trips].filter(([,trip]) => trip.steps.some(step => step.type == (('codeIcao' in item) ? 'airfields' : 'activities') && step.id == id)).slice(0,8)

  return (<>
  <Title order={1}>
    <BackButton />{item.name} {('codeIcao' in item) && (<> - {item.codeIcao}</>)}
    &nbsp;<EditButton />
  </Title>
  {('codeIcao' in item) ? (
    <Text {...(item.status != 'CAP' ? {c:'red',fw:'bold'} : {})}>{iconsList.get(item.status)?.label}</Text>
  ) : (
    <Text>{item.type.map<React.ReactNode>(t => (<span key={t}>{iconsList.get(t)?.label} </span>)).reduce((a,b) => [a,' - ',b])}</Text>
  )}
  <Group 
    justify="space-evenly"
    align="baseline"
    grow
    preventGrowOverflow={false} wrap="wrap"
  >
    
    
  </Group>
  <Grid grow
      mt="md">
  <Grid.Col span={3}>
  <Paper
      shadow="md"
      radius="md"
      p='xs'
      withBorder
      bg="gray.0"
    >    
    <Flex
      gap="sm"
      justify="center"
      align="center"
      direction="column"
      wrap="wrap"
    >
      {('codeIcao' in item) ? (<>
        <div>
          <Title order={4}>Pistes</Title>
          {item.runways.map((r,i) => (<div key={i}>{r.designation} - {r.length}m {r.composition == 'GRASS' ? 'Non revêtue' : 'Revêtue'}</div>))}
        </div>
        {(item.fuels && item.fuels.length > 0) ? `Essences: ${item.fuels?.join(' ')}` : `Pas d'essence disponible`}
        <ToiletText airfield={item} />
        <ButtonVACMap airfield={item} />
        <ButtonViewOnMap item={item} />
      </>):(<>
        <div>
          <ButtonViewOnMap item={item} />
        </div>
      </>)}
      <Button
        component={Link}
        to={`https://www.google.fr/maps/place/${item.position.latitude},${item.position.longitude}`}
        target="_blank"
        size={'sm'}
        leftSection={<IconBrandGoogleMaps size={20} />}
      >
        Google Maps
      </Button>
    </Flex>
    </Paper>
  </Grid.Col>
  {item.description && <Grid.Col span={9}><Description content={item.description} /></Grid.Col>}
  <NearbyAirfields items={nearbyAirfields} />
  <NearbyActivities items={nearbyActivities} />
  <NearbyTrips items={nearbyTrips} />
  </Grid>
</>)
}

export default DetailsPage