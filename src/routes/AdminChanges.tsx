/**
 * `/admin/changes/:changeId?`: review guest contributions (`changes`) without the CLI. Admins only
 * (`admin` claim, `npm run set-admin`); the rules and the callable enforce it, this page only follows.
 * Applying goes through the `applyChange` callable (functions/admin/), deleting is a plain delete.
 * Lazy-loaded: `firebase/functions` and the diff view stay out of the eager bundle.
 */
import { Alert, Anchor, Badge, Button, Center, Code, Grid, Group, Loader, NavLink, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core"
import { IconArrowLeft, IconBrandGoogleFilled, IconCheck, IconMail, IconTrash } from "@tabler/icons-react"
import { JSONContent } from "@tiptap/react"
import { collection, deleteDoc, doc, getDoc, getDocs } from "firebase/firestore"
import { getApp } from "firebase/app"
import { getFunctions, httpsCallable } from "firebase/functions"
import { ReactNode, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Activity, Airfield, Data, Event } from ".."
import { db, googleLogin } from "../data/firebase"
import { useIsAdmin } from "../hooks/useIsAdmin"
import { ChangeCollection, diffChange, mayCreate, parseChange, ParsedChange } from "../utils/changes"
import { titleCase } from "../utils/utils"
import Description from "../components/Description"

const CHANGES = 'changes'
const BASE = '/admin/changes'

type Change = { id: string, parsed: ParsedChange, submittedAt?: Date }
type Target = Record<string, unknown> | undefined

const COLLECTION_LABELS: Record<ChangeCollection, string> = { airfields: 'Terrain', activities: 'Activité', events: 'Événement' }
const ITEM_PATHS: Record<ChangeCollection, string> = { airfields: '/airfields', activities: '/activities', events: '/events' }
// Stamped on every change, applied as is: not worth a line in the diff
const HIDDEN_FIELDS = ['updated_by']

const toDate = (value: unknown) => {
  const v = value as { toDate?: () => Date } | undefined
  return typeof v?.toDate === 'function' ? v.toDate() : undefined
}
const formatDateTime = (date?: Date) => date
  ? date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : 'date inconnue'

const readChanges = async (): Promise<Change[]> => {
  const snap = await getDocs(collection(db, CHANGES))
  return snap.docs
    .map(d => ({ id: d.id, parsed: parseChange(d.data()), submittedAt: toDate(d.get('updated_at')) }))
    // Oldest first, like `npm run manage`; undated ones last
    .sort((a, b) => (a.submittedAt?.getTime() ?? Infinity) - (b.submittedAt?.getTime() ?? Infinity))
}

const applyChange = (id: string) =>
  httpsCallable<{ id: string }, { targetDocument: string }>(getFunctions(getApp(), 'europe-west1'), 'applyChange')({ id })

type Lookup = Pick<Data, 'airfields' | 'activities' | 'events'>

/** What a change is about, from the loaded data, else from the change itself. */
const changeTitle = ({ parsed }: Change, data: Lookup) => {
  if (parsed.kind === 'contact') return `Message de ${parsed.email}`
  if (parsed.kind === 'invalid') return 'Changement invalide'
  const { collection, docId, fields } = parsed
  if (collection === 'airfields') {
    const name = data.airfields.get(docId)?.name
    return `${docId}${name ? ' ' + titleCase(name) : ''}`
  }
  if (collection === 'activities') return data.activities.get(docId)?.name ?? (fields.name as string | undefined) ?? docId
  return data.events.get(docId)?.title ?? (fields.title as string | undefined) ?? docId
}

const isKnown = (parsed: ParsedChange & { kind: 'edit' }, data: Lookup) =>
  parsed.collection === 'airfields' ? data.airfields.has(parsed.docId)
    : parsed.collection === 'activities' ? data.activities.has(parsed.docId)
      : data.events.has(parsed.docId)

const KindBadge = ({ change, isNew }: { change: Change, isNew?: boolean }) => {
  const { parsed } = change
  if (parsed.kind === 'contact') return <Badge color="yellow" variant="light">Message</Badge>
  if (parsed.kind === 'invalid') return <Badge color="red" variant="light">Invalide</Badge>
  return <Badge color={isNew ? 'green' : 'blue'} variant="light">
    {COLLECTION_LABELS[parsed.collection]} · {isNew ? 'nouveau' : 'modification'}
  </Badge>
}

const isPosition = (v: unknown): v is { latitude: number, longitude: number } =>
  typeof (v as { latitude?: unknown })?.latitude === 'number' && typeof (v as { longitude?: unknown })?.longitude === 'number'

/** One field's value, readable: a rendered description, a map link for a position, step ids for a trip. */
const FieldValue = ({ field, value }: { field: string, value: unknown }): ReactNode => {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) {
    return <Text size="sm" c="dimmed">(vide)</Text>
  }
  if (field === 'description' && typeof value === 'object') return <Description content={value as JSONContent} />
  if (isPosition(value)) {
    const { latitude: lat, longitude: lng } = value
    return <Anchor size="sm" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`} target="_blank" rel="noopener">
      {lat.toFixed(5)}, {lng.toFixed(5)}
    </Anchor>
  }
  const date = toDate(value)
  if (date) return <Text size="sm">{formatDateTime(date)}</Text>
  if (field === 'steps' && Array.isArray(value)) return <Text size="sm">{value.map(s => (s as { id?: string }).id ?? '?').join(', ')}</Text>
  if (Array.isArray(value) && value.every(v => typeof v !== 'object')) return <Text size="sm">{value.join(', ')}</Text>
  if (typeof value === 'object') return <Code block>{JSON.stringify(value, null, 2)}</Code>
  if (typeof value === 'string' && /^https?:\/\//.test(value)) {
    return <Anchor size="sm" href={value} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>{value}</Anchor>
  }
  return <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{String(value)}</Text>
}

const EditDetails = ({ change, onApply, onDelete, busy }: {
  change: Change & { parsed: { kind: 'edit' } },
  onApply: () => void,
  onDelete: () => void,
  busy?: 'apply' | 'delete',
}) => {
  const { collection, docId, fields } = change.parsed
  // Read fresh, not from DataProvider: the snapshot may predate an earlier applied change
  const [current, setCurrent] = useState<{ id: string, data: Target }>()
  useEffect(() => {
    let cancelled = false
    getDoc(doc(db, collection, docId))
      .then(snap => { if (!cancelled) setCurrent({ id: change.id, data: snap.exists() ? snap.data() : undefined }) })
      .catch(e => {
        console.error('[AdminChanges] target', e)
        if (!cancelled) setCurrent({ id: change.id, data: undefined })
      })
    return () => { cancelled = true }
  }, [change.id, collection, docId])

  if (current?.id !== change.id) return <Center p="xl"><Loader /></Center>

  const target = current.data
  const blocked = !target && !mayCreate(collection)
  const diff = diffChange(fields, target).filter(d => !HIDDEN_FIELDS.includes(d.field))

  return <Stack>
    {blocked && <Alert color="red" title="Cible introuvable">
      {COLLECTION_LABELS[collection]} {docId} n'existe pas : un invité ne peut pas créer de terrain.
    </Alert>}
    {!diff.length && <Text c="dimmed">Aucune différence avec la version actuelle.</Text>}
    {diff.map(({ field, current: before, proposed }) =>
      <Paper key={field} withBorder p="sm" radius="md">
        <Text fw={600} mb="xs">{field}</Text>
        <SimpleGrid cols={{ base: 1, sm: target ? 2 : 1 }}>
          {target && <Stack gap={4}>
            <Text size="xs" c="red.8" tt="uppercase" fw={600}>Actuel</Text>
            <FieldValue field={field} value={before} />
          </Stack>}
          <Stack gap={4}>
            <Text size="xs" c="green.8" tt="uppercase" fw={600}>Proposé</Text>
            <FieldValue field={field} value={proposed} />
          </Stack>
        </SimpleGrid>
      </Paper>
    )}
    <Group>
      <Button leftSection={<IconCheck size={18} />} onClick={onApply} disabled={blocked || !!busy} loading={busy === 'apply'}>
        Appliquer
      </Button>
      <Button leftSection={<IconTrash size={18} />} color="red" variant="outline" onClick={onDelete} disabled={!!busy} loading={busy === 'delete'}>
        Supprimer
      </Button>
      <Anchor component={Link} to={`${ITEM_PATHS[collection]}/${docId}`} size="sm">Voir la fiche</Anchor>
    </Group>
  </Stack>
}

export default function AdminChanges({ profile, authLoading, airfields, activities, events }: Data) {
  const { changeId } = useParams()
  const navigate = useNavigate()
  const { isAdmin, refresh } = useIsAdmin(profile)
  const [changes, setChanges] = useState<Change[]>()
  const [loadError, setLoadError] = useState<string>()
  const [busy, setBusy] = useState<{ id: string, action: 'apply' | 'delete' }>()
  const [actionError, setActionError] = useState<string>()
  const data = useMemo(() => ({ airfields, activities, events }), [airfields, activities, events])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    readChanges()
      .then(list => { if (!cancelled) setChanges(list) })
      .catch(e => { if (!cancelled) setLoadError((e as Error).message) })
    return () => { cancelled = true }
  }, [isAdmin])

  const selected = changes?.find(c => c.id === changeId)

  /** Drops a handled change and moves on to the next one. */
  const done = (id: string) => {
    const index = changes?.findIndex(c => c.id === id) ?? -1
    const rest = changes?.filter(c => c.id !== id) ?? []
    const next = rest[Math.min(index, rest.length - 1)]
    setChanges(rest)
    navigate(next ? `${BASE}/${next.id}` : BASE, { replace: true })
  }

  const run = async (change: Change, action: 'apply' | 'delete') => {
    setActionError(undefined)
    setBusy({ id: change.id, action })
    try {
      if (action === 'apply') {
        await applyChange(change.id)
        // Show the change on the site at once, like the members' forms do
        if (change.parsed.kind === 'edit') {
          const { collection, docId } = change.parsed
          const snap = await getDoc(doc(db, collection, docId))
          if (snap.exists()) {
            if (collection === 'airfields') airfields.set(docId, { ...snap.data(), codeIcao: docId } as Airfield)
            else if (collection === 'activities') activities.set(docId, { ...snap.data(), id: docId } as Activity)
            else events.set(docId, { ...snap.data(), id: docId } as Event)
          }
        }
      } else {
        await deleteDoc(doc(db, CHANGES, change.id))
      }
      done(change.id)
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setBusy(undefined)
    }
  }
  const remove = (change: Change) => {
    if (window.confirm('Supprimer ce changement sans l\'appliquer ?')) run(change, 'delete')
  }

  if (authLoading || (profile && isAdmin === undefined)) return <Center h="50vh"><Loader /></Center>
  if (!profile) return <Stack align="center" mt="xl">
    <Text>Connectez-vous avec un compte administrateur.</Text>
    <Button leftSection={<IconBrandGoogleFilled />} onClick={googleLogin}>Se connecter avec Google</Button>
  </Stack>
  if (!isAdmin) return <Stack align="center" mt="xl">
    <Text>Cette page est réservée aux administrateurs.</Text>
    <Button variant="light" onClick={refresh}>Vérifier à nouveau</Button>
  </Stack>

  const details = (change: Change): ReactNode => {
    const { parsed } = change
    const actionBusy = busy?.id === change.id ? busy.action : undefined
    if (parsed.kind === 'edit') {
      return <EditDetails change={change as Change & { parsed: { kind: 'edit' } }} busy={actionBusy}
        onApply={() => run(change, 'apply')} onDelete={() => remove(change)} />
    }
    return <Stack>
      {parsed.kind === 'contact'
        ? <Paper withBorder p="sm" radius="md">
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{parsed.message || '(message vide)'}</Text>
        </Paper>
        : <>
          <Alert color="red" title="Changement invalide">{parsed.reason}</Alert>
          <Code block>{JSON.stringify(parsed.fields, null, 2)}</Code>
        </>}
      <Group>
        {parsed.kind === 'contact' &&
          <Button component="a" href={`mailto:${parsed.email}?subject=${encodeURIComponent('Votre message à AeroTrips')}`}
            leftSection={<IconMail size={18} />} variant="light">Répondre</Button>}
        <Button leftSection={<IconTrash size={18} />} color="red" variant="outline" onClick={() => remove(change)}
          disabled={!!actionBusy} loading={actionBusy === 'delete'}>Supprimer</Button>
      </Group>
    </Stack>
  }

  return <>
    <Title order={1}>Modifications en attente{changes ? ` (${changes.length})` : ''}</Title>
    {loadError && <Alert color="red" mt="md">{loadError}</Alert>}
    {!changes && !loadError && <Center p="xl"><Loader /></Center>}
    {changes && !changes.length && <Text mt="md" c="dimmed">Aucune modification en attente.</Text>}
    {changes && changes.length > 0 && <Grid mt="md">
      {/* On a phone, the list or the selected change, not both */}
      <Grid.Col span={{ base: 12, sm: 4 }} display={{ base: changeId ? 'none' : 'block', sm: 'block' }}>
        <Stack gap={4}>
          {changes.map(change => {
            const isNew = change.parsed.kind === 'edit' && !isKnown(change.parsed, data)
            return <NavLink key={change.id} component={Link} to={`${BASE}/${change.id}`} active={change.id === changeId}
              label={changeTitle(change, data)}
              description={<Group gap={6} mt={2}><KindBadge change={change} isNew={isNew} />{formatDateTime(change.submittedAt)}</Group>} />
          })}
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 8 }}>
        {changeId && <Anchor component={Link} to={BASE} size="sm" hiddenFrom="sm" mb="sm" display="block">
          <IconArrowLeft size={14} /> Toutes les modifications
        </Anchor>}
        {selected ? <Stack>
          <Group justify="space-between" align="baseline">
            <Title order={3}>{changeTitle(selected, data)}</Title>
            <KindBadge change={selected} isNew={selected.parsed.kind === 'edit' && !isKnown(selected.parsed, data)} />
          </Group>
          <Text size="sm" c="dimmed">
            Proposé le {formatDateTime(selected.submittedAt)}
            {selected.parsed.kind === 'edit' && ` · ${selected.parsed.targetDocument}`}
          </Text>
          {actionError && <Alert color="red" withCloseButton onClose={() => setActionError(undefined)}>{actionError}</Alert>}
          {details(selected)}
        </Stack>
          : changeId ? <Text c="dimmed">Ce changement a déjà été traité.</Text>
            : <Text c="dimmed" visibleFrom="sm">Choisissez une modification à relire.</Text>}
      </Grid.Col>
    </Grid>}
  </>
}
