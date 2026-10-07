import { Group, Modal, NumberInput, Chip, Divider, Text, Stack, ScrollArea, SegmentedControl, em } from "@mantine/core"
import { ReactNode } from "react"
import { IconCalendarEvent, IconCircleCheck, IconForbid, IconGasStation, IconHistory, IconRoad, IconStar, IconToiletPaper } from "@tabler/icons-react"
import { ADfilter, Activity, Airfield, Profile } from ".."
import { useMediaQuery } from "@mantine/hooks"
import { CommonIcon } from "./CommonIcon"
import DistanceFilter from "./DistanceFilter"
import FilterModalFooter from "./FilterModalFooter"
import { LANDING_FEE_FILTERS } from "../utils/reports"

const NVFR_FILTERS = ['nvfr', 'nvfr-full']
const FEE_FILTERS = Object.keys(LANDING_FEE_FILTERS)

// Single-choice groups stored in `ad`: '' clears the group
const pickOne = (ad: string[], group: string[], value: string) =>
  [...ad.filter(x => !group.includes(x)), ...(value ? [value] : [])]
const pickedIn = (ad: string[], group: string[]) => ad.find(x => group.includes(x)) ?? ''

// Label above the controls on desktop, inline before them on mobile
const FilterRow = ({ label, isMobile, children }: { label: string, isMobile: boolean, children: ReactNode }) => isMobile
  ? <Group gap="xs" align="center"><Text size="sm" fw={500} c="dimmed">{label}</Text>{children}</Group>
  : <Stack gap="xs"><Text size="sm" fw={500}>{label}</Text>{children}</Stack>

const SERVICE_LABELS: Record<string, string> = {
  food: 'Restauration', lodging: 'Hébergement', bike: 'Vélo',
  transit: 'Transport', car: 'Voiture', hiking: 'Randonnée',
  culture: 'Culture', aero: 'Aéro', nautical: 'Nautique', other: 'Autre',
}

const EMPTY_FILTERS: ADfilter = {
  search: '', services: [], ad: [], runway: '', distance: '', target: null,
}

