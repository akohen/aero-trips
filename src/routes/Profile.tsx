import { Button } from "@mantine/core"
import { IconLogout, IconBrandGoogleFilled } from "@tabler/icons-react"
import { Data } from ".."
import { googleLogout, googleLogin } from "../data/firebase"

const Profile = ({profile} : Data) => {
  return (<>
  <h1>Votre profil utilisateur</h1>
  <div className="card">
    { profile ? 
      <p>Connecté en tant que {profile.displayName} <Button leftSection={<IconLogout />} onClick={googleLogout} variant='filled'>Déconnexion</Button></p> :
      <p><Button leftSection={<IconBrandGoogleFilled />} onClick={googleLogin} variant='filled'>Se connecter avec Google</Button></p>
    }
  </div>
</>)}

export default Profile

