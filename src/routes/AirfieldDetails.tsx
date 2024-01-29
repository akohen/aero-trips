import { useParams } from "react-router-dom";
import { Data } from "..";
import DetailsPage from "../components/DetailsPage";

const AirfieldDetails = ({airfields, activities} : Data) => {
  const params = useParams();
  const airfield = params.airfieldId ? airfields.get(params.airfieldId) : undefined;
  
  return airfields.size > 0 ? airfield ? (
    <DetailsPage item={airfield} airfields={airfields} activities={activities} />
  ) : (
    <p>Pas de terrain trouvé</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default AirfieldDetails