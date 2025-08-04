import { Airfield, Profile } from "..";
import { Text, Stack } from "@mantine/core";
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

export const ToiletText = ({airfield}:{airfield: Airfield}) => {
  if(airfield.toilet == 'private') return <Text>Toilettes privées</Text>
  if(airfield.toilet == 'public') return <Text>Toilettes publiques</Text>
}

export const AirfieldMarker = ({airfield}: {airfield:Airfield}) => {
  const imgNode = airfield.description?.content != undefined ? airfield.description.content.find( (a: { type: string }) => a.type =='image') : undefined
  return (
  <Marker 
    position={[airfield.position.latitude,airfield.position.longitude]}
    icon={new Icon({iconUrl: pinRunway, iconAnchor:[25,49], iconSize:[50,50]})}
    zIndexOffset={1000}
  >
    <Popup>
      <Link to={`/airfields/${airfield.codeIcao}`}>
        <Stack align="center" gap={"xs"}>
          <div><AirfieldTitle ad={airfield}/></div>      
          {imgNode != undefined && <img src={imgNode.attrs.src} width="150px" />}
          <span>Voir plus de détails...</span>
        </Stack>
      </Link>
    </Popup>
  </Marker>
)}