const AirfieldsFilterModal = ({ airfields, activities, data, profile, filters, setFilters, opened, onClose }: {
  airfields: Map<string, Airfield>,
  activities: Map<string, Activity>,
  data: Map<string, Airfield>,
  profile?: Profile,
  filters: ADfilter,
  setFilters: (newFilters: ADfilter) => void, opened: boolean, onClose: () => void
}) => {

  // Mirror the AppShell breakpoint from Layout.tsx: navbar on desktop, header on mobile
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Filtrer les terrains"
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
      fullScreen={isMobile}
      zIndex={1500}
    >
      <Stack gap="md">

        {/* ── À propos du terrain ── */}
        <Divider label="À propos du terrain" labelPosition="left" />

        <FilterRow label="Piste minimum" isMobile={isMobile}>
          <NumberInput
            style={{ width: 130 }}
            suffix="m"
            min={0} max={9999} step={50}
            placeholder="500m"
            value={filters.runway}
            onChange={(v) => setFilters({ ...filters, runway: v as number })}
          />
        </FilterRow>

        <FilterRow label="Accès" isMobile={isMobile}>
          <Chip.Group multiple value={filters.ad} onChange={(v) => setFilters({ ...filters, ad: v })}>
            <Group gap="xs">
              <Chip value="CAP" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconCircleCheck size={14} color="teal" /> Public</span></Chip>
              <Chip value="RST" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconForbid size={14} color="orange" /> Restreint</span></Chip>
            </Group>
          </Chip.Group>
        </FilterRow>

        <FilterRow label="Équipements" isMobile={isMobile}>
          <Chip.Group multiple value={filters.ad} onChange={(v) => setFilters({ ...filters, ad: v })}>
            <Group gap="xs">
              <Chip value="toilet" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconToiletPaper size={14} /> Toilettes</span></Chip>
              <Chip value="concrete" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconRoad size={14} /> Piste en dur</span></Chip>
            </Group>
          </Chip.Group>
        </FilterRow>

        {/* Single choice: unrestricted is a subset of any licensing */}
        <FilterRow label="VFR de nuit" isMobile={isMobile}>
          <SegmentedControl
            size="xs"
            style={{ alignSelf: 'flex-start' }}
            value={pickedIn(filters.ad, NVFR_FILTERS)}
            onChange={(v) => setFilters({ ...filters, ad: pickOne(filters.ad, NVFR_FILTERS, v) })}
            data={[
              { value: '', label: 'Indifférent' },
              { value: 'nvfr', label: 'Agréé' },
              { value: 'nvfr-full', label: 'Sans limitations' },
            ]}
          />
        </FilterRow>

        {/* Single choice: free is a subset of < 15 € */}
        <FilterRow label="Taxe d'atterrissage" isMobile={isMobile}>
          <SegmentedControl
            size="xs"
            style={{ alignSelf: 'flex-start' }}
            value={pickedIn(filters.ad, FEE_FILTERS)}
            onChange={(v) => setFilters({ ...filters, ad: pickOne(filters.ad, FEE_FILTERS, v) })}
            data={[
              { value: '', label: 'Indifférent' },
              { value: 'fee-15', label: '< 15 €' },
              { value: 'fee-free', label: 'Gratuite' },
            ]}
          />
        </FilterRow>

        <FilterRow label="Carburant" isMobile={isMobile}>
          <Chip.Group multiple value={filters.ad} onChange={(v) => setFilters({ ...filters, ad: v })}>
            <Group gap="xs">
              <Chip value="100LL" size="sm"><CommonIcon iconType="100LL" />100LL</Chip>
              <Chip value="SP9X" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconGasStation size={14} color="green" /> SP95/98</span></Chip>
              <Chip value="UL91" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconGasStation size={14} color="red" /> UL91</span></Chip>
            </Group>
          </Chip.Group>
        </FilterRow>

        {profile && (
          <FilterRow label="Mon profil" isMobile={isMobile}>
            <Chip.Group multiple value={filters.ad} onChange={(v) => setFilters({ ...filters, ad: v })}>
              <Group gap="xs">
                <Chip value="visited" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconHistory size={14} /> Déjà visité</span></Chip>
                <Chip value="favorite" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconStar size={14} /> Favori</span></Chip>
              </Group>
            </Chip.Group>
          </FilterRow>
        )}

        {/* ── Alentours ── */}
        <Divider label="Alentours" labelPosition="left" mt="xs" />

        <Stack gap="xs">
          <Text size="sm" fw={500} c={isMobile ? 'dimmed' : undefined}>Activités à proximité</Text>
          <Chip.Group multiple value={filters.services} onChange={(v) => setFilters({ ...filters, services: v })}>
            <Group gap="xs">
              {['food', 'lodging', 'bike', 'transit', 'car', 'hiking', 'culture', 'aero', 'nautical', 'other'].map(e => (
                <Chip value={e} key={e} size="sm">
                  <CommonIcon iconType={e} />&nbsp;{SERVICE_LABELS[e]}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
          <Chip.Group multiple value={filters.ad} onChange={(v) => setFilters({ ...filters, ad: v })}>
            <Group gap="xs">
              <Chip value="upcomingEvents" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconCalendarEvent size={14} /> Événements à venir</span></Chip>
            </Group>
          </Chip.Group>
        </Stack>

        <Stack gap="xs">
          <Text size="sm" fw={500} c={isMobile ? 'dimmed' : undefined}>Distance depuis un terrain ou une activité</Text>
          <DistanceFilter
            activities={activities} airfields={airfields}
            distance={filters.distance} target={filters.target}
            onChange={change => setFilters({ ...filters, ...change })}
            isMobile={!!isMobile} />
        </Stack>

        <FilterModalFooter
          onReset={() => { setFilters(EMPTY_FILTERS); onClose() }}
          onClose={onClose}
          label={`Voir ${data.size} terrain${data.size > 1 ? 's' : ''}`}
        />

      </Stack>
    </Modal>
  )
}

export default AirfieldsFilterModal
