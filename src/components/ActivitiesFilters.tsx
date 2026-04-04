import { Group, Badge, TextInput, rem, Stack, ActionIcon } from "@mantine/core"
import { IconSearch, IconX } from "@tabler/icons-react"
import ButtonFilter from "./ButtonFilter"
import { Activity, ActivityFilter, Airfield } from ".."
import { useDisclosure } from "@mantine/hooks"
import ActivitiesFilterModal from "./ActivitiesFilterModal"
import ShareButton from "./ShareButton"
import { ActivityBadges } from "./ActivityUtils"


const ActivitiesFilters = ({ airfields, activities, data, filters, setFilters } : {
  airfields: Map<string, Airfield>,
  activities: Map<string, Activity>,
  data: Map<string, Activity>,
  filters: ActivityFilter,
  setFilters: (newFilters: ActivityFilter) => void
}) => {

  const [modalOpened, { open, close }] = useDisclosure(false)
  const activeBadges = ActivityBadges({ airfields, activities, filters, setFilters})
  const activeCount = activeBadges.length

  return (
    <>
      <Stack gap="xs" mb="sm">
        {activeBadges.length > 0 && (
          <Group gap="xs" wrap="wrap">
            {activeBadges.map(b => (
              <Badge
                key={b.key}
                variant="light"
                rightSection={
                  <ActionIcon variant="transparent" size="xs" onClick={b.onRemove} color="gray">
                    <IconX size={10} />
                  </ActionIcon>
                }
              >
                {b.label}
              </Badge>
            ))}
          </Group>
        )}

        <Group gap="xs" wrap="nowrap">
          <TextInput
            placeholder="Chercher une activité"
            leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.currentTarget.value })}
            style={{ flexGrow: 1 }}
            rightSection={filters.search
              ? <ActionIcon variant="subtle" size="sm" onClick={() => setFilters({ ...filters, search: '' })}><IconX size={14} /></ActionIcon>
              : undefined}
          />
          <ButtonFilter onClick={open} activeCount={activeCount} />
          <ShareButton />
        </Group>
      </Stack>

      <ActivitiesFilterModal
        opened={modalOpened}
        onClose={close}
        airfields={airfields}
        activities={activities}
        filters={filters}
        setFilters={setFilters}
        data={data}
      />
    </>
  )
}

export default ActivitiesFilters
