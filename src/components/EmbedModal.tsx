import { Button, Code, ColorSwatch, CopyButton, Group, Modal, ScrollArea, SegmentedControl, Stack, Text, em } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { IconCheck, IconCopy } from "@tabler/icons-react"
import { useState } from "react"
import { Airfield } from ".."
import { EMBED_HEIGHT, buildEmbedSnippet, embedUrl } from "../utils/embedWidget"
import { titleCase } from "../utils/utils"

// Accent presets: AeroTrips blue first, then colors that sit well on most club sites.
const ACCENTS = ['#1c7ed6', '#0f766e', '#2f9e44', '#b45309', '#c92a2a', '#9d174d', '#495057']

const EmbedModal = ({ airfield, opened, onClose }: {
  airfield: Airfield,
  opened: boolean,
  onClose: () => void,
}) => {
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`)
  const [width, setWidth] = useState<'narrow' | 'wide'>('narrow')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [accent, setAccent] = useState(ACCENTS[0])

  const options = {
    wide: width === 'wide',
    theme: theme === 'dark' ? 'dark' as const : undefined,
    accent: accent === ACCENTS[0] ? undefined : accent,
  }
  const snippet = buildEmbedSnippet(airfield, options)
  // The dev server has no /embed pages (they are written at postbuild), so
  // preview the production widget there; elsewhere use this origin's.
  const previewSrc = embedUrl(airfield.codeIcao, options, import.meta.env.DEV ? undefined : '')

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Afficher les activités à proximité de ${airfield.codeIcao} sur votre site`}
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
      fullScreen={isMobile}
      zIndex={1500}
    >
      <Stack gap="md">
        <Text size="sm">
          Affichez sur votre site ce qu'il y a à faire autour de {titleCase(airfield.name)}. Le widget se
          met à jour avec les contributions de la communauté.
        </Text>

        <Group gap="lg" align="flex-end">
          <Stack gap={4}>
            <Text size="sm" fw={500}>Format</Text>
            <SegmentedControl
              value={width}
              onChange={(v) => setWidth(v as 'narrow' | 'wide')}
              data={[{ value: 'narrow', label: 'Colonne' }, { value: 'wide', label: 'Pleine largeur' }]}
            />
          </Stack>
          <Stack gap={4}>
            <Text size="sm" fw={500}>Thème</Text>
            <SegmentedControl
              value={theme}
              onChange={(v) => setTheme(v as 'light' | 'dark')}
              data={[{ value: 'light', label: 'Clair' }, { value: 'dark', label: 'Sombre' }]}
            />
          </Stack>
          <Stack gap={4}>
            <Text size="sm" fw={500}>Couleur</Text>
            <Group gap={6} h={36}>
              {ACCENTS.map((c) => (
                <ColorSwatch
                  key={c}
                  component="button"
                  type="button"
                  color={c}
                  size={24}
                  onClick={() => setAccent(c)}
                  aria-label={`Couleur ${c}`}
                  aria-pressed={accent === c}
                  style={{ cursor: 'pointer', outline: accent === c ? '2px solid var(--mantine-color-dark-4)' : undefined, outlineOffset: 2 }}
                >
                  {accent === c && <IconCheck size={14} color="white" />}
                </ColorSwatch>
              ))}
            </Group>
          </Stack>
        </Group>

        <Stack gap={4}>
          <Text size="sm" fw={500}>Aperçu</Text>
          <iframe
            key={previewSrc}
            src={previewSrc}
            title={`Aperçu du widget ${airfield.codeIcao}`}
            height={width === 'wide' ? EMBED_HEIGHT.wide : EMBED_HEIGHT.narrow}
            style={{ border: 0, width: '100%', maxWidth: width === 'wide' ? 720 : 360 }}
          />
        </Stack>

        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="sm" fw={500}>Code à coller dans votre page</Text>
            <CopyButton value={snippet}>
              {({ copied, copy }) => (
                <Button
                  size="compact-sm"
                  color={copied ? 'teal' : undefined}
                  leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  onClick={copy}
                >
                  {copied ? 'Copié' : 'Copier le code'}
                </Button>
              )}
            </CopyButton>
          </Group>
          <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{snippet}</Code>
        </Stack>
      </Stack>
    </Modal>
  )
}

export default EmbedModal
