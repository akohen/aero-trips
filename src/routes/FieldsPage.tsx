
import { Table } from '@mantine/core';
import poi from '../data/poi.json'
import airac from '../data/airac';

function FieldsPage() {
  const rows = poi.filter(x => x.type == 'airfield').map((e,i) => (
    <Table.Tr key={i}>
      <Table.Td>{e.name}</Table.Td>
      <Table.Td>{e.ICAO}</Table.Td>
      <Table.Td>
        <a target='_blank' href={`https://www.sia.aviation-civile.gouv.fr/dvd/eAIP_${airac}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.${e.ICAO}.pdf`}>
          Consulter
        </a>
      </Table.Td>
    </Table.Tr>
  ));
  
    return (<Table stickyHeader stickyHeaderOffset={60}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Nom du terrain</Table.Th>
          <Table.Th>Code OACI</Table.Th>
          <Table.Th>Carte VAC</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
    )
  }
  
  export default FieldsPage