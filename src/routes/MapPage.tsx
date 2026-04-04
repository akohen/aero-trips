import { MapContainer, TileLayer } from 'react-leaflet'
import { ADfilter, ActivityFilter, Data } from '..';
import { filterActivities, filterAirfields } from '../utils/utils';
import { ActiveBadges, AirfieldMarker } from '../components/AirfieldUtils';
import ActivityMarker from '../components/ActivityMarker';
import { Button, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useEffect } from 'react';
import { IconPlaneArrival, IconEye, IconEyeOff, IconFilterX, IconBulb } from '@tabler/icons-react';
import MapMenu from '../components/MapMenu';
import MapViewTracker from '../components/MapViewTracker';
import { Link, useParams } from 'react-router-dom';
import ShareButton from '../components/ShareButton';
import AirfieldsFilterModal from '../components/AirfieldsFilterModal';
import ButtonFilter from '../components/ButtonFilter';
import ActivitiesFilterModal from '../components/ActivitiesFilterModal';
import { ActivityBadges } from '../components/ActivityUtils';

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
  
  const [showAirfields, { toggle: toggleAirfields }] = useDisclosure(true)
  const [showActivities, { toggle: toggleActivities }] = useDisclosure(true)
  const [modalOpened, { open, close }] = useDisclosure(false)
  const [modalActOpened, { open: openAct, close: closeAct }] = useDisclosure(false)
  const isFilterActive = () => [...Object.values(ADfilter), ...Object.values(ActFilter)].some(x => Array.isArray(x) ? x.length: x)
  const view = params.lat && params.lng ? {
    center: [parseFloat(params.lat), parseFloat(params.lng)],
    zoom: 12,
  } : mapView;

  const filteredAirfields = filterAirfields(airfields, activities, ADfilter, profile, events)
  const airfieldsMarkers = [...filteredAirfields].map( ([key,e]) => <AirfieldMarker key={key} airfield={e} />);
  const activeAdFilters = ActiveBadges({ airfields, activities, filters:ADfilter, setFilters:setADfilter })
    .length + Number( ADfilter.search !== '') 
  const resetAdFilters = () => setADfilter({
      search:'',
      services: [],
      ad: [],
      runway: '',
      distance: '',
      target: null,
    })

  const filteredActivities = filterActivities(airfields, activities, ActFilter)
  const activitiesMarkers = [...filteredActivities].map( ([key,e]) => <ActivityMarker key={key} activity={e} />);
  const activeActFilters = ActivityBadges({ airfields, activities, filters:ActFilter, setFilters: setActFilter})
    .length + Number( ActFilter.search !== '')
  const resetActFilters = () => setActFilter({
      search:'',
      distance: '',
      target: null,
      type: [],
    })
  
  const resetFilters = () => {
    resetAdFilters()
    resetActFilters()
  }
  
  return (
    <MapContainer className="main-map" center={view.center} zoom={view.zoom} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapMenu />
      <MapViewTracker setView={setMapView} />
      <Stack className='map-top-right' gap="xs" align='flex-end'>
        <Button.Group>
          <Button 
            variant='default'
            component={Link}
            to="/airfields"
          >
            <IconPlaneArrival size={16} />
          </Button>
          <ButtonFilter onClick={open} activeCount={activeAdFilters} iconOnly />
          <Button
            variant='default'
            aria-label="Supprimer les filtres sur les terrains"
            onClick={resetAdFilters}
            display={activeAdFilters == 0 ? 'none' : undefined}
          >
            <IconFilterX size={16} />
          </Button>
          <Button
            variant='default'
            aria-label="Afficher/masquer les terrains"
            onClick={toggleAirfields}
          >
            {showAirfields ? <IconEye size={16} /> : <IconEyeOff size={16} />}
          </Button>
        </Button.Group>


        <Button.Group>
          <Button 
            variant='default'
            component={Link}
            to="/activities"
          >
            <IconBulb size={16} />
          </Button>
          <ButtonFilter onClick={openAct} activeCount={activeActFilters} iconOnly />
          <Button
            variant='default'
            aria-label="Supprimer les filtres sur les terrains"
            onClick={resetActFilters}
            display={activeActFilters == 0 ? 'none' : undefined}
          >
            <IconFilterX size={16} />
          </Button>
          <Button
            variant='default'
            aria-label="Afficher/masquer les terrains"
            onClick={toggleActivities}
          >
            {showActivities ? <IconEye size={16} /> : <IconEyeOff size={16} />}
          </Button>
        </Button.Group>

        
        {isFilterActive() && (
          <Button.Group>
            <ShareButton iconOnly />
            <Button
              variant='default'
              aria-label="Supprimer les filtres"
              onClick={resetFilters}
            >
              <IconFilterX size={16} />
            </Button>
          </Button.Group>
        )}
      </Stack>
      {showAirfields && airfieldsMarkers}
      {showActivities && activitiesMarkers}
      
      <AirfieldsFilterModal
        opened={modalOpened}
        onClose={close}
        airfields={airfields}
        activities={activities}
        profile={profile}
        filters={ADfilter}
        setFilters={setADfilter}
        data={filteredAirfields}
      />
      <ActivitiesFilterModal
        opened={modalActOpened}
        onClose={closeAct}
        airfields={airfields}
        activities={activities}
        filters={ActFilter}
        setFilters={setActFilter}
        data={filteredActivities}
      />
    </MapContainer>
  )
}

export default MapPage