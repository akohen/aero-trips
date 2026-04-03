import { Group, Badge, TextInput, rem, Stack, ActionIcon } from "@mantine/core"
import { IconSearch, IconX } from "@tabler/icons-react"
import ButtonFilter from "./ButtonFilter"
import { Activity, ActivityFilter, Airfield } from ".."
import { useDisclosure } from "@mantine/hooks"
import ActivitiesFilterModal from "./ActivitiesFilterModal"
import ShareButton from "./ShareButton"

const TYPE_LABELS: Record<string, string> = {
  food: 'Restauration', lodging: 'Hébergement', bike: 'Vélo',
  transit: 'Transport', car: 'Voiture', hiking: 'Randonnée',
  culture: 'Culture', poi: 'À voir du ciel', aero: 'Aéro',
  nautical: 'Nautique', nature: 'Nature', other: 'Autre',
}

const ActivitiesFilters = ({ airfields, activities, filters, setFilters }:
  { airfields: Map<string, Airfield>, activities: Map<string, Activity>, filters: ActivityFilter, setFilters: (newFilters: ActivityFilter) => void }) => {

  const [modalOpened, { open, close }] = useDisclosure(false)
  type ActiveBadge = { key: string, label: string, onRemove: () => void }
  const activeBadges: ActiveBadge[] = []

  for (const v of filters.type) {
    activeBadges.push({
      key: `type-${v}`,
      label: TYPE_LABELS[v] ?? v,
      onRemove: () => setFilters({ ...filters, type: filters.type.filter(x => x !== v) }),
    })
  }

  const validDist = filters.distance !== '' && Number.isFinite(filters.distance)
  if (validDist && filters.target) {
    const [targetType, targetId] = filters.target.split('/')
    const target = { activities, airfields }[targetType]?.get(targetId)
    const targetLabel = target && 'codeIcao' in target
      ? target.codeIcao
      : target
        ? (target.name.length > 16 ? target.name.slice(0, 15) + '…' : target.name)
        : filters.target
    activeBadges.push({
      key: 'distance',
      label: `< ${filters.distance}km de ${targetLabel}`,
      onRemove: () => setFilters({ ...filters, distance: '', target: null }),
    })
  }

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
      />
    </>
  )
}

export default ActivitiesFilters
