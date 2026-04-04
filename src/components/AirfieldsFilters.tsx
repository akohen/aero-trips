import { Group, Badge, TextInput, rem, Stack, ActionIcon } from "@mantine/core"
import { IconSearch, IconX } from "@tabler/icons-react"
import ButtonFilter from "./ButtonFilter"
import { ADfilter, Activity, Airfield, Profile } from ".."
import { useDisclosure } from "@mantine/hooks"
import AirfieldsFilterModal from "./AirfieldsFilterModal"
import ShareButton from "./ShareButton"
import { ActiveBadges } from "./AirfieldUtils"


const AirfieldsFilters = ({ airfields, activities, data, profile, filters, setFilters }: { 
  airfields: Map<string, Airfield>,
  activities: Map<string, Activity>,
  data: Map<string, Airfield>,
  profile?: Profile,
  filters: ADfilter,
  setFilters: (newFilters: ADfilter) => void
}) => {

  const [modalOpened, { open, close }] = useDisclosure(false)
  const activeBadges = ActiveBadges({ airfields, activities, filters, setFilters })
  const activeCount = activeBadges.length

  return (
    <>
      <Stack gap="xs" mb={"sm"}>
        {/* Active filter badges */}
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

        {/* Search bar row */}
        <Group gap="xs" wrap="nowrap">
          <TextInput
            placeholder="Chercher un terrain"
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

      <AirfieldsFilterModal
        opened={modalOpened}
        onClose={close}
        airfields={airfields}
        activities={activities}
        profile={profile}
        filters={filters}
        setFilters={setFilters}
        data={data}
      />
    </>
  )
}

export default AirfieldsFilters
