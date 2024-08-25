import { useParams } from "react-router-dom";
import { Data } from "..";
import DetailsPage from "../components/DetailsPage";

const AirfieldDetails = (data : Data) => {
  const params = useParams();
  const airfield = params.airfieldId ? data.airfields.get(params.airfieldId) : undefined;
  
  return data.airfields.size > 0 ? airfield ? (
    <DetailsPage id={params.airfieldId!} item={airfield} {...data} />
  ) : (
    <p>Pas de terrain trouvé</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default AirfieldDetails