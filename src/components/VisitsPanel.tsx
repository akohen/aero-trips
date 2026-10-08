import { useMemo, useState } from "react"
import { ActionIcon, Anchor, Button, Group, MultiSelect, Paper, Text, TextInput, Title } from "@mantine/core"
import { IconMessagePlus, IconSearch, IconX } from "@tabler/icons-react"
import { Link } from "react-router"
import { useDisclosure } from "@mantine/hooks"
import { Airfield, Profile, Report } from ".."
import { AirfieldTitle } from "./AirfieldUtils"
import { ReportFormHost } from "./Reports"
import { useUserReports } from "../hooks/useReports"
import { useReportForm } from "../hooks/useReportForm"
import { formatVisitDate, groupVisits, reportFeeLabel, reportPath } from "../utils/reports"
import { titleCase } from "../utils/utils"
import { countVisitedAirfields } from "../utils/passportBadge"

/** Rows shown before « Voir les autres terrains » */
const VISIBLE_VISITS = 15
/** The filter field appears above this many rows */
const FILTER_FROM = 25

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const VisitReport = ({ report }: { report: Report }) => {
  const fee = reportFeeLabel(report)
  return <Text size="xs"><Link to={reportPath(report)}>Visite du {formatVisitDate(report.observedAt)}{fee && ` · ${fee}`}</Link></Text>
}

/**
 * The profile's visited airfields with the pilot's own reports. Adding a visit goes through the report form first; the
 * bulk add (no report) is folded below the list and invites a report afterwards. Removes visits without a report.
 * The count is the passport's: an airfield reported on but not marked visited is listed, not counted.
 */
