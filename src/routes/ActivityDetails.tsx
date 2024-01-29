import { useParams } from "react-router-dom";
import { Activity, Airfield } from "..";
import DetailsPage from "../components/DetailsPage";

const ActivityDetails = ({activities, airfields} : {activities:Map<string,Activity>, airfields:Map<string,Airfield>}) => {
  const params = useParams();
  const activity = params.activityId ? activities.get(params.activityId) : undefined;


  return activities.size > 0 ? activity ? (
    <DetailsPage item={activity} airfields={airfields} activities={activities} />
  ) : (
    <p>Activité/lieu inconnu</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default ActivityDetails