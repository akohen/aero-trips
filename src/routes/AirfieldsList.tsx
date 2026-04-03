
import { em, Group, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ADfilter, Airfield, Data } from '..';
import TableList from '../components/TableList';
import CardList from '../components/CardList';
import { useEffect, useState } from 'react';
import { filterAirfields } from '../utils/utils';
import AirfieldsFilters from '../components/AirfieldsFilters';
import { AirfieldIcon, AirfieldTitle } from '../components/AirfieldUtils';
import { ButtonVACMap, ButtonViewOnMap } from '../components/CommonButtons';
import { getAirfieldImage, getImgNode } from '../utils/itemImages';
import type { CardColumn, CardConfig } from '../components/CardList';
import { IconRoad } from '@tabler/icons-react';

function AirfieldsPage({airfields, activities, events, filters, setFilters, setMapView, profile} :
  Data & {filters: ADfilter, setFilters: (newFilters: ADfilter) => void}) {
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`, undefined, { getInitialValueInEffect: false });
  const [data, setData] = useState(airfields);
  const [view, setView] = useState<'list' | 'cards'>(isMobile ? 'cards' : 'list');



  useEffect(()=>{
    setData( filterAirfields(airfields, activities, filters, profile, events) )
  },[airfields, activities, filters, profile, events])
  
  useEffect(() => {
    setFilters(filters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns: CardColumn<Airfield>[] = [
        {
          title: 'Nom du terrain',
          sortFn: (a: Airfield, b: Airfield) => a.name.localeCompare(b.name),
          row: (e) => (<AirfieldTitle ad={e} profile={profile} />),
          linkTo: (e) => `/airfields/${e.codeIcao}`,
        },
        {
          title:'Code OACI',
          sortFn: (a,b) => a.codeIcao.localeCompare(b.codeIcao),
          row: (e) => (<Text size='sm'>{e.codeIcao}</Text>),
          linkTo: (e) => `/airfields/${e.codeIcao}`,
        },
        {
          title:'Piste',
          sortFn: (a,b) => Math.max(...a.runways.map(r => r.length)) - Math.max(...b.runways.map(r => r.length)),
          row: (e) => (<Text size='sm'>{Math.max(...e.runways.map(r => r.length))}m</Text>),
          linkTo: (e) => `/airfields/${e.codeIcao}`,
        },
        {
          row: (e) => (
            <Group justify="flex-end">
              <ButtonVACMap airfield={e} compact />
              <ButtonViewOnMap item={e} setMapView={setMapView} compact />
            </Group>)
        },
  ]

  const cardConfig: CardConfig<Airfield> = {
    title: (e) => `${e.codeIcao} — ${e.name}`,
    icons: (e, _key, hasImage) => <AirfieldIcon airfield={e} profile={profile} color={hasImage ? 'white' : undefined} />,
    content: (e) => <Group gap='3px'><IconRoad /><Text size="xs">{Math.max(...e.runways.map(r => r.length))}m</Text></Group>,
    actions: (e) => (
      <Group gap="xs">
        <ButtonVACMap airfield={e} compact />
        <ButtonViewOnMap item={e} setMapView={setMapView} compact />
      </Group>
    ),
  }

  return (<>
    <AirfieldsFilters airfields={airfields} activities={activities} filters={filters} setFilters={setFilters} profile={profile}/>
    {(!isMobile && view === 'list')
      ? <TableList data={data} defaultSortColumn={1} columns={columns} onViewChange={() => setView('cards')} />
      : <CardList data={data} defaultSortColumn={1} columns={columns} cardConfig={cardConfig} getImage={(e) => getAirfieldImage(getImgNode(e.description), e.runways)} onViewChange={isMobile ? undefined : () => setView('list')} />
    }
  </>)
}

export default AirfieldsPage