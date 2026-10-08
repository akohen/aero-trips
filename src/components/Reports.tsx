import { lazy, Suspense, useState } from "react"
import { ActionIcon, Badge, Button, Dialog, Group, Loader, Menu, Modal, Paper, Stack, Text, Title } from "@mantine/core"
import { IconDots, IconMessagePlus, IconPencil, IconTrash } from "@tabler/icons-react"
import { Airfield, Profile, Report } from ".."
import { newReport, ReportInput, ReportsState } from "../hooks/useReports"
import { ReportFormControl } from "../hooks/useReportForm"
import { countVisitedAirfields, visitedLabel } from "../utils/passportBadge"
import { formatVisitDate, reportFeeLabel } from "../utils/reports"
// Lazy: keeps the form out of the airfield page bundle.
const ReportForm = lazy(() => import("./ReportForm"))

/**
 * On an airfield page, pass `airfield` and its `reports` (optimistic list). Elsewhere the form asks for the airfield and
 * `onPublished` takes over once the report is saved.
 */
export const ReportFormHost = ({ airfield, airfields, profile, reports, control, onPublished }: {
  airfield?: Airfield, airfields: Map<string, Airfield>, profile?: Profile, reports?: ReportsState,
  control: ReportFormControl, onPublished?: (airfield: Airfield) => void,
}) => {
  if (!control.form) return null
  const { report, focusFee } = control.form
  const submit = async (target: Airfield, input: ReportInput, markVisited: boolean) => {
    if (report && reports) await reports.update(report, input)
    else if (reports) await reports.add(input)
    else if (profile) await newReport(target.codeIcao, profile, input).save()
    let thanks = 'Merci pour votre compte rendu !'
    if (markVisited && profile) {
      const visited = [...(profile.visited ?? []), { type: 'airfields' as const, id: target.codeIcao }]
      profile.update({ visited }).catch(e => console.error('[Reports] visited', e))
      const count = countVisitedAirfields({ visited })
      thanks = `Merci ! Terrain ajouté à votre passeport · ${count} ${visitedLabel(count)}`
    }
    if (!report) control.setThanks(thanks)
    control.close()
    onPublished?.(target)
  }
  const loading = <Modal opened onClose={control.close} withCloseButton={false} zIndex={1500}><Group justify="center"><Loader /></Group></Modal>
  if (!profile) return loading
  return (
    <Suspense fallback={loading}>
      <ReportForm airfield={airfield} airfields={airfields} profile={profile} report={report} focusFee={focusFee} onClose={control.close} onSubmit={submit} />
    </Suspense>
  )
}

const ReportCard = ({ report, own, onEdit, onDelete }: { report: Report, own: boolean, onEdit: () => void, onDelete: () => void }) => {
  const fee = reportFeeLabel(report)
  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Text size="sm" c="dimmed">Visite du {formatVisitDate(report.observedAt)} · {report.author ?? 'Pilote'}</Text>
        {own && (
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label="Actions sur le compte rendu"><IconDots size={16} /></ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={16} />} onClick={onEdit}>Modifier</Menu.Item>
              <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={onDelete}>Supprimer</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
      {fee && <Badge variant="light" color={report.landingFee?.amount === 0 ? 'green' : 'gray'} mt={4} style={{ textTransform: 'none' }}>{fee}</Badge>}
      {report.text && <Text mt="xs" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{report.text}</Text>}
    </Paper>
  )
}

/** « Raconter ma visite », or the thanks once posted */
export const ReportButton = ({ control }: { control: ReportFormControl }) => control.thanks
  ? <Text c="teal" fw={500} size="sm">{control.thanks}</Text>
  : <Button leftSection={<IconMessagePlus size={20} />} onClick={() => control.open()}>Raconter ma visite</Button>

export const ReportsSection = ({ profile, reports, control }: {
  profile?: Profile, reports: ReportsState, control: ReportFormControl,
}) => {
  const list = reports.pilotReports ?? []
  const [error, setError] = useState<string>()
  const remove = (report: Report) => {
    if (!window.confirm('Supprimer ce compte rendu ?')) return
    setError(undefined)
    reports.remove(report).catch(e => {
      console.error('[Reports] delete', e)
      setError('La suppression a échoué. Réessayez.')
    })
  }
  if (list.length === 0) return null
  return (
    <Stack gap="sm">
      <Title order={2} size="h4">Comptes rendus de pilotes ({list.length})</Title>
      {error && <Text c="red" size="sm">{error}</Text>}
      {list.map(r => (
        <ReportCard
          key={r.id}
          report={r}
          own={!!profile && r.uid === profile.uid}
          onEdit={() => control.open({ report: r })}
          onDelete={() => remove(r)}
        />
      ))}
    </Stack>
  )
}

export const VisitedPrompt = ({ opened, onClose, onReport }: { opened: boolean, onClose: () => void, onReport: () => void }) => (
  <Dialog opened={opened} onClose={onClose} withCloseButton size="lg" radius="md" position={{ bottom: 20, right: 20 }}>
    <Text size="sm" fw={500} mb="xs">Terrain ajouté à votre passeport. Racontez votre visite ?</Text>
    <Button size="xs" onClick={() => { onClose(); onReport() }}>Raconter ma visite</Button>
  </Dialog>
)
