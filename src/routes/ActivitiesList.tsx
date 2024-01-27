
import { Table, Text, TextInput, rem } from '@mantine/core';
import { Activity } from '..';
import { Link } from 'react-router-dom';
import List from '../components/TableList';
import { useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';


function ActivitiesList({activities} : {activities: Map<string,Activity>}) {
  const [search, setSearch] = useState('');
  const [data, setData] = useState(activities);

  useEffect(()=>{
    setData( activities )
  },[activities])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setData( filterData(activities, value) )
  };

  function filterData(data: Map<string,Activity>, search: string) {
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
          <Table.Td><Link to={`/activities/${key}`}>{e.name}</Link></Table.Td>
          <Table.Td>{e.type}</Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default ActivitiesList