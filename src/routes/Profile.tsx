import { Button, Fieldset, TextInput } from "@mantine/core"
import { IconLogout, IconBrandGoogleFilled } from "@tabler/icons-react"
import { Data } from ".."
import { googleLogout, googleLogin } from "../data/firebase"
import { useForm } from "@mantine/form"

const Profile = ({profile} : Data) => {
  const form = useForm({
    initialValues: {
      displayName: '',
    },
    validate: {
      displayName: (value: string) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
    }
  });


  return (<>
  <h1>Votre profil utilisateur</h1>
  <div className="card">
    { profile ? 
      <>
        <form onSubmit={form.onSubmit(v => {console.log(v)})}>
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

