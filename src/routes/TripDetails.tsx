import { Link as RouterLink, useParams } from "react-router-dom";
import { Airfield, Data, Trip } from "..";
import { Paper, Title } from "@mantine/core";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";
import { generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"

const TripDetails = ({trips, airfields} : Data) => {
  const params = useParams();
  const trip = params.tripId ? trips.get(params.tripId) : undefined;
  const showAD = (ad: Airfield) => (<RouterLink to={`/airfields/${ad.codeIcao}`}>{ad.name} - {ad.codeIcao}</RouterLink>)
  const route = (trip: Trip) => {
    const startAD = airfields.get(trip.from!)
    const endAD = airfields.get(trip.to)
    return (<p>
      {startAD && <>Depuis {showAD(startAD)} </>}
      jusqu'à {showAD(endAD!)}
    </p>)
  }
  return trips.size > 0 ? trip ? (<>
    <Title><BackButton />Fiche {trip.name} <EditButton /></Title>
    <p>{trip.type}</p>
    {route(trip)}
    {trip.description != undefined && <Paper 
    bg="gray.1" mt={"md"}
    className="tiptap-content"
    dangerouslySetInnerHTML={{__html: generateHTML(trip.description,[StarterKit,Link, Image])}} 
  />}
    
  </>) : (
    <p>Activité/lieu inconnu</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default TripDetails