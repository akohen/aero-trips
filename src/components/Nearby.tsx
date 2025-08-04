import { Grid, Title, Flex } from "@mantine/core"
import { Activity, Airfield, Profile } from ".."
import ItemCard from "./ItemCard"

export const Nearby = ({items, profile} : 
  {items: [distance: number, item: Activity|Airfield, id: string][], profile?:Profile}) => {
  if(items.length == 0) return
  return (
  <Grid.Col span={12}>
    <Title order={4}>A proximité</Title>
    <Flex mt='md' gap="xs" wrap="wrap">
      { items
        .sort((a,b) => a[0]-b[0])
        .map(([dist, item, id]) => <ItemCard key={id} item={item} distance={dist} profile={profile} />) }
    </Flex>
  </Grid.Col>
)}