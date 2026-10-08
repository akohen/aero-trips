import { Anchor, Group, Popover, Stack, Text, UnstyledButton } from "@mantine/core"
import { IconInfoCircle } from "@tabler/icons-react"
import { Airfield } from ".."
import { LANDING_FEE_REFERENCE, landingFeeDisplay } from "../utils/reports"

// Price and parking stay visible; reference case, source, note and links open on click (touch screens have no hover).
export const LandingFee = ({ airfield, onReport }: { airfield: Airfield, onReport?: () => void }) => {
  const fee = landingFeeDisplay(airfield.landingFee)
  if (!fee.known) return (
    <Text c="dimmed">
      {fee.label}
      {onReport && <> · <Anchor component="button" type="button" inherit onClick={onReport}>Signaler</Anchor></>}
    </Text>
  )

  const paid = airfield.landingFee!.amount > 0
  return (
    <Stack gap={2}>
      <Popover width={300} position="bottom-start" withArrow shadow="md">
        <Popover.Target>
          <UnstyledButton aria-label={`${fee.label} : détails et source`}>
            <Group gap={4} wrap="nowrap">
              <Text>{fee.label}</Text>
              <IconInfoCircle size={16} color="var(--mantine-color-dimmed)" />
            </Group>
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="xs">
            {paid && <Text size="sm" fw={500}>{LANDING_FEE_REFERENCE}</Text>}
            <Text size="xs">
              Source : {fee.url
                ? <Anchor href={fee.url} target="_blank" rel="noopener nofollow" inherit>{fee.source}</Anchor>
                : fee.source}
            </Text>
            {fee.note && <Text size="xs" c="dimmed">{fee.note}</Text>}
            {fee.pageUrl && (
              <Anchor href={fee.pageUrl} target="_blank" rel="noopener nofollow" size="xs">Tarifs de l'aérodrome</Anchor>
            )}
          </Stack>
        </Popover.Dropdown>
      </Popover>
      {fee.parking.map(line => <Text key={line} size="sm">{line}</Text>)}
    </Stack>
  )
}
