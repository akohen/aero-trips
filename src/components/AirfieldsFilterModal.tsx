import { Group, Button, Modal, NumberInput, Chip, Divider, Text, Stack, ScrollArea, em } from "@mantine/core"
import { IconCalendarEvent, IconCircleCheck, IconForbid, IconGasStation, IconHistory, IconMoon, IconRoad, IconStar, IconToiletPaper, IconTrash } from "@tabler/icons-react"
import { ADfilter, Activity, Airfield, Profile } from ".."
import { useMediaQuery } from "@mantine/hooks"
import { CommonIcon } from "./CommonIcon"
import ObjectFinder from "./ObjectFinder"

const SERVICE_LABELS: Record<string, string> = {
  food: 'Restauration', lodging: 'Hébergement', bike: 'Vélo',
  transit: 'Transport', car: 'Voiture', hiking: 'Randonnée',
  culture: 'Culture', aero: 'Aéro', nautical: 'Nautique', other: 'Autre',
}

const EMPTY_FILTERS: ADfilter = {
  search: '', services: [], ad: [], runway: '', distance: '', target: null,
}

const AirfieldsFilterModal = ({ airfields, activities, profile, filters, setFilters, opened, onClose }:
  { airfields: Map<string, Airfield>, activities: Map<string, Activity>, profile?: Profile, filters: ADfilter, setFilters: (newFilters: ADfilter) => void, opened: boolean, onClose: () => void }) => {

  // Mirror the AppShell breakpoint from Layout.tsx: navbar on desktop, header on mobile
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
      fullScreen={isMobile}
      zIndex={1500}
    >
      <Stack gap="md">

        {/* ── À propos du terrain ── */}
        <Divider label="À propos du terrain" labelPosition="left" />

        <Stack gap="xs">
          <Text size="sm" fw={500}>Longueur de piste minimum</Text>
          <NumberInput
            style={{ width: 130 }}
            suffix="m"
            min={0} max={9999} step={50}
            placeholder="500m"
            value={filters.runway}
            onChange={(v) => setFilters({ ...filters, runway: v as number })}
          />
        </Stack>

        <Stack gap="xs">
          {!isMobile && <Text size="sm" fw={500}>Statut d'accès</Text>}
          <Chip.Group multiple value={filters.ad} onChange={(v) => setFilters({ ...filters, ad: v })}>
            <Group gap="xs">
              <Chip value="CAP" size="sm"><IconCircleCheck size={14} color="teal" /> Accès public</Chip>
              <Chip value="RST" size="sm"><IconForbid size={14} color="orange" /> Accès restreint</Chip>
            </Group>
          </Chip.Group>
        </Stack>

        <Stack gap="xs">
          {!isMobile && <Text size="sm" fw={500}>Équipements</Text>}
          <Chip.Group multiple value={filters.ad} onChange={(v) => setFilters({ ...filters, ad: v })}>
            <Group gap="xs">
              <Chip value="toilet" size="sm"><IconToiletPaper size={14} /> Toilettes</Chip>
              <Chip value="concrete" size="sm"><IconRoad size={14} /> Piste en dur</Chip>
              <Chip value="nvfr" size="sm"><IconMoon size={14} /> VFR de nuit</Chip>
            </Group>
          </Chip.Group>
        </Stack>

        <Stack gap="xs">
          {!isMobile && <Text size="sm" fw={500}>Carburant disponible</Text>}
          <Chip.Group multiple value={filters.ad} onChange={(v) => setFilters({ ...filters, ad: v })}>
            <Group gap="xs">
              <Chip value="100LL" size="sm"><IconGasStation size={14} color="darkblue" /> 100LL</Chip>
              <Chip value="SP9X" size="sm"><IconGasStation size={14} color="green" /> SP95/98</Chip>
              <Chip value="UL91" size="sm"><IconGasStation size={14} color="red" /> UL91</Chip>
            </Group>
          </Chip.Group>
        </Stack>

        <Stack gap="xs">
          <Chip.Group multiple value={filters.ad} onChange={(v) => setFilters({ ...filters, ad: v })}>
            <Group gap="xs">
              <Chip value="upcomingEvents" size="sm"><IconCalendarEvent size={14} /> Événements à venir</Chip>
            </Group>
          </Chip.Group>
        </Stack>

        {profile && (
          <Stack gap="xs">
            {!isMobile && <Text size="sm" fw={500}>Mon profil</Text>}
            <Chip.Group multiple value={filters.ad} onChange={(v) => setFilters({ ...filters, ad: v })}>
              <Group gap="xs">
                <Chip value="visited" size="sm"><IconHistory size={14} /> Déjà visité</Chip>
                <Chip value="favorite" size="sm"><IconStar size={14} /> Favori</Chip>
              </Group>
            </Chip.Group>
          </Stack>
        )}

        {/* ── Alentours ── */}
        <Divider label="Alentours" labelPosition="left" mt="xs" />

        <Stack gap="xs">
          {!isMobile && <Text size="sm" fw={500}>Activités à proximité</Text>}
          <Chip.Group multiple value={filters.services} onChange={(v) => setFilters({ ...filters, services: v })}>
            <Group gap="xs">
              {['food', 'lodging', 'bike', 'transit', 'car', 'hiking', 'culture', 'aero', 'nautical', 'other'].map(e => (
                <Chip value={e} key={e} size="sm">
                  <CommonIcon iconType={e} />&nbsp;{SERVICE_LABELS[e]}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Stack>

        <Stack gap="xs">
          {!isMobile && <Text size="sm" fw={500}>Distance depuis un terrain ou une activité</Text>}
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

        {/* Footer actions */}
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

export default AirfieldsFilterModal
