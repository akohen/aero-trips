import { Link, useParams } from "react-router-dom";
import { Activity, Airfield, Data } from "..";
import { Group, Paper, Stepper, Text, Title, rem } from "@mantine/core";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";
import { generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit"
import {default as TiptapLink} from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { MapContainer, TileLayer } from "react-leaflet";
import { AirfieldMarker } from "../components/AirfieldUtils";
import { ActivityMarker } from "../components/ActivityUtils";
import { latLngBounds } from "leaflet";
import { IconBulb, IconPlaneArrival } from "@tabler/icons-react";

const TripDetails = ({trips, airfields, activities} : Data) => {
  const params = useParams();
  if(trips.size == 0) return (<p>Chargement en cours</p>)
  const trip = params.tripId ? trips.get(params.tripId) : undefined;

  if(!trip) return (<p>Activité/lieu inconnu</p>)

  const tripTypes = {short:'Vol de quelques heures', day:'Sortie à la journée', multi:'Voyage sur plusieurs jours'}
  const items = trip.steps
    .map(e => ([{activities, airfields}[e.type].get(e.id), e.id, e.type] as [Activity|Airfield, string, string]))
    .filter(([, e]) => e != undefined)
  const markers = items
    .map( ([e, key, type]) => type == 'airfields' ? 
      <AirfieldMarker key={key} id={key} airfield={e as Airfield} /> : 
      <ActivityMarker key={key} id={key} activity={e as Activity} />
    );
  
  const bounds = latLngBounds([])
  items.forEach(([e]) => bounds.extend([e.position.latitude,e.position.longitude]))
  
  return (<>
    <Title><BackButton />Fiche {trip.name} <EditButton /></Title>
    <Text>{tripTypes[trip.type]}</Text>

    <Group grow preventGrowOverflow={false}>
      <Stepper
        active={-1}
        orientation="vertical"
        style={{minWidth: '325px', flex:'1 1 0'}}
        styles={{ stepLabel: {lineHeight:'var(--stepper-icon-size)'}}}
      >
        {items.map(([e, id, type],i) =>(
        <Stepper.Step
          key={i}
          label={<Link to={`/${type}/${id}`}>{e.name}</Link>}
          icon={type == 'airfields' ? <IconPlaneArrival style={{ width: rem(18), height: rem(18) }} /> : <IconBulb style={{ width: rem(18), height: rem(18) }} />}
        />))}
      </Stepper>
       <div style={{minWidth: `min(400px,90vw)`, flex:'2 1 0'}}>
        <MapContainer style={{ height: "500px" }} bounds={bounds.pad(0.1)} scrollWheelZoom={true} >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers}
        </MapContainer>
        </div>
    </Group>

    {trip.description != undefined && <Paper 
    bg="gray.1" mt={"md"}
    className="tiptap-content"
    dangerouslySetInnerHTML={{__html: generateHTML(trip.description,[StarterKit, TiptapLink, Image])}} 
  />}
    
  </>)
}

export default TripDetails