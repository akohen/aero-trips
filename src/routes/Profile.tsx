import { Button, Center, Loader, Paper, Select, TextInput, Title, Text, Grid, Group, Popover, Switch } from "@mantine/core"
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
import PassportMap, { PassportMapImage } from "../components/PassportMap"
import { usePassportMapSvg } from "../hooks/usePassportMapSvg"
import { countVisitedAirfields } from "../utils/passportBadge"
import { titleCase } from "../utils/utils"
import VisitsPanel from "../components/VisitsPanel"

const byId = (a: {id: string}, b: {id: string}) => a.id.localeCompare(b.id)

const Profile = ({profile, authLoading, airfields, activities, trips} : Data) => {
  const [openedShare, { toggle: toggleShare, open: openShare }] = useDisclosure(false)
  const [saveStatus, setSaveStatus] = useState<string>()
  // Built once for the map next to the visits and the thumbnail in « Profil public »
  const mapSvg = usePassportMapSvg({
    displayName: profile?.displayName,
    homebase: profile?.homebase || undefined,
    visited: [...new Set(profile?.visited?.filter(v => v.type === 'airfields').map(v => v.id))],
    airfields,
  }, !!profile)
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
  
  const sharedTrips = [...trips].filter(([, trip]) => trip.uid === profile?.uid);
  const favoriteAirfields = profile?.favorites?.filter(f => f.type === 'airfields').sort(byId) ?? [];
  const favoriteActivities = profile?.favorites?.filter(f => f.type === 'activities') ?? [];

  // Only non-empty sections get a column, so the grid has no holes; `grow` widens the last one when their number is odd
  const sections: {title: string, items: ReactNode[]}[] = [
    {title: `Sorties partagées (${sharedTrips.length})`, items: sharedTrips.map(([key,trip]) => <Link key={key} to={`/trips/${key}`}><TripTitle trip={trip} details /></Link>)},
    {title: `Terrains favoris (${favoriteAirfields.length})`, items: favoriteAirfields.map(v => <AirfieldLink key={v.id} id={v.id}/>)},
    {title: `Activités favorites (${favoriteActivities.length})`, items: favoriteActivities.map(v => <ActivityLink key={v.id} id={v.id}/>)},
  ].filter(s => s.items.length > 0)

  const visitedCount = countVisitedAirfields(profile)

  if (authLoading) return <Center h="50vh"><Loader /></Center>

  return (profile ? <>
  <Title order={1}><BackButton />Votre profil utilisateur</Title>
  <Grid mt="md">
    <Grid.Col span={{base: 12, sm: visitedCount > 0 ? 6 : 12}}>
      <VisitsPanel profile={profile} airfields={airfields} />
    </Grid.Col>
    {visitedCount > 0 &&
      <Grid.Col span={{base: 12, sm: 6}}>
        {/* Stays in view along a long visits list; the column stretches to the row */}
        <Paper shadow="md" radius="md" p="sm" withBorder pos="sticky" style={{ top: 'calc(var(--app-shell-header-offset, 0rem) + var(--mantine-spacing-md))' }}>
          <Title order={4}>Ma carte</Title>
          <PassportMapImage svg={mapSvg} count={visitedCount} mt="xs" mx="auto" maw={360} />
        </Paper>
      </Grid.Col>}
  </Grid>
  { sections.length > 0 &&
    <Grid grow mt="md">
      { sections.map(s => (
        <Grid.Col key={s.title} span={{base: 12, sm: 6}}>
          <ListPanel title={s.title}>{s.items}</ListPanel>
        </Grid.Col>
      ))}
    </Grid>
  }
  
  <Grid mt="md">
    <Grid.Col span={{base: 12, sm: 6}}>
      <Paper shadow="md" radius="md" p='sm' withBorder h="100%">
        <form onSubmit={form.onSubmit(saveProfile)}>
          <Title order={4}>Modifier vos informations</Title>
          <TextInput
            mt="xs"
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
        </form>
      </Paper>
    </Grid.Col>
    <Grid.Col span={{base: 12, sm: 6}}>
      <Paper shadow="md" radius="md" p='sm' withBorder h="100%">
        <Title order={4}>Profil public</Title>
        <Switch
          mt="xs"
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
        <PassportMap profile={profile} svg={mapSvg} />
      </Paper>
    </Grid.Col>
  </Grid>
</> 
: 
  <Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
    <p><Button leftSection={<IconBrandGoogleFilled />} onClick={googleLogin} variant='filled'>Se connecter avec Google</Button></p>
  </Paper>
)}

export default Profile
