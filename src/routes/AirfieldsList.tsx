
import { Group, Table } from '@mantine/core';
import { ADfilter, Airfield, Data } from '..';
import { useNavigate } from 'react-router-dom';
import List from '../components/TableList';
import { useEffect, useState } from 'react';
import { filterAirfields } from '../utils';
import AirfieldsFilters from '../components/AirfieldsFilters';
import { AirfieldTitle } from '../components/AirfieldUtils';
import { ButtonVACMap, ButtonViewOnMap } from '../components/CommonButtons';

function AirfieldsPage({airfields, activities, filters, setFilters, setMapView, profile} : 
  Data & {filters: ADfilter, setFilters: (newFilters: ADfilter) => void}) {
  const [data, setData] = useState(airfields);
  const navigate = useNavigate();
  const AdTd = (e: Airfield) => ({
    className:'clickable',
    onClick:() => navigate(`/airfields/${e.codeIcao}`)
  })

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
      columns={[
        ['Nom du terrain', (a,b) => a.name.localeCompare(b.name)],
        ['Code OACI', (a,b) => a.codeIcao.localeCompare(b.codeIcao)],
        ['Piste',(a,b) => Math.max(...a.runways.map(r => r.length)) - Math.max(...b.runways.map(r => r.length))],
        ''
      ]}
      row={([key, e]) => (
        <Table.Tr key={key}>
          <Table.Td {...AdTd(e)}><AirfieldTitle ad={e} profile={profile} /></Table.Td>
          <Table.Td {...AdTd(e)}>{e.codeIcao}</Table.Td>
          <Table.Td {...AdTd(e)}>{Math.max(...e.runways.map(r => r.length))}m</Table.Td>
          <Table.Td ><Group justify="flex-end">
            <ButtonVACMap airfield={e} compact />
            <ButtonViewOnMap item={e} setMapView={setMapView} compact />
            </Group>
          </Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default AirfieldsPage