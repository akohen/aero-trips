import { Group, TextInput, rem, NumberInput, Select, Button, Collapse, CloseButton, Chip } from "@mantine/core"
import { IconSearch } from "@tabler/icons-react"
import { Activity, ActivityFilter, Airfield } from ".."
import { Dispatch, SetStateAction } from "react"
import { useDisclosure } from "@mantine/hooks"
import { CommonIcon } from "./CommonIcon"

const ActivitiesFilters = ({airfields, activities, filters, setFilters}: 
{airfields:Map<string, Airfield>, activities:Map<string, Activity>, filters: ActivityFilter, setFilters: Dispatch<SetStateAction<ActivityFilter>>}) => {

  const [opened, { toggle }] = useDisclosure(Object.values(filters).some(x => Array.isArray(x) ? x.length: x));
  
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
<Collapse in={opened}>
  <Group justify="space-between">
    <Chip.Group multiple={true} value={filters.type} onChange={(v) => setFilters({...filters, type: v})}>
      <Group>
        <Chip value="food" size='xs'><CommonIcon iconType={"food"} />&nbsp;Restauration</Chip>
        <Chip value="lodging" size='xs'><CommonIcon iconType={"lodging"} />&nbsp;Hébergement</Chip>
        <Chip value="bike" size='xs'><CommonIcon iconType={"bike"} />&nbsp;Vélo</Chip>
        <Chip value="poi" size='xs'><CommonIcon iconType={"poi"} />&nbsp;A voir du ciel</Chip>
        <Chip value="other" size='xs'><CommonIcon iconType={"other"} />&nbsp;Autres activités</Chip>
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
      onChange={v => setFilters({...filters, target: v})}
      data={listAA}
      placeholder="Terrain ou activité"
      limit={8} searchable clearable
      size="xs"
      style={{width:'250px'}}
    />
    </Group>
  </Group>
  </Collapse>
  <Group justify="space-between"  mt={'md'}>
    <TextInput
      placeholder="Chercher un terrain"
      leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
      value={filters.search}
      onChange={(e) => setFilters({...filters, search: e.currentTarget.value})}
      style={{flexGrow:2}}
      rightSection={filters.search ? <CloseButton size={18} onClick={() => setFilters({...filters, search: ''})} style={{cursor:'pointer'}}/> : undefined}
    />
    <Button onClick={toggle}>Filtres avancés</Button>
    <Button onClick={() => setFilters({
      search:'',
      distance: '',
      target: null,
      type: [],
    })}>
      Supprimer tous les filtres
    </Button>
  </Group>
</>)}

export default ActivitiesFilters