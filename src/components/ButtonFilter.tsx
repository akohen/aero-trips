import { Badge, Button, em } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { IconFilter } from "@tabler/icons-react"

const ButtonFilter = ({ onClick, activeCount, iconOnly = false }: {
  onClick: () => void,
  activeCount: number,
  iconOnly?: boolean
}) => {
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`) || iconOnly

  if (!isMobile) {
    return (
      <Button
        leftSection={<IconFilter size={16} />}
        onClick={onClick}
        variant='default'
      >
        {`Filtres${activeCount > 0 ? ` (${activeCount})` : ''}`}
      </Button>
    )
  }

  // iconOnly / mobile: must stay a Button as root (e.g. inside Button.Group)
  // Show active count as an inline badge to avoid Indicator wrapping the Button
  return (
    <Button onClick={onClick} variant='default'>
      <IconFilter size={16} />
      {activeCount > 0 && (
        <Badge size="xs" circle color="blue" style={{ position: 'absolute', top: 1, right: 1 }}>
          {activeCount}
        </Badge>
      )}
    </Button>
  )
}

export default ButtonFilter
