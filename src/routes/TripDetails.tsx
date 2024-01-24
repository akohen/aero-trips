import { Link, useParams } from "react-router-dom";
import { Airfield, Data, Trip } from "../types";
import EditButton from "../components/EditButton";

const TripDetails = ({trips, airfields} : Data) => {
  const params = useParams();
  const trip = params.tripId ? trips.get(params.tripId) : undefined;
  const showAD = (ad: Airfield) => (<Link to={`/airfields/${ad.codeIcao}`}>{ad.name} - {ad.codeIcao}</Link>)
  const route = (trip: Trip) => {
    const startAD = airfields.get(trip.from!)
    const endAD = airfields.get(trip.to)
    return (<p>
      {startAD && <>Depuis {showAD(startAD)} </>}
      jusqu'à {showAD(endAD!)}
    </p>)
  }
  return trips.size > 0 ? trip ? (<>
    <h1>Fiche {trip.name} <EditButton /></h1>
    <p>{trip.type}</p>
    <p>{trip.description}</p>
    {route(trip)}
    
  </>) : (
    <p>Activité/lieu inconnu</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default TripDetails