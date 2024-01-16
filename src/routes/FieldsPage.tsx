
import { Table, Pagination, Center, TextInput, rem, Text } from '@mantine/core';
import airfields from '../data/airfields.json'
import airac from '../data/airac';
import { useState } from 'react';
import { IconSearch } from '@tabler/icons-react';

function chunk<T>(array: T[], size: number): T[][] {
  if (!array.length) {
    return [];
  }
  const head = array.slice(0, size);
  const tail = array.slice(size);
  return [head, ...chunk(tail, size)];
}

const data = Object.values(airfields);
let chunkedData = chunk(data, 20);

function FieldsPage() {
  const [search, setSearch] = useState('');
  const [activePage, setPage] = useState(1);
  

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    chunkedData = chunk(filterData(data, value),20);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function filterData(data: any[], search: string) {
    const query = search.toLowerCase().trim();
    return data.filter((item) =>
      ['codeIcao', 'name'].some((key) => item[key].toLowerCase().includes(query.normalize("NFD").replace(/\p{Diacritic}/gu, "")))
    );
  }

  const rows = chunkedData.length > 0 ? chunkedData[activePage-1].map(e => (
    <Table.Tr key={e.codeIcao}>
      <Table.Td>{e.name}</Table.Td>
      <Table.Td>{e.codeIcao}</Table.Td>
      <Table.Td>
        <a target='_blank' href={`https://www.sia.aviation-civile.gouv.fr/dvd/eAIP_${airac}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.${e.codeIcao}.pdf`}>
          Consulter
        </a>
      </Table.Td>
    </Table.Tr>
  )) : [];
  
    return (<>
    <Table stickyHeader stickyHeaderOffset={60} highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Nom du terrain</Table.Th>
          <Table.Th>Code OACI</Table.Th>
          <Table.Th>Carte VAC</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={Object.keys(data[0]).length}>
                <Text fw={500} ta="center">
                  Aucun résultat
                </Text>
              </Table.Td>
            </Table.Tr>
          )}</Table.Tbody>
    </Table>
    <Center>
    <TextInput
        placeholder="Chercher un terrain"
        leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
        value={search}
        onChange={handleSearchChange}
      />
      <Pagination className="paginationtest" total={data.length} value={activePage} onChange={setPage} />
    </Center>
    </>
    )
  }
  
  export default FieldsPage