import { Button, Group, SegmentedControl, Title } from "@mantine/core"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Data, Event } from ".."
import TableList from "../components/TableList"
import { formatDate } from "../utils/utils"
import { IconCalendarEvent, IconExternalLink } from "@tabler/icons-react"

const EventsList = ({ events, airfields }: Data) => {
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming')
  const now = new Date()

  const filtered = new Map(
    [...events].filter(([, e]) => {
      const end = e.endDate ? new Date(e.endDate.seconds * 1000) : new Date(e.startDate.seconds * 1000)
      return view === 'upcoming' ? end >= now : end < now
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
      <Group justify="space-between" mb="md">
        <Title>Événements</Title>
        <Button component={Link} to="/events/edit" leftSection={<IconCalendarEvent size={14} />}>
          Ajouter un événement
        </Button>
      </Group>
      <SegmentedControl
        mb="md"
        value={view}
        onChange={(v) => setView(v as 'upcoming' | 'past')}
        data={[
          { label: 'À venir', value: 'upcoming' },
          { label: 'Passés', value: 'past' },
        ]}
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
