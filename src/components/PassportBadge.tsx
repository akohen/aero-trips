import { useMemo, useState } from "react"
import { Box, Group, Text, Title } from "@mantine/core"
import { IconCode, IconLink } from "@tabler/icons-react"
import { Profile } from ".."
import { badgeEmbedCodes, buildPassportBadge, countVisitedAirfields, svgDataUrl } from "../utils/passportBadge"
import { PASSPORT_IMAGES, passportImageUrl } from "../utils/passport"
import { storageBucket } from "../data/firebase"
import ShareImageMenu from "./ShareImageMenu"

const PassportBadge = ({ profile }: { profile: Profile }) => {
  const [status, setStatus] = useState<string>()
  const homebase = profile.homebase || undefined
  const visitedCount = countVisitedAirfields(profile)
  const badge = useMemo(() => buildPassportBadge({ homebase, visitedCount }), [homebase, visitedCount])

  // Hosted copies, published by the `passports` function once the profile is public
  const embed = badgeEmbedCodes({
    src: passportImageUrl(storageBucket, profile.uid, PASSPORT_IMAGES.png),
    src2x: passportImageUrl(storageBucket, profile.uid, PASSPORT_IMAGES.png2x),
    href: `${location.origin}/profile/${profile.uid}`,
    width: badge.width,
    height: badge.height,
    alt: badge.title,
  })

  return (
    <Box mt="md">
      <Title order={5}>Mon badge pilote</Title>
      <Group mt="sm" gap="md" align="center">
        <img src={svgDataUrl(badge.svg)} alt={badge.title} style={{ display: 'block', maxWidth: '100%' }} />
        <ShareImageMenu
          svg={badge.svg}
          scale={3}
          fileName={`badge-aerotrips${homebase ? `-${homebase}` : ''}.png`}
          shareText="Mes terrains visités sur AeroTrips"
          embedsEnabled={!!profile.passportPublic}
          onStatus={setStatus}
          embeds={[
            { label: "Lien de l'image", icon: <IconLink size={16} />, text: embed.url, done: "Lien de l'image copié." },
            { label: 'Code HTML', icon: <IconCode size={16} />, text: embed.html, done: 'Code HTML copié (site, signature de mail).' },
            { label: 'Code forum', icon: <IconCode size={16} />, text: embed.bbcode, done: 'Code forum copié.' },
          ]}
        />
      </Group>
      {!homebase && <Text size="sm" mt="sm">Renseignez votre terrain ci-dessous pour l'afficher sur le badge.</Text>}
      {status && <Text size="xs" mt="xs" role="status">{status}</Text>}
    </Box>
  )
}

export default PassportBadge
