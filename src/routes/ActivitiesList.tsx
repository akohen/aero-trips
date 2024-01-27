
import { Table, Text } from '@mantine/core';
import { Activity, ActivityFilter, Airfield } from '..';
import { Link } from 'react-router-dom';
import List from '../components/TableList';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import ActivitiesFilters from '../components/ActivitiesFilters';
import { filterActivities } from '../utils';


function ActivitiesList({airfields, activities, filters, setFilters} : 
  {airfields: Map<string,Airfield>, activities: Map<string,Activity>, filters: ActivityFilter, setFilters: Dispatch<SetStateAction<ActivityFilter>>}) {
  
  const [data, setData] = useState(activities);

  useEffect(()=>{
    setData( filterActivities( activities, filters) )
  },[activities, filters])

  
  return (<>
    <ActivitiesFilters airfields={airfields} activities={activities} filters={filters} setFilters={setFilters} />
    <List
      data={data} 
      columns={['Nom','Type']}
      empty={(<Text fw={500} ta="center">Aucun résultat</Text>)}
      row={([key, e]) => (
        <Table.Tr key={key}>
          <Table.Td><Link to={`/activities/${key}`}>{e.name}</Link></Table.Td>
          <Table.Td>{e.type}</Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default ActivitiesList