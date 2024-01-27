import { Link, useParams } from "react-router-dom";
import { Activity, Airfield } from "..";
import { Space, Text, Title } from "@mantine/core";
import { findNearest, getActivityType } from "../utils";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";

const ActivityDetails = ({activities, airfields} : {activities:Map<string,Activity>, airfields:Map<string,Airfield>}) => {
  const params = useParams();
  const activity = params.activityId ? activities.get(params.activityId) : undefined;

  const nearbyAirfields = (activity: Activity) => findNearest(activity, airfields)
  .slice(0,8)
  .map(([dist,ad]) => (
    <p key={ad.codeIcao}>
      <Link to={`/airfields/${ad.codeIcao}`}>{ad.name} - {ad.codeIcao} {Math.round(dist/1000)} km</Link>
    </p>
  ))


  return activities.size > 0 ? activity ? (<>
    <Title order={1}><BackButton />Fiche {activity.name} <EditButton /></Title>
    <Text>{activity.type.map(t => (<span key={t}>{getActivityType(t)}</span>))}</Text>
    <Space mt={"md"}/>
    <div><Title order={4}>Terrains proches</Title>{nearbyAirfields(activity)}</div>
    <div dangerouslySetInnerHTML={{__html: activity.description!}} />
    
  </>) : (
    <p>Activité/lieu inconnu</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default ActivityDetails