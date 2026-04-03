import { Button, em } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { IconFilter } from "@tabler/icons-react"

const ButtonFilter = ({ onClick, activeCount }: { onClick: () => void, activeCount: number }) => {
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`)
  return (
    <Button
      leftSection={isMobile ? undefined : <IconFilter size={16} />}
      onClick={onClick}
      variant={activeCount > 0 ? 'filled' : 'default'}
    >
      {isMobile ? <IconFilter size={16} /> : `Filtres${activeCount > 0 ? ` (${activeCount})` : ''}`}
    </Button>
  )
}

export default ButtonFilter
