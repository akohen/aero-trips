import { useEffect, useMemo, useState } from "react"
import { Alert, Button, Checkbox, Chip, em, Fieldset, Group, Modal, SegmentedControl, Select, Stack, Text, Textarea, TextInput } from "@mantine/core"
import { DatePickerInput } from "@mantine/dates"
import { useMediaQuery } from "@mantine/hooks"
import { IconCalendar } from "@tabler/icons-react"
import { AircraftClass, Airfield, Profile, Report } from ".."
import { ReportInput } from "../hooks/useReports"
import { deName, titleCase } from "../utils/utils"
import { authorName, formatLandingFee, landingFeeSource, parseFeeAmount, REPORT_NOTE_MAX, REPORT_TEXT_MAX, visitDayToUtc } from "../utils/reports"

export interface ReportFormProps {
  /** Absent = the pilot picks one among `airfields` */
  airfield?: Airfield
  airfields: Map<string, Airfield>
  profile: Profile
  /** Absent = new report */
  report?: Report
  /** Focus the amount (from the « inconnue » fee line) */
  focusFee?: boolean
  onClose: () => void
  /** Rejects to keep the form open with an error */
  onSubmit: (airfield: Airfield, input: ReportInput, markVisited: boolean) => Promise<void>
}

interface Draft {
  /** Picked airfield, when the form has no fixed one */
  icao: string | null
  /** 'YYYY-MM-DD'; null = today, so a draft left open overnight isn't stuck on an old day */
  date: string | null
  text: string
  free: boolean
  amount: string
  note: string
}

const EMPTY: Draft = { icao: null, date: null, text: '', free: false, amount: '', note: '' }

// Browser storage may be missing or throw (private mode)
const storage = {
  get: (key: string) => { try { return localStorage.getItem(key) } catch { return null } },
  set: (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* ignore */ } },
  remove: (key: string) => { try { localStorage.removeItem(key) } catch { /* ignore */ } },
}
const draftKey = (icao?: string) => `report-draft:${icao ?? 'new'}`
const CLASS_KEY = 'report-aircraft-class'

