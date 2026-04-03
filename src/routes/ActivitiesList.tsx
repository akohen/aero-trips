
import { em, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Activity, ActivityFilter, Data } from '..';
import TableList from '../components/TableList';
import CardList from '../components/CardList';
import { useEffect, useState } from 'react';
import ActivitiesFilters from '../components/ActivitiesFilters';
import { filterActivities } from '../utils/utils';
import { ButtonViewOnMap } from '../components/CommonButtons';
import { ActivityTitle } from '../components/ActivityUtils';
import { getActivityImage, getImgNode } from '../utils/itemImages';
import type { CardColumn } from '../components/CardList';


function ActivitiesList({airfields, activities, filters, setFilters, setMapView, profile} : 
  Data & {filters: ActivityFilter, setFilters: (newFilters: ActivityFilter) => void}) {
  
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`);
  const [data, setData] = useState(activities);
  const [view, setView] = useState<'list' | 'cards'>(isMobile ? 'cards' : 'list');

  useEffect(()=>{
    setData( filterActivities( airfields, activities, filters) )
  },[activities, airfields, filters])

  useEffect(() => {
    setFilters(filters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  const columns: CardColumn<Activity>[] = [
    {
      title: "Nom du lieu ou de l'activité",
      row: (e) => (<ActivityTitle activity={e} profile={profile} />),
      sortFn: (a, b) => a.name.localeCompare(b.name),
      linkTo: (e) => `/activities/${e.id}`,
    },
    {
      row: (e) => (<Group justify="flex-end"><ButtonViewOnMap item={e} setMapView={setMapView} compact /></Group>),
    }
  ]

  if (isMobile === undefined) return null;

  return (<>
    <ActivitiesFilters airfields={airfields} activities={activities} filters={filters} setFilters={setFilters} />
    {(!isMobile && view === 'list')
      ? <TableList data={data} defaultSortColumn={0} columns={columns} onViewChange={() => setView('cards')} />
      : <CardList data={data} defaultSortColumn={0} columns={columns} getImage={(e) => getActivityImage(getImgNode(e.description), e.type)} onViewChange={isMobile ? undefined : () => setView('list')} />
    }
  </>)
}

export default ActivitiesList