import { useParams } from "react-router";
import { Data } from "..";
import DetailsPage from "../components/DetailsPage";

const ActivityDetails = (data : Data) => {
  const params = useParams();
  const activity = params.activityId ? data.activities.get(params.activityId) : undefined;


  return data.activities.size > 0 ? activity ? (
    <DetailsPage id={params.activityId!} item={activity} {...data} />
  ) : (
    <p>Activité/lieu inconnu</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default ActivityDetails