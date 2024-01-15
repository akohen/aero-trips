import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import poi from '../data/poi.json'
import airfields from '../data/airfields.json'

function MapPage() {
  const markers = poi.map((e) => (
    <Marker position={e.position as [number, number]}>
      <Popup>{e.name}</Popup>
    </Marker>
  ));

  const airfieldsMarkers = Object.values(airfields).map( e => (
    <Marker position={e.position as [number, number]}>
      <Popup>{e.name}</Popup>
    </Marker>
  ));

  return (<div>
    foo
    <MapContainer style={{ height: "700px" }} center={[48.81, 2.06]} zoom={10} scrollWheelZoom={true} >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers}
      {airfieldsMarkers}
    </MapContainer>

  </div>
    
  )
}
  
export default MapPage