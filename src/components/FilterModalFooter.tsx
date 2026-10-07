import { Box, Button, Group } from "@mantine/core"
import { IconTrash } from "@tabler/icons-react"

// Sticky inside the modal's scroll area, so the actions stay reachable on long (mobile full-screen) filter lists
// No results: the main button turns into a soft "Aucun …" so the dead end shows before closing
const FilterModalFooter = ({ onReset, onClose, count, noun, none }: {
  onReset: () => void,
  onClose: () => void,
  count: number,
  noun: string,
  none: string,
}) => (
  <Box
    pos="sticky"
    bottom={0}
    py="sm"
    bg="var(--mantine-color-body)"
    style={{ zIndex: 1, borderTop: '1px solid var(--mantine-color-default-border)' }}
  >
    <Group justify="space-between">
      <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={onReset}>
        Tout effacer
      </Button>
      {count > 0
        ? <Button onClick={onClose}>{`Voir ${count} ${noun}${count > 1 ? 's' : ''}`}</Button>
        : <Button onClick={onClose} variant="light" color="gray">{none}</Button>}
    </Group>
  </Box>
)

export default FilterModalFooter
