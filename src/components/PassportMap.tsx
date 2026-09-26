import { useState } from "react"
import { Box, Group, Text, Title } from "@mantine/core"
import { IconLink } from "@tabler/icons-react"
import { Airfield, Profile } from ".."
import { usePassportMapSvg } from "../hooks/usePassportMapSvg"
import { svgDataUrl, visitedLabel } from "../utils/passportBadge"
import { PASSPORT_IMAGES, passportImageUrl } from "../utils/passport"
import { storageBucket } from "../data/firebase"
import ShareImageMenu from "./ShareImageMenu"

const PassportMap = ({ profile, airfields }: { profile: Profile, airfields: Map<string, Airfield> }) => {
  const [status, setStatus] = useState<string>()
  const homebase = profile.homebase || undefined
  const visited = [...new Set(profile.visited?.filter(v => v.type === 'airfields').map(v => v.id))]
  const svg = usePassportMapSvg({ displayName: profile.displayName, homebase, visited, airfields })
  const mapUrl = passportImageUrl(storageBucket, profile.uid, PASSPORT_IMAGES.map)

  return (
    <Box mt="md">
      <Title order={5}>Ma carte</Title>
      <Group mt="sm" gap="md" align="flex-start">
        <Box w={240} style={{ aspectRatio: '4 / 5', borderRadius: 8, overflow: 'hidden', background: '#16233F' }}>
          {svg && <img src={svgDataUrl(svg)} alt={`Carte : ${visited.length} ${visitedLabel(visited.length)}`} style={{ display: 'block', width: '100%' }} />}
        </Box>
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
