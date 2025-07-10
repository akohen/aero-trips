import { Text } from "@mantine/core";
import { Trip } from "..";
import { CommonIcon } from "./CommonIcon";

export const TripTitle = ({trip}: {trip: Trip}) => (
  <Text size="sm" className="list-item-title">
    {trip.name}
    {trip.tags?.map((e,i) => <CommonIcon iconType={e} key={i} /> )}
  </Text>)