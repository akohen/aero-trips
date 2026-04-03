import { LayerGroup, LayersControl, MapContainer, TileLayer } from 'react-leaflet'
import { ADfilter, ActivityFilter, Data } from '..';
import { filterActivities, filterAirfields } from '../utils/utils';
import { AirfieldMarker } from '../components/AirfieldUtils';
import ActivityMarker from '../components/ActivityMarker';
import { Button, Group } from '@mantine/core';
import { useEffect } from 'react';
import { IconFilterX } from '@tabler/icons-react';
import MapMenu from '../components/MapMenu';
import MapViewTracker from '../components/MapViewTracker';
import { useParams } from 'react-router-dom';
import ShareButton from '../components/ShareButton';

function MapPage({airfields, activities, events, ADfilter, ActFilter, setADfilter, setActFilter, mapView, setMapView, profile} :
  Data & {
    ADfilter: ADfilter,
    ActFilter:ActivityFilter,
    setADfilter: (f: ADfilter) => void,
    setActFilter: (f: ActivityFilter) => void,
}) {
  const params = useParams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setADfilter(ADfilter); setActFilter(ActFilter) }, [])
  const airfieldsMarkers = [...filterAirfields(airfields, activities, ADfilter, profile, events)].map( ([key,e]) => <AirfieldMarker key={key} airfield={e} />);

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
  const view = params.lat && params.lng ? {
    center: [parseFloat(params.lat), parseFloat(params.lng)],
    zoom: 12,
  } : mapView;

  return (
    <MapContainer className="main-map" center={view.center} zoom={view.zoom} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapMenu />
      <MapViewTracker setView={setMapView} />
      {isFilterActive() && (
        <Group className='map-top-right' gap="xs" wrap="nowrap">
          <ShareButton iconOnly />
          <Button
            variant='default'
            aria-label="Supprimer les filtres"
            onClick={resetFilters}
          >
            <IconFilterX size={16} />
          </Button>
        </Group>
      )}
      
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