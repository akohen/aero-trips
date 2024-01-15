
import { Table, Pagination, Center } from '@mantine/core';
import airfields from '../data/airfields.json'
import airac from '../data/airac';
import { useState } from 'react';

function chunk<T>(array: T[], size: number): T[][] {
  if (!array.length) {
    return [];
  }
  const head = array.slice(0, size);
  const tail = array.slice(size);
  return [head, ...chunk(tail, size)];
}

const data = chunk(Object.values(airfields),20);

function FieldsPage() {
  const [activePage, setPage] = useState(1);
  const rows = data[activePage-1].map(e => (
    <Table.Tr key={e.codeIcao}>
      <Table.Td>{e.name}</Table.Td>
      <Table.Td>{e.codeIcao}</Table.Td>
      <Table.Td>
        <a target='_blank' href={`https://www.sia.aviation-civile.gouv.fr/dvd/eAIP_${airac}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.${e.codeIcao}.pdf`}>
          Consulter
        </a>
      </Table.Td>
    </Table.Tr>
  ));
  
    return (<>
    <Table stickyHeader stickyHeaderOffset={60} highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Nom du terrain</Table.Th>
          <Table.Th>Code OACI</Table.Th>
          <Table.Th>Carte VAC</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
    <Center><Pagination className="paginationtest" total={data.length} value={activePage} onChange={setPage} mt="sm" /></Center>
    </>
    )
  }
  
  export default FieldsPage