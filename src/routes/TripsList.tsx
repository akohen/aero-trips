
import { Button, Group, Table, Text, TextInput, rem } from '@mantine/core';
import { Trip } from '..';
import { useNavigate } from 'react-router-dom';
import List from '../components/TableList';
import { useEffect, useState } from 'react';
import { IconCirclePlus, IconSearch } from '@tabler/icons-react';
import { TripTitle } from '../components/TripsUtils';
import dayjs from 'dayjs';


function TripsList({trips} : {trips: Map<string,Trip>}) {
  const [search, setSearch] = useState('');
  const [data, setData] = useState(trips);
  const navigate = useNavigate();
  const TripTd = (id: string) => ({
    className:'clickable',
    onClick:() => navigate(`/trips/${id}`)
  })
  const tripTypes = {short:'Quelques heures', day:'A la journée', multi:'Sur plusieurs jours'}

  useEffect(()=>{
    setData( trips )
  },[trips])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setData( filterData(trips, value) )
  };

  function filterData(data: Map<string,Trip>, search: string) {
    const query = search.toLowerCase().trim();
    return new Map([...data].filter(([key, item]) => 
      [key, item.name, item.description].some((x) => x?.toLowerCase().includes(query.normalize("NFD").replace(/\p{Diacritic}/gu, "")))
    ))
  }
  
  return (<>
    <Group justify="space-between"  mt={'md'}>
      <TextInput
        placeholder="Chercher une sortie / voyage"
        leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
        value={search}
        onChange={handleSearchChange}
        style={{flexGrow:2}}
        />
      <Button
        onClick={() => navigate(`/trips/edit`)}
        leftSection={<IconCirclePlus size={14} />}
        >
        Proposer une nouvelle sortie
      </Button>
    </Group>
    <List
      data={data} 
      columns={['Nom','Durée', 'Date', 'Proposée par']}
      empty={(<Text fw={500} ta="center">Aucun résultat</Text>)}
      row={([key, e]) => (
        <Table.Tr key={key}>
          <Table.Td {...TripTd(key)}>{<TripTitle trip={e} />}</Table.Td>
          <Table.Td {...TripTd(key)}>{tripTypes[e.type]}</Table.Td>
          <Table.Td {...TripTd(key)}>{e.date ? dayjs(e.date.toMillis()).format('MMMM YYYY') : 'En projet'}</Table.Td>
          <Table.Td>{e.author ? e.author : 'Aero Trips'}</Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default TripsList