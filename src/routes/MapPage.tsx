import { LayerGroup, LayersControl, MapContainer, TileLayer } from 'react-leaflet'
import { ADfilter, ActivityFilter, Data } from '..';
import { filterActivities, filterAirfields } from '../utils';
import { AirfieldMarker } from '../components/AirfieldUtils';
import ActivityMarker from '../components/ActivityMarker';
import { Dispatch, SetStateAction } from 'react';
import { ActionIcon } from '@mantine/core';
import { IconFilterX } from '@tabler/icons-react';
import MapMenu from '../components/MapMenu';
import MapViewTracker from '../components/MapViewTracker';

function MapPage({airfields, activities, ADfilter, ActFilter, setADfilter, setActFilter, mapView, setMapView, profile} : 
  Data & {
    ADfilter: ADfilter, 
    ActFilter:ActivityFilter, 
    setADfilter: Dispatch<SetStateAction<ADfilter>>, 
    setActFilter:Dispatch<SetStateAction<ActivityFilter>>,
}) {

  const airfieldsMarkers = [...filterAirfields(airfields, activities, ADfilter, profile)].map( ([key,e]) => <AirfieldMarker key={key} airfield={e} />);

  const activitiesMarkers = [...filterActivities(airfields, activities, ActFilter)].map( ([key,e]) => <ActivityMarker key={key} activity={e} />);
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
    <MapContainer className="main-map" center={mapView.center} zoom={mapView.zoom} scrollWheelZoom={true} >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapMenu />
      <MapViewTracker setView={setMapView} />
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