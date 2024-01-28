import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Activity, Airfield, ADfilter } from '..';
import { Link, useParams } from 'react-router-dom';
import { Icon, LatLngExpression } from 'leaflet';
import viteLogo from '/vite.svg'
import { filterAirfields } from '../utils';

function MapPage({airfields, activities, ADfilter} : {airfields: Map<string,Airfield>, activities: Map<string,Activity>, ADfilter: ADfilter}) {
  const params = useParams();
  const center: LatLngExpression = (params.lat && params.lng) ? [parseFloat(params.lat), parseFloat(params.lng)] : [48.81,2.06]
  const airfieldsMarkers = [...filterAirfields(airfields, activities, ADfilter)].map( ([key,e]) => (
    <Marker 
      position={[e.position.latitude,e.position.longitude]}
      key={e.codeIcao}
      icon={new Icon({iconUrl: viteLogo, iconAnchor:[18,29]})}
      zIndexOffset={1000}
    >
      <Popup><Link to={`/airfields/${key}`}>{e.name}</Link></Popup>
    </Marker>
  ));

  const activitiesMarkers = [...activities].map( ([key,e]) => (
    <Marker position={[e.position.latitude,e.position.longitude]} key={e.name}>
      <Popup><Link to={`/activities/${key}`}>{e.name}</Link></Popup>
    </Marker>
  ));

  return (<div>
    <MapContainer style={{ height: "700px" }} center={center} zoom={10} scrollWheelZoom={true} >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {airfieldsMarkers}
      {activitiesMarkers}
    </MapContainer>

  </div>
    
  )
}


export default MapPage