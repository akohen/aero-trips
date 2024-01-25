import { Link, useParams } from "react-router-dom";
import { Activity, Airfield, Data } from "../types";
import { getVacUrl } from "../data/airac";
import haversineDistance from "haversine-distance";
import { Button, Group, Space, Text, Title } from "@mantine/core";
import { getAirfieldStatus } from "../utils";
import { IconMapCheck } from "@tabler/icons-react";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";

const AirfieldDetails = ({airfields, activities} : Data) => {
  const params = useParams();
  const airfield = params.airfieldId ? airfields.get(params.airfieldId) : undefined;
  const nearbyAirfields = (airfield: Airfield) => {
    return [...airfields]
      .map(([,ad]) => [haversineDistance(airfield.position,ad.position), ad] as [number, Airfield])
      .filter(([dist,]) => (dist < 50000 && dist > 1))
      .sort((a,b) => a[0]-b[0])
      .slice(0,8)
      .map(([dist,ad]) => (
        <p key={ad.codeIcao}>
          <Link to={`/airfields/${ad.codeIcao}`}>
            {ad.name} - {ad.codeIcao} {Math.round(dist/1000)} km
          </Link>
        </p>
      ))
  }
  const nearbyActivities = (airfield: Airfield) => {
    return [...activities]
      .map(([id,ad]) => [haversineDistance(airfield.position,ad.position), ad, id] as [number, Activity,string])
      .filter(([dist,]) => dist < 10000)
      .sort((a,b) => a[0]-b[0])
      .map(([dist,ad,id]) => (
        <p key={id}>
          <Link to={`/activities/${id}`}>
            {ad.name} {dist > 1500 ? `${Math.round(dist/1000)}km` : `${Math.round(dist/100)*100}m`}
          </Link>
        </p>
      ))
  }
  return airfields.size > 0 ? airfield ? (<>
    <Title order={1}><BackButton />Fiche {airfield.name} - {airfield.codeIcao} <EditButton /></Title>
    <Text {...(airfield.status != 'CAP' ? {c:'red',fw:'bold'} : {})}>{getAirfieldStatus(airfield.status)}</Text>
    <Space mt={"md"}/>
    <Group justify="space-evenly">
      <div><Link to={getVacUrl(airfield.codeIcao)} target="_blank"><Button leftSection={<IconMapCheck size={20}/>} variant="default">Carte VAC</Button></Link></div>
      <div><Title order={4}>Pistes</Title> {airfield.runways.map((r,i) => (<div key={i}>{r.designation} - {r.length}m</div>))}</div>
    </Group>
    <Group justify="space-evenly" align="top">
      <div><Title order={4}>Terrains proches</Title>{nearbyAirfields(airfield)}</div>
      <div><Title order={4}>Activités proches</Title>{nearbyActivities(airfield)}</div>
    </Group>
    <div dangerouslySetInnerHTML={{__html: airfield.description!}} />
    
    
  </>) : (
    <p>Pas de terrain trouvé</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default AirfieldDetails