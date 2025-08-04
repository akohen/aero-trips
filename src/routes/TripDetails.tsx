import { Link, useParams } from "react-router-dom";
import { Activity, Airfield, Data } from "..";
import { Flex, Grid, Paper, Stack, Text, Title } from "@mantine/core";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import { AirfieldMarker } from "../components/AirfieldUtils";
import ActivityMarker from '../components/ActivityMarker';
import { latLngBounds } from "leaflet";
import Description from "../components/Description";
import dayjs from "dayjs";
import ItemCard from "../components/ItemCard";

const TripDetails = ({trips, airfields, activities, profile} : Data) => {
  const params = useParams();
  const trip = params.tripId ? trips.get(params.tripId) : undefined;
  if(trips.size == 0) return (<p>Chargement en cours</p>)

  if(!trip) return (<p>Activité/lieu inconnu</p>)
  
  
  const tripTypes = {short:'Vol de quelques heures', day:'Sortie à la journée', multi:'Voyage sur plusieurs jours'}
  const tripTags = {
    bike: "Vélo",
    hiking: "Marche à pied",
    culture: "Culture",
    aero: "Aéronautique",
    nautical: "Plage et nautisme",
    nature: "Nature et animaux",
    poi: "Vues aériennes",
    food: "Autre", // Not used for trips
    transit: "Autre", // Not used for trips
    lodging: "Autre", // Not used for trips
    car: "Autre", // Not used for trips
    other: "Autre"
  }
  const items = trip.steps
    .map(e => ({activities, airfields}[e.type].get(e.id) as Activity|Airfield))
    .filter(e => e != undefined)
  const markers = items
    .map( (e,i) => 'codeIcao' in e ? 
      <AirfieldMarker key={i} airfield={e as Airfield} /> : 
      <ActivityMarker key={i} activity={e as Activity} />
    );
  const linePositions = items.map( e => ({lat: e.position.latitude, lng: e.position.longitude}))
  
  const bounds = latLngBounds([])
  items.forEach(e => bounds.extend([e.position.latitude,e.position.longitude]))
  
  const uniqueItems = [...new Set(items)]
  
  const countAirfields = uniqueItems.filter(e => 'codeIcao' in e).length;
  const countActivities = uniqueItems.length - countAirfields;
  return (<>
    <Title><BackButton />{trip.name} {profile && profile.uid == trip.uid && <EditButton />}</Title>
    <Text>{tripTypes[trip.type]}</Text>

    <Grid grow mt="md" mb="md">
      <Grid.Col span={4}>
        <Paper
          shadow="md"
          radius="md"
          p='xs'
          withBorder
          bg="gray.0"
        >
          <Stack gap={"xs"}>
          <Text>Sortie {trip.date ? 'réalisée en ' + dayjs(trip.date.toMillis()).format('MMMM YYYY') : 'en projet'}</Text>
          <Title order={4}>Thèmes</Title>
          {trip.tags.map(tag => (<Text key={tag}>{tripTags[tag]}</Text>))}
          <Title order={4}>Durée</Title>
          <Text>{tripTypes[trip.type]}</Text>
          {countAirfields > 0 && (<Text>{countAirfields} terrains</Text>)}
          {countActivities > 0 && (<Text>{countActivities} activités</Text>)}
          
          {trip.updated_at && (
            <Text size="xs" c="dimmed" ta={"right"}>
              Sortie proposée par <Link to={`/profile/${trip.uid}`}>{trip.author}</Link>, mise à jour le {new Date(trip.updated_at.seconds * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </Text>
          )}
          </Stack>
        </Paper>
      </Grid.Col>
      
      <Grid.Col span={8}>
        <MapContainer style={{ height: "500px" }} bounds={bounds.pad(0.1)} scrollWheelZoom={true} >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          {markers}
          <Polyline positions={linePositions} />
        </MapContainer>
      </Grid.Col>
    </Grid>
  <Description content={trip.description} />
  <Flex mt='md' gap="xs" wrap="wrap" justify={{ sm: 'center' }}>
    { uniqueItems.map((item, id) => <ItemCard key={id} item={item} profile={profile} />) }
  </Flex>
    
  </>)
}

export default TripDetails