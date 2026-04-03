import { Group, Badge, TextInput, rem, Stack, ActionIcon } from "@mantine/core"
import { IconSearch, IconX } from "@tabler/icons-react"
import ButtonFilter from "./ButtonFilter"
import { ADfilter, Activity, Airfield, Profile } from ".."
import { useDisclosure } from "@mantine/hooks"
import AirfieldsFilterModal from "./AirfieldsFilterModal"
import ShareButton from "./ShareButton"

const AD_LABELS: Record<string, string> = {
  CAP: 'Accès public',
  RST: 'Accès restreint',
  toilet: 'Toilettes',
  '100LL': '100LL',
  SP9X: 'SP95/98',
  UL91: 'UL91',
  concrete: 'Piste en dur',
  nvfr: 'VFR de nuit',
  visited: 'Visité',
  favorite: 'Favori',
  upcomingEvents: 'Événements',
}

const SERVICE_LABELS: Record<string, string> = {
  food: 'Restauration', lodging: 'Hébergement', bike: 'Vélo',
  transit: 'Transport', car: 'Voiture', hiking: 'Randonnée',
  culture: 'Culture', aero: 'Aéro', nautical: 'Nautique', other: 'Autre',
}

const AirfieldsFilters = ({ airfields, activities, profile, filters, setFilters }:
  { airfields: Map<string, Airfield>, activities: Map<string, Activity>, profile?: Profile, filters: ADfilter, setFilters: (newFilters: ADfilter) => void }) => {

  const [modalOpened, { open, close }] = useDisclosure(false)
  // Derive active filter badges from current filter state
  type ActiveBadge = { key: string, label: string, onRemove: () => void }
  const activeBadges: ActiveBadge[] = []

  if (filters.runway !== '' && Number.isFinite(filters.runway)) {
    activeBadges.push({
      key: 'runway',
      label: `≥ ${filters.runway}m`,
      onRemove: () => setFilters({ ...filters, runway: '' }),
    })
  }
  for (const v of filters.ad) {
    activeBadges.push({
      key: `ad-${v}`,
      label: AD_LABELS[v] ?? v,
      onRemove: () => setFilters({ ...filters, ad: filters.ad.filter(x => x !== v) }),
    })
  }
  for (const v of filters.services) {
    activeBadges.push({
      key: `svc-${v}`,
      label: SERVICE_LABELS[v] ?? v,
      onRemove: () => setFilters({ ...filters, services: filters.services.filter(x => x !== v) }),
    })
  }
  const validDist = filters.distance !== '' && Number.isFinite(filters.distance)
  if (validDist && filters.target) {
    const [targetType, targetId] = filters.target.split('/')
    const target = {activities, airfields}[targetType]?.get(targetId)
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
      />
    </>
  )
}

export default AirfieldsFilters
