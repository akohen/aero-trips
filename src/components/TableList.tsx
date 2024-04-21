import { Table, Pagination, Center, Text } from '@mantine/core';
import { useEffect, useState } from 'react';

function chunk<T>(array: T[], size: number): T[][] {
  if (!array.length) {return [];}
  const head = array.slice(0, size);
  const tail = array.slice(size);
  return [head, ...chunk(tail, size)];
}

function TableList<T>( {data, row, empty, columns} : 
    {data: Map<string,T>, row:(arg0: [string,T], arg1: number)=>JSX.Element, empty: JSX.Element, columns: string[]} ) {

  const [activePage, setPage] = useState(1);
  const chunks = chunk([...data],15)
  useEffect(() => {
    const page = Math.min(activePage, chunks.length)
    setPage(Math.max(1, page))
  }, [activePage, chunks])

  const rows = chunks.length > 0 ? chunks[activePage-1]?.map(row) : (
  <Table.Tr>
    <Table.Td colSpan={columns.length}>
        {empty}
    </Table.Td>
  </Table.Tr>
  );
  
  return (<>
    <Table stickyHeader stickyHeaderOffset={60} highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          {columns.map((value,id) => (<Table.Th key={id}>{value}</Table.Th>))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
    <Center><Pagination total={chunks.length} value={activePage} onChange={setPage} />{data.size > 0 && <Text ml={'md'}>({data.size} résultats)</Text>}</Center>
  </>)
}

export default TableList