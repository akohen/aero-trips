
import { Table, Title } from '@mantine/core';
import { Activity, Airfield, Data } from '..';
import { useNavigate } from 'react-router-dom';
import List from '../components/TableList';
import { ButtonViewOnMap } from '../components/CommonButtons';
import { ActivityTitle } from '../components/ActivityUtils';
import { formatDate } from '../utils';
import { AirfieldTitle } from '../components/AirfieldUtils';


function LastChanges({airfields, activities, setMapView, profile} : Data) {
  
  const items: [string, Activity | Airfield][] = [...activities, ...airfields]
    .filter(
      ([, e]) => e.updated_at && (e.updated_at.seconds * 1000) > (Date.now() - 1000 * 60 * 60 * 24 * 30)
    );
  const data: Map<string, Activity | Airfield> = new Map(items);
  const navigate = useNavigate();
  const clickable = (e: Activity | Airfield) => ({
    className: 'clickable',
    onClick: () => navigate('codeIcao' in e ? `/airfields/${e.codeIcao}` : `/activities/${e.id}`)
  });
  
  return (<>
    <Title order={2}>Dernières modifications</Title>
    <List
      data={data} 
      columns={[
        {
          title:"Nom",
          row: (e) => (
            <Table.Td {...clickable(e)}>
              {'codeIcao' in e ? <AirfieldTitle ad={e as Airfield} profile={profile} /> : <ActivityTitle activity={e as Activity} profile={profile} />}
            </Table.Td>
          )
        },
        {
          title:'Dernière modification', 
          sortFn: (a: Activity | Airfield, b: Activity | Airfield) => a.updated_at!.seconds - b.updated_at!.seconds,
          row: (e) => <Table.Td {...clickable(e)}>{formatDate(e.updated_at!)}</Table.Td>
        },
        {
          row: e => (<Table.Td align='right'><ButtonViewOnMap item={e} setMapView={setMapView} compact/></Table.Td>)
        }
    ]}
    />
  </>)
}

export default LastChanges