import { useMemo } from 'react';
import { Activity, Airfield } from "..";
import TripStepSelect from './TripStepSelect';

const ObjectFinder = ({ activities, airfields, value, onChange }: {
  activities: Map<string, Activity>;
  airfields: Map<string, Airfield>;
  value: string | null;
  onChange: (value: string | null) => void;
}) => {
  const data = useMemo(() => [
    {
      group: 'Terrains',
      items: [...airfields].map(([id, ad]) => ({ label: `${ad.name} - ${ad.codeIcao}`, value: `airfields/${id}` })),
    },
    {
      group: 'Activités',
      items: [...activities].map(([id, activity]) => ({ label: activity.name, value: `activities/${id}` })),
    },
  ], [airfields, activities])

  return <TripStepSelect data={data} value={value} onChange={onChange} w={210} />
}

export default ObjectFinder;
