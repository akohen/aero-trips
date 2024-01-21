import { Link, useParams } from "react-router-dom";
import { Activity, Airfield, Data } from "../types";
import { getVacUrl } from "../data/airac";
import haversineDistance from "haversine-distance";

const AirfieldDetails = ({airfields, activities} : Data) => {
  const params = useParams();
  const airfield = params.airfieldId ? airfields.get(params.airfieldId) : undefined;
  const nearbyAirfields = (airfield: Airfield) => {
    return [...airfields]
      .map(([,ad]) => [haversineDistance(airfield.position,ad.position), ad] as [number, Airfield])
      .filter(([dist,]) => (dist < 50000 && dist > 1))
      .sort((a,b) => a[0]-b[0])
      .slice(0,8)
      .map(([dist,ad]) => (
        <p key={ad.codeIcao}>
          <Link to={`/airfields/${ad.codeIcao}`}>
            {ad.name} - {ad.codeIcao} {Math.round(dist/1000)} km
          </Link>
        </p>
      ))
  }
  const nearbyActivities = (airfield: Airfield) => {
    return [...activities]
      .map(([id,ad]) => [haversineDistance(airfield.position,ad.position), ad, id] as [number, Activity,string])
      .filter(([dist,]) => dist < 10000)
      .sort((a,b) => a[0]-b[0])
      .map(([dist,ad,id]) => (
        <p key={id}>
          <Link to={`/activities/${id}`}>
            {ad.name} {dist > 1500 ? `${Math.round(dist/1000)}km` : `${Math.round(dist/100)*100}m`}
          </Link>
        </p>
      ))
  }
  return airfields.size > 0 ? airfield ? (<>
    <h1>Fiche {airfield.name} - {airfield.codeIcao}</h1>
    <p>{airfield.description}</p>
    <a target='_blank' href={getVacUrl(airfield.codeIcao)}>Carte VAC</a>
    <p>Statut: {airfield.status}</p>
    <div><h4>Pistes</h4> {airfield.runways.map((r,i) => (<div key={i}>{r.designation} - {r.length}m</div>))}</div>
    <div><h4>Terrains proches</h4>{nearbyAirfields(airfield)}</div>
    <div><h4>Activités proches</h4>{nearbyActivities(airfield)}</div>
  </>) : (
    <p>Pas de terrain trouvé</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default AirfieldDetails