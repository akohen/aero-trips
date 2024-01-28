import { Button } from "@mantine/core";
import { IconMapCheck, IconMapPinSearch } from "@tabler/icons-react";
import { GeoPoint } from "firebase/firestore";
import { Link } from "react-router-dom";
import { getVacUrl } from "../data/airac";
import { Airfield } from "..";

export const ButtonViewOnMap = ({item, compact}:{item:{position:GeoPoint}, compact?: boolean}) => (
  <Button
    component={Link}
    to={`/map/${item.position.latitude}/${item.position.longitude}`}
    size={compact ? "compact-sm" : 'sm'}
    leftSection={<IconMapPinSearch size={20} />}
  >
    Voir sur la carte
  </Button>
)

export const ButtonVACMap = ({airfield, compact}: {airfield:Airfield, compact?:boolean}) => (
  <Button
    component={Link}
    to={getVacUrl(airfield.codeIcao)}
    target='_blank'
    size={compact ? "compact-sm" : 'sm'}
    leftSection={<IconMapCheck size={20} />}
  >
    Carte VAC
  </Button>
)