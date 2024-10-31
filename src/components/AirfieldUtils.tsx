import { Airfield, Profile } from "..";
import { Paper, Title, Text, Stack, Grid } from "@mantine/core";
import { Link } from "react-router-dom";
import { CommonIcon } from "./CommonIcon";
import { Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet';
import pinRunway from '/map-pin-runway.svg'


export const AirfieldTitle = ({ad, profile}: {ad: Airfield, profile?: Profile}) => {
  return (<>
    <CommonIcon iconType={ad.status} /> 
    {ad.name} 
    {ad.fuels?.map(e => <CommonIcon key={e} iconType={e} />)}
    {profile && profile.visited?.find(v => v.type == 'airfields' && v.id == ad.codeIcao) && <CommonIcon iconType="visited" />}
    {profile && profile.favorites?.find(v => v.type == 'airfields' && v.id == ad.codeIcao) && <CommonIcon iconType="favorite" />}
  </>)
}

export const NearbyAirfields = ({items} : {items: [distance: number, item: Airfield, id: string][]}) => {
  if(items.length == 0) return
  return (
    <Grid.Col span={3}>
    <Paper 
      shadow="md"
      radius="md"
      p='xs'
      withBorder
      bg="gray.0"
      className="nearby"
    >
    <Title order={4}>Terrains proches</Title>
    { items.map(([dist,ad]) => (
      <Text size="sm" key={ad.codeIcao}>
        <Link to={`/airfields/${ad.codeIcao}`}>{Math.round(dist/1000)} km {ad.codeIcao} <AirfieldTitle ad={ad}/></Link>
      </Text>
    ))}
  </Paper></Grid.Col>
)}

export const ToiletText = ({airfield}:{airfield: Airfield}) => {
  if(airfield.toilet == 'private') return <Text>Toilettes privées</Text>
  if(airfield.toilet == 'public') return <Text>Toilettes publiques</Text>
}

export const AirfieldMarker = ({id, airfield}: {id:string, airfield:Airfield}) => {
  const imgNode = airfield.description?.content != undefined ? airfield.description.content.find( (a: { type: string }) => a.type =='image') : undefined
  return (
  <Marker 
    position={[airfield.position.latitude,airfield.position.longitude]}
    icon={new Icon({iconUrl: pinRunway, iconAnchor:[25,49], iconSize:[50,50]})}
    zIndexOffset={1000}
  >
    <Popup>
      <Link to={`/airfields/${id}`}>
        <Stack align="center" gap={"xs"}>
          <div><AirfieldTitle ad={airfield}/></div>      
          {imgNode != undefined && <img src={imgNode.attrs.src} width="150px" />}
          <span>Voir plus de détails...</span>
        </Stack>
      </Link>
    </Popup>
  </Marker>
)}
