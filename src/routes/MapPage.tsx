import { MapContainer, TileLayer } from 'react-leaflet'
import { Activity, Airfield, ADfilter } from '..';
import { useParams } from 'react-router-dom';
import { LatLngExpression } from 'leaflet';
import { filterAirfields } from '../utils';
import { AirfieldMarker } from '../components/AirfieldUtils';
import { ActivityMarker } from '../components/ActivityUtils';

function MapPage({airfields, activities, ADfilter} : {airfields: Map<string,Airfield>, activities: Map<string,Activity>, ADfilter: ADfilter}) {
  const params = useParams();
  const center: LatLngExpression = (params.lat && params.lng) ? [parseFloat(params.lat), parseFloat(params.lng)] : [48.81,2.06]
  const airfieldsMarkers = [...filterAirfields(airfields, activities, ADfilter)].map( ([key,e]) => <AirfieldMarker key={key} id={key} airfield={e} />);

  const activitiesMarkers = [...activities].map( ([key,e]) => <ActivityMarker key={key} id={key} activity={e} />);

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