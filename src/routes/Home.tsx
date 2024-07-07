import { Paper, Text, Title } from "@mantine/core"
import { Link } from "react-router-dom"

const Home = () => {
  return (<>
  <Title>Bienvenue sur Aero trips</Title>
  <Paper
    shadow="md"
    radius="md"
    p='sm'
    mt={"md"}
  >
    <Text>
      Aerotrips est un site <b>gratuit</b>, <b>collaboratif</b> et <b>open-source</b>&nbsp;
      pour aider les pilotes privés à partager des idées de sorties en avion,
      ainsi que des activités à proximité des aérodromes.
    </Text>
    <Text>
      Les données de ce site sont collaboratives, n'hésitez donc à pas à rajouter des lieux ou des propositions de sorties, ou à corriger les informations déjà en ligne. 
      Les modifications des visiteurs anonymes sont validées manuellement, votre modification n'apparaîtra pas immédiatement sur le site.
    </Text>
    <Text>
      Vous pouvez vous connecter (uniquement avec un compte Google pour le moment) 
      afin de pouvoir:
    </Text>
    <ul>
        <li>Valider automatiquement vos changements sur des activités</li>
        <li>Partager des voyages</li>
        <li>Enregistrer votre aérodrome de base</li>
        <li>Lister les terrains que vous avez visités (bientôt)</li>
      </ul>
    <Text>
      Utilisez les filtres sur la liste des <Link to={'/airfields'}>terrains</Link> ou des <Link to={'/activities'}>activités</Link> pour choisir les éléments qui sont affichés sur la <Link to={'/map'}>carte</Link>.
    </Text>
    <Text mt={"md"}>
      ⚠ Ce site n'est pas une source d'information aéronautique, et ne peut pas se substituer à la documentation réglementaire lors de la préparation d'un vol.
    </Text>
    <Text size="sm" ta={"right"}>Aéro trips version {APP_VERSION}</Text>
  </Paper>
</>)}

export default Home
