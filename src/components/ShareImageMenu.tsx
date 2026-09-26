import { ReactNode } from "react"
import { Button, Menu, Text } from "@mantine/core"
import { IconChevronDown, IconCopy, IconDownload, IconShare } from "@tabler/icons-react"
import { svgDataUrl } from "../utils/passportBadge"

const toPngBlob = async (svg: string, scale: number): Promise<Blob> => {
  const img = new Image()
  img.src = svgDataUrl(svg)
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth * scale
  canvas.height = img.naturalHeight * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.scale(scale, scale)
  ctx.drawImage(img, 0, 0)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'))
}

const canCopyImage = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write
const canShareFiles = (fileName: string) => !!navigator.canShare?.({ files: [new File([], fileName, { type: 'image/png' })] })

export interface EmbedOption {
  label: string
  icon: ReactNode
  /** Copied to the clipboard */
  text: string
  /** Status shown once copied */
  done: string
}

interface ShareImageMenuProps {
  /** Image to share, rasterized client-side; undefined while it is being built */
  svg?: string
  /** PNG pixels per SVG unit */
  scale: number
  fileName: string
  shareText: string
  /** Snippets pointing at the hosted copy (profile must be public) */
  embeds: EmbedOption[]
  embedsEnabled: boolean
  onStatus: (status?: string) => void
}

/** "Partager ▾" menu for a generated image: file actions, then embed snippets. */
const ShareImageMenu = ({ svg, scale, fileName, shareText, embeds, embedsEnabled, onStatus }: ShareImageMenuProps) => {
  const run = (action: () => Promise<unknown>, done: string) => () => {
    onStatus(undefined)
    action().then(() => onStatus(done)).catch((e: unknown) => {
      // The user closing the share sheet is not an error
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.error('[ShareImageMenu]', e)
      onStatus("Une erreur est survenue, veuillez réessayer.")
    })
  }
  const png = () => toPngBlob(svg!, scale)

  const download = async () => {
    const url = URL.createObjectURL(await png())
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  // Safari only allows clipboard writes in the gesture itself: hand it the pending blob
  const copy = () => navigator.clipboard.write([new ClipboardItem({ 'image/png': png() })])

  const share = async () => {
    const file = new File([await png()], fileName, { type: 'image/png' })
    await navigator.share({ files: [file], text: shareText, url: 'https://aerotrips.fr' })
  }

  return (
    <Menu position="bottom-end" shadow="md" width={240}>
      <Menu.Target>
        <Button disabled={!svg} leftSection={<IconShare size={18} />} rightSection={<IconChevronDown size={16} />}>Partager</Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Image</Menu.Label>
        <Menu.Item leftSection={<IconDownload size={16} />} onClick={run(download, 'Image téléchargée.')}>Télécharger</Menu.Item>
        {canCopyImage && <Menu.Item leftSection={<IconCopy size={16} />} onClick={run(copy, 'Image copiée dans le presse-papier.')}>Copier l'image</Menu.Item>}
        {canShareFiles(fileName) && <Menu.Item leftSection={<IconShare size={16} />} onClick={run(share, 'Image partagée.')}>Partager…</Menu.Item>}
        <Menu.Divider />
        <Menu.Label>Intégrer</Menu.Label>
        {embeds.map(e => (
          <Menu.Item key={e.label} disabled={!embedsEnabled} leftSection={e.icon} onClick={run(() => navigator.clipboard.writeText(e.text), e.done)}>{e.label}</Menu.Item>
        ))}
        {!embedsEnabled && <Text size="xs" c="dimmed" px="sm" py={4}>Rendez votre profil public pour intégrer cette image.</Text>}
      </Menu.Dropdown>
    </Menu>
  )
}

export default ShareImageMenu
