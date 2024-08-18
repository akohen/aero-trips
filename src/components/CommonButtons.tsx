import { Button } from "@mantine/core";
import { IconMapCheck, IconMapPinSearch } from "@tabler/icons-react";
import { GeoPoint } from "firebase/firestore";
import { Link } from "react-router-dom";
import { getVacUrl } from "../data/airac";
import { Airfield, MapView } from "..";

export const ButtonViewOnMap = ({item, setMapView, compact}:{item:{position:GeoPoint}, compact?: boolean, setMapView: (v:MapView) => void}) => (
  <Button
    component={Link}
    to={`/map`}
    size={compact ? "compact-sm" : 'sm'}
    leftSection={<IconMapPinSearch size={20} />}
    onClick={() => setMapView({center:[item.position.latitude, item.position.longitude], zoom: 12})}
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