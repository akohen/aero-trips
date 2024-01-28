import { IconGasStation } from "@tabler/icons-react";
import { Airfield } from "..";
import { Paper, Title, Text } from "@mantine/core";
import { Link } from "react-router-dom";
import { CommonIcon } from "./CommonIcon";
import { Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet';
import viteLogo from '/vite.svg'


export const AirfieldTitle = ({ad}: {ad: Airfield}) => {
  return (<><CommonIcon iconType={ad.status} /> {ad.name} {ad.fuels?.includes('100LL') ? <IconGasStation size={16} style={{verticalAlign:'middle'}} /> : undefined}</>)
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
  //airfield?.description.content.find( (a: { type: string }) => a.type =='image')
  return (
  <Marker 
    position={[airfield.position.latitude,airfield.position.longitude]}
    key={airfield.codeIcao}
    icon={new Icon({iconUrl: viteLogo, iconAnchor:[18,29]})}
    zIndexOffset={1000}
  >
    <Popup><Link to={`/airfields/${id}`}>{airfield.name}</Link></Popup>
  </Marker>
)}
