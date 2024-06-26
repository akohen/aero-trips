import { Grid, Paper, Text, Title } from "@mantine/core";
import { Activity, Trip } from "..";
import { Link } from "react-router-dom";
import { CommonIcon } from "./CommonIcon";

export const ActivityTitle = ({activity}: {activity: Activity}) => (
<Text span size="sm" className="list-item-title">
  {activity.name}
  {activity.type.map((e,i) => <CommonIcon iconType={e} key={i} /> )}
</Text>)

export const NearbyActivities = ({items} : {items: [distance: number, item: Activity, id: string][]}) => {
  if(items.length == 0) return
  return (
  <Grid.Col span={3}>
  <Paper 
    shadow="md"
    radius="md"
    p='xs'
    withBorder
    bg="gray.0"
    className="nearby"
  >
    <Title order={4}>Activités proches</Title>
    { items.map(([dist, activity, id]) => (
        <Text key={id}>
          <Link to={`/activities/${id}`}>
            <ActivityTitle activity={activity} /><Text span size="sm"> à {dist > 2500 ? `${Math.round(dist/1000)}km` : `${Math.round(dist/100)*100}m`}</Text>
          </Link>
        </Text>
    ))}
  </Paper>
  </Grid.Col>
)}

export const NearbyTrips = ({items} : {items: [id: string, trip: Trip][]}) => {
  if(items.length == 0) return
  return (
  <Grid.Col span={3}>
  <Paper 
    shadow="md"
    radius="md"
    p='xs'
    withBorder
    bg="gray.0"
    className="nearby"
  >
    <Title order={4}>Sorties</Title>
    { items.map(([id, trip]) => (
        <Text key={id}>
          <Link to={`/trips/${id}`}>
            <Text span size="sm">{trip.name}</Text>
          </Link>
        </Text>
    ))}
  </Paper>
  </Grid.Col>
)}
