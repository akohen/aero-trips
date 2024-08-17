import { LayerGroup, LayersControl, MapContainer, TileLayer } from 'react-leaflet'
import { ADfilter, ActivityFilter, Data } from '..';
import { useParams } from 'react-router-dom';
import { LatLngExpression } from 'leaflet';
import { filterActivities, filterAirfields } from '../utils';
import { AirfieldMarker } from '../components/AirfieldUtils';
import ActivityMarker from '../components/ActivityMarker';
import { Dispatch, SetStateAction } from 'react';
import { ActionIcon } from '@mantine/core';
import { IconFilterX } from '@tabler/icons-react';
import MapMenu from '../components/MapMenu';

function MapPage({airfields, activities, profile, ADfilter, ActFilter, setADfilter, setActFilter} : 
  Data & {ADfilter: ADfilter, ActFilter:ActivityFilter, setADfilter: Dispatch<SetStateAction<ADfilter>>, setActFilter:Dispatch<SetStateAction<ActivityFilter>>}) {
  const params = useParams();
  const defaultCenter: LatLngExpression = (profile?.homebase && airfields.has(profile.homebase)) ? 
    [airfields.get(profile.homebase)!.position.latitude, airfields.get(profile.homebase)!.position.longitude] : 
    [49,2]
  const center: LatLngExpression = (params.lat && params.lng) ? [parseFloat(params.lat), parseFloat(params.lng)] : defaultCenter
  const airfieldsMarkers = [...filterAirfields(airfields, activities, ADfilter)].map( ([key,e]) => <AirfieldMarker key={key} id={key} airfield={e} />);

  const activitiesMarkers = [...filterActivities(airfields, activities, ActFilter)].map( ([key,e]) => <ActivityMarker key={key} id={key} activity={e} />);
  const resetFilters = () => {
    setActFilter({
      search:'',
      distance: '',
      target: null,
      type: [],
    })
    setADfilter({
      search:'',
      services: [],
      ad: [],
      runway: '',
      distance: '',
      target: null,
    })
  }
  const isFilterActive = () => [...Object.values(ADfilter), ...Object.values(ActFilter)].some(x => Array.isArray(x) ? x.length: x)

  return (
    <MapContainer className="main-map" center={center} zoom={12} scrollWheelZoom={true} >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapMenu />
      {isFilterActive() && <ActionIcon
        variant='default'
        aria-label="Supprimer les filtres"
        className='map-top-right'
        onClick={resetFilters}
      >
        <IconFilterX stroke={1.5} />
      </ActionIcon>}
      
      <LayersControl position="topleft">
        <LayersControl.Overlay checked name="Terrains">
          <LayerGroup>
            {airfieldsMarkers}
          </LayerGroup>
        </LayersControl.Overlay>
        <LayersControl.Overlay checked name="Activités">
          <LayerGroup>
            {activitiesMarkers}
          </LayerGroup>
        </LayersControl.Overlay>
      </LayersControl>
    </MapContainer>    
  )
}


export default MapPage