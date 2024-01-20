import { useParams } from "react-router-dom";
import { Activity } from "../types";

const AirfieldDetails = ({activities} : {activities:Map<string,Activity>}) => {
  const params = useParams();
  const activity = params.activityId ? activities.get(params.activityId) : undefined;
  return activities.size > 0 ? activity ? (<>
    <h1>Fiche {activity.name}</h1>
    <p>{activity.description}</p>
    <p>{activity.type.map(t => (<span key={t}>{t} </span> ))}</p>
  </>) : (
    <p>Activité/lieu inconnu</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default AirfieldDetails