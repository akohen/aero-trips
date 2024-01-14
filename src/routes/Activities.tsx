
import { Table } from '@mantine/core';
import poi from '../data/poi.json'

function Activities() {
  const rows = poi.filter(x => x.type != 'airfield').map((e,i) => (
    <Table.Tr key={i}>
      <Table.Td>{e.name}</Table.Td>
      <Table.Td>{e.type}</Table.Td>
    </Table.Tr>
  ));
  
    return (<Table stickyHeader stickyHeaderOffset={60}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Lieu</Table.Th>
          <Table.Th>Type</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
    )
  }
  
  export default Activities