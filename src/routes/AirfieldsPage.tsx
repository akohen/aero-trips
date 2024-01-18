
import { Table, Pagination, Center, TextInput, rem, Text } from '@mantine/core';
import airac from '../data/airac';
import { useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { Airfield } from '../types';
import { Link } from 'react-router-dom';

function chunk<T>(array: T[], size: number): T[][] {
  if (!array.length) {
    return [];
  }
  const head = array.slice(0, size);
  const tail = array.slice(size);
  return [head, ...chunk(tail, size)];
}


function AirfieldsPage({airfields} : {airfields: Airfield[]}) {
  const [search, setSearch] = useState('');
  const [activePage, setPage] = useState(1);
  const [data, setData] = useState(chunk(airfields,20));

  useEffect(() => {
    setData( chunk(airfields,20))
  }, [airfields])
  

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setPage(1)
    setData( chunk(filterData(airfields, value),20) )
  };

  function filterData(data: Airfield[], search: string) {
    const query = search.toLowerCase().trim();
    return data.filter((item) =>
      ['codeIcao', 'name'].some((key) => item[key as 'codeIcao' | 'name'].toLowerCase().includes(query.normalize("NFD").replace(/\p{Diacritic}/gu, "")))
    );
  }

  const rows = data.length > 0 ? data[activePage-1].map(e => (
    <Table.Tr key={e.codeIcao}>
      <Table.Td><Link to={`/airfields/${e.codeIcao}`}>{e.name}</Link></Table.Td>
      <Table.Td><Link to={`/airfields/${e.codeIcao}`}>{e.codeIcao}</Link></Table.Td>
      <Table.Td>{Math.max(...e.runways.map(r => r.length))}m</Table.Td>
      <Table.Td>
        <a target='_blank' href={`https://www.sia.aviation-civile.gouv.fr/dvd/eAIP_${airac}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.${e.codeIcao}.pdf`}>
          Consulter
        </a>
      </Table.Td>
    </Table.Tr>
  )) : (
  <Table.Tr>
    <Table.Td colSpan={4}>
      <Text fw={500} ta="center">
        Aucun résultat
      </Text>
    </Table.Td>
  </Table.Tr>
  );
  
    return (<>
    <Table stickyHeader stickyHeaderOffset={60} highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Nom du terrain</Table.Th>
          <Table.Th>Code OACI</Table.Th>
          <Table.Th>Piste</Table.Th>
          <Table.Th>Carte VAC</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
    <Center>
    <TextInput
        placeholder="Chercher un terrain"
        leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
        value={search}
        onChange={handleSearchChange}
      />
      <Pagination total={data.length} value={activePage} onChange={setPage} />
    </Center>
    </>
    )
  }

export default AirfieldsPage