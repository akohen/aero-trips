import { Paper, Stack, Text, Title } from "@mantine/core";
import { Activity, Trip } from "..";
import { Link } from "react-router-dom";
import { CommonIcon } from "./CommonIcon";
import { Marker, Popup } from "react-leaflet";
import { Icon } from 'leaflet';
import pinActivity from '/map-pin-activity.svg'

export const ActivityTitle = ({activity}: {activity: Activity}) => (
<Text span size="sm" className="list-item-title">
  {activity.name}
  {activity.type.map((e,i) => <CommonIcon iconType={e} key={i} /> )}
</Text>)

export const NearbyActivities = ({items} : {items: [distance: number, item: Activity, id: string][]}) => (
  items.length > 0 && <Paper bg="gray.1" className="nearby">
    <Title order={4}>Activités proches</Title>
    { items.map(([dist, activity, id]) => (
        <Text key={id}>
          <Link to={`/activities/${id}`}>
            <ActivityTitle activity={activity} /><Text span size="sm"> à {dist > 2500 ? `${Math.round(dist/1000)}km` : `${Math.round(dist/100)*100}m`}</Text>
          </Link>
        </Text>
    ))}
  </Paper>
)

export const NearbyTrips = ({itemId, type, trips} : {itemId: string, type:'activities'|'airfields', trips: Map<string, Trip>}) => {
  const items = [...trips].filter(([,trip]) => trip.steps.some(step => step.type == type && step.id == itemId)).slice(0,8)
  return (
  items.length > 0 && <Paper bg="gray.1" className="nearby">
    <Title order={4}>Sorties</Title>
    { items.map(([id, trip]) => (
        <Text key={id}>
          <Link to={`/trips/${id}`}>
            <Text span size="sm">{trip.name}</Text>
          </Link>
        </Text>
    ))}
  </Paper>
)}

export const ActivityMarker = ({id, activity}: {id:string, activity:Activity}) => {
  const imgNode = activity.description?.content != undefined ? activity.description.content.find( (a: { type: string }) => a.type =='image') : undefined
  return (
  <Marker
    position={[activity.position.latitude,activity.position.longitude]}
    icon={new Icon({iconUrl: pinActivity, iconAnchor:[25,49], iconSize:[50,50]})}
  >
    <Popup>
      <Link to={`/activities/${id}`}>
        <Stack align="center" gap={"xs"}>
          <div><ActivityTitle activity={activity}/></div>      
          {imgNode != undefined && <img src={imgNode.attrs.src} width="150px" />}
          <span>Voir plus de détails...</span>
        </Stack>
      </Link>
    </Popup>
  </Marker>
)}