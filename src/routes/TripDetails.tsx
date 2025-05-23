import { Link, useParams } from "react-router-dom";
import { Activity, Airfield, Data } from "..";
import { Flex, Group, Stepper, Text, Title, rem } from "@mantine/core";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import { AirfieldMarker } from "../components/AirfieldUtils";
import ActivityMarker from '../components/ActivityMarker';
import { latLngBounds } from "leaflet";
import { IconBulb, IconDots, IconPlaneArrival } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import ActivityCard from "../components/ActivityCard";
import Description from "../components/Description";
import AirfieldCard from "../components/AirfieldCard";

const TripDetails = ({trips, airfields, activities, profile} : Data) => {
  const params = useParams();
  const [skip, setSkip] = useState(false)
  const trip = params.tripId ? trips.get(params.tripId) : undefined;
  useEffect(() => {
    if(trip && trip.steps.length > 6) setSkip(true)
  }, [trip])
  if(trips.size == 0) return (<p>Chargement en cours</p>)

  if(!trip) return (<p>Activité/lieu inconnu</p>)
  
  
  const tripTypes = {short:'Vol de quelques heures', day:'Sortie à la journée', multi:'Voyage sur plusieurs jours'}
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
  
  return (<>
    <Title><BackButton />Fiche {trip.name} {profile && profile.uid == trip.uid && <EditButton />}</Title>
    <Text>{tripTypes[trip.type]}</Text>

    <Group grow preventGrowOverflow={false} align="flex-start" mb="md">
      <Stepper
        active={-1}
        orientation="vertical"
        style={{minWidth: '325px', flex:'1 1 0'}}
        styles={{
          stepLabel: {lineHeight:'var(--stepper-icon-size)'}, 
          verticalSeparator: {borderLeftColor:"#ccc"},
        }}
      >
        {items.map((e,i) => {
          const type = 'codeIcao' in e ? 'airfields' : 'activities'
          if(skip && i == 2) return (
          <Stepper.Step
            key={i}
            label={<a className="clickable" onClick={() => setSkip(false)}>Voir toutes les étapes</a>}
            icon={<IconDots style={{ width: rem(18), height: rem(18) }} />}
            styles={i == 2 ? {verticalSeparator: {borderLeftStyle:"dashed"}} : {}}
          />)
          if(skip && i > 1 && i < items.length - 2) return 
          return (
            <Stepper.Step
              key={i}
              label={<Link to={`/${type}/${type === 'activities' ? (e as Activity).id : (e as Airfield).codeIcao}`}>{e.name}</Link>}
              icon={type == 'airfields' ? <IconPlaneArrival style={{ width: rem(18), height: rem(18) }} /> : <IconBulb style={{ width: rem(18), height: rem(18) }} />}
              styles={skip && i == 1 ? {verticalSeparator: {borderLeftStyle:"dashed"}} : {}}
            />)
        })}
      </Stepper>
      
       <div style={{minWidth: `min(400px,90vw)`, flex:'2 1 0'}}>
        <MapContainer style={{ height: "600px" }} bounds={bounds.pad(0.1)} scrollWheelZoom={true} >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers}
          <Polyline positions={linePositions} />
        </MapContainer>
        </div>
    </Group>
  <Description content={trip.description} />
  <Flex mt='md' gap="xs" wrap="wrap" justify={{ sm: 'center' }}>
    {[...new Set(items)].map((item, id) => 
      'codeIcao' in item ? 
      <AirfieldCard key={id} airfield={item as Airfield} profile={profile} /> :
      <ActivityCard key={id} activity={item as Activity} profile={profile} />
    )}
  </Flex>
    
  </>)
}

export default TripDetails