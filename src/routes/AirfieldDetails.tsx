import { useParams } from "react-router-dom";
import { Airfield } from "../types";
import { getVacUrl } from "../data/airac";

const AirfieldDetails = ({airfields} : {airfields:Map<string,Airfield>}) => {
  const params = useParams();
  const airfield = params.airfieldId ? airfields.get(params.airfieldId) : undefined;
  return airfields.size > 0 ? airfield ? (<>
    <h1>Fiche {airfield.name} - {airfield.codeIcao}</h1>
    <p>{airfield.description}</p>
    <a target='_blank' href={getVacUrl(airfield.codeIcao)}>Carte VAC</a>
  </>) : (
    <p>Pas de terrain trouvé</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default AirfieldDetails