import { useCallback, useEffect, useState } from "react"
import { Profile } from ".."
import { auth } from "../data/firebase"

/**
 * Whether the signed-in user holds the `admin` custom claim (`npm run set-admin`): undefined while the
 * token is read. A claim granted after sign-in only shows up in a new token: `refresh` forces one.
 * The UI only hides or shows things: firestore.rules and the callable check the claim themselves.
 */
export const useIsAdmin = (profile: Profile | undefined) => {
  const [claim, setClaim] = useState<{ uid: string, admin: boolean }>()
  const uid = profile?.uid

  const read = useCallback(async (forceRefresh: boolean) => {
    const user = auth?.currentUser
    if (!user || user.uid !== uid) return
    const admin = await user.getIdTokenResult(forceRefresh)
      .then(token => token.claims.admin === true)
      .catch(() => false)
    setClaim({ uid: user.uid, admin })
  }, [uid])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    read(false)
  }, [read])

  const isAdmin = !uid ? false : claim?.uid === uid ? claim.admin : undefined
  return { isAdmin, refresh: () => read(true) }
}
