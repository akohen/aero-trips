
import { Chip, Group, Table, Text, TextInput, rem } from '@mantine/core';
import { getVacUrl } from '../data/airac';
import { Airfield } from '../types';
import { Link } from 'react-router-dom';
import List from '../components/TableList';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { ADfilter } from '../App';
import { filterAirfields } from '../utils';

function AirfieldsPage({airfields, filters, setFilters} : {airfields: Map<string,Airfield>, filters: ADfilter, setFilters: Dispatch<SetStateAction<ADfilter>>}) {
  const [data, setData] = useState(airfields);

  useEffect(()=>{
    setData( filterAirfields(airfields, filters) )
  },[airfields, filters])

  return (<>
    <Chip.Group multiple={false} value={filters.status} onChange={(v) => setFilters({...filters, status: v})}>
      <Group justify="center">
        <Text>Statut</Text>
        <Chip value="1">Tous</Chip>
        <Chip value="2">Publics uniquement</Chip>
        <Chip value="3">Publics ou restreints</Chip>
      </Group>
    </Chip.Group>
    <TextInput
      placeholder="Chercher un terrain"
      leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
      value={filters.search}
      onChange={(e) => setFilters({...filters, search: e.currentTarget.value})}
      mt={'md'}
    />
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