import { Group, Chip, InputLabel, TextInput, rem } from "@mantine/core"
import { IconSearch } from "@tabler/icons-react"
import { ADfilter } from "../types"
import { Dispatch, SetStateAction } from "react"

const AirfieldsFilters = ({filters, setFilters}: {filters: ADfilter, setFilters: Dispatch<SetStateAction<ADfilter>>}) => (<>
  <Group justify="space-between">
    <Chip.Group multiple={false} value={filters.status} onChange={(v) => setFilters({...filters, status: v})}>
      <Group justify="center">
        <InputLabel>Statut</InputLabel>
        <Chip value="1" size='xs'>Tous</Chip>
        <Chip value="2" size='xs'>Publics uniquement</Chip>
        <Chip value="3" size='xs'>Publics ou restreints</Chip>
      </Group>
    </Chip.Group>
  </Group>
  <TextInput
    placeholder="Chercher un terrain"
    leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
    value={filters.search}
    onChange={(e) => setFilters({...filters, search: e.currentTarget.value})}
    mt={'md'}
  />
</>)

export default AirfieldsFilters