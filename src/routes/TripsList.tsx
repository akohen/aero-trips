
import { Table, Text, TextInput, rem } from '@mantine/core';
import { Trip } from '..';
import { useNavigate } from 'react-router-dom';
import List from '../components/TableList';
import { useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';


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
    <TextInput
      placeholder="Chercher une activité"
      leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
      value={search}
      onChange={handleSearchChange}
    />
    <List
      data={data} 
      columns={['Nom','Type']}
      empty={(<Text fw={500} ta="center">Aucun résultat</Text>)}
      row={([key, e]) => (
        <Table.Tr key={key}>
          <Table.Td {...TripTd(key)}>{e.name}</Table.Td>
          <Table.Td>{tripTypes[e.type]}</Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default TripsList