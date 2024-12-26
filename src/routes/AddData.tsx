import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Activity, Airfield, Data, Trip } from "..";
import { Button, Group, Paper, Title } from "@mantine/core";
import { IconMapRoute, IconBulb } from "@tabler/icons-react";
import ActivityForm from "../components/ActivityForm";
import { GeoPoint } from "firebase/firestore";
import AirfieldForm from "../components/AirfieldForm";
import TripForm from "../components/TripForm";
import BackButton from "../components/BackButton";

const AddData = (data: Data) => {
  const params = useParams();
  const [entity, setEntity] = useState<Activity|Airfield|Trip>()
  const [type, setType] = useState<'activities'|'airfields'|'trips'>()


  useEffect(() => {
    setType(params.type as 'activities'|'airfields'|'trips')
    if(params.type && params.id && ['activities','airfields','trips'].includes(params.type)) {
      setEntity(data[params.type as 'activities'|'airfields'|'trips'].get(params.id))
    } else if(params.lat && params.lng) {
      setType('activities')
      setEntity({name: '', position: new GeoPoint(parseFloat(params.lat), parseFloat(params.lng))} as Activity)
    } else {
      setEntity(undefined)
    }
  },[data, params])


  return type ? (params.id != undefined && !entity) ? (
    <p>Loading</p>
  ) : 
  type == 'activities' && (<ActivityForm activity={entity as Activity} id={params.id} {...data} />) 
  || type == 'trips' && (<TripForm id={params.id} {...data} />) 
  || type == 'airfields' && (<AirfieldForm airfield={entity as Airfield} profile={data.profile} airfields={data.airfields} />) 
  : (
    <>
    <Title><BackButton />Contribuer</Title>
    <Paper
      shadow="md"
      radius="md"
      p='sm'
      mt="md"
      withBorder
    >
      
        <p>Merci de contribuer à améliorer les données du site!</p>
        <p>Plusieurs types de données peuvent être modifiées:</p>

        <ul>
          <li><b>Les terrains d'aviation</b>: Les données de base sont importées à partir des exports du SIA, pour rajouter des détails ou des commentaires sur un terrain, allez sur la fiche de ce terrain et cliquez sur le bouton "modifier" en haut.</li>
          <li><b>Les activités</b>: Pour ajouter une activité, faites un clic-droit sur la carte à l'endroit où vous souhaitez ajouter l'activité. Pour modifier une activité, allez sur sa fiche et cliquez sur le bouton "modifier" en haut.</li>
          <li><b>Les sorties</b>: Pour ajouter une sortie, cliquez sur le bouton ci-dessous. Seule la personne ayant proposé une sortie peut la modifier.</li>
        </ul>
      <Group>
        <Button leftSection={<IconBulb size={14} />} onClick={() => setType('activities')}>Lieu ou activité</Button>
        <Button leftSection={<IconMapRoute size={14} />} onClick={() => setType('trips')}>Sortie</Button>
      </Group>
      <p>En cas de problème ou de questions, n'hésitez pas à <Link to={'/contact'}>nous contacter directement</Link>.</p>

    </Paper></>
  )
}

export default AddData