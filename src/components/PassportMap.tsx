import { useState } from "react"
import { Box, BoxProps, Group, Text, Title } from "@mantine/core"
import { IconLink } from "@tabler/icons-react"
import { Profile } from ".."
import { countVisitedAirfields, svgDataUrl, visitedLabel } from "../utils/passportBadge"
import { PASSPORT_IMAGES, passportImageUrl } from "../utils/passport"
import { storageBucket } from "../data/firebase"
import ShareImageMenu from "./ShareImageMenu"

/** The passport map drawn by `usePassportMapSvg` (4:5); its box keeps the space while it loads. */
export const PassportMapImage = ({ svg, count, ...box }: { svg?: string, count: number } & BoxProps) => (
  <Box {...box} style={{ aspectRatio: '4 / 5', borderRadius: 8, overflow: 'hidden', background: '#16233F' }}>
    {svg && <img src={svgDataUrl(svg)} alt={`Carte : ${count} ${visitedLabel(count)}`} style={{ display: 'block', width: '100%' }} />}
  </Box>
)

/** Sharing the map: a thumbnail (the full map sits next to the visits list) and the share menu. */
const PassportMap = ({ profile, svg }: { profile: Profile, svg?: string }) => {
  const [status, setStatus] = useState<string>()
  const homebase = profile.homebase || undefined
  const mapUrl = passportImageUrl(storageBucket, profile.uid, PASSPORT_IMAGES.map)

  return (
    <Box mt="md">
      <Title order={5}>Ma carte</Title>
      <Group mt="sm" gap="md" align="flex-start">
        <PassportMapImage svg={svg} count={countVisitedAirfields(profile)} w={120} />
        <ShareImageMenu
          svg={svg}
          scale={1}
          fileName={`carte-aerotrips${homebase ? `-${homebase}` : ''}.png`}
          shareText="Mes terrains visités sur AeroTrips"
          embedsEnabled={!!profile.passportPublic}
          onStatus={setStatus}
          embeds={[{ label: "Lien de l'image", icon: <IconLink size={16} />, text: mapUrl, done: "Lien de l'image copié." }]}
        />
      </Group>
      {status && <Text size="xs" mt="xs" role="status">{status}</Text>}
    </Box>
  )
}

export default PassportMap
