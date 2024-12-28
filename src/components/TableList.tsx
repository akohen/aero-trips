import { Table, Pagination, Center, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function chunk<T>(array: T[], size: number): T[][] {
  if (!array.length) {return [];}
  const head = array.slice(0, size);
  const tail = array.slice(size);
  return [head, ...chunk(tail, size)];
}

function TableList<T>( {data, row, empty, columns} : 
    {data: Map<string,T>, row:(arg0: [string,T], arg1: number)=>JSX.Element, empty: JSX.Element, columns: string[]} ) {
  
  const [searchParams, setSearchParams] = useSearchParams()
  const [activePage, setPage] = useState(Number(searchParams.get("page")) || 1);
  const chunks = chunk([...data],15)
  const updatePage = (page: number) => {
    if(data.size === 0) return // Wait for data to be loaded before resetting to page 1
    const pageId = Math.max(1, Math.min(page, chunks.length))
    setPage(pageId)
    setSearchParams({page: pageId.toString()})
  }

  useEffect(() => {
    updatePage(activePage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunks.length]) // This is to ensure that the active page does not exceed the number of pages when filters are changed

  const rows = chunks.length > 0 ? chunks[activePage-1]?.map(row) : (
  <Table.Tr>
    <Table.Td colSpan={columns.length}>
        {empty}
    </Table.Td>
  </Table.Tr>
  );
  
  return (<>
    <Table stickyHeader stickyHeaderOffset={60} highlightOnHover>
      <Table.Thead bg={'#faf8f8'}>
        <Table.Tr>
          {columns.map((value,id) => (<Table.Th key={id}>{value}</Table.Th>))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
    <Center><Pagination total={chunks.length} value={activePage} onChange={updatePage} />{data.size > 0 && <Text ml={'md'}>({data.size} résultats)</Text>}</Center>
  </>)
}

export default TableList