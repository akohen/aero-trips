import { SimpleGrid } from "@mantine/core"
import { Activity, Airfield, Profile } from ".."
import CardListItem from "./CardListItem"
import { getItemImageUrl, getItemLink, getItemCardConfig } from "../utils/itemCardConfig"

export const Nearby = ({items, profile} :
  {items: [distance: number, item: Activity|Airfield, id: string][], profile?:Profile}) => {
  if(items.length == 0) return
  return (
    <SimpleGrid mt='md' cols={{ base: 1, sm: 2, md: 4 }}>
      { items
        .sort((a,b) => a[0]-b[0])
        .map(([dist, item, id]) => (
          <CardListItem
            key={id}
            item={item}
            imgUrl={getItemImageUrl(item)}
            link={getItemLink(item)}
            cardConfig={getItemCardConfig({ distance: dist, profile })}
            itemKey={id}
          />
        )) }
    </SimpleGrid>
  )
}