const readDraft = (key: string): Draft | undefined => {
  try {
    const draft = JSON.parse(storage.get(key) ?? 'null')
    return draft ? { ...EMPTY, ...draft } : undefined
  } catch { return undefined }
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const formatAmount = (amount: number) => String(amount).replace('.', ',')

const fromReport = (r: Report): Draft => ({
  icao: r.target.id,
  date: new Date(r.observedAt.seconds * 1000).toISOString().slice(0, 10),
  text: r.text ?? '',
  free: r.landingFee?.amount === 0,
  amount: r.landingFee && r.landingFee.amount > 0 ? formatAmount(r.landingFee.amount) : '',
  note: r.landingFee?.note ?? '',
})

const localDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const ReportForm = ({ airfield: fixedAirfield, airfields, profile, report, focusFee, onClose, onSubmit }: ReportFormProps) => {
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`)
  const key = draftKey(fixedAirfield?.codeIcao)
  const [draft, setDraft] = useState<Draft>(() => report ? fromReport(report) : readDraft(key) ?? EMPTY)
  const airfield = fixedAirfield ?? (draft.icao ? airfields.get(draft.icao) : undefined)
  const airfieldOptions = useMemo(() => fixedAirfield ? [] : [...airfields.values()]
    .map(a => ({ value: a.codeIcao, label: `${titleCase(a.name)} - ${a.codeIcao}` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr')), [fixedAirfield, airfields])
  const [aircraftClass, setAircraftClass] = useState<AircraftClass>(() =>
    report?.aircraftClass ?? (storage.get(CLASS_KEY) === 'heavy' ? 'heavy' : 'light'))
  const alreadyVisited = !!airfield && !!profile.visited?.some(v => v.type === 'airfields' && v.id === airfield.codeIcao)
  const [markVisited, setMarkVisited] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => { if (!report) storage.set(key, JSON.stringify(draft)) }, [report, key, draft])
  const set = (changes: Partial<Draft>) => setDraft(d => ({ ...d, ...changes }))

  const today = isoDay(new Date())
  const date = draft.date ?? today
  const text = draft.text.trim()
  const amount = draft.free ? 0 : parseFeeAmount(draft.amount)
  const feeInvalid = !draft.free && amount === undefined && draft.amount.trim() !== ''
  const canPublish = !!airfield && !feeInvalid && (!!text || amount !== undefined)

  const current = airfield?.landingFee
  const confirmCurrent = () => current && set(current.amount === 0
    ? { free: true, amount: '' }
    : { free: false, amount: formatAmount(current.amount) })

  const submit = async () => {
    if (!canPublish || !airfield) return
    const note = draft.note.trim()
    const input: ReportInput = {
      observedAt: visitDayToUtc(localDay(date)),
      ...(text && { text }),
      ...(amount !== undefined && { landingFee: { amount, ...(note && { note }) }, aircraftClass }),
    }
    setSaving(true)
    setError(undefined)
    try {
      if (amount !== undefined) storage.set(CLASS_KEY, aircraftClass)
      await onSubmit(airfield, input, !report && !alreadyVisited && markVisited)
      if (!report) storage.remove(key)
    } catch (e) {
      console.error('[ReportForm]', e)
      setError("L'enregistrement a échoué. Vérifiez votre connexion et réessayez.")
      setSaving(false)
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      fullScreen={isMobile}
      size="lg"
      zIndex={1500}
      title={<Text fw={600}>{report ? 'Modifier le compte rendu'
        : fixedAirfield ? `Compte rendu — Aérodrome ${deName(titleCase(fixedAirfield.name))}`
        : 'Compte rendu de visite'}</Text>}
    >
      <Stack gap="md">
        {!fixedAirfield && (
          <Select
            label="Aérodrome"
            placeholder="Nom ou code OACI"
            data={airfieldOptions}
            searchable
            value={draft.icao}
            onChange={icao => set({ icao })}
            comboboxProps={{ zIndex: 1501 }}
            data-autofocus
          />
        )}
        <DatePickerInput
          label="Date de visite"
          value={date}
          onChange={value => set({ date: value === today ? null : value })}
          maxDate={today}
          minDate="1990-01-01"
          valueFormat="DD/MM/YYYY"
          leftSection={<IconCalendar size={18} />}
          popoverProps={{ zIndex: 1501 }}
          w={180}
        />

        <Textarea
          label="Votre visite"
          placeholder="Accueil, restaurant, conseils d'arrivée, avitaillement…"
          autosize
          minRows={4}
          maxRows={12}
          maxLength={REPORT_TEXT_MAX}
          value={draft.text}
          onChange={e => set({ text: e.currentTarget.value })}
          description={draft.text.length > REPORT_TEXT_MAX * 0.9 ? `${draft.text.length} / ${REPORT_TEXT_MAX}` : undefined}
          data-autofocus={(fixedAirfield && !focusFee) || undefined}
        />

        <Fieldset legend="Taxe d'atterrissage payée" radius="md">
          <Stack gap="sm">
            {current && (
              <Group justify="space-between" gap="xs" wrap="nowrap">
                <Text size="sm" c="dimmed">Actuellement : {formatLandingFee(current)} · {landingFeeSource(current)}</Text>
                <Button size="compact-sm" variant="light" onClick={confirmCurrent} style={{ flexShrink: 0 }}>Toujours exact</Button>
              </Group>
            )}
            <Group align="center" gap="sm">
              <TextInput
                aria-label="Montant payé"
                placeholder="Montant"
                inputMode="decimal"
                rightSection="€"
                w={130}
                disabled={draft.free}
                value={draft.free ? '' : draft.amount}
                onChange={e => set({ amount: e.currentTarget.value })}
                error={feeInvalid}
                data-autofocus={focusFee || undefined}
              />
              <Chip checked={draft.free} onChange={free => set({ free })}>Gratuit</Chip>
              {amount !== undefined && (
                <SegmentedControl
                  size="sm"
                  value={aircraftClass}
                  onChange={value => setAircraftClass(value as AircraftClass)}
                  data={[{ label: 'MTOW ≤ 1,2 t', value: 'light' }, { label: 'Plus lourd', value: 'heavy' }]}
                />
              )}
            </Group>
            {feeInvalid
              ? <Text size="xs" c="red">Montant invalide, par exemple 12,50</Text>
              : <Text size="xs" c="dimmed">Tarif visiteur TTC, sans réduction (FFA, club…), assistance obligatoire comprise.</Text>}
            {amount !== undefined && (
              <TextInput
                aria-label="Précision"
                placeholder="Précision (facultatif) : payé à l'aéroclub, gratuit le week-end…"
                maxLength={REPORT_NOTE_MAX}
                value={draft.note}
                onChange={e => set({ note: e.currentTarget.value })}
              />
            )}
          </Stack>
        </Fieldset>

        {!report && !alreadyVisited && (
          <Checkbox
            label="Marquer ce terrain comme visité"
            checked={markVisited}
            onChange={e => setMarkVisited(e.currentTarget.checked)}
          />
        )}

        {error && <Alert color="red">{error}</Alert>}

        <Group justify="space-between" align="center" wrap="wrap">
          <Text size="xs" c="dimmed">Publié sous le nom {authorName(profile.displayName)}</Text>
          <Button onClick={submit} disabled={!canPublish} loading={saving}>{report ? 'Enregistrer' : 'Publier'}</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

export default ReportForm
