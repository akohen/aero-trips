import { Group, NumberInput, Stack, Text } from "@mantine/core"
import { Activity, Airfield } from ".."
import ObjectFinder from "./ObjectFinder"

// "Moins de X km de <target>": one line on desktop; on mobile the finder takes its own full-width line
const DistanceFilter = ({ airfields, activities, distance, target, onChange, isMobile }: {
  airfields: Map<string, Airfield>,
  activities: Map<string, Activity>,
  distance: number | '',
  target: string | null,
  onChange: (change: { distance?: number | '', target?: string | null }) => void,
  isMobile: boolean,
}) => {
  const radius = (
    <Group gap="xs" align="center" wrap="nowrap">
      <Text size="sm">Moins de</Text>
      <NumberInput
        style={{ width: 90 }}
        size="sm"
        suffix="km"
        min={0} max={9999} step={5}
        placeholder="5km"
        value={distance}
        onChange={v => onChange({ distance: v as number })}
      />
      <Text size="sm">de</Text>
    </Group>
  )
  const finder = (
    <ObjectFinder
      activities={activities} airfields={airfields}
      value={target} onChange={v => onChange({ target: v })}
      w={isMobile ? '100%' : 210} />
  )
  return isMobile
    ? <Stack gap="xs">{radius}{finder}</Stack>
    : <Group gap="xs" align="center">{radius}{finder}</Group>
}

export default DistanceFilter
