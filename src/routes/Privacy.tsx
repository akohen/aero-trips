import { Anchor, List, Paper, Switch, Text, Title } from "@mantine/core"
import { useState } from "react"
import { Link } from "react-router"
import BackButton from "../components/BackButton"

// Read by the Umami tracker before every hit.
const OPT_OUT_KEY = 'umami.disabled'

const readOptOut = () => {
  try { return localStorage.getItem(OPT_OUT_KEY) !== null } catch { return false }
}

const AudienceOptOut = () => {
  const [optedOut, setOptedOut] = useState(readOptOut)
  const toggle = (measured: boolean) => {
    try {
      if (measured) localStorage.removeItem(OPT_OUT_KEY)
      else localStorage.setItem(OPT_OUT_KEY, '1')
      setOptedOut(!measured)
    } catch { /* storage unavailable: nothing to persist */ }
  }
  return (
    <Switch
      mt="sm"
      checked={!optedOut}
      onChange={(e) => toggle(e.currentTarget.checked)}
      label="Inclure mes visites dans la mesure d'audience"
      description="Ce choix est enregistré dans ce navigateur uniquement."
    />
  )
}

const Privacy = () => (<>
  <Title><BackButton />Politique de confidentialité</Title>
  <Paper shadow="md" radius="md" p="md" mt="md" withBorder>
    <Text c="dimmed" size="sm">Dernière mise à jour : 9 octobre 2026</Text>
    <Text mt="xs">
      Cette politique décrit les données personnelles traitées par le site aerotrips.fr et l'application AeroTrips,
      pourquoi, et comment exercer vos droits. Le responsable du traitement est l'éditeur du site
      (voir les <Anchor component={Link} to="/mentions-legales">mentions légales</Anchor>).
    </Text>

    <Title order={3} mt="lg">Consultation du site</Title>
    <Text mt="xs">
      Le site se consulte sans compte. Lors de vos visites :
    </Text>
    <List mt="xs" spacing="xs">
      <List.Item>
        une mesure d'audience anonyme est réalisée avec Umami, sans cookie : pages vues, page d'arrivée, site
        de provenance, type d'appareil et pays. Ces statistiques servent uniquement à améliorer le site, ne
        permettent pas de vous identifier ni de vous suivre sur d'autres sites, et ne sont pas croisées avec
        d'autres données ;
      </List.Item>
      <List.Item>
        l'affichage de la carte charge les fonds de carte depuis les serveurs d'OpenStreetMap, qui reçoivent
        votre adresse IP ;
      </List.Item>
      <List.Item>
        les vidéos intégrées dans certaines fiches sont servies par YouTube en mode « confidentialité
        renforcée » (youtube-nocookie.com), qui ne dépose pas de cookie tant que vous ne lancez pas la vidéo ;
      </List.Item>
      <List.Item>
        votre navigateur conserve localement une copie du site pour fonctionner hors ligne (cartes et photos déjà
        consultées) et le brouillon d'un récit de visite en cours. Ces données restent sur votre appareil.
      </List.Item>
    </List>
    <Text mt="xs">
      Vous pouvez refuser la mesure d'audience à tout moment :
    </Text>
    <AudienceOptOut />

    <Title order={3} mt="lg">Compte</Title>
    <Text mt="xs">
      La connexion se fait avec votre compte Google. Nous recevons et conservons votre nom, votre adresse email et
      un identifiant technique, ainsi que les informations que vous ajoutez à votre profil : terrain de
      rattachement, favoris, lieux visités. Le nom repris de Google sert de nom d'affichage ; vous pouvez le
      modifier à tout moment dans votre profil (un pseudonyme convient). Votre adresse email n'est jamais publiée.
    </Text>

    <Title order={3} mt="lg">Contributions</Title>
    <List mt="xs" spacing="xs">
      <List.Item>
        <b>Récits de visite</b> : publiés avec votre nom d'affichage, la date de la visite et, le cas échéant, la taxe
        d'atterrissage payée.
      </List.Item>
      <List.Item>
        <b>Sorties</b> : publiées avec votre nom d'affichage complet.
      </List.Item>
      <List.Item>
        Récits et sorties gardent le nom affiché au moment de leur publication, même si vous le modifiez ensuite.
      </List.Item>
      <List.Item>
        <b>Modifications de fiches et événements</b> : enregistrés avec votre identifiant technique (non affiché),
        ou sans identité si vous n'êtes pas connecté.
      </List.Item>
      <List.Item>
        <b>Photos</b> : publiques une fois ajoutées. Évitez d'y faire figurer des personnes reconnaissables sans
        leur accord.
      </List.Item>
      <List.Item>
        <b>Passeport public</b> (option du profil, désactivée par défaut) : votre nom d'affichage, votre terrain de
        rattachement et la liste des terrains visités sont publiés sur une page et des images partageables.
        Désactiver l'option les supprime.
      </List.Item>
    </List>

    <Title order={3} mt="lg">Formulaire de contact</Title>
    <Text mt="xs">
      Le nom ou l'email que vous indiquez et votre message sont enregistrés et transmis par email à l'éditeur, afin
      de vous répondre.
    </Text>

    <Title order={3} mt="lg">Finalités et bases légales</Title>
    <List mt="xs" spacing="xs">
      <List.Item>Fournir le service (compte, profil, contributions) : exécution des conditions d'utilisation du site.</List.Item>
      <List.Item>Modérer les contributions, répondre aux messages, assurer la sécurité : intérêt légitime de l'éditeur.</List.Item>
      <List.Item>Publier le passeport : votre consentement, retirable à tout moment depuis votre profil.</List.Item>
      <List.Item>
        Mesurer l'audience : intérêt légitime de l'éditeur. Cette mesure, anonyme et sans cookie, est dispensée de
        consentement ; vous pouvez vous y opposer ci-dessus.
      </List.Item>
    </List>

    <Title order={3} mt="lg">Destinataires et sous-traitants</Title>
    <Text mt="xs">
      Vos données ne sont ni vendues ni utilisées à des fins publicitaires. Elles sont traitées par :
    </Text>
    <List mt="xs" spacing="xs">
      <List.Item>
        Google (Firebase) : hébergement, authentification, base de données et stockage des photos. La base de
        données et les photos sont stockées dans l'Union européenne ;
      </List.Item>
      <List.Item>Umami (Umami Cloud, région Union européenne) : mesure d'audience ;</List.Item>
      <List.Item>Mailgun (région Union européenne) : envoi des notifications par email à l'éditeur.</List.Item>
    </List>
    <Text mt="xs">
      Certains de ces services peuvent impliquer un transfert vers les États-Unis, encadré par le Data Privacy
      Framework UE–États-Unis ou par les clauses contractuelles types de la Commission européenne.
    </Text>

    <Title order={3} mt="lg">Durées de conservation</Title>
    <List mt="xs" spacing="xs">
      <List.Item>Compte et profil : jusqu'à la suppression du compte.</List.Item>
      <List.Item>Contributions publiées : tant qu'elles sont en ligne ; vous pouvez supprimer vos récits de visite à tout moment.</List.Item>
      <List.Item>Messages de contact : le temps de les traiter, et au plus un an.</List.Item>
      <List.Item>Statistiques d'audience : 6 mois.</List.Item>
    </List>

    <Title order={3} mt="lg">Vos droits</Title>
    <Text mt="xs">
      Vous pouvez accéder à vos données, les rectifier, les effacer, en demander une copie, vous opposer à leur
      traitement ou en demander la limitation. Pour supprimer votre compte ou exercer ces droits, utilisez le{" "}
      <Anchor component={Link} to="/contact">formulaire de contact</Anchor> en indiquant l'adresse email de votre
      compte. La suppression du compte supprime votre profil, votre passeport et vos récits de visite.
    </Text>
    <Text mt="xs">
      Vous pouvez aussi adresser une réclamation à la{" "}
      <Anchor href="https://www.cnil.fr/fr/plaintes">CNIL</Anchor>.
    </Text>
  </Paper>
</>)

export default Privacy
