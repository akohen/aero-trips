import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { DataContext } from '../DataProvider';
import { Airfield } from '../types';

function Map({airfields} : {airfields: Airfield[]}) {
  const airfieldsMarkers = airfields.map( e => (
    <Marker position={[e.position.latitude,e.position.longitude]} key={e.codeIcao}>
      <Popup>{e.name}</Popup>
    </Marker>
  ));

  return (<div>
    <MapContainer style={{ height: "700px" }} center={[48.81, 2.06]} zoom={10} scrollWheelZoom={true} >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {airfieldsMarkers}
    </MapContainer>

  </div>
    
  )
}


const MapPage = () => (
  <DataContext.Consumer>
    {data => <Map airfields={data.airfields} />}
  </DataContext.Consumer>
)
export default MapPage