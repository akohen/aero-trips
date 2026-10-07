import { Box, Group, NumberInput, Text } from "@mantine/core"
import { Activity, Airfield } from ".."
import ObjectFinder from "./ObjectFinder"

// "Moins de X km de <target>". On mobile the row must fit one line: "Moins de" folds into the input ("< 300 km")
// and the finder takes the remaining width.
// The filter needs both values: picking a target with no radius fills in `defaultDistance`, shown in the input.
const DistanceFilter = ({ airfields, activities, distance, target, onChange, defaultDistance, isMobile }: {
  airfields: Map<string, Airfield>,
  activities: Map<string, Activity>,
  distance: number | '',
  target: string | null,
  onChange: (change: { distance?: number | '', target?: string | null }) => void,
  defaultDistance: number,
  isMobile: boolean,
}) => (
  <Group gap="xs" align="center" wrap="nowrap">
    {!isMobile && <Text size="sm">Moins de</Text>}
    <NumberInput
      style={{ width: isMobile ? 96 : 100, flexShrink: 0 }}
      size="sm"
      prefix={isMobile ? '< ' : undefined}
      suffix={isMobile ? ' km' : 'km'}
      min={0} max={9999} step={5}
      placeholder={isMobile ? `< ${defaultDistance} km` : `${defaultDistance}km`}
      value={distance}
      onChange={v => onChange({ distance: v as number })}
    />
    <Text size="sm">de</Text>
    <Box style={isMobile ? { flex: 1, minWidth: 0 } : undefined}>
      <ObjectFinder
        activities={activities} airfields={airfields}
        value={target}
        onChange={v => onChange(v && !distance ? { target: v, distance: defaultDistance } : { target: v })}
        w={isMobile ? '100%' : 210} />
    </Box>
  </Group>
)

export default DistanceFilter
