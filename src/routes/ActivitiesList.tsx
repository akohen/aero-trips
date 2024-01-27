
import { Table, Text } from '@mantine/core';
import { Activity, ActivityFilter, Airfield } from '..';
import { useNavigate } from 'react-router-dom';
import List from '../components/TableList';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import ActivitiesFilters from '../components/ActivitiesFilters';
import { filterActivities } from '../utils';
import { ViewOnMap } from '../components/CommonButtons';


function ActivitiesList({airfields, activities, filters, setFilters} : 
  {airfields: Map<string,Airfield>, activities: Map<string,Activity>, filters: ActivityFilter, setFilters: Dispatch<SetStateAction<ActivityFilter>>}) {
  
  const [data, setData] = useState(activities);
  const navigate = useNavigate();
  const ActivityTd = (id: string) => ({
    className:'clickable',
    onClick:() => navigate(`/activities/${id}`)
  })

  useEffect(()=>{
    setData( filterActivities( activities, filters) )
  },[activities, filters])

  
  return (<>
    <ActivitiesFilters airfields={airfields} activities={activities} filters={filters} setFilters={setFilters} />
    <List
      data={data} 
      columns={['Nom','Type', '']}
      empty={(<Text fw={500} ta="center">Aucun résultat</Text>)}
      row={([key, e]) => (
        <Table.Tr key={key}>
          <Table.Td {...ActivityTd(key)}>{e.name}</Table.Td>
          <Table.Td>{e.type}</Table.Td>
          <Table.Td><ViewOnMap item={e}/></Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default ActivitiesList