import { Grid, Paper, Stack, Text, Title } from "@mantine/core";
import { Activity, Event, Profile, Trip } from "..";
import { Link } from "react-router-dom";
import { CommonIcon } from "./CommonIcon";
import { TripTitle } from "./TripsUtils";
import { formatDate } from "../utils/utils";

export const ActivityTitle = ({activity, profile}: {activity: Activity, profile?: Profile}) => (
<>
  {activity.name}
  {activity.type.map((e,i) => <CommonIcon iconType={e} key={i} /> )}
  {profile?.visited?.find(v => v.type == 'activities' && v.id == activity.id) && <CommonIcon iconType="visited" />}
  {profile?.favorites?.find(v => v.type == 'activities' && v.id == activity.id) && <CommonIcon iconType="favorite" />}
</>)

export const NearbyTrips = ({items, events} : {items: [id: string, trip: Trip][], events: Event[]}) => {
  if(items.length == 0 && events.length == 0) return
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
  <Stack gap={"xs"}>
    {events.length > 0 && <div>
      <Title order={4} mt={items.length > 0 ? "xs" : undefined}>Événements</Title>
      {events.map((e: Event) => (
        <Link key={e.id} to={`/events/${e.id}`}>
        <Text size="sm">
          {e.title}&nbsp;
          <Text size="xs" component="span">
            ({e.endDate ? `${formatDate(e.startDate)} → ${formatDate(e.endDate)}` : formatDate(e.startDate)})
          </Text>
        </Text>
        </Link>
      ))}
    </div>}

    {items.length > 0 && <div>
      <Title order={4}>Sorties</Title>
      { items.map(([id, trip]) => (
        <Link key={id} to={`/trips/${id}`}>
          <TripTitle trip={trip} />
        </Link>
      ))}
    </div>}
  </Stack>
  </Paper>
  </Grid.Col>
)}
