import { useParams } from "react-router-dom";
import { Activity, Airfield } from "..";
import { Group, Paper, Text, Title } from "@mantine/core";
import { findNearest, iconsList } from "../utils";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";
import { NearbyAirfields } from "../components/AirfieldUtils";
import { generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

const ActivityDetails = ({activities, airfields} : {activities:Map<string,Activity>, airfields:Map<string,Airfield>}) => {
  const params = useParams();
  const activity = params.activityId ? activities.get(params.activityId) : undefined;


  return activities.size > 0 ? activity ? (<>
    <Title order={1}><BackButton />Fiche {activity.name} <EditButton /></Title>
    <Text>{activity.type.map<React.ReactNode>(t => (<span key={t}>{iconsList.get(t)?.label} </span>)).reduce((a,b) => [a,' - ',b])}</Text>
    <Group justify="space-evenly" grow align="baseline">
      {activity.description != undefined && <Paper 
        bg="gray.1" mt={"md"}
        className="tiptap-content"
        dangerouslySetInnerHTML={{__html: generateHTML(activity.description,[StarterKit,Link, Image])}} 
      />}
      <NearbyAirfields items={findNearest(activity, airfields, 50000).slice(0,8)} />
    </Group>
  </>) : (
    <p>Activité/lieu inconnu</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default ActivityDetails