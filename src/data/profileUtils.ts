import { doc, setDoc } from "firebase/firestore"
import { Profile } from ".."
import { db } from "./firebase"

export const addFavorite = (profile: Profile | null, setProfile: (user: Profile | null) => void, favorite: string) => {
  if(!profile) return
  const favorites = [...new Set((profile.favorites ? profile.favorites : []).concat([favorite]))]
  setDoc(doc(db, "profiles", profile.uid), { favorites }, {merge:true})
  setProfile({...profile, favorites})
}

export const removeFavorite = (profile: Profile | null, setProfile: (user: Profile | null) => void, favorite: string) => {
  if(!profile) return
  const favorites = profile.favorites?.filter(e => e != favorite)
  setDoc(doc(db, "profiles", profile.uid), { favorites }, { merge:true })
  setProfile({...profile, favorites})
}