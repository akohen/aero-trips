import { ActionIcon, Button, Group, rem, SegmentedControl, TextInput } from "@mantine/core"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ADfilter, Data, Event } from ".."
import TableList from "../components/TableList"
import { formatDate, isUpcomingEvent } from "../utils/utils"
import { IconCalendarEvent, IconExternalLink, IconMap, IconSearch, IconX } from "@tabler/icons-react"

const EventsList = ({ events, airfields, setADfilter }: Data & { setADfilter: (f: ADfilter) => void }) => {
  const navigate = useNavigate()
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming')
  const [search, setSearch] = useState('')

  const filtered = new Map(
    [...events]
      .filter(([, e]) => view === 'upcoming' ? isUpcomingEvent(e) : !isUpcomingEvent(e))
      .filter(([, e]) => {
        if (!search) return true
        const q = search.toLowerCase()
        const ad = airfields.get(e.airfieldId)
        return e.title.toLowerCase().includes(q)
          || ad?.name.toLowerCase().includes(q)
          || ad?.codeIcao.toLowerCase().includes(q)
      })
  )

  const columns = [
    {
      title: 'Titre',
      sortFn: (a: Event, b: Event) => a.title.localeCompare(b.title),
      row: (e: Event) => <>{e.title}</>,
      linkTo: (e: Event) => `/events/${e.id}`,
    },
    {
      title: 'Terrain',
      row: (e: Event) => {
        const ad = airfields.get(e.airfieldId)
        return <>{ad ? `${ad.name} - ${ad.codeIcao}` : e.airfieldId}</>
      },
      linkTo: (e: Event) => `/events/${e.id}`,
    },
    {
      title: 'Date',
      sortFn: (a: Event, b: Event) => a.startDate.seconds - b.startDate.seconds,
      row: (e: Event) => (
        <>{formatDate(e.startDate)}{e.endDate ? ` → ${formatDate(e.endDate)}` : ''}</>
      ),
      linkTo: (e: Event) => `/events/${e.id}`,
    },
    {
      title: '',
      row: (e: Event) => (
        <>
          {e.link && (
            <Button
              component={Link}
              to={e.link}
              target="_blank"
              size="xs"
              variant="light"
              leftSection={<IconExternalLink size={14} />}
              onClick={(ev: React.MouseEvent) => ev.stopPropagation()}
            >
              Site
            </Button>
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <Group mb="md">
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as 'upcoming' | 'past')}
          data={[
            { label: 'À venir', value: 'upcoming' },
            { label: 'Passés', value: 'past' },
          ]}
        />
        <Button
          variant="light"
          leftSection={<IconMap size={14} />}
          onClick={() => {
            setADfilter({ search: '', services: [], ad: ['upcomingEvents'], runway: '', distance: '', target: '' })
            navigate('/map')
          }}
        >
          Voir sur la carte
        </Button>
        <Button component={Link} to="/events/edit" leftSection={<IconCalendarEvent size={14} />}>
          Ajouter un événement
        </Button>
      </Group>
      
      <TextInput
        mb="md"
        placeholder="Chercher un événement"
        leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        rightSection={search
          ? <ActionIcon variant="subtle" size="sm" onClick={() => setSearch('')}><IconX size={14} /></ActionIcon>
          : undefined}
      />
      <TableList
        data={filtered}
        columns={columns}
        defaultSortColumn={2}
        defaultSortDir={1}
      />
    </>
  )
}

export default EventsList
