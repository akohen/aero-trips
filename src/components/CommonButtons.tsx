import { Button } from "@mantine/core";
import { IconMapPinSearch } from "@tabler/icons-react";
import { GeoPoint } from "firebase/firestore";
import { Link } from "react-router-dom";

export const ViewOnMap = ({item}:{item:{position:GeoPoint}}) => (
  <Button
    component={Link}
    to={`/map/${item.position.latitude}/${item.position.longitude}`}
    size="compact-sm"
    leftSection={<IconMapPinSearch size={20} />}
  >
    Voir sur la carte
  </Button>
)