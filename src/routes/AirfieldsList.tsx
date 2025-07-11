
import { Group, Text } from '@mantine/core';
import { ADfilter, Airfield, Data } from '..';
import List from '../components/TableList';
import { useEffect, useState } from 'react';
import { filterAirfields } from '../utils';
import AirfieldsFilters from '../components/AirfieldsFilters';
import { AirfieldTitle } from '../components/AirfieldUtils';
import { ButtonVACMap, ButtonViewOnMap } from '../components/CommonButtons';

function AirfieldsPage({airfields, activities, filters, setFilters, setMapView, profile} : 
  Data & {filters: ADfilter, setFilters: (newFilters: ADfilter) => void}) {
  const [data, setData] = useState(airfields);

  useEffect(()=>{
    setData( filterAirfields(airfields, activities, filters, profile) )
  },[airfields, activities, filters, profile])
  
  useEffect(() => {
    setFilters(filters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (<>
    <AirfieldsFilters airfields={airfields} activities={activities} filters={filters} setFilters={setFilters} profile={profile}/>
    <List
      data={data}
      defaultSortColumn={1}
      columns={[
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
      ]}
    />
  </>)
}

export default AirfieldsPage