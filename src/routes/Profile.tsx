import { Button, Fieldset, Paper, Select, TextInput, Title, Text, Grid, Group, Popover } from "@mantine/core"
import { IconBrandGoogleFilled, IconShare } from "@tabler/icons-react"
import { Data } from ".."
import { googleLogin } from "../data/firebase"
import { useForm } from "@mantine/form"
import { useEffect } from "react"
import { AirfieldTitle } from "../components/AirfieldUtils"
import { Link } from "react-router-dom"
import BackButton from "../components/BackButton"
import { useDisclosure } from "@mantine/hooks"
import ListPanel from "../components/ListPanel"
import { TripTitle } from "../components/TripsUtils"
import { ActivityTitle } from "../components/ActivityUtils"

const Profile = ({profile, airfields, activities, trips} : Data) => {
  const [openedShare, { toggle: toggleShare}] = useDisclosure(false)
  const share = () => {
    navigator.clipboard.writeText(location.href + `/${profile?.uid}`);
    toggleShare();
  }

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
    return <Text size="sm" className="ad-list"><Link to={`/airfields/${ad.codeIcao}`}>{ad.codeIcao} <AirfieldTitle ad={ad} /></Link></Text>
  }

  const ActivityLink = ({id}: {id: string}) => {
    const act = activities.get(id)
    if(!act) return 'Terrain inconnu'
    return <Text size="sm" className="ad-list"><Link to={`/activities/${id}`}><ActivityTitle activity={act} /></Link></Text>
  }
  
  const visitedAirfields = profile?.visited?.filter(v => v.type === 'airfields')
  const sharedTrips = [...trips].filter(([, trip]) => trip.uid === profile?.uid);
  const favoriteAirfields = profile?.favorites?.filter(f => f.type === 'airfields');
  const favoriteActivities = profile?.favorites?.filter(f => f.type === 'activities');

  return (profile ? <>
  <Title order={1}><BackButton />Votre profil utilisateur</Title>
  <Grid grow mt="md">
    <Grid.Col span={6}>
      <ListPanel title={`Terrains visités (${visitedAirfields?.length})`}>
        { visitedAirfields?.map( v => <AirfieldLink id={v.id}/>) }
      </ListPanel>
    </Grid.Col>
    <Grid.Col span={6}>
      <ListPanel title={`Sorties partagées (${sharedTrips?.length})`}>
        { sharedTrips?.map( ([key,trip]) => <Link to={`/trips/${key}`}><TripTitle trip={trip} details /></Link>) }
      </ListPanel>
    </Grid.Col>
    <Grid.Col span={6}>
      <ListPanel title={`Terrains favoris (${favoriteAirfields?.length})`}>
        { favoriteAirfields?.map( v => <AirfieldLink id={v.id}/>) }
      </ListPanel>
    </Grid.Col>
    <Grid.Col span={6}>
      <ListPanel title={`Activités favorites (${favoriteActivities?.length})`}>
        { favoriteActivities?.map( v => <ActivityLink id={v.id}/>) }
      </ListPanel>
    </Grid.Col>
  </Grid>
  
  <Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
    <Fieldset legend='Profil public'>
      <Group justify="left">
        <Link to={`/profile/${profile.uid}`}>Voir mon profil public</Link>
        <Popover width={200} position="bottom" withArrow shadow="md" opened={openedShare} onChange={toggleShare}>
          <Popover.Target>
            <Button onClick={share} leftSection={<IconShare size={18} />}>
              Partager
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Text size="xs">L'URL de votre profil public a été copiée dans le presse-papier.</Text>
          </Popover.Dropdown>
        </Popover>
      </Group>
      
    </Fieldset>
      <form onSubmit={form.onSubmit(saveProfile)}>
        <Fieldset legend='Modifier vos informations' mt={"md"}>
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

