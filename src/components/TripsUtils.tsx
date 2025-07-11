import { Text } from "@mantine/core";
import { Trip } from "..";
import { CommonIcon } from "./CommonIcon";
import dayjs from "dayjs";

export const TripTitle = ({trip, details}: {trip: Trip, details?: boolean}) => (
  <Text size="sm" className="list-item-title">
    {trip.name}
    {trip.tags?.map((e,i) => <CommonIcon iconType={e} key={i} /> )}
    {details && 
      ' - ' + (trip.type === 'short' ? 'Quelques heures' : trip.type === 'day' ? 'A la journée' : 'Sur plusieurs jours')
      + ' - ' + (trip.date ? dayjs(trip.date.toMillis()).format('MMMM YYYY') : 'En projet')
    }
  </Text>)