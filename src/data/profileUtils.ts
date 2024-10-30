import { Profile } from ".."

export const addFavorite = (profile: Profile | null, favorite: string) => {
  if(!profile) return
  const favorites = [...new Set((profile.favorites ? profile.favorites : []).concat([favorite]))]
  profile.update({favorites})
}

export const removeFavorite = (profile: Profile | null, favorite: string) => {
  if(!profile) return
  const favorites = profile.favorites?.filter(e => e != favorite)
  profile.update({favorites})
}