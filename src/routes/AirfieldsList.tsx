
import { Table, Text } from '@mantine/core';
import { getVacUrl } from '../data/airac';
import { ADfilter, Activity, Airfield } from '../types';
import { Link } from 'react-router-dom';
import List from '../components/TableList';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { filterAirfields } from '../utils';
import AirfieldsFilters from '../components/AirfieldsFilters';

function AirfieldsPage({airfields, activities, filters, setFilters} : 
  {airfields: Map<string,Airfield>, activities: Map<string,Activity>, filters: ADfilter, setFilters: Dispatch<SetStateAction<ADfilter>>}) {
  const [data, setData] = useState(airfields);

  useEffect(()=>{
    setData( filterAirfields(airfields, filters) )
  },[airfields, filters])

  return (<>
    <AirfieldsFilters airfields={airfields} activities={activities} filters={filters} setFilters={setFilters}/>
    <List
      data={data} 
      columns={['Nom du terrain','Code OACI','Piste','Actions']}
      empty={(<Text fw={500} ta="center">Aucun résultat</Text>)}
      row={([key, e]) => (
        <Table.Tr key={key}>
          <Table.Td><Link to={`/airfields/${e.codeIcao}`}>{e.name}</Link></Table.Td>
          <Table.Td><Link to={`/airfields/${e.codeIcao}`}>{e.codeIcao}</Link></Table.Td>
          <Table.Td>{Math.max(...e.runways.map(r => r.length))}m</Table.Td>
          <Table.Td>
            <a target='_blank' href={getVacUrl(e.codeIcao)}>Consulter</a>
            <Link to={`/map/${e.position.latitude}/${e.position.longitude}`}>Voir sur la carte</Link>
          </Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default AirfieldsPage