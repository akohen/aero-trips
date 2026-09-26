import { useMemo, useState } from "react"
import { Box, Button, Group, Menu, Text, Title } from "@mantine/core"
import { IconChevronDown, IconCode, IconCopy, IconDownload, IconLink, IconShare } from "@tabler/icons-react"
import { Profile } from ".."
import { badgeEmbedCodes, buildPassportBadge, countVisitedAirfields, svgDataUrl } from "../utils/passportBadge"
import { PASSPORT_IMAGES, passportImageUrl } from "../utils/passport"
import { storageBucket } from "../data/firebase"

const SCALE = 3

const toPngBlob = async (svg: string): Promise<Blob> => {
  const img = new Image()
  img.src = svgDataUrl(svg)
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth * SCALE
  canvas.height = img.naturalHeight * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.scale(SCALE, SCALE)
  ctx.drawImage(img, 0, 0)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'))
}

const canCopyImage = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write
const canShareFiles = (file: File) => !!navigator.canShare?.({ files: [file] })

const PassportBadge = ({ profile }: { profile: Profile }) => {
  const [status, setStatus] = useState<string>()
  const homebase = profile.homebase || undefined
  const visitedCount = countVisitedAirfields(profile)
  const badge = useMemo(() => buildPassportBadge({ homebase, visitedCount }), [homebase, visitedCount])
  const { svg } = badge
  const fileName = `badge-aerotrips${homebase ? `-${homebase}` : ''}.png`
  const probe = useMemo(() => new File([], fileName, { type: 'image/png' }), [fileName])

  const run = (action: () => Promise<unknown>, done: string) => () => {
    setStatus(undefined)
    action().then(() => setStatus(done)).catch((e: unknown) => {
      // The user closing the share sheet is not an error
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.error('[PassportBadge]', e)
      setStatus("Une erreur est survenue, veuillez réessayer.")
    })
  }

  const download = async () => {
    const url = URL.createObjectURL(await toPngBlob(svg))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  // Safari only allows clipboard writes in the gesture itself: hand it the pending blob
  const copy = () => navigator.clipboard.write([new ClipboardItem({ 'image/png': toPngBlob(svg) })])

  // Hosted copies, published by the `passports` function once the profile is public
  const embed = badgeEmbedCodes({
    src: passportImageUrl(storageBucket, profile.uid, PASSPORT_IMAGES.png),
    src2x: passportImageUrl(storageBucket, profile.uid, PASSPORT_IMAGES.png2x),
    href: `${location.origin}/profile/${profile.uid}`,
    width: badge.width,
    height: badge.height,
    alt: badge.title,
  })
  const copyText = (text: string) => () => navigator.clipboard.writeText(text)

  const share = async () => {
    const file = new File([await toPngBlob(svg)], fileName, { type: 'image/png' })
    await navigator.share({ files: [file], text: 'Mes terrains visités sur AeroTrips', url: 'https://aerotrips.fr' })
  }

  const isPublic = !!profile.passportPublic

  return (
    <Box mt="md">
      <Title order={5}>Mon badge pilote</Title>
      <Group mt="sm" gap="md" align="center">
        <img src={svgDataUrl(svg)} alt={badge.title} style={{ display: 'block', maxWidth: '100%' }} />
        <Menu position="bottom-end" shadow="md" width={240}>
          <Menu.Target>
            <Button leftSection={<IconShare size={18} />} rightSection={<IconChevronDown size={16} />}>Partager</Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Image</Menu.Label>
            <Menu.Item leftSection={<IconDownload size={16} />} onClick={run(download, 'Badge téléchargé.')}>Télécharger</Menu.Item>
            {canCopyImage && <Menu.Item leftSection={<IconCopy size={16} />} onClick={run(copy, 'Badge copié dans le presse-papier.')}>Copier l'image</Menu.Item>}
            {canShareFiles(probe) && <Menu.Item leftSection={<IconShare size={16} />} onClick={run(share, 'Badge partagé.')}>Partager…</Menu.Item>}
            <Menu.Divider />
            <Menu.Label>Intégrer</Menu.Label>
            <Menu.Item disabled={!isPublic} leftSection={<IconLink size={16} />} onClick={run(copyText(embed.url), "Lien de l'image copié.")}>Lien de l'image</Menu.Item>
            <Menu.Item disabled={!isPublic} leftSection={<IconCode size={16} />} onClick={run(copyText(embed.html), 'Code HTML copié (site, signature de mail).')}>Code HTML</Menu.Item>
            <Menu.Item disabled={!isPublic} leftSection={<IconCode size={16} />} onClick={run(copyText(embed.bbcode), 'Code forum copié.')}>Code forum</Menu.Item>
            {!isPublic && <Text size="xs" c="dimmed" px="sm" py={4}>Rendez votre profil public pour intégrer votre badge.</Text>}
          </Menu.Dropdown>
        </Menu>
      </Group>
      {!homebase && <Text size="sm" mt="sm">Renseignez votre terrain ci-dessous pour l'afficher sur le badge.</Text>}
      {status && <Text size="xs" mt="xs" role="status">{status}</Text>}
    </Box>
  )
}

export default PassportBadge