const VisitsPanel = ({ profile, airfields }: { profile: Profile, airfields: Map<string, Airfield> }) => {
  const { reports, add } = useUserReports(profile.uid)
  const reportForm = useReportForm('', profile)
  const [reportAirfield, setReportAirfield] = useState<Airfield>()
  const [picked, setPicked] = useState<string[]>([])
  const [error, setError] = useState<string>()
  const [bulk, { toggle: toggleBulk, close: closeBulk }] = useDisclosure(false)
  const [added, setAdded] = useState<number>()
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('')

  const visited = useMemo(() => profile.visited?.filter(v => v.type === 'airfields').map(v => v.id) ?? [], [profile.visited])
  const visits = groupVisits(visited, reports ?? [])
  const query = fold(filter.trim())
  const matching = query
    ? visits.filter(({ id }) => fold(`${id} ${airfields.get(id)?.name ?? ''}`).includes(query))
    : visits
  // A filter searches the whole list
  const shown = showAll || query ? matching : matching.slice(0, VISIBLE_VISITS)
  const options = useMemo(() => [...airfields.values()]
    .filter(ad => !visited.includes(ad.codeIcao))
    .map(ad => ({ value: ad.codeIcao, label: `${ad.codeIcao} - ${titleCase(ad.name)}` }))
    .sort((a, b) => a.value.localeCompare(b.value)), [airfields, visited])

  const save = (next: Profile['visited'], failure: string) => {
    setError(undefined)
    return profile.update({ visited: next }).then(() => true, e => {
      console.error('[Profile] visited', e)
      setError(failure)
      return false
    })
  }
  const addVisited = () => {
    const count = picked.length
    save([...(profile.visited ?? []), ...picked.map(id => ({ type: 'airfields' as const, id }))], "L'ajout a échoué. Réessayez.")
      .then(ok => ok && setAdded(count))
    setPicked([])
    closeBulk()
  }
  const markVisited = (id: string) =>
    save([...(profile.visited ?? []), { type: 'airfields' as const, id }], "L'ajout a échoué. Réessayez.")
  const removeVisited = (id: string) => {
    save(profile.visited?.filter(v => v.type !== 'airfields' || v.id !== id), 'La suppression a échoué. Réessayez.')
  }
  const openReport = (airfield?: Airfield) => {
    setAdded(undefined)
    setReportAirfield(airfield)
    reportForm.open()
  }

  return (
    <Paper shadow="md" radius="md" p="sm" withBorder>
      <Title order={4}>Terrains visités ({countVisitedAirfields(profile)})</Title>
      <Button mt="xs" leftSection={<IconMessagePlus size={18} />} onClick={() => openReport()}>Ajouter une visite</Button>
      {reportForm.thanks && <Text c="teal" fw={500} size="sm" mt="xs">{reportForm.thanks}</Text>}
      {added && <Text c="teal" fw={500} size="sm" mt="xs">
        {added} {added > 1 ? 'terrains ajoutés' : 'terrain ajouté'} à votre passeport. Ajoutez un compte rendu pour aider les
        autres pilotes.
      </Text>}
      {error && <Text c="red" size="sm" mt="xs">{error}</Text>}
      {visits.length > FILTER_FROM &&
        <TextInput
          mt="sm"
          leftSection={<IconSearch size={16} />}
          placeholder="Filtrer (nom ou code OACI)"
          aria-label="Filtrer les terrains visités"
          value={filter}
          onChange={e => setFilter(e.currentTarget.value)}
        />}
      {query && matching.length === 0 && <Text size="sm" mt="xs" c="dimmed">Aucun terrain visité ne correspond.</Text>}
      {visits.length > 0 ?
        <ul>
          {shown.map(({ id, reports }) => {
            const ad = airfields.get(id)
            return <li key={id}>
              <Group gap={4} wrap="nowrap">
                <Text size="sm" className="ad-list">
                  {ad ? <Link to={`/airfields/${id}`}>{id} <AirfieldTitle ad={ad} /></Link> : 'Terrain inconnu'}
                </Text>
                {reports.length === 0 &&
                  <ActionIcon size="sm" variant="subtle" color="gray" aria-label={`Retirer ${id} des terrains visités`} onClick={() => removeVisited(id)}>
                    <IconX size={14} />
                  </ActionIcon>}
              </Group>
              {reports.map(r => <VisitReport key={r.id} report={r} />)}
              {reports.length === 0 && ad &&
                <Text size="xs"><Anchor component="button" inherit onClick={() => openReport(ad)}>Ajouter un compte rendu</Anchor></Text>}
              {!visited.includes(id) &&
                <Text size="xs" c="dimmed">
                  Pas dans votre passeport · <Anchor component="button" inherit onClick={() => markVisited(id)}>Marquer comme visité</Anchor>
                </Text>}
            </li>
          })}
        </ul>
      :
        <Text size="sm" mt="xs">
          Ajoutez vos visites : chaque terrain rejoint votre passeport de pilote, et vos comptes rendus aident les autres
          pilotes.
        </Text>
      }
      {shown.length < matching.length &&
        <Button variant="subtle" size="compact-sm" onClick={() => setShowAll(true)}>
          {matching.length - shown.length > 1 ? `Voir les ${matching.length - shown.length} autres terrains` : "Voir l'autre terrain"}
        </Button>}
      <Anchor component="button" size="sm" display="block" mt="xs" onClick={toggleBulk}>
        Ajouter plusieurs terrains sans compte rendu
      </Anchor>
      {bulk && <Group mt="xs" align="flex-start">
        <MultiSelect
          style={{ flex: 1 }}
          miw={240}
          placeholder="Terrains visités (nom ou code OACI)"
          data={options}
          value={picked}
          onChange={setPicked}
          searchable
          clearable
          limit={50}
        />
        <Button variant="light" disabled={picked.length === 0} onClick={addVisited}>Ajouter</Button>
      </Group>}
      <ReportFormHost
        airfield={reportAirfield}
        airfields={airfields}
        profile={profile}
        control={reportForm}
        onPublished={(_, report) => report && add(report)}
      />
    </Paper>
  )
}

export default VisitsPanel
