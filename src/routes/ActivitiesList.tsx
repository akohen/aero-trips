
import { Group } from '@mantine/core';
import { ActivityFilter, Data } from '..';
import List from '../components/TableList';
import { useEffect, useState } from 'react';
import ActivitiesFilters from '../components/ActivitiesFilters';
import { filterActivities } from '../utils';
import { ButtonViewOnMap } from '../components/CommonButtons';
import { ActivityTitle } from '../components/ActivityUtils';


function ActivitiesList({airfields, activities, filters, setFilters, setMapView, profile} : 
  Data & {filters: ActivityFilter, setFilters: (newFilters: ActivityFilter) => void}) {
  
  const [data, setData] = useState(activities);

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
      data={data} defaultSortColumn={0}
      columns={[
        {
          title:"Nom du lieu ou de l'activité",
          row: (e) => (<ActivityTitle activity={e} profile={profile} />),
          sortFn: (a, b) => a.name.localeCompare(b.name),
          linkTo: (e) => `/activities/${e.id}`,
        },
        {
          row: (e) => (<Group justify="flex-end"><ButtonViewOnMap item={e} setMapView={setMapView} compact /></Group>),
        }
      ]}
    />
  </>)
}

export default ActivitiesList