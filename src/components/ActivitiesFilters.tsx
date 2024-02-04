import { Group, TextInput, rem, NumberInput, Button, Collapse, CloseButton, Chip } from "@mantine/core"
import { IconSearch } from "@tabler/icons-react"
import { Activity, ActivityFilter, Airfield } from ".."
import { Dispatch, SetStateAction } from "react"
import { useDisclosure } from "@mantine/hooks"
import { CommonIcon } from "./CommonIcon"
import ObjectFinder from "./ObjectFinder"

const ActivitiesFilters = ({airfields, activities, filters, setFilters}: 
{airfields:Map<string, Airfield>, activities:Map<string, Activity>, filters: ActivityFilter, setFilters: Dispatch<SetStateAction<ActivityFilter>>}) => {

  const [opened, { toggle }] = useDisclosure(Object.values(filters).some(x => Array.isArray(x) ? x.length: x));

return (<>
<Collapse in={opened}>
  <Group justify="space-between">
    <Chip.Group multiple={true} value={filters.type} onChange={(v) => setFilters({...filters, type: v})}>
      <Group>
        {['food','lodging','bike','transit', 'car', 'hiking', 'culture', 'poi', 'aero', 'nautical', 'other'].map(e => <Chip value={e} key={e} size='xs'><CommonIcon iconType={e} />&nbsp;</Chip>)}
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
    <ObjectFinder
      activities={activities} airfields={airfields}
      value={filters.target} onChange={v => setFilters({...filters, target: v})} />
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