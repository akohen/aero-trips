import { Airfield, Profile } from ".."
import { addFavorite, removeFavorite } from "../data/profileUtils"
import { Text } from "@mantine/core"
import { IconHeart, IconHeartFilled } from "@tabler/icons-react"

const FavoriteButton = ({item, profile, setProfile} : {item: Airfield, profile: Profile, setProfile:(user: Profile | null) => void}) => {
  return (profile?.favorites?.includes(item.codeIcao) ? 
  <Text onClick={() => removeFavorite(profile, setProfile, item.codeIcao)}>Retirer des favoris<IconHeartFilled size={20} /></Text>
  : 
  <Text onClick={() => addFavorite(profile, setProfile, item.codeIcao)}>Ajouter aux favoris<IconHeart size={20} /></Text>)
}

export default FavoriteButton