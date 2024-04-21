import { Button, Fieldset, TextInput } from "@mantine/core"
import { IconLogout, IconBrandGoogleFilled } from "@tabler/icons-react"
import { Data } from ".."
import { googleLogout, googleLogin, db } from "../data/firebase"
import { useForm } from "@mantine/form"
import { useEffect } from "react"
import { doc, setDoc } from "firebase/firestore"

const Profile = ({profile, setProfile} : Data) => {

  const form = useForm({
    initialValues: {
      displayName: profile?.displayName || '',
    },
    validate: {
      displayName: (value: string) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
    }
  });

  useEffect(() => {
    if(profile != null) {
      form.setInitialValues({displayName:profile.displayName})
      form.setValues({displayName:profile.displayName})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const saveProfile = (values: typeof form.values) => {
    if(!profile) return
    setDoc(doc(db, "profiles", profile.uid), {displayName:values.displayName},{merge:true})
    setProfile({...profile, ...values})
  }

  return (<>
  <h1>Votre profil utilisateur</h1>
  <div className="card">
    { profile ? 
      <>
        <form onSubmit={form.onSubmit(saveProfile)}>
        <Fieldset legend='Modifier vos informations'>
        <TextInput
            label="Votre nom ou pseudo"
            {...form.getInputProps('displayName')}
            />
        <Button mt="md" type="submit">Enregistrer</Button>
        </Fieldset>
        </form>
        Connecté en tant que {profile.displayName} <Button leftSection={<IconLogout />} onClick={googleLogout} variant='filled'>Déconnexion</Button>
      </> :
      <p><Button leftSection={<IconBrandGoogleFilled />} onClick={googleLogin} variant='filled'>Se connecter avec Google</Button></p>
    }
  </div>
</>)}

export default Profile

