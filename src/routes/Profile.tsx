import { Button, Center, Fieldset, Loader, Paper, Select, TextInput, Title, Text, Grid, Group, Popover, Switch } from "@mantine/core"
import { IconBrandGoogleFilled, IconShare } from "@tabler/icons-react"
import { Data } from ".."
import { googleLogin } from "../data/firebase"
import { useForm } from "@mantine/form"
import { ReactNode, useEffect, useMemo, useState } from "react"
import { AirfieldTitle } from "../components/AirfieldUtils"
import { Link } from "react-router"
import BackButton from "../components/BackButton"
import { useDisclosure } from "@mantine/hooks"
import ListPanel from "../components/ListPanel"
import { TripTitle } from "../components/TripsUtils"
import { ActivityTitle } from "../components/ActivityUtils"
import PassportBadge from "../components/PassportBadge"
import { titleCase } from "../utils/utils"

const byId = (a: {id: string}, b: {id: string}) => a.id.localeCompare(b.id)

const Profile = ({profile, authLoading, airfields, activities, trips} : Data) => {
  const [openedShare, { toggle: toggleShare, open: openShare }] = useDisclosure(false)
  const [saveStatus, setSaveStatus] = useState<string>()
  const share = () => {
    navigator.clipboard.writeText(`${location.origin}/profile/${profile?.uid}`).then(openShare)
  }

  const data = useMemo(() => [...airfields].map(([id, ad]) => (
    {label: `${ad.codeIcao} - ${titleCase(ad.name)}`, value:id}
  )), [airfields])

  const form = useForm({
    initialValues: {
      displayName: profile?.displayName || '',
      homebase: profile?.homebase || '',
    },
    validate: {
      displayName: (value: string) => (value.length < 2 ? 'Le nom doit avoir au moins 2 caractères' : null),
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
    setSaveStatus(undefined)
    profile.update({displayName:values.displayName, homebase:values.homebase})
      .then(() => setSaveStatus('Vos informations ont été enregistrées.'))
      .catch((e: unknown) => { console.error('[Profile] save', e); setSaveStatus("Une erreur est survenue, veuillez réessayer.") })
  }

  const AirfieldLink = ({id}: {id: string}) => {
    const ad = airfields.get(id)
    if(!ad) return 'Terrain inconnu'
    return <Text size="sm" className="ad-list"><Link to={`/airfields/${ad.codeIcao}`}>{ad.codeIcao} <AirfieldTitle ad={ad} /></Link></Text>
  }

  const ActivityLink = ({id}: {id: string}) => {
    const act = activities.get(id)
    if(!act) return 'Activité inconnue'
    return <Text size="sm" className="ad-list"><Link to={`/activities/${id}`}><ActivityTitle activity={act} /></Link></Text>
  }
  
  const visitedAirfields = profile?.visited?.filter(v => v.type === 'airfields').sort(byId) ?? []
  const sharedTrips = [...trips].filter(([, trip]) => trip.uid === profile?.uid);
  const favoriteAirfields = profile?.favorites?.filter(f => f.type === 'airfields').sort(byId) ?? [];
  const favoriteActivities = profile?.favorites?.filter(f => f.type === 'activities') ?? [];

  // Only non-empty sections get a column, so the grid has no holes; `grow` widens the last one when their number is odd
  const sections: {title: string, items: ReactNode[]}[] = [
    {title: `Terrains visités (${visitedAirfields.length})`, items: visitedAirfields.map(v => <AirfieldLink key={v.id} id={v.id}/>)},
    {title: `Sorties partagées (${sharedTrips.length})`, items: sharedTrips.map(([key,trip]) => <Link key={key} to={`/trips/${key}`}><TripTitle trip={trip} details /></Link>)},
    {title: `Terrains favoris (${favoriteAirfields.length})`, items: favoriteAirfields.map(v => <AirfieldLink key={v.id} id={v.id}/>)},
    {title: `Activités favorites (${favoriteActivities.length})`, items: favoriteActivities.map(v => <ActivityLink key={v.id} id={v.id}/>)},
  ].filter(s => s.items.length > 0)

  if (authLoading) return <Center h="50vh"><Loader /></Center>

  return (profile ? <>
  <Title order={1}><BackButton />Votre profil utilisateur</Title>
  { sections.length > 0 ?
    <Grid grow mt="md">
      { sections.map(s => (
        <Grid.Col key={s.title} span={{base: 12, sm: 6}}>
          <ListPanel title={s.title}>{s.items}</ListPanel>
        </Grid.Col>
      ))}
    </Grid>
  :
    <Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
      <Text size="sm">
        Vous n'avez encore ni terrain visité, ni favori, ni sortie partagée.
        Marquez les <Link to="/airfields">terrains</Link> que vous avez visités ou que vous aimez depuis leur fiche,
        ou <Link to="/trips">partagez une sortie</Link>.
      </Text>
    </Paper>
  }
  
  <Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
    <Fieldset legend='Profil public'>
      <Switch
        mb="md"
        checked={!!profile.passportPublic}
        onChange={e => profile.update({ passportPublic: e.currentTarget.checked })}
        label="Rendre mon profil public"
      />
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
      <PassportBadge profile={profile} />
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
          label={"Où êtes-vous basé ?"}
          placeholder="Entrez le nom ou le code OACI"
          data={data}
          searchable
          clearable
        />
        <Group mt="md">
          <Button type="submit">Enregistrer</Button>
          {saveStatus && <Text size="xs" role="status">{saveStatus}</Text>}
        </Group>
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
