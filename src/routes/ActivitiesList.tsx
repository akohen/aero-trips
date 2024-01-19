
import { Table, Text, TextInput, rem } from '@mantine/core';
import { Activity } from '../types';
import { Link } from 'react-router-dom';
import List from '../components/TableList';
import { useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';


function ActivitiesList({activities} : {activities: Activity[]}) {
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

  function filterData(data: Activity[], search: string) {
    const query = search.toLowerCase().trim();
    return data.filter((item) =>
      ['name'].some((key) => item[key as 'name'].toLowerCase().includes(query.normalize("NFD").replace(/\p{Diacritic}/gu, "")))
    );
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
      row={(e) => (
        <Table.Tr key={e.name}>
          <Table.Td><Link to={`/activities/${e.name}`}>{e.name}</Link></Table.Td>
          <Table.Td>{e.type}</Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default ActivitiesList