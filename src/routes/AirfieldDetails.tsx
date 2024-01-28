import { useParams } from "react-router-dom";
import { Flex, Group, Paper, Text, Title } from "@mantine/core";
import { findNearest, iconsList } from "../utils";
import EditButton from "../components/EditButton";
import BackButton from "../components/BackButton";
import { Data } from "..";
import { NearbyActivities } from "../components/ActivityUtils";
import { NearbyAirfields } from "../components/AirfieldUtils";
import { ButtonViewOnMap, ButtonVACMap } from "../components/CommonButtons";
import { generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

const AirfieldDetails = ({airfields, activities} : Data) => {
  const params = useParams();
  const airfield = params.airfieldId ? airfields.get(params.airfieldId) : undefined;
  
  return airfields.size > 0 ? airfield ? (<>
    <Title order={1}><BackButton />Fiche {airfield.name} - {airfield.codeIcao} <EditButton /></Title>
    <Text {...(airfield.status != 'CAP' ? {c:'red',fw:'bold'} : {})}>{iconsList.get(airfield.status)?.label}</Text>
    <Group 
      justify="space-evenly"
      align="baseline"
      grow
      preventGrowOverflow={false} wrap="wrap"
    >
      <NearbyAirfields items={findNearest(airfield, airfields, 50000).slice(0,8)} />
      <NearbyActivities items={findNearest(airfield, activities).slice(0,8)} />
      <Flex
        bg="gray.1"
        gap="sm"
        justify="center"
        align="center"
        direction="column"
        wrap="wrap"
      >
        <div>
          <Title order={4}>Pistes</Title>
          {airfield.runways.map((r,i) => (<div key={i}>{r.designation} - {r.length}m</div>))}
        </div>
        <ButtonVACMap airfield={airfield} />
        <ButtonViewOnMap item={airfield} />
      </Flex>
    </Group>
    {airfield.description != undefined && <Paper 
        bg="gray.1" mt={"md"}
        className="tiptap-content"
        dangerouslySetInnerHTML={{__html: generateHTML(airfield.description,[StarterKit,Link, Image])}} 
      />}
  </>) : (
    <p>Pas de terrain trouvé</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default AirfieldDetails