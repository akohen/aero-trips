import { Grid, Paper, Text, Title } from "@mantine/core";
import { Activity, Profile, Trip } from "..";
import { Link } from "react-router-dom";
import { CommonIcon } from "./CommonIcon";
import { TripTitle } from "./TripsUtils";

export const ActivityTitle = ({activity, profile}: {activity: Activity, profile?: Profile}) => (
<Text span size="sm" className="list-item-title">
  {activity.name}
  {activity.type.map((e,i) => <CommonIcon iconType={e} key={i} /> )}
  {profile?.visited?.find(v => v.type == 'activities' && v.id == activity.id) && <CommonIcon iconType="visited" />}
  {profile?.favorites?.find(v => v.type == 'activities' && v.id == activity.id) && <CommonIcon iconType="favorite" />}
</Text>)

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
      <Link key={id} to={`/trips/${id}`}>
        <TripTitle trip={trip} />
      </Link>
    ))}
  </Paper>
  </Grid.Col>
)}
