
import { Table, Text, TextInput, rem } from '@mantine/core';
import airac from '../data/airac';
import { Airfield } from '../types';
import { Link } from 'react-router-dom';
import List from '../components/TableList';
import { useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';


function AirfieldsPage({airfields} : {airfields: Map<string,Airfield>}) {
  const [search, setSearch] = useState('');
  const [data, setData] = useState(airfields);

  useEffect(()=>{
    setData( airfields )
  },[airfields])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setData( filterData(airfields, value) )
  };

  function filterData(data: Map<string,Airfield>, search: string) {
    const query = search.toLowerCase().trim();
    return new Map([...data].filter(([key, item]) => 
      [item.description, item.codeIcao, item.name, key].some((x) => x?.toLowerCase().includes(query.normalize("NFD").replace(/\p{Diacritic}/gu, "")))
    ))
  }
  
  return (<>
    <TextInput
      placeholder="Chercher un terrain"
      leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
      value={search}
      onChange={handleSearchChange}
    />
    <List
      data={data} 
      columns={['Nom du terrain','Code OACI','Piste','Carte VAC']}
      empty={(<Text fw={500} ta="center">Aucun résultat</Text>)}
      row={([key, e]) => (
        <Table.Tr key={key}>
          <Table.Td><Link to={`/airfields/${e.codeIcao}`}>{e.name}</Link></Table.Td>
          <Table.Td><Link to={`/airfields/${e.codeIcao}`}>{e.codeIcao}</Link></Table.Td>
          <Table.Td>{Math.max(...e.runways.map(r => r.length))}m</Table.Td>
          <Table.Td>
            <a target='_blank' href={`https://www.sia.aviation-civile.gouv.fr/dvd/eAIP_${airac}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.${e.codeIcao}.pdf`}>
              Consulter
            </a>
          </Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default AirfieldsPage