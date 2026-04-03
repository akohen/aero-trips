import { Button, em, Popover, Text } from "@mantine/core"
import { useDisclosure, useMediaQuery } from "@mantine/hooks"
import { IconShare } from "@tabler/icons-react"

const ShareButton = ({ iconOnly = false }: { iconOnly?: boolean }) => {
  const [opened, { toggle }] = useDisclosure(false)
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`) || iconOnly

  const share = () => {
    navigator.clipboard.writeText(location.href)
    toggle()
  }

  return (
    <Popover width={200} position="bottom" withArrow shadow="md" opened={opened} onChange={toggle} zIndex={1000}>
      <Popover.Target>
        <Button
          leftSection={isMobile ? undefined : <IconShare size={16} />}
          onClick={share}
          variant="default"
        >
          {isMobile ? <IconShare size={16} /> : `Partager`}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="xs">L'URL des résultats a été copiée dans le presse-papier.</Text>
      </Popover.Dropdown>
    </Popover>
  )
}

export default ShareButton
