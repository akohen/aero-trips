import { Table, Pagination, Center, Text } from '@mantine/core';
import { IconCaretDownFilled, IconCaretUpDownFilled, IconCaretUpFilled } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function chunk<T>(array: T[], size: number): T[][] {
  if (!array.length) {return [];}
  const head = array.slice(0, size);
  const tail = array.slice(size);
  return [head, ...chunk(tail, size)];
}

function TableList<T>({
  data, columns, defaultSortColumn, defaultSortDir
} : {
  data: Map<string,T>,
  columns: {
    row: (arg0: T)=>JSX.Element,
    title?: string,
    sortFn?: (a: T, b: T) => number,
    linkTo?: (arg0: T, key?: string) => string,
  }[],
  defaultSortColumn?: number,
  defaultSortDir?: 1 | -1,
}) {
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams()
  const [activePage, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [sortColumn, setSortColumn] = useState<number>(defaultSortColumn !== undefined ? defaultSortColumn : -1);
  const [sortDir, setSortDir] = useState<1 | -1>(defaultSortDir || 1);
  const sortedData = sortColumn !== -1 && columns[sortColumn].sortFn !== undefined
    ? [...data].sort((a, b) => sortDir * (columns[sortColumn].sortFn?.(a[1], b[1]) ?? 0))
    : [...data];
  const chunks = chunk(sortedData, 15)
  const updatePage = (page: number) => {
    if(data.size === 0) return // Wait for data to be loaded before resetting to page 1
    const pageId = Math.max(1, Math.min(page, chunks.length))
    setPage(pageId)
    setSearchParams(params => {params.set("page", pageId.toString()); return params})
  }

  useEffect(() => {
    updatePage(activePage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunks.length]) // This is to ensure that the active page does not exceed the number of pages when filters are changed
  
  const handleHeaderClick = (colIndex: number) => {
    if(colIndex === sortColumn) {
      setSortDir(prev => prev === 1 ? -1 : 1);
    } else {
      setSortColumn(colIndex);
      setSortDir(1)
    }
  };
  const rows = chunks.length > 0 ? 
    chunks[activePage-1]?.map(([key, e]) => (
      <Table.Tr key={key}>
        {columns.map(c => (
          <Table.Td {...c.linkTo ? {className:"clickable", onClick:() => navigate(c.linkTo!(e, key))} : {}} >
            {c.row(e)}
          </Table.Td>
        ))}
      </Table.Tr>
  )) : (
    <Table.Tr>
      <Table.Td colSpan={columns.length}>
        <Text fw={500} ta="center">Aucun résultat</Text>
      </Table.Td>
    </Table.Tr>
  );
  
  return (<>
    <Table stickyHeader stickyHeaderOffset={60} highlightOnHover>
      <Table.Thead bg={'#faf8f8'}>
        <Table.Tr>
          {columns.map((value,id) => value.sortFn == undefined? (
            <Table.Th key={id}>{value.title}</Table.Th>
          ) : (
            <Table.Th 
              key={id}
              onClick={() => handleHeaderClick(id)}
              style={{ cursor: 'pointer', userSelect: 'none'}}
            >
              <div className="aligner">
                <div className="icon">
                  {sortColumn === id ? 
                    (sortDir === 1 ? <IconCaretUpFilled size={18} /> : <IconCaretDownFilled size={18} />) 
                  : 
                    <IconCaretUpDownFilled size={18} />
                  }
                </div>
                <div className="text">{value.title}</div>
              </div>
            </Table.Th>
          ) )}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
    <Center><Pagination total={chunks.length} value={activePage} onChange={updatePage} />{data.size > 0 && <Text ml={'md'}>({data.size} résultats)</Text>}</Center>
  </>)
}

export default TableList