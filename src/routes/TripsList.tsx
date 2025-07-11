
import { Button, Group, TextInput, rem } from '@mantine/core';
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
      [key, item.name, item.author].some((x) => x?.toLowerCase().includes(query.normalize("NFD").replace(/\p{Diacritic}/gu, "")))
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
      data={data} defaultSortColumn={2} defaultSortDir={-1}
      columns={[
        {
          title:'Nom',
          row: (e) => <TripTitle trip={e} />,
          linkTo: (_,key) => `/trips/${key}`,
          sortFn: (a, b) => a.name.localeCompare(b.name),
        },
        {
          title:'Durée',
          row: (e) => <>{tripTypes[e.type]}</>,
          linkTo: (_,key) => `/trips/${key}`,
          sortFn: (a, b) => {
            const types = {short:0, day:1, multi:2};
            return (types[a.type] ?? 0) - (types[b.type] ?? 0);
          }
        },
        {
          title:'Date',
          row: (e) => <>{e.date ? dayjs(e.date.toMillis()).format('MMMM YYYY') : 'En projet'}</>,
          linkTo: (_,key) => `/trips/${key}`,
          sortFn: (a, b) => {
            if(!a.date && !b.date) return (a.updated_at?.toMillis() || 0) - (b.updated_at?.toMillis() || 0);
            if(!a.date) return -1;
            if(!b.date) return 1;
            return a.date.toMillis() - b.date.toMillis();
          }
        },
        {
          title:'Proposée par',
          row: (e) => <>{e.author ? e.author : 'Aero Trips'}</>,
          sortFn: (a, b) => a.author?.localeCompare(b.author ?? '') ?? 0,
        },
      ]}
    />
  </>)
}

export default TripsList