import { Grid, Title, Flex } from "@mantine/core"
import { Activity, Airfield, Profile } from ".."
import ActivityCard from "./ActivityCard"
import AirfieldCard from "./AirfieldCard"

export const Nearby = ({items, profile} : 
  {items: [distance: number, item: Activity|Airfield, id: string][], profile?:Profile}) => {
  if(items.length == 0) return
  return (
  <Grid.Col span={12}>
    <Title order={4}>A proximité</Title>
    <Flex mt='md' gap="xs" wrap="wrap">
      { items.map(([dist, item, id]) => (
        'codeIcao' in item ? 
        <AirfieldCard key={id} airfield={item} distance={dist} profile={profile} /> :
        <ActivityCard key={id} activity={item} distance={dist} profile={profile} />
      ))}
    </Flex>
  </Grid.Col>
)}