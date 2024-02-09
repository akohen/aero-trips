import { Group, Chip, InputLabel, TextInput, rem, NumberInput, Button, Collapse, CloseButton } from "@mantine/core"
import { IconCircleCheck, IconForbid, IconGasStation, IconRoad, IconSearch, IconToiletPaper } from "@tabler/icons-react"
import { ADfilter, Activity, Airfield } from ".."
import { Dispatch, SetStateAction } from "react"
import { useDisclosure } from "@mantine/hooks"
import { CommonIcon } from "./CommonIcon"
import ObjectFinder from "./ObjectFinder"

const AirfieldsFilters = ({airfields, activities, filters, setFilters}: 
{airfields:Map<string, Airfield>, activities:Map<string, Activity>, filters: ADfilter, setFilters: Dispatch<SetStateAction<ADfilter>>}) => {

  const [opened, { toggle }] = useDisclosure(Object.values(filters).some(x => Array.isArray(x) ? x.length: x));

return (<>
<Collapse in={opened}>
  <Group justify="space-between">
    <Chip.Group multiple={true} value={filters.services} onChange={(v) => setFilters({...filters, services: v})}>
      <Group>
        {['food','lodging','bike','transit', 'car', 'hiking', 'culture', 'aero', 'nautical', 'other'].map(e => <Chip value={e} key={e} size='xs'><CommonIcon iconType={e} />&nbsp;</Chip>)}
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
        <Chip value="CAP" size='xs'><IconCircleCheck size={16} color="teal" />Accès public</Chip>
        <Chip value="RST" size='xs'><IconForbid size={16} color="orange" /> Accès restreint</Chip>
        <Chip value="toilet" size='xs'><IconToiletPaper size={16} /> Toilettes</Chip>
        <Chip value="100LL" size='xs'><IconGasStation size={16} /> 100LL</Chip>
        <Chip value="concrete" size='xs'><IconRoad size={16} /> Piste en dur</Chip>
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
      services: [],
      ad: [],
      runway: '',
      distance: '',
      target: null,
    })}>
      Supprimer tous les filtres
    </Button>
  </Group>
</>)}

export default AirfieldsFilters