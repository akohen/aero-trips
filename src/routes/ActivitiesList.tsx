
import { Button, em, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Activity, ActivityFilter, Data } from '..';
import TableList from '../components/TableList';
import CardList from '../components/CardList';
import { useEffect, useState } from 'react';
import ActivitiesFilters from '../components/ActivitiesFilters';
import { filterActivities } from '../utils/utils';
import { ButtonViewOnMap } from '../components/CommonButtons';
import { ActivityIcon, ActivityTitle } from '../components/ActivityUtils';
import { getActivityImage, getImgNode } from '../utils/itemImages';
import type { CardColumn, CardConfig } from '../components/CardList';
import { useDraftTrip } from '../hooks/useDraftTrip';
import { IconRoute } from '@tabler/icons-react';


function ActivitiesList({airfields, activities, filters, setFilters, setMapView, profile} :
  Data & {filters: ActivityFilter, setFilters: (newFilters: ActivityFilter) => void}) {

  const isMobile = useMediaQuery(`(max-width: ${em(768)})`, undefined, { getInitialValueInEffect: false });
  const [data, setData] = useState(activities);
  const [view, setView] = useState<'list' | 'cards'>(isMobile ? 'cards' : 'list');
  const { draft, setDraft } = useDraftTrip()
  const isInDraft = (id: string) => draft.steps.some(s => s.type === 'activities' && s.id === id)
  const addToDraft = (e: Activity) => {
    if (!isInDraft(e.id)) setDraft({ ...draft, steps: [...draft.steps, { type: 'activities', id: e.id }] })
  }

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
      row: (e) => (<Group justify="flex-end"><ButtonViewOnMap item={e} setMapView={setMapView} compact />{profile && <Button size="compact-sm" onClick={() => addToDraft(e)} disabled={isInDraft(e.id)} leftSection={<IconRoute size={16} />}>{isInDraft(e.id) ? 'Ajouté' : 'Ajouter'}</Button>}</Group>),
    }
  ]

  const cardConfig: CardConfig<Activity> = {
    title: (e) => e.name,
    icons: (e, _key, hasImage) => <ActivityIcon activity={e} profile={profile} color={hasImage ? 'white' : undefined} />,
    actions: (e) => <Group gap="xs"><ButtonViewOnMap item={e} setMapView={setMapView} compact />{profile && <Button size="compact-sm" onClick={() => addToDraft(e)} disabled={isInDraft(e.id)} leftSection={<IconRoute size={16} />}>{isInDraft(e.id) ? 'Ajouté' : 'Ajouter'}</Button>}</Group>,
  }

  return (<>
    <ActivitiesFilters airfields={airfields} activities={activities} filters={filters} setFilters={setFilters} />
    {(!isMobile && view === 'list')
      ? <TableList data={data} defaultSortColumn={0} columns={columns} onViewChange={() => setView('cards')} />
      : <CardList data={data} defaultSortColumn={0} columns={columns} cardConfig={cardConfig} getImage={(e) => getActivityImage(getImgNode(e.description), e.type)} onViewChange={isMobile ? undefined : () => setView('list')} />
    }
  </>)
}

export default ActivitiesList
