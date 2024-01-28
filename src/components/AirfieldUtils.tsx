import { Airfield } from "..";
import { Paper, Title, Text, Stack } from "@mantine/core";
import { Link } from "react-router-dom";
import { CommonIcon } from "./CommonIcon";
import { Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet';
import viteLogo from '/vite.svg'


export const AirfieldTitle = ({ad}: {ad: Airfield}) => {
  return (<><CommonIcon iconType={ad.status} /> {ad.name} {ad.fuels?.map(e => <CommonIcon iconType={e} />)}</>)
}

export const NearbyAirfields = ({items} : {items: [distance: number, item: Airfield, id: string][]}) => (
  items.length > 0 && <Paper bg="gray.1">
    <Title order={4}>Terrains proches</Title>
    { items.map(([dist,ad]) => (
      <Text key={ad.codeIcao}>
        <Link to={`/airfields/${ad.codeIcao}`}>{Math.round(dist/1000)} km {ad.codeIcao} <AirfieldTitle ad={ad}/></Link>
      </Text>
    ))}
  </Paper>
  
)

export const AirfieldMarker = ({id, airfield}: {id:string, airfield:Airfield}) => {
  const imgNode = airfield.description?.content != undefined ? airfield.description.content.find( (a: { type: string }) => a.type =='image') : undefined
  return (
  <Marker 
    position={[airfield.position.latitude,airfield.position.longitude]}
    icon={new Icon({iconUrl: viteLogo, iconAnchor:[18,29]})}
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
