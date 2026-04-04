import { Group, Button, Modal, NumberInput, Chip, Divider, Text, Stack, ScrollArea, em } from "@mantine/core"
import { IconTrash } from "@tabler/icons-react"
import { ActivityFilter, Activity, Airfield } from ".."
import { useMediaQuery } from "@mantine/hooks"
import { CommonIcon } from "./CommonIcon"
import ObjectFinder from "./ObjectFinder"

const TYPE_LABELS: Record<string, string> = {
  food: 'Restauration', lodging: 'Hébergement', bike: 'Vélo',
  transit: 'Transport', car: 'Voiture', hiking: 'Randonnée',
  culture: 'Culture', poi: 'À voir du ciel', aero: 'Aéro',
  nautical: 'Nautique', nature: 'Nature', other: 'Autre',
}

const EMPTY_FILTERS: ActivityFilter = {
  search: '', type: [], distance: '', target: null,
}

const ActivitiesFilterModal = ({ airfields, activities, data, filters, setFilters, opened, onClose }: {
  airfields: Map<string, Airfield>,
  activities: Map<string, Activity>,
  data: Map<string, Activity>,
  filters: ActivityFilter,
  setFilters: (newFilters: ActivityFilter) => void,
  opened: boolean,
  onClose: () => void
}) => {

  const isMobile = useMediaQuery(`(max-width: ${em(768)})`)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Filtrer les activités (${data.size} résultats)`}
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
      fullScreen={isMobile}
      zIndex={1500}
    >
      <Stack gap="md">

        <Divider label="Type d'activité" labelPosition="left" />

        <Chip.Group multiple value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })}>
          <Group gap="xs">
            {['food', 'lodging', 'bike', 'transit', 'car', 'hiking', 'culture', 'poi', 'aero', 'nautical', 'nature', 'other'].map(e => (
              <Chip value={e} key={e} size="sm">
                <CommonIcon iconType={e} />&nbsp;{TYPE_LABELS[e]}
              </Chip>
            ))}
          </Group>
        </Chip.Group>

        <Divider label="Distance" labelPosition="left" mt="xs" />

        <Stack gap="xs">
          <Text size="sm" fw={500}>Distance depuis un terrain ou une activité</Text>
          <Group gap="xs" align="center">
            <Text size="sm">Moins de</Text>
            <NumberInput
              style={{ width: 90 }}
              size="sm"
              suffix="km"
              min={0} max={9999} step={5}
              placeholder="5km"
              value={filters.distance}
              onChange={v => setFilters({ ...filters, distance: v as number })}
            />
            <Text size="sm">de</Text>
            <ObjectFinder
              activities={activities} airfields={airfields}
              value={filters.target} onChange={v => setFilters({ ...filters, target: v })} />
          </Group>
        </Stack>

        <Group justify="space-between">
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() => {setFilters(EMPTY_FILTERS); onClose()}}
          >
            Supprimer tous les filtres
          </Button>
          <Button onClick={onClose}>Fermer</Button>
        </Group>

      </Stack>
    </Modal>
  )
}

export default ActivitiesFilterModal
