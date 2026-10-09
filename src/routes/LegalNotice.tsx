import { Anchor, Paper, Text, Title } from "@mantine/core"
import { Link } from "react-router"
import BackButton from "../components/BackButton"

const LegalNotice = () => (<>
  <Title><BackButton />Mentions légales</Title>
  <Paper shadow="md" radius="md" p="md" mt="md" withBorder>
    <Title order={3}>Éditeur</Title>
    <Text mt="xs">
      Le site aerotrips.fr et l'application AeroTrips sont édités à titre non professionnel par Alexandre Kohen,
      particulier, également directeur de la publication.
    </Text>
    <Text mt="xs">
      Contact : <Anchor component={Link} to="/contact">formulaire de contact</Anchor>.
    </Text>

    <Title order={3} mt="lg">Hébergement</Title>
    <Text mt="xs">
      Firebase (Google Cloud) : Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande.
      Les données du site sont stockées dans l'Union européenne.
    </Text>

    <Title order={3} mt="lg">Contenus</Title>
    <Text mt="xs">
      AeroTrips est un annuaire collaboratif : les fiches sont rédigées et complétées par des pilotes. Les
      informations sont données à titre indicatif et peuvent être inexactes ou périmées ; elles ne remplacent pas
      les sources officielles (carte VAC, NOTAM, SIA) pour la préparation d'un vol.
    </Text>
    <Text mt="xs">
      Chaque contributeur garantit disposer des droits sur les textes et photos qu'il publie. Pour signaler un
      contenu inexact ou illicite, utilisez le <Anchor component={Link} to="/contact">formulaire de contact</Anchor>.
    </Text>
    <Text mt="xs">
      Fonds de carte : © les contributeurs d'<Anchor href="https://www.openstreetmap.org/copyright">OpenStreetMap</Anchor>.
    </Text>

    <Title order={3} mt="lg">Données personnelles</Title>
    <Text mt="xs">
      Voir la <Anchor component={Link} to="/confidentialite">politique de confidentialité</Anchor>.
    </Text>
  </Paper>
</>)

export default LegalNotice
