import { Button, Fieldset, Paper, Select, TextInput, Title, Text } from "@mantine/core"
import { IconBrandGoogleFilled } from "@tabler/icons-react"
import { Data } from ".."
import { googleLogin } from "../data/firebase"
import { useForm } from "@mantine/form"
import { useEffect } from "react"
import { AirfieldTitle } from "../components/AirfieldUtils"
import { Link } from "react-router-dom"

const Profile = ({profile, airfields} : Data) => {

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
    profile.update({displayName:values.displayName, homebase:values.homebase})
  }

  const AirfieldLink = ({id}: {id: string}) => {
    const ad = airfields.get(id)
    if(!ad) return 'Terrain inconnu'
    return <Text size="sm" className="ad-list"><Link to={`/airfields/${ad.codeIcao}`}>{ad.codeIcao} <AirfieldTitle ad={ad}/></Link></Text>
  }
  const visitedAirfields = profile?.visited?.filter(v => v.type === 'airfields')

  return (profile ? <>
  <h1>Votre profil utilisateur</h1>
  <Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
    <Title order={4}>Terrains visités ({visitedAirfields?.length})</Title>
    <ul>
      { visitedAirfields?.map( (v, i) => (
        <li key={i}><AirfieldLink id={v.id}/></li>
      ))}
    </ul>
  </Paper>
  <Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
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
  </Paper>
</> 
: 
  <Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
    <p><Button leftSection={<IconBrandGoogleFilled />} onClick={googleLogin} variant='filled'>Se connecter avec Google</Button></p>
  </Paper>
)}

export default Profile

