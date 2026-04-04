import { Button, em, Indicator } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { IconFilter } from "@tabler/icons-react"

const ButtonFilter = ({ onClick, activeCount, iconOnly = false }: { 
  onClick: () => void,
  activeCount: number,
  iconOnly?: boolean
}) => {
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`) || iconOnly
  return (
    <Indicator
      disabled={!activeCount || !isMobile}
      label={activeCount}
      inline
      color="blue"
      position="bottom-end"
      size={18}
      offset={8}
      withBorder
      radius={"md"}
    >
    <Button
      leftSection={isMobile ? undefined : <IconFilter size={16} />}
      onClick={onClick}
      variant='default'
      >
      {isMobile ? <IconFilter size={16} /> : `Filtres${activeCount > 0 ? ` (${activeCount})` : ''}`}
    </Button>
    </Indicator>
  )
}

export default ButtonFilter
