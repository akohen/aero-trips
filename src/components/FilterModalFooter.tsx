import { Box, Button, Group } from "@mantine/core"
import { IconTrash } from "@tabler/icons-react"

// Sticky inside the modal's scroll area, so the actions stay reachable on long (mobile full-screen) filter lists
const FilterModalFooter = ({ onReset, onClose, label }: {
  onReset: () => void,
  onClose: () => void,
  label: string,
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
        Réinitialiser
      </Button>
      <Button onClick={onClose}>{label}</Button>
    </Group>
  </Box>
)

export default FilterModalFooter
