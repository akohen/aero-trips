import { useParams } from "react-router-dom";
import { Data } from "..";
import DetailsPage from "../components/DetailsPage";

const AirfieldDetails = ({airfields, activities, trips} : Data) => {
  const params = useParams();
  const airfield = params.airfieldId ? airfields.get(params.airfieldId) : undefined;
  
  return airfields.size > 0 ? airfield ? (
    <DetailsPage id={params.airfieldId!} item={airfield} airfields={airfields} activities={activities} trips={trips} />
  ) : (
    <p>Pas de terrain trouvé</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default AirfieldDetails