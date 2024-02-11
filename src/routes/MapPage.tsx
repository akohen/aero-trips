import { LayerGroup, LayersControl, MapContainer, TileLayer } from 'react-leaflet'
import { Activity, Airfield, ADfilter, ActivityFilter } from '..';
import { useParams } from 'react-router-dom';
import { LatLngExpression } from 'leaflet';
import { filterActivities, filterAirfields } from '../utils';
import { AirfieldMarker } from '../components/AirfieldUtils';
import { ActivityMarker } from '../components/ActivityUtils';
import { Dispatch, SetStateAction } from 'react';
import { ActionIcon } from '@mantine/core';
import { IconFilterX } from '@tabler/icons-react';
import MapMenu from '../components/MapMenu';

function MapPage({airfields, activities, ADfilter, ActFilter, setADfilter, setActFilter} : 
  {airfields: Map<string,Airfield>, activities: Map<string,Activity>, ADfilter: ADfilter, ActFilter:ActivityFilter, setADfilter: Dispatch<SetStateAction<ADfilter>>, setActFilter:Dispatch<SetStateAction<ActivityFilter>>}) {
  const params = useParams();
  const center: LatLngExpression = (params.lat && params.lng) ? [parseFloat(params.lat), parseFloat(params.lng)] : [48.81,2.06]
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
    <MapContainer style={{ height: "700px" }} center={center} zoom={10} scrollWheelZoom={true} >
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