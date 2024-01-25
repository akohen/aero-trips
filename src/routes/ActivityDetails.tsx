import { useParams } from "react-router-dom";
import { Activity } from "../types";
import { Space, Text, Title } from "@mantine/core";
import { getActivityType } from "../utils";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";

const ActivityDetails = ({activities} : {activities:Map<string,Activity>}) => {
  const params = useParams();
  const activity = params.activityId ? activities.get(params.activityId) : undefined;
  return activities.size > 0 ? activity ? (<>
    <Title order={1}><BackButton />Fiche {activity.name} <EditButton /></Title>
    <Text>{activity.type.map(t => (<><span key={t}>{getActivityType(t)}</span> </>))}</Text>
    <Space mt={"md"}/>
    <div dangerouslySetInnerHTML={{__html: activity.description!}} />
    
  </>) : (
    <p>Activité/lieu inconnu</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default ActivityDetails