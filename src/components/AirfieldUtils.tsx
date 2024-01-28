import { IconGasStation } from "@tabler/icons-react";
import { Airfield } from "..";
import { Paper, Title, Text } from "@mantine/core";
import { Link } from "react-router-dom";
import { CommonIcon } from "./CommonIcon";


export const AirfieldTitle = ({ad}: {ad: Airfield}) => {
  return (<><CommonIcon iconType={ad.status} /> {ad.name} {ad.fuels?.includes('100LL') ? <IconGasStation size={16} style={{verticalAlign:'middle'}} /> : undefined}</>)
}

export const NearbyAirfields = ({items} : {items: [distance: number, item: Airfield, id: string][]}) => (
  items.length > 0 && <Paper bg="gray.1">
    <Title order={4}>Terrains proches</Title>
    { items.map(([dist,ad]) => (
      <Text key={ad.codeIcao}>
        <Link to={`/airfields/${ad.codeIcao}`}>{Math.round(dist/1000)} km {ad.codeIcao} <AirfieldTitle ad={ad}/></Link>
      </Text>
    ))}
  </Paper>
  
)
