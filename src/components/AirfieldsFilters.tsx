import { Group, Chip, InputLabel, TextInput, rem, NumberInput, Select } from "@mantine/core"
import { IconSearch } from "@tabler/icons-react"
import { ADfilter, Activity, Airfield } from "../types"
import { Dispatch, SetStateAction } from "react"

const AirfieldsFilters = ({airfields, activities, filters, setFilters}: 
{airfields:Map<string, Airfield>, activities:Map<string, Activity>, filters: ADfilter, setFilters: Dispatch<SetStateAction<ADfilter>>}) => {
  
  // Multiple AD or activities with the exact same position will have the same key and conflict with each other! Maybe go back to IDs ?
  const listAA = [...airfields] 
    .map(([, ad]) => (
      {label: `${ad.name} - ${ad.codeIcao}`, value:`${ad.position.latitude},${ad.position.longitude}`}
    )).concat([...activities]
    .map(([, activity]) => (
      {label: activity.name, value:`${activity.position.latitude},${activity.position.longitude}`}
    ))
  )

return (<>
  <Group justify="space-between">
    <Chip.Group multiple={true} value={filters.services} onChange={(v) => setFilters({...filters, services: v})}>
      <Group justify="center">
        <Chip value="2" size='xs'>🍽 Restauration</Chip>
        <Chip value="3" size='xs'>🛏 Hébergement</Chip>
        <Chip value="4" size='xs'>🚲 Vélo</Chip>
        <Chip value="5" size='xs'>🚌 Transport</Chip>
        <Chip value="6" size='xs'>🥾 Randonée</Chip>
        <Chip value="7" size='xs'>🖼 Visite</Chip>
        <Chip value="8" size='xs'>🎪 Autres activités</Chip>
      </Group>
    </Chip.Group>
    <Group justify="space-between">
      <InputLabel>Longueur de piste minimum</InputLabel>
      <NumberInput
        style={{width:'100px'}}
        suffix="m"
        min={0} max={9999} step={50}
        placeholder="500m"
        value={filters.runway} onChange={(v) => setFilters({...filters, runway: v as number})}
      />
    </Group>
    <Chip.Group multiple={true} value={filters.ad} onChange={(v) => setFilters({...filters, ad: v})}>
      <Group justify="center">
        <Chip value="CAP" size='xs'>🟢 Accès public</Chip>
        <Chip value="RST" size='xs'>🟡 Accès restreint</Chip>
        <Chip value="toilet" size='xs'>🚽 Toilettes</Chip>
        <Chip value="100LL" size='xs'>⛽ 100LL</Chip>
      </Group>
    </Chip.Group>
    <Group justify="space-between">
    A moins de
    <NumberInput
      style={{width:'90px'}}
      size="xs"
      suffix="km"
      min={0} max={9999} step={5}
      placeholder="5km"
      value={filters.distance} onChange={v => setFilters({...filters, distance: v as number})}
      />
    de
    <Select 
      value={filters.target}
      onChange={v => setFilters({...filters, target: v || ''})}
      data={listAA}
      placeholder="Terrain ou activité"
      limit={8} searchable clearable
      size="xs"
      style={{width:'250px'}}
    />
    </Group>

  </Group>
  <TextInput
    placeholder="Chercher un terrain"
    leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
    value={filters.search}
    onChange={(e) => setFilters({...filters, search: e.currentTarget.value})}
    mt={'md'}
  />
</>)}

export default AirfieldsFilters