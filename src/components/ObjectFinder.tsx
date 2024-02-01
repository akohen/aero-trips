import { Select } from "@mantine/core";
import { Activity, Airfield } from "..";
import { useEffect, useState } from "react";

const ObjectFinder = ({activities, airfields, value, onChange}: 
  {activities: Map<string,Activity>, airfields: Map<string,Airfield>, value: string|null, onChange: (value: string|null) => void}) => {
    type FinderOptions = {group: string, items: {label: string, value: string}[]}[]
    const [data, setData] = useState<FinderOptions>([])

    useEffect(() => {
      const activitiesOptions = [...airfields] 
        .map(([id, ad]) => (
          {label: `${ad.name} - ${ad.codeIcao}`, value:`airfields/${id}`}
        ))
      const airfieldsOptions = [...activities] 
        .map(([id, activity]) => (
          {label: activity.name, value:`activities/${id}`}
        ))

      setData([
        {group:'Terrains', items:airfieldsOptions},
        {group:'Activités', items:activitiesOptions},
      ])

    },[airfields, activities])
    
  
  return (<Select 
    value={value}
    onChange={onChange}
    data={data}
    placeholder="Terrain ou activité"
    limit={8} searchable clearable
    size="xs"
    style={{width:'250px'}}
  />)
}

export default ObjectFinder