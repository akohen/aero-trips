import { Profile } from ".."
import {  Text, Tooltip } from "@mantine/core"
import { IconHeart, IconHeartFilled, IconStar, IconStarFilled } from "@tabler/icons-react"

interface FavoriteButtonProps {
  item: { type: "activities" | "airfields", id: string };
  profile: Profile;
  icon?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({item, profile, icon}) => {
  const isFavorite = profile.favorites?.some((v) => v.id === item.id);
  const removeFavorite = () => profile.update({ favorites: profile.favorites?.filter((v) => v.id !== item.id) })
  const addFavorite = () => profile.update({ favorites: (profile.favorites ?? []).concat([item]) })

  if(icon) return (isFavorite ? 
    <Tooltip label="Retirer des favoris">
      <IconStarFilled onClick={removeFavorite} className='clickable title-button'/>
    </Tooltip>
    : 
    <Tooltip label="Ajouter aux favoris">
      <IconStar onClick={addFavorite} className='clickable title-button' color='gray' />
    </Tooltip>

  );

  return (isFavorite ? 
    <Text onClick={removeFavorite}>
      Retirer des favoris<IconHeartFilled size={20} />
    </Text>
  : 
    <Text onClick={addFavorite}>
      Ajouter aux favoris<IconHeart size={20} />
    </Text>
  )
}

export default FavoriteButton