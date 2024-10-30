import { Airfield, Profile } from ".."
import { Text } from "@mantine/core"
import { IconHeart, IconHeartFilled } from "@tabler/icons-react"

const FavoriteButton = ({item, profile} : {item: Airfield, profile: Profile}) => {
  return (profile?.favorites?.includes(item.codeIcao) ? 
    <Text onClick={() => 
      profile.update({favorites: profile.favorites?.filter(e => e != item.codeIcao)})
    }>
      Retirer des favoris<IconHeartFilled size={20} />
    </Text>
  : 
    <Text onClick={() => 
      profile.update({favorites:[...new Set((profile.favorites ?? []).concat([item.codeIcao]))]})
    }>
      Ajouter aux favoris<IconHeart size={20} />
    </Text>
  )
}

export default FavoriteButton