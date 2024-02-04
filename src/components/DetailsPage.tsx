import { Title, Group, Flex, Paper, Text } from "@mantine/core"
import { generateHTML } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import BackButton from "./BackButton"
import EditButton from "./EditButton"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { Activity, Airfield, Trip } from ".."
import { findNearest, iconsList } from "../utils"
import { NearbyActivities, NearbyTrips } from "./ActivityUtils"
import { NearbyAirfields, ToiletText } from "./AirfieldUtils"
import { ButtonVACMap, ButtonViewOnMap } from "./CommonButtons"

const DetailsPage = ({id, item, airfields, activities, trips} : 
{id: string, item: Airfield|Activity, airfields: Map<string,Airfield>, activities:Map<string,Activity>, trips:Map<string,Trip>}) => (<>
  <Title order={1}>
    <BackButton />{item.name} {('codeIcao' in item) && (<> - {item.codeIcao}</>)}
    &nbsp;<EditButton />
  </Title>
  {('codeIcao' in item) ? (
    <Text {...(item.status != 'CAP' ? {c:'red',fw:'bold'} : {})}>{iconsList.get(item.status)?.label}</Text>
  ) : (
    <Text>{item.type.map<React.ReactNode>(t => (<span key={t}>{iconsList.get(t)?.label} </span>)).reduce((a,b) => [a,' - ',b])}</Text>
  )}
  <Group 
    justify="space-evenly"
    align="baseline"
    grow
    preventGrowOverflow={false} wrap="wrap"
  >
    <NearbyAirfields items={findNearest(item, airfields, 50000).slice(0,8)} />
    <NearbyActivities items={findNearest(item, activities).slice(0,8)} />
    <NearbyTrips itemId={id} trips={trips} type={('codeIcao' in item) ? 'airfields' : 'activities'} />

    <Flex
      bg="gray.1"
      gap="sm"
      justify="center"
      align="center"
      direction="column"
      wrap="wrap"
    >
      {('codeIcao' in item) ? (<>
        <div>
          <Title order={4}>Pistes</Title>
          {item.runways.map((r,i) => (<div key={i}>{r.designation} - {r.length}m {r.composition == 'GRASS' ? 'Non revêtue' : 'Revêtue'}</div>))}
        </div>
        {(item.fuels && item.fuels.length > 0) ? `Essences: ${item.fuels?.join(' ')}` : `Pas d'essence disponible`}
        <ToiletText airfield={item} />
        <ButtonVACMap airfield={item} />
        <ButtonViewOnMap item={item} />
      </>):(<>
        <div>
          <ButtonViewOnMap item={item} />
        </div>
      </>)}

      
    </Flex>
  </Group>
  {item.description != undefined && <Paper 
    bg="gray.1" mt={"md"}
    className="tiptap-content"
    dangerouslySetInnerHTML={{__html: generateHTML(item.description,[StarterKit,Link, Image])}} 
  />}
</>)

export default DetailsPage