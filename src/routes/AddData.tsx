import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Activity, Airfield, Data, Trip } from "../types";
import { Button, Group } from "@mantine/core";
import { IconPhoto, IconMap } from "@tabler/icons-react";
import ActivityForm from "../components/ActivityForm";
import { slug } from "../utils";
import { GeoPoint } from "firebase/firestore";
import AirfieldForm from "../components/AirfieldForm";
import TripForm from "../components/TripForm";

const AddData = (data: Data) => {
  const params = useParams();
  const [entity, setEntity] = useState<Activity|Airfield|Trip>()
  const [type, setType] = useState<'activities'|'airfields'|'trips'>()


  useEffect(() => {
    setType(params.type as 'activities'|'airfields'|'trips')
    if(params.type && params.id && ['activities','airfields','trips'].includes(params.type)) {
      setEntity(data[params.type as 'activities'|'airfields'|'trips'].get(params.id))
    } else {
      setEntity(undefined)
    }
  },[data, params])


  const submitFn = (document: {name?: string, position?: string}) => {
    data.saveChange({
      ...document,
      targetDocument:`${type}/${params.id ? params.id : slug(document.name!)}`, 
      position: document.position ? new GeoPoint(...document.position.split(', ').map(parseFloat) as [number, number]) : undefined,
    })
  }


  return type ? (params.id != undefined && !entity) ? (
    <p>Loading</p>
  ) : 
  type == 'activities' && (<ActivityForm activity={entity as Activity} submitFn={submitFn} />) 
  || type == 'trips' && (<TripForm trip={entity as Trip} submitFn={submitFn} />) 
  || type == 'airfields' && (<AirfieldForm airfield={entity as Airfield} submitFn={submitFn} />) 
  : (
    <Group justify="center">
      <p>Proposer</p>
      <Button leftSection={<IconPhoto size={14} />} onClick={() => setType('activities')}>Lieu ou activité</Button>
      <Button leftSection={<IconMap size={14} />} onClick={() => setType('trips')}>Sortie</Button>
    </Group>
  )
}

export default AddData