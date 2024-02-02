import { useParams } from "react-router-dom";
import { Data } from "..";
import { Paper, Text, Title } from "@mantine/core";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";
import { generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"

const TripDetails = ({trips} : Data) => {
  const params = useParams();
  const trip = params.tripId ? trips.get(params.tripId) : undefined;
  const tripTypes = {short:'Vol de quelques heures', day:'Sortie à la journée', multi:'Voyage sur plusieurs jours'}
  
  return trips.size > 0 ? trip ? (<>
    <Title><BackButton />Fiche {trip.name} <EditButton /></Title>
    <Text>{tripTypes[trip.type]}</Text>
    {trip.steps.map((step,i) =>(<Text key={i}>{step.id}</Text>))}

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