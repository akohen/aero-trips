import { Airfield, Profile } from ".."
import { addFavorite, removeFavorite } from "../data/profileUtils"
import { Text } from "@mantine/core"
import { IconHeart, IconHeartFilled } from "@tabler/icons-react"

const FavoriteButton = ({item, profile} : {item: Airfield, profile: Profile}) => {
  return (profile?.favorites?.includes(item.codeIcao) ? 
  <Text onClick={() => removeFavorite(profile, item.codeIcao)}>Retirer des favoris<IconHeartFilled size={20} /></Text>
  : 
  <Text onClick={() => addFavorite(profile, item.codeIcao)}>Ajouter aux favoris<IconHeart size={20} /></Text>)
}

export default FavoriteButton