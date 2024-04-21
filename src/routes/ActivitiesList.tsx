
import { Table, Text } from '@mantine/core';
import { ActivityFilter, Data } from '..';
import { useNavigate } from 'react-router-dom';
import List from '../components/TableList';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import ActivitiesFilters from '../components/ActivitiesFilters';
import { filterActivities } from '../utils';
import { ButtonViewOnMap } from '../components/CommonButtons';
import { ActivityTitle } from '../components/ActivityUtils';


function ActivitiesList({airfields, activities, filters, setFilters} : 
  Data & {filters: ActivityFilter, setFilters: Dispatch<SetStateAction<ActivityFilter>>}) {
  
  const [data, setData] = useState(activities);
  const navigate = useNavigate();
  const ActivityTd = (id: string) => ({
    className:'clickable',
    onClick:() => navigate(`/activities/${id}`)
  })

  useEffect(()=>{
    setData( filterActivities( airfields, activities, filters) )
  },[activities, airfields, filters])

  
  return (<>
    <ActivitiesFilters airfields={airfields} activities={activities} filters={filters} setFilters={setFilters} />
    <List
      data={data} 
      columns={["Nom du lieu ou de l'activité", '']}
      empty={(<Text fw={500} ta="center">Aucun résultat</Text>)}
      row={([key, e]) => (
        <Table.Tr key={key}>
          <Table.Td {...ActivityTd(key)}><ActivityTitle activity={e}/></Table.Td>
          <Table.Td align='right'><ButtonViewOnMap item={e} compact/></Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default ActivitiesList