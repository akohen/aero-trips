import { Button, Fieldset, Select, TextInput } from "@mantine/core"
import { IconBrandGoogleFilled } from "@tabler/icons-react"
import { Data } from ".."
import { googleLogin, db } from "../data/firebase"
import { useForm } from "@mantine/form"
import { useEffect } from "react"
import { doc, setDoc } from "firebase/firestore"

const Profile = ({profile, setProfile, airfields} : Data) => {

  const data = [...airfields].map(([id, ad]) => (
    {label: `${ad.codeIcao} - ${ad.name}`, value:id}
  ))  

  const form = useForm({
    initialValues: {
      displayName: profile?.displayName || '',
      homebase: profile?.homebase || '',
    },
    validate: {
      displayName: (value: string) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
    }
  });

  useEffect(() => {
    if(profile != null) {
      form.setInitialValues({displayName:profile.displayName, homebase:profile.homebase||''})
      form.setValues({displayName:profile.displayName, homebase:profile.homebase})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const saveProfile = (values: typeof form.values) => {
    if(!profile) return
    setDoc(doc(db, "profiles", profile.uid), {
      displayName: values.displayName,
      homebase: values.homebase,
    }, {merge:true})
    setProfile({...profile, ...values})
  }

  return (<>
  <h1>Votre profil utilisateur</h1>
  <div className="card">
    { profile ? 
      <form onSubmit={form.onSubmit(saveProfile)}>
        <Fieldset legend='Modifier vos informations'>
        <TextInput
          label="Votre nom ou pseudo"
          {...form.getInputProps('displayName')}
        />
        <Select
          mt="md"
          {...form.getInputProps('homebase')}
          label="Votre terrain"
          placeholder="Entrez le nom ou le code OACI"
          data={data}
          searchable
          clearable
        />
        <Button mt="md" type="submit">Enregistrer</Button>
        </Fieldset>
      </form>
      :
      <p><Button leftSection={<IconBrandGoogleFilled />} onClick={googleLogin} variant='filled'>Se connecter avec Google</Button></p>
    }
  </div>
</>)}

export default Profile

