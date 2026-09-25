import { useMemo, useState } from "react"
import { Box, Button, Group, Text, Title } from "@mantine/core"
import { IconCopy, IconDownload, IconShare } from "@tabler/icons-react"
import { Profile } from ".."
import { buildPassportBadgeSvg, countVisitedAirfields, svgDataUrl } from "../utils/passportBadge"

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
  const svg = useMemo(() => buildPassportBadgeSvg({ homebase, visitedCount }), [homebase, visitedCount])
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

  const share = async () => {
    const file = new File([await toPngBlob(svg)], fileName, { type: 'image/png' })
    await navigator.share({ files: [file], text: 'Mes terrains visités sur AeroTrips', url: 'https://aerotrips.fr' })
  }

  return (
    <Box mt="md">
      <Title order={5}>Mon badge pilote</Title>
      <img src={svgDataUrl(svg)} alt={`Badge : ${visitedCount} terrain${visitedCount > 1 ? 's' : ''} visité${visitedCount > 1 ? 's' : ''}`} style={{ display: 'block', margin: '12px 0', maxWidth: '100%' }} />
      {!homebase && <Text size="sm" mb="sm">Renseignez votre terrain ci-dessous pour l'afficher sur le badge.</Text>}
      <Group gap="xs">
        <Button leftSection={<IconDownload size={18} />} onClick={run(download, 'Badge téléchargé.')}>Télécharger</Button>
        {canCopyImage && <Button variant="default" leftSection={<IconCopy size={18} />} onClick={run(copy, "Badge copié dans le presse-papier.")}>Copier l'image</Button>}
        {canShareFiles(probe) && <Button variant="default" leftSection={<IconShare size={18} />} onClick={run(share, 'Badge partagé.')}>Partager</Button>}
      </Group>
      {status && <Text size="xs" mt="xs" role="status">{status}</Text>}
    </Box>
  )
}

export default PassportBadge
