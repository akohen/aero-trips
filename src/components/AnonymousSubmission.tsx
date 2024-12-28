import { Title } from "@mantine/core"
import BackButton from "./BackButton"
import { Link } from "react-router-dom"
import { Activity } from ".."


const AnonymousSubmission = ({activity} : {activity?: Activity}) => {
  const titleString = activity && activity.id ? 'Proposer une modification' : 'Proposer une nouvelle activité ou lieu'
  return (
    <>
      <Title>
        <BackButton />{titleString}
      </Title>
      <p>Merci de contribuer à l'amélioration des données du site.</p>
      <p>Vos modifications ont été enregistées, et seront visibles sur le site d'ici quelques jours (pour modération).</p>
      <p>Si vous souhaitez proposer plusieurs modifications, n'hésitez pas à vous connecter, 
        car les modifications des utilisateurs connectés sont modérées à posteriori, et sont donc immédiatement visibles.</p>
      <p>Si vous avez des problèmes ou des questions, n'hésitez pas à <Link to="/contact">nous contacter</Link>.</p>
      <p><Link to=".." relative="path">Retour</Link></p>
    </>
  )}

export default AnonymousSubmission