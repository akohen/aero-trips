import { Paper, Stack, Text, Title } from "@mantine/core"
import { Link } from "react-router-dom"
import { Data } from ".."
import { formatDate } from "../utils/utils"

const Home = ({ events, airfields }: Data) => {
  const now = new Date()
  const upcomingEvents = [...events.values()]
    .filter(e => {
      const end = e.endDate ? new Date(e.endDate.seconds * 1000) : new Date(e.startDate.seconds * 1000)
      return end >= now
    })
    .sort((a, b) => a.startDate.seconds - b.startDate.seconds)
    .slice(0, 3)

  return (<>
  <Title>Bienvenue sur Aero trips</Title>
  <Paper
    shadow="md"
    radius="md"
    p='sm'
    mt="md"
    withBorder
  >
    <Text>
      Aerotrips est un site <b>gratuit</b>, <b>collaboratif</b> et <b>open-source</b>&nbsp;
      pour aider les pilotes privés à partager des idées de sorties en avion léger,
      ainsi que des activités à proximité des aérodromes.
    </Text>
    <Text>
      Ce site permet par exemple de:
    </Text>
    <ul>
      <li>Consulter les informations des terrains accessibles aux vols VFR, accéder aux dernières cartes VAC</li>
      <li>Trouver facilement les aérodromes avec un restaurant, un hôtel ou une autre activité à proximité</li>
      <li>Partager les sorties que vous avez réalisées</li>
      <li>Préparer un itinéraire de voyage à proposer à vos passagers</li>
      <li>Trouver vélos à louer pour organiser des voyages en avion sans avoir besoin de voiture</li>
      <li>Sauvegarder la liste des aérodromes que vous avez visités, ou des châteaux que vous avez survolés!</li>
    </ul>
  </Paper>
  <Paper
    shadow="md"
    radius="md"
    p='sm'
    mt="md"
    withBorder
  >
    <Text>
      Les données de ce site sont collaboratives, n'hésitez donc à pas à rajouter des lieux ou des propositions de sorties, à ajouter vos bons plans, ou à corriger les informations déjà en ligne. 
    </Text>
    <Text>
      Utilisez les filtres sur la liste des <Link to={'/airfields'}>terrains</Link> ou des <Link to={'/activities'}>activités</Link> pour choisir les éléments qui sont affichés sur la <Link to={'/map'}>carte</Link>.
    </Text>
  </Paper>
  
  {upcomingEvents.length > 0 && (
    <Paper shadow="md" radius="md" p="sm" mt="md" withBorder>
      <Title order={3}>Prochains événements</Title>
      <Stack mt="sm" gap="xs">
        {upcomingEvents.map(e => {
          const ad = airfields.get(e.airfieldId)
          const dateLabel = e.endDate
            ? `${formatDate(e.startDate)} → ${formatDate(e.endDate)}`
            : formatDate(e.startDate)
          return (
            <Text key={e.id}>
              <Link to={`/events/${e.id}`}><b>{e.title}</b></Link>
              {' — '}{ad ? `${ad.name} (${ad.codeIcao})` : e.airfieldId}
              {' — '}{dateLabel}
            </Text>
          )
        })}
      </Stack>
      <Text mt="sm" size="sm"><Link to="/events">Voir tous les événements →</Link></Text>
    </Paper>
  )}
  <Text mt={"md"}>
    ⚠ Ce site n'est pas une source d'information aéronautique, et ne peut pas se substituer à la documentation réglementaire lors de la préparation d'un vol.
  </Text>
  <Text size="xs" ta={"right"}>Aéro trips version {APP_VERSION}</Text>
</>)}

export default Home
