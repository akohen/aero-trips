import { Button, em } from "@mantine/core";
import { IconMapCheck, IconMapPinSearch } from "@tabler/icons-react";
import { GeoPoint } from "firebase/firestore";
import { Link } from "react-router-dom";
import { getVacUrl } from "../data/airac";
import { Airfield, MapView } from "..";
import { useMediaQuery } from "@mantine/hooks";

export const ButtonViewOnMap = ({item, setMapView, compact}:{item:{position:GeoPoint}, compact?: boolean, setMapView: (v:MapView) => void}) => {
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`);
  return (
  <Button
    component={Link}
    to={`/map`}
    size={compact ? "compact-sm" : 'sm'}
    leftSection={isMobile ? undefined : <IconMapPinSearch size={20} />}
    onClick={() => setMapView({center:[item.position.latitude, item.position.longitude], zoom: 12})}
  >
    {isMobile ? <IconMapPinSearch size={20} /> : 'Voir sur la carte'}
  </Button>
)}

export const ButtonVACMap = ({airfield, compact}: {airfield:Airfield, compact?:boolean}) => {
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`);
  return (
  <Button
    component={Link}
    to={getVacUrl(airfield.codeIcao)}
    target='_blank'
    size={compact ? "compact-sm" : 'sm'}
    leftSection={isMobile ? undefined : <IconMapCheck size={20} />}
    title={`Voir la carte VAC de ${airfield.codeIcao} - ${airfield.name} dans un nouvel onglet`}
  >
    {isMobile ? <IconMapCheck size={20} /> : 'Carte VAC'}
  </Button>
)}