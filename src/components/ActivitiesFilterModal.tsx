import { Group, Modal, Chip, Text, Stack, ScrollArea, em } from "@mantine/core"
import { ActivityFilter, Activity, Airfield } from ".."
import { useMediaQuery } from "@mantine/hooks"
import { CommonIcon } from "./CommonIcon"
import DistanceFilter from "./DistanceFilter"
import FilterModalFooter from "./FilterModalFooter"

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
      title="Filtrer les activités"
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
      fullScreen={isMobile}
      zIndex={1500}
    >
      <Stack gap="md">

        <Stack gap="xs">
          {!isMobile && <Text size="sm" fw={500}>Distance</Text>}
          <DistanceFilter
            activities={activities} airfields={airfields}
            distance={filters.distance} target={filters.target}
            onChange={change => setFilters({ ...filters, ...change })}
            isMobile={!!isMobile} />
        </Stack>

        <Stack gap="xs">
          <Text size="sm" fw={500} c={isMobile ? 'dimmed' : undefined}>Type d'activité</Text>
          <Chip.Group multiple value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })}>
            <Group gap="xs">
              {['food', 'lodging', 'bike', 'transit', 'car', 'hiking', 'culture', 'poi', 'aero', 'nautical', 'nature', 'other'].map(e => (
                <Chip value={e} key={e} size="sm">
                  <CommonIcon iconType={e} />&nbsp;{TYPE_LABELS[e]}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Stack>

        <FilterModalFooter
          onReset={() => { setFilters(EMPTY_FILTERS); onClose() }}
          onClose={onClose}
          label={`Voir ${data.size} activité${data.size > 1 ? 's' : ''}`}
        />

      </Stack>
    </Modal>
  )
}

export default ActivitiesFilterModal
