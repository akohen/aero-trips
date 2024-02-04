import { useParams } from "react-router-dom";
import { Data } from "..";
import DetailsPage from "../components/DetailsPage";

const ActivityDetails = ({activities, airfields, trips} : Data) => {
  const params = useParams();
  const activity = params.activityId ? activities.get(params.activityId) : undefined;


  return activities.size > 0 ? activity ? (
    <DetailsPage id={params.activityId!} item={activity} airfields={airfields} activities={activities} trips={trips} />
  ) : (
    <p>Activité/lieu inconnu</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default ActivityDetails