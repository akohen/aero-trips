import { Text, Title } from "@mantine/core"
import { Link } from "react-router-dom"

const Home = () => {
  return (<>
  <Title>Bienvenue sur Aero trips</Title>
  <div className="card">
    <p>
      Le but de ce site est d'aider les pilotes privés à trouver des idées de sorties en avion ainsi que des activités à proximité des aérodromes.
    </p>
    <p>
      Utilisez les filtres sur la liste des <Link to={'/airfields'}>terrains</Link> ou des <Link to={'/activities'}>activités</Link> pour choisir les éléments qui sont affichés sur la <Link to={'/map'}>carte</Link>.
    </p>
    <p>
      Les données de ce site sont collaboratives, n'hésitez donc à pas à rajouter des lieux ou des propositions de sorties, ou à corriger les informations déjà en ligne. 
      Les modifications étant validées manuellement, votre modification n'apparaîtra pas immédiatement sur le site.
    </p>
    <p>
      Le nom définitif du projet est encore à définir, n'hésitez pas à soumettre vos propositions de nom.
    </p>
    <p>
      ⚠ Ce site n'est pas une source d'information aéronautique, et ne peut pas se substituer à la documentation réglementaire lors de la préparation d'un vol.
    </p>
    <Text size="sm">Aéro trips version {APP_VERSION}</Text>
  </div>
</>)}

export default Home
