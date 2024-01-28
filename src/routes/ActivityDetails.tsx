import { useParams } from "react-router-dom";
import { Activity, Airfield } from "..";
import { Group, Text, Title } from "@mantine/core";
import { findNearest, getActivityType } from "../utils";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";
import { NearbyAirfields } from "../components/AirfieldUtils";

const ActivityDetails = ({activities, airfields} : {activities:Map<string,Activity>, airfields:Map<string,Airfield>}) => {
  const params = useParams();
  const activity = params.activityId ? activities.get(params.activityId) : undefined;


  return activities.size > 0 ? activity ? (<>
    <Title order={1}><BackButton />Fiche {activity.name} <EditButton /></Title>
    <Text>{activity.type.map(t => (<span key={t}>{getActivityType(t)}</span>))}</Text>
    <Group justify="space-evenly" grow align="baseline">
      <div dangerouslySetInnerHTML={{__html: activity.description!}} />
      <NearbyAirfields items={findNearest(activity, airfields, 50000).slice(0,8)} />
    </Group>
  </>) : (
    <p>Activité/lieu inconnu</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default ActivityDetails