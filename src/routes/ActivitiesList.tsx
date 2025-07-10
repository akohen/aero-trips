
import { Table } from '@mantine/core';
import { ActivityFilter, Data } from '..';
import { useNavigate } from 'react-router-dom';
import List from '../components/TableList';
import { useEffect, useState } from 'react';
import ActivitiesFilters from '../components/ActivitiesFilters';
import { filterActivities } from '../utils';
import { ButtonViewOnMap } from '../components/CommonButtons';
import { ActivityTitle } from '../components/ActivityUtils';


function ActivitiesList({airfields, activities, filters, setFilters, setMapView, profile} : 
  Data & {filters: ActivityFilter, setFilters: (newFilters: ActivityFilter) => void}) {
  
  const [data, setData] = useState(activities);
  const navigate = useNavigate();
  const ActivityTd = (id: string) => ({
    className:'clickable',
    onClick:() => navigate(`/activities/${id}`)
  })

  useEffect(()=>{
    setData( filterActivities( airfields, activities, filters) )
  },[activities, airfields, filters])

  useEffect(() => {
    setFilters(filters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  return (<>
    <ActivitiesFilters airfields={airfields} activities={activities} filters={filters} setFilters={setFilters} />
    <List
      data={data} 
      columns={["Nom du lieu ou de l'activité", '']}
      row={([key, e]) => (
        <Table.Tr key={key}>
          <Table.Td {...ActivityTd(key)}><ActivityTitle activity={e} profile={profile} /></Table.Td>
          <Table.Td align='right'><ButtonViewOnMap item={e} setMapView={setMapView} compact/></Table.Td>
        </Table.Tr>
      )}
    />
  </>)
}

export default ActivitiesList