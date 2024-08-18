
import { Group, Table, Text } from '@mantine/core';
import { ADfilter, Airfield, Data } from '..';
import { useNavigate } from 'react-router-dom';
import List from '../components/TableList';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { filterAirfields } from '../utils';
import AirfieldsFilters from '../components/AirfieldsFilters';
import { AirfieldTitle } from '../components/AirfieldUtils';
import { ButtonVACMap, ButtonViewOnMap } from '../components/CommonButtons';

function AirfieldsPage({airfields, activities, filters, setFilters, setMapView} : 
  Data & {filters: ADfilter, setFilters: Dispatch<SetStateAction<ADfilter>>}) {
  const [data, setData] = useState(airfields);
  const navigate = useNavigate();
  const AdTd = (e: Airfield) => ({
    className:'clickable',
    onClick:() => navigate(`/airfields/${e.codeIcao}`)
  })

  useEffect(()=>{
    setData( filterAirfields(airfields, activities, filters) )
  },[airfields, activities, filters])

  return (<>
    <AirfieldsFilters airfields={airfields} activities={activities} filters={filters} setFilters={setFilters}/>
    <List
      data={data} 
      columns={['Nom du terrain','Code OACI','Piste','']}
      empty={(<Text fw={500} ta="center">Aucun résultat</Text>)}
      row={([key, e]) => (
        <Table.Tr key={key}>
          <Table.Td {...AdTd(e)}><AirfieldTitle ad={e}/></Table.Td>
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