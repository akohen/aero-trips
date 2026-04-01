import { ActionIcon, Button, Popover, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { IconShare } from "@tabler/icons-react"

const ShareButton = ({ iconOnly = false }: { iconOnly?: boolean }) => {
  const [opened, { toggle }] = useDisclosure(false)

  const share = () => {
    navigator.clipboard.writeText(location.href)
    toggle()
  }

  return (
    <Popover width={200} position="bottom" withArrow shadow="md" opened={opened} onChange={toggle} zIndex={1000}>
      <Popover.Target>
        {iconOnly
          ? <ActionIcon onClick={share} variant="default" aria-label="Partager"><IconShare size={16} /></ActionIcon>
          : <Button onClick={share} leftSection={<IconShare size={16} />} variant="default">Partager</Button>
        }
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="xs">L'URL des résultats a été copiée dans le presse-papier.</Text>
      </Popover.Dropdown>
    </Popover>
  )
}

export default ShareButton
