import { useParams } from "react-router-dom";
import { Airfield } from "../types";

const AirfieldDetails = ({airfields} : {airfields:Map<string,Airfield>}) => {
  const params = useParams();
  const airfieldData = params.airfieldId ? airfields.get(params.airfieldId) : undefined;
  return airfields.size > 0 ? airfieldData ? (<>
    <h1>Fiche {airfieldData.name} - {airfieldData.codeIcao}</h1>
    <p>{airfieldData.description}</p>
  </>) : (
    <p>Pas de terrain trouvé</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default AirfieldDetails