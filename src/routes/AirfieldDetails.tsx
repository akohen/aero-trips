import { useParams } from "react-router-dom";
import { Airfield } from "../types";

const AirfieldDetails = ({airfields} : {airfields:Airfield[]}) => {
  const params = useParams();
  const airfieldData = airfields.filter(e => e.codeIcao.toLowerCase() == params.airfieldId?.toLowerCase())
  return airfields.length > 0 ? airfieldData.length > 0 ? (
    <h1>Fiche {airfieldData[0].name} - {airfieldData[0].codeIcao}</h1>
  ) : (
    <p>Pas de terrain trouvé</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default AirfieldDetails