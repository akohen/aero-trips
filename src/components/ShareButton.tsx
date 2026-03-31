import { Button, Popover, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { IconShare } from "@tabler/icons-react"

const ShareButton = () => {
  const [opened, { toggle }] = useDisclosure(false)

  const share = () => {
    navigator.clipboard.writeText(location.href)
    toggle()
  }

  return (
    <Popover width={200} position="bottom" withArrow shadow="md" opened={opened} onChange={toggle}>
      <Popover.Target>
        <Button onClick={share} leftSection={<IconShare size={16} />} variant="default">
          Partager
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="xs">L'URL des résultats a été copiée dans le presse-papier.</Text>
      </Popover.Dropdown>
    </Popover>
  )
}

export default ShareButton
